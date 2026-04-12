(function () {
  "use strict";

  // -----------------------------
  // DR Namespace (create first!)
  // -----------------------------
  const DR = (window.DR = window.DR || {});
  console.log("[DR] dealreview.js loaded v2026-02-14a", { hasSafe: !!(window.DR && window.DR.Util && window.DR.Util.safeJsonParse) });

  // -----------------------------
  // Utilities
  // -----------------------------
  DR.Util = DR.Util || {};
  DR.Util.safeJsonParse = function (s, fallback = null) {
    try { return JSON.parse(s); } catch { return fallback; }
  };

  // -----------------------------
  // Config bridge (CSP-safe)
  // -----------------------------
  // If older code expects DR.Const but page provides DR_CONFIG, bridge it here.
  if (!DR.Const && window.DR_CONFIG) {
    DR.Const = {
      ...(window.DR_CONFIG.dataverse || {}),
      choices: window.DR_CONFIG.choices || {},
      defaults: window.DR_CONFIG.defaults || {},
      pages: window.DR_CONFIG.pages || {}
    };
  }

  DR.Schema = {
    Deals: {
      entitySet: "ci_deals",
      fields: {
        id: "ci_externalprimarykey",
        title: "ci_title",
        status: "ci_status",
        clientLookup: "ci_clientlookup"
      }
    },
    Accounts: {
      entitySet: "ci_clientaccounts",
      fields: {
        id: "ci_externalprimarykey",
        name: "ci_title"
      }
    },
    Notes: {
      entitySet: "ci_reviewnotes", // Now correctly enabled
      fields: {
        id: "ci_externalprimarykey",
        dealId: "ci_dealid",
        decision: "ci_reviewdecision",
        content: "ci_reviewnotes"
      }
    }
  };

  // -----------------------------
  // Config + Validation
  // -----------------------------
  DR.Config = (() => {
    const cfg = window.DR_CONFIG || {};

    function require(path, value) {
      if (value == null || value === "") {
        throw new Error(`Missing required config: DR_CONFIG.${path}`);
      }
      return value;
    }

    const dataverse = require("dataverse", cfg.dataverse);
    const entitySet = require("dataverse.entitySet", dataverse.entitySet);

    return {
      raw: cfg,
      dataverse: {
        entitySet,
        fields: require("dataverse.fields", dataverse.fields),
      },
      choices: require("choices", cfg.choices),
      pages: cfg.pages || {},
      defaults: cfg.defaults || {},
    };
  })();

  // -----------------------------
  // Token
  // -----------------------------
  DR.Token = (() => {
    // Cache token in-memory; refresh when missing/invalid
    let cached = null;

    async function fetchFromLayout() {
      // Power Pages token endpoint returns HTML containing __RequestVerificationToken
      const res = await fetch("/_layout/tokenhtml", { credentials: "same-origin" });
      const html = await res.text();

      // Typical output contains: <input name="__RequestVerificationToken" type="hidden" value="...">
      const m = html.match(/name="__RequestVerificationToken"[^>]*value="([^"]+)"/i);
      if (!m?.[1]) {
        throw new Error('Anti-forgery token not found in "/_layout/tokenhtml" response.');
      }
      return m[1];
    }

    return {
      async get() {
        if (cached) return cached;
        cached = await fetchFromLayout();
        return cached;
      },
      clear() { cached = null; }
    };
  })();

  // -----------------------------
  // Utils
  // -----------------------------
  Object.assign(DR.Util, {
    safeText(v) {
      return v == null ? "" : String(v);
    },
    escapeHtml(v) {
      return DR.Util.safeText(v)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
    },
    escapeAttr(v) {
      return DR.Util.escapeHtml(v).replaceAll("\n", "");
    },
    pick(obj, keys, fallback = null) {
      for (const k of keys) {
        if (obj && obj[k] != null) return obj[k];
      }
      return fallback;
    },
    sleep(ms) {
      return new Promise((r) => setTimeout(r, ms));
    },
    yyyyMmDdLocal(d = new Date()) {
      const pad = (n) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    },
    fmtDateLong(isoDate) {
      try {
        const d = new Date(isoDate);
        return d.toLocaleDateString(DR.Config.defaults.locale || "en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });
      } catch {
        return isoDate;
      }
    },
    fmtMoneyCompact(n) {
      if (n == null || n === "") return "";
      const num = Number(n);
      if (!isFinite(num)) return String(n);
      if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(2)}M`;
      if (num >= 1_000) return `$${(num / 1_000).toFixed(1)}K`;
      return `$${num.toFixed(0)}`;
    },
  });


  // -----------------------------
  // HTTP + Anti-forgery token
  // -----------------------------
  DR.Http = (() => {
    let tokenCache = null;

    async function getAntiForgeryToken() {
      if (tokenCache) return tokenCache;

      const res = await fetch("/_layout/tokenhtml", {
        method: "GET",
        headers: { Accept: "text/html" },
        credentials: "same-origin",
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Failed to load anti-forgery token (${res.status}): ${txt}`);
      }

      const html = await res.text();
      const m = html.match(
        /name="__RequestVerificationToken"\s+type="hidden"\s+value="([^"]+)"/i
      );
      if (!m) throw new Error('Anti-forgery token not found in "/_layout/tokenhtml" response.');

      tokenCache = m[1];
      return tokenCache;
    }

    async function fetchText(url, options) {
      const res = await fetch(url, {
        credentials: "same-origin",
        cache: "no-store",
        ...options,
      });
      const text = await res.text();
      return { res, text };
    }

    // CHANGE: return res too (so callers can read headers like OData-EntityId)
    async function fetchJson(url, options) {
      const { res, text } = await fetchText(url, options);

      let json = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        // leave json null; caller will use text
      }

      if (!res.ok) {
        const msg = json?.error?.message || json?.message || text || `${res.status} ${res.statusText}`;
        const code = json?.error?.code ? ` (${json.error.code})` : "";
        throw new Error(`${options?.method || "GET"} ${url} failed (${res.status})${code}: ${msg}`);
      }

      return { res, json, text };
    }

    async function dvWriteJson(url, method, bodyObj) {
      const token = await getAntiForgeryToken();

      const { res, json, text } = await fetchJson(url, {
        method,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "OData-MaxVersion": "4.0",
          "OData-Version": "4.0",

          // CHANGE: send token under BOTH header names (covers portal variations)
          "__RequestVerificationToken": token,
          "RequestVerificationToken": token,

          // CHANGE: helps some portal stacks treat as an AJAX write
          "X-Requested-With": "XMLHttpRequest",

          // OPTIONAL but useful: makes POST/PATCH return the entity in body
          "Prefer": "return=representation",
        },
        body: bodyObj ? JSON.stringify(bodyObj) : null,
      });

      // Keep signature: return json only, but you can still grab headers if needed
      // by changing this return to { res, json, text } in your calling code.
      return { res, json, text };
    }

    async function dvGetJson(url) {
      const { json } = await fetchJson(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "OData-MaxVersion": "4.0",
          "OData-Version": "4.0",
        },
      });
      return json;
    }

    return { dvGetJson, dvWriteJson, fetchJson };
  })();


  // -----------------------------
  // Dataverse Web API (for our request table)
  // -----------------------------
  DR.DV = (() => {
    const { entitySet, fields, choices, defaults } = DR.Const;

    function ensureEntitySetLooksPlural() {
      // crude but effective: if someone accidentally set logical name instead of entity set
      if (!entitySet || entitySet.includes("_") && !entitySet.endsWith("s")) {
        // Not foolproof, but catches common “ci_drapirequest” mistake
        console.warn("DR_CONFIG.dataverse.entitySet may be wrong:", entitySet);
      }
    }

    function parseEntityIdFromHeader(res) {
      const entityUrl = res.headers.get("OData-EntityId") || res.headers.get("odata-entityid");
      if (!entityUrl) return null;
      const m = entityUrl.match(/\(([^)]+)\)/);
      return m?.[1] || null;
    }

    async function createRequest({ requestTypeValue, payloadObj }) {
      ensureEntitySetLooksPlural();

      const body = {
        [fields.requestType]: requestTypeValue,
        [fields.payload]: JSON.stringify(payloadObj || {}),
        [fields.status]: choices.status.new
      };

      // We need the raw fetch response to get OData-EntityId reliably,
      // so we do a direct fetch rather than DR.Http.dvWrite (which returns JSON).
      const token = await DR.Token.get();
      const res = await fetch(`/_api/${entitySet}`, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "OData-MaxVersion": "4.0",
          "OData-Version": "4.0",
          "__RequestVerificationToken": token,
          "Prefer": "return=representation"
        },
        body: JSON.stringify(body)
      });

      const text = await res.text();
      if (!res.ok) {
        const j = DR.Util.safeJsonParse(text, null);
        const msg = j?.error?.message || text;
        throw new Error(`Create request failed (${res.status}): ${msg}`);
      }

      // Prefer OData-EntityId; fallback to response JSON id field
      const idFromHeader = parseEntityIdFromHeader(res);
      if (idFromHeader) return idFromHeader;

      const json = DR.Util.safeJsonParse(text, null);
      const idFromBody = json?.[fields.id];
      if (idFromBody) return idFromBody;

      throw new Error("Create request succeeded but no entity id was returned (missing OData-EntityId and id field).");
    }

    async function getRequestRow(id) {
      const select = [fields.status, fields.response, fields.error].join(",");

      const url = `/_api/${entitySet}(${id})?$select=${encodeURIComponent(select)}`;

      const { json } = await DR.Http.fetchJson(url, {
        method: "GET",
        cache: "no-store", // ✅ critical: bypass browser cache
        headers: {
          Accept: "application/json",
          "OData-MaxVersion": "4.0",
          "OData-Version": "4.0",
        },
      });

      return json;
    }


    async function pollRequest(id, opts = {}) {
      const timeoutMs = opts.timeoutMs ?? defaults.pollTimeoutMs ?? 60000;
      const intervalMs = opts.intervalMs ?? defaults.pollIntervalMs ?? 800;

      const start = Date.now();
      while (Date.now() - start < timeoutMs) {
        const row = await getRequestRow(id);
        console.log("[poll] row keys:", row ? Object.keys(row) : row, row);
        console.log("[poll] status field name:", fields.status, "value:", row?.[fields.status]);

        const status = row?.[fields.status];
        if (status === choices.status.done) {
          const payload = row?.[fields.response] || "[]";
          return JSON.parse(payload);
        }
        if (status === choices.status.error) {
          throw new Error(row?.[fields.error] || "Request failed");
        }

        await DR.Util.sleep(intervalMs);
      }
      throw new Error("Timed out waiting for response");
    }

    async function request({ requestTypeValue, payloadObj, pollOptions }) {
      const id = await createRequest({ requestTypeValue, payloadObj });
      return pollRequest(id, pollOptions);
    }

    return { createRequest, pollRequest, request };
  })();


  // -----------------------------
  // Domain API (mock vs live)
  // -----------------------------
  DR.Api = (() => {
    const mode = (DR.Config?.raw?.runtime?.mode || "mock").toLowerCase();
    const mocks = window.DR_MOCKS || {};

    const mock = {
      async getToday() { return mocks.todayDeals || []; },
      async getDocs(dealId) { return mocks.docsByDealId?.[Number(dealId)] || []; },
      async getLatestNote(dealId) { return mocks.latestNoteByDealId?.[Number(dealId)] || null; },
      async submitDecision(payload) {
        console.log("[MOCK] submitDecision", payload);
        return { ok: true };
      }
    };

    const live = {
      async getToday(meetingDateIso) {
        const { entitySet, fields } = DR.Schema.Deals;
        // TDD Discovery: Fetching by Top until filter logic is finalized
        const url = `/_api/${entitySet}?$top=20&$select=${fields.id},${fields.title},${fields.status}`;
        const result = await DR.Http.dvGetJson(url);
        return result?.value || [];
      },

      async getDocs(dealId) {
        const { entitySet, fields } = DR.Schema.Documents;
        const filter = encodeURIComponent(`${fields.dealLookup} eq '${dealId}'`);
        return await DR.Http.dvGetJson(`/_api/${entitySet}?$filter=${filter}`);
      },

      async submitDecision(payload) {
        const { fields } = DR.Schema.Deals;
        const updateData = {
          [fields.status]: payload.decision === "Approve" ? 0 : 1,
          "ci_ReviewNotes": payload.notes, // Update these as you verify the internal names
          "ci_ActionRequired": payload.actionRequiredSummary
        };
        return await DealService.updateDeal(payload.dealId, updateData);
      }
    };

    return mode === "live" ? live : mock;
  })();


  // -----------------------------
  // State
  // -----------------------------
  DR.State = {
    todayISO: DR.Util.yyyyMmDdLocal(),
    deals: [],
    selectedDealId: null,
    selectedDeal: null,
    documents: [],
    latestNote: null,
    decision: null, // "approve" | "reject"
    lastSubmitResult: null,
    feedbackNotes: "",
    actionRequiredSummary: "",
    dealStatus: "",                 // default blank; set per deal or user choice
    dealExceptionRequested: false,  // new
    dealExceptionApproved: "no",    // "yes" | "no" (keep string to match schema)
    error: null,
    loading: { deals: false, detail: false, submit: false },
  };

  // -----------------------------
  // UI Rendering
  // -----------------------------
  DR.UI = (() => {
    function getRoot() {
      return document.getElementById("dr-app");
    }

    // ---- small view helpers (UI-only) ----
    function fmtBytes(bytes) {
      const n = Number(bytes);
      if (!isFinite(n) || n <= 0) return "";
      if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)} GB`;
      if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} MB`;
      if (n >= 1_000) return `${Math.round(n / 1_000)} KB`;
      return `${n} B`;
    }

    function fmtDateShort(s) {
      if (!s) return "";
      // tolerate "02-12-2026" or "2026-02-12"
      const tryDate =
        /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T00:00:00`) :
          /^\d{2}-\d{2}-\d{4}$/.test(s) ? new Date(`${s.slice(6, 10)}-${s.slice(0, 2)}-${s.slice(3, 5)}T00:00:00`) :
            new Date(s);

      if (!isFinite(tryDate.getTime())) return String(s);
      return tryDate.toLocaleDateString(DR.Config?.defaults?.locale || "en-US", { month: "short", day: "numeric" });
    }

    function docTypeFromName(name, url) {
      const raw = (name || url || "").toLowerCase();
      if (raw.includes("powerappsportals.com") || raw.includes("estimateid=") || raw.includes("estimator")) return "model";
      const ext = raw.split("?")[0].split("#")[0].split(".").pop();
      return ext || "file";
    }

    function docIconGlyph(type) {
      // simple “emoji as icon” until you swap in Fluent icons later
      if (type === "pdf") return "📄";
      if (type === "doc" || type === "docx") return "📝";
      if (type === "xls" || type === "xlsx") return "📊";
      if (type === "ppt" || type === "pptx") return "📈";
      if (type === "zip") return "🗜️";
      if (type === "model") return "🧮";
      return "📎";
    }

    function statusBadgeClass(statusText) {
      const s = String(statusText || "").toLowerCase();
      if (s.includes("ready")) return "ready";
      if (s.includes("draft")) return "neutral";
      if (s.includes("under review") || s.includes("scheduled")) return "warn";
      if (s.includes("rejected") || s.includes("withdrawn")) return "riskhigh";
      return "neutral";
    }

    function render() {
      const root = getRoot();
      if (!root) return;

      root.innerHTML = `
        <div class="dr-header">
          <div class="dr-header-inner">
            <div class="dr-header-top">
              <div class="dr-left">
                <button class="dr-back" data-action="back">← Back</button>
                <div class="dr-divider"></div>
                <div class="dr-title">
                  <h1>Deal Review Board Meeting Support</h1>
                  <p>Governance Review &amp; Approval Workflow</p>
                </div>
              </div>
              <div class="dr-date">${DR.Util.escapeHtml(DR.Util.fmtDateLong(DR.State.todayISO))}</div>
            </div>

            <div class="dr-tabs">
              <div class="dr-sectionlabel">TODAY'S REVIEWS (${DR.State.deals.length})</div>
              ${DR.State.deals.map((d) => {
        const dealId = DR.Util.pick(d, ["dealID", "dealId", "DealId", "ID", "Id", "id"]);
        const dealName = DR.Util.pick(d, ["dealName", "DealName", "Title", "name"], `Deal ${dealId}`);
        const active = String(dealId) === String(DR.State.selectedDealId);
        return `
                  <button class="dr-tab ${active ? "is-active" : ""}"
                          data-action="select-deal"
                          data-dealid="${DR.Util.escapeAttr(dealId)}">
                    ${DR.Util.escapeHtml(`${dealId} - ${dealName}`)}
                  </button>`;
      }).join("")}
            </div>
          </div>
        </div>

        <div class="dr-main">
          ${DR.State.error ? `<div class="dr-error">${DR.Util.escapeHtml(DR.State.error)}</div>` : ""}
          ${DR.State.selectedDeal ? renderGrid() : renderEmpty()}
        </div>
      `;

      wireEvents();
    }

    function renderEmpty() {
      const msg = DR.State.loading.deals
        ? "Loading today’s reviews…"
        : "No deals scheduled for review today.";
      return `<div class="dr-muted" style="padding:18px 4px;">${DR.Util.escapeHtml(msg)}</div>`;
    }

    function renderGrid() {
      const d = DR.State.selectedDeal || {};

      const dealId = DR.Util.pick(d, ["dealID", "dealId", "DealId", "ID", "Id", "id"], "");
      const dealName = DR.Util.pick(d, ["dealName", "DealName", "Title", "name"], "");
      const customer = DR.Util.pick(d, ["customer", "Customer", "account", "clientName", "Client"], "");
      const statusText = DR.Util.pick(d, ["status", "Status"], "");
      const meetingDate = DR.Util.pick(d, ["meetingDate", "meeting_date", "Start"], "");
      const submittedBy = DR.Util.pick(d, ["submittedBy", "SubmittedBy", "owner", "Owner"], "");
      const submittedOn = DR.Util.pick(d, ["submittedOn", "SubmittedOn", "submittedDate", "Submitted"], "");
      const dealType = DR.Util.pick(d, ["dealType", "DealType", "requestType"], "New Business");
      const commercial = DR.Util.pick(d, ["commercialModel", "CommercialModel"], "");
      const contractValue = DR.Util.pick(d, ["contractValue", "ContractValue", "value"], null);
      const margin = DR.Util.pick(d, ["estimatedMargin", "margin", "EstimatedMargin"], "");

      const statusCls = statusBadgeClass(statusText);
      const latest = DR.State.latestNote;
      const latestDecision = latest ? DR.Util.pick(latest, ["decision", "Decision"], "—") : "—";
      const latestDate = latest ? DR.Util.pick(latest, ["date", "Date"], "") : "";
      const latestNotes = latest ? DR.Util.pick(latest, ["notes", "Notes"], "") : "";
      const latestActions = latest ? DR.Util.pick(latest, ["actionRequiredSummary", "ActionRequiredSummary"], "") : "";

      const latestHtml = latest
        ? `
          <div class="dr-muted" style="font-size:12px;margin-top:10px;">
            Latest decision: <strong>${DR.Util.escapeHtml(latestDecision)}</strong>
            ${latestDate ? `<div style="margin-top:6px;">${DR.Util.escapeHtml(`Date: ${latestDate}`)}</div>` : ``}
            ${latestNotes ? `<div style="margin-top:6px;">${DR.Util.escapeHtml(`Notes: ${latestNotes}`)}</div>` : ``}
            ${latestActions ? `<div style="margin-top:6px;"><strong>Actions:</strong> ${DR.Util.escapeHtml(latestActions)}</div>` : ``}
          </div>`
        : `<div class="dr-muted" style="font-size:12px;margin-top:10px;">No previous review history for this deal</div>`;

      const docsHtml = renderDocuments();

      return `
        <div class="dr-grid">
          <!-- LEFT: Deal Metadata -->
          <div class="dr-card">
            <div class="dr-sectionlabel" style="margin-bottom:14px;">DEAL METADATA</div>

            <h3 class="dr-h3">${DR.Util.escapeHtml(dealName)}</h3>
            ${customer ? `<p class="dr-sub">${DR.Util.escapeHtml(customer)}</p>` : ``}
            <p class="dr-id">${DR.Util.escapeHtml(dealId)}</p>

            <div class="dr-row" style="gap:10px;margin-top:10px;flex-wrap:wrap;">
              ${statusText ? `<span class="dr-badge ${statusCls}">${DR.Util.escapeHtml(statusText)}</span>` : ``}
            </div>

            <hr class="dr-divider-hr"/>

            <div class="dr-sectionlabel" style="margin-bottom:10px;">FINANCIAL OVERVIEW</div>
            <div class="dr-kv">
              <span class="k">Total Deal Value</span>
              <span class="v">${DR.Util.escapeHtml(DR.Util.fmtMoneyCompact(contractValue))}</span>
            </div>

            <div class="dr-row" style="gap:10px;margin-top:10px;flex-wrap:wrap;">
              ${commercial ? `<span class="dr-pill">${DR.Util.escapeHtml(commercial)}</span>` : ``}
              ${margin ? `<span class="dr-pill">${DR.Util.escapeHtml(`EST. MARGIN ${margin}`)}</span>` : ``}
            </div>

            <hr class="dr-divider-hr"/>

            <div class="dr-sectionlabel" style="margin-bottom:10px;">DEAL STRUCTURE</div>
            <div class="dr-kv"><span class="k">Deal Type</span><span class="v">${DR.Util.escapeHtml(dealType || "—")}</span></div>
            <div class="dr-kv"><span class="k">Commercial Model</span><span class="v">${DR.Util.escapeHtml(commercial || "—")}</span></div>
            <div class="dr-kv"><span class="k">Owner</span><span class="v">${DR.Util.escapeHtml(submittedBy || "—")}</span></div>
            <div class="dr-kv"><span class="k">Submitted</span><span class="v">${DR.Util.escapeHtml(submittedOn || meetingDate || "—")}</span></div>

            <hr class="dr-divider-hr"/>

            <div class="dr-sectionlabel" style="margin-bottom:10px;">ACTIONS</div>
            <button class="dr-submit" data-action="refresh" ${DR.State.loading.detail ? "disabled" : ""}>
              ${DR.State.loading.detail ? "Refreshing…" : "Refresh deal details"}
            </button>
          </div>

          <!-- CENTER: Documents -->
          <div class="dr-card">
            <div class="dr-sectionlabel" style="margin-bottom:14px;">DEAL DOCUMENTS</div>
            ${docsHtml}
          </div>

          <!-- RIGHT: Feedback -->
          <div class="dr-card">
            <div class="dr-sectionlabel" style="margin-bottom:14px;">DEAL FEEDBACK</div>

            <div class="dr-decision-grid">
              <button class="dr-decision is-approve ${DR.State.decision === "approve" ? "is-active-approve" : ""}"
                      data-action="set-decision" data-decision="approve">✅ Approve</button>
              <button class="dr-decision is-reject ${DR.State.decision === "reject" ? "is-active-reject" : ""}"
                      data-action="set-decision" data-decision="reject">⛔ Reject</button>
            </div>

            <div class="dr-label">Review Notes</div>
            <textarea class="dr-textarea" data-action="notes"
              placeholder="Enter feedback notes...">${DR.Util.escapeHtml(DR.State.feedbackNotes)}</textarea>

            <div class="dr-label">Action Required Summary</div>
            <textarea class="dr-textarea dr-textarea-small"
                      data-action="actionSummary"
                      placeholder="If rejecting, list required actions for resubmission. If approving, optional.">${DR.Util.escapeHtml(DR.State.actionRequiredSummary || "")}</textarea>

            <div class="dr-hint">Required for Reject. Optional for Approve.</div>

            <hr class="dr-divider-hr"/>

            <div class="dr-label">Exception Management</div>

            <div class="dr-exception-block">
              <!-- Requested (read-only) -->
              <div class="dr-exception-row">
                <label class="dr-checkbox">
                  <input type="checkbox"
                        ${DR.State.dealExceptionRequested ? "checked" : ""}
                        disabled />
                  <span>Exception Requested</span>
                </label>
              </div>

              <!-- Approved (interactive only if requested) -->
              <div class="dr-exception-row">
                <label class="dr-toggle ${DR.State.dealExceptionRequested ? "" : "is-disabled"}">
                  <input type="checkbox"
                        data-action="exceptionApproved"
                        ${DR.State.dealExceptionApproved === "yes" ? "checked" : ""}
                        ${DR.State.dealExceptionRequested ? "" : "disabled"} />
                  <span>Exception Approved</span>
                </label>
              </div>
            </div>

            <hr class="dr-divider-hr"/>

            <button class="dr-submit ${DR.State.decision === "approve" ? "approve" : DR.State.decision === "reject" ? "reject" : ""}"
                    data-action="submit"
                    ${DR.State.loading.submit || !DR.State.decision ? "disabled" : ""}>
              ${DR.State.decision === "approve" ? "Submit Approval" : DR.State.decision === "reject" ? "Submit Rejection" : "Select Decision Above"}
            </button>

            <hr class="dr-divider-hr"/>
            <div class="dr-sectionlabel" style="margin-bottom:10px;">REVIEW HISTORY</div>
            ${latestHtml}
          </div>
        </div>
      `;
    }

    function renderDocuments() {
      if (DR.State.loading.detail) {
        return `<div class="dr-muted" style="font-size:13px;">Loading documents…</div>`;
      }

      const docs = DR.State.documents || [];

      return `
        <div class="dr-docbox">
          <div class="dr-doclist">
            <div class="dr-doctitle">Available Documents</div>

            ${docs.length === 0 ? `<div class="dr-muted" style="font-size:13px;">No documents found.</div>` : ""}

            ${docs.map((doc) => {
        const name = DR.Util.pick(doc, ["name", "title", "Title", "fileName", "FileName"], "Document");
        const url = DR.Util.pick(doc, ["fileUrl", "url", "FileRef", "Link", "link"], "");
        const size = DR.Util.pick(doc, ["size", "Size", "bytes"], null);
        const lm = DR.Util.pick(doc, ["lastModified", "LastModified", "modified", "Modified"], "");

        const type = docTypeFromName(name, url);
        const icon = docIconGlyph(type);

        const sizeText = size ? fmtBytes(size) : "";
        const dateText = lm ? `Updated ${fmtDateShort(lm)}` : "";
        const rightMeta = [sizeText, dateText].filter(Boolean).join(" • ");
        const openLabel = url ? "Open" : "No link";

        return `
                <button class="dr-docbtn" data-action="open-doc" data-url="${DR.Util.escapeAttr(url)}">
                  <span class="dr-docicon" aria-hidden="true">${DR.Util.escapeHtml(icon)}</span>
                  <p class="name">${DR.Util.escapeHtml(name)}</p>
                  <p class="meta">${DR.Util.escapeHtml(openLabel)}</p>
                  ${rightMeta ? `<span class="dr-docmeta">${DR.Util.escapeHtml(rightMeta)}</span>` : ``}
                </button>
              `;
      }).join("")}

            <div class="dr-dochelp">
              Click a document above to view it
              <small>(Phase 1: links only. Embedded viewer later.)</small>
            </div>
          </div>
        </div>
      `;
    }

    function wireEvents() {
      const root = getRoot();
      if (!root) return;

      root.querySelectorAll("[data-action]").forEach((node) => {
        const action = node.getAttribute("data-action");
        node.addEventListener("click", async () => {
          try {
            if (action === "back") {
              window.location.href = DR.Config.pages.dashboardPath || "/";
              return;
            }
            if (action === "select-deal") {
              const dealId = node.getAttribute("data-dealid");
              await DR.App.selectDeal(dealId);
              return;
            }
            if (action === "set-decision") {
              DR.State.decision = node.getAttribute("data-decision");
              DR.State.error = null;
              render();
              return;
            }
            if (action === "open-doc") {
              const url = node.getAttribute("data-url");
              if (url) window.open(url, "_blank", "noopener,noreferrer");
              return;
            }
            if (action === "refresh") {
              if (DR.State.selectedDealId) await DR.App.selectDeal(DR.State.selectedDealId, { preserveDecision: true });
              return;
            }
            if (action === "submit") {
              await DR.App.submitDecision();
              return;
            }
          } catch (e) {
            DR.State.error = e?.message || String(e);
            render();
          }
        });
      });

      const ta = root.querySelector('textarea[data-action="notes"]');
      if (ta) {
        ta.addEventListener("input", () => {
          DR.State.feedbackNotes = ta.value;
        });
      }
      const ta2 = root.querySelector('textarea[data-action="actionSummary"]');
      if (ta2) {
        ta2.addEventListener("input", () => {
          DR.State.actionRequiredSummary = ta2.value;
        });
      }
      const exToggle = root.querySelector('input[data-action="exceptionApproved"]');
      if (exToggle) {
        exToggle.addEventListener("change", () => {
          DR.State.dealExceptionApproved = exToggle.checked ? "yes" : "no";
        });
      }
    }

    return { render };
  })();


  // -----------------------------
  // App Orchestration
  // -----------------------------
  DR.App = {
    async loadToday() {
      DR.State.loading.deals = true;
      DR.State.error = null;

      DR.UI.render();

      const meetingDate = DR.State.todayISO;
      const data = await DR.Api.getToday(meetingDate);
      DR.State.deals = Array.isArray(data) ? data : (data?.value || data?.items || []);
      DR.State.loading.deals = false;

      if (DR.State.deals.length > 0) {
        const firstId = DR.Util.pick(DR.State.deals[0], ["dealID", "dealId", "DealId", "ID", "Id", "id"]);
        await DR.App.selectDeal(firstId);
      } else {
        DR.State.selectedDealId = null;
        DR.State.selectedDeal = null;
        DR.UI.render();
      }
    },

    async selectDeal(dealId, opts = {}) {
      DR.State.selectedDealId = dealId;
      DR.State.selectedDeal =
        DR.State.deals.find((d) => String(DR.Util.pick(d, ["dealID", "dealId", "DealId", "ID", "Id", "id"])) === String(dealId)) || null;

      DR.State.documents = [];
      DR.State.latestNote = null;
      if (!opts.preserveDecision) {
        DR.State.decision = null;
        DR.State.feedbackNotes = "";
        DR.State.actionRequiredSummary = "";
      }
      DR.State.error = null;

      DR.State.loading.detail = true;
      DR.UI.render();

      const numericDealId = Number(dealId);

      const [docs, note] = await Promise.all([
        DR.Api.getDocs(numericDealId).catch(() => []),
        DR.Api.getLatestNote(numericDealId).catch(() => null),
      ]);

      DR.State.documents = Array.isArray(docs) ? docs : (docs?.value || docs?.items || []);
      DR.State.latestNote = note && typeof note === "object" ? note : null;

      DR.State.loading.detail = false;
      DR.UI.render();
    },

    async submitDecision() {
      if (!DR.State.selectedDealId) throw new Error("No deal selected.");
      if (!DR.State.decision) throw new Error("Select Approve or Reject first.");

      const dealId = Number(DR.State.selectedDealId);
      const decision = DR.State.decision === "approve" ? "Approve" : "Reject";

      if (decision === "Reject" && !String(DR.State.actionRequiredSummary || "").trim()) {
        throw new Error("Action Required Summary is required when rejecting.");
      }

      DR.State.loading.submit = true;
      DR.State.error = null;
      DR.UI.render();

      try {
        const payload = {
          dealId: Number(DR.State.selectedDealId),
          decision: DR.State.decision === "approve" ? "Approve" : "Reject",
          notes: DR.State.feedbackNotes,
          actionRequiredSummary: DR.State.actionRequiredSummary,
          dealExceptionApproved: DR.State.dealExceptionApproved
        };

        // Act: Execute the direct write
        const success = await DR.Api.submitDecision(payload);

        if (success) {
          // Success: Reset UI state and refresh the deal to show updated status
          DR.State.feedbackNotes = "";
          DR.State.actionRequiredSummary = "";
          await DR.App.selectDeal(DR.State.selectedDealId, { preserveDecision: false });
          console.log("%c✅ TDD VALIDATED: UI updated after direct write.", "color: green;");
        }
      } catch (e) {
        DR.State.error = e?.message || "Submit failed";
        console.error("❌ Submit failed:", e);
      } finally {
        DR.State.loading.submit = false;
        DR.UI.render();
      }
    },

    async boot() {
      const root = document.getElementById("dr-app");
      if (!root) return;

      // Minimal “never blank” initial render
      root.innerHTML = `<div style="padding:16px;font-weight:700;">Loading…</div>`;

      try {
        DR.UI.render();
        await DR.App.loadToday();
      } catch (e) {
        DR.State.loading.deals = false;
        DR.State.loading.detail = false;
        DR.State.loading.submit = false;
        DR.State.error = e?.message || String(e);
        DR.UI.render();
        console.error(e);
      }
    },
  };

  // -----------------------------
  // Start
  // -----------------------------
  document.addEventListener("DOMContentLoaded", DR.App.boot);
})();
