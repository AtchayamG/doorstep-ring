# Doorstep

> Intelligent, spoken doorway accessibility descriptions scheduled for blind and low-vision viewers.
> Built for the Amazon **Build, Ship, Shape** Developer Hackathon 2026 — **Ring Track (Phase 1)**

---

## Overview

Doorstep transforms Ring smart doorbell and camera events into objective, spoken accessibility descriptions for blind and low-vision viewers.

When a Ring camera detects motion or a doorbell button is pressed, Doorstep:
1. Normalizes the webhook event schema using official Ring Partner API metadata (`data.attributes.sub_type`: `human`, `vehicle`, `motion`, etc.).
2. Retrieves the camera snapshot from the Ring Partner API (`https://api.amazonvision.com/v1`).
3. **Excises the server-side watermark overlay** (top 15% band containing Ring logo, Device ID, and timestamp per the June 8, 2026 Ring API specification) so model vision is not polluted by on-screen text.
4. Performs multimodal inference via **Amazon Bedrock Nova Pro** (`amazon.nova-pro-v1:0` in `us-east-1`) under strict accessibility guardrails (single factual sentence, present tense, zero identity speculation, zero motive guessing).
5. Enforces **loud and visible refusals** on unusable inputs (pitch-black unlit frames, corrupted feeds, or model refusal) rather than polite or deceptive fallbacks.
6. Presents an **honest token failure state** when the 30-minute Developers Playground sandbox token is expired or absent, linking directly to the official console (`https://developer.amazon.com/ring/console/playground`) with zero fabricated live transcripts.
7. Synthesizes a spoken accessibility caption formatted for immediate audio playback.

---

## Verified vs. Unverified Architecture Status

| Component | Status | Verification Evidence |
| :--- | :--- | :--- |
| **Ring Partner API** | **Verified (authenticated reads, 2026-09-14)** | Six endpoints returned **HTTP 200** with a real Developers Playground token: `/devices`, `/locations`, `/users/me`, and a device's `/capabilities`, `/status`, `/configurations` (`server: envoy`, distinct `x-request-id` per call, e.g. `d5791cac-8808-4824-aad8-1cf7486f1682`). The sandbox device is a Doorbell Pro reporting `online: true`. Full output: [`docs/00-research/ring-live-api-evidence.md`](docs/00-research/ring-live-api-evidence.md). |
| **Event history** | **Blocked by scope, not by us** | `GET /devices/{id}/events` returns **403** on a Playground token, whose only scope is `ava.v1:read`. The route exists; the token cannot reach it. |
| **Still-frame endpoint** | **Does not exist** | `/snapshot`, `/media` and `/recordings` all return **404**. Media is WebRTC: a `POST .../media/streaming/whep/sessions` with `Content-Type: application/sdp` returns **201 Created** and a session `Location`. Frame acquisition is a WHEP client, which this service does not yet implement — so it reads frames from disk, and says so. |
| **Watermark Excision** | **Verified (Unit & Visual Tests)** | Slices top 15% rows (`134px` on 896p). Unit test `tests/watermark-crop.test.ts` proves 0% watermark pixels remain in model payload. |
| **Bedrock Nova Pro Vision** | **Verified (Live AWS Inference)** | Multimodal inference via `@aws-sdk/client-bedrock-runtime` against `amazon.nova-pro-v1:0` in `us-east-1`. Generates concise 1-sentence descriptions. |
| **Loud Refusal State** | **Verified (Unit & Live Tests)** | Pitch-black frame (< 3.0/255 luminance) triggers explicit `REFUSED` state, red banner, and refusal speech alert. No silent failures. |
| **Token Absence Transparency** | **Verified (Surface & API Tests)** | When token is expired or missing, UI displays warning banner with link to `https://developer.amazon.com/ring/console/playground` and suppresses transcripts. |
| **Fire TV APK Integration** | *Deferred to Phase 2* | Intentionally isolated to protect frozen Project 1 and Project 3 release artifacts. |

---

## Where the demo frames come from

**No frame in this demo came from a live Ring camera.** We have no Ring Partner
API token yet, so there is nothing to fetch a real frame with. Every image the
pipeline runs on is one of the following, and the web surface labels which one
it is on screen, next to the image, on every run.

| File / scenario | Origin | How we know |
| :--- | :--- | :--- |
| `fixtures/SYNTHETIC-ai-generated-porch-delivery.jpg` | **AI-generated image** | C2PA content credentials in the file: `c2pa.created` — "Created by Google Generative AI", `digitalSourceType: trainedAlgorithmicMedia`, and `c2pa.edited` — "Applied imperceptible SynthID watermark." |
| `fixtures/SYNTHETIC-ai-generated-driveway-vehicle.jpg` | **AI-generated image** | Same C2PA credentials, read from the file's own manifest. |
| `doorbell_chime_press` scenario | Procedurally drawn | Generated pixel-by-pixel by `createSyntheticFrame()` in `src/sample-frames.ts`. |
| `pitch_black_unusable` scenario | Procedurally drawn | Same function; a deliberately unusable frame for the refusal path. |
| "Upload Frame" button | Whatever you supply | The app makes no claim about a file you choose yourself. |

The full evidence, including the raw C2PA manifest output, is in
[`docs/00-research/fixture-media-provenance.md`](docs/00-research/fixture-media-provenance.md).

One consequence, since it looks like a feature otherwise: only the two
AI-generated frames produce a real description. Run `doorbell_chime_press` and
Nova Pro refuses it — *"The image is a solid color with no discernible subjects
or actions."* Our procedurally drawn frames are flat shapes, and the model is
right to decline them. So the describing path in this demo is currently
exercised by generated photographs, and the refusal path by our own drawings.
Reproduce both with `node ops/verify-frame-origin.mjs` against a running
service.

This is enforced rather than remembered. `SampleScenario.frameOrigin` carries
the origin with the frame, the API returns it, the UI writes its image label
from it, and `services/descriptor/tests/fixture-provenance.test.ts` fails the
build if an image lands in `fixtures/` without a provenance entry, if a
documented AI-generated file does not say `SYNTHETIC` in its own filename, or
if any scenario claims `ring-live` while reading a fixture off disk.

We found this ourselves, after the images had already shipped into the repo
labelled "camera test frames" and the surface had already rendered one under a
pane reading "Raw Camera Feed". Nobody asked us to check. What that cost, and
how the images got there, is written down in the provenance document above.

---

## Repository Structure

```
projects/02-ring-doorstep/
  ├── LICENSE
  ├── README.md
  ├── .env.example
  ├── apps/
  │   └── surface/               # Web testing & judging UI surface (Vite, TypeScript, Hand-crafted CSS)
  ├── services/
  │   └── descriptor/            # Core Node.js/TypeScript event-to-description service
  │       ├── fixtures/          # SYNTHETIC AI-generated test frames (see "Where the demo frames come from")
  │       ├── src/
  │       │   ├── config.ts              # Token & AWS configuration
  │       │   ├── watermark-cropper.ts   # Pure JS top-band watermark excision (15%)
  │       │   ├── bedrock-describer.ts   # Amazon Bedrock Nova Pro multimodal integration
  │       │   ├── ring-client.ts         # Real HTTP client for api.amazonvision.com
  │       │   ├── event-pipeline.ts      # Webhook normalizer & pipeline orchestrator
  │       │   ├── sample-frames.ts       # Test frames & synthetic scenario generators
  │       │   ├── server.ts              # Express API & static surface host
  │       │   └── index.ts               # Service launcher
  │       └── tests/                     # 17 unit tests (crop, refusal, schema, token, fixture provenance)
  ├── ops/
  │   ├── test.cmd               # Runs all test suites & builds (Must be 100% green)
  │   ├── verify-ring-api.cmd    # Real HTTP round-trip verification to Ring Partner API
  │   ├── start.cmd              # Launches backend service and web surface on port 3002
  │   ├── dev.cmd                # Launches service + Vite dev server concurrently
  │   └── capture-evidence.mjs   # Headless browser automated screenshot & SHA-256 tool
  └── docs/
      ├── 00-research/           # Phase 0 feasibility analysis
      ├── 04-agents/             # Agent handoff documents & reviews
      └── assets/screenshots/    # Verified visual evidence artifacts
```

---

## Quick Start & Verification

### 1. Run Automated Test Suites
Runs all 11 unit tests (watermark crop verification, loud refusal assertions, webhook schema parsing, Ring client 401 handling) and compiles both packages:
```cmd
ops\test.cmd
```

### 2. Verify Live Ring Partner API Round Trip
Sends a real HTTP GET to `https://api.amazonvision.com/v1/devices` and verifies genuine Envoy response headers:
```cmd
ops\verify-ring-api.cmd
```

### 3. Launch Service and Web Surface
Launches the descriptor API service and hosts the Doorstep Accessibility Studio on `http://localhost:3002`:
```cmd
ops\start.cmd
```

---

## Screenshots & Visual Evidence

| Screenshot | Description | SHA-256 |
| :--- | :--- | :--- |
| `01-token-missing-banner.png` | Honest token warning banner linking to Developers Playground (`https://developer.amazon.com/ring/console/playground`) with HTTP 401 badge. | `ebcfb9711e6b4241a0b8efc407797adb031d4f895557cbe67bca55ccebfaa8d9` |
| `02-porch-package-pipeline.png` | Courier on porch: `sub_type: "human"`, top 15% (134 rows) excised, Bedrock Nova Pro factual description ("A man wearing a blue jacket and blue jeans stands on the front porch holding a cardboard box."), and TTS audio caption. | `6c47742ea6bb804eb40101b19e1a74971a3dc74dc30e4a7ab74c50e1c10e0d2e` |
| `03-vehicle-driveway-pipeline.png` | Vehicle in driveway: `sub_type: "vehicle"`, top watermark sliced off, Bedrock Nova Pro description ("A silver car is parked in the driveway of a house."). | `e40e0185afbea9f30aa68122994fbb060661ba20eac408d13283ec4cbaa16131` |
| `04-loud-refusal-pitch-black.png` | Unusable pitch-black frame: bright red `LOUD REFUSAL TRIGGERED` banner, reason ("Frame is pitch black (average luminance 0.0/255)"), no fake transcript, and refusal speech alert. | `86b0490ff833a037c50b4599760f9ad1e8063b66568df0cc08d2c8cd9991b892` |
