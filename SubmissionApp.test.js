/**
 * SubmissionApp.test.js
 * Unit tests for the Submission App lifecycle and orchestration.
 */

require('./jest.setup.js');

// Load dependent logic first
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
        
        // Re-mock SecurityUtils because the file might have overwritten it
        global.window.SecurityUtils = {
            checkLoginStatus: jest.fn().mockReturnValue(true),
            showLoginModal: jest.fn()
        };
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    describe('init', () => {
        test('should initialize state and render skeletons', async () => {
            app.setupInitialState();
            
            const F = window.SCHEMA.FIELDS.DEALS;
            expect(app.state.activeSection).toBe('basics');
            expect(app.state.dealData[F.TITLE]).toBe("");
        });

        test('should call services on init', async () => {
            // Start init
            const initPromise = app.init();

            // Fast-forward the 500ms timeout
            jest.advanceTimersByTime(600);

            await initPromise;

            expect(service.loadGlobalSettings).toHaveBeenCalled();
            expect(service.loadClients).toHaveBeenCalled();
        });
    });

    describe('updateHeaderMetrics', () => {
        test('should update UI based on calculation results', () => {
            // Set data to 100% complete
            app.state.dealData = { [window.SCHEMA.FIELDS.DEALS.TITLE]: "Complete Deal" };
            
            // Mock Calc to return 100%
            window.SubmissionCalc.getGlobalProgress = jest.fn().mockReturnValue({
                percent: 100,
                remaining: 0,
                isComplete: true
            });

            app.updateHeaderMetrics();

            // Verify UI was updated
            expect(window.$('.progress-block').addClass).toHaveBeenCalledWith('is-complete');
        });
    });
});
