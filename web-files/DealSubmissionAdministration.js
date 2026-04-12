window.AdminApp = {
    dictionaries: {
        category: { "121500000": "Universal", "121500001": "Conditional" },
        model: { "121500000": "T&M", "121500001": "T&M NTE", "121500002": "Fixed Capacity", "121500003": "Fixed Fee" },
        reqLevel: { "121500000": "Mandatory", "121500001": "Optional", "121500002": "Critical" }
    },

    state: {
        standards: [],
        editingId: null,
        sortCol: 'SECTION_TITLE',
        sortAsc: true
    },

    init: function () {
        this.bindEvents();
        setTimeout(() => {
            this.loadStandards();
            this.loadGlobalSettings();
            this.loadTelemetry();
        }, 100);
    },

    bindEvents: function () {
        const self = this;

        // --- Tab Switching ---
        $('.admin-tab-btn').on('click', function () {
            $('.admin-tab-btn').removeClass('is-active');
            $(this).addClass('is-active');
            const targetId = $(this).attr('data-target');
            $('.admin-tab-content').hide();
            $(`#${targetId}`).fadeIn(200);
        });

        // --- AI Standards Sorting & Actions ---
        $('thead').on('click', '.dr-sortable', function () {
            const clickedCol = $(this).attr('data-sort');
            if (self.state.sortCol === clickedCol) {
                self.state.sortAsc = !self.state.sortAsc;
            } else {
                self.state.sortCol = clickedCol;
                self.state.sortAsc = true;
            }
            $('.dr-sortable').removeClass('is-active');
            $('.dr-sortable i').attr('class', 'fa fa-sort');
            $(this).addClass('is-active');
            $(this).find('i').attr('class', self.state.sortAsc ? 'fa fa-sort-up' : 'fa fa-sort-down');
            self.renderGrid();
        });

        $('#btn-add-standard').on('click', () => self.openStandardPanel());
        $('#btn-close-panel-x, #btn-cancel-panel').on('click', () => self.closeStandardPanel());
        $('#btn-save-standard').on('click', () => self.saveStandard());

        $('#config-grid-body').on('click', '.btn-edit-standard', function () {
            self.openStandardPanel($(this).attr('data-id'));
        });
        $('#config-grid-body').on('click', '.btn-delete-standard', function () {
            self.deleteStandard($(this).attr('data-id'));
        });

        // --- Global Settings Actions ---
        $('#setting-margin-target, #setting-margin-critical').on('input', () => self.updateYellowMarginDisplay());

        $('#btn-save-margin').on('click', () => {
            const F = window.SCHEMA.FIELDS.GLOBAL_SETTINGS;
            self.saveGlobalSetting({
                [F.TARGET_MARGIN]: parseInt($('#setting-margin-target').val()) || 40,
                [F.CRITICAL_MARGIN]: parseInt($('#setting-margin-critical').val()) || 30
            }, '#btn-save-margin');
        });

        $('#btn-save-routing').on('click', () => {
            const F = window.SCHEMA.FIELDS.GLOBAL_SETTINGS;
            self.saveGlobalSetting({
                [F.EMAIL]: $('#setting-routing-email').val()
            }, '#btn-save-routing');
        });

        $('#btn-save-matrix').on('click', () => {
            const F = window.SCHEMA.FIELDS.GLOBAL_SETTINGS;
            self.saveGlobalSetting({
                [F.MATRIX]: self.SettingsManager.serializeMatrix()
            }, '#btn-save-matrix');
        });

        // --- Document Governance Matrix Dynamic Row Actions ---
        $('#btn-add-doc-type').on('click', () => {
            self.SettingsManager.addDocumentType($('#new-doc-name').val());
            $('#new-doc-name').val('');
        });

        $('#doc-matrix-table').on('click', '.btn-delete-doc', function () {
            self.SettingsManager.removeDocumentType($(this).attr('data-id'));
        });

        // --- Fullscreen Chart Modal Interactions ---
        $('#btn-expand-chart').on('click', function () {
            $('#expanded-chart-overlay').fadeIn(200);
            $('#expanded-chart-modal').css('display', 'flex').hide().fadeIn(200);
            self._updateModalChart(); // Draw it the first time it opens
        });

        $('#btn-close-chart-modal, #expanded-chart-overlay').on('click', function () {
            $('#expanded-chart-modal, #expanded-chart-overlay').fadeOut(200);
        });

        $('#chart-time-filter').on('change', function () {
            self._updateModalChart(); // Redraw instantly when they pick a new date range
        });

        // --- Modal Interactions (Chart & AI Overrides) ---
        $('#btn-expand-chart').on('click', function () {
            $('#expanded-chart-overlay').fadeIn(200);
            $('#expanded-chart-modal').css('display', 'flex').hide().fadeIn(200);
            self._updateModalChart();
        });

        // NEW: AI Overrides Button
        $('#btn-view-overrides').on('click', function () {
            $('#expanded-chart-overlay').fadeIn(200); // Re-uses the dark background
            $('#ai-override-modal').css('display', 'flex').hide().fadeIn(200);
        });

        // UPDATED: Close Event handles both modals
        $('#btn-close-chart-modal, #btn-close-override-modal, #expanded-chart-overlay').on('click', function () {
            $('#expanded-chart-modal, #ai-override-modal, #expanded-chart-overlay').fadeOut(200);
        });
    },

    _getHeaders: async function () {
        const token = await new Promise((resolve) => {
            if (window.shell && window.shell.getTokenDeferred) {
                window.shell.getTokenDeferred().done(resolve).fail(() => resolve(''));
            } else {
                resolve($('input[name="__RequestVerificationToken"]').val() || '');
            }
        });

        return {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            '__RequestVerificationToken': token
        };
    },

    // ==========================================
    // MODULE: AI CONTRACT STANDARDS
    // ==========================================
    loadStandards: async function () {
            const T = window.SCHEMA.TABLES.CONTRACT_STANDARDS;
            const F = window.SCHEMA.FIELDS.CONTRACT_STANDARDS;
            
            // FIX: Added F.PROMPT and F.SECTION_TITLE to the select query
            const select = [F.ID, F.NAME, F.CATEGORY, F.MODEL_TYPE, F.BASELINE, F.RISK_TRIGGER, F.PROMPT, F.SECTION_TITLE].join(',');
            const url = `/_api/${T}?$select=${select}&$top=100`;

            try {
                const headers = await this._getHeaders();
                const response = await fetch(url, { headers });

                if (response.ok) {
                    const data = await response.json();
                    this.state.standards = data.value;
                    this.renderGrid();
                    this.updateSortIcons();
                } else {
                    console.error("Failed to load standards:", await response.text());
                    $('#config-grid-body').html('<tr><td colspan="7" class="text-danger text-center">Error loading standards.</td></tr>');
                }
            } catch (error) {
                console.error("Error fetching standards:", error);
                $('#config-grid-body').html('<tr><td colspan="7" class="text-danger text-center">Connection error.</td></tr>');
            }
        },

    renderGrid: function () {
        const F = window.SCHEMA.FIELDS.CONTRACT_STANDARDS;
        const dict = this.dictionaries;

        if (this.state.standards.length === 0) {
            // Updated colspan to 7 to account for the new columns
            $('#config-grid-body').html('<tr><td colspan="7" style="text-align:center; padding: 20px; color: #64748B;">No standards found. Click "Add New Standard" to begin.</td></tr>');
            return;
        }

        const getFullCategoryText = (item) => {
            const catText = dict.category[String(item[F.CATEGORY])] || 'Unknown';
            const modelText = item[F.MODEL_TYPE] ? dict.model[String(item[F.MODEL_TYPE])] : null;
            return modelText ? `${catText} (${modelText})` : catText;
        };

        // Enforce default sort by SECTION_TITLE ascending if sortCol isn't explicitly set yet
        const activeSortCol = this.state.sortCol || 'SECTION_TITLE';
        const activeSortAsc = this.state.sortAsc !== undefined ? this.state.sortAsc : true;

        const sortedStandards = [...this.state.standards].sort((a, b) => {
            let valA, valB;
            if (activeSortCol === 'CATEGORY') {
                valA = getFullCategoryText(a);
                valB = getFullCategoryText(b);
            } else if (activeSortCol === 'RISK_TRIGGER') {
                valA = dict.reqLevel[String(a[F.RISK_TRIGGER])] || '';
                valB = dict.reqLevel[String(b[F.RISK_TRIGGER])] || '';
            } else {
                valA = a[F[activeSortCol]];
                valB = b[F[activeSortCol]];
            }

            valA = String(valA || '').toLowerCase();
            valB = String(valB || '').toLowerCase();

            if (valA < valB) return activeSortAsc ? -1 : 1;
            if (valA > valB) return activeSortAsc ? 1 : -1;
            return 0;
        });

        const html = sortedStandards.map(s => {
            const badgeText = getFullCategoryText(s);
            const reqText = dict.reqLevel[String(s[F.RISK_TRIGGER])] || '--';
            const reqColor = {
                'Critical': '#EF4444',  // Red
                'Mandatory': '#F59E0B', // Amber
                'Optional': '#3B82F6'   // Blue
            };

            return `
            <tr>
                <td style="font-weight: 600; color: #475569;">${s[F.SECTION_TITLE] || '--'}</td>
                
                <td style="font-weight: 700; color: #1E293B;">${s[F.NAME] || 'Unnamed Standard'}</td>
                
                <td title="This is the instruction to the AI Agent for what to look for in the contract document." style="cursor: help;">
                    ${s[F.BASELINE] || '--'}
                </td>
                
                <td title="This is the instruction to the AI Agent for what to do if it finds something given the instructions contained in the Standard field." style="cursor: help;">
                    ${s[F.PROMPT] || '--'}
                </td>
                
                <td><span class="badge-status" style="background: #E8F0FF; color: #004A99; font-size: 11px;">${badgeText}</span></td>
                
                <td style="color: ${reqColor[reqText] || '#000000'}; font-weight: 600;">${reqText}</td>
                
                <td style="text-align: right; white-space: nowrap;">
                    <button class="dr-btn-secondary btn-sm btn-edit-standard" data-id="${s[F.ID]}" title="Edit Standard" style="padding: 4px 8px;">
                        <i class="fa fa-pencil"></i>
                    </button>
                    <button class="dr-btn-secondary btn-sm btn-delete-standard" data-id="${s[F.ID]}" title="Delete Standard" style="padding: 4px 8px; color: #EF4444; margin-left: 4px;">
                        <i class="fa fa-trash"></i>
                    </button>
                </td>
            </tr>
            `;
        }).join('');

        $('#config-grid-body').html(html);
    },

    updateSortIcons: function () {
        // 1. Reset all sortable headers to the default neutral sort icon
        $('th.dr-sortable i').removeClass('fa-sort-up fa-sort-down').addClass('fa-sort');
        
        // 2. Find the header that matches our current active sort column
        const activeHeaderIcon = $(`th.dr-sortable[data-sort="${this.state.sortCol}"] i`);
        
        // 3. Apply the correct up/down arrow based on state
        if (activeHeaderIcon.length) {
            activeHeaderIcon.removeClass('fa-sort').addClass(this.state.sortAsc ? 'fa-sort-up' : 'fa-sort-down');
        }
    },

    openStandardPanel: function (id = null) {
        this.state.editingId = id;
        const F = window.SCHEMA.FIELDS.CONTRACT_STANDARDS;

        if (id) {
            $('#panel-title').text('Edit Contract Standard');
            const standard = this.state.standards.find(s => s[F.ID] === id);
            if (standard) {
                $('#std-category').val(standard[F.CATEGORY] || '121500000');
                $('#std-modeltype').val(standard[F.MODEL_TYPE] || '');
                $('#std-name').val(standard[F.NAME] || '');
                $('#std-baseline').val(standard[F.BASELINE] || '');
                $('#std-risk').val(standard[F.RISK_TRIGGER] || '121500000');
                $('#std-prompt').val(standard[F.PROMPT] || '');
            }
        } else {
            $('#panel-title').text('Add New Standard');
            $('#std-category').val('121500000');
            $('#std-modeltype').val('');
            $('#std-risk').val('121500000');
            $('#std-name, #std-baseline, #std-prompt').val('');
        }

        $('#admin-panel-overlay').fadeIn(200);
        setTimeout(() => $('#admin-slide-panel').addClass('is-open'), 10);
    },

    closeStandardPanel: function () {
        $('#admin-slide-panel').removeClass('is-open');
        setTimeout(() => {
            $('#admin-panel-overlay').fadeOut(200);
            this.state.editingId = null;
        }, 300);
    },

    saveStandard: async function () {
        const table = window.SCHEMA.TABLES.CONTRACT_STANDARDS;
        const F = window.SCHEMA.FIELDS.CONTRACT_STANDARDS;

        const payload = {
            [F.CATEGORY]: parseInt($('#std-category').val()),
            [F.NAME]: $('#std-name').val(),
            [F.BASELINE]: $('#std-baseline').val(),
            [F.RISK_TRIGGER]: parseInt($('#std-risk').val()),
            [F.PROMPT]: $('#std-prompt').val()
        };

        const modelVal = $('#std-modeltype').val();
        if (modelVal) payload[F.MODEL_TYPE] = parseInt(modelVal);
        else payload[F.MODEL_TYPE] = null;

        const btn = $('#btn-save-standard');
        const originalText = btn.html();
        btn.html('<i class="fa fa-spinner fa-spin"></i> Saving...').css('opacity', '0.7').prop('disabled', true);

        try {
            const isUpdate = !!this.state.editingId;
            const url = isUpdate ? `/_api/${table}(${this.state.editingId})` : `/_api/${table}`;

            const response = await fetch(url, {
                method: isUpdate ? 'PATCH' : 'POST',
                headers: await this._getHeaders(),
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error(await response.text());

            this.closeStandardPanel();
            await this.loadStandards();
            if (window.SubmissionUI && window.SubmissionUI.showToast) window.SubmissionUI.showToast(`Standard saved!`, "success");
        } catch (error) {
            console.error("Save failed:", error);
            alert("Failed to save standard. Check console for details.");
        } finally {
            btn.html(originalText).css('opacity', '1').prop('disabled', false);
        }
    },

    deleteStandard: async function (id) {
        if (!confirm("Are you sure you want to delete this standard?")) return;
        const table = window.SCHEMA.TABLES.CONTRACT_STANDARDS;
        try {
            const response = await fetch(`/_api/${table}(${id})`, { method: 'DELETE', headers: await this._getHeaders() });
            if (!response.ok) throw new Error("Delete failed");
            this.state.standards = this.state.standards.filter(s => s[window.SCHEMA.FIELDS.CONTRACT_STANDARDS.ID] !== id);
            this.renderGrid();
            if (window.SubmissionUI && window.SubmissionUI.showToast) window.SubmissionUI.showToast("Standard deleted.", "success");
        } catch (error) {
            console.error("Delete failed:", error);
            alert("Failed to delete standard.");
        }
    },

    // ==========================================
    // MODULE: GLOBAL SETTINGS & MATRIX
    // ==========================================
    updateYellowMarginDisplay: function () {
        const target = $('#setting-margin-target').val() || 40;
        const critical = $('#setting-margin-critical').val() || 30;
        $('#ui-margin-yellow-display').text(`${critical} to ${target}%`);
    },

    loadGlobalSettings: async function () {
        // SHIMMER EFFECT for Document Governance Matrix
        const matrixShimmer = Array(5).fill().map(() => `
            <tr>
                <td><div class="shimmer is-loading" style="height: 20px; width: 140px; border-radius: 4px;"></div></td>
                <td><div class="shimmer is-loading" style="height: 36px; width: 100%; border-radius: 6px;"></div></td>
                <td><div class="shimmer is-loading" style="height: 36px; width: 100%; border-radius: 6px;"></div></td>
                <td><div class="shimmer is-loading" style="height: 36px; width: 100%; border-radius: 6px;"></div></td>
                <td><div class="shimmer is-loading" style="height: 36px; width: 100%; border-radius: 6px;"></div></td>
                <td></td>
            </tr>
        `).join('');
        $('#doc-matrix-table tbody').html(matrixShimmer);

        const table = window.SCHEMA.TABLES.GLOBAL_SETTINGS;
        const recordId = window.SCHEMA.FIELDS.GLOBAL_SETTINGS.RECORD_ID;
        const F = window.SCHEMA.FIELDS.GLOBAL_SETTINGS;

        try {
            const response = await fetch(`/_api/${table}(${recordId})`, { headers: await this._getHeaders() });
            if (response.ok) {
                const data = await response.json();

                $('#setting-margin-target').val(data[F.TARGET_MARGIN] !== null ? data[F.TARGET_MARGIN] : 40);
                $('#setting-margin-critical').val(data[F.CRITICAL_MARGIN] !== null ? data[F.CRITICAL_MARGIN] : 30);
                this.updateYellowMarginDisplay();

                $('#setting-routing-email').val(data[F.EMAIL] || '');

                this.SettingsManager.renderMatrix(data[F.MATRIX]);
            } else {
                console.warn("Global settings row not found. Using defaults.");
                this.SettingsManager.renderMatrix("{}");
            }
        } catch (e) {
            console.error("Failed to load global settings:", e);
            this.SettingsManager.renderMatrix("{}");
        }
    },

    saveGlobalSetting: async function (payload, btnSelector) {
        const table = window.SCHEMA.TABLES.GLOBAL_SETTINGS;
        const recordId = window.SCHEMA.FIELDS.GLOBAL_SETTINGS.RECORD_ID;
        const $btn = $(btnSelector);

        $btn.html('<i class="fa fa-spinner fa-spin" style="font-size: 16px;"></i>').prop('disabled', true).css('opacity', '0.7');

        try {
            const response = await fetch(`/_api/${table}(${recordId})`, {
                method: 'PATCH',
                headers: await this._getHeaders(),
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error(await response.text());
            if (window.SubmissionUI) window.SubmissionUI.showToast("Settings updated successfully!", "success");
        } catch (e) {
            console.error("Save Settings Error:", e);
            alert("Failed to save settings. Please verify Web API permissions for the global settings table.");
        } finally {
            $btn.html('<i class="fa fa-save" style="font-size: 16px; color: #004A99;"></i>').prop('disabled', false).css('opacity', '1');
        }
    },

    // ==========================================
    // TELEMETRY ORCHESTRATION & FETCHING
    // ==========================================

    loadTelemetry: async function () {
        this._setTelemetryLoadingState();

        try {
            const data = await this._fetchTelemetryData();

            // Capture data from payload
            const deals = data.deals || [];
            const notes = data.notes || [];
            const impacts = data.impacts || [];
            const overrides = data.overrides || [];

            this.state.allDeals = deals;

            // FIX: Define the variable FIRST, then use it in the filter
            const fourMonthsAgo = new Date();
            fourMonthsAgo.setMonth(fourMonthsAgo.getMonth() - 4);

            // Now this filter will work without the ReferenceError
            const recentDeals = deals.filter(d => d.ci_created ? new Date(d.ci_created) >= fourMonthsAgo : true);

            const totalSaved = impacts.reduce((sum, item) => sum + (item.ci_estimatedvaluesaved || 0), 0);

            // Pass the variables to the rendering modules
            this._renderPerformanceMetrics(recentDeals, notes, impacts, totalSaved);
            this._renderHealthMetrics(recentDeals, notes, overrides);
            this._renderOverrideModal(overrides, recentDeals);

            this._renderAIPareto();
            this._renderValueParetos(recentDeals, impacts, totalSaved);

        } catch (error) {
            console.error("Failed to load telemetry data:", error);
        }
    },

    _setTelemetryLoadingState: function () {
        const shimmerLarge = '<div class="shimmer is-loading" style="height: 32px; width: 60%; border-radius: 6px; margin-top: 4px;"></div>';
        const shimmerSmall = '<div class="shimmer is-loading" style="height: 14px; width: 40%; border-radius: 4px; margin-top: 4px;"></div>';
        const shimmerBadge = '<div class="shimmer is-loading" style="height: 16px; width: 36px; border-radius: 8px; display: inline-block; vertical-align: middle;"></div>';

        // UPDATED: Pointing to the new Financial Cockpit IDs
        $('#metric-roi-value, #metric-pipeline-governed, #metric-avg-deal-size, #metric-top-client').html(shimmerLarge);
        $('#metric-roi-count, #metric-top-client-sub, #metric-active-queue').html(shimmerSmall);

        $('#metric-completeness, #metric-reject-rate, #metric-surprise-rate, #metric-high-risk, #metric-ai-clean, #metric-ai-override, #metric-time-spent, #metric-conditional-rate, #metric-deferral-rate').html(shimmerBadge);

        $('#ai-pareto-chart, #impact-categories-chart, #impact-deals-chart').html(`
            <div class="mb-3"><div class="shimmer is-loading" style="height: 14px; width: 100%; border-radius: 4px;"></div></div>
            <div class="mb-3"><div class="shimmer is-loading" style="height: 14px; width: 70%; border-radius: 4px;"></div></div>
            <div class="mb-3"><div class="shimmer is-loading" style="height: 14px; width: 40%; border-radius: 4px;"></div></div>
        `);
    },

    _fetchTelemetryData: async function () {
        const headers = await this._getHeaders();
        const F_DEALS = window.SCHEMA.FIELDS.DEALS;

        // Fetch Deals (Make sure you include the date fields if you revert to Lead Time math)
        let dealsData = { value: [] };
        try {
            const dealsRes = await fetch(`/_api/${window.SCHEMA.TABLES.DEALS}?$select=${F_DEALS.DEALID},${F_DEALS.STATUS},${F_DEALS.EXCEPTION_REQ},${F_DEALS.TECH_RISK},${F_DEALS.RESOURCE_RISK},${F_DEALS.TITLE},${F_DEALS.VALUE},${F_DEALS.CLIENT_TEXT},${F_DEALS.SALES_LEADER},${F_DEALS.MARGIN},ci_created`, { headers });
            if (dealsRes.ok) dealsData = await dealsRes.json();
        } catch (e) { console.warn("Could not fetch deals:", e); }

        // Fetch Review Notes
        let notesData = { value: [] };
        try {
            const notesRes = await fetch(`/_api/${window.SCHEMA.TABLES.REVIEW_HISTORY}`, { headers });
            if (notesRes.ok) notesData = await notesRes.json();
        } catch (e) { console.warn("Could not fetch notes:", e); }

        // Fetch Impacts
        let impactsData = { value: [] };
        try {
            const impactsRes = await fetch(`/_api/ci_deal_impacts`, { headers });
            if (impactsRes.ok) impactsData = await impactsRes.json();
        } catch (e) { console.warn("Could not fetch impacts:", e); }

        // Fetch AI Overrides 
        let overridesData = { value: [] };
        try {
            const overridesRes = await fetch(`/_api/ci_ai_overrideses?$select=ci_dealid,ci_standardname,ci_justification,ci_created_on`, { headers });
            if (overridesRes.ok) {
                overridesData = await overridesRes.json();
            } else {
                console.warn("Overrides fetch failed with status:", overridesRes.status);
            }
        } catch (e) { console.warn("Could not fetch overrides:", e); }

        return {
            deals: dealsData.value || [],
            notes: notesData.value || [],
            impacts: impactsData.value || [],
            overrides: overridesData.value || []
        };
    },

    // ==========================================
    // METRIC RENDERING MODULES
    // ==========================================

    _renderPerformanceMetrics: function (deals, notes, impacts, totalSaved) {
        const F_DEALS = window.SCHEMA.FIELDS.DEALS;

        // 1. ROI / Value Protected
        $('#metric-roi-value').text('$' + totalSaved.toLocaleString());
        $('#metric-roi-count').text(`Based on ${impacts.length} Impact Logs`);

        // Active Review Queue (Status = 1 / Submitted)
        const activeDeals = deals.filter(d => parseInt(d[F_DEALS.STATUS]) === 1);
        $('#metric-active-queue').text(activeDeals.length);

        // --- CORE MATH & GROUPING ---
        let totalPipeline = 0;
        let totalMarginDollars = 0;
        let clientExposure = {};
        let leaderExposure = {};
        let maxDealValue = 0;

        deals.forEach(d => {
            const val = parseFloat(d[F_DEALS.VALUE]) || 0;
            totalPipeline += val;
            if (val > maxDealValue) maxDealValue = val;

            // Handle decimal margin (e.g., 0.43 = 43%)
            let marginPct = parseFloat(d[F_DEALS.MARGIN]) || 0;
            if (marginPct > 1) marginPct = marginPct / 100; // Failsafe if entered as whole numbers
            totalMarginDollars += (val * marginPct);

            // Group by Client
            const clientName = d[F_DEALS.CLIENT_TEXT] || "Unknown Client";
            if (!clientExposure[clientName]) clientExposure[clientName] = 0;
            clientExposure[clientName] += val;

            // Group by Sales Leader
            let leaderRaw = d[F_DEALS.SALES_LEADER] || "Unassigned";
            const leaderName = leaderRaw.split('@')[0].replace('.', ' ').replace(/\b\w/g, l => l.toUpperCase()); // Clean up email
            if (!leaderExposure[leaderName]) leaderExposure[leaderName] = 0;
            leaderExposure[leaderName] += val;
        });

        // --- TOP LEVEL METRICS ---
        const avgDealSize = deals.length > 0 ? (totalPipeline / deals.length) : 0;
        const weightedAvgMargin = totalPipeline > 0 ? (totalMarginDollars / totalPipeline) * 100 : 0;

        $('#metric-pipeline-governed').text('$' + totalPipeline.toLocaleString(undefined, { maximumFractionDigits: 0 }));
        $('#metric-avg-deal-size').text('$' + avgDealSize.toLocaleString(undefined, { maximumFractionDigits: 0 }));
        $('#metric-avg-margin').text(weightedAvgMargin.toFixed(1) + '%');

        // --- HELPERS FOR CHARTS ---
        const formatMoney = (val) => val >= 1000000 ? '$' + (val / 1000000).toFixed(1) + 'M' : '$' + (val / 1000).toFixed(0) + 'k';

        // --- CHART 1: SALES LEADER PARETO (TOP 3) ---
        const sortedLeaders = Object.entries(leaderExposure).sort((a, b) => b[1] - a[1]).slice(0, 3);
        const leaderHtml = sortedLeaders.map(([leader, val], index) => {
            const pct = totalPipeline > 0 ? (val / totalPipeline) * 100 : 0;
            const colors = ['#8B5CF6', '#A78BFA', '#C4B5FD']; // Purple theme
            return `
                <div class="mb-2">
                    <div class="d-flex justify-content-between text-xs mb-1">
                        <span class="font-medium" style="color: #475569;">${leader}</span>
                        <span class="font-bold text-muted">${formatMoney(val)}</span>
                    </div>
                    <div style="height: 6px; background: #F1F5F9; border-radius: 3px; overflow: hidden;">
                        <div style="height: 100%; width: ${pct}%; background: ${colors[index] || '#CBD5E1'};"></div>
                    </div>
                </div>
            `;
        }).join('') || '<p class="text-xs text-muted">No data</p>';
        $('#pipeline-leader-chart').html(leaderHtml);

        // --- CHART 2: STACKED DEAL MARGIN BARS ---
        // Sort deals by size ascending to match your screenshot slope
        const sortedDeals = [...deals].sort((a, b) => (parseFloat(a[F_DEALS.VALUE]) || 0) - (parseFloat(b[F_DEALS.VALUE]) || 0));

        const stackHtml = this._generateStackedChartHtml(deals);
        $('#deal-stack-chart').html(stackHtml || '<p class="text-xs text-muted">No deals to display</p>');

        // --- CHART 3: TOP 5 CLIENTS PARETO ---
        const sortedClients = Object.entries(clientExposure).sort((a, b) => b[1] - a[1]).slice(0, 5);
        const maxClientVal = sortedClients.length > 0 ? sortedClients[0][1] : 0;

        const clientHtml = sortedClients.map(([client, val]) => {
            // Base percentage on the largest client so the bars scale nicely
            const pct = maxClientVal > 0 ? (val / maxClientVal) * 100 : 0;
            return `
                <div class="mb-2">
                    <div class="d-flex justify-content-between text-xs mb-1">
                        <span class="font-medium" style="color: #475569; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 65%;" title="${client}">${client}</span>
                        <span class="font-bold text-primary">${formatMoney(val)}</span>
                    </div>
                    <div style="height: 6px; background: #F1F5F9; border-radius: 3px; overflow: hidden;">
                        <div style="height: 100%; width: ${pct}%; background: #3B82F6;"></div>
                    </div>
                </div>
            `;
        }).join('') || '<p class="text-xs text-muted">No client data</p>';
        $('#client-exposure-chart').html(clientHtml);
    },

    _renderHealthMetrics: function (deals, notes, overrides = []) {
        const F_DEALS = window.SCHEMA.FIELDS.DEALS;
        const F_NOTES = window.SCHEMA.FIELDS.REVIEW_HISTORY;

        // Deferral Rate
        const deferred = notes.filter(n => String(n[F_NOTES.DECISION]).includes("Defer") || n[F_NOTES.DECISION] == 4).length;
        const deferralRate = notes.length > 0 ? Math.round((deferred / notes.length) * 100) : 0;
        $('#metric-deferral-rate').text(`${deferralRate}%`).css({ 'background': '#D1F0D8', 'color': '#1E7E34' });

        // Rejection Cycles
        const rejectionNotesCount = notes.filter(n => {
            const dec = n[F_NOTES.DECISION] || "";
            return String(dec).includes("Reject") || dec === 2 || dec === "2";
        }).length;
        const rejectedDealsCount = deals.filter(d => parseInt(d[F_DEALS.STATUS]) === 3).length;
        const totalRejects = Math.max(rejectionNotesCount, rejectedDealsCount);

        $('#metric-reject-rate').text(totalRejects);
        $('#metric-reject-rate').css({ 'background': totalRejects === 0 ? '#D1F0D8' : '#FEE2E2', 'color': totalRejects === 0 ? '#1E7E34' : '#B91C1C' });

        // Avg Draft Completeness 
        const drafts = deals.filter(d => parseInt(d[F_DEALS.STATUS]) === 0 || d[F_DEALS.STATUS] == null);
        let totalDraftScore = 0;
        drafts.forEach(d => {
            let score = 20;
            if (d[F_DEALS.TITLE]) score += 20;
            if (d[F_DEALS.TECH_RISK]) score += 30;
            if (d[F_DEALS.RESOURCE_RISK]) score += 30;
            totalDraftScore += score;
        });
        const avgDraft = drafts.length > 0 ? Math.round(totalDraftScore / drafts.length) : 0;
        $('#metric-completeness').text(drafts.length > 0 ? `${avgDraft}%` : 'N/A').css({ 'background': '#D1F0D8', 'color': '#1E7E34' });

        // High Risk Profiles
        const highRiskCount = deals.filter(d => {
            const tr = window.SCHEMA.CHOICES && window.SCHEMA.CHOICES.RISK_LEVELS ? Object.keys(window.SCHEMA.CHOICES.RISK_LEVELS).find(k => window.SCHEMA.CHOICES.RISK_LEVELS[k] == d[F_DEALS.TECH_RISK]) : "Low";
            const rr = window.SCHEMA.CHOICES && window.SCHEMA.CHOICES.RISK_LEVELS ? Object.keys(window.SCHEMA.CHOICES.RISK_LEVELS).find(k => window.SCHEMA.CHOICES.RISK_LEVELS[k] == d[F_DEALS.RESOURCE_RISK]) : "Low";
            return String(tr).toUpperCase() === "HIGH" || String(rr).toUpperCase() === "HIGH";
        }).length;
        const highRiskRate = deals.length > 0 ? Math.round((highRiskCount / deals.length) * 100) : 0;

        $('#metric-high-risk').text(`${highRiskRate}%`);
        $('#metric-high-risk').css({ 'background': highRiskRate === 0 ? '#D1F0D8' : '#FEE2E2', 'color': highRiskRate === 0 ? '#1E7E34' : '#B91C1C' });

        // Surprise Rate (Exception Requested)
        const exceptions = deals.filter(d => d[F_DEALS.EXCEPTION_REQ] === true).length;
        const surpriseRate = deals.length > 0 ? Math.round((exceptions / deals.length) * 100) : 0;

        $('#metric-surprise-rate').text(`${surpriseRate}%`);
        $('#metric-surprise-rate').css({ 'background': surpriseRate === 0 ? '#D1F0D8' : '#FEF3C7', 'color': surpriseRate === 0 ? '#1E7E34' : '#B45309' });

        // Conditional Approval Rate
        const conditionalApprovals = notes.filter(n => {
            const dec = n[F_NOTES.DECISION] || "";
            const isApprove = String(dec).includes("Approve") || dec === 1 || dec === "1";
            const hasAction = n[F_NOTES.ACTION] && n[F_NOTES.ACTION].trim().length > 0;
            return isApprove && hasAction;
        }).length;

        const totalApprovals = notes.filter(n => {
            const dec = n[F_NOTES.DECISION] || "";
            return String(dec).includes("Approve") || dec === 1 || dec === "1";
        }).length;

        const conditionalRate = totalApprovals > 0 ? Math.round((conditionalApprovals / totalApprovals) * 100) : 0;

        $('#metric-conditional-rate').text(`${conditionalRate}%`);
        $('#metric-conditional-rate').css({ 'background': conditionalRate === 0 ? '#D1F0D8' : '#DBEAFE', 'color': conditionalRate === 0 ? '#1E7E34' : '#2563EB' });

        // --- AI OVERRIDE MATH ---
        // Find how many unique deals (by text ID) have at least one override logged
        const dealsWithOverrides = new Set(overrides.map(o => o.ci_dealid));
        const overrideRate = deals.length > 0 ? Math.round((dealsWithOverrides.size / deals.length) * 100) : 0;

        $('#metric-ai-override').text(`${overrideRate}%`);
        $('#metric-ai-override').css({
            'background': overrideRate > 25 ? '#FEE2E2' : '#FEF3C7',
            'color': overrideRate > 25 ? '#B91C1C' : '#B45309'
        });

        const cleanRate = 100 - overrideRate;
        $('#metric-ai-clean').text(`${cleanRate}%`).css({ 'background': '#D1F0D8', 'color': '#1E7E34' });
    },

    _renderAIPareto: function () {
        const stdNames = this.state.standards.slice(0, 3).map(s => s[window.SCHEMA.FIELDS.CONTRACT_STANDARDS.NAME]);

        const labels = [
            stdNames[0] || "Payment Terms",
            stdNames[1] || "Limitation of Liability",
            stdNames[2] || "IP Ownership"
        ];

        const paretoHtml = `
            <div class="mb-2">
                <div class="d-flex justify-content-between text-xs mb-1">
                    <span class="font-medium" style="color: #475569; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 70%;">${labels[0]}</span>
                    <span class="font-bold text-danger">42%</span>
                </div>
                <div style="height: 6px; background: #F1F5F9; border-radius: 3px; overflow: hidden;">
                    <div style="height: 100%; width: 42%; background: #EF4444;"></div>
                </div>
            </div>
            <div class="mb-2">
                <div class="d-flex justify-content-between text-xs mb-1">
                    <span class="font-medium" style="color: #475569; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 70%;">${labels[1]}</span>
                    <span class="font-bold text-warning">28%</span>
                </div>
                <div style="height: 6px; background: #F1F5F9; border-radius: 3px; overflow: hidden;">
                    <div style="height: 100%; width: 28%; background: #F59E0B;"></div>
                </div>
            </div>
            <div>
                <div class="d-flex justify-content-between text-xs mb-1">
                    <span class="font-medium" style="color: #475569; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 70%;">${labels[2]}</span>
                    <span class="font-bold text-warning">15%</span>
                </div>
                <div style="height: 6px; background: #F1F5F9; border-radius: 3px; overflow: hidden;">
                    <div style="height: 100%; width: 15%; background: #FBBF24;"></div>
                </div>
            </div>
        `;
        $('#ai-pareto-chart').html(paretoHtml);
    },

    _renderValueParetos: function (deals, impacts, totalSaved) {
        const F_DEALS = window.SCHEMA.FIELDS.DEALS;

        // A. Pareto: Impact Categories
        const categoryCounts = {};
        impacts.forEach(impact => {
            if (impact.ci_impactcategories) {
                const cats = impact.ci_impactcategories.split(',').map(c => c.trim()).filter(c => c);
                cats.forEach(c => {
                    categoryCounts[c] = (categoryCounts[c] || 0) + 1;
                });
            }
        });

        const sortedCategories = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]);
        const totalCategoryHits = sortedCategories.reduce((sum, [_, count]) => sum + count, 0);

        const catParetoHtml = sortedCategories.slice(0, 3).map(([cat, count], index) => {
            const pct = totalCategoryHits > 0 ? Math.round((count / totalCategoryHits) * 100) : 0;
            const colors = ['#3B82F6', '#60A5FA', '#93C5FD'];
            return `
                <div class="mb-3">
                    <div class="d-flex justify-content-between text-xs mb-1">
                        <span class="font-medium" style="color: #475569;">${cat}</span>
                        <span class="font-bold text-muted">${count} instances</span>
                    </div>
                    <div style="height: 6px; background: #F1F5F9; border-radius: 3px; overflow: hidden;">
                        <div style="height: 100%; width: ${pct}%; background: ${colors[index] || '#CBD5E1'};"></div>
                    </div>
                </div>
            `;
        }).join('') || '<p class="text-xs text-muted">No category data available.</p>';

        $('#impact-categories-chart').html(catParetoHtml);

        // B. Pareto: Top Financial Impacts
        const topDeals = impacts
            .filter(i => i.ci_estimatedvaluesaved > 0)
            .sort((a, b) => b.ci_estimatedvaluesaved - a.ci_estimatedvaluesaved)
            .slice(0, 3);

        const dealsParetoHtml = topDeals.map((impact, index) => {
            const val = impact.ci_estimatedvaluesaved;
            const pct = totalSaved > 0 ? Math.round((val / totalSaved) * 100) : 0;
            const colors = ['#10B981', '#34D399', '#6EE7B7'];

            const dealId = impact._ci_dealid_value;
            const matchedDeal = deals.find(d => d[F_DEALS.DEALID] === dealId);
            const dealTitle = matchedDeal ? matchedDeal[F_DEALS.TITLE] : "Unknown Deal";

            return `
                <div class="mb-3">
                    <div class="d-flex justify-content-between text-xs mb-1">
                        <a href="/new-submission?dealId=${dealId}" target="_blank" class="font-medium text-decoration-none" style="color: #2563EB; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 65%;" title="View ${dealTitle}">
                            ${dealTitle} <i class="fa fa-external-link" style="font-size: 10px; margin-left: 2px;"></i>
                        </a>
                        <span class="font-bold text-success">$${val.toLocaleString()}</span>
                    </div>
                    <div style="height: 6px; background: #F1F5F9; border-radius: 3px; overflow: hidden;">
                        <div style="height: 100%; width: ${pct}%; background: ${colors[index] || '#CBD5E1'};"></div>
                    </div>
                </div>
            `;
        }).join('') || '<p class="text-xs text-muted">No financial impact data available.</p>';

        $('#impact-deals-chart').html(dealsParetoHtml);
    },

    _generateStackedChartHtml: function (dealsArray) {
        const F_DEALS = window.SCHEMA.FIELDS.DEALS;
        const sortedDeals = [...dealsArray].sort((a, b) => (parseFloat(a[F_DEALS.VALUE]) || 0) - (parseFloat(b[F_DEALS.VALUE]) || 0));

        let maxDealValue = 0;
        sortedDeals.forEach(d => {
            const val = parseFloat(d[F_DEALS.VALUE]) || 0;
            if (val > maxDealValue) maxDealValue = val;
        });

        return sortedDeals.map(d => {
            const val = parseFloat(d[F_DEALS.VALUE]) || 0;
            if (val === 0) return '';

            let marginPct = parseFloat(d[F_DEALS.MARGIN]) || 0;
            if (marginPct > 1) marginPct = marginPct / 100;

            const marginVal = val * marginPct;
            const barHeightPct = maxDealValue > 0 ? (val / maxDealValue) * 100 : 0;
            const marginHeightPct = marginPct * 100;
            const baseHeightPct = 100 - marginHeightPct;

            const rawTitle = d[F_DEALS.TITLE] || 'Deal';
            const safeTitle = rawTitle.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
            const tooltipText = `${safeTitle}&#10;Total Value: $${val.toLocaleString()}&#10;Margin: $${marginVal.toLocaleString(undefined, { maximumFractionDigits: 0 })} (${(marginPct * 100).toFixed(1)}%)`;

            return `
                <div class="deal-hover-bar" style="height: ${barHeightPct}%; flex: 1; display: flex; flex-direction: column; justify-content: flex-end; cursor: pointer; min-width: 4px;" title="${tooltipText}">
                    <div style="height: ${marginHeightPct}%; width: 100%; background: #4F46E5; border-radius: 2px 2px 0 0; border-bottom: 1px solid rgba(255,255,255,0.2);"></div>
                    <div style="height: ${baseHeightPct}%; width: 100%; background: #A5B4FC; border-radius: 0 0 2px 2px;"></div>
                </div>
            `;
        }).join('');
    },

    _updateModalChart: function () {
        const filter = $('#chart-time-filter').val();
        const allDeals = this.state.allDeals || [];
        const now = new Date();
        let filtered = allDeals;

        // Apply Time Filter Math
        if (filter === '4months') {
            const d = new Date();
            d.setMonth(d.getMonth() - 4);
            filtered = allDeals.filter(x => x.ci_created && new Date(x.ci_created) >= d);
        } else if (filter === 'ytd') {
            const startOfYear = new Date(now.getFullYear(), 0, 1);
            filtered = allDeals.filter(x => x.ci_created && new Date(x.ci_created) >= startOfYear);
        } else if (filter === 'quarter') {
            const currentQuarter = Math.floor(now.getMonth() / 3);
            const startOfQuarter = new Date(now.getFullYear(), currentQuarter * 3, 1);
            filtered = allDeals.filter(x => x.ci_created && new Date(x.ci_created) >= startOfQuarter);
        }

        const html = this._generateStackedChartHtml(filtered);
        $('#expanded-deal-stack-chart').html(html || '<div class="w-100 text-center mt-5 text-muted" style="font-size: 18px;">No deals submitted during this timeframe.</div>');
    },

    _renderOverrideModal: function (overrides, deals) {
        const F_DEALS = window.SCHEMA.FIELDS.DEALS;
        const tbody = $('#ai-override-modal tbody');
        if (!overrides || overrides.length === 0) {
            tbody.html('<tr><td colspan="4" class="text-center text-muted" style="padding: 32px;">No AI overrides logged.</td></tr>');
            return;
        }

        const sortedOverrides = [...overrides].sort((a, b) => new Date(b.ci_created_on) - new Date(a.ci_created_on));

        const html = sortedOverrides.map(o => {
            const dealId = o.ci_dealid; // Use lowercase
            const matchedDeal = deals.find(d => d[window.SCHEMA.FIELDS.DEALS.DEALID] === dealId);
            const dealName = matchedDeal ? matchedDeal[window.SCHEMA.FIELDS.DEALS.TITLE] : 'Unknown Deal';

            const dateObj = new Date(o.ci_created_on); // Use lowercase
            const dateStr = !isNaN(dateObj) ? dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '--';

            return `
                <tr>
                    <td class="font-medium text-primary">
                        <a href="/new-submission?dealId=${dealId}" target="_blank" style="text-decoration: none;">${dealName}</a>
                    </td>
                    <td>${o.ci_standardname || '--'}</td> 
                    <td class="text-muted"><i>"${o.ci_justification || 'No justification.'}"</i></td>
                    <td style="white-space: nowrap;">${dateStr}</td>
                </tr>
            `;
        }).join('');

        tbody.html(html);
    },

    SettingsManager: {
        // The default blueprint. SOW and PRICING are permanently locked as Required. RATE is now an optional pricing file.
        defaultDocTypes: [
            { id: "MSA", name: "Master Services Agreement", icon: "fa-file-word-o", color: "#2563EB", locked: false },
            { id: "SOW", name: "Statement of Work (SOW)", icon: "fa-file-word-o", color: "#2563EB", locked: true },
            { id: "PRICING", name: "Pricing / Cost Model", icon: "fa-file-excel-o", color: "#16A34A", locked: true },
            { id: "RATE", name: "Rate Card", icon: "fa-file-excel-o", color: "#16A34A", locked: false },
            { id: "ARCH", name: "Architecture Diagram", icon: "fa-file-pdf-o", color: "#EF4444", locked: false },
            { id: "PROPOSAL", name: "Proposal Slides", icon: "fa-file-powerpoint-o", color: "#D97706", locked: false },
            { id: "PROJECT_PLAN", name: "Project Plan", icon: "fa-file-excel-o", color: "#16A34A", locked: false }
        ],
        currentDocTypes: [],
        modelTypes: ["TM", "TM_NTE", "FIXED_CAP", "FIXED_FEE"],

        renderMatrix: function (savedMatrixJSON) {
            let parsed = {};
            try { parsed = JSON.parse(savedMatrixJSON || "{}"); } catch (e) { }

            // Load dynamically saved document types, or fall back to our default blueprint
            if (parsed.docTypes && Array.isArray(parsed.docTypes)) {
                this.currentDocTypes = parsed.docTypes;
            } else {
                this.currentDocTypes = [...this.defaultDocTypes];
            }

            const rules = parsed.rules || parsed; // Handle legacy matrix format gracefully

            const html = this.currentDocTypes.map(doc => {
                let row = `<tr><td style="font-weight: 600;"><i class="fa ${doc.icon || 'fa-file-o'}" style="color: ${doc.color || '#64748B'}; width: 16px;"></i> ${doc.name}</td>`;

                this.modelTypes.forEach(model => {
                    let val = (rules[doc.id] && rules[doc.id][model]) || "Optional";

                    // Force the UI select to "Required" and disable it if the document type is locked
                    if (doc.locked) val = "Required";

                    row += `
                        <td>
                            <select class="dr-select matrix-select" data-doc="${doc.id}" data-model="${model}" ${doc.locked ? 'disabled' : ''}>
                                <option value="Required" ${val === 'Required' ? 'selected' : ''}>Required</option>
                                <option value="Optional" ${val === 'Optional' ? 'selected' : ''}>Optional</option>
                                <option value="Hidden" ${val === 'Hidden' ? 'selected' : ''}>Hidden</option>
                            </select>
                        </td>
                    `;
                });

                // Add lock icon for mandatory files, trash can for dynamically added/optional ones
                if (doc.locked) {
                    row += `<td><i class="fa fa-lock text-muted" title="Required system document" style="margin-left: 10px;"></i></td>`;
                } else {
                    row += `<td><i class="fa fa-trash btn-delete-doc" data-id="${doc.id}" style="color: #EF4444; cursor: pointer; margin-left: 10px;" title="Remove document type"></i></td>`;
                }

                return row + "</tr>";
            }).join('');

            $('#doc-matrix-table tbody').html(html);
        },

        serializeMatrix: function () {
            const rules = {};
            $('.matrix-select').each(function () {
                const doc = $(this).attr('data-doc');
                const model = $(this).attr('data-model');
                const val = $(this).val();

                if (!rules[doc]) rules[doc] = {};
                rules[doc][model] = val;
            });

            // Re-enforce locked required statuses silently before saving
            this.currentDocTypes.forEach(doc => {
                if (doc.locked) {
                    if (!rules[doc.id]) rules[doc.id] = {};
                    this.modelTypes.forEach(m => rules[doc.id][m] = "Required");
                }
            });

            // Package the full state so Dataverse holds the schema AND the rules
            return JSON.stringify({
                docTypes: this.currentDocTypes,
                rules: rules
            });
        },

        addDocumentType: function (name) {
            if (!name.trim()) return;

            // Create a clean, unique ID out of the name
            const id = name.trim().toUpperCase().replace(/[^A-Z0-9]/g, '_') + '_' + Date.now().toString().slice(-4);

            this.currentDocTypes.push({
                id: id,
                name: name.trim(),
                icon: "fa-file-o", // Generic file icon for custom uploads
                color: "#64748B",
                locked: false
            });

            // Serialize current UI state so we don't wipe out unsaved selections when redrawing the table
            const currentRulesJSON = this.serializeMatrix();
            this.renderMatrix(currentRulesJSON);
        },

        removeDocumentType: function (id) {
            if (!confirm("Are you sure you want to remove this document category?")) return;
            this.currentDocTypes = this.currentDocTypes.filter(d => d.id !== id);

            const currentRulesJSON = this.serializeMatrix();
            this.renderMatrix(currentRulesJSON);
        }
    }
};

$(document).ready(() => AdminApp.init());