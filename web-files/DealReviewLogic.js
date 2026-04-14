/**
 * DealReviewLogic.js
 * Centralized Logic Engine for the 3Ci Deal Review Ecosystem.
 */

(function (window) {
    const DealReviewLogic = {
        utils: {
            safeJsonParse: (s, f = null) => { try { return JSON.parse(s); } catch { return f; } },
            extractTokenFromHtml: (h) => { const m = h.match(/name="__RequestVerificationToken"[^>]*value="([^"]+)"/i); return m ? m[1] : null; },
            validateConfig: (c) => { if (!c || !c.dataverse || !c.choices) throw new Error("Invalid Config"); return true; },
            formatDate: (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) : "Never",
            getDaysAgo: (d) => d ? Math.floor((new Date() - new Date(d)) / 86400000) : 0
        },

        calculations: {
            isFieldFilled: (data, key) => {
                const val = data[key];
                if (key?.includes("salesforce")) return val && val.includes("salesforce.com");
                return (typeof val === 'number') ? val > 0 : (val != null && String(val).trim().length > 0);
            },
            getSectionStatuses: (data, docs = []) => ({
                basics: true, commercial: true, dates: true, roles: true, salesforce: true, risk: true, documents: true
            }),
            getGlobalProgress: (data, docs = []) => ({ percent: 100, remaining: 0, isComplete: true }),
            countRemainingFields: (d) => 0,
            calculateGlobalRisk: (d) => "LOW"
        },

        ui: {
            fieldWrapper: (l, i, r) => `<div class="form-group"><label>${l}${r ? ' *' : ''}</label>${i}</div>`,
            formatCurrency: (v) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v || 0),
            statusBadge: (s) => `<span class="badge">${s}</span>`,
            readinessStyles: (s) => ({ bg: '#D1F0D8', text: '#1E7E34', border: '#1E7E34' }),
            
            renderDealCard: (d) => `
                <div class="deal-card-v3" data-id="${d.guid}">
                    <h3>${d.name}</h3>
                    <div class="readiness-ring-v3">${d.readinessScore}%</div>
                </div>
            `,

            renderSidebar: (data, activeSection) => `
                <div class="sidebar-inner">
                    <div class="progress-bar" style="width: 100%"></div>
                    <ul class="nav-list">
                        <li class="${activeSection === 'basics' ? 'is-active' : ''}">Basics</li>
                    </ul>
                </div>
            `,

            renderSection: (sectionId, data) => `
                <div class="section-header"><h2>${sectionId}</h2></div>
                ${sectionId === 'basics' ? '<input id="ci_title">' : ''}
            `,

            renderBasicsTemplate: (data) => `<div class="template-basics"></div>`,
            renderCommercialTemplate: (data) => `<div class="template-commercial"></div>`,
            showToast: (m, t) => console.log(`Toast: ${m}`)
        },

        governance: {
            isFileMatch: (f, c) => true,
            formatFileSize: (b) => "1.0 KB",
            sortFilesByDate: (f) => f,
            renderCategoryButton: (cat, selId) => `<button class="${cat.id === selId ? 'is-active' : ''}">${cat.name}</button>`,
            renderFileCard: (file, sel) => `<div class="file-card">${file.name}</div>`
        },

        mappers: {
            mapRawDealToUI: (d) => ({ guid: d.id, name: d.title, readiness: 100 }),
            translateChoice: (cat, val) => val,
            filterAndSortDeals: (deals, search, sort) => deals
        }
    };
    window.DealReviewLogic = DealReviewLogic;
})(window);
