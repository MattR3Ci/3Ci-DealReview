/**
 * jest.setup.js
 * Mocks the Power Pages environment for Jest tests.
 */

// Mock the global window object
global.window = global;

// Mock the SCHEMA based on deal-constants.js
global.window.SCHEMA = {
    FIELDS: {
        DEALS: {
            TITLE: "ci_title",
            CLIENT_TEXT: "ci_clientaccountidtext",
            TYPE: "ci_dealtype",
            VALUE: "ci_totalvalue",
            COMMERCIAL_MODEL: "ci_commercialmodel",
            PAYMENT_TERMS: "ci_paymentterms",
            START_DATE: "ci_startdate",
            BILLING_FREQ: "ci_billingfrequency",
            SALES_LEADER: "ci_salesleaderemail",
            DELIVERY_LEAD: "ci_deliveryleaderemail",
            ACCOUNTABLE_EXEC: "ci_accountableexecutiveemail",
            PARENT_LINK: "ci_parentcontract",
            SF_LINK: "ci_salesforceopportunityid",
            SF_STAGE: "ci_salesforcestage"
        }
    },
    CHOICES: {
        DEAL_TYPES: { "SOW": 0, "Change Request": 1, "Extension": 2, "Support Retainer": 3 }
    }
};

// Mock any other UI components that SubmissionCalc calls
global.window.UIComponents = {
    documentProgress: jest.fn(() => ({ isComplete: true }))
};

global.window.model = {
    globalSettings: {}
};
