/**
 * DealBoard.js (Proxy)
 */
(function ($) {
    var app = {
        state: { deals: [], currentFilter: 'all', currentSearch: '', currentSort: "newest" },
        init: async function () { 
            if (!window.SecurityUtils.checkLoginStatus()) return;
            const raw = await window.SubmissionService.loadAllDeals();
            this.state.deals = raw.map(d => window.DealReviewLogic.mappers.mapRawDealToUI(d));
            this.render(); 
        },
        render: function () { 
            const filtered = window.DealReviewLogic.mappers.filterAndSortDeals(this.state.deals, this.state.currentSearch, this.state.currentSort);
            $('#deal-grid').html(filtered.map(d => window.DealReviewLogic.ui.renderDealCard(d)).join(''));
        }
    };
    window.DealBoardApp = app;
    $(document).ready(() => window.DealBoardApp.init());
})(jQuery);
