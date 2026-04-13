/**
 * SubmissionCalc.test.js
 * Unit tests for the Deal Review calculation engine.
 */

// Load the setup (mocking window and SCHEMA)
require('./jest.setup.js');

// Load the actual code we want to test
// Note: In Power Pages, this script usually appends to 'window.SubmissionCalc'.
// Here, we just require it.
require('./web-files/SubmissionCalc.js');

const calc = window.SubmissionCalc;
const F = window.SCHEMA.FIELDS.DEALS;

describe('SubmissionCalc', () => {

    describe('_isFieldFilled', () => {
        test('should return false for empty values', () => {
            expect(calc._isFieldFilled({}, F.TITLE)).toBe(false);
            expect(calc._isFieldFilled({ [F.TITLE]: "" }, F.TITLE)).toBe(false);
            expect(calc._isFieldFilled({ [F.TITLE]: null }, F.TITLE)).toBe(false);
        });

        test('should return true for simple text values', () => {
            expect(calc._isFieldFilled({ [F.TITLE]: "Project Alpha" }, F.TITLE)).toBe(true);
        });

        test('should validate Salesforce links correctly', () => {
            const validSf = "https://mau.lightning.force.com/lightning/r/Opportunity/0068W00001ByXYZ/view";
            const invalidSf = "https://google.com";
            
            expect(calc._isFieldFilled({ [F.SF_LINK]: validSf }, F.SF_LINK)).toBe(true);
            expect(calc._isFieldFilled({ [F.SF_LINK]: invalidSf }, F.SF_LINK)).toBe(false);
        });

        test('should validate numeric values correctly', () => {
            expect(calc._isFieldFilled({ [F.VALUE]: "100" }, F.VALUE)).toBe(true);
            expect(calc._isFieldFilled({ [F.VALUE]: 0 }, F.VALUE)).toBe(false);
            expect(calc._isFieldFilled({ [F.VALUE]: -1 }, F.VALUE)).toBe(false);
        });
    });

    describe('getGlobalProgress', () => {
        test('should return 17 percent for an empty deal (due to hardcoded risk:true)', () => {
            const progress = calc.getGlobalProgress({});
            expect(progress.percent).toBe(17);
            expect(progress.isComplete).toBe(false);
        });

        test('should identify completion correctly', () => {
            // ... (existing test code)
        });

        test('TDD: should require EXCEPTION_REQ if TECH_RISK is High', () => {
            const C = window.SCHEMA.CHOICES;
            const fullData = {
                [F.TITLE]: "Test Deal",
                [F.CLIENT_TEXT]: "Test Client",
                [F.TYPE]: 0,
                [F.VALUE]: 5000,
                [F.COMMERCIAL_MODEL]: 1,
                [F.BILLING_FREQ]: 1,
                [F.PAYMENT_TERMS]: 1,
                [F.START_DATE]: "2024-01-01",
                [F.SALES_LEADER]: "sales@3ci.tech",
                [F.ACCOUNTABLE_EXEC]: "exec@3ci.tech",
                [F.DELIVERY_LEAD]: "lead@3ci.tech",
                [F.SF_LINK]: "https://mau.lightning.force.com/lightning/r/Opportunity/0068W00001ByXYZ/view",
                [F.SF_STAGE]: 1,
                [F.TECH_RISK]: C.RISK_LEVELS.High,
                [F.EXCEPTION_REQ]: false // Missing exception!
            };

            const statuses = calc.getSectionStatuses(fullData);
            // We want 'risk' section to be false if High Risk but no Exception
            expect(statuses.risk).toBe(false);
        });
    });
});
