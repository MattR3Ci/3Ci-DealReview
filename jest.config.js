/**
 * jest.config.js
 * Configuration for the Deal Review test suite.
 */

module.exports = {
  // Automatically clear mock calls and instances between every test
  clearMocks: true,

  // Indicates whether the coverage information should be collected while executing the test
  collectCoverage: true,

  // The directory where Jest should output its coverage files
  coverageDirectory: "coverage",

  // An array of glob patterns indicating a set of files for which coverage information should be collected
  collectCoverageFrom: [
    "web-files/*.js",
    "!web-files/*.min.js",
    "!web-files/dealreview-mocks.js"
  ],

  /* 
  // Future: Enforce coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  */

  // A list of paths to modules that run some code to configure or set up the testing framework before each test
  setupFiles: ["./jest.setup.js"],

  // The test environment that will be used for testing
  testEnvironment: "node",

  // Use this configuration to add a custom reporter (like JUnit) in the future
  reporters: [
    "default",
    /* 
    ["jest-junit", { outputDirectory: "reports", outputName: "test-report.xml" }] 
    */
  ]
};
