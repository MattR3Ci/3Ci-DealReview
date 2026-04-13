/**
 * SubmissionService.test.js
 * Regression tests for the Deal Review API layer.
 */

require('./jest.setup.js');

// Mock the global fetch function
global.fetch = jest.fn();

require('./web-files/SubmissionService.js');

const service = window.SubmissionService;

describe('SubmissionService', () => {

    beforeEach(() => {
        fetch.mockClear();
    });

    describe('mapFlowToState', () => {
        test('should correctly handle .url external links', () => {
            const raw = [{
                fileName: "ProjectPlan.url",
                spId: "123",
                url: "https://sharepoint.com/site/plan"
            }];

            const result = service.mapFlowToState(raw);
            expect(result[0].name).toBe("ProjectPlan");
            expect(result[0].isExternalLink).toBe(true);
        });

        test('should append .docx if extension is missing', () => {
            const raw = [{ fileName: "Contract", spId: "456" }];
            const result = service.mapFlowToState(raw);
            expect(result[0].name).toBe("Contract.docx");
        });

        test('should provide safe fallbacks for null values', () => {
            const raw = [{ fileName: "Test", healthScore: null }];
            const result = service.mapFlowToState(raw);
            expect(result[0].healthScore).toBe("Pending");
        });
    });

    describe('patchDeal', () => {
        test('should convert margin percentage to decimal (30 to 0.30)', async () => {
            // Mock a successful PATCH response
            fetch.mockResolvedValue({
                ok: true,
                json: async () => ({})
            });

            const F = window.SCHEMA.FIELDS.DEALS;
            const data = { [F.MARGIN]: 30 };
            
            await service.patchDeal("fake-id", data);

            // Verify the fetch call had the correctly converted payload
            const lastCallBody = JSON.parse(fetch.mock.calls[0][1].body);
            expect(lastCallBody[F.MARGIN]).toBe(0.30);
        });
    });
});
