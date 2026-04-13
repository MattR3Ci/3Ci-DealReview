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
            // Mock token success via shell
            const deferred = window.shell.getTokenDeferred();
            window.shell.getTokenDeferred.mockReturnValue(deferred);
            deferred.done.mockImplementation((cb) => { cb("fake-token"); return deferred; });

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

    describe('loadClients', () => {
        test('should return value array on success', async () => {
            const mockData = { value: [{ id: 1, title: 'Client A' }] };
            fetch.mockResolvedValue({
                ok: true,
                json: async () => mockData
            });

            const result = await service.loadClients();
            expect(result).toEqual(mockData.value);
        });

        test('should return empty array on failure', async () => {
            fetch.mockResolvedValue({ ok: false });
            const result = await service.loadClients();
            expect(result).toEqual([]);
        });
    });

    describe('addNewClient', () => {
        test('should return new client object on success', async () => {
            const deferred = window.shell.getTokenDeferred();
            window.shell.getTokenDeferred.mockReturnValue(deferred);
            deferred.done.mockImplementation((cb) => { cb("fake-token"); return deferred; });

            fetch.mockResolvedValue({
                ok: true,
                headers: { get: () => "client(123)" },
                json: async () => ({})
            });

            const result = await service.addNewClient("New Client");
            expect(result[window.SCHEMA.FIELDS.CLIENTS.TITLE]).toBe("New Client");
        });

        test('should throw on fetch failure', async () => {
            const deferred = window.shell.getTokenDeferred();
            window.shell.getTokenDeferred.mockReturnValue(deferred);
            deferred.done.mockImplementation((cb) => { cb("fake-token"); return deferred; });

            fetch.mockResolvedValue({ 
                ok: false,
                text: async () => "Forbidden" 
            });
            await expect(service.addNewClient("Fail")).rejects.toThrow();
        });
    });

    describe('getDealById', () => {
        test('should return first record if found', async () => {
            const deferred = window.shell.getTokenDeferred();
            window.shell.getTokenDeferred.mockReturnValue(deferred);
            deferred.done.mockImplementation((cb) => { cb("fake-token"); return deferred; });

            fetch.mockResolvedValue({
                ok: true,
                json: async () => ({ value: [{ id: 'deal-1' }] })
            });

            const result = await service.getDealById("deal-1");
            expect(result.id).toBe('deal-1');
        });

        test('should return null if not found', async () => {
            const deferred = window.shell.getTokenDeferred();
            window.shell.getTokenDeferred.mockReturnValue(deferred);
            deferred.done.mockImplementation((cb) => { cb("fake-token"); return deferred; });

            fetch.mockResolvedValue({
                ok: true,
                json: async () => ({ value: [] })
            });

            const result = await service.getDealById("missing");
            expect(result).toBeNull();
        });

        test('should throw on fetch error', async () => {
            const deferred = window.shell.getTokenDeferred();
            window.shell.getTokenDeferred.mockReturnValue(deferred);
            deferred.done.mockImplementation((cb) => { cb("fake-token"); return deferred; });

            fetch.mockRejectedValue(new Error("Fail"));
            await expect(service.getDealById("error")).rejects.toThrow();
        });
    });

    describe('saveDraft', () => {
        // ... (existing test)
    });

    describe('loadAllDeals', () => {
        test('should return array of deals on success', async () => {
            const mockToken = "fake-token";
            const deferred = window.shell.getTokenDeferred();
            window.shell.getTokenDeferred.mockReturnValue(deferred);
            deferred.done.mockImplementation((cb) => { cb(mockToken); return deferred; });

            fetch.mockResolvedValue({
                ok: true,
                json: async () => ({ value: [{ [window.SCHEMA.FIELDS.DEALS.TITLE]: 'Deal 1' }] })
            });

            const result = await service.loadAllDeals();
            expect(result.length).toBe(1);
            expect(result[0][window.SCHEMA.FIELDS.DEALS.TITLE]).toBe('Deal 1');
        });
    });

    describe('loadDocumentsViaFlow', () => {
        test('should return mapped documents on success', async () => {
            const mockRaw = [{ fileName: "Test.pdf", spId: "sp-1", url: "http://test" }];
            fetch.mockResolvedValue({
                ok: true,
                json: async () => mockRaw
            });

            const result = await service.loadDocumentsViaFlow("deal-id");
            expect(result.length).toBe(1);
            expect(result[0].id).toBe("sp-1");
        });

        test('should handle string body results', async () => {
            fetch.mockResolvedValue({
                ok: true,
                json: async () => ({ body: JSON.stringify([{ fileName: "Test.pdf" }]) })
            });
            const result = await service.loadDocumentsViaFlow("deal-id");
            expect(result.length).toBe(1);
        });
    });

    describe('loadFileHistory', () => {
        test('should return formatted history on success', async () => {
            const mockHistory = [{
                VersionLabel: "1.0",
                VersionId: 1,
                Created: "2024-01-01T10:00:00Z",
                Editor: { LookupValue: "User A" }
            }];
            fetch.mockResolvedValue({
                ok: true,
                json: async () => ({ value: mockHistory })
            });

            const result = await service.loadFileHistory("file-123");
            expect(result.length).toBe(1);
            expect(result[0].version).toBe("1.0");
            expect(result[0].modifiedBy).toBe("User A");
        });
    });

    describe('runAIAudit', () => {
        test('should return true on success', async () => {
            fetch.mockResolvedValue({ ok: true });
            const result = await service.runAIAudit("file-1", "deal-1");
            expect(result).toBe(true);
        });
    });

    describe('saveRepComment', () => {
        test('should return true on success', async () => {
            fetch.mockResolvedValue({ ok: true });
            const result = await service.saveRepComment("file-1", "Note");
            expect(result).toBe(true);
        });
    });

    describe('uploadDocument', () => {
        test('should convert file to base64 and POST to flow', async () => {
            fetch.mockResolvedValue({ ok: true });
            const file = { name: "test.pdf" };
            const metadata = { title: "Test", category: "sow" };
            
            const result = await service.uploadDocument(file, metadata);
            expect(result).toBe(true);
            expect(fetch).toHaveBeenCalledWith(
                window.SCHEMA.ENDPOINTS.UPLOAD_DOCUMENT,
                expect.objectContaining({ method: "POST" })
            );
        });

        test('should return false on fetch error', async () => {
            fetch.mockRejectedValue(new Error("Network Error"));
            const result = await service.uploadDocument({ name: "t.pdf" }, {});
            expect(result).toBe(false);
        });
    });

    describe('saveRepOverrides', () => {
        test('should return true when no overrides provided', async () => {
            const result = await service.saveRepOverrides("file-1", "deal-1", []);
            expect(result).toBe(true);
        });

        test('should call Dataverse for each override and then save comment', async () => {
            const deferred = window.shell.getTokenDeferred();
            window.shell.getTokenDeferred.mockReturnValue(deferred);
            deferred.done.mockImplementation((cb) => { cb("fake-token"); return deferred; });

            fetch.mockResolvedValue({ ok: true });
            
            const overrides = [
                { standardName: "Std 1", justification: "Just 1" }
            ];

            const result = await service.saveRepOverrides("file-1", "deal-1", overrides);
            expect(result).toBe(true);
            expect(fetch).toHaveBeenCalledTimes(2);
        });

        test('should return false if Dataverse POST fails', async () => {
            const deferred = window.shell.getTokenDeferred();
            window.shell.getTokenDeferred.mockReturnValue(deferred);
            deferred.done.mockImplementation((cb) => { cb("fake-token"); return deferred; });

            fetch.mockResolvedValue({ ok: false, text: async () => "Error" });
            const result = await service.saveRepOverrides("f", "d", [{ standardName: "S" }]);
            expect(result).toBe(false);
        });
    });

    describe('saveEstimatorLink', () => {
        test('should POST link payload to flow', async () => {
            fetch.mockResolvedValue({ ok: true });
            const result = await service.saveEstimatorLink("deal-1", "cat-1", "http://link", "Estimator");
            expect(result).toBe(true);
        });
    });

    describe('deleteDocument', () => {
        test('should POST fileId to delete flow', async () => {
            fetch.mockResolvedValue({ ok: true });
            const result = await service.deleteDocument("file-123");
            expect(result).toBe(true);
        });
    });

    describe('_buildUrl', () => {
        test('should build URL without ID', () => {
            const url = service._buildUrl("deals");
            expect(url).toBe("/_api/deals");
        });

        test('should build URL with ID', () => {
            const url = service._buildUrl("deals", "123");
            expect(url).toBe("/_api/deals(123)");
        });
    });

    describe('downloadHistoryVersion', () => {
        test('should call window.open with correct URL', () => {
            window.open = jest.fn();
            service.downloadHistoryVersion("ref", "1.0", "file.pdf");
            expect(window.open).toHaveBeenCalledWith(
                expect.stringContaining("VersionNo=1.0"),
                '_blank'
            );
        });
    });

    describe('runAIAudit', () => {
        test('should return true if no flowUrl exists (legacy support)', async () => {
            const original = window.SCHEMA.ENDPOINTS.RUN_AI_AUDIT;
            window.SCHEMA.ENDPOINTS.RUN_AI_AUDIT = null;
            const result = await service.runAIAudit("f", "d");
            expect(result).toBe(true);
            window.SCHEMA.ENDPOINTS.RUN_AI_AUDIT = original;
        });

        test('should return false if fetch fails', async () => {
            fetch.mockRejectedValue(new Error("Flow failed"));
            const result = await service.runAIAudit("f", "d");
            expect(result).toBe(false);
        });
    });

    describe('_getHeaders', () => {
        test('should include __RequestVerificationToken', async () => {
            const deferred = {
                done: jest.fn().mockImplementation((cb) => { cb("my-token"); return deferred; }),
                fail: jest.fn().mockReturnThis()
            };
            const spy = jest.spyOn(window.shell, 'getTokenDeferred').mockReturnValue(deferred);

            const headers = await service._getHeaders();
            expect(headers['__RequestVerificationToken']).toBe("my-token");
            spy.mockRestore();
        });

        test('should reject if shell fails', async () => {
            const deferred = {
                done: jest.fn().mockReturnThis(),
                fail: jest.fn().mockImplementation((cb) => { cb("Fail"); return deferred; })
            };
            const spy = jest.spyOn(window.shell, 'getTokenDeferred').mockReturnValue(deferred);

            await expect(service._getHeaders()).rejects.toBe("Fail");
            spy.mockRestore();
        });

        test('should return empty token if shell is missing', async () => {
            const originalShell = window.shell;
            delete window.shell;
            
            const headers = await service._getHeaders();
            expect(headers['__RequestVerificationToken']).toBe("");
            
            window.shell = originalShell;
        });
    });
});
