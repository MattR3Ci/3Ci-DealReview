/**
 * SubmissionUI.test.js
 * Unit tests for the modular UI engine.
 */

require('./jest.setup.js');

// Add specific schema data needed for UI components
global.window.SCHEMA.CHOICES.MODELS = { "T&M": 0, "Fixed Fee": 1 };
global.window.SCHEMA.CHOICES.BILLING = { "Monthly": 0 };
global.window.SCHEMA.CHOICES.TERMS = { "Net 30": 0 };
global.window.SCHEMA.DOC_CATEGORIES = {
    SOW: { id: 'sow', name: 'SOW', required: true }
};

require('./web-files/SubmissionUI.js');

const ui = global.window.SubmissionUI;

describe('SubmissionUI', () => {

    describe('components', () => {
        test('fieldWrapper should include label and required asterisk', () => {
            const result = ui.components.fieldWrapper("My Label", "<input>", true);
            expect(result).toContain("My Label *");
            expect(result).toContain("<input>");
        });

        test('textInput should escape quotes in value', () => {
            const data = { title: 'Deal "Name"' };
            const result = ui.components.textInput("title", data, "Placeholder");
            expect(result).toContain('value="Deal &quot;Name&quot;"');
        });

        test('formatCurrency should handle null and numbers', () => {
            expect(ui.components.formatCurrency(1000)).toBe("$1,000.00");
            expect(ui.components.formatCurrency(null)).toBe("$0.00");
        });

        test('selectInput should mark current value as selected', () => {
            const data = { type: '1' };
            const choices = { "Type A": 0, "Type B": 1 };
            const result = ui.components.selectInput("type", data, choices);
            expect(result).toContain('value="1" selected');
        });
    });

    describe('templates', () => {
        test('basics template should render expected fields', () => {
            const data = { [window.SCHEMA.FIELDS.DEALS.TITLE]: "Test Deal" };
            const html = ui.templates.basics(data);
            expect(html).toContain('id="ci_title"');
            expect(html).toContain('value="Test Deal"');
        });

        test('commercial template should render dropdowns', () => {
            const html = ui.templates.commercial({});
            expect(html).toContain('id="ci_commercialmodel"');
            expect(html).toContain('id="ci_billingfrequency"');
        });
    });

    describe('documentProgress', () => {
        test('should normalize SharePoint categories and calculate progress', () => {
            const docs = [{ documentCategory: "Statement of Work" }];
            const dealData = { [window.SCHEMA.FIELDS.DEALS.COMMERCIAL_MODEL]: 0 };
            
            // Mock Calc to return SOW as required for model 0
            window.SubmissionCalc = {
                getRequiredDocs: jest.fn().mockReturnValue([{ id: 'sow', name: 'SOW' }])
            };

            const result = window.UIComponents.documentProgress(docs, dealData);
            expect(result.percent).toBe(100);
            expect(result.isComplete).toBe(true);
        });
    });
});
