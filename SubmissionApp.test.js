/**
 * SubmissionApp.test.js
 * Unit tests for the Submission App lifecycle and orchestration.
 */

require('./jest.setup.js');

// Mock quill before requiring
global.Quill = jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    disable: jest.fn(),
    root: { innerHTML: "" }
}));

require('./web-files/SubmissionCalc.js');
require('./web-files/SubmissionApp.js');

const app = global.window.SubmissionApp;
const service = global.window.SubmissionService;
const ui = global.window.SubmissionUI;

describe('SubmissionApp', () => {

    beforeEach(() => {
        jest.useFakeTimers();
        jest.clearAllMocks();
        app.setupInitialState();
        
        global.window.SecurityUtils = {
            checkLoginStatus: jest.fn().mockReturnValue(true),
            showLoginModal: jest.fn()
        };
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    describe('init', () => {
        test('should initialize state correctly', () => {
            app.setupInitialState();
            const F = window.SCHEMA.FIELDS.DEALS;
            expect(app.state.activeSection).toBe('basics');
            expect(app.state.dealData[F.TITLE]).toBe("");
        });

        test('should call services on init', async () => {
            const initPromise = app.init();
            jest.advanceTimersByTime(600);
            await initPromise;

            expect(service.loadGlobalSettings).toHaveBeenCalled();
            expect(service.loadClients).toHaveBeenCalled();
        });
    });

    describe('updateHeaderMetrics', () => {
        test('should update UI based on calculation results', () => {
            app.state.dealData = { [window.SCHEMA.FIELDS.DEALS.TITLE]: "Test" };
            window.SubmissionCalc.getGlobalProgress = jest.fn().mockReturnValue({
                percent: 100, remaining: 0, isComplete: true
            });

            app.updateHeaderMetrics();
            expect(window.$('.progress-block').addClass).toHaveBeenCalledWith('is-complete');
        });
    });

    describe('Logic Helpers', () => {
        test('_getRecordLockLabel should return correct label', () => {
            const S = window.SCHEMA.CHOICES.STATUS;
            const F = window.SCHEMA.FIELDS.DEALS;
            
            app.state.dealData = { [F.STATUS]: S.APPROVED };
            expect(app._getRecordLockLabel()).toBe("APPROVED");
            
            app.state.dealData = { [F.STATUS]: S.SUBMITTED };
            expect(app._getRecordLockLabel()).toBe("SUBMITTED");
        });

        test('_isRecordLocked should identify locked states', () => {
            const S = window.SCHEMA.CHOICES.STATUS;
            const F = window.SCHEMA.FIELDS.DEALS;
            
            app.state.dealData = { [F.STATUS]: S.APPROVED };
            expect(app._isRecordLocked()).toBe(true);
            
            app.state.dealData = { [F.STATUS]: S.DRAFT };
            expect(app._isRecordLocked()).toBe(false);
        });

        test('_canSubmit should validate all sections', () => {
            const sections = { basics: true, commercial: true, dates: true, roles: true, salesforce: true };
            expect(app._canSubmit(sections, true)).toBe(true);
            expect(app._canSubmit(sections, false)).toBe(false);
            expect(app._canSubmit({ ...sections, basics: false }, true)).toBe(false);
        });

        test('findClientMatch should identify existing clients', () => {
            window.model.clients = [{ [window.SCHEMA.FIELDS.CLIENTS.TITLE]: "Acme" }];
            const result = app.findClientMatch("acme ");
            expect(result.match).toBeDefined();
        });

        test('getPendingDocs should filter correctly', () => {
            app.state.uploadedDocs = [
                { status: 'Uploaded', healthScore: 'Pending', isExternalLink: false, id: '1' },
                { status: 'Missing', healthScore: 'Pending', isExternalLink: false, id: '2' }
            ];
            const pending = app.getPendingDocs();
            expect(pending.length).toBe(1);
            expect(pending[0].id).toBe('1');
        });
    });

    describe('Save Workflow', () => {
        test('_executeSaveWorkflow should handle new records', async () => {
            app.state.isNewRecord = true;
            service.saveDraft.mockResolvedValue({ success: true, id: 'new-id' });

            await app._executeSaveWorkflow();

            expect(app.state.recordId).toBe('new-id');
            expect(app.state.isNewRecord).toBe(false);
        });

        test('_executeSaveWorkflow should handle existing records', async () => {
            app.state.recordId = 'existing-123';
            app.state.isNewRecord = false;
            service.patchDeal.mockResolvedValue(true);

            await app._executeSaveWorkflow();

            expect(service.patchDeal).toHaveBeenCalledWith('existing-123', expect.anything());
        });
    });
});
