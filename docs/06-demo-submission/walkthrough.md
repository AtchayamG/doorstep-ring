# Doorstep — Submission Walkthrough & Verification Guide

> **Amazon Developer Hackathon (Build, Ship, Shape 2026)**  
> **Project**: Doorstep (Ring Track — Phase 1)  
> **Target Audience**: Hackathon Judges (Both those reviewing offline and those running code locally)  
> **Author**: Atchayam G (solo entrant)

---

## Part 1: For the Judge Reviewing Offline (No Code Execution Required)

If you are evaluating this submission from documentation, code inspection, and recorded media alone, this section provides the verified facts, architecture decisions, and cryptographically hashed visual evidence.

### 1. What Doorstep Is & What It Solves
Doorstep is an intelligent accessibility pipeline designed for blind and low-vision viewers. When a Ring doorbell or camera detects motion or a chime is pressed, Doorstep transforms the raw event into an objective, single-sentence spoken description (e.g., *"A man wearing a blue jacket and blue jeans stands on the front porch holding a cardboard box."*).

### 2. The Core Technical Contributions
1. **Watermark Excision**: All media delivered via the Ring Partner API includes a mandatory server-side watermark (Ring logo top-left, Device ID/timestamp top-right per the June 8, 2026 Ring API specification). Unchecked, vision models read this text aloud. Doorstep's pure JavaScript cropper (`services/descriptor/src/watermark-cropper.ts`) automatically excises the top 15% rows (134px on 896p frames) before inference. Unit test `tests/watermark-crop.test.ts` proves that **0% of watermark pixels reach the model**.
2. **Strict Accessibility Vision Guardrails**: Amazon Bedrock Nova Pro (`amazon.nova-pro-v1:0` in `us-east-1`) is prompted under strict accessibility constraints: exactly one sentence, present tense, zero identity guessing ("looks like John"), zero motive speculation ("delivering a package"), and plain factual description.
3. **First-Class Loud Refusal**: Unusable inputs (pitch-black unlit frames with relative luminance < 3.0/255, corrupted files, or model refusals) trigger a loud and visible `REFUSED` state. The system emits an explicit refusal reason and an audible refusal alert, refusing to output an empty string or misleading polite fallback like "nothing to see".
4. **Honest Token Absence Transparency**: When the 30-minute Developers Playground sandbox token is expired or absent, the UI displays an honest warning banner linking directly to `https://developer.amazon.com/ring/console/playground` and suppresses live transcripts. No canned live responses are fabricated.

### 3. Media Provenance & API Reality Disclosure
**No frame in this demo came from a live Ring camera.**
* **Why the demo runs on fixtures**: While authenticated testing against the Ring Developers Playground confirmed our Doorbell Pro is `online: true` across 6 discovery endpoints, probing revealed that the Ring Partner API provides **no REST snapshot endpoint** (HTTP 404 on `/snapshot`, `/media`, `/recordings`). Media acquisition is strictly WebRTC WHEP (`POST .../media/streaming/whep/sessions` returning HTTP 201 Created). Standing up a headless WebRTC peer connection to decode video tracks is a scoped Phase 2 milestone. Thus, running on deterministic local fixtures is an explicit engineering decision driven by API reality, ensuring offline test stability.
* **Synthetic Test Fixtures**: The two photographic preset frames (`SYNTHETIC-ai-generated-porch-delivery.jpg` and `SYNTHETIC-ai-generated-driveway-vehicle.jpg`) are AI-generated test fixtures carrying signed Google C2PA Content Credentials (`c2pa.created: "Created by Google Generative AI"`, `digitalSourceType: trainedAlgorithmicMedia`, `c2pa.edited: "Applied imperceptible SynthID watermark."`).
* **Visible Amber Provenance Strip**: The web interface explicitly displays prominent amber warning strips directly beneath synthetic input frames:
  `Synthetic frame (C2PA content credentials present, trainedAlgorithmicMedia). Watermark zone simulated at top 15%.`
* **Sandbox Simulation Provenance**: The Developers Playground live-view stream itself plays a Creative Commons clip (*"Thief stealing our package" by YouTube user frollard, CC BY 4.0*), which carries third-party attribution requirements.
* Full C2PA manifests, live API probe logs, and provenance analysis are documented in [`docs/00-research/fixture-media-provenance.md`](../00-research/fixture-media-provenance.md) and [`docs/00-research/ring-live-api-evidence.md`](../00-research/ring-live-api-evidence.md).

### 4. Verified Screenshot Manifest

| Screenshot | Description | SHA-256 Hash |
| :--- | :--- | :--- |
| `01-token-missing-banner.png` | Honest token failure state showing warning banner, link to Developers Playground, and HTTP 401 badge with no fake live transcripts. | `2238f687d435b1d759b28dbe4a9a70d668111ea713c3c0b02f579a1deef1b3da` |
| `02-porch-package-pipeline.png` | Full 4-step pipeline for courier package event. Shows normalized `sub_type: "human"`, input frame with amber C2PA provenance strip, 134 rows (15%) cropped excising watermark, Bedrock Nova Pro factual description, and TTS audio caption. | `7a3707c177239c8536affcb97853b06099d2edde2f520bf65bbf2a03c7685283` |
| `03-vehicle-driveway-pipeline.png` | Full pipeline for vehicle event (`sub_type: "vehicle"`). Shows synthetic input frame with amber provenance strip, cropped frame with watermark excised, Bedrock Nova Pro description (*"A silver car is parked in the driveway of a house."*), and audio playback controls. | `11f1f110f45887c3128fe23cf07f2caa8edb78c1ad80b2647554512e9aeb0311` |
| `04-loud-refusal-pitch-black.png` | First-class loud refusal on pitch-black frame (luminance 0.0/255). Shows input frame labelled "Input Frame — PROCEDURALLY DRAWN", bright red `LOUD REFUSAL TRIGGERED` banner, refusal reason, and speech alert. | `608f17d330359478b418661dd4a293b91fa705f7989342d0ce6080466e4cb40c` |

---

## Part 2: For the Judge Running the Code Locally

All commands below are verified and copy-pasteable from the `projects/02-ring-doorstep` directory on Windows, macOS, or Linux.

### Prerequisites
* Node.js v20+ (v22 recommended)
* AWS Credentials with Bedrock access (`~/.aws/credentials`) in region `us-east-1` (for live Bedrock Nova Pro calls)

---

### Step 1: Run the Automated Test Suites & Builds
Executes 17 automated unit tests across 5 test suites (event parsing, watermark cropping, refusal logic, Ring client authentication, fixture provenance) and compiles both packages.

```cmd
ops\test.cmd
```

**Real Terminal Output from Verified Run:**
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
# pass 17
# fail 0

--- 2. Typechecking and Building Descriptor Service ---
> tsc

--- 3. Typechecking and Building Web Surface ---
> tsc && vite build
vite v6.4.3 building for production...
✓ built in 109ms

===================================================
[Doorstep] ALL TESTS GREEN AND BUILDS PASSED
===================================================
```
**What this proves**: Watermark cropping mathematically excises 100% of top watermark pixels; refusal states trigger predictably on corrupt or black frames; fixture provenance rules are strictly enforced.

---

### Step 2: Probe the Live Ring Partner API Gateway
Performs a genuine HTTPS request to the Ring Partner API device listing endpoint to prove real network round-trip connectivity to Amazon Vision infrastructure.

```cmd
ops\verify-ring-api.cmd
```

**Real Terminal Output from Verified Run (Unauthenticated Probe):**
```text
===========================================================
[Doorstep] Probing Ring Partner API Endpoint
===========================================================
Timestamp:       2026-09-14T16:46:17.925Z
Endpoint:        https://api.amazonvision.com/v1/devices
Redacted Token:  (none configured)
-----------------------------------------------------------
HTTP Status:     401 Unauthorized
Response Headers:
  date: Mon, 14 Sep 2026 16:46:18 GMT
  server: envoy
  x-request-id: 3ad90b3a-af16-4ee3-8b24-01cb4c47d81f
Response Body:
(empty body)
-----------------------------------------------------------
RESULT: AUTH REQUIRED (HTTP 401). Genuine Envoy response verified.
Sandbox tokens have a 30-minute lifespan.
To obtain a token, visit: https://developer.amazon.com/ring/console/playground
===========================================================
```

#### What an Authenticated Call Returns (Ground Truth from Playground Token)
When executed with a valid 30-minute Playground token (`ava.v1:read`), the API returns:
1. **HTTP 200 on 6 Core Endpoints**:
   * `GET /devices`: Returns device object with `attributes.name: "Playground Device"` and CDN image confirming **Doorbell Pro**.
   * `GET /devices/{id}/status`: Reports `online: true` with sub-minute timestamps.
   * `GET /locations`, `GET /users/me`, `GET /devices/{id}/capabilities`, `GET /devices/{id}/configurations`.
2. **HTTP 403 Forbidden on Events**:
   * `GET /devices/{id}/events` returns 403 Forbidden because `ava.v1:read` scope does not permit event history retrieval.
3. **HTTP 404 Not Found on REST Snapshots**:
   * `GET /devices/{id}/snapshot`, `/media`, and `/recordings` return 404. Media is exclusively available via WebRTC WHEP (`POST .../whep/sessions` -> 201 Created).
4. **CC BY 4.0 Video Provenance**:
   * The Playground package video stream is `"Thief stealing our package" by YouTube user frollard, used under CC BY 4.0 / clipped from original`.

Full authenticated response logs and JSON:API structures are documented in [`docs/00-research/ring-live-api-evidence.md`](../00-research/ring-live-api-evidence.md).

---

### Step 3: Launch the Doorstep Service and Web Surface
Launches the Express API service and serves the pre-compiled static web surface:

```cmd
ops\start.cmd
```
*Open in your browser*: **`http://localhost:3002`**

**What you will see on screen**:
1. **Header**: Title `Doorstep` with badge `Ring Track — Phase 1`.
2. **Status Pill**: Shows `Ring Sandbox: Token Missing (401)`.
3. **Prominent Banner**: `No Valid Ring Playground Token Detected`. Informs you that 30-minute sandbox tokens expire and links directly to `https://developer.amazon.com/ring/console/playground`.
4. **Honest State**: No fake live camera feeds or transcripts are fabricated.

---

### Step 4: Execute Scenario 1 — Courier with Package (Positive Description Path)
1. Under **1. Webhook Simulator & Source Selection**, select:
   `Courier on Porch with Box (motion: human)`
2. Notice the sub-type field automatically populates: `human`.
3. Click the blue **⚡ Execute Pipeline** button.

**What you will see on screen**:
* **Step 1 (Webhook Event)**: JSON viewer displays the normalized payload with `data.attributes.sub_type: "human"`.
* **Step 2 (Frame Acquisition & Watermark Excision)**:
  * Left pane: Displays the input frame with a red dashed overlay marking the top 15% watermark zone.
  * An amber warning strip states: *"Synthetic frame (C2PA content credentials present, trainedAlgorithmicMedia). Watermark zone simulated at top 15%."*
  * Right pane: Displays the cropped frame with the watermark cleanly excised.
  * Telemetry bar confirms: `Original: 1200x896`, `Inference: 1200x762`, `Rows Excluded: 134px (15%)`, `Watermark In Payload: EXCISED (0%)`.
* **Step 3 (Bedrock Nova Pro)**:
  * Badge turns green: `DESCRIBED`.
  * Model latency: `~5840ms`.
  * Output: *"A man wearing a blue jacket and blue jeans stands on the front porch holding a cardboard box."*
  * Verified compliance: Exactly one sentence, present tense, zero identity/motive speculation, zero mention of on-screen timestamp or watermark text.
* **Step 4 (Spoken Accessibility Caption)**:
  * Speech quote updates with the description text.
  * Click **🔊 Speak Caption** to hear the browser synthesize the audio description via Web Speech API.

---

### Step 5: Execute Scenario 2 — Pitch Black Frame (Loud Refusal Path)
1. Under **1. Webhook Simulator & Source Selection**, select:
   `Pitch Black Frame (Loud Refusal Test)`
2. Click **⚡ Execute Pipeline**.

**What you will see on screen**:
* **Step 2**: Slices the black frame and analyzes relative luminance (`0.0 / 255`).
* **Step 3 (Bedrock Nova Pro)**:
  * Status badge turns bright red: `REFUSED`.
  * A prominent crimson banner displays:
    **🛑 LOUD REFUSAL TRIGGERED**
    `Frame is pitch black (average luminance 0.0/255). No visual features are discernible.`
  * The standard description box is completely hidden. No empty strings or polite fallback placeholders like "nothing to see" are rendered.
* **Step 4 (Spoken Accessibility Caption)**:
  * Spoken text immediately formats as: *"Refusal alert: Frame is pitch black (average luminance 0.0/255). No visual features are discernible."*
  * Clicking **🔊 Speak Caption** announces the refusal alert to the user.

**What this proves**: Refusal is handled as a first-class citizen rather than an unhandled error or a deceptive fallback.

---

### Step 6: Verify Frame Provenance via API CLI Tool
In a second terminal, verify that the running service explicitly declares the origin of every scenario:

```cmd
node ops/verify-frame-origin.mjs
```

**Real Terminal Output from Verified Run:**
```text
=== GET http://localhost:3002/api/samples ===
  ai-generated   person_porch_package     Person on Porch Carrying Box (motion: human) — SYNTHETIC frame
  ai-generated   vehicle_driveway         Vehicle Parked in Driveway (motion: vehicle) — SYNTHETIC frame
  procedural     doorbell_chime_press     Doorbell Chime Pressed (button_press / ding)
  procedural     pitch_black_unusable     Pitch Black Frame (Refusal Test)

=== POST http://localhost:3002/api/describe (one call per scenario) ===
  ai-generated   DESCRIBED       A man wearing a blue jacket and jeans stands on the porch holding a large card
  ai-generated   DESCRIBED       A silver car is parked in the driveway of a house.
  procedural     REFUSED         The image is a solid block of color with no discernible subjects or actions.
  procedural     REFUSED         Frame is pitch black (average luminance 0.0/255). No visual features are disce

=== POST http://localhost:3002/api/describe (uploaded frame) ===
  user-upload    REFUSED        

All frame origins declared and correct.
```

**What this proves**: The API and web surface transparently distinguish between AI-generated photographic test frames and procedural drawings, guaranteeing that no synthetic frame is ever misrepresented as a live camera feed.
