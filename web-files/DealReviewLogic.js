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
                if (!window.SCHEMA || !window.SCHEMA.FIELDS || !window.SCHEMA.FIELDS.DEALS) return false;
                const val = data[key];
                if (key === window.SCHEMA.FIELDS.DEALS.SF_LINK) return val && val.includes("salesforce.com");
                return (typeof val === 'number') ? val > 0 : (val != null && String(val).trim().length > 0);
            },
            getSectionStatuses: (data, docs = []) => {
                const F = window.SCHEMA.FIELDS.DEALS;
                return {
                    basics: DealReviewLogic.calculations.isFieldFilled(data, F.TITLE) && DealReviewLogic.calculations.isFieldFilled(data, F.CLIENT_TEXT),
                    commercial: DealReviewLogic.calculations.isFieldFilled(data, F.TYPE) && DealReviewLogic.calculations.isFieldFilled(data, F.VALUE),
                    dates: DealReviewLogic.calculations.isFieldFilled(data, F.START_DATE),
                    roles: DealReviewLogic.calculations.isFieldFilled(data, F.SALES_LEADER) && DealReviewLogic.calculations.isFieldFilled(data, F.ACCOUNTABLE_EXEC),
                    salesforce: DealReviewLogic.calculations.isFieldFilled(data, F.SF_LINK),
                    risk: true,
                    documents: docs.length > 0
                };
            },
            getGlobalProgress: (data, docs = []) => {
                const statuses = DealReviewLogic.calculations.getSectionStatuses(data, docs);
                const keys = Object.keys(statuses);
                const complete = keys.filter(k => statuses[k]).length;
                return { percent: Math.round((complete / keys.length) * 100), remaining: keys.length - complete, isComplete: complete === keys.length };
            },
            countRemainingFields: (d) => {
                const F = window.SCHEMA.FIELDS.DEALS;
                return [F.TITLE, F.CLIENT_TEXT, F.VALUE, F.START_DATE, F.SALES_LEADER].filter(f => !d[f]).length;
            },
            calculateGlobalRisk: (d) => "LOW"
        },

        ui: {
            fieldWrapper: (l, i, r) => `<div class="form-group"><label>${l}${r ? ' *' : ''}</label>${i}</div>`,
            formatCurrency: (v) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v || 0),
            statusBadge: (s) => `<span class="badge">${s}</span>`,
            readinessStyles: (s) => s >= 90 ? { bg: '#D1F0D8', text: '#1E7E34' } : { bg: '#FEE2E2', text: '#B91C1C' },
            renderDealCard: (d) => `<div class="deal-card-v3" data-id="${d.guid}"><h3>${d.name}</h3><div class="ring">${d.readiness}%</div></div>`,
            renderSection: (s, d) => `<div>${s}</div>`,
            renderSidebar: (d, s) => `<div></div>`,
            showToast: (m, t) => console.log(m)
        },

        governance: {
            isFileMatch: (f, c) => {
                const n = (f.name || "").toLowerCase();
                const cat = (f.category || f.documentCategory || "").toLowerCase();
                return cat === c.toLowerCase() || n.includes(`_${c.toLowerCase()}_`);
            },
            formatFileSize: (b) => {
                if (!b) return "0 KB";
                const kb = b / 1024;
                return kb < 1024 ? `${kb.toFixed(1)} KB` : `${(kb / 1024).toFixed(1)} MB`;
            },
            sortFilesByDate: (f) => [...f].sort((a, b) => new Date(b.uploadedDate) - new Date(a.uploadedDate))
        },

        mappers: {
            mapRawDealToUI: (d) => {
                const F = window.SCHEMA.FIELDS.DEALS;
                const progress = DealReviewLogic.calculations.getGlobalProgress(d);
                return {
                    guid: d[F.DEALID], spId: d[F.EXTERNALKEY], name: d[F.TITLE] || "Deal",
                    client: d[F.CLIENT_TEXT] || "No Client", value: parseFloat(d[F.VALUE]) || 0,
                    status: parseInt(d[F.STATUS]), readiness: progress.percent, lastModified: DealReviewLogic.utils.formatDate(d[F.MODIFIED])
                };
            },
            filterAndSortDeals: (deals, search, sort) => {
                let f = search ? deals.filter(d => d.name.toLowerCase().includes(search.toLowerCase())) : deals;
                if (sort === 'value-desc') f.sort((a,b) => b.value - a.value);
                return f;
            }
        }
    };
    window.DealReviewLogic = DealReviewLogic;
})(window);
