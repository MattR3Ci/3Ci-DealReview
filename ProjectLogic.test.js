/**
 * ProjectLogic.test.js
 * Unified test suite for the Deal Review project.
 * Target: 75%+ project-wide coverage.
 */

require('./jest.setup.js');

// 1. Load the central logic engine FIRST
require('./web-files/DealReviewLogic.js');

// 2. Load all other modules (proxies)
require('./web-files/SubmissionCalc.js');
require('./web-files/UIComponents.js');
require('./web-files/SubmissionService.js');
require('./web-files/DealService.js');
require('./web-files/DealBoard.js');
require('./web-files/ReviewBoard.js');
require('./web-files/DocumentGovernance.js');
require('./web-files/SubmissionUI.js');
require('./web-files/SubmissionApp.js');
require('./web-files/DealSubmissionAdministration.js');

const logic = global.window.DealReviewLogic;
const F = global.window.SCHEMA.FIELDS.DEALS;

describe('Unified Project Logic', () => {

    describe('DealReviewLogic - Full Coverage', () => {
        test('utils should handle all logic paths', () => {
            expect(logic.utils.safeJsonParse('{"a":1}')).toEqual({a:1});
            expect(logic.utils.safeJsonParse('invalid', 'err')).toBe('err'); 
            const html = '<input name="__RequestVerificationToken" value="abc">';
            expect(logic.utils.extractTokenFromHtml(html)).toBe('abc');
            expect(logic.utils.extractTokenFromHtml('none')).toBeNull();
            expect(logic.utils.formatDate(null)).toBe("Never");
            expect(logic.utils.formatDate("2024-01-01T00:00:00Z")).toContain("2024");
            expect(logic.utils.getDaysAgo(null)).toBe(0);
            expect(() => logic.utils.validateConfig(null)).toThrow();
        });

        test('calculations should validate all sections', () => {
            const data = { [F.TITLE]: "T", [F.CLIENT_TEXT]: "C", [F.VALUE]: 100, [F.TYPE]: 1, [F.START_DATE]: "D", [F.SALES_LEADER]: "S", [F.ACCOUNTABLE_EXEC]: "E", [F.SF_LINK]: "salesforce.com" };
            const res = logic.calculations.getSectionStatuses(data, [{id:1}]);
            expect(res.basics).toBe(true);
            expect(res.documents).toBe(true);
            expect(logic.calculations.getGlobalProgress(data).percent).toBeGreaterThan(0);
            expect(logic.calculations.countRemainingFields({})).toBeGreaterThan(0);
            expect(logic.calculations.calculateGlobalRisk({})).toBe("LOW");
        });

        test('ui builders should return themed html', () => {
            expect(logic.ui.fieldWrapper("L", "I", true)).toContain("*");
            expect(logic.ui.formatCurrency(100)).toBe("$100.00");
            expect(logic.ui.statusBadge(0)).toContain("badge");
            expect(logic.ui.readinessStyles(95).bg).toBe('#D1F0D8');
            expect(logic.ui.readinessStyles(50).bg).toBe('#FEE2E2');
            expect(logic.ui.renderDealCard({name:'N'})).toContain('N');
        });

        test('governance should match files', () => {
            expect(logic.governance.isFileMatch({name:'_sow_'}, 'sow')).toBe(true);
            expect(logic.governance.formatFileSize(1024)).toBe("1.0 KB");
            expect(logic.governance.sortFilesByDate([])).toEqual([]);
        });

        test('mappers should transform deals', () => {
            const raw = { [F.DEALID]: "1", [F.TITLE]: "T", [F.STATUS]: 0 };
            const mapped = logic.mappers.mapRawDealToUI(raw);
            expect(mapped.guid).toBe("1");
            expect(logic.mappers.filterAndSortDeals([{name:'A'}], 'A', 'value-desc').length).toBe(1);
        });
    });

    describe('Integration Proxies', () => {
        test('Proxies should delegate correctly', async () => {
            expect(window.SubmissionCalc._isFieldFilled({[F.TITLE]:"T"}, F.TITLE)).toBe(true);
            expect(await window.SubmissionService.loadClients()).toEqual([]);
            expect(await window.DealService.getCsrfToken()).toBe("tok");
        });
    });
});
