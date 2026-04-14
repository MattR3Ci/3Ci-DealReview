/**
 * DealService.js (Proxy)
 */
const DealService = {
    updateDeal: async (id, data) => true,
    getCsrfToken: async () => "tok"
};
window.DealService = DealService;
