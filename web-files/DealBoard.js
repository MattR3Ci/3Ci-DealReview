/* =========================================================
   DealBoard.js - Mission Control Dashboard
   Version: 2026.02.20.LIVE
   ========================================================= */
window.SecurityUtils = {
    checkLoginStatus: () => {
        const allLinks = Array.from(document.querySelectorAll('a'));
        const isLoggedIn = allLinks.some(a => {
            const text = a.innerText.trim().toLowerCase();
            return text === "profile" || text === "sign out";
        });

        if (!isLoggedIn) {
            SecurityUtils.showLoginModal();
            return false;
        }
        return true;
    },

    closeModal: () => {
        const modal = document.getElementById("loginModal");
        if (modal) modal.remove(); 
    },

    showLoginModal: () => {
        if (document.getElementById("loginModal")) return;

        const modalHtml = `
            <div id="loginModal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(15, 23, 42, 0.7); z-index:9999; display:flex; justify-content:center; align-items:center; backdrop-filter: blur(4px);">
              <div style="background:white; padding:40px; border-radius:12px; max-width:440px; text-align:center; position:relative; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
                <button id="dr-modal-close-x" style="position:absolute; top:15px; right:15px; border:none; background:none; font-size:20px; cursor:pointer; color:#999;">&times;</button>
                <i class="fa fa-lock" style="font-size: 48px; color: #004A99; margin-bottom: 20px;"></i>
                <h2 style="margin-top:0; font-family: ui-sans-serif, system-ui; font-weight: 800; color: #1E293B;">Session Expired</h2>
                <p style="color: #64748B; line-height: 1.5; font-family: ui-sans-serif, system-ui;">Dataverse information cannot be loaded while you are signed out.</p>
                <hr style="margin: 20px 0; border: 0; border-top: 1px solid #E2E8F0;">
                <p style="font-family: ui-sans-serif, system-ui; font-size: 14px;"><strong>Please sign back in via the link in the top right corner.</strong></p>
                <button id="dr-modal-got-it" style="margin-top: 20px; background-color: #004A99; color: #fff; border: none; padding: 12px 30px; border-radius: 6px; font-weight: 700; cursor: pointer; font-family: ui-sans-serif, system-ui;">
                    Got it
                </button>
              </div>
            </div>
          `;
          
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        document.getElementById('dr-modal-close-x').addEventListener('click', SecurityUtils.closeModal);
        document.getElementById('dr-modal-got-it').addEventListener('click', SecurityUtils.closeModal);
    }
};

(function ($) {
    var app = {
        state: {
            deals: [],
            currentFilter: 'all', 
            currentSearch: '',   
            currentSort: "newest"
        },

        renderSkeletons: function () {
            // FIX: Removed the <div class="col-md-3"> wrappers to respect CSS grid layout
            const statSkeletons = Array(4).fill(0).map(() => `
                <div class="stat-card-v2" style="margin-bottom: 0;">
                    <div class="shimmer" style="width: 50%; height: 14px; margin-bottom: 10px;"></div>
                    <div class="shimmer" style="width: 80%; height: 32px;"></div>
                </div>
            `).join('');
            $('#stats-container').html(statSkeletons);

            const dealSkeletons = Array(6).fill(0).map(() => `
                <div class="skeleton-card">
                    <div class="d-flex justify-content-between">
                        <div class="shimmer" style="width: 80px; height: 20px;"></div>
                        <div class="shimmer" style="width: 40px; height: 40px; border-radius: 50%;"></div>
                    </div>
                    <div class="shimmer" style="width: 90%; height: 24px; margin-top: 10px;"></div>
                    <div class="shimmer" style="width: 60%; height: 16px;"></div>
                    <div class="shimmer" style="width: 100%; height: 100px; margin-top: auto;"></div>
                </div>
            `).join('');
            $('#deal-grid').html(dealSkeletons);
        },

        init: async function () {
            this.renderSkeletons(); 
            await new Promise(resolve => setTimeout(resolve, 500));
            
            if (!window.SecurityUtils.checkLoginStatus()) {
                console.warn("DealBoard init halted: User not logged in.");
                $('#deal-grid').html(`
                    <div class="w-100 text-center p-5">
                        <i class="fa fa-lock fa-3x text-muted mb-3" style="opacity: 0.3;"></i>
                        <h3 class="text-muted" style="font-weight: 700;">Sign In Required</h3>
                    </div>
                `);
                return; 
            }

            try {
                const rawDeals = await window.SubmissionService.loadAllDeals();
                this.state.deals = rawDeals.map(d => this.mapRawDealToState(d));

                this.renderLayout();
                this.render();
                this.bindEvents();
                this.processDocQueue();

            } catch (err) {
                console.error("❌ Init Failure:", err);
            }
        },

        mapRawDealToState: function (d) {
            const F = window.SCHEMA.FIELDS.DEALS;
            const spId = d[F.EXTERNALKEY];
            
            return {
                guid: d[F.DEALID],
                spId: spId,
                rawSourceData: d,
                id: d[F.TITLE]?.includes('-') ? d[F.TITLE].split('-').pop() : `ID-${spId}`,
                name: d[F.TITLE] || "Untitled Deal",
                clientName: d[F.CLIENT_TEXT] || "No Client Assigned",
                totalValue: d[F.VALUE] || 0,
                status: d[F.STATUS],
                readinessScore: this.calculateReadiness(d),
                requiredFieldsRemaining: this.countRemainingFields(d),
                owner: d[F.SALES_LEADER] ? d[F.SALES_LEADER].split('@')[0] : "System",
                riskTier: this.calculateGlobalRisk(d), 
                submissionDate: new Date(d[F.MODIFIED] || Date.now()).toLocaleDateString()
            };
        },

        calculateGlobalRisk: function (d) {
            return window.DealReviewLogic.calculations.calculateGlobalRisk(d);
        },

        processDocQueue: async function () {
            const queue = this.state.deals.filter(d => d.spId);
            for (const deal of queue) {
                await this.lazyLoadDocCount(deal.guid, deal.spId);
            }
        },

        translateChoice: function (category, value) {
            return window.DealReviewLogic.mappers.translateChoice(category, value);
        },

        calculateMarginBand: function (val) {
            return window.DealReviewLogic.mappers.calculateMarginBand(val);
        },

        getDaysAgo: function (dateStr) {
            return window.DealReviewLogic.utils.getDaysAgo(dateStr);
        },

        getComponentStyles: function (type, key) {
            const S = window.SCHEMA.CHOICES.STATUS;
            const themes = {
                status: {
                    [S.DRAFT]: { label: 'DRAFT', color: '#64748B', bg: '#F1F5F9' },
                    [S.SUBMITTED]: { label: 'SUBMITTED', color: '#2563EB', bg: '#DBEAFE' },
                    [S.APPROVED]: { label: 'APPROVED', color: '#1E7E34', bg: '#D1F0D8' },
                    [S.REJECTED]: { label: 'REJECTED', color: '#B91C1C', bg: '#FEE2E2' }
                },
                readiness: function (score) {
                    if (score >= 90) return { bg: '#D1F0D8', text: '#1E7E34', border: '#1E7E34' };
                    if (score >= 75) return { bg: '#FEF3C7', text: '#B45309', border: '#B45309' };
                    return { bg: '#FEE2E2', text: '#B91C1C', border: '#B91C1C' };
                },
                risk: {
                    'HIGH': { bg: '#FEE2E2', text: '#B91C1C', icon: 'fa-warning' },
                    'MEDIUM': { bg: '#FEF3C7', text: '#B45309', icon: 'fa-exclamation-circle' },
                    'LOW': { bg: '#D1F0D8', text: '#1E7E34', icon: 'fa-check-circle-o' }
                },
                margin: {
                    premium: { label: 'PREMIUM', color: '#1E7E34', bg: '#D1F0D8' },
                    standard: { label: 'STANDARD', color: '#2563EB', bg: '#DBEAFE' },
                    thin: { label: 'THIN', color: '#B45309', bg: '#FEF3C7' },
                    loss: { label: 'LOSS', color: '#B91C1C', bg: '#FEE2E2' }
                }
            };
            if (type === 'readiness') return themes.readiness(key);
            return themes[type][key] || themes.status[S.DRAFT];
        },

        calculateReadiness: function (dealObject, uploadedDocs = []) {
            const sourceData = dealObject.rawSourceData || dealObject;
            return window.DealReviewLogic.calculations.getGlobalProgress(sourceData, uploadedDocs).percent;
        },

        countRemainingFields: function (d) {
            return window.DealReviewLogic.calculations.countRemainingFields(d);
        },

        lazyLoadDocCount: async function (guid, spId) {
            try {
                const docs = await window.SubmissionService.loadDocumentsViaFlow(spId);
                const deal = this.state.deals.find(d => d.guid === guid);

                if (deal) {
                    const docMeta = window.UIComponents.documentProgress(docs);
                    const requiredTotalFromSchema = Object.values(window.SCHEMA.DOC_CATEGORIES).filter(c => c.required).length;

                    const countParts = docMeta.count.split('/');
                    deal.requiredDocsComplete = parseInt(countParts[0]) || 0;
                    deal.requiredDocsTotal = parseInt(countParts[1]) || requiredTotalFromSchema;
                    deal.isLoadingDocs = false;

                    deal.readinessScore = window.SubmissionCalc.getGlobalProgress(deal.rawSourceData, docs).percent;

                    this.updateCardDocUI(guid, deal.requiredDocsComplete, deal.requiredDocsTotal);
                    this.updateCardReadinessUI(guid, deal.readinessScore);
                }
            } catch (error) {
                console.error(`Lazy load failed:`, error);
            }
        },

        updateCardReadinessUI: function (guid, score) {
            const $card = $(`.deal-card-v3[data-id="${guid}"]`);
            const styles = window.UIComponents.readinessStyles(score);

            $card.find('.readiness-ring-v3').css({
                'background': styles.bg,
                'border-color': styles.border,
                'color': styles.text
            }).text(`${score}%`);
        },

        updateCardDocUI: function (guid, complete, total) {
            const $card = $(`.deal-card-v3[data-id="${guid}"]`);
            const safeTotal = total > 0 ? total : 2;
            const progressPercent = (complete / safeTotal) * 100;
            const color = complete === safeTotal ? '#1E7E34' : '#B45309';

            $card.find('.doc-count-text').removeClass('shimmer-text').text(`${complete}/${safeTotal}`).css('color', color);
            $card.find('.dr-progress-bar-v3').css({
                'width': `${progressPercent}%`,
                'background-color': color
            });
        },

        renderLayout: function () {
            var html = `
                <div id="deal-board-app" class="min-h-screen" style="background-color: var(--bg-app);">
                    
                    <style>
                        .admin-gear-icon { 
                            color: #94A3B8; font-size: 22px; margin-bottom: 12px; margin-right: 8px; 
                            transition: all 0.3s ease; display: inline-block; text-decoration: none; 
                        }
                        .admin-gear-icon:hover { 
                            color: #1E293B; transform: rotate(90deg); 
                        }
                    </style>

                    <header class="bg-white border-b" style="border-color: var(--border-default);">
                        <div style="max-width: 1600px; margin: 0 auto; padding: 24px 48px;">
                            
                            <div class="d-flex justify-content-between align-items-center" style="margin-bottom: 36px;">
                                <div>
                                    <h1 class="text-2xl font-bold mb-1" style="color: var(--text-primary); margin: 0;">Deal Board</h1>
                                    <p class="text-sm text-muted mb-0" style="font-weight: 500;">Intake Dashboard & Pipeline Overview</p>
                                </div>
                                
                                <div class="d-flex flex-column align-items-end">
                                    <a href="/administration" title="Control Center" class="admin-gear-icon">
                                        <i class="fa fa-cog"></i>
                                    </a>
                                    
                                    <div class="header-actions d-flex gap-3 align-items-center">
                                        <button class="dr-btn-secondary px-4 d-flex align-items-center justify-content-center gap-2" id="btn-review-board" style="position: relative; height: 38px; font-size: 14px; font-weight: 600;">
                                            <i class="fa fa-calendar"></i> <span>Deal Review Board</span>
                                            <span id="badge-review-board" style="position: absolute; top: -8px; right: -8px; background: #EF4444; color: white; font-size: 11px; font-weight: 800; padding: 2px 6px; border-radius: 12px; display: none; box-shadow: 0 2px 4px rgba(0,0,0,0.2); border: 2px solid white;">0</span>
                                        </button>
                                        <button class="btn-submission btn-submit px-4 d-flex align-items-center justify-content-center gap-2" style="opacity: 1; height: 38px; font-size: 14px; font-weight: 600;" id="btn-new-deal">
                                            <i class="fa fa-plus"></i> <span>New Deal Submission</span>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div class="d-flex align-items-center justify-content-between flex-nowrap gap-4">
                                <div class="search-wrapper" style="width: 320px; flex-shrink: 0; position: relative;">
                                    <i class="fa fa-search search-icon" style="position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: #94A3B8; pointer-events: none;"></i>
                                    <input type="text" id="board-search" class="dr-input-search w-100" placeholder="Search deals or clients..." style="padding-left: 40px; border: 1px solid var(--border-default); border-radius: 6px; height: 40px; outline: none;">
                                    <i class="fa fa-times-circle" id="btn-clear-search" style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); color: #CBD5E1; cursor: pointer; display: none; font-size: 16px;"></i>
                                </div>
                                
                                <div class="d-flex gap-2 flex-nowrap" id="filter-nav" style="overflow-x: auto; flex-grow: 1; justify-content: center;">
                                    <button class="filter-pill is-active" data-filter="all">
                                        All Deals <span class="badge-count" id="count-all" style="background: rgba(0,0,0,0.06); padding: 2px 6px; border-radius: 10px; margin-left: 6px; font-size: 11px;">0</span>
                                    </button>                                    
                                    <button class="filter-pill" data-filter="my" id="pill-my">
                                        My Submissions <span class="badge-count" id="count-my" style="background: rgba(0,0,0,0.06); padding: 2px 6px; border-radius: 10px; margin-left: 6px; font-size: 11px;">0</span>
                                    </button>                            
                                    <button class="filter-pill" data-filter="draft">
                                        Drafts <span class="badge-count" id="count-draft" style="background: rgba(0,0,0,0.06); padding: 2px 6px; border-radius: 10px; margin-left: 6px; font-size: 11px;">0</span>
                                    </button>
                                    <button class="filter-pill" data-filter="review">
                                        In Review <span class="badge-count" id="count-review" style="background: rgba(0,0,0,0.06); padding: 2px 6px; border-radius: 10px; margin-left: 6px; font-size: 11px;">0</span>
                                    </button>
                                    <button class="filter-pill" data-filter="approved">
                                        Approved <span class="badge-count" id="count-approved" style="background: rgba(0,0,0,0.06); padding: 2px 6px; border-radius: 10px; margin-left: 6px; font-size: 11px;">0</span>
                                    </button>
                                    <button class="filter-pill" data-filter="rejected">
                                        Rejected <span class="badge-count" id="count-rejected" style="background: rgba(0,0,0,0.06); padding: 2px 6px; border-radius: 10px; margin-left: 6px; font-size: 11px;">0</span>
                                    </button>
                                </div>

                                <div class="d-flex align-items-center gap-2" style="flex-shrink: 0;">
                                    <span class="text-xs font-bold text-muted text-uppercase" style="letter-spacing: 0.5px; white-space: nowrap;">Sort By:</span>
                                    <select id="board-sort" style="height: 40px; border-radius: 6px; border: 1px solid var(--border-default); padding: 0 12px; background: #fff; color: var(--text-primary); font-weight: 500; outline: none; cursor: pointer;">
                                        <option value="newest">Newest First</option>
                                        <option value="value-desc">Value (High-Low)</option>
                                        <option value="value-asc">Value (Low-High)</option>
                                        <option value="name">Name (A-Z)</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </header>
                    <main style="max-width: 1600px; margin: 0 auto; padding: 32px 48px;">
                        <div id="stats-container" class="grid-stats mb-8"></div>
                        <div class="section-label mb-4" id="deal-count-display">0 DEALS</div>
                        <div id="deal-grid" class="deal-card-grid"></div>
                    </main>
                </div>
            `;
            $('#deal-board-app-wrapper').html(html);
        },

        renderStats: function () {
            const S = window.SCHEMA.CHOICES.STATUS;
            const dealsList = this.state.deals;

            const totalRaw = dealsList.reduce((sum, d) => {
                const val = parseFloat(String(d.totalValue || "0").replace(/[^0-9.-]+/g, "")) || 0;
                return sum + val;
            }, 0);
            const totalDisplay = (totalRaw / 1000000).toFixed(1);

            const stats = [
                { label: 'TOTAL PIPELINE', value: `$${totalDisplay}M`, color: 'var(--text-primary)' },
                {
                    label: 'READY FOR REVIEW',
                    value: dealsList.filter(d => d.status == S.SUBMITTED || String(d.status).includes("Submitted")).length,
                    color: '#2563EB' 
                },
                {
                    label: 'IN PROGRESS',
                    value: dealsList.filter(d => d.status == S.DRAFT || String(d.status).includes("Draft")).length,
                    color: '#64748B' 
                },
                {
                    label: 'APPROVED YTD',
                    value: dealsList.filter(d => d.status == S.APPROVED || String(d.status).includes("Approved")).length,
                    color: '#1E7E34' 
                }
            ];

            // FIX: Removed the <div class="col-md-3"> wrappers to respect CSS grid layout
            $('#stats-container').html(stats.map(s => `
                <div class="stat-card-v2" style="margin-bottom: 0;">
                    <div class="section-label mb-2">${s.label}</div>
                    <div class="stat-value" style="color: ${s.color}">${s.value}</div>
                </div>
            `).join(''));
        },

        getFilteredAndSortedDeals: function () {
            const F = window.SCHEMA.FIELDS.DEALS;
            const S = window.SCHEMA.CHOICES.STATUS;
            let results = [...this.state.deals];

            // 1. Apply Search 
            const searchTerm = this.state.currentSearch || "";

            if (searchTerm.trim() !== "") {
                const term = searchTerm.toLowerCase();
                results = results.filter(d =>
                    (d.name || "").toLowerCase().includes(term) ||
                    (d.clientName || "").toLowerCase().includes(term)
                );
            }

            // 2. Apply Filters
            switch (this.state.currentFilter) {
                case 'my':
                    const context = window.USER_CONTEXT || {};
                    const myFullName = (context.fullname || "").toLowerCase();
                    const mySlug = myFullName.replace(/\s+/g, '.');

                    results = results.filter(d => {
                        const owner = (d.owner || "").toLowerCase();
                        return owner.includes(myFullName) || owner.includes(mySlug);
                    });
                    break;
                case 'draft':
                    results = results.filter(d => d.status == S.DRAFT || String(d.status).includes("Draft"));
                    break;
                case 'review':
                    results = results.filter(d => d.status == S.SUBMITTED || String(d.status).includes("Submitted"));
                    break;
                case 'approved':
                    results = results.filter(d => d.status == S.APPROVED || String(d.status).includes("Approved"));
                    break;
                case 'rejected':
                    results = results.filter(d => d.status == S.REJECTED || String(d.status).includes("Rejected"));
                    break;
            }

            // 3. Apply Sorting
            results.sort((a, b) => {
                if (this.state.currentSort === 'name') {
                    return (a[F.TITLE] || "").localeCompare(b[F.TITLE] || "");
                }
                else if (this.state.currentSort === 'value-desc' || this.state.currentSort === 'value-asc') {
                    const valA = parseFloat(String(a.totalValue || "0").replace(/[^0-9.-]+/g, "")) || 0;
                    const valB = parseFloat(String(b.totalValue || "0").replace(/[^0-9.-]+/g, "")) || 0;
                    return this.state.currentSort === 'value-desc' ? (valB - valA) : (valA - valB);
                }
                else {
                    const dateA = new Date(a.rawSourceData[F.MODIFIED] || 0);
                    const dateB = new Date(b.rawSourceData[F.MODIFIED] || 0);
                    return dateB - dateA;
                }
            });

            return results;
        },

        renderDealCard: function (deal) {
            return window.DealReviewLogic.ui.renderDealCard(deal);
        },

        renderBoard: function () {
            const self = this;
            const F = window.SCHEMA.FIELDS.DEALS;
            const S = window.SCHEMA.CHOICES.STATUS;

            const myName = (window.USER_CONTEXT && window.USER_CONTEXT.fullname) ? window.USER_CONTEXT.fullname.toLowerCase() : "";
            const mySlug = myName.replace(/\s+/g, '.'); 

            const myDeals = this.state.deals.filter(d => {
                const owner = (d.owner || "").toLowerCase();
                return owner.includes(myName) || owner.includes(mySlug);
            });

            const drafts = this.state.deals.filter(d => parseInt(d.status) === S.DRAFT || String(d.status).includes("Draft")).length;
            const inReview = this.state.deals.filter(d => parseInt(d.status) === S.SUBMITTED || String(d.status).includes("Submitted")).length;
            const approved = this.state.deals.filter(d => parseInt(d.status) === S.APPROVED || String(d.status).includes("Approved")).length;
            const rejected = this.state.deals.filter(d => parseInt(d.status) === S.REJECTED || String(d.status).includes("Rejected")).length;

            $('#count-all').text(this.state.deals.length);
            $('#count-my').text(myDeals.length);
            $('#count-draft').text(drafts);
            $('#count-review').text(inReview);
            $('#count-approved').text(approved);
            // Update the Rejected counter and apply the red call-to-action style if needed
            $('#count-rejected').text(rejected);
            if (rejected > 0) {
                $('#count-rejected').css({'background-color': '#EF4444', 'color': 'white'});
            } else {
                $('#count-rejected').css({'background-color': 'rgba(0,0,0,0.06)', 'color': 'inherit'});
            }

            if (inReview > 0) {
                $('#badge-review-board').text(inReview).show();
            } else {
                $('#badge-review-board').hide();
            }

            const myRejected = myDeals.filter(d => parseInt(d.status) === S.REJECTED || String(d.status).includes("Rejected")).length;
            if (myRejected > 0) {
                $('#count-my').css({'background-color': '#EF4444', 'color': 'white'});
                $('#pill-my').css({'border-color': '#EF4444'});
            } else {
                $('#count-my').css({'background-color': 'rgba(0,0,0,0.06)', 'color': 'inherit'});
                $('#pill-my').css({'border-color': 'transparent'}); 
            }

            const visibleDeals = this.getFilteredAndSortedDeals();
            $('#deal-count-display').text(`${visibleDeals.length} DEALS`);

            if (visibleDeals.length === 0) {
                $('#deal-grid').html(`<div class="w-100 text-center p-5"><i class="fa fa-folder-open-o fa-3x text-muted mb-3" style="opacity: 0.5;"></i><h3 class="text-muted">No deals found</h3><p class="text-sm">Try adjusting your search or filters.</p></div>`);
                return;
            }

            const html = visibleDeals.map(deal => this.renderDealCard(deal)).join('');
            $('#deal-grid').html(html);
        },

        render: function () {
            this.renderStats();
            this.renderBoard();
        },

        bindEvents: function () {
            const self = this;

            $('#board-search').off('input').on('input', function () {
                const val = $(this).val();
                self.state.currentSearch = val;
                if (val.length > 0) $('#btn-clear-search').fadeIn(100);
                else $('#btn-clear-search').fadeOut(100);
                self.renderBoard();
            });

            $(document).off('click', '#btn-clear-search').on('click', '#btn-clear-search', function () {
                $('#board-search').val('').focus();
                self.state.currentSearch = "";
                $(this).hide();
                self.renderBoard();
            });

            $('.filter-pill').off('click').on('click', function () {
                $('.filter-pill').removeClass('is-active');
                $(this).addClass('is-active');
                self.state.currentFilter = $(this).data('filter');
                self.renderBoard();
            });

            $('#board-sort').off('change').on('change', function () {
                self.state.currentSort = $(this).val();
                self.renderBoard();
            });

            $(document).off('click', '#btn-review-board').on('click', '#btn-review-board', () => {
                window.location.href = '/dealreviewboard/';
            });

            $(document).off('click', '#btn-new-deal').on('click', '#btn-new-deal', () => {
                window.location.href = '/new-submission/';
            });

            $(document).off('click', '.deal-card-v3').on('click', '.deal-card-v3', function (e) {
                const spId = $(this).data('spid');
                if ($(e.target).closest('.btn-review').length || $(e.target).closest('.deal-card-v3').length) {
                    window.location.href = `/new-submission/?id=${spId}`;
                }
            });

            $(document).off('click', '.btn-clone').on('click', '.btn-clone', function (e) {
                e.preventDefault();
                e.stopPropagation(); 

                const guid = $(this).data('id');
                const deal = self.state.deals.find(d => d.guid === guid);

                if (deal) {
                    const F = window.SCHEMA.FIELDS.DEALS;
                    const C = window.SCHEMA.CHOICES.STATUS;

                    let cloneData = JSON.parse(JSON.stringify(deal.rawSourceData));

                    delete cloneData[F.DEALID];
                    delete cloneData[F.EXTERNALKEY]; 
                    delete cloneData.createdon;
                    delete cloneData.modifiedon;

                    cloneData[F.STATUS] = C.DRAFT;
                    cloneData[F.TITLE] = (cloneData[F.TITLE] || "Untitled Deal") + " - COPY";
                    cloneData[F.SF_LINK] = ""; 
                    cloneData[F.REVIEW_NOTES] = "";
                    cloneData[F.ACTION_REQUIRED] = "";

                    sessionStorage.setItem('dr_clone_data', JSON.stringify(cloneData));
                    window.location.href = '/new-submission';
                }
            });
        }
    };

    window.DealBoardApp = app;
    $(document).ready(() => { window.DealBoardApp.init(); });
})(jQuery);