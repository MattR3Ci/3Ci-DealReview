/**
 * SubmissionUI.js
 * Modularized UI Engine for the Deal Review Application.
 */

// --- GLOBAL COMPONENT OVERRIDE: Hook UIComponents into the new Matrix Logic ---
window.UIComponents = window.UIComponents || {};
window.UIComponents.documentProgress = function(uploadedDocs, dealData) {
    const data = dealData || window.SubmissionApp?.state?.dealData || {};
    const requiredDocs = (window.SubmissionCalc) ? window.SubmissionCalc.getRequiredDocs(data) : [];
    
    // Normalize SharePoint text categories to our new JSON Matrix IDs
    const normalizeCat = (raw) => {
        const str = String(raw).toLowerCase().trim();
        const map = { 'statement of work': 'sow', 'master service agreement': 'msa', 'cost model': 'pricing', 'supporting material': 'support', 'rate card': 'rate' };
        return map[str] || str;
    };

    const isUploaded = (docId) => {
        return uploadedDocs.some(d => {
            const dCat = normalizeCat(d.documentCategory || d.spCategory || d.category || "");
            return dCat === docId.toLowerCase() && (d.status || "").toLowerCase() !== 'missing';
        });
    };

    const missing = requiredDocs.filter(req => !isUploaded(req.id));
    const total = requiredDocs.length;
    const complete = total - missing.length;
    const isComplete = total > 0 && missing.length === 0;
    const percent = total === 0 ? 100 : Math.round((complete / total) * 100);
    
    let missingHtml = missing.map(m => `<span class="badge bg-danger text-white"><i class="fa fa-times-circle"></i> ${m.name}</span>`).join('');
    if (isComplete) missingHtml = `<span class="badge bg-success text-white"><i class="fa fa-check-circle"></i> All required documents uploaded</span>`;
    if (total === 0) missingHtml = `<span class="badge bg-secondary text-white">No documents required for this model</span>`;

    return {
        count: `${complete}/${total}`,
        percent: percent,
        color: isComplete ? '#1E7E34' : '#B91C1C',
        missingHtml: missingHtml,
        isComplete: isComplete
    };
};

const SubmissionUI = {
    components: {
        fieldWrapper: (label, inputHtml, required = false) => `
            <div class="form-group">
                <label>${label}${required ? ' *' : ''}</label>
                ${inputHtml}
            </div>
        `,

        textInput: (fieldKey, data, placeholder, extraClass = "") => {
            const val = (data[fieldKey] || '').toString().replace(/"/g, '&quot;');
            return `<input type="text" id="${fieldKey}" class="dr-input ${extraClass}" placeholder="${placeholder}" value="${val}">`;
        },

        numberInput: (fieldKey, data, placeholder) => `
            <input type="number" id="${fieldKey}" class="dr-input" step="0.01" placeholder="${placeholder}" value="${data[fieldKey] || ''}">
        `,

        dateInput: (fieldKey, data) => `
            <input type="date" id="${fieldKey}" class="dr-input" value="${data[fieldKey] || ''}">
        `,

        selectInput: (fieldKey, data, choiceObj) => {
            const currentValue = data[fieldKey]?.toString();
            const labels = Object.keys(choiceObj || {});

            return `
                <select id="${fieldKey}" class="dr-select">
                    <option value="" ${currentValue === undefined ? 'selected' : ''} disabled>Select...</option>
                    ${labels.map(label => {
                const val = choiceObj[label].toString();
                return `<option value="${val}" ${currentValue === val ? 'selected' : ''}>${label}</option>`;
            }).join('')}
                </select>
            `;
        },

        textArea: (fieldKey, data, placeholder) => `
            <textarea id="${fieldKey}" class="dr-textarea" placeholder="${placeholder}">${data[fieldKey] || ''}</textarea>
        `,

        richText: (fieldKey, data, placeholder) => `
            <div class="dr-quill-wrapper" style="border: 1px solid var(--border-default, #E2E8F0); border-radius: 4px; overflow: hidden; transition: all 0.2s;">
                <div id="${fieldKey}" class="dr-quill-editor" style="height: 150px; background: #fff;" data-placeholder="${placeholder}">${data[fieldKey] || ''}</div>
            </div>
        `,

        formatCurrency: (value) => {
            if (value === undefined || value === null || isNaN(value)) return "$0.00";
            return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
        },

        staffDropdown: (fieldKey, data, requiredRoleValue) => {
            const staffList = window.model?.staffData || [];
            const eligibleStaff = staffList.filter(s => {
                if (!s.ci_reviewleaderrole) return false;
                const userRoles = String(s.ci_reviewleaderrole).split(',').map(roleCode => Number(roleCode.trim()));
                return userRoles.includes(Number(requiredRoleValue));
            });

            const currentValue = data[fieldKey] || '';
            
            return `
                <select id="${fieldKey}" class="dr-select">
                    <option value="" ${!currentValue || currentValue === "null" ? 'selected' : ''} disabled>Select Leader...</option>
                    ${eligibleStaff.map(s => {
                        // Check if the user has a valid email address
                        const hasEmail = s.emailaddress1 && String(s.emailaddress1).includes('@');
                        
                        // If no email, remove the value and disable the option
                        const optionValue = hasEmail ? s.emailaddress1 : "";
                        const labelSuffix = hasEmail ? "" : " ⚠️ (Missing Email in System)";
                        const disableAttr = hasEmail ? "" : "disabled";
                        
                        // Check if this was the previously selected user
                        const isSelected = hasEmail && currentValue === s.emailaddress1;

                        return `
                        <option value="${optionValue}" ${isSelected ? 'selected' : ''} ${disableAttr}>
                            ${s.fullname}${labelSuffix}
                        </option>
                        `;
                    }).join('')}
                </select>
            `;
        },

        clientLookup: (fieldKey, data) => {
            const clientFields = window.SCHEMA?.FIELDS?.CLIENTS || {};
            const titleKey = clientFields.TITLE || "title";

            return `
                <div class="position-relative">
                    <input type="text" id="${fieldKey}" list="client-options" class="dr-input" placeholder="Search or type a new client..." value="${data[fieldKey] || ''}" autocomplete="off">
                    <datalist id="client-options">
                        ${(window.model?.clients || []).map(c => `<option value="${c[titleKey]}">`).join('')}
                    </datalist>
                    
                    <div id="add-client-prompt" style="display:none; position:absolute; top:100%; left:0; right:0; background:#FFFBEB; border:1px solid #FEF3C7; padding:10px 14px; border-radius:0 0 8px 8px; z-index:100; font-size:13px; cursor:pointer; box-shadow:var(--shadow-md); transition: background 0.2s;">
                        <i class="fa fa-plus-circle mr-2" style="color: #D97706;"></i> 
                        <span style="color:#92400E;">Add "<strong></strong>" as a new client?</span>
                    </div>
                </div>
            `;
        },

        successOverlay: (dealName) => `
            <div id="submission-success-overlay" class="d-flex flex-column align-items-center justify-content-center" 
                style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(255,255,255,0.9); backdrop-filter: blur(8px); z-index: 9999; transition: all 0.5s ease;">
                <div class="text-center animate__animated animate__zoomIn">
                    <div class="mb-4" style="font-size: 80px; color: #1E7E34;">
                        <i class="fa fa-check-circle"></i>
                    </div>
                    <h1 class="dr-h1" style="font-size: 32px; margin-bottom: 12px;">Submission Received!</h1>
                    <p class="dr-sub" style="font-size: 18px; color: var(--text-secondary); max-width: 400px;">
                        <strong>${dealName}</strong> has been sent to the Deal Review Board.
                    </p>
                    <div class="mt-5">
                        <p class="text-muted small text-uppercase letter-spacing-1">Returning to Dashboard...</p>
                        <div class="spinner-border text-success" role="status" style="width: 1.5rem; height: 1.5rem;"></div>
                    </div>
                </div>
            </div>
        `,
    },

    templates: {
        basics: function (data) {
            const F = window.SCHEMA.FIELDS.DEALS;
            const C = window.SCHEMA.CHOICES;
            const ui = SubmissionUI.components;
            const TYPES = window.SCHEMA.CHOICES.DEAL_TYPES;
            const isRevision = [TYPES["Change Request"], TYPES["Extension"]].includes(parseInt(data[F.TYPE]));

            return `
                ${ui.fieldWrapper("Deal Name", ui.textInput(F.TITLE, data, "Enter deal name"), true)}
                ${ui.fieldWrapper("Client Name", ui.clientLookup(F.CLIENT_TEXT, data), true)}
                ${ui.fieldWrapper("Deal Type", ui.selectInput(F.TYPE, data, C.DEAL_TYPES), true)}
                ${isRevision ? ui.fieldWrapper("Original SOW Link", ui.textInput(F.PARENT_LINK, data, "SOW-202X-XXX"), true) : ''}
                ${ui.fieldWrapper("Total Deal Value ($)", ui.numberInput(F.VALUE, data, "0.00"), true)}
                ${ui.fieldWrapper("Deal Description", ui.richText(F.DESCRIPTION, data, "Scope summary..."))}
            `;
        },

        commercial: function (data) {
            const F = window.SCHEMA.FIELDS.DEALS;
            const C = window.SCHEMA.CHOICES;
            const ui = SubmissionUI.components;
            return `
                ${ui.fieldWrapper("Commercial Model", ui.selectInput(F.COMMERCIAL_MODEL, data, C.MODELS), true)}
                ${ui.fieldWrapper("Billing Frequency", ui.selectInput(F.BILLING_FREQ, data, C.BILLING), true)}
                ${ui.fieldWrapper("Payment Terms", ui.selectInput(F.PAYMENT_TERMS, data, C.TERMS), true)}
                ${ui.fieldWrapper("Estimated Margin (%)", ui.numberInput(F.MARGIN, data, "0.0"))}
            `;
        },

        dates: function (data) {
            const F = window.SCHEMA.FIELDS.DEALS;
            const ui = SubmissionUI.components;
            return `
                ${ui.fieldWrapper("Expected Start Date", ui.dateInput(F.START_DATE, data), true)}
                ${ui.fieldWrapper("Expected End Date", ui.dateInput(F.END_DATE, data), false)}
                ${ui.fieldWrapper("Review Deadline", ui.dateInput(F.REVIEW_DEADLINE, data), false)}
            `;
        },

        roles: function (data) {
            const F = window.SCHEMA.FIELDS.DEALS;
            const ui = SubmissionUI.components;
            const ROLES = { SALES: 121500000, SOLUTION: 121500001, DELIVERY: 121500002, EXEC: 121500003 };

            return `
                ${ui.fieldWrapper("Sales Leader (Owner)", ui.staffDropdown(F.SALES_LEADER, data, ROLES.SALES), true)}
                ${ui.fieldWrapper("Sales Solution Leader", ui.staffDropdown(F.SOLUTIONS_LEADER, data, ROLES.SOLUTION), false)}
                ${ui.fieldWrapper("Accountable Executive", ui.staffDropdown(F.ACCOUNTABLE_EXEC, data, ROLES.EXEC), true)}
                ${ui.fieldWrapper("Delivery Lead", ui.staffDropdown(F.DELIVERY_LEAD, data, ROLES.DELIVERY), true)}
            `;
        },

        salesforce: function (data) {
            const F = window.SCHEMA.FIELDS.DEALS;
            const ui = SubmissionUI.components;
            const C = window.SCHEMA.CHOICES;

            const isSfValid = window.SubmissionCalc ? window.SubmissionCalc._isFieldFilled(data, F.SF_LINK) : true;
            const sfVal = data[F.SF_LINK] || "";
            const errorClass = (sfVal.length > 0 && !isSfValid) ? "is-invalid" : "";

            return `
                <div class="p-4 rounded-lg mb-4" style="background-color: var(--brand-soft); border: 1px solid var(--brand-primary); opacity: 0.8;">
                    <p class="small mb-0" style="color: var(--brand-primary); font-weight:700;">
                        <i class="fa fa-info-circle mr-2"></i> Salesforce API integration pending; please enter details manually.
                    </p>
                </div>
                ${ui.fieldWrapper("Opportunity Link", `
                    <input type="url" id="${F.SF_LINK}" class="dr-input ${errorClass}" 
                           placeholder="https://mau.lightning.force.com/..." 
                           value="${data[F.SF_LINK] || ''}">
                    ${errorClass ? '<span class="error-msg">Please enter a valid Salesforce Opportunity URL</span>' : ''}
                `, true)}
                ${ui.fieldWrapper("Salesforce Stage", ui.selectInput(F.SF_STAGE, data, C.SF_STAGES), true)}
            `;
        },

        risk: function (data) {
            const F = window.SCHEMA.FIELDS.DEALS;
            const C = window.SCHEMA.CHOICES;
            const ui = SubmissionUI.components;

            return `
                ${ui.fieldWrapper("Technical Risk", ui.selectInput(F.TECH_RISK, data, C.RISK_LEVELS))}
                ${ui.fieldWrapper("Resource Risk", ui.selectInput(F.RESOURCE_RISK, data, C.RISK_LEVELS))}
                
                <div class="dr-checkbox-group mt-4 p-3 border rounded ${data[F.EXCEPTION_REQ] ? 'bg-warning-light' : ''}">
                    <label class="d-flex align-items-center cursor-pointer">
                        <input type="checkbox" id="${F.EXCEPTION_REQ}" ${data[F.EXCEPTION_REQ] ? 'checked' : ''} class="me-2">
                        <strong>Request Exception for Non-Standard Terms/Margin</strong>
                    </label>
                    <p class="small text-muted mb-0 mt-1">Check this if the deal falls outside our standard margin or legal terms.</p>
                </div>
            `;
        },

        documents: function (data) {
            const docs = window.SubmissionApp?.state?.uploadedDocs || [];
            
            // Pass the deal data so the progress ring knows the Commercial Model!
            const meta = (window.UIComponents && window.UIComponents.documentProgress)
                ? window.UIComponents.documentProgress(docs, data)
                : { count: '0', percent: 0, color: '#B45309', missingHtml: '' };

            return `
                <div class="py-4 px-3">
                    <div class="text-center mb-4">
                        <i class="fa fa-file-text-o fa-2x mb-3 text-muted" style="opacity: 0.5;"></i>
                        <h3 class="dr-h3">Document Governance</h3>
                        <p class="dr-sub mb-3">Required files based on your commercial model</p>
                    </div>

                    <div id="ui-doc-governance-progress" class="mb-4">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <span class="dr-sectionlabel" style="font-size: 10px;">REQUIRED PROGRESS</span>
                            <span class="text-xs font-bold" id="ui-doc-count" style="color: ${meta.color};">${meta.count}</span>
                        </div>
                        <div class="dr-progress-container-v3" style="height: 6px; background: #E2E8F0; border-radius: 3px; overflow: hidden;">
                            <div id="ui-doc-progress-bar" style="width: ${meta.percent}%; height: 100%; background: ${meta.color}; transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);"></div>
                        </div>
                        
                        <div id="ui-missing-docs-list" class="mt-3 d-flex flex-wrap gap-2">
                            ${meta.missingHtml}
                        </div>
                    </div>

                    <button id="btn-open-workspace" class="btn-submission btn-submit" style="opacity: 1; width: 100%; justify-content: center; margin-top: 10px;">
                        <i class="fa fa-external-link mr-2"></i> Open Document Workspace
                    </button>
                </div>
            `;
        }
    },

    renderSidebar: function (data, activeSection = 'basics') {
        const F = window.SCHEMA.FIELDS.DEALS;
        const S = window.SCHEMA.CHOICES.STATUS;

        const statusHtml = (window.UIComponents && window.UIComponents.statusBadge)
            ? window.UIComponents.statusBadge(data[F.STATUS])
            : `<span class="dr-status-badge">DRAFT</span>`;

        const sectionStatus = (window.SubmissionCalc)
            ? SubmissionCalc.getSectionStatuses(data, window.SubmissionApp?.state?.uploadedDocs)
            : {};
        const progressStats = (window.SubmissionCalc) ? SubmissionCalc.getGlobalProgress(data) : { percent: 0 };

        let rejectionHtml = '';
        if (data[F.STATUS] === S.REJECTED && (data[F.ACTION_REQUIRED] || data[F.REVIEW_NOTES])) {
            rejectionHtml = `
                <div class="mb-4 mt-3 p-3 rounded" style="background: #FEF2F2; border-left: 4px solid #B91C1C; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                    <h4 class="font-bold mb-2" style="color: #991B1B; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">
                        <i class="fa fa-exclamation-triangle mr-1"></i> Action Required
                    </h4>
                    ${data[F.ACTION_REQUIRED] ? `
                        <div class="mb-3" style="color: #7F1D1D; font-size: 13px; font-weight: 500; line-height: 1.5; white-space: pre-wrap; word-wrap: break-word;">
                            ${data[F.ACTION_REQUIRED]}
                        </div>
                    ` : ''}
                    ${data[F.REVIEW_NOTES] ? `
                        <div class="pt-3 mt-1" style="border-top: 1px solid #FCA5A5;">
                            <span class="d-block" style="color: #B91C1C; font-size: 9px; text-transform: uppercase; font-weight: 800; margin-bottom: 4px;">Board Notes:</span>
                            <div style="color: #991B1B; font-size: 12px; line-height: 1.4; white-space: pre-wrap; font-style: italic;">
                                "${data[F.REVIEW_NOTES]}"
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;
        }

        const navItem = (label, sectionId, iconClass, isComplete) => {
            const isActive = activeSection === sectionId;
            return `
                <li class="mb-1">
                    <button class="nav-item ${isActive ? 'is-active' : ''}" data-section="${sectionId}">
                        <div class="d-flex align-items-center">
                            <i class="fa ${isComplete ? 'fa-check-circle text-success' : 'fa-circle-o text-muted'} status-icon"></i>
                            <i class="fa ${iconClass} section-icon"></i>
                            <span>${label}</span>
                        </div>
                        <i class="fa fa-chevron-right nav-arrow"></i>
                    </button>
                </li>
            `;
        };

        $('#sidebar-rail').html(`
            <div class="dr-sidebar-inner px-3 py-4">
                <div class="mb-2">
                    <label class="dr-label-xs mb-2 d-block">Current Status</label>
                    ${statusHtml}
                </div>
                
                ${rejectionHtml}

                <div class="mb-4 mt-4">
                    <label class="dr-label-xs">Global Progress</label>
                    <div class="dr-progress-container"><div class="dr-progress-bar" style="width: ${progressStats.percent}%"></div></div>
                    <small class="dr-muted">${progressStats.percent}% of Required Fields Complete</small>
                </div>
                <hr class="dr-separator" style="margin: 24px 0;" />
                <div class="dr-sidebar-nav">
                    <small class="text-uppercase font-weight-bold dr-muted px-2" style="font-size: 10px;">FORM SECTIONS</small>
                    <ul class="list-unstyled mt-3">
                        ${navItem("Deal Basics", "basics", "fa-file-text-o", sectionStatus.basics)}
                        ${navItem("Commercial Model", "commercial", "fa-dollar", sectionStatus.commercial)}
                        ${navItem("Key Dates", "dates", "fa-calendar", sectionStatus.dates)}
                        ${navItem("Roles & Ownership", "roles", "fa-users", sectionStatus.roles)}
                        ${navItem("Salesforce Context", "salesforce", "fa-info-circle", sectionStatus.salesforce)}
                        ${navItem("Risk Flags", "risk", "fa-warning", sectionStatus.risk)}
                        ${navItem("Documents", "documents", "fa-file-pdf-o", sectionStatus.documents)}
                    </ul>
                </div>
            </div>
        `);
    },

    renderSection: function (sectionId, data) {
        const titles = {
            basics: "Deal Basics",
            commercial: "Commercial Model",
            dates: "Key Dates",
            roles: "Roles & Ownership",
            salesforce: "Salesforce Context",
            risk: "Risk Flags",
            documents: "Document Governance"
        };
        const template = this.templates[sectionId] || this.templates.construction;

        $('#form-workspace').html(`
            <div class="section-header mb-4">
                <h2 class="dr-h2">${titles[sectionId] || "Section"}</h2>
            </div>
            ${template(data || {})}
        `);
    },

    showToast: function (message, type = 'success') {
        if (!$('#toast-container').length) $('body').append('<div id="toast-container"></div>');
        const id = `toast-${Date.now()}`;
        $('#toast-container').append(`<div id="${id}" class="dr-toast ${type}"><span>${message}</span></div>`);
        setTimeout(() => $(`#${id}`).remove(), 4000);
    },

    showProcessingOverlay: function (message = "Processing...") {
        if ($('#dr-processing-overlay').length === 0) {
            $('body').append(`
                <div id="dr-processing-overlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(255,255,255,0.85); z-index: 9999; display: flex; flex-direction: column; align-items: center; justify-content: center; backdrop-filter: blur(4px);">
                    <i class="fa fa-spinner fa-spin" style="font-size: 48px; color: #2563EB; margin-bottom: 16px;"></i>
                    <h3 id="dr-overlay-msg" style="color: #1E293B; font-weight: 700; font-size: 18px; margin: 0;">${message}</h3>
                </div>
            `);
        } else {
            $('#dr-overlay-msg').text(message);
            $('#dr-processing-overlay').show();
        }
    },

    hideProcessingOverlay: function () {
        $('#dr-processing-overlay').fadeOut(200, function () { $(this).remove(); });
    }
};

window.SubmissionUI = SubmissionUI;