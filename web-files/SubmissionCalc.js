/**
 * SubmissionCalc.js (Proxy)
 */
const SubmissionCalc = {
    _isFieldFilled: (d, k) => window.DealReviewLogic.calculations.isFieldFilled(d, k),
    getGlobalProgress: (d, docs) => window.DealReviewLogic.calculations.getGlobalProgress(d, docs),
    getRequiredDocs: (d) => []
};
window.SubmissionCalc = SubmissionCalc;
