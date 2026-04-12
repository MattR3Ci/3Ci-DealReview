/**
 * SubmissionService.js
 * Handles all Dataverse Web API and SharePoint REST API communications.
 */
const SubmissionService = {

    _buildUrl: function (entitySet, id) {
        const base = `/_api/${entitySet}`;
        return id ? `${base}(${id})` : base;
    },

    _getHeaders: async function () {
        const token = await new Promise((resolve, reject) => {
            if (window.shell && window.shell.getTokenDeferred) {
                window.shell.getTokenDeferred().done(resolve).fail(reject);
            } else {
                resolve(""); 
            }
        });
        return {
            "Accept": "application/json; odata=verbose",
            "Content-Type": "application/json; charset=utf-8",
            "OData-MaxVersion": "4.0",
            "OData-Version": "4.0",
            "__RequestVerificationToken": token
        };
    },

    loadAllDeals: async function () {
        try {
            const F = window.SCHEMA.FIELDS.DEALS;
            const select = [
                F.DEALID, F.EXTERNALKEY, F.TITLE, F.CLIENT_TEXT,
                F.VALUE, F.STATUS, F.TYPE, F.MARGIN, F.MODIFIED,
                F.COMMERCIAL_MODEL, F.BILLING_FREQ, F.PAYMENT_TERMS, F.PARENT_LINK,
                F.START_DATE, F.END_DATE, F.REVIEW_DEADLINE,
                F.SALES_LEADER, F.ACCOUNTABLE_EXEC, F.DELIVERY_LEAD, F.SOLUTIONS_LEADER,
                F.SF_LINK, F.SF_STAGE,
                F.TECH_RISK, F.RESOURCE_RISK, F.EXCEPTION_REQ
            ].join(",");

            const url = this._buildUrl(window.SCHEMA.TABLES.DEALS) + `?$select=${select}&$orderby=${F.MODIFIED} desc`;
            const headers = await this._getHeaders();
            const response = await fetch(url, { headers });

            if (!response.ok) throw new Error(`HTTP ${response.status}: Failed to fetch deals`);
            const data = await response.json();
            return data.value || [];
        } catch (error) {
            console.error("❌ SubmissionService.loadAllDeals Failure:", error);
            return [];
        }
    },

    loadDocumentsViaFlow: async function (dealId) {
        const targetId = dealId || "19";
        const flowUrl = window.SCHEMA.ENDPOINTS.GET_DOCUMENTS;

        try {
            const response = await fetch(flowUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ dealID: String(targetId) })
            });

            if (!response.ok) {
                const errorDetails = await response.text();
                throw new Error(`Flow failed (${response.status}): ${errorDetails}`);
            }

            const data = await response.json();
            let items = Array.isArray(data) ? data : (data.body || []);
            if (typeof items === 'string') {
                try { items = JSON.parse(items); } catch (e) { items = []; }
            }

            return this.mapFlowToState(items);
        } catch (error) {
            console.error("❌ SubmissionService.loadDocumentsViaFlow Error:", error);
            return [];
        }
    },

    mapFlowToState: function (flowItems) {
        if (!Array.isArray(flowItems)) return [];
        return flowItems.map(item => {
            const rawFileName = item.fileName || "";
            const isExternalLink = rawFileName.toLowerCase().endsWith('.url');

            let displayName = rawFileName;
            if (isExternalLink) {
                displayName = displayName.replace(/\.url$/i, '').replace(/\.docx$/i, '');
            } else if (displayName && !displayName.includes('.')) {
                displayName += ".docx";
            }

            const safeVal = (val, fallback) => (val && val !== "null") ? String(val) : fallback;

            return {
                url: item.url,
                id: item.spId,
                name: displayName,
                version: item.versionNumber || item.versionTag || "1.0",
                uploadedBy: item.uploadedBy || "System",
                isExternalLink: isExternalLink,
                documentCategory: item.documentCategory || item.category || "",
                status: item.documentStatus || item.status || "Draft",
                workflowState: item.workflowState || "Draft",
                healthScore: safeVal(item.healthScore, "Pending"),
                aiSummary: safeVal(item.aiSummary, "No summary available."),
                aiFindings: safeVal(item.aiFindings, "No findings reported."),
                repComments: item.repComments || item.dr_RepComments || ""
            };
        });
    },

    uploadDocument: async function (file, metadata) {
        const flowUrl = window.SCHEMA.ENDPOINTS.UPLOAD_DOCUMENT;
        const toBase64 = file => new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.onerror = error => reject(error);
        });

        try {
            const base64Content = await toBase64(file);
            const recordId = window.DocumentGovernanceApp ? window.DocumentGovernanceApp.state.recordId : "19";

            const payload = {
                dealID: String(recordId),
                fileName: file.name,
                title: metadata.title || file.name,
                description: metadata.description || "",
                base64File: base64Content,
                category: metadata.category,
                versionTag: metadata.versionTag || "Initial Upload"
            };

            const response = await fetch(flowUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            return response.ok;
        } catch (error) {
            console.error("❌ SubmissionService.uploadDocument Error:", error);
            return false;
        }
    },

    runAIAudit: async function (fileId, dealId) {
        const flowUrl = window.SCHEMA.ENDPOINTS.RUN_AI_AUDIT;
        if (!flowUrl) return new Promise(res => setTimeout(() => res(true), 3000)); 

        try {
            const response = await fetch(flowUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ fileId: String(fileId), dealId: String(dealId) })
            });
            return response.ok;
        } catch (error) {
            console.error(`❌ AI Audit Failed for file ${fileId}:`, error);
            return false;
        }
    },

    saveRepComment: async function (fileId, comment) {
        const flowUrl = window.SCHEMA.ENDPOINTS.PATCH_FILE_PROPERTIES;
        try {
            const response = await fetch(flowUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ fileId: String(fileId), repComments: comment })
            });
            return response.ok;
        } catch (error) {
            console.error("❌ SubmissionService.saveRepComment Flow Error:", error);
            return false;
        }
    },

    saveRepOverrides: async function (fileId, dealId, pendingOverrides) {
        if (!pendingOverrides || pendingOverrides.length === 0) return true;

        try {
            const headers = await this._getHeaders();
            
            // USE CONSTANTS: No more magic strings
            const T = window.SCHEMA.TABLES.AI_OVERRIDES;
            const F = window.SCHEMA.FIELDS.AI_OVERRIDES;
            const url = `/_api/${T}`; 

            const savePromises = pendingOverrides.map(override => {
                const payload = {
                    // FIX: Populate the required primary 'name*' column
                    [F.NAME]: `Override: ${override.standardName}`, 
                    
                    // Standard Fields
                    [F.DEAL_ID]: String(dealId),
                    [F.STANDARD_NAME]: override.standardName,
                    [F.JUSTIFICATION]: override.justification,
                    
                    // FIX: Ensure the custom date field is stamped
                    [F.CREATED_ON]: new Date().toISOString() 
                };

                return fetch(url, {
                    method: "POST",
                    headers: headers,
                    body: JSON.stringify(payload)
                }).then(async res => {
                    if (!res.ok) {
                        const err = await res.text();
                        throw new Error(`Dataverse Error: ${err}`);
                    }
                    return res;
                });
            });

            await Promise.all(savePromises);
            
            return await this.saveRepComment(fileId, "Mandatory AI findings justified and logged to Dataverse.");

        } catch (error) {
            console.error("❌ SubmissionService.saveRepOverrides Error:", error);
            return false;
        }
    },

    saveEstimatorLink: async function (recordId, categoryId, url, title) {
        try {
            const endpoint = window.SCHEMA.ENDPOINTS.UPLOAD_DOCUMENT; 
            const payload = {
                dealID: recordId,
                fileName: title,
                title: title,
                category: categoryId,
                url: url,
                isExternalLink: true,
                versionTag: "Initial Estimator Link"
            };

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            return response.ok;
        } catch (error) {
            console.error("❌ Error saving estimator link:", error);
            return false;
        }
    },

    downloadHistoryVersion: function (fileRef, versionId, fileName) {
        if (!fileRef || !versionId) return;
        const siteUrl = window.SCHEMA.ENDPOINTS.SITE_URL;
        const downloadUrl = `${siteUrl}/_layouts/15/download.aspx?SourceUrl=${encodeURIComponent(fileRef)}&VersionNo=${versionId}`;
        window.open(downloadUrl, '_blank');
    },

    deleteDocument: async function (fileId) {
        const flowUrl = window.SCHEMA.ENDPOINTS.DELETE_DOCUMENT;
        try {
            const response = await fetch(flowUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ fileId: String(fileId) })
            });
            return response.ok;
        } catch (error) {
            console.error("❌ SubmissionService.deleteDocument Error:", error);
            return false;
        }
    },

    loadFileHistory: async function (fileId) {
        const flowUrl = window.SCHEMA.ENDPOINTS.GET_VERSION_HISTORY;
        if (!fileId) return [];

        try {
            const response = await fetch(flowUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ fileId: String(fileId) })
            });
            if (!response.ok) throw new Error(`History Flow failed: ${response.status}`);

            const data = await response.json();
            const results = data.value || (Array.isArray(data) ? data : []);

            return results.map(v => {
                const rawTag = v.Version_x005f_x0020_x005f_Tag;
                const rawStatus = v.Document_x005f_x0020_x005f_Status;
                let cleanNote = "System Version Snapshot";
                if (rawTag) {
                    cleanNote = isNaN(rawTag) ? rawTag : parseFloat(rawTag).toString();
                } else if (v.VersionLabel === "1.0") {
                    cleanNote = "Initial Upload";
                }

                return {
                    version: v.VersionLabel,
                    versionId: v.VersionId,
                    fileRef: v.FileRef || v.File_x005f_Ref,
                    modifiedDate: new Date(v.Created).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }),
                    modifiedBy: (v.Editor && v.Editor.LookupValue) ? v.Editor.LookupValue : "System",
                    note: cleanNote,
                    status: rawStatus === "Aligned" ? window.SCHEMA.DOC_STATUS.ALIGNED : window.SCHEMA.DOC_STATUS.MODIFIED_SUBMISSION,
                    healthScore: v.dr_HealthScore || v.OData_dr_HealthScore || "Pending",
                    aiSummary: v.dr_AI_AuditSummary || v.OData_dr_AI_AuditSummary || null,
                    workflowState: v.dr_WorkflowState || v.OData_dr_WorkflowState || "Draft"
                };
            });
        } catch (error) {
            console.error("❌ SubmissionService.loadFileHistory Error:", error);
            return [];
        }
    },

    loadClients: async function () {
        const TABLES = window.SCHEMA.TABLES;
        const FIELDS = window.SCHEMA.FIELDS.CLIENTS;
        const query = `?$select=${FIELDS.ID},${FIELDS.TITLE}&$orderby=${FIELDS.TITLE} asc`;
        const url = this._buildUrl(TABLES.CLIENTS) + query;

        try {
            const response = await fetch(url, { headers: { "Accept": "application/json" } });
            if (!response.ok) throw new Error("Could not fetch clients");
            const data = await response.json();
            return data.value;
        } catch (error) {
            console.error("❌ Client Load Error:", error);
            return [];
        }
    },

    addNewClient: async function (clientName) {
        const TABLES = window.SCHEMA.TABLES;
        const FIELDS = window.SCHEMA.FIELDS.CLIENTS;
        const url = this._buildUrl(TABLES.CLIENTS);

        try {
            const headers = await this._getHeaders();
            const payload = { [FIELDS.TITLE]: clientName };

            const response = await fetch(url, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Failed to create client: ${errText}`);
            }

            const entityIdHeader = response.headers.get("OData-EntityId");
            let newId = null;

            if (entityIdHeader) {
                newId = entityIdHeader.split('(')[1].split(')')[0];
            } else {
                const data = await response.json();
                newId = data[FIELDS.ID];
            }

            return { [FIELDS.ID]: newId, [FIELDS.TITLE]: clientName };
        } catch (error) {
            console.error("❌ SubmissionService.addNewClient Error:", error);
            throw error; 
        }
    },

    getDealById: async function (id) {
        const entity = window.SCHEMA.TABLES.DEALS;
        const F = window.SCHEMA.FIELDS.DEALS;
        let filter = id.toString().includes('-') ? `?$filter=${F.DEALID} eq ${id}` : `?$filter=${F.EXTERNALKEY} eq ${id}`;

        const url = this._buildUrl(entity) + filter;
        const headers = await this._getHeaders();

        const response = await fetch(url, { headers });
        if (!response.ok) throw new Error(`Dataverse Fetch Error: ${await response.text()}`);

        const data = await response.json();
        return data.value && data.value.length > 0 ? data.value[0] : null;
    },

    saveDraft: async function (dealData, existingId) {
        try {
            const headers = await this._getHeaders();
            const FIELDS = window.SCHEMA.FIELDS.DEALS;
            const TABLES = window.SCHEMA.TABLES;
            const isUpdate = !!existingId;

            const payload = {
                [FIELDS.TITLE]: dealData[FIELDS.TITLE] || "New Portal Deal",
                [FIELDS.CLIENT_TEXT]: dealData[FIELDS.CLIENT_TEXT] || "",
                [FIELDS.STATUS]: dealData[FIELDS.STATUS]
            };

            const url = isUpdate ? this._buildUrl(TABLES.DEALS, existingId) : this._buildUrl(TABLES.DEALS);
            if (isUpdate) headers["If-Match"] = "*";

            const response = await fetch(url, {
                method: isUpdate ? "PATCH" : "POST",
                headers: headers,
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error(isUpdate ? "Update Failed" : "Create Failed");

            if (isUpdate) {
                return { success: true, id: existingId };
            } else {
                const entityIdHeader = response.headers.get("OData-EntityId");
                let newGuid = entityIdHeader ? entityIdHeader.split('(')[1].split(')')[0] : null;

                if (newGuid) {
                    const newUrl = `${window.location.pathname}?id=${newGuid}`;
                    window.history.replaceState({ path: newUrl }, '', newUrl);
                }
                return { success: true, id: newGuid };
            }
        } catch (error) {
            console.error("❌ SubmissionService.saveDraft Failure:", error);
            throw error;
        }
    },

    patchDeal: async function (id, updateData) {
        try {
            const headers = await this._getHeaders();
            headers["If-Match"] = "*";

            const F = window.SCHEMA.FIELDS.DEALS;
            const TABLES = window.SCHEMA.TABLES;
            const payload = {};

            const stringFields = [F.TITLE, F.CLIENT_TEXT, F.DESCRIPTION, F.SF_LINK, F.PARENT_LINK];
            stringFields.forEach(key => { if (updateData[key] !== undefined) payload[key] = updateData[key]; });

            const roleFields = [F.SALES_LEADER, F.SOLUTIONS_LEADER, F.ACCOUNTABLE_EXEC, F.DELIVERY_LEAD];
            roleFields.forEach(key => { if (updateData[key] !== undefined) payload[key] = updateData[key]; });

            if (updateData[F.VALUE] !== undefined) payload[F.VALUE] = parseFloat(updateData[F.VALUE]) || 0;
            if (updateData[F.MARGIN] !== undefined) {
                let margin = parseFloat(updateData[F.MARGIN]) || 0;
                payload[F.MARGIN] = margin > 1 ? margin / 100 : margin;
            }

            if (updateData[F.START_DATE]) payload[F.START_DATE] = updateData[F.START_DATE];
            if (updateData[F.END_DATE]) payload[F.END_DATE] = updateData[F.END_DATE];
            if (updateData[F.REVIEW_DEADLINE]) payload[F.REVIEW_DEADLINE] = updateData[F.REVIEW_DEADLINE];

            const choiceFields = [F.TYPE, F.COMMERCIAL_MODEL, F.BILLING_FREQ, F.PAYMENT_TERMS, F.SF_STAGE, F.TECH_RISK, F.RESOURCE_RISK, F.STATUS];
            choiceFields.forEach(key => {
                if (updateData[key] !== undefined && updateData[key] !== "") {
                    payload[key] = parseInt(updateData[key]);
                }
            });

            if (updateData[F.EXCEPTION_REQ] !== undefined) payload[F.EXCEPTION_REQ] = !!updateData[F.EXCEPTION_REQ];

            if (Object.keys(payload).length === 0) return { success: true };

            const url = this._buildUrl(TABLES.DEALS, id);
            const response = await fetch(url, { method: "PATCH", headers: headers, body: JSON.stringify(payload) });

            if (!response.ok) throw new Error(`Metadata Patch Failed: ${await response.text()}`);
            return { success: true };
        } catch (error) {
            console.error("❌ SubmissionService.patchDeal Failure:", error);
            throw error;
        }
    },

    // --- NEW: Load Global Settings from Dataverse ---
    loadGlobalSettings: async function () {
        const table = window.SCHEMA.TABLES.GLOBAL_SETTINGS;
        const recordId = window.SCHEMA.FIELDS.GLOBAL_SETTINGS.RECORD_ID;
        if (!table || !recordId) return null;

        try {
            const url = `/_api/${table}(${recordId})`;
            const headers = await this._getHeaders();
            const response = await fetch(url, { headers });
            
            if (response.ok) {
                const data = await response.json();
                window.model = window.model || {};
                window.model.globalSettings = data; // Cache globally
                console.log("⚙️ Global Settings Loaded");
                return data;
            }
        } catch (error) {
            console.error("Failed to load global settings:", error);
        }
        return null;
    }
};

window.SubmissionService = SubmissionService;