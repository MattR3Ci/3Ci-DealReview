// DealService.js - Direct Virtual Table Access via Portal Shell

const DealService = {
    // Verified EntitySet name from your successful 200 OK GET test
    entityName: "ci_dealses",

    /**
     * 
     * Uses the native Power Pages shell to acquire a security token.
     * Matches the reliable promise-based pattern from your other apps.
     */
    // Ensure this part of DealService.js is exactly as follows:
    async getCsrfToken() {
        return new Promise((resolve, reject) => {
            if (!window.shell) reject("Portal shell not found");
            window.shell.getTokenDeferred()
                .done(token => {
                    console.log("🎟️ Fresh Token Acquired via Shell");
                    resolve(token);
                })
                .fail(err => {
                    console.error("🎟️ Shell Token Failure", err);
                    reject(err);
                });
        });
    },

    /**
     * 
     * Performs a direct PATCH to the SharePoint Virtual Table.
     * @param {string|number} id - The ci_externalprimarykey (SharePoint ID).
     * @param {object} data - The column updates (e.g., { ci_status: 0 }).
     * 
     */
    async updateDeal(id, data) {
        try {
            // 1. Acquire the token from the shell
            const token = await this.getCsrfToken();

            // 2. Execute the direct Web API call with required backticks
            const response = await fetch(`/_api/${this.entityName}(${id})`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "__RequestVerificationToken": token,
                    "If-Match": "*" // Required for Virtual Table concurrency
                },
                body: JSON.stringify(data)
            });

            // 3. Handle response status
            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                const msg = error.error?.message || response.statusText;
                // Added missing backticks here
                console.error(`❌ Update failed(${response.status}): ${msg}`);
                return false;
            }

            // Added missing backticks here
            console.log(`%c✅ TDD Success: Record ${id} updated in SharePoint.`, "color: green; font-weight: bold;");
            return true;
        } catch (err) {
            console.error("❌ DealService Error:", err.message);
            return false;
        }
    }
};

// Immediate status check on load
console.log("🛠️ DealService Loaded. Shell detection:", !!window.shell ? "✅ Ready" : "❌ Not Found");