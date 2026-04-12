/**
 * UIComponents.js
 * Shared presentation components for Deal Board and Submission SPA.
 */
(function (window) {

    const UIComponents = {
        /**
         * Unified Status Badge (Matches the clean Board style)
         */
        statusBadge: function (statusCode) {
            const S = window.SCHEMA.CHOICES.STATUS;
            const configs = {
                [S.DRAFT]: { label: 'DRAFT', color: '#64748B', bg: '#F1F5F9' },
                [S.SUBMITTED]: { label: 'SUBMITTED', color: '#2563EB', bg: '#DBEAFE' },
                [S.APPROVED]: { label: 'APPROVED', color: '#1E7E34', bg: '#D1F0D8' },
                [S.REJECTED]: { label: 'REJECTED', color: '#B91C1C', bg: '#FEE2E2' }
            };

            const theme = configs[statusCode] || configs[S.DRAFT];

            return `
            <div class="dr-status-badge" style="
                background: ${theme.bg}; 
                color: ${theme.color};
                padding: 4px 10px;
                border-radius: 4px;
                font-weight: 800;
                font-size: 10px;
                display: inline-flex;
                align-items: center;
                text-transform: uppercase;
                border: 1px solid rgba(0,0,0,0.05);
            ">
                <i class="fa fa-circle mr-2" style="font-size: 6px; opacity: 0.6;"></i>
                ${theme.label}
            </div>
        `;
        },

        /**
         * Unified Readiness Ring Styles
         */
        readinessStyles: function (score) {
            if (score >= 90) return { bg: '#D1F0D8', text: '#1E7E34', border: '#1E7E34' };
            if (score >= 75) return { bg: '#FEF3C7', text: '#B45309', border: '#B45309' };
            return { bg: '#FEE2E2', text: '#B91C1C', border: '#B91C1C' };
        },

        /**
         * Shared Document Progress Component
         * Used in Submission Card and potentially Deal Board tooltips/popovers
         */
        /**
     * Calculates document upload progress strictly based on SCHEMA.DOC_CATEGORIES
     * @param {Array} uploadedDocs - The array of document objects from SharePoint
     * @returns {Object} { count: "1/2", percent: 50, color: "#...", isComplete: false, missingHtml: "..." }
     */
        documentProgress: function (uploadedDocs = []) {
            // 1. Get all categories and filter only the required ones
            const allCats = Object.values(window.SCHEMA.DOC_CATEGORIES);
            const requiredCats = allCats.filter(cat => cat.required);
            const totalRequired = requiredCats.length;

            let completedRequired = 0;
            let missingCatNames = [];

            // 2. Loop through each required category and see if a document exists for it
            requiredCats.forEach(cat => {
                // Check if any uploaded document matches this category ID
                const hasMatch = uploadedDocs.some(doc => {
                    const docCat = (doc.documentCategory || doc.category || "").toLowerCase();

                    // Handle direct ID matches (e.g. 'sow' === 'sow')
                    if (docCat === cat.id.toLowerCase()) return true;

                    // Fallback mapping just in case SharePoint returns the display name instead of the ID
                    const displayToIdMap = {
                        'statement of work': 'sow',
                        'master service agreement': 'msa',
                        'cost model': 'pricing',
                        'supporting material': 'support'
                    };

                    return displayToIdMap[docCat] === cat.id.toLowerCase();
                });

                if (hasMatch) {
                    completedRequired++;
                } else {
                    missingCatNames.push(cat.name);
                }
            });

            // 3. Calculate Math & Formatting
            const isComplete = completedRequired === totalRequired;
            const percent = totalRequired === 0 ? 100 : Math.round((completedRequired / totalRequired) * 100);
            const color = isComplete ? '#1E7E34' : '#B45309'; // Success Green vs Warning Orange

            // 4. Generate the missing list HTML for the Submission Workspace Side Panel
            let missingHtml = '';
            if (isComplete) {
                missingHtml = `<div class="text-sm font-bold" style="color: #1E7E34;"><i class="fa fa-check-circle mr-1"></i> All required documents uploaded.</div>`;
            } else {
                missingHtml = missingCatNames.map(name =>
                    `<span style="background: #FEE2E2; color: #B91C1C; padding: 4px 8px; border-radius: 4px; font-weight: 800; font-size: 10px; margin-right: 8px; display: inline-block; margin-bottom: 8px;">
                        <i class="fa fa-times-circle mr-1"></i> Missing: ${name}
                    </span>`
                ).join('');
            }

            // 5. Return the unified object for both Deal Board and Governance UI to consume
            return {
                count: `${completedRequired}/${totalRequired}`,
                percent: percent,
                color: color,
                isComplete: isComplete,
                missingHtml: missingHtml
            };
        }
    };

    window.UIComponents = UIComponents;
})(window);