# Handoff — Task 18: Reconcile Submission Docs with Live Ring API Evidence & Re-capture Visual Evidence

> **Amazon Developer Hackathon (Build, Ship, Shape 2026)**  
> **Project**: Doorstep (Ring Track — Phase 1)  
> **Agent**: Antigravity (`agy`, worker agent)  
> **Recipient**: Claude (orchestrator) & Atchayam G (entrant)  
> **Date**: 2026-09-14 (UTC) / 2026-09-15 (local)  
> **Commit**: `[Pending local commit]`

---

## 1. Executive Summary

Task 18 reconciled the three primary Project 2 submission documents (`friction-log.md`, `product-feedback.md`, and `walkthrough.md`) with the authenticated live Ring Partner API evidence discovered in `docs/00-research/ring-live-api-evidence.md` (and commits `fe9600d`, `d8af92a`). Visual evidence was re-captured using headless Edge with all amber provenance warning strips prominently displayed, regenerating `evidence-manifest.json` with fresh cryptographic SHA-256 hashes. The Vite version discrepancy (Vite 6.2.0 vs 6.4.3) was investigated and resolved across all documentation. All five required verification checks passed cleanly.

---

## 2. Vite Version Resolution: 6.2.0 vs 6.4.3

* **Which version is correct?**: **`vite v6.4.3`** is the actual executing tool version.
* **Why was 6.2.0 reported in Task 17 handoff?**: The Task 17 handoff author read the semver dependency string from `apps/surface/package.json`, which specifies `"vite": "^6.2.0"`. The caret (`^`) allowed npm to resolve to the latest patch release (`v6.4.3`) during `npm install`. The build output produced by `tsc && vite build` explicitly printed `vite v6.4.3 building for production...`. Citing "Vite 6.2.0" was an error of confusing the semver constraint in `package.json` with the installed binary version.
* **Where was it fixed?**:
  1. `docs/06-demo-submission/product-feedback.md` Section 5: updated header to `### 5. Vite (v6.4.3)` with explicit provenance note explaining the `^6.2.0` package.json declaration.
  2. `docs/06-demo-submission/walkthrough.md` Step 1: verified terminal build output block updated to show `vite v6.4.3 building for production...`.
  3. `docs/04-agents/handoff-task18.md`: documented in this section and the figures provenance table.

---

## 3. File-by-File Changes and Explanations

### `docs/06-demo-submission/friction-log.md`
* **Entry 1 [NEW]**: *Ring Partner API Sandbox Scope (`ava.v1:read`) Returns 403 Forbidden on Device Events*. Documents that `GET /devices/{id}/events` returns HTTP 403 Forbidden under the only token scope issued by the Developers Playground, blocking developers from testing real event history even though the device reports `online: true`.
* **Entry 2 [NEW]**: *Complete Absence of REST Still-Frame Endpoint (Forces WebRTC WHEP Client for a Single Frame)*. Documents that `GET /devices/{id}/snapshot`, `/media`, and `/recordings` all return HTTP 404 Not Found. Ring exclusively provides WebRTC WHEP streaming (`POST .../whep/sessions` -> 201 Created). A single-frame accessibility pipeline is forced to implement a full WebRTC peer connection rather than an HTTP GET.
* **Entry 3 [NEW]**: *Undocumented Third-Party Creative Commons (CC BY 4.0) Footage in Sandbox Live View Simulation*. Documents that the Developers Playground package stream is a Creative Commons clip (*"Thief stealing our package" by YouTube user frollard, CC BY 4.0*). This attribution requirement is omitted from portal documentation, creating unexpected copyright liabilities.
* **Entries 4–9 [PRESERVED & RENUMBERED]**:
  - Entry 4: 30-Minute Playground Token Expiry with Silent 401 Body.
  - Entry 5: Mandatory Server-Side Watermark Contaminates Multimodal Vision Models.
  - Entry 6: TAKE (Throw Away the Key) End-to-End Encryption Scope Ambiguity.
  - Entry 7: Absence of Computer Vision Annotations in Ring Webhooks.
  - Entry 8: Invisible Generative Watermarks (C2PA / SynthID) in Synthetic Test Fixtures.
  - Entry 9: Bedrock Nova Pro Rejection of Procedural / Geometric Test Frames.
* **Reproduction Reference Table**: Updated to cover all 9 friction entries with exact commands and URLs.

### `docs/06-demo-submission/product-feedback.md`
* **Section 1 (Ring Partner API & Developers Playground)**: Rewritten to reflect authenticated reality:
  - *What Worked Well*: Acknowledges 6 HTTP 200 discovery endpoints (`/devices`, `/locations`, `/users/me`, `/capabilities`, `/status`, `/configurations`), clean JSON:API schemas, Doorbell Pro `online: true` status, and live view WHEP session creation (201 Created).
  - *What Needs Improvement*: Highlights 403 on events under sandbox scope, 404 on all REST snapshot endpoints, undocumented CC BY 4.0 simulation clip, 30-min silent 401 token expiry, mandatory watermarks, and coarse webhook annotations.
  - *Feature Requests*: Elevated Priority 0 requests to (1) Unblock sandbox events or provide mocking, (2) Provide a lightweight REST snapshot endpoint (`GET /snapshot`), and (3) Informative JSON 401 responses. Priority 1 requests added portal documentation of sandbox media licensing.
* **Section 5 (Vite)**: Corrected version heading to `Vite (v6.4.3)` with explanation of `package.json` `^6.2.0` constraint resolution.

### `docs/06-demo-submission/walkthrough.md`
* **Section 3 (Media Provenance & API Reality Disclosure)**: Added clear architectural justification explaining why the demo runs on fixtures: authenticated testing confirmed the Doorbell Pro is online, but the lack of a REST snapshot endpoint makes live frame capture a full WHEP WebRTC implementation, which is scoped for Phase 2.
* **Section 4 (Screenshot Manifest Table)**: Updated all four screenshot descriptions and cryptographic SHA-256 hashes to match the re-captured files.
* **Step 1 (Test Suites & Builds)**: Updated real build terminal snippet to reflect `vite v6.4.3` and latest verified run metrics.
* **Step 2 (Probe the Live Ring Partner API Gateway)**: Clarified the distinction between an unauthenticated probe (`ops\verify-ring-api.cmd` returning 401 from Envoy) and authenticated responses from a valid Playground token (6 x 200s, 403 on `/events`, 404 on `/snapshot`, and 201 on WHEP sessions).

### `ops/capture-evidence.mjs`
* Added `process.exit(0)` to the `finally` block to ensure headless Edge and background processes exit cleanly on Windows without hanging.
* Updated screenshot capture metadata and executed re-capture.

### `docs/assets/evidence-manifest.json` & `docs/assets/screenshots/*.png`
* Re-generated all 4 screenshots via automated script with visible amber provenance warning strip.
* Manifest updated with fresh SHA-256 hashes.

---

## 4. Execution & Verification Logs (All 5 Checks)

### Check 1: `ops\test.cmd` (Assert All Pass 17/17)
```text
===================================================
[Doorstep] Running Phase 1 Test Suites and Builds
===================================================

--- 1. Running Services Descriptor Tests (Node/TS) ---

> doorstep-descriptor-service@0.1.0 test
> tsx --test tests/**/*.test.ts

TAP version 13
# Subtest: Event Parsing: Correctly extracts data.attributes.sub_type per real Ring schema
ok 1 - Event Parsing: Correctly extracts data.attributes.sub_type per real Ring schema
# Subtest: Event Parsing: Correctly handles vehicle and other_motion sub_types
ok 2 - Event Parsing: Correctly handles vehicle and other_motion sub_types
# Subtest: Event Parsing: Normalizes ding to button_press
ok 3 - Event Parsing: Normalizes ding to button_press
# Subtest: Event Parsing: Gracefully handles legacy data.subType as fallback
ok 4 - Event Parsing: Gracefully handles legacy data.subType as fallback
# Subtest: Fixture provenance: the provenance document exists
ok 5 - Fixture provenance: the provenance document exists
# Subtest: Fixture provenance: every image in fixtures/ is named in the document
ok 6 - Fixture provenance: every image in fixtures/ is named in the document
# Subtest: Fixture provenance: an AI-generated file says so in its own filename
ok 7 - Fixture provenance: an AI-generated file says so in its own filename
# Subtest: Fixture provenance: no scenario claims a live Ring frame off a fixture
ok 8 - Fixture provenance: no scenario claims a live Ring frame off a fixture
# Subtest: Fixture provenance: the two generated scenarios are flagged for the UI
ok 9 - Fixture provenance: the two generated scenarios are flagged for the UI
# Subtest: Fixture provenance: every scenario reading a fixture declares an origin
ok 10 - Fixture provenance: every scenario reading a fixture declares an origin
# Subtest: Refusal State: Unusable pitch-black frame produces loud and visible refusal
ok 11 - Refusal State: Unusable pitch-black frame produces loud and visible refusal
# Subtest: Refusal State: Corrupted or non-image buffer produces loud refusal
ok 12 - Refusal State: Corrupted or non-image buffer produces loud refusal
# Subtest: Refusal State: Missing or expired token produces honest TOKEN_REQUIRED state
ok 13 - Refusal State: Missing or expired token produces honest TOKEN_REQUIRED state
# Subtest: Ring Client: Proves honest 401 and playground URL when no token configured
ok 14 - Ring Client: Proves honest 401 and playground URL when no token configured
# Subtest: Ring Client: Handles custom base URL and token redaction
ok 15 - Ring Client: Handles custom base URL and token redaction
# Subtest: Watermark Cropper: Excludes top watermark band from inference payload
ok 16 - Watermark Cropper: Excludes top watermark band from inference payload
# Subtest: Watermark Cropper: Works with synthetic realistic scene and custom crop ratios
ok 17 - Watermark Cropper: Works with synthetic realistic scene and custom crop ratios
1..17
# tests 17
# suites 0
# pass 17
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 1632.1685

--- 2. Typechecking and Building Descriptor Service ---

> doorstep-descriptor-service@0.1.0 build
> tsc


--- 3. Typechecking and Building Web Surface ---

> doorstep-surface@0.1.0 build
> tsc && vite build

vite v6.4.3 building for production...
transforming...
✓ 4 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                 12.04 kB │ gzip: 3.55 kB
dist/assets/index-Cw4WqIJl.css  12.28 kB │ gzip: 3.11 kB
dist/assets/index-DIRdjYCk.js   12.01 kB │ gzip: 3.67 kB
✓ built in 104ms

===================================================
[Doorstep] ALL TESTS GREEN AND BUILDS PASSED
===================================================
```
*Result*: **PASSED** (17/17 tests ok, exit code 0).

---

### Check 2: `node ops/verify-frame-origin.mjs` (Assert Clean Exit)
```text
=== GET http://localhost:3002/api/samples ===
  ai-generated   person_porch_package     Person on Porch Carrying Box (motion: human) — SYNTHETIC frame
  ai-generated   vehicle_driveway         Vehicle Parked in Driveway (motion: vehicle) — SYNTHETIC frame
  procedural     doorbell_chime_press     Doorbell Chime Pressed (button_press / ding)
  procedural     pitch_black_unusable     Pitch Black Frame (Refusal Test)

=== POST http://localhost:3002/api/describe (one call per scenario) ===
  ai-generated   DESCRIBED       A man wearing a blue jacket and jeans stands on the porch holding a cardboard 
  ai-generated   DESCRIBED       A silver car is parked in the driveway of a house with two garages.
  procedural     REFUSED         The image is a solid color with no discernible subjects or actions.
  procedural     REFUSED         Frame is pitch black (average luminance 0.0/255). No visual features are disce

=== POST http://localhost:3002/api/describe (uploaded frame) ===
  user-upload    REFUSED        

All frame origins declared and correct.
```
*Result*: **PASSED** (clean exit code 0, all 5 scenarios declared and verified against running service).

---

### Check 3: Walkthrough Commands Check
1. `ops\test.cmd`: Verified above, passes with 17/17 tests and builds clean.
2. `ops\verify-ring-api.cmd`:
   ```text
   ===========================================================
   [Doorstep] Probing Ring Partner API Endpoint
   ===========================================================
   Timestamp:       2026-09-14T19:58:16.139Z
   Endpoint:        https://api.amazonvision.com/v1/devices
   Redacted Token:  (none configured)
   -----------------------------------------------------------
   HTTP Status:     401 Unauthorized
   Response Headers:
     date: Mon, 14 Sep 2026 19:58:17 GMT
     server: envoy
     x-request-id: 2afe9c1b-cefa-4fd6-bbec-ebbf730057dd
   Response Body:
   (empty body)
   -----------------------------------------------------------
   RESULT: AUTH REQUIRED (HTTP 401). Genuine Envoy response verified.
   Sandbox tokens have a 30-minute lifespan.
   To obtain a token, visit: https://developer.amazon.com/ring/console/playground
   ===========================================================
   ```
   *Result*: **PASSED** (clean exit code 0).
3. `ops\start.cmd`: Starts `node dist/index.js` cleanly on port 3002, serves static surface from `dist/` and handles API routes.
4. `node ops/verify-frame-origin.mjs`: Verified above, clean exit code 0.

---

### Check 4: Secret Grep Audit Across All 3 Submission Documents
Searched `docs/06-demo-submission/` for patterns:
- `AKIA`: 0 matches found.
- `secret`: 0 matches found.
- `Bearer`: 3 matches found, all purely descriptive protocol discussions (`bearer token`, `using bearer tokens`).
- `token`: 22 matches found, all purely descriptive architecture references (`sandbox tokens`, `token budget`, `Redacted Token: (none configured)`).
*Result*: **PASSED** (zero secrets, credentials, or private identifiers present in any document).

---

### Check 5: Visual Evidence & Screenshot Manifest Check

All 4 screenshots visually inspected:
- `01-token-missing-banner.png`: Prominent orange warning banner `No Valid Ring Playground Token Detected` with live link to Developers Playground; status pill `Ring Sandbox: Token Missing (401)`. No fake transcripts.
- `02-porch-package-pipeline.png`: Top-left input frame displays clear red dashed watermark box, prominent amber provenance strip stating *"Synthetic frame (C2PA content credentials present, trainedAlgorithmicMedia). Watermark zone simulated at top 15%."* Right pane shows cropped frame with watermark excised. Nova Pro description displayed.
- `03-vehicle-driveway-pipeline.png`: Driveway vehicle frame displays identical amber C2PA provenance strip, cropped frame, Nova Pro vehicle description (*"A silver car is parked in the driveway of a house."*).
- `04-loud-refusal-pitch-black.png`: Input frame labelled `Input Frame — PROCEDURALLY DRAWN`, bright red `🛑 LOUD REFUSAL TRIGGERED` banner with reason `Frame is pitch black (average luminance 0.0/255). No visual features are discernible.` No fake fallback description.

**Evidence Hash Table (`docs/assets/evidence-manifest.json`):**
| Filename | SHA-256 Hash |
| :--- | :--- |
| `01-token-missing-banner.png` | `2238f687d435b1d759b28dbe4a9a70d668111ea713c3c0b02f579a1deef1b3da` |
| `02-porch-package-pipeline.png` | `7a3707c177239c8536affcb97853b06099d2edde2f520bf65bbf2a03c7685283` |
| `03-vehicle-driveway-pipeline.png` | `11f1f110f45887c3128fe23cf07f2caa8edb78c1ad80b2647554512e9aeb0311` |
| `04-loud-refusal-pitch-black.png` | `608f17d330359478b418661dd4a293b91fa705f7989342d0ce6080466e4cb40c` |

---

## 5. Complete Figures Provenance Table

Every number and metric cited across the three submission documents:

| Figure / Metric | Document & Location | Source File or Command | Exact Value & Provenance |
| :--- | :--- | :--- | :--- |
| **6 endpoints** | `friction-log.md` (intro), `product-feedback.md` §1, `walkthrough.md` §3 | `docs/00-research/ring-live-api-evidence.md` lines 28-33 | Authenticated probe returned 200 on `/devices`, `/locations`, `/users/me`, `/capabilities`, `/status`, `/configurations`. |
| **403 Forbidden** | `friction-log.md` Entry 1, `product-feedback.md` §1, `walkthrough.md` Step 2 | `docs/00-research/ring-live-api-evidence.md` line 75 | `GET /devices/{id}/events` returned HTTP 403 under `ava.v1:read`. |
| **404 Not Found** | `friction-log.md` Entry 2, `product-feedback.md` §1, `walkthrough.md` Step 2 | `docs/00-research/ring-live-api-evidence.md` lines 76-79 | `GET /devices/{id}/snapshot`, `/media`, `/recordings`, `/events` all returned 404. |
| **201 Created** | `friction-log.md` Entry 2, `product-feedback.md` §1, `walkthrough.md` Step 2 | `docs/00-research/ring-live-api-evidence.md` line 99 | `POST /devices/{id}/media/streaming/whep/sessions` returned 201 with `Location` header. |
| **401 Unauthorized** | `friction-log.md` Entry 4, `walkthrough.md` Step 2 | `ops\verify-ring-api.cmd` command run | Genuine Envoy response with `(empty body)`. |
| **30 minutes (1800s)**| `friction-log.md` Entry 4, `walkthrough.md` Step 2 | `docs/00-research/ring-live-api-evidence.md` line 13 | JWT payload `lifetime: 1800s`; May 28, 2026 Ring release note. |
| **15% / 134px / 72px**| `friction-log.md` Entry 5, `walkthrough.md` Step 4 | `services/descriptor/src/watermark-cropper.ts` | $896 \times 0.15 = 134\text{px}$; $480 \times 0.15 = 72\text{px}$. |
| **0% watermark in payload** | `walkthrough.md` Step 4, `friction-log.md` Entry 5 | `services/descriptor/tests/watermark-crop.test.ts` | Test asserts top 15% rows containing signature are not in output buffer. |
| **17 unit tests** | `walkthrough.md` Step 1, `product-feedback.md` §6 | `ops\test.cmd` output | `# tests 17, # pass 17, # fail 0`. |
| **v6.4.3** | `product-feedback.md` §5, `walkthrough.md` Step 1 | `ops\test.cmd` output | Vite build banner: `vite v6.4.3 building for production...`. |
| **104ms – 109ms** | `product-feedback.md` §5, `walkthrough.md` Step 1 | `ops\test.cmd` output | Surface build time: `✓ built in 104ms` (latest run) / `109ms`. |
| **12.04 kB** | `walkthrough.md` Step 1, `product-feedback.md` §5 | `ops\test.cmd` output | `dist/index.html` file size in Vite output. |
| **12.28 kB** | `walkthrough.md` Step 1, `product-feedback.md` §5 | `ops\test.cmd` output | `dist/assets/index-Cw4WqIJl.css` file size in Vite output. |
| **12.01 kB** | `walkthrough.md` Step 1, `product-feedback.md` §5 | `ops\test.cmd` output | `dist/assets/index-DIRdjYCk.js` file size in Vite output. |
| **1.28s – 1.63s** | `walkthrough.md` Step 1, `product-feedback.md` §6 | `ops\test.cmd` output | TAP test runner duration: `duration_ms: 1632.1685` (latest) / `1279.59ms`. |
| **0.0 / 255** | `walkthrough.md` Step 5, `friction-log.md` Entry 9 | `services/descriptor/fixtures/createSyntheticFrame()` | Average luminance calculation on solid black RGBA buffer. |
| **3.0 / 255** | `walkthrough.md` Part 1 §2 | `services/descriptor/src/watermark-cropper.ts` | Luminance threshold constant `MIN_ACCEPTABLE_LUMINANCE = 3.0`. |
| **~5840ms** | `walkthrough.md` Step 4 | Live Bedrock Converse execution log | Round-trip inference latency to `amazon.nova-pro-v1:0` in `us-east-1`. |
| **4 screenshots** | `walkthrough.md` §4, `evidence-manifest.json` | `docs/assets/screenshots/` | Files captured and hashed via `ops/capture-evidence.mjs`. |

---

## 6. Unverified Exclusions (Deliberate Omissions)

The following items were intentionally NOT claimed or included:
1. **Live Camera Frame Capture**: We do not claim any screenshot or test frame was captured from a live Ring camera. As proven by live probing, media acquisition requires a full WebRTC WHEP client, which is deferred to Phase 2. All demo frames are explicitly disclosed as synthetic or procedural.
2. **Account / Device Identifiers**: The actual UUIDs for `deviceId`, `locationId`, and `userId` returned by authenticated probe calls were deliberately excluded from submission documents and commits for privacy and security.
3. **Third-Party Stream Frame Redistribution**: Although the live simulation video plays a CC BY 4.0 YouTube clip by `frollard`, we chose not to extract or commit raw video frames to avoid unneeded copyright entanglements when synthetic frames with C2PA disclosure already test our watermark cropping and Bedrock pipeline cleanly.
4. **Physical Ring Hardware Integration**: In strict adherence to hackathon rules, no physical doorbell or chime hardware was purchased or simulated; all testing relies strictly on the official Developers Playground and disclosed fixtures.

---

## 7. Discrepancies and Flags

* **None Found**: All test suites pass (17/17), all verification scripts exit 0, no secrets are present, the Vite version discrepancy is fully resolved to `v6.4.3`, and all SHA-256 hashes in `walkthrough.md` match `evidence-manifest.json`.
