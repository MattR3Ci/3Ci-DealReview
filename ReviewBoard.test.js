/**
 * ReviewBoard.test.js
 * Unit tests for the Review Board logic.
 */

require('./jest.setup.js');

// Mock SubmissionCalc since it's used in init and selectDeal
global.window.SubmissionCalc = {
    getGlobalProgress: jest.fn().mockReturnValue({ percent: 85 }),
    getRequiredDocs: jest.fn().mockReturnValue([{ id: 'sow', name: 'SOW' }])
};

require('./web-files/ReviewBoard.js');

const app = global.window.ReviewBoardApp;
const tracker = global.window.ImpactTracker;

describe('ReviewBoardApp', () => {

    beforeEach(() => {
        jest.clearAllMocks();
        app.state.deals = [];
        app.state.selectedDealId = null;
    });

    describe('_calculateMarginBand', () => {
        test('should return target for high margin', () => {
            window.model.globalSettings = { [window.SCHEMA.FIELDS.GLOBAL_SETTINGS.TARGET_MARGIN]: 40 };
            expect(app._calculateMarginBand(0.45)).toBe('target');
        });

        test('should return warning for medium margin', () => {
            window.model.globalSettings = { 
                [window.SCHEMA.FIELDS.GLOBAL_SETTINGS.TARGET_MARGIN]: 40,
                [window.SCHEMA.FIELDS.GLOBAL_SETTINGS.CRITICAL_MARGIN]: 30
            };
            expect(app._calculateMarginBand(0.35)).toBe('warning');
        });

        test('should return critical for low margin', () => {
            window.model.globalSettings = { [window.SCHEMA.FIELDS.GLOBAL_SETTINGS.CRITICAL_MARGIN]: 30 };
            expect(app._calculateMarginBand(0.25)).toBe('critical');
        });
    });

    describe('selectDeal', () => {
        test('should reset state and set active deal', async () => {
            const F = window.SCHEMA.FIELDS.DEALS;
            app.state.deals = [{ [F.DEALID]: '123', [F.EXTERNALKEY]: 'sp-1', readinessScore: 0 }];
            
            // Mock renderDealDetails to avoid jQuery errors in this test
            app.renderDealDetails = jest.fn();
            app.renderTabs = jest.fn();
            
            await app.selectDeal('123');
            
            expect(app.state.selectedDealId).toBe('123');
            expect(app.state.isLoadingDocs).toBe(false);
        });
    });
});

describe('ImpactTracker', () => {
    test('showModal should initialize state', () => {
        document.body.innerHTML = '';
        tracker.showModal('deal-1', 'approve');
        expect(tracker.currentDealId).toBe('deal-1');
        expect(tracker.currentDecision).toBe('approve');
        expect(document.getElementById('dr-impact-modal-container')).not.toBeNull();
    });
});
