/**
 * DealService.test.js
 * Unit tests for the Virtual Table service layer.
 */

require('./jest.setup.js');

// Ensure fetch is mocked
global.fetch = jest.fn();

// Load the script
require('./web-files/DealService.js');

const service = global.window.DealService;

describe('DealService', () => {

    beforeEach(() => {
        jest.clearAllMocks();
        fetch.mockClear();
    });

    describe('getCsrfToken', () => {
        test('should resolve with token when shell succeeds', async () => {
            const mockToken = "fake-token-123";
            const deferred = {
                done: jest.fn().mockImplementation((cb) => { cb(mockToken); return deferred; }),
                fail: jest.fn().mockReturnThis()
            };
            window.shell.getTokenDeferred.mockReturnValue(deferred);

            const token = await service.getCsrfToken();
            expect(token).toBe(mockToken);
        });

        test('should reject when shell fails', async () => {
            const deferred = {
                done: jest.fn().mockReturnThis(),
                fail: jest.fn().mockImplementation((cb) => { cb("Error"); return deferred; })
            };
            window.shell.getTokenDeferred.mockReturnValue(deferred);

            await expect(service.getCsrfToken()).rejects.toBe("Error");
        });
    });

    describe('updateDeal', () => {
        test('should return true on successful PATCH', async () => {
            // Mock token success
            const deferred = {
                done: jest.fn().mockImplementation((cb) => { cb("tok"); return deferred; }),
                fail: jest.fn().mockReturnThis()
            };
            window.shell.getTokenDeferred.mockReturnValue(deferred);

            // Mock fetch success
            fetch.mockResolvedValue({
                ok: true
            });

            const result = await service.updateDeal("123", { status: 1 });
            expect(result).toBe(true);
            expect(fetch).toHaveBeenCalledWith(
                expect.stringContaining("ci_dealses(123)"),
                expect.objectContaining({ method: "PATCH" })
            );
        });

        test('should return false on fetch error', async () => {
            const deferred = {
                done: jest.fn().mockImplementation((cb) => { cb("tok"); return deferred; }),
                fail: jest.fn().mockReturnThis()
            };
            window.shell.getTokenDeferred.mockReturnValue(deferred);

            fetch.mockResolvedValue({
                ok: false,
                status: 500,
                statusText: "Internal Server Error",
                json: async () => ({ error: { message: "Failed" } })
            });

            const result = await service.updateDeal("123", {});
            expect(result).toBe(false);
        });
    });
});
