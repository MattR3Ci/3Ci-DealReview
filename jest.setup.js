/**
 * jest.setup.js
 * Mocks the Power Pages environment for Jest tests.
 */

// Mock the global window object
global.window = global;

// Mock jQuery (needed for shell deferreds)
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

global.window.$ = global.window.jQuery = {
    Deferred: createDeferred
};

// Mock Power Pages Shell
global.window.shell = {
    getTokenDeferred: jest.fn(() => createDeferred())
};

// Mock the SCHEMA based on deal-constants.js
global.window.SCHEMA = {
    TABLES: {
        DEALS: "ci_dealses",
        AI_OVERRIDES: "ci_ai_overrideses"
    },
    FIELDS: {
        DEALS: {
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
            EXCEPTION_REQ: "ci_exceptionrequested"
        },
        AI_OVERRIDES: {
            NAME: "ci_name",
            DEAL_ID: "ci_dealid",
            STANDARD_NAME: "ci_standardname",
            JUSTIFICATION: "ci_justification",
            CREATED_ON: "ci_created_on"
        }
    },
    CHOICES: {
        DEAL_TYPES: { "SOW": 0, "Change Request": 1, "Extension": 2, "Support Retainer": 3 },
        RISK_LEVELS: { "Low": 0, "Medium": 1, "High": 2 }
    },
    ENDPOINTS: {
        GET_DOCUMENTS: "https://fake-flow-url.com"
    }
};

// Mock any other UI components that SubmissionCalc calls
global.window.UIComponents = {
    documentProgress: jest.fn(() => ({ isComplete: true }))
};

global.window.model = {
    globalSettings: {}
};
