/**
 * DealBoard.test.js
 * Unit tests for the Deal Board logic.
 */

require('./jest.setup.js');

// Mock SubmissionCalc since DealBoard depends on it for readiness scores
global.window.SubmissionCalc = {
    getGlobalProgress: jest.fn().mockReturnValue({ percent: 75 })
};

// Add missing schema field for modified date
global.window.SCHEMA.FIELDS.DEALS.MODIFIED = "modifiedon";
global.window.SCHEMA.FIELDS.DEALS.RESOURCE_RISK = "ci_resourcerisk";

// Load the script
require('./web-files/DealBoard.js');

const app = global.window.DealBoardApp;

describe('DealBoardApp', () => {

    describe('translateChoice', () => {
        test('should translate status numbers to labels', () => {
            const result = app.translateChoice('RISK_LEVELS', 2);
            expect(result).toBe('High');
        });

        test('should return input value for unknown values if not in schema', () => {
            expect(app.translateChoice('RISK_LEVELS', 99)).toBe(99);
        });
    });

    describe('calculateGlobalRisk', () => {
        const F = window.SCHEMA.FIELDS.DEALS;
        const C = window.SCHEMA.CHOICES.RISK_LEVELS;

        test('should return HIGH if either risk is High', () => {
            expect(app.calculateGlobalRisk({ [F.TECH_RISK]: C.High, [F.RESOURCE_RISK]: C.Low })).toBe('HIGH');
            expect(app.calculateGlobalRisk({ [F.TECH_RISK]: C.Low, [F.RESOURCE_RISK]: C.High })).toBe('HIGH');
        });

        test('should return MEDIUM if either is Medium and none are High', () => {
            expect(app.calculateGlobalRisk({ [F.TECH_RISK]: C.Medium, [F.RESOURCE_RISK]: C.Low })).toBe('MEDIUM');
        });

        test('should return LOW if both are Low', () => {
            expect(app.calculateGlobalRisk({ [F.TECH_RISK]: C.Low, [F.RESOURCE_RISK]: C.Low })).toBe('LOW');
        });
    });

    describe('mapRawDealToState', () => {
        test('should map Dataverse fields to UI state correctly', () => {
            const F = window.SCHEMA.FIELDS.DEALS;
            const raw = {
                [F.DEALID]: "guid-1",
                [F.TITLE]: "Project-123",
                [F.VALUE]: 500000,
                [F.STATUS]: 0,
                [F.EXTERNALKEY]: "sp-1",
                [F.SALES_LEADER]: "matt@3ci.tech",
                [F.MODIFIED]: "2024-01-01T10:00:00Z"
            };

            const mapped = app.mapRawDealToState(raw);
            expect(mapped.guid).toBe("guid-1");
            expect(mapped.id).toBe("123");
            expect(mapped.name).toBe("Project-123");
            expect(mapped.totalValue).toBe(500000);
            expect(mapped.owner).toBe("matt");
        });
    });

    describe('Filtering and Sorting', () => {
        beforeEach(() => {
            app.state.deals = [
                { guid: '1', name: 'Alpha', clientName: 'A Corp', totalValue: 1000, status: 0, rawSourceData: {} },
                { guid: '2', name: 'Beta', clientName: 'B Corp', totalValue: 5000, status: 1, rawSourceData: {} }
            ];
        });

        test('getFilteredAndSortedDeals should support search', () => {
            app.state.currentSearch = 'Alpha';
            const results = app.getFilteredAndSortedDeals();
            expect(results.length).toBe(1);
            expect(results[0].guid).toBe('1');
        });

        test('getFilteredAndSortedDeals should support value sorting', () => {
            app.state.currentSort = 'value-desc';
            app.state.currentSearch = '';
            const results = app.getFilteredAndSortedDeals();
            expect(results[0].guid).toBe('2'); // Beta (5000) > Alpha (1000)
        });
    });

    describe('calculateMarginBand', () => {
        test('should return premium for pct >= 20', () => {
            expect(app.calculateMarginBand(0.25)).toBe('premium');
        });
    });

    describe('getDaysAgo', () => {
        test('should return 0 for today', () => {
            const today = new Date().toISOString();
            expect(app.getDaysAgo(today)).toBe(0);
        });
    });

    describe('countRemainingFields', () => {
        test('should report 5 missing for an empty deal', () => {
            expect(app.countRemainingFields({})).toBe(5);
        });
    });
});
