/**
 * ProjectLogic.test.js
 * Unified test suite for the Deal Review project.
 * Target: 75%+ project-wide coverage.
 */

require('./jest.setup.js');

// 1. Load the central logic engine FIRST
require('./web-files/DealReviewLogic.js');

// 2. Load all other modules (delegating to logic)
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
const S = global.window.SCHEMA.CHOICES.STATUS;

describe('Unified Project Logic', () => {

    describe('DealReviewLogic - Utilities', () => {
        test('utils.safeJsonParse should handle invalid JSON', () => {
            expect(logic.utils.safeJsonParse('{"a":1}')).toEqual({a:1});
            expect(logic.utils.safeJsonParse('invalid', 'fallback')).toBe('fallback'); 
        });

        test('utils.extractTokenFromHtml should find token', () => {
            const h = '<input name="__RequestVerificationToken" value="abc">';
            expect(logic.utils.extractTokenFromHtml(h)).toBe('abc');
        });

        test('utils.formatDate should handle UTC', () => {
            expect(logic.utils.formatDate(null)).toBe("Never");
            expect(logic.utils.formatDate("2024-01-01T00:00:00Z")).toContain("Jan 1, 2024");
        });
    });

    describe('DealReviewLogic - UI Templates', () => {
        test('renderDealCard should return HTML', () => {
            const d = { guid: '1', name: 'N', clientName: 'C', totalValue: 100, readinessScore: 100, status: 0 };
            const html = logic.ui.renderDealCard(d);
            expect(html).toContain('N');
            expect(html).toContain('100%');
        });

        test('renderSidebar should reflect active section', () => {
            const html = logic.ui.renderSidebar({}, 'basics');
            expect(html).toContain('is-active');
            expect(html).toContain('Basics');
        });

        test('renderSection should return headers', () => {
            const html = logic.ui.renderSection('basics', {});
            expect(html).toContain('basics');
            expect(html).toContain('ci_title');
        });

        test('governance templates should render', () => {
            const cat = { id: 'sow', name: 'SOW', files: [] };
            const html = logic.governance.renderCategoryButton(cat, 'sow');
            expect(html).toContain('is-active');
            expect(html).toContain('SOW');
        });
    });

    describe('Integration Layer', () => {
        test('SubmissionUI delegates to central UI logic', () => {
            const html = window.SubmissionUI.components.fieldWrapper("Test", "in", false);
            expect(html).toContain("Test");
        });

        test('SubmissionCalc delegates to calculations', () => {
            expect(window.SubmissionCalc._isFieldFilled({ [F.TITLE]: "T" }, F.TITLE)).toBe(true);
        });
    });
});
