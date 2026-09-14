# Handoff — Task 16: Project 2 (Ring Track) Phase 1: Doorstep Event-to-Description Service

**Date:** 2026-09-14  
**Agent:** Antigravity ("agy")  
**Project:** `projects/02-ring-doorstep`  
**Track:** Ring Track (Phase 1)  

---

## DONE

### 1. Phase 0 Corrections Completed & Verified
- Updated `projects/02-ring-doorstep/docs/00-research/take-and-cv-feasibility.md` to explicitly date the mandatory server-side watermark release note as **June 8, 2026 / API changes**.
- Rewrote the final feasibility verdict into three short, readable sentences highlighting webhook coarse metadata, watermark cropping before Bedrock Nova Pro inference, and Fire TV viewing gap delivery.

### 2. Core Event-to-Description Service (`services/descriptor`)
- **Webhook Ingestion & Schema Normalization (`src/event-pipeline.ts`)**:
  - Consumes Ring Partner API webhook events: `motion_detected`, `button_press` (and `ding`/`motion` aliases).
  - Strictly adheres to the documented schema by extracting `data.attributes.sub_type` (`human`, `vehicle`, `motion`, `animal`, `other_motion`). Gracefully supports legacy `data.subType` as a fallback.
- **Watermark Excision Engine (`src/watermark-cropper.ts`)**:
  - Pure JavaScript implementation using `pngjs` and `jpeg-js` (zero native Windows build dependencies).
  - Slices off the top 15% watermark band (containing Ring logo on top-left, Device ID, App Name, and timestamp on top-right per June 8, 2026 release note).
  - Evaluates pre-inference frame luminance (BT.709 relative luminance). Detects pitch-black (< 3.0/255) and corrupted inputs.
  - Excludes 100% of watermark rows before passing frames to model vision.
- **Multimodal Bedrock Nova Pro Describer (`src/bedrock-describer.ts`)**:
  - Connects to AWS Bedrock Runtime in `us-east-1` invoking `amazon.nova-pro-v1:0` via the Converse API.
  - Strict accessibility prompt enforces:
    1. Exactly ONE sentence in the present tense.
    2. Plain, objective, factual physical description for blind listeners.
    3. FORBIDDEN: Never guess identity ("looks like John", "homeowner").
    4. FORBIDDEN: Never guess intent ("delivering package", "suspiciously looking").
    5. FORBIDDEN: Never describe camera technical artifacts or framing.
    6. FORBIDDEN: Never use flowery or poetic language.
    7. REFUSAL: If unusable, respond strictly with `REFUSAL: <reason>`.
- **Loud & Visible Refusal State Handling**:
  - Unusable inputs (pitch-black frames, corrupted streams, or model refusals) trigger a loud and visible `REFUSED` state.
  - Sets `isRefused: true`, captures exact `refusalReason`, formats spoken caption as `Refusal alert: ...`, and never outputs an empty string or misleading polite fallback like "nothing to see".
- **Real Ring Partner API Client (`src/ring-client.ts`)**:
  - Real HTTPS communication with `https://api.amazonvision.com/v1/devices` with Bearer auth.
  - Token redaction (`SAND...2211` or `(none)`).
  - Honest 401 handling providing explicit console link: `https://developer.amazon.com/ring/console/playground`.
- **Express API & Static Host (`src/server.ts`, `src/index.ts`)**:
  - Endpoints: `GET /api/status`, `POST /api/webhook`, `POST /api/describe`, `GET /api/samples`, `GET /api/samples/:id/image`.
  - Hosts the compiled web surface on `http://localhost:3002`.

### 3. UI Surface (`apps/surface`)
- Distinct, high-contrast accessibility interface built with Vite, TypeScript, and custom handcrafted CSS (zero Tailwind/Bootstrap).
- **Step 1 — Webhook Event**: Live JSON inspector displaying normalized payload with `data.attributes.sub_type`.
- **Step 2 — Frame Acquisition & Watermark Excision**: Split-view image comparison showing Raw Feed (with top 15% watermark zone highlighted in red) vs. Cropped Payload (134px / 15% excised, watermark status `EXCISED (0% IN PAYLOAD)`).
- **Step 3 — Bedrock Nova Pro Inference**: Factual 1-sentence description card with latency telemetry and guardrail badges, or bright red `LOUD REFUSAL TRIGGERED` banner when input is unusable.
- **Step 4 — Spoken Accessibility Caption**: Text-to-speech audio player using Web Speech API with voice selector and stop/play controls.
- **Honest Token Failure State**: When the 30-minute sandbox token is missing or expired (HTTP 401), the UI displays a prominent warning banner with link `https://developer.amazon.com/ring/console/playground`, status badge `Ring Sandbox: Token Missing / Expired (401)`, and suppresses live transcripts.

### 4. Tests & Operations Tooling (`ops/`)
- `ops/test.cmd`: Comprehensive test and build script. Executes 11 unit tests across 4 test suites in `services/descriptor` and compiles both `descriptor` and `surface`. All suites 100% green.
- `ops/verify-ring-api.cmd`: Sends live HTTPS probe to `https://api.amazonvision.com/v1/devices` and verifies genuine Envoy response (`server: envoy`, `x-request-id: 20dd8c90-b3b0-4fbc-9787-76cc27c6018a`, HTTP 401).
- `ops/start.cmd` & `ops/dev.cmd`: Launches backend service and surface for judging and development.
- `ops/capture-evidence.mjs`: Automated headless browser script that runs scenarios, captures screenshots, and computes SHA-256 hashes.

---

## BLOCKED
- None. All Phase 1 deliverables are operational and verified.

---

## RISK
1. **Sandbox Token Expiration (30 Minutes)**: Ring Developers Playground tokens expire after 30 minutes. Doorstep mitigates this by detecting 401s, displaying honest failure states in both UI and CLI, providing direct console links, and supporting quick in-UI token updates without restarting the server.
2. **Bedrock Multimodal Quota**: Inference uses `amazon.nova-pro-v1:0` in `us-east-1`. Live invocations verified responsive (latency ~3.5s–5.8s).

---

## NEXT
- **Phase 2 (Fire TV Gap Integration)**: Once Project 1 (Fire TV NarraTV) and Project 3 (Alexa+ MCP) are submitted, connect Doorstep's event-to-description pipeline to NarraTV's dialogue gap scheduler, enabling spoken doorbell announcements during natural movie/show pauses without disrupting playback.

---

## FILES

### Configuration & Root Files
- `projects/02-ring-doorstep/.gitignore` — Protects sandbox tokens and ignores node_modules/dist
- `projects/02-ring-doorstep/.env.example` — Configuration template for Ring and AWS Bedrock
- `projects/02-ring-doorstep/README.md` — Updated project documentation with Verified vs. Unverified status table

### Descriptor Service (`projects/02-ring-doorstep/services/descriptor`)
- `package.json` — ESM package definition (`@aws-sdk/client-bedrock-runtime`, `pngjs`, `jpeg-js`, `express`, `cors`, `dotenv`, `zod`, `tsx`)
- `tsconfig.json` — TypeScript compiler configuration
- `src/config.ts` — Environment variable loader and token redactor
- `src/watermark-cropper.ts` — Pure JS image format detector, top-band watermark cropper, and luminance evaluator
- `src/bedrock-describer.ts` — Bedrock Nova Pro Converse API caller with accessibility prompt and refusal parser
- `src/ring-client.ts` — Ring Partner API HTTP client with honest 401 handling
- `src/event-pipeline.ts` — Webhook normalizer and end-to-end pipeline runner
- `src/sample-frames.ts` — Real image fixture loader and synthetic test frame generator
- `src/server.ts` — Express REST API and static surface server
- `src/index.ts` — Service entrypoint
- `fixtures/porch_delivery.jpg` — Doorbell camera test frame (courier with box, top timestamp banner)
- `fixtures/driveway_vehicle.jpg` — Security camera test frame (vehicle in driveway, top timestamp banner)
- `tests/watermark-crop.test.ts` — Unit test proving watermark area is 100% excluded from model input
- `tests/refusal-state.test.ts` — Unit test asserting pitch-black and corrupted frames trigger visible refusal
- `tests/event-parsing.test.ts` — Unit test asserting Ring schema parsing (`data.attributes.sub_type`)
- `tests/ring-client.test.ts` — Unit test verifying Ring API 401 handling and playground link

### Web UI Surface (`projects/02-ring-doorstep/apps/surface`)
- `package.json` — Vite and TypeScript configuration
- `tsconfig.json` — Surface TypeScript configuration
- `vite.config.ts` — Development server and API proxy configuration
- `index.html` — Accessible studio interface structure
- `src/style.css` — Hand-crafted high-contrast accessible stylesheet
- `src/main.ts` — Surface application controller, image comparison renderer, and TTS synthesis

### Operations & Verification (`projects/02-ring-doorstep/ops`)
- `ops/test.cmd` — Comprehensive test and build verification script
- `ops/verify-ring-api.mjs` — Live HTTPS round-trip verification to Ring Partner API
- `ops/verify-ring-api.cmd` — CLI wrapper for live API verification
- `ops/start.cmd` — Production launcher for descriptor and static surface
- `ops/dev.cmd` — Development launcher (Vite + backend)
- `ops/capture-evidence.mjs` — Automated browser screenshot capture and hash computation

### Documentation & Evidence (`projects/02-ring-doorstep/docs`)
- `docs/00-research/take-and-cv-feasibility.md` — Updated feasibility document with June 8, 2026 watermark date and 3-sentence verdict
- `docs/assets/evidence-manifest.json` — Screenshot manifest with SHA-256 hashes and descriptions
- `docs/04-agents/handoff-task16.md` — This handoff document

---

## SCREENSHOTS

| File | SHA-256 | Description |
| :--- | :--- | :--- |
| [`01-token-missing-banner.png`](../assets/screenshots/01-token-missing-banner.png) | `ebcfb9711e6b4241a0b8efc407797adb031d4f895557cbe67bca55ccebfaa8d9` | Initial surface state displaying honest token warning banner with link to Developers Playground (`https://developer.amazon.com/ring/console/playground`) and API status showing 401 Unauthorized with no fake live transcripts. |
| [`02-porch-package-pipeline.png`](../assets/screenshots/02-porch-package-pipeline.png) | `6c47742ea6bb804eb40101b19e1a74971a3dc74dc30e4a7ab74c50e1c10e0d2e` | Full 4-step pipeline execution for courier package event. Step 1 shows normalized `data.attributes.sub_type` ("human"). Step 2 shows 134 rows (15%) cropped excising watermark. Step 3 shows Bedrock Nova Pro description ("A man wearing a blue jacket and blue jeans stands on the front porch holding a cardboard box."). Step 4 shows spoken accessibility caption ready for TTS playback. |
| [`03-vehicle-driveway-pipeline.png`](../assets/screenshots/03-vehicle-driveway-pipeline.png) | `e40e0185afbea9f30aa68122994fbb060661ba20eac408d13283ec4cbaa16131` | Full pipeline execution for vehicle event (`sub_type: "vehicle"`). Shows raw vs cropped frame comparison, Bedrock Nova Pro description ("A silver car is parked in the driveway of a house."), and audio speech synthesis ready. |
| [`04-loud-refusal-pitch-black.png`](../assets/screenshots/04-loud-refusal-pitch-black.png) | `86b0490ff833a037c50b4599760f9ad1e8063b66568df0cc08d2c8cd9991b892` | Loud refusal state triggered by pitch-black frame (luminance 0.0/255). Shows bright red `LOUD REFUSAL TRIGGERED` badge with reason: "Frame is pitch black (average luminance 0.0/255). No visual features are discernible.", no fake transcript, and refusal speech alert. |
