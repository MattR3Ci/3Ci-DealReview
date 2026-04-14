/**
 * ReviewBoard.js (Proxy)
 */
(function ($) {
    const ReviewBoardApp = {
        state: { deals: [], selectedDealId: null },
        init: async function () { 
            const raw = await window.SubmissionService.loadAllDeals();
            this.state.deals = raw.map(d => window.DealReviewLogic.mappers.mapRawDealToUI(d));
            this.render(); 
        },
        render: function () { 
            $('#deal-tabs-container').html(this.state.deals.map(d => window.DealReviewLogic.ui.renderReviewTab(d, this.state.selectedDealId)).join(''));
        }
    };
    window.ReviewBoardApp = ReviewBoardApp;
    $(document).ready(() => window.ReviewBoardApp.init());
})(jQuery);
