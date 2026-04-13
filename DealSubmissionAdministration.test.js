/**
 * DealSubmissionAdministration.test.js
 * Unit tests for the Admin Console logic.
 */

require('./jest.setup.js');

// Mock Chart.js or other globals if needed
global.Chart = jest.fn();

require('./web-files/DealSubmissionAdministration.js');

const app = global.window.AdminApp;

describe('AdminApp', () => {

    describe('_generateStackedChartHtml', () => {
        test('should correctly calculate bar heights', () => {
            const F = window.SCHEMA.FIELDS.DEALS;
            const deals = [
                { [F.TITLE]: "Small", [F.VALUE]: 1000, [F.MARGIN]: 0.4 },
                { [F.TITLE]: "Large", [F.VALUE]: 5000, [F.MARGIN]: 0.2 }
            ];

            const html = app._generateStackedChartHtml(deals);
            
            // Large deal should be 100% height (max value)
            expect(html).toContain('height: 100%');
            // Small deal should be 20% height (1000/5000)
            expect(html).toContain('height: 20%');
            // Check tooltips include formatted money
            expect(html).toContain('$5,000');
        });

        test('should skip zero value deals', () => {
            const deals = [{ [window.SCHEMA.FIELDS.DEALS.VALUE]: 0 }];
            const html = app._generateStackedChartHtml(deals);
            expect(html).toBe('');
        });
    });

    describe('SettingsManager', () => {
        test('addDocumentType should generate valid ID and add to list', () => {
            app.SettingsManager.currentDocTypes = [];
            app.SettingsManager.addDocumentType("Custom Doc");
            
            const added = app.SettingsManager.currentDocTypes[0];
            expect(added.name).toBe("Custom Doc");
            expect(added.id).toContain("CUSTOM_DOC_");
            expect(added.locked).toBe(false);
        });

        test('serializeMatrix should enforce locked statuses', () => {
            // Mock jQuery val/attr calls
            const mockSelect = {
                each: jest.fn().mockImplementation(function(cb) {
                    // Simulate one row
                    const context = {
                        attr: (key) => (key === 'data-doc' ? 'MSA' : 'TM'),
                        val: () => 'Optional'
                    };
                    cb.call(context);
                })
            };
            window.$ = jest.fn((selector) => {
                if (selector === '.matrix-select') return mockSelect;
                return { html: jest.fn(), prop: jest.fn(), css: jest.fn(), val: jest.fn() };
            });

            app.SettingsManager.currentDocTypes = [{ id: 'SOW', name: 'SOW', locked: true }];
            const result = JSON.parse(app.SettingsManager.serializeMatrix());
            
            // Even if UI was 'Optional', SOW is locked and should be 'Required'
            expect(result.rules.SOW.TM).toBe('Required');
        });
    });
});
