/**
 * UIComponents.js (Proxy)
 */
(function (window) {
    const UIComponents = {
        readinessStyles: (score) => window.DealReviewLogic.ui.readinessStyles ? window.DealReviewLogic.ui.readinessStyles(score) : { bg: '#fff' },
        statusBadge: (status) => window.DealReviewLogic.ui.statusBadge(status)
    };
    window.UIComponents = UIComponents;
})(window);
