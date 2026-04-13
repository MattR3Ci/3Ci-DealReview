/**
 * SubmissionCalc.js
 * Logic engine for calculating form completion and business rules.
 */
const SubmissionCalc = {
    _isFieldFilled: function (data, key) {
        if (!window.SCHEMA || !window.SCHEMA.FIELDS || !window.SCHEMA.FIELDS.DEALS) return false;

        const FIELDS = window.SCHEMA.FIELDS.DEALS;
        const val = data[key];

        if (val === undefined || val === null || val === "") return false;
        if (key === FIELDS.VALUE) return parseFloat(val) > 0;
        if (key === FIELDS.SF_LINK) {
            const sfPattern = /^https:\/\/mau\.lightning\.force\.com\/lightning\/r\/Opportunity\/[a-zA-Z0-9]{15,18}(\/view)?\/?$/;
            return sfPattern.test(val);
        }
        return true;
    },

    // --- NEW: Dynamic Matrix Interpreter ---
    getRequiredDocs: function(data) {
        const defaultDocs = [];
        const settings = window.model?.globalSettings;
        const matrixStr = settings ? settings[window.SCHEMA.FIELDS.GLOBAL_SETTINGS.MATRIX] : null;
        
        if (!matrixStr) return defaultDocs;
        
        try {
            const matrix = JSON.parse(matrixStr);
            const rules = matrix.rules || matrix; // Support both JSON structures
            const docTypes = matrix.docTypes || [];

            // Map Dataverse Choice int to Matrix String keys
            const modelInt = parseInt(data[window.SCHEMA.FIELDS.DEALS.COMMERCIAL_MODEL]);
            const modelMap = { 0: "TM", 1: "TM_NTE", 2: "FIXED_FEE", 3: "FIXED_CAP", 4: "TM" }; 
            const modelKey = modelMap[modelInt] || "TM";
            
            // Filter docTypes based on the Matrix rules
            return docTypes.filter(doc => {
                const rule = (rules[doc.id] && rules[doc.id][modelKey]) ? rules[doc.id][modelKey] : "Optional";
                return doc.locked || rule === "Required";
            });
        } catch(e) {
            console.error("Document Matrix Parse Error:", e);
            return defaultDocs;
        }
    },

    getGlobalProgress: function (data, uploadedDocs = null) {
        let docs = [];
        if (uploadedDocs !== null) {
            docs = uploadedDocs; 
        } else if (window.SubmissionApp && window.SubmissionApp.state && window.SubmissionApp.state.uploadedDocs) {
            docs = window.SubmissionApp.state.uploadedDocs; 
        }

        const statuses = this.getSectionStatuses(data, docs);
        const requiredSections = ['basics', 'commercial', 'dates', 'roles', 'salesforce', 'documents'];

        const filledCount = requiredSections.filter(s => statuses[s] === true).length;
        const totalCount = requiredSections.length;
        const percent = Math.round((filledCount / totalCount) * 100);

        return {
            percent: percent,
            remaining: totalCount - filledCount,
            isComplete: filledCount === totalCount
        };
    },

    getSectionStatuses: function (data, uploadedDocs = []) {
        if (!window.SCHEMA || !window.SCHEMA.FIELDS || !window.SCHEMA.FIELDS.DEALS || !window.SCHEMA.CHOICES || !window.SCHEMA.CHOICES.DEAL_TYPES) {
            return { basics: false, commercial: false, dates: false, roles: false, salesforce: false, risk: true, documents: false };
        }

        const FIELDS = window.SCHEMA.FIELDS.DEALS;
        const TYPES = window.SCHEMA.CHOICES.DEAL_TYPES;

        const commercialRequired = [FIELDS.COMMERCIAL_MODEL, FIELDS.BILLING_FREQ, FIELDS.PAYMENT_TERMS];
        let commercialFilled = commercialRequired.every(k => this._isFieldFilled(data, k));

        const currentType = parseInt(data[FIELDS.TYPE]);
        const needsParent = [TYPES["Change Request"], TYPES["Extension"]].includes(currentType);

        if (needsParent && !this._isFieldFilled(data, FIELDS.PARENT_LINK)) {
            commercialFilled = false;
        }

        // --- NEW BUSINESS RULE (TDD) ---
        // If Tech Risk is High, Exception must be requested.
        let riskValid = true;
        const RISK_LEVELS = window.SCHEMA.CHOICES.RISK_LEVELS || { High: 2 };
        if (parseInt(data[FIELDS.TECH_RISK]) === RISK_LEVELS.High) {
            if (!data[FIELDS.EXCEPTION_REQ]) {
                riskValid = false;
            }
        }

        // Fixed: Pass 'data' to documentProgress so the matrix knows the commercial model!
        let isDocsComplete = false;
        if (window.UIComponents && window.UIComponents.documentProgress) {
            isDocsComplete = window.UIComponents.documentProgress(uploadedDocs, data).isComplete;
        }

        return {
            basics: this._isFieldFilled(data, FIELDS.TITLE) &&
                this._isFieldFilled(data, FIELDS.CLIENT_TEXT) &&
                this._isFieldFilled(data, FIELDS.TYPE) &&
                this._isFieldFilled(data, FIELDS.VALUE),
            commercial: commercialFilled,
            dates: this._isFieldFilled(data, FIELDS.START_DATE),
            roles: this._isFieldFilled(data, FIELDS.SALES_LEADER) &&
                this._isFieldFilled(data, FIELDS.ACCOUNTABLE_EXEC) &&
                this._isFieldFilled(data, FIELDS.DELIVERY_LEAD),
            salesforce: this._isFieldFilled(data, FIELDS.SF_LINK) &&
                this._isFieldFilled(data, FIELDS.SF_STAGE),
            risk: riskValid,
            documents: isDocsComplete 
        };
    },

    getBasicsProgress: function (data) {
        return this.getGlobalProgress(data);
    }
};

window.SubmissionCalc = SubmissionCalc;