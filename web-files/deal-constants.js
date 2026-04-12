/**
 * Deal Review Application - Schema Constants
 * Finalized for Dataverse Virtual Table Sync
 */
window.SCHEMA = {
    TABLES: { // silly plurals required by Dataverse
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
            ID: "ci_dr_contractstandardsid", // Updated with the extra 's'
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
            NAME: "ci_name", // Primary Name column (the one with the red asterisk)
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

    SHAREPOINT: {
        LIST_NAME: "Deal Documents",
        FIELDS: {
            ID: "Id",
            DEAL_ID: "DealID", // The Single Line of Text lookup
            CATEGORY: "Document_x0020_Category",
            STATUS: "Document_x0020_Status",
            VERSION_TAG: "Version_x0020_Tag",
            DESCRIPTION: "_ExtendedDescription",
            // File System Properties
            FILE: "File",
            FILE_NAME: "File/Name",
            FILE_SIZE: "File/Length",
            FILE_MODIFIED: "File/TimeLastModified",
            FILE_VERSION_LABEL: "File/UIVersionLabel",
            EDITOR: "Editor",
            EDITOR_TITLE: "Editor/Title",
            // History Specific
            CREATED: "Created",
            CREATED_BY: "CreatedBy/Title",
            HISTORY_ENCODED: {
                VERSION_TAG: "Version_x005f_x0020_x005f_Tag",
                STATUS: "Document_x005f_x0020_x005f_Status",
                CATEGORY: "Document_x005f_x0020_x005f_Category",
                MODIFIED_BY: "Modified_x005f_x0020_x005f_By"
            }
        }
    },
    DOC_CATEGORIES: {
        SOW: { id: 'sow', name: 'Statement of Work', required: true },
        MSA: { id: 'msa', name: 'Master Service Agreement', required: false },
        PRICING: { id: 'pricing', name: 'Cost Model', required: true },
        RESUME: { id: 'support', name: 'Supporting Material', required: false }
    },

    DOC_STATUS: {
        ALIGNED: 'aligned',
        MODIFIED_SUBMISSION: 'modified-submitted',
        MODIFIED_APPROVAL: 'modified-approved',
        MISSING: 'missing'
    },

    ENDPOINTS: {
        SITE_URL: "https://cccitpeople.sharepoint.com/sites/3CI/Sales",

        // PowerAutomate - api_GetDealDocumentsForDeal
        GET_DOCUMENTS: "https://54c188175ea2e924951161a823cd57.12.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/0912bd22793e4ff9897484075ce180df/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=_b92ZxFxYLBptYvLQcbb69eBIQTcQPTyecMQBmXyrEo",
        // PowerAutomate - api_ReviewBoard-GetHistory
        GET_VERSION_HISTORY: "https://54c188175ea2e924951161a823cd57.12.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/8170b4213df34c709744e443c6998d79/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=4tBbgbdvbHFFioy13hXYvBB063fsjh2zJLCTonIivQI",
        // PowerAutomate - api_UploadDocumentToSharePoint
        UPLOAD_DOCUMENT: "https://54c188175ea2e924951161a823cd57.12.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/fbcb22e71fd94f6798731709ab4dfb54/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=yTbS93FrLO55W85EDEtJTjN1HP4rfodHzEkEe3J6qdM",
        // PowerAutomate - api_DeleteDocument
        DELETE_DOCUMENT: "https://54c188175ea2e924951161a823cd57.12.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/adc6f94ef65c43afb4471c9bb7e877f7/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=XbTfhLF-KrXhJLAiBTw08PlYe9rgIfcMR6pypdQrxGE",
        // PowerAutomate - api_GetDocumentVersionHistory
        GET_REVIEW_HISTORY: "https://54c188175ea2e924951161a823cd57.12.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/2739b7e2010b46faa30018cd8a28bf79/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=E2dHGMfJLUppUuGbNOnM5fRanGbbiBTAbVni5e1h0K0",
        // PowerAutomate - api_CreateReviewNote
        RECORD_REVIEW_DECISION: "https://54c188175ea2e924951161a823cd57.12.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/377959f4ce864ffe900766bb01d04d51/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=auUW50jl-fyi8-1mO-obScVqYy2OuqZ5ZLrburIv89k",
        // PowerAutomate - api_AI_Audit
        RUN_AI_AUDIT: "https://54c188175ea2e924951161a823cd57.12.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/074fb015dfac40ada1d110dfa60a8d22/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=xY8UT0Zaq_UEj6iYbCXtvrYNctIa9eEnKyPakbTe-KQ",
        // PowerAutomate - api_SaveUserResponseToAIAudit
        PATCH_FILE_PROPERTIES: "https://54c188175ea2e924951161a823cd57.12.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/8af8309d8d8a441fb5a00b41fc03c712/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=fIIxRQBm2amawzPodG5fktBeywIn6u3amtsKuv8yOWE",
        // PowerAutomate - api_SendSubmissionEmail
        NOTIFY_SUBMISSION: "https://54c188175ea2e924951161a823cd57.12.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/4c6d2bce64fb4bd98b16e52bc64c381d/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=MbWSQkypKWTPPrxRpMPR1SsiXiQAdfmoPG8j-gIiMOc"
    }
};