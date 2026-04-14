/**
 * SubmissionUI.js (Proxy)
 */
const SubmissionUI = {
    components: {
        fieldWrapper: (l, i, r) => window.DealReviewLogic.ui.fieldWrapper(l, i, r),
        textInput: (k, d, p, c) => window.DealReviewLogic.ui.textInput(k, d, p, c),
        formatCurrency: (v) => window.DealReviewLogic.ui.formatCurrency(v)
    },
    templates: {
        basics: (d) => window.DealReviewLogic.ui.renderBasicsTemplate(d),
        commercial: (d) => window.DealReviewLogic.ui.renderCommercialTemplate(d)
    },
    renderSidebar: (d, s) => { $('#sidebar-rail').html(window.DealReviewLogic.ui.renderSidebar(d, s)); },
    renderSection: (s, d) => { $('#form-workspace').html(window.DealReviewLogic.ui.renderSection(s, d)); },
    showToast: (m, t) => window.DealReviewLogic.ui.showToast(m, t)
};
window.SubmissionUI = SubmissionUI;
