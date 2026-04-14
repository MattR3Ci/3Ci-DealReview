/**
 * jest.setup.js
 * Mocks the Power Pages environment for Jest tests.
 */

// 1. Core Browser Mocks
global.window = global;
global.window._jqueryBindings = [];
global.window.location = { search: "", pathname: "/" };
global.window.history = { replaceState: jest.fn() };
global.window.scrollTo = jest.fn();
global.sessionStorage = { getItem: jest.fn(), removeItem: jest.fn(), setItem: jest.fn() };

// 2. jQuery Mock Setup
const createDeferred = () => {
    const deferred = {
        done: jest.fn().mockImplementation((cb) => { deferred.doneCallback = cb; return deferred; }),
        fail: jest.fn().mockImplementation((cb) => { deferred.failCallback = cb; return deferred; }),
        resolve: jest.fn().mockImplementation((val) => { if (deferred.doneCallback) deferred.doneCallback(val); return deferred; }),
        reject: jest.fn().mockImplementation((err) => { if (deferred.failCallback) deferred.failCallback(err); return deferred; })
    };
    return deferred;
};

const mockJQueryObj = {
    html: jest.fn().mockReturnThis(),
    append: jest.fn().mockReturnThis(),
    prependTo: jest.fn().mockReturnThis(),
    off: jest.fn().mockReturnThis(),
    on: jest.fn().mockReturnThis(),
    find: jest.fn().mockReturnThis(),
    hide: jest.fn().mockReturnThis(),
    show: jest.fn().mockReturnThis(),
    data: jest.fn().mockReturnValue('basics'),
    addClass: jest.fn().mockReturnThis(),
    removeClass: jest.fn().mockReturnThis(),
    prop: jest.fn().mockReturnThis(),
    css: jest.fn().mockReturnThis(),
    val: jest.fn().mockReturnValue(''),
    text: jest.fn().mockReturnThis(),
    attr: jest.fn().mockReturnThis(),
    fadeIn: jest.fn().mockReturnThis(),
    fadeOut: jest.fn().mockImplementation((timeout, cb) => { if (cb) cb(); return mockJQueryObj; }),
    remove: jest.fn().mockReturnThis(),
    hasClass: jest.fn().mockReturnValue(false),
    parent: jest.fn().mockReturnThis(),
    toggleClass: jest.fn().mockReturnThis(),
    ready: jest.fn().mockImplementation((cb) => { if (cb) cb(); return mockJQueryObj; }),
    length: 1
};

global.window.$ = global.window.jQuery = jest.fn((selector) => {
    if (typeof selector === 'function') { selector(); return mockJQueryObj; }
    return mockJQueryObj;
});
global.window.$.Deferred = createDeferred;

// 3. Power Pages / Business Logic Mocks
global.window.shell = {
    getTokenDeferred: jest.fn(() => createDeferred())
};

global.window.SCHEMA = {
    TABLES: {
        DEALS: "ci_dealses",
        CLIENTS: "ci_clientaccountses",
        REVIEW_HISTORY: "ci_reviewnoteses",
        CONTRACT_STANDARDS: "ci_dr_contractstandardses",
        GLOBAL_SETTINGS: "ci_dr_globalsettings",
        AI_OVERRIDES: "ci_ai_overrideses",
        DEAL_IMPACTS: "ci_deal_impactses"
    },

    FIELDS: {
        DEALS: {
            DEALID: "ci_dealsid",
            EXTERNALKEY: "ci_externalprimarykey",
            TITLE: "ci_title",
            CLIENT_TEXT: "ci_clientaccountidtext",
            TYPE: "ci_dealtype",
            VALUE: "ci_totalvalue",
            DESCRIPTION: "ci_description",
            STATUS: "ci_status",
            COMMERCIAL_MODEL: "ci_commercialmodel",
            MARGIN: "ci_estimatedmargin",
            PAYMENT_TERMS: "ci_paymentterms",
            START_DATE: "ci_startdate",
            END_DATE: "ci_enddate",
            REVIEW_DEADLINE: "ci_reviewdeadline",
            BILLING_FREQ: "ci_billingfrequency",
            SALES_LEADER: "ci_salesleaderemail",
            DELIVERY_LEAD: "ci_deliveryleaderemail",
            SOLUTIONS_LEADER: "ci_salessolutionleaderemail",
            ACCOUNTABLE_EXEC: "ci_accountableexecutiveemail",
            EXCEPTION_REQ: "ci_exceptionrequested",
            EXCEPTION_APP: "ci_exceptionapproved",
            TECH_RISK: "ci_technicalrisk",
            RESOURCE_RISK: "ci_resourcerisk",
            PARENT_LINK: "ci_parentcontract",
            SF_LINK: "ci_salesforceopportunityid",
            SF_STAGE: "ci_salesforcestage",
            MODIFIED: "ci_modified",
            REVIEW_NOTES: "ci_reviewnotes",
            ACTION_REQUIRED: "ci_actionrequired",
            SUBMITTED_ON: "ci_submittedon",
            FIRST_REVIEWED_ON: "ci_firstreviewedon"
        },
        CLIENTS: {
            ID: "ci_clientaccountsid",
            TITLE: "ci_title"
        },
        REVIEW_HISTORY: {
            ID: "ci_reviewnotesid",
            DEAL_ID: "ci_dealid",
            DECISION: "ci_reviewdecision",
            NOTES: "ci_reviewnotes",
            ACTION: "ci_actionrequired",
            DATE: "createdon"
        },
        CONTRACT_STANDARDS: {
            ID: "ci_dr_contractstandardsid",
            NAME: "ci_name",
            CATEGORY: "ci_category",
            MODEL_TYPE: "ci_modeltype",          
            BASELINE: "ci_standardtext",     
            RISK_TRIGGER: "ci_requirementlevel", 
            PROMPT: "ci_auditinstructions",
            SECTION_TITLE: "ci_sectiontitle"
        },
        GLOBAL_SETTINGS: {
            RECORD_ID: "e64fb735-0050-417c-bc23-3e689c699159",
            TARGET_MARGIN: "ci_targetmargin",
            CRITICAL_MARGIN: "ci_criticalmargin",
            EMAIL: "ci_dealdeskemail",
            MATRIX: "ci_documentmatrix"
        },
        AI_OVERRIDES: {
            NAME: "ci_name",
            DEAL_ID: "ci_dealid",
            DEAL_VALUE: "ci_deal_value",
            STANDARD_NAME: "ci_standardname",
            JUSTIFICATION: "ci_justification",
            CREATED_ON: "ci_created_on"
        },
        DEAL_IMPACTS: {
            IMPACT_ID: "ci_dealimpactid",
            DECISION_TYPE: "ci_decisiontype",
            CATEGORIES: "ci_impactcategories",
            VALUE_SAVED: "ci_estimatedvaluesaved",
            NOTES: "ci_notes",
            DEAL_BINDING: "ci_DealID@odata.bind"
        }
    },
    CHOICES: {
        STATUS: { DRAFT: 0, SUBMITTED: 1, APPROVED: 2, REJECTED: 3 },
        DEAL_TYPES: { "SOW": 0, "Change Request": 1, "Extension": 2, "Support Retainer": 3 },
        MODELS: { "T&M": 0, "T&M with not to exceed cap": 1, "Fixed Fee": 2, "Fixed Capacity": 3, "Retainer": 4 },
        TERMS: { "Net 30": 0, "Net 45": 1, "Milestone-based": 2, "Pre-bill": 3 },
        BILLING: { "Monthly": 0, "Quarterly": 1, "Milestone-based": 2, "Completion": 3, "Pre-bill": 4 },
        RISK_LEVELS: { "Low": 0, "Medium": 1, "High": 2 },
        SF_STAGES: { "Targeting": 0, "Prospecting": 1, "Discovery": 2, "Fulfillment/Proposal": 3, "Closed": 4 },
        REVIEW_DECISION: { "Pending": 0, "Approve": 1, "Reject": 2 },
        AI_HEALTH: {
            CLEAN: "Clean",
            WARNING: "Warning",
            CRITICAL: "Critical Risk"
        },
        AI_REQUIREMENT: {
            CRITICAL: "Critical",
            MANDATORY: "Mandatory",
            OPTIONAL: "Optional"
        }
    },
    DOC_STATUS: {
        ALIGNED: 'aligned',
        MODIFIED_SUBMISSION: 'modified-submitted',
        MODIFIED_APPROVAL: 'modified-approved',
        MISSING: 'missing'
    },
    DOC_CATEGORIES: {
        SOW: { id: 'sow', name: 'Statement of Work', required: true },
        MSA: { id: 'msa', name: 'Master Service Agreement', required: false },
        PRICING: { id: 'pricing', name: 'Cost Model', required: true },
        RESUME: { id: 'support', name: 'Supporting Material', required: false }
    },
    ENDPOINTS: {
        GET_DOCUMENTS: "https://f.com", NOTIFY_SUBMISSION: "https://f.com",
        UPLOAD_DOCUMENT: "https://f.com", RUN_AI_AUDIT: "https://f.com",
        PATCH_FILE_PROPERTIES: "https://f.com", DELETE_DOCUMENT: "https://f.com"
    }
};

global.window.UIComponents = {
    documentProgress: jest.fn(() => ({ isComplete: true })),
    readinessStyles: jest.fn(() => ({ bg: '#fff', text: '#000', border: '#ccc' })),
    statusBadge: jest.fn(() => '<span></span>')
};

global.window.SubmissionUI = {
    renderSkeletons: jest.fn(), renderSection: jest.fn(), renderSidebar: jest.fn(),
    showToast: jest.fn(), showProcessingOverlay: jest.fn(),
    components: { formatCurrency: jest.fn(val => `$${val}`), successOverlay: jest.fn() }
};

global.window.SubmissionService = {
    loadGlobalSettings: jest.fn().mockResolvedValue({}),
    loadClients: jest.fn().mockResolvedValue([]),
    loadAllDeals: jest.fn().mockResolvedValue([]),
    getDealById: jest.fn(), saveDraft: jest.fn(), patchDeal: jest.fn(),
    loadDocumentsViaFlow: jest.fn().mockResolvedValue([]),
    _getHeaders: jest.fn().mockResolvedValue({})
};

global.window.SecurityUtils = { checkLoginStatus: jest.fn().mockReturnValue(true), closeModal: jest.fn() };
global.window.refreshUI = jest.fn();

// 4. External Library Mocks
global.Quill = jest.fn().mockImplementation(() => ({ on: jest.fn(), disable: jest.fn(), root: { innerHTML: "" } }));
global.FileReader = class {
    readAsDataURL(file) {
        this.result = "data:image/png;base64,fake-base64";
        setTimeout(() => { if (this.onload) this.onload(); }, 0);
    }
};

// 5. DOM Mocks
global.window.model = { globalSettings: {}, clients: [] };
global.document = {
    body: { insertAdjacentHTML: jest.fn() },
    querySelectorAll: jest.fn(() => []),
    getElementById: jest.fn((id) => ({
        addEventListener: jest.fn(), remove: jest.fn(), style: {},
        getAttribute: jest.fn(), setAttribute: jest.fn(),
        classList: { add: jest.fn(), remove: jest.fn() }
    }))
};
