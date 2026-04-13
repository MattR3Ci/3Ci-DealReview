/**
 * UIComponents.test.js
 * Unit tests for shared UI components.
 */

require('./jest.setup.js');

// Mock DOC_CATEGORIES since SubmissionCalc tests might have used a simpler mock
global.window.SCHEMA.DOC_CATEGORIES = {
    SOW: { id: 'sow', name: 'Statement of Work', required: true },
    MSA: { id: 'msa', name: 'Master Service Agreement', required: false },
    PRICING: { id: 'pricing', name: 'Cost Model', required: true }
};

require('./web-files/UIComponents.js');

const ui = global.window.UIComponents;

describe('UIComponents', () => {

    describe('statusBadge', () => {
        test('should return correct label for each status', () => {
            const S = window.SCHEMA.CHOICES.STATUS;
            expect(ui.statusBadge(S.DRAFT)).toContain('DRAFT');
            expect(ui.statusBadge(S.SUBMITTED)).toContain('SUBMITTED');
            expect(ui.statusBadge(S.APPROVED)).toContain('APPROVED');
            expect(ui.statusBadge(S.REJECTED)).toContain('REJECTED');
        });

        test('should fallback to DRAFT for unknown status', () => {
            expect(ui.statusBadge(999)).toContain('DRAFT');
        });
    });

    describe('readinessStyles', () => {
        test('should return success green for score >= 90', () => {
            const styles = ui.readinessStyles(95);
            expect(styles.bg).toBe('#D1F0D8');
            expect(styles.text).toBe('#1E7E34');
        });

        test('should return warning orange for score between 75 and 89', () => {
            const styles = ui.readinessStyles(80);
            expect(styles.bg).toBe('#FEF3C7');
            expect(styles.text).toBe('#B45309');
        });

        test('should return error red for score < 75', () => {
            const styles = ui.readinessStyles(50);
            expect(styles.bg).toBe('#FEE2E2');
            expect(styles.text).toBe('#B91C1C');
        });
    });

    describe('documentProgress', () => {
        test('should report 0/2 when no docs are provided', () => {
            const result = ui.documentProgress([]);
            expect(result.count).toBe('0/2');
            expect(result.percent).toBe(0);
            expect(result.isComplete).toBe(false);
            expect(result.missingHtml).toContain('Missing: Statement of Work');
            expect(result.missingHtml).toContain('Missing: Cost Model');
        });

        test('should identify matches by ID', () => {
            const docs = [{ category: 'sow' }];
            const result = ui.documentProgress(docs);
            expect(result.count).toBe('1/2');
            expect(result.percent).toBe(50);
        });

        test('should identify matches by fallback display name', () => {
            const docs = [{ category: 'statement of work' }];
            const result = ui.documentProgress(docs);
            expect(result.count).toBe('1/2');
        });

        test('should report complete when all required categories are met', () => {
            const docs = [
                { category: 'sow' },
                { category: 'pricing' }
            ];
            const result = ui.documentProgress(docs);
            expect(result.isComplete).toBe(true);
            expect(result.percent).toBe(100);
            expect(result.missingHtml).toContain('All required documents uploaded');
        });

        test('should handle edge case of 0 required categories', () => {
            const original = window.SCHEMA.DOC_CATEGORIES;
            window.SCHEMA.DOC_CATEGORIES = {
                TEST: { id: 'test', name: 'Test', required: false }
            };
            
            const result = ui.documentProgress([]);
            expect(result.percent).toBe(100);
            expect(result.isComplete).toBe(true);
            
            window.SCHEMA.DOC_CATEGORIES = original;
        });
    });
});
