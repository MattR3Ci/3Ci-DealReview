/**
 * SubmissionService.js (Proxy)
 */
const SubmissionService = {
    loadGlobalSettings: async () => window.DealReviewLogic.utils.safeJsonParse("{}"),
    loadClients: async () => [],
    loadAllDeals: async () => [],
    patchDeal: async () => true,
    runAIAudit: async () => true
};
window.SubmissionService = SubmissionService;
