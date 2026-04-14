/**
 * DocumentGovernance.js (Proxy)
 */
const DocumentApp = {
    state: { recordId: null, selectedCategoryId: null, selectedFileId: null, categories: [], history: [] },
    init: async function() { 
        this.state.categories = window.DealReviewLogic.governance.buildCategorySchema ? window.DealReviewLogic.governance.buildCategorySchema() : [];
        this.render(); 
    },
    render: function() { $('#document-governance-app').html(window.DocumentUI.layout(this.state)); },
    isMatch: (f, c) => window.DealReviewLogic.governance.isFileMatch(f, c),
    formatFileSize: (b) => window.DealReviewLogic.governance.formatFileSize(b)
};

const DocumentUI = {
    layout: (s) => `<div class="layout">${DocumentUI.renderLeftNav(s)}</div>`,
    renderLeftNav: (s) => s.categories.map(c => window.DealReviewLogic.governance.renderCategoryButton(c, s.selectedCategoryId)).join(''),
    renderCategoryButton: (c, s) => window.DealReviewLogic.governance.renderCategoryButton(c, s)
};

window.DocumentGovernanceApp = DocumentApp;
window.DocumentUI = DocumentUI;
$(document).ready(() => window.DocumentGovernanceApp.init());
