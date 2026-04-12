// /dealreview-config.js
window.DR_CONFIG = {
  dataverse: {
    // Verified plural name from successful 204 POST test
    entitySet: "ci_drapirequests", 
    fields: {
      // Primary Key logical name from table metadata
      id: "ci_drapirequestId", 
      name: "ci_crf98_name",
      status: "ci_crf98_status",
      requestType: "ci_crf98_requesttype",
      payload: "ci_crf98_payload",
      response: "ci_crf98_response",
      error: "ci_crf98_error",
      // Additional available fields
      requestedBy: "ci_crf98_requestedby",
      requestedOn: "ci_crf98_requestedon",
      expiresOn: "ci_crf98_expireson"
    }
  },
  choices: {
    status: {
      // Confirmed via Global Choice 'DR API Request Status'
      new: 121500000,
      processing: 121500001,
      done: 121500002,
      error: 121500003
    },
    requestType: {
      // Values matched based on the successful POST payload validation
      getToday: 121500000,
      getDocs: 121500001,
      getLatestNote: 121500002,
      updateDecision: 121500003,
      createNote: 121500004,
      submitDecision: 121500005,
    }
  },
  pages: { dashboardPath: "/dealreview" },
  defaults: { pollTimeoutMs: 60000, pollIntervalMs: 800, locale: "en-US" },
  runtime: { mode: "live" // "mock" | "live" 
  }
};