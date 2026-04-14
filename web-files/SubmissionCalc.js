/**
 * SubmissionCalc.js (Legacy Proxy)
 * Responsibility: Delegates calculation requests to the centralized DealReviewLogic.js
 */

const SubmissionCalc = {
    _isFieldFilled: function (data, key) {
        return window.DealReviewLogic.calculations.isFieldFilled(data, key);
    },

    getSectionStatuses: function (data, uploadedDocs = []) {
        return window.DealReviewLogic.calculations.getSectionStatuses(data, uploadedDocs);
    },

    getGlobalProgress: function (data, uploadedDocs = []) {
        return window.DealReviewLogic.calculations.getGlobalProgress(data, uploadedDocs);
    },

    getBasicsProgress: function (data) {
        return this.getGlobalProgress(data);
    },

    getRequiredDocs: function (data) {
        const defaultDocs = [];
        try {
            const settings = window.model?.globalSettings || {};
            const matrixStr = settings[window.SCHEMA.FIELDS.GLOBAL_SETTINGS.MATRIX];
            if (!matrixStr) return defaultDocs;

            const matrix = JSON.parse(matrixStr);
            const modelKey = data[window.SCHEMA.FIELDS.DEALS.COMMERCIAL_MODEL] === 0 ? "TM" : "FIXED_FEE";

            return matrix.docTypes.filter(doc => {
                const rule = matrix.rules[doc.id]?.[modelKey];
                return rule === "Required" || doc.locked;
            });
        } catch (e) {
            console.error("Document Matrix Parse Error:", e);
            return defaultDocs;
        }
    }
};

window.SubmissionCalc = SubmissionCalc;
