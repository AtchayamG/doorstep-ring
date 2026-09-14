# Handoff — Task 15 (Project 2, Ring Track: "Doorstep" Phase 0 Feasibility Gate)

**Date:** 2026-09-14  
**Agent:** Antigravity ("agy", Implementation Worker)  
**Workspace:** `D:\Work\Codex\Hackathon Projects\Amazon Developer Hackathon`  
**Project:** `projects/02-ring-doorstep`  

---

## DONE

1. **Workspace Migration & Setup:**
   - Migrated `projects/02-ring-placeholder/README.md` to `projects/02-ring-doorstep/README.md` and updated it with the Project 2 Doorstep overview and Phase 0 status.
   - Deleted `projects/02-ring-placeholder/` directory completely.
   - Initialized git repository in `projects/02-ring-doorstep` (`git init`) and added `LICENSE` (MIT, Copyright (c) 2026 Atchayam G); committed nothing per rule (d).
   - Created clean directory structure: `apps/`, `services/`, `docs/00-research/`, `docs/04-agents/`, and `ops/`.
   - Verified strict isolation: zero modifications made to `projects/01-firetv-narratv` or `projects/03-alexa-mcp`.

2. **Phase 0 Research & Documentation:**
   - Retrieved and analyzed live canonical documentation from:
     - `https://developer.amazon.com/docs/ring/get-started.html`
     - `https://developer.amazon.com/docs/ring/api-documentation.html`
     - `https://developer.amazon.com/docs/ring/release-notes.html`
     - `https://developer.amazon.com/docs/ring/configure.html`
     - `https://developer.amazon.com/docs/ring/develop.html`
     - `https://developer.amazon.com/docs/ring/reports.html`
     - `https://www.aboutamazon.com/news/devices/ring-take-encryption`
     - `https://github.com/AmazonAppDev/ring-api-helloworld`
   - Authored `projects/02-ring-doorstep/docs/00-research/take-and-cv-feasibility.md` answering all five required feasibility questions with **verbatim quotes**, **exact live URLs**, and **retrieval date (2026-09-14)**:
     1. **TAKE Event Payload Data:** Webhooks deliver event type and metadata only (`motion_detected` with `attributes.sub_type`, `button_press`, timestamps, device IDs, account IDs). Webhook payloads carry **no frames, thumbnails, or video**. Under TAKE, cloud video encryption keys are deleted after cloud features run; under optional E2EE, cloud features are disabled.
     2. **Computer Vision / Object Detection Exposure:** Ring does **not** expose raw computer vision results, object coordinates, or bounding boxes to third-party integrations. Ring exposes only coarse classification metadata (`motion`, `human`, `vehicle`, `animal`, `other_motion`) via the `sub_type` attribute. Third-party visual AI must process video stream frames (WebRTC WHEP / RTSP) using external models (as shown by MediaPipe Hands in the official sample).
     3. **Virtual Emulator Simulation:** Documented on page `https://developer.amazon.com/docs/ring/release-notes.html` (May 28, 2026, "Developers Playground") and `https://developer.amazon.com/ring/console/playground`. Simulates live view events for **Package**, **Vehicle**, and **Motion** event types with full WebRTC/WHEP session workflow and live view streaming, plus interactive API explorer and 30-minute access token generation.
     4. **Portal Approval & Dynamic Scopes Prerequisites:** **No approved app or dynamic scopes are required** for the Playground / emulator. Wait time for Playground access is **0 minutes** (instant token). Developer identity verification takes minutes. Certification (90% reviewed in <48h) is only needed for publishing public apps to the Ring Appstore. Dynamic scopes are in Early Access for developers.
     5. **Dynamic Scopes Needed:** **Cameras and Doorbells** is strictly required (covers Motion Events, Doorbell press events, Livestream, Video Download). **Sensors** is optional (for doorway contact sensors). **Chimes** is not needed. **Account and Lifecycle** is always granted automatically.
   - Formulated the final one-line verdict:
     `GO WITH THIS NARROWER SCOPE (Doorstep event pipeline consumes Ring real-time doorbell button_press and motion_detected webhook events [sub_types: human, vehicle, motion] or live WebRTC stream frames processed by our own vision/Bedrock pipeline, generating spoken doorstep descriptions scheduled into playback gaps on Fire TV NarraTV, without depending on proprietary Ring cloud CV object-bounding APIs or unencrypted stored video access under TAKE)`
   - Stopped execution at the Phase 0 feasibility gate. Zero application code written.

3. **Cleanup:**
   - Cleaned up all temporary research scratch files from the workspace root.

---

## BLOCKED

- None for Phase 0.
- Phase 1 application design/code is blocked pending orchestrator approval of the feasibility verdict.

---

## RISK

1. **TAKE Encryption & Stored Media:** Third-party applications cannot assume access to historical cloud recordings unless the user account actively holds keys. For real-time doorbell assistance, Doorstep must operate on real-time webhook events and/or live WebRTC streams, not retrospective cloud clip fetching.
2. **Coarse Native Classification vs. Rich Description:** Ring's native event metadata categorizes events only into `human`, `vehicle`, `motion`, or `other_motion`. To achieve richer accessibility descriptions (e.g. "Delivery driver placing a package on the porch" vs. just "Human detected"), Doorstep would need to ingest the WebRTC stream and query Bedrock Nova Pro (similar to NarraTV's vision pipeline).
3. **WebRTC Stream Limits:** Battery-powered Ring doorbells enforce a 30-second live view limit (60 seconds on line-powered), which requires prompt stream connection and snapshot capture.

---

## NEXT

1. Orchestrator reviews `projects/02-ring-doorstep/docs/00-research/take-and-cv-feasibility.md` and decides on Phase 0 approval.
2. Upon approval, Phase 1 implementation scope:
   - Establish `services/event-receiver` in TypeScript/Node to receive and HMAC-verify Ring webhook payloads (`button_press` and `motion_detected`).
   - Create the doorstep event mapper and spoken description generator.
   - Define the Fire TV dispatch bridge to feed NarraTV's gap scheduler.
   - Create automated test suites in `tests/` and runnable scripts in `ops/`.
3. User action (when testing with live Ring devices or Developer Portal):
   - Access `https://developer.amazon.com/ring/console/playground` to generate a 30-minute sandbox access token.
   - For live device testing, create a developer app on `https://developer.amazon.com/ring/console/apps` with scope `Cameras and Doorbells`.
4. Clarification regarding `walkthrough.md`:
   - In Task 14, `walkthrough.md` was an Antigravity agent artifact located in the agent's internal app-data directory (`C:\Users\Atchayam\.gemini\antigravity\brain\...`) rather than a project file. Per the strict rule "DO NOT TOUCH `projects\01-firetv-narratv` OR `projects\03-alexa-mcp`", no files in Project 3 were modified. It has been removed from the deliverable list in this task's handoff.

---

## FILES

- `projects/02-ring-doorstep/README.md`
- `projects/02-ring-doorstep/LICENSE`
- `projects/02-ring-doorstep/docs/00-research/take-and-cv-feasibility.md`
- `projects/02-ring-doorstep/docs/04-agents/handoff-task15.md`

---

## SCREENSHOTS

None. Phase 0 is a research and feasibility gate; no UI or application code was run.
