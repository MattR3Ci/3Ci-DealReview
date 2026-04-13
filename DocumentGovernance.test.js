/**
 * DocumentGovernance.test.js
 * Unit tests for document management logic.
 */

require('./jest.setup.js');

// Load dependent services
global.window.SubmissionService = {
    getDealById: jest.fn(),
    loadDocumentsViaFlow: jest.fn()
};

require('./web-files/DocumentGovernance.js');

const app = global.window.DocumentGovernanceApp;
const ui = global.window.DocumentUI;

describe('DocumentGovernanceApp', () => {

    describe('isMatch', () => {
        test('should match by direct category name', () => {
            const file = { category: 'sow' };
            expect(app.isMatch(file, 'sow')).toBe(true);
        });

        test('should match by display name mapping', () => {
            const file = { documentCategory: 'Cost Model' };
            expect(app.isMatch(file, 'pricing')).toBe(true);
        });

        test('should match by hardcoded fallback in filename', () => {
            const file = { name: 'Deal_MSA_v1.pdf' };
            expect(app.isMatch(file, 'msa')).toBe(true);
        });

        test('should match by dynamic prefix', () => {
            const file = { name: 'PROPOSAL_Alpha.docx' };
            expect(app.isMatch(file, 'proposal_123')).toBe(true);
        });

        test('should return false for no match', () => {
            const file = { name: 'Unknown.txt' };
            expect(app.isMatch(file, 'sow')).toBe(false);
        });
    });

    describe('buildCategorySchema', () => {
        test('should map commercial model 0 to TM rules', () => {
            app.state.commercialModel = 0;
            const matrix = {
                rules: { "MSA": { "TM": "Required" } },
                docTypes: [{ id: "MSA", name: "Master Agreement" }]
            };
            app.state.matrixJSON = JSON.stringify(matrix);
            
            const result = app.buildCategorySchema();
            expect(result[0].id).toBe('msa');
            expect(result[0].required).toBe(true);
        });

        test('should hide categories if rule is Hidden', () => {
            app.state.commercialModel = 2; // FIXED_FEE
            const matrix = {
                rules: { "SOW": { "FIXED_FEE": "Hidden" } },
                docTypes: [{ id: "SOW", name: "SOW" }]
            };
            app.state.matrixJSON = JSON.stringify(matrix);
            
            const result = app.buildCategorySchema();
            // Should fallback to default SOW if everything is hidden
            expect(result.some(c => c.name === 'SOW')).toBe(false);
        });
    });

    describe('autoSelectFile', () => {
        test('should select the newest file by modifiedDate', () => {
            app.state.selectedCategoryId = 'sow';
            app.state.categories = [{
                id: 'sow',
                files: [
                    { id: 'old', uploadedDate: '2024-01-01' },
                    { id: 'new', uploadedDate: '2024-02-01' }
                ]
            }];
            
            app.autoSelectFile();
            expect(app.state.selectedFileId).toBe('new');
        });
    });
});

describe('DocumentUI', () => {
    describe('getStatusUIConfig', () => {
        test('should return correct config for status', () => {
            const S = window.SCHEMA.DOC_STATUS;
            const config = ui.getStatusUIConfig(S.ALIGNED);
            expect(config.label).toBe('Aligned');
            expect(config.icon).toBe('fa-check-circle');
        });
    });
});
