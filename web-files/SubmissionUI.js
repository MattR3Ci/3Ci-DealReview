/**
 * SubmissionUI.js (Proxy)
 */
const SubmissionUI = {
    renderSection: (s, d) => window.DealReviewLogic.ui.renderSection(s, d),
    renderSidebar: (d, s) => window.DealReviewLogic.ui.renderSidebar(d, s)
};
window.SubmissionUI = SubmissionUI;
