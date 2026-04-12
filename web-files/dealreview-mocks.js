window.DR_MOCKS = {
  todayDeals: [
    {
      dealId: 1012,
      dealName: "Ameris Bank – Platform Modernization",
      customer: "Ameris Bank",
      meetingDate: "2026-02-13",
      meetingEntryId: 55501,
      contractValue: 250000,
      estimatedMargin: "37%",
      commercialModel: "Fixed Fee",
      submittedBy: "Matt Ranlett",
      submittedOn: "02-12-2026",
      status: "Ready for Review"
    },
    {
      dealId: 1013,
      dealName: "Southeast Health – Data Pipeline Upgrade",
      customer: "Southeast Health",
      meetingDate: "2026-02-13",
      meetingEntryId: 55502,
      contractValue: 120000,
      estimatedMargin: "44%",
      commercialModel: "T&M",
      submittedBy: "Martha Churchill",
      submittedOn: "02-11-2026",
      status: "Ready for Review"
    }
  ],

  docsByDealId: {
    1012: [
      { name: "SOW.pdf", url: "https://example.com/sow.pdf", size: 2400000, lastModified: "02-11-2026" },
      { name: "MSA.pdf", url: "https://example.com/msa.pdf", size: 4360000, lastModified: "01-13-2026" },
      { name: "Estimator Cost Model", url: "https://3ci-estimator.powerappsportals.com/?estimateId=1d0c8fc5-38fc-f011-8406-6045bd091617", lastModified: "01-13-2026" }
    ],
    1013: [
      { name: "SOW.pdf", url: "https://example.com/sow.pdf", size: 3100000, lastModified: "02-11-2026" },
      { name: "Estimator Cost Model", url: "https://3ci-estimator.powerappsportals.com/?estimateId=1d0c8fc5-38fc-f011-8406-6045bd091617", lastModified: "01-13-2026" },
      { name: "Proposal.pdf", url: "https://example.com/proposal.pdf", size: 8900000, lastModified: "02-11-2026" }
    ]
  },

  latestNoteByDealId: {
    1012: { decision: "Approve", notes: "Solid margin, low risk.", date: "2026-02-01" },
    1013: { decision: "Reject", notes: "Missing security addendum.", date: "2026-02-03" }
  },

  // ✅ correct object method syntax
  submitDecision: async function (payload) {
    console.log("[MOCK] submitDecision", payload);

    // Optional: update "latest note" so the UI reflects the submission immediately
    const dealId = Number(payload.dealId);
    window.DR_MOCKS.latestNoteByDealId[dealId] = {
      decision: payload.decision,
      notes: payload.notes || "",
      actionRequiredSummary: payload.actionRequiredSummary || "",
      date: payload.decisionDate || new Date().toISOString().slice(0, 10)
    };

    return { ok: true, noteId: "mock-note-1" };
  }
};
