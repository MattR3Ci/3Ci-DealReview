/**
 * jest.setup.js
 * Mocks the Power Pages environment for Jest tests.
 */

// Mock the global window object
global.window = global;

// Mock jQuery Deferreds
const createDeferred = () => {
    const deferred = {
        done: jest.fn().mockImplementation((callback) => {
            deferred.doneCallback = callback;
            return deferred;
        }),
        fail: jest.fn().mockImplementation((callback) => {
            deferred.failCallback = callback;
            return deferred;
        }),
        resolve: jest.fn().mockImplementation((val) => {
            if (deferred.doneCallback) deferred.doneCallback(val);
            return deferred;
        }),
        reject: jest.fn().mockImplementation((err) => {
            if (deferred.failCallback) deferred.failCallback(err);
            return deferred;
        })
    };
    return deferred;
};

// Mock DOM elements and jQuery functions
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
    if (typeof selector === 'function') {
        selector(); // Handle $(document).ready()
    }
    return mockJQueryObj;
});
global.window.$.Deferred = createDeferred;

// Mock Power Pages Shell
global.window.shell = {
    getTokenDeferred: jest.fn(() => createDeferred())
};

// Mock URLSearchParams
global.URLSearchParams = class {
    constructor(search) { this.search = search; }
    get(param) { return null; }
};

// Mock window.location
global.window.location = {
    search: "",
    pathname: "/"
};

// Mock window.history
global.window.history = {
    replaceState: jest.fn()
};

// Mock sessionStorage
global.sessionStorage = {
    getItem: jest.fn(),
    removeItem: jest.fn(),
    setItem: jest.fn()
};

// Mock the SCHEMA based on deal-constants.js
global.window.SCHEMA = {
    TABLES: {
        DEALS: "ci_dealses",
        AI_OVERRIDES: "ci_ai_overrideses"
    },
    FIELDS: {
        DEALS: {
            DEALID: "ci_dealsid",
            EXTERNALKEY: "ci_externalprimarykey",
            TITLE: "ci_title",
            CLIENT_TEXT: "ci_clientaccountidtext",
            TYPE: "ci_dealtype",
            VALUE: "ci_totalvalue",
            COMMERCIAL_MODEL: "ci_commercialmodel",
            MARGIN: "ci_estimatedmargin",
            PAYMENT_TERMS: "ci_paymentterms",
            START_DATE: "ci_startdate",
            BILLING_FREQ: "ci_billingfrequency",
            SALES_LEADER: "ci_salesleaderemail",
            DELIVERY_LEAD: "ci_deliveryleaderemail",
            ACCOUNTABLE_EXEC: "ci_accountableexecutiveemail",
            PARENT_LINK: "ci_parentcontract",
            SF_LINK: "ci_salesforceopportunityid",
            SF_STAGE: "ci_salesforcestage",
            TECH_RISK: "ci_technicalrisk",
            EXCEPTION_REQ: "ci_exceptionrequested",
            STATUS: "ci_status"
        },
        CLIENTS: { ID: "ci_clientid", TITLE: "ci_title" },
        GLOBAL_SETTINGS: { EMAIL: "ci_email" }
    },
    CHOICES: {
        STATUS: { DRAFT: 0, SUBMITTED: 1, APPROVED: 2, REJECTED: 3 },
        DEAL_TYPES: { "SOW": 0, "Change Request": 1, "Extension": 2, "Support Retainer": 3 },
        RISK_LEVELS: { "Low": 0, "Medium": 1, "High": 2 }
    },
    ENDPOINTS: {
        GET_DOCUMENTS: "https://fake-flow-url.com",
        NOTIFY_SUBMISSION: "https://fake-notify-url.com"
    }
};

// Mock any other UI components that SubmissionCalc calls
global.window.UIComponents = {
    documentProgress: jest.fn(() => ({ isComplete: true })),
    readinessStyles: jest.fn(() => ({ bg: '#fff', text: '#000', border: '#ccc' }))
};

// Mock SubmissionUI
global.window.SubmissionUI = {
    renderSkeletons: jest.fn(),
    renderSection: jest.fn(),
    renderSidebar: jest.fn(),
    showToast: jest.fn(),
    showProcessingOverlay: jest.fn(),
    components: {
        formatCurrency: jest.fn(val => `$${val}`),
        successOverlay: jest.fn()
    }
};

// Mock SubmissionService
global.window.SubmissionService = {
    loadGlobalSettings: jest.fn().mockResolvedValue({}),
    loadClients: jest.fn().mockResolvedValue([]),
    getDealById: jest.fn(),
    saveDraft: jest.fn(),
    patchDeal: jest.fn(),
    loadDocumentsViaFlow: jest.fn().mockResolvedValue([])
};

// Mock SecurityUtils
global.window.SecurityUtils = {
    checkLoginStatus: jest.fn().mockReturnValue(true)
};

// Mock Quill
global.Quill = jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    disable: jest.fn(),
    root: { innerHTML: "" }
}));

global.window.model = {
    globalSettings: {},
    clients: []
};

// Mock document
global.document = {
    body: {
        insertAdjacentHTML: jest.fn()
    },
    querySelectorAll: jest.fn(() => []),
    getElementById: jest.fn((id) => ({
        addEventListener: jest.fn(),
        remove: jest.fn(),
        style: {},
        getAttribute: jest.fn(),
        setAttribute: jest.fn(),
        classList: { add: jest.fn(), remove: jest.fn() }
    }))
};
