# Engineering Architecture: 3Ci Deal Review (Deal Board)

## Overview
The 3Ci Deal Review application is a custom Power Pages solution designed to manage the submission, audit, and approval workflow for new sales deals. It features deep integration with SharePoint for document management and Power Automate for AI-driven contract audits.

## Tech Stack
- **Backend:** Microsoft Dataverse
- **Document Storage:** SharePoint Online
- **Automation:** Power Automate (Flows for AI Audits and Notifications)
- **Frontend:** HTML5, CSS3, jQuery
- **Testing:** Jest (Unit tests for calculation logic)
- **Metadata Management:** Power Platform CLI (PAC)

## Data Model (Dataverse)
The application relies on a custom `ci_` prefix schema. Key tables include:
- `ci_dealses`: The central deal records.
- `ci_clientaccountses`: Client master records.
- `ci_reviewnoteses`: History of reviewer decisions and comments.
- `ci_dr_contractstandardses`: The library of legal/commercial standards used by the AI auditor.
- `ci_dr_globalsettings`: Configuration for margin targets and document requirements.

## Core Logic Components
### 1. Submission Engine (`SubmissionApp.js`)
Orchestrates the multi-step form workflow, including:
- Client lookups and dynamic creation.
- Field-level validation.
- SharePoint workspace provisioning.

### 2. Calculation & Progress Logic (`SubmissionCalc.js`)
Calculates real-time deal readiness based on:
- Required fields.
- Commercial model-specific requirements.
- Document upload status.

### 3. AI Auditor Integration (`SubmissionService.js`)
Triggers Power Automate flows to:
- Scan SharePoint documents using AI.
- Compare contract text against `ci_dr_contractstandardses`.
- Return "Clean," "Warning," or "Critical" health scores to the UI.

## File Structure
- `/web-files`: JavaScript logic modules, CSS themes, and assets.
- `/web-templates`: HTML templates for the Deal Board, Submission Form, and Reviewer Workspace.
- `/web-pages`: Metadata linking content pages to templates.
- `/SubmissionCalc.test.js`: Unit tests for the calculation engine.
- `/jest.setup.js`: Mocking environment for Power Pages tests.
