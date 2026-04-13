/**
 * jest.setup.js
 * Mocks the Power Pages environment for Jest tests.
 */

// 1. Core Browser Mocks
global.window = global;
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

// Create a SINGLE mock object that all jQuery calls return
const mockJQueryObj = {
    html: jest.fn().mockReturnThis(),
    append: jest.fn().mockReturnThis(),
    prependTo: jest.fn().mockReturnThis(),
    off: jest.fn().mockReturnThis(),
    on: jest.fn().mockReturnThis(), // We will spy on this in tests
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
    TABLES: { DEALS: "ci_dealses", AI_OVERRIDES: "ci_ai_overrideses" },
    FIELDS: {
        DEALS: {
            DEALID: "ci_dealsid", EXTERNALKEY: "ci_externalprimarykey", TITLE: "ci_title",
            CLIENT_TEXT: "ci_clientaccountidtext", TYPE: "ci_dealtype", VALUE: "ci_totalvalue",
            DESCRIPTION: "ci_description", COMMERCIAL_MODEL: "ci_commercialmodel",
            MARGIN: "ci_estimatedmargin", PAYMENT_TERMS: "ci_paymentterms",
            START_DATE: "ci_startdate", BILLING_FREQ: "ci_billingfrequency",
            SALES_LEADER: "ci_salesleaderemail", DELIVERY_LEAD: "ci_deliveryleaderemail",
            ACCOUNTABLE_EXEC: "ci_accountableexecutiveemail", SOLUTIONS_LEADER: "ci_solutionsleaderemail",
            PARENT_LINK: "ci_parentcontract", SF_LINK: "ci_salesforceopportunityid",
            SF_STAGE: "ci_salesforcestage", TECH_RISK: "ci_technicalrisk",
            EXCEPTION_REQ: "ci_exceptionrequested", STATUS: "ci_status"
        },
        CLIENTS: { ID: "ci_clientid", TITLE: "ci_title" },
        GLOBAL_SETTINGS: { EMAIL: "ci_email", MATRIX: "ci_matrix" },
        AI_OVERRIDES: {
            NAME: "ci_name", DEAL_ID: "ci_dealid", STANDARD_NAME: "ci_standardname",
            JUSTIFICATION: "ci_justification", CREATED_ON: "ci_created_on"
        }
    },
    CHOICES: {
        STATUS: { DRAFT: 0, SUBMITTED: 1, APPROVED: 2, REJECTED: 3 },
        DEAL_TYPES: { "SOW": 0, "Change Request": 1, "Extension": 2, "Support Retainer": 3 },
        RISK_LEVELS: { "Low": 0, "Medium": 1, "High": 2 }
    },
    DOC_STATUS: { ALIGNED: "Aligned", MODIFIED_SUBMISSION: "Modified" },
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
