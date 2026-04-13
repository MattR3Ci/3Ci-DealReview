# 3Ci Deal Review: Deal Board

## Overview
A custom Power Pages application for managing the submission, AI-driven audit, and approval workflow for new sales deals within 3Ci.

## Project Context
The Deal Review application ensures that all new business meets 3Ci's commercial and legal standards. It automates the "Deal Desk" workflow by provisioning SharePoint workspaces and running AI scans on contracts to flag risks before human review.

## Quick Links
- 📘 [**User Guide**](./USER_GUIDE.md): For sales leaders submitting deals.
- 🏗️ [**Architecture & Engineering**](./ARCHITECTURE.md): For developers and system administrators.

## Tech Stack
- **Backend:** Dataverse & SharePoint Online
- **Automation:** Power Automate (AI Audits)
- **Frontend:** jQuery / Custom CSS
- **Testing:** Jest
- **Deployment:** Power Platform CLI (PAC) + GitHub

## Deployment Workflow
This project follows a **"Pro-Dev"** local-first workflow:
1.  Develop locally in the `/Development` folder.
2.  Push changes to GitHub for version control and history.
3.  Upload to the Power Pages environment using the PAC CLI (`Upload Site`).

---
&copy; 2026 3Ci. All rights reserved.
