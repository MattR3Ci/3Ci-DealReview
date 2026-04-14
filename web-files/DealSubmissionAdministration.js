/**
 * DealSubmissionAdministration.js (Proxy)
 */
const AdminApp = {
    init: async function () { 
        console.log("Admin Console Proxy Loaded");
    }
};
window.AdminApp = AdminApp;
$(document).ready(() => AdminApp.init());
