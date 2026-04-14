/**
 * SubmissionApp.js (Proxy)
 */
const SubmissionApp = {
    state: { dealData: {}, activeSection: 'basics' },
    init: async function () { 
        await window.SubmissionService.loadGlobalSettings();
        this.render(); 
    },
    render: function () { window.SubmissionUI.renderSection(this.state.activeSection, this.state.dealData); },
    setupInitialState: function () { this.state.dealData = { [window.SCHEMA.FIELDS.DEALS.TITLE]: "" }; },
    updateHeaderMetrics: function() {}
};
window.SubmissionApp = SubmissionApp;
$(document).ready(() => window.SubmissionApp.init());
