window.SecurityUtils = {
    checkLoginStatus: () => {
        const allLinks = Array.from(document.querySelectorAll('a'));
        const isLoggedIn = allLinks.some(a => {
            const text = a.innerText.trim().toLowerCase();
            return text === "profile" || text === "sign out";
        });

        if (!isLoggedIn) {
            SecurityUtils.showLoginModal();
            return false;
        }
        return true;
    },

    closeModal: () => {
        const modal = document.getElementById("loginModal");
        if (modal) modal.remove(); 
    },

    showLoginModal: () => {
        if (document.getElementById("loginModal")) return;

        const modalHtml = `
            <div id="loginModal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(15, 23, 42, 0.7); z-index:9999; display:flex; justify-content:center; align-items:center; backdrop-filter: blur(4px);">
              <div style="background:white; padding:40px; border-radius:12px; max-width:440px; text-align:center; position:relative; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
                <button id="dr-modal-close-x" style="position:absolute; top:15px; right:15px; border:none; background:none; font-size:20px; cursor:pointer; color:#999;">&times;</button>
                <i class="fa fa-lock" style="font-size: 48px; color: #004A99; margin-bottom: 20px;"></i>
                <h2 style="margin-top:0; font-family: ui-sans-serif, system-ui; font-weight: 800; color: #1E293B;">Session Expired</h2>
                <p style="color: #64748B; line-height: 1.5; font-family: ui-sans-serif, system-ui;">Dataverse information cannot be loaded while you are signed out.</p>
                <hr style="margin: 20px 0; border: 0; border-top: 1px solid #E2E8F0;">
                <p style="font-family: ui-sans-serif, system-ui; font-size: 14px;"><strong>Please sign back in via the link in the top right corner.</strong></p>
                <button id="dr-modal-got-it" style="margin-top: 20px; background-color: #004A99; color: #fff; border: none; padding: 12px 30px; border-radius: 6px; font-weight: 700; cursor: pointer; font-family: ui-sans-serif, system-ui;">
                    Got it
                </button>
              </div>
            </div>
          `;
          
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        document.getElementById('dr-modal-close-x').addEventListener('click', SecurityUtils.closeModal);
        document.getElementById('dr-modal-got-it').addEventListener('click', SecurityUtils.closeModal);
    }
};

const SubmissionApp = {
    state: {
        activeSection: 'basics',
        isNewRecord: true,
        isDirty: false, 
        recordId: null,
        dealData: {} 
    },

    setupInitialState: function () {
        const F = window.SCHEMA.FIELDS.DEALS;
        const C = window.SCHEMA.CHOICES;

        this.state.dealData = {
            [F.TITLE]: "", [F.CLIENT_TEXT]: "", [F.TYPE]: 0, [F.VALUE]: "", [F.DESCRIPTION]: "",
            [F.COMMERCIAL_MODEL]: 0, [F.BILLING_FREQ]: 0, [F.PAYMENT_TERMS]: 0, [F.MARGIN]: "", [F.START_DATE]: "",
            [F.SALES_LEADER]: "", [F.ACCOUNTABLE_EXEC]: "", [F.DELIVERY_LEAD]: "", [F.SOLUTIONS_LEADER]: "",
            [F.SF_LINK]: "", [F.SF_STAGE]: 0,
            [F.EXCEPTION_REQ]: false, [F.TECH_RISK]: 0, [F.RESOURCE_RISK]: 0,
            [F.STATUS]: C.STATUS.DRAFT,
            clientId: ""
        };
    },

    init: async function () {
        console.log("🚀 Submission Orchestrator Initializing...");
        this.setupInitialState();
        this.renderSkeletons();

        await new Promise(resolve => setTimeout(resolve, 500));
        
        if (!window.SecurityUtils.checkLoginStatus()) {
            console.warn("DealBoard init halted: User not logged in.");
            $('#deal-grid').html(`
                <div class="w-100 text-center p-5">
                    <i class="fa fa-lock fa-3x text-muted mb-3" style="opacity: 0.3;"></i>
                    <h3 class="text-muted" style="font-weight: 700;">Sign In Required</h3>
                </div>
            `);
            return; 
        }

        const urlParams = new URLSearchParams(window.location.search);
        const idParam = urlParams.get('id');

        // --- FIXED: Load Global Settings dynamically alongside references! ---
        await Promise.all([
            this.initClientDropdown(),
            this.fetchEligibleStaff(),
            window.SubmissionService.loadGlobalSettings()
        ]);

        const cloneDataRaw = sessionStorage.getItem('dr_clone_data');

        if (cloneDataRaw) {
            const cloneData = JSON.parse(cloneDataRaw);
            this.state.dealData = { ...this.state.dealData, ...cloneData };
            this.state.isNewRecord = true; 
            this.state.isDirty = true;    

            sessionStorage.removeItem('dr_clone_data');
            this.refreshUI();
            if (window.SubmissionUI) window.SubmissionUI.showToast("Deal cloned successfully. Please review and save.", "info");
        }
        else if (idParam) {
            await this.loadExistingDeal(idParam);
            await this.updateDocumentMetrics();
        }

        this.bindEvents();
        this.refreshUI();
    },

    fetchEligibleStaff: async function () {
        try {
            const query = "?$select=fullname,emailaddress1,ci_reviewleaderrole&$filter=ci_reviewleaderrole ne null&$orderby=fullname asc";
            const url = `/_api/contacts${query}`;
            const response = await fetch(url, { headers: { "Accept": "application/json" } });

            if (!response.ok) throw new Error("Could not fetch staff from Dataverse");
            const data = await response.json();
            window.model = window.model || {};
            window.model.staffData = data.value || [];
        } catch (err) {
            console.error("Failed to initialize eligible staff:", err);
            window.model = window.model || {};
            window.model.staffData = [];
        }
    },

    loadExistingDeal: async function (id) {
        const F = window.SCHEMA.FIELDS.DEALS;
        try {
            const deal = await window.SubmissionService.getDealById(id);

            if (deal) {
                this.state.dealData = deal; 
                this.state.recordId = deal[F.DEALID]; 
                this.state.spId = deal[F.EXTERNALKEY]; 
                this.state.isNewRecord = false;

                Object.keys(this.state.dealData).forEach(key => {
                    if (deal[key] !== undefined && deal[key] !== null) {
                        let val = deal[key];
                        const dateFields = [F.START_DATE, F.END_DATE, F.REVIEW_DEADLINE];
                        if (dateFields.includes(key) && typeof val === 'string' && val.includes('T')) {
                            val = val.split('T')[0];
                        }
                        this.state.dealData[key] = val;
                    }
                });

                this.refreshUI();
            }
        } catch (err) {
            console.error("❌ loadExistingDeal Failure:", err);
            SubmissionUI.showToast("Could not load deal details.", "error");
        }
    },

    bindEvents: function () {
        const self = this;
        const F = window.SCHEMA.FIELDS.DEALS;

        $('#btn-save-draft').off('click').on('click', async () => {
            await self._executeSaveWorkflow(false); 
        });

        $('#btn-submit').off('click').on('click', async () => {
            if (!confirm("Are you sure you want to submit this deal for review? This will lock the record.")) return;

            const pendingDocs = this.getPendingDocs();

            if (pendingDocs.length > 0) {
                this._showAIShield();

                const spId = self.state.spId || self.state.dealData[F.EXTERNALKEY];
                const scanPromises = pendingDocs.map(doc => window.SubmissionService.runAIAudit(doc.id, spId));

                await Promise.all(scanPromises);
                $('#ai-processing-shield').fadeOut(300, function () { $(this).remove(); });
            }

            await self._executeSaveWorkflow(true);
        });

        $(document).off('click', '#add-client-prompt').on('click', '#add-client-prompt', async function () {
            const newName = $(this).find('strong').text();
            const originalHtml = $(this).html();

            $(this).html('<i class="fa fa-spinner fa-spin mr-2" style="color: #D97706;"></i> <span style="color:#92400E;">Saving...</span>').css('pointer-events', 'none');

            try {
                const newClient = await window.SubmissionService.addNewClient(newName);

                if (newClient) {
                    const clientFields = window.SCHEMA?.FIELDS?.CLIENTS || {};
                    const idKey = clientFields.ID || "id";

                    window.model.clients.push(newClient);
                    self.state.dealData[F.CLIENT_TEXT] = newName;
                    self.state.dealData.clientId = newClient[idKey];

                    self.refreshUI();
                    SubmissionUI.showToast(`"${newName}" successfully added to the client list.`);
                }
            } catch (err) {
                console.error("Client Creation Error:", err);
                SubmissionUI.showToast("Failed to create new client.", "error");
                $(this).html(originalHtml).css('pointer-events', 'auto');
            }
        });

        $(document).off('click', '#btn-open-workspace').on('click', '#btn-open-workspace', async function (e) {
            e.preventDefault();
            const $btn = $(this);
            const originalHtml = $btn.html();

            if (SubmissionApp.state.isDirty || SubmissionApp.state.isNewRecord) {
                window.SubmissionUI.showProcessingOverlay("Provisioning Workspace...");
                await self._executeSaveWorkflow();
                SubmissionApp.state.isDirty = false; 
            }

            let spId = SubmissionApp.state.spId || SubmissionApp.state.dealData[window.SCHEMA.FIELDS.DEALS.EXTERNALKEY];

            if (!spId && SubmissionApp.state.recordId) {
                $btn.html('<i class="fa fa-spinner fa-spin mr-2"></i> Provisioning Workspace...');
                for (let i = 0; i < 3; i++) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    try {
                        const updatedDeal = await window.SubmissionService.getDealById(SubmissionApp.state.recordId);
                        if (updatedDeal && updatedDeal[window.SCHEMA.FIELDS.DEALS.EXTERNALKEY]) {
                            spId = updatedDeal[window.SCHEMA.FIELDS.DEALS.EXTERNALKEY];
                            SubmissionApp.state.spId = spId;
                            SubmissionApp.state.dealData[window.SCHEMA.FIELDS.DEALS.EXTERNALKEY] = spId;
                            break;
                        }
                    } catch (err) { }
                }
            }

            $btn.html(originalHtml).css('pointer-events', 'auto');

            if (spId && !isNaN(spId)) {
                window.location.href = `/document-governance/?id=${spId}`;
            } else {
                SubmissionUI.showToast("Workspace is still provisioning. Please wait a few seconds and click again.", "warning");
            }
        });

        $('#form-workspace').off('input change').on('input change', 'input, select, textarea', (e) => {
            self.state.isDirty = true; 
            const fieldId = e.target.id;
            const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
            const $el = $(e.target);

            if (fieldId === F.CLIENT_TEXT) {
                const result = this.findClientMatch(value);
                self.state.dealData[F.CLIENT_TEXT] = value;
                self.state.dealData.clientId = result.match ? result.match[window.SCHEMA.FIELDS.CLIENTS.ID || "id"] : "";

                if (result.match) {
                    $('#add-client-prompt').hide();
                    $el.css('border-radius', 'var(--radius-sm)');
                } else if (value.trim().length > 2) {
                    $('#add-client-prompt').show().find('strong').text(value.trim());
                    $el.css({ 'border-bottom-left-radius': '0', 'border-bottom-right-radius': '0' });
                } else {
                    $('#add-client-prompt').hide();
                    $el.css('border-radius', 'var(--radius-sm)');
                }
            } else {
                self.state.dealData[fieldId] = value;
            }

            if (fieldId === F.SF_LINK) {
                const isValid = window.SubmissionCalc ? window.SubmissionCalc._isFieldFilled(self.state.dealData, F.SF_LINK) : true;
                $el.toggleClass('is-invalid', (value.length > 0 && !isValid));
            }

            if (fieldId === F.TYPE) {
                this.refreshUI();
            } else {
                self.updateHeaderMetrics();
                SubmissionUI.renderSidebar(self.state.dealData, self.state.activeSection);
            }

            self.bindNavEvents();
        });

        this.bindNavEvents();
    },

    getPendingDocs: function () {
        return (this.state.uploadedDocs || []).filter(doc =>
            (doc.status || "").toLowerCase() !== "missing" &&
            doc.healthScore === "Pending" &&
            !doc.isExternalLink 
        );
    },

    findClientMatch: function (value) {
        const clients = window.model?.clients || [];
        const clientFields = window.SCHEMA?.FIELDS?.CLIENTS || {};
        const titleKey = clientFields.TITLE || "title";
        const match = clients.find(c => c[titleKey].toLowerCase() === value.toLowerCase().trim());
        return { match: match };
    },

    _showAIShield: function () {
        $('body').append(`
            <div id="ai-processing-shield" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(5px); display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 9999;">
                <div class="mb-4" style="font-size: 48px; color: #8B5CF6; animation: pulse 1.5s infinite;">
                    <i class="fa fa-microchip"></i>
                </div>
                <h3 class="font-bold mb-2" style="color: #4C1D95;">Running AI Contract Review...</h3>
                <p class="text-muted text-sm mb-4">Scanning documents for commercial and legal compliance.</p>
                <div class="progress" style="width: 300px; height: 6px; border-radius: 3px;">
                    <div class="progress-bar progress-bar-striped progress-bar-animated" style="width: 100%; background-color: #8B5CF6;"></div>
                </div>
            </div>
        `);
    },

    bindNavEvents: function () {
        const self = this;
        $(document).off('click', '#sidebar-rail .nav-item').on('click', '#sidebar-rail .nav-item', function () {
            const section = $(this).data('section');
            if (section) {
                self.state.activeSection = section;
                self.refreshUI();
            }
        });
    },

    refreshUI: async function () {
        const S = window.SCHEMA.CHOICES.STATUS;
        const F = window.SCHEMA.FIELDS.DEALS;
        const isLocked = [S.SUBMITTED, S.APPROVED].includes(parseInt(this.state.dealData[F.STATUS]));

        SubmissionUI.renderSection(this.state.activeSection, this.state.dealData);
        SubmissionUI.renderSidebar(this.state.dealData, this.state.activeSection);

        if (this.state.activeSection === 'basics') {
            const descId = F.DESCRIPTION;
            const $editor = $(`#${descId}`);

            if ($editor.length && !$editor.hasClass('ql-container')) {
                this.quillDescription = new Quill(`#${descId}`, {
                    theme: 'snow',
                    modules: {
                        toolbar: [
                            ['bold', 'italic', 'underline'],
                            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                            ['clean']
                        ]
                    },
                    placeholder: $editor.data('placeholder') || 'Enter description...'
                });

                this.quillDescription.on('text-change', () => {
                    this.state.dealData[descId] = this.quillDescription.root.innerHTML;
                    this.updateHeaderMetrics();
                    SubmissionUI.renderSidebar(this.state.dealData, this.state.activeSection);
                });

                if (isLocked) {
                    this.quillDescription.disable();
                    $('.ql-toolbar').hide(); 
                    $editor.parent().find('.ql-editor').css('background-color', '#F8FAFC');
                    $editor.parent().css({ 'border': 'none', 'background': '#F8FAFC' }); 
                }
            }
        }

        if (isLocked) {
            this.applyRecordLock();
        } else {
            $('#lock-banner').remove();
        }

        this.updateHeaderMetrics();
        this.bindNavEvents();
    },

    applyRecordLock: function () {
        const statusLabel = this._getRecordLockLabel();

        $('#form-workspace input, #form-workspace select, #form-workspace textarea')
            .prop('disabled', true)
            .css({
                'background-color': '#F8FAFC',
                'cursor': 'not-allowed',
                'color': '#64748B',
                'border-color': '#E2E8F0'
            });

        if (!$('#lock-banner').length) {
            $(`
                <div id="lock-banner" style="background: #FFFBEB; border: 1px solid #FCD34D; color: #92400E; padding: 16px 24px; font-size: 13px; border-radius: 8px; margin-bottom: 24px; display: flex; align-items: center; gap: 10px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                    <i class="fa fa-lock" style="font-size: 16px;"></i>
                    <span>
                        <strong>READ-ONLY RECORD:</strong> This deal has been <u>${statusLabel}</u>. 
                        Changes are disabled unless the record is returned to Draft.
                    </span>
                </div>
            `).prependTo('#form-workspace');
        }
    },

    _getRecordLockLabel: function () {
        const S = window.SCHEMA.CHOICES.STATUS;
        const F = window.SCHEMA.FIELDS.DEALS;
        const statusVal = parseInt(this.state.dealData[F.STATUS]);
        return (statusVal === S.APPROVED) ? "APPROVED" : "SUBMITTED";
    },

    _isRecordLocked: function () {
        const S = window.SCHEMA.CHOICES.STATUS;
        const F = window.SCHEMA.FIELDS.DEALS;
        const statusVal = parseInt(this.state.dealData[F.STATUS]);
        return [S.SUBMITTED, S.APPROVED].includes(statusVal);
    },

    _canSubmit: function (sectionStats, docsComplete) {
        return sectionStats.basics &&
            sectionStats.commercial &&
            sectionStats.dates &&
            sectionStats.roles &&
            sectionStats.salesforce &&
            docsComplete;
    },

updateHeaderMetrics: function () {
        const data = this.state.dealData;
        const F = window.SCHEMA.FIELDS.DEALS;
        
        // FIX: Ensure docs is always an array, even if SharePoint is still loading
        const safeDocs = this.state.uploadedDocs || []; 

        const stats = (window.SubmissionCalc)
            ? window.SubmissionCalc.getGlobalProgress(data, safeDocs)
            : { percent: 0, remaining: 10, isComplete: false };

        const sectionStats = (window.SubmissionCalc)
            ? SubmissionCalc.getSectionStatuses(data)
            : {};

        const $block = $('.progress-block');
        const $label = $('#ui-progress-label');

        $('#ui-progress-ring').removeClass('shimmer is-loading');

        if (stats.percent === 100) {
            $block.addClass('is-complete');
            if ($label.length) $label.text("READY TO SUBMIT");
        } else {
            $block.removeClass('is-complete');
            if ($label.length) $label.text("INCOMPLETE");
        }

        const ringStyles = UIComponents.readinessStyles(stats.percent);

        $('#ui-progress-ring')
            .text(`${stats.percent}%`)
            .css({
                'background-color': ringStyles.bg,
                'color': ringStyles.text,
                'border': `2px solid ${ringStyles.border}`
            });
        const sectionText = stats.remaining === 1 ? '1 section' : `${stats.remaining} sections`;
        $('#ui-fields-remaining').text(stats.isComplete ? "All sections complete" : `${sectionText} remaining`);
        $('.dr-progress-bar').css('width', `${stats.percent}%`);

        // FIX: Use safeDocs here as well
        const docProgress = (window.UIComponents && window.UIComponents.documentProgress)
            ? window.UIComponents.documentProgress(safeDocs, data)
            : { isComplete: false };

        const docsComplete = docProgress.isComplete;
        const canSubmit = this._canSubmit(sectionStats, docsComplete);
        const isLocked = this._isRecordLocked();

        if (isLocked) {
            $('#btn-save-draft, #btn-submit').hide().css('display', 'none', 'important');
        } else {
            $('#btn-save-draft').show();
            $('#btn-submit')
                .show()
                .prop('disabled', !canSubmit)
                .css('opacity', canSubmit ? 1 : 0.6);
        }

        if ($('#display-deal-name').length) {
            const fullTitle = data[F.TITLE] || "New Deal Submission";
            $('#display-deal-name').text(fullTitle).attr('title', fullTitle);

            const $titleBlock = $('.title-block');
            if (!$('#btn-back-to-board').length) {
                $titleBlock.prepend(`
                    <a href="/" id="btn-back-to-board" class="d-inline-flex align-items-center mb-1" 
                    style="color: var(--brand-primary); font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; text-decoration: none; gap: 5px;">
                        <i class="fa fa-arrow-left"></i> Back to Deal Board
                    </a>
                `);
            }
        }

        if ($('#display-deal-id').length) {
            const rawValue = data[F.VALUE];
            $('#display-deal-id').text(rawValue > 0 ? SubmissionUI.components.formatCurrency(rawValue) : "Create new deal");
        }
    },

    updateDocumentMetrics: async function () {
        const F = window.SCHEMA.FIELDS.DEALS;
        const spId = this.state.spId || this.state.dealData[F.EXTERNALKEY];

        if (!spId) return;

        try {
            const docs = await window.SubmissionService.loadDocumentsViaFlow(spId);
            this.state.uploadedDocs = docs;

            SubmissionUI.renderSidebar(this.state.dealData, this.state.activeSection);
            this.updateHeaderMetrics();

            const $progressContainer = $('#ui-doc-governance-progress');
            if ($progressContainer.length > 0) {
                $progressContainer.fadeIn();
                // FIX: Add safety fallback here in case the flow returns null
                const meta = UIComponents.documentProgress(docs || [], this.state.dealData);

                $('#ui-doc-count').text(meta.count).css('color', meta.color);
                $('#ui-doc-progress-bar').css({
                    'width': meta.percent + '%',
                    'background-color': meta.color
                });
                $('#ui-missing-docs-list').html(meta.missingHtml);
            }
        } catch (err) {
            console.error("❌ Document Metric Error:", err);
        }
    },

    _executeSaveWorkflow: async function (isSubmit = false) {
        const S = window.SCHEMA.CHOICES.STATUS;

        if (this.state.dealData[window.SCHEMA.FIELDS.DEALS.STATUS] === S.SUBMITTED && !isSubmit) {
            SubmissionUI.showToast("Cannot save a submitted record.", "error");
            return;
        }

        const $btn = isSubmit ? $('#btn-submit') : $('#btn-save-draft');
        const originalText = $btn.html();

        try {
            $btn.html(`<i class="fa fa-spinner fa-spin"></i> ${isSubmit ? 'Submitting...' : 'Saving...'}`).prop('disabled', true);

            const F = window.SCHEMA.FIELDS.DEALS;
            const C = window.SCHEMA.CHOICES;

            if (this.state.dealData[F.VALUE]) {
                this.state.dealData[F.VALUE] = parseFloat(this.state.dealData[F.VALUE]);
            }

            this.state.dealData[F.STATUS] = isSubmit ? C.STATUS.SUBMITTED : C.STATUS.DRAFT;

            if (isSubmit) {
                this.state.dealData[F.REVIEW_NOTES] = "";
                this.state.dealData[F.ACTION_REQUIRED] = "";
                // Capture submission timestamp for telemetry
                this.state.dealData[F.SUBMITTED_ON] = new Date().toISOString();
                // Reset First Reviewed in case this is a re-submission
                this.state.dealData[F.FIRST_REVIEWED_ON] = null;
            }

            const result = await window.SubmissionService.saveDraft(
                this.state.dealData,
                this.state.recordId
            );

            if (result.success && result.id) {
                await window.SubmissionService.patchDeal(result.id, this.state.dealData);

                if (isSubmit) {
                    try {
                        const dealName = this.state.dealData[F.TITLE] || "Your Deal";
                        
                        // 1. Define the Deal Desk email first
                        const deskEmail = window.model?.globalSettings?.[window.SCHEMA.FIELDS.GLOBAL_SETTINGS.EMAIL] || "dealdesk@3ci.tech";

                        // 2. Safely calculate the Owner Email (Never send "null")
                        let owner = deskEmail; // Default to desk email to prevent Flow crash
                        if (window.USER_CONTEXT && window.USER_CONTEXT.emailaddress1 && window.USER_CONTEXT.emailaddress1 !== "null") {
                            owner = window.USER_CONTEXT.emailaddress1;
                        } else if (this.state.dealData[F.SALES_LEADER] && String(this.state.dealData[F.SALES_LEADER]).includes('@')) {
                            owner = this.state.dealData[F.SALES_LEADER];
                        }

                        // 3. Build and send the payload
                        const emailPayload = {
                            dealId: String(this.state.spId || result.id),
                            dealName: dealName,
                            ownerEmail: owner,
                            clientName: this.state.dealData[F.CLIENT_TEXT] || "Unknown Client",
                            
                            // FIXED: Converted numbers to strings to match Flow Schema
                            totalValue: String(this.state.dealData[F.VALUE] || 0), 
                            margin: String(this.state.dealData[F.MARGIN] || 0),    
                            
                            // FIXED: Matched exact lowercase property name from Schema
                            dealdeskemail: deskEmail 
                        };

                        console.log("📤 Sending Notification Payload:", emailPayload);

                        await fetch(window.SCHEMA.ENDPOINTS.NOTIFY_SUBMISSION, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(emailPayload)
                        });
                        console.log("📧 Submission notification email triggered.");
                    } catch (emailErr) {
                        console.error("Failed to trigger email flow:", emailErr);
                    }
                    
                    const dealName = this.state.dealData[F.TITLE] || "Your Deal";
                    $('body').append(SubmissionUI.components.successOverlay(dealName));
                    setTimeout(() => window.location.href = '/', 3000);
                } else {
                    this._handleSaveSuccess(result.id);
                }
            }
        } catch (err) {
            console.error(`❌ ${isSubmit ? 'Submit' : 'Save'} Failed:`, err);
            SubmissionUI.showToast(`Error: ${err.message || "Unknown Error"}`, "error");
        } finally {
            if (!isSubmit) $btn.html(originalText).prop('disabled', false);
        }
    },

    _handleSaveSuccess: async function (recordId) {
        SubmissionUI.showToast("Deal draft saved successfully", "success");
        this.state.isNewRecord = false;
        this.state.recordId = recordId;

        const newUrl = `${window.location.pathname}?id=${recordId}`;
        window.history.replaceState({ path: newUrl }, '', newUrl);
        await this.updateDocumentMetrics();
        this.refreshUI();
    },

    renderSkeletons: function () {
        const sidebarHtml = Array(5).fill(0).map(() => `
            <div class="shimmer is-loading skeleton-sidebar-item"></div>
        `).join('');
        $('#sidebar-rail').html(sidebarHtml);

        const formHtml = `
            <div class="submission-card">
                <div class="shimmer is-loading" style="width: 40%; height: 28px; margin-bottom: 32px;"></div>
                <div class="shimmer is-loading" style="width: 15%; height: 14px; margin-bottom: 8px;"></div>
                <div class="shimmer is-loading skeleton-form-group"></div>
                
                <div class="grid-2-col gap-4">
                    <div>
                        <div class="shimmer is-loading" style="width: 30%; height: 14px; margin-bottom: 8px;"></div>
                        <div class="shimmer is-loading skeleton-form-group"></div>
                    </div>
                    <div>
                        <div class="shimmer is-loading" style="width: 30%; height: 14px; margin-bottom: 8px;"></div>
                        <div class="shimmer is-loading skeleton-form-group"></div>
                    </div>
                </div>
                
                <div class="shimmer is-loading" style="width: 20%; height: 14px; margin-bottom: 8px; margin-top: 16px;"></div>
                <div class="shimmer is-loading" style="width: 100%; height: 120px; border-radius: 6px;"></div>
            </div>
        `;
        $('#form-workspace').html(formHtml);

        $('#ui-progress-ring').html('').css({
            'background-color': '#f1f5f9', 'border-color': '#e2e8f0'
        }).addClass('shimmer is-loading');
    },

    initClientDropdown: async function () {
        try {
            const clients = await window.SubmissionService.loadClients();
            window.model = window.model || { clients: [] };
            window.model.clients = clients;
        } catch (err) { console.error("Failed to initialize clients:", err); }
    }
};

window.SubmissionApp = SubmissionApp;

$(document).ready(() => {
    const checkDependencies = setInterval(() => {
        if (window.SCHEMA &&
            window.UIComponents &&
            window.SubmissionUI &&
            window.SubmissionCalc &&
            window.SubmissionService) {

            clearInterval(checkDependencies);
            console.log("✅ All Dependencies Verified. Launching App...");
            window.AppDebug = SubmissionApp;
            SubmissionApp.init();
        }
    }, 50);
});