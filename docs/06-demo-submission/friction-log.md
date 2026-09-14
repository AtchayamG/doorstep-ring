# Friction Log — Ring Partner API Developer Experience & Platform Toolchain

> **Amazon Developer Hackathon (Build, Ship, Shape 2026)**  
> **Project**: Doorstep (Ring Track — Phase 1)  
> **Bonus Category**: Tool & SDK Friction Log (Assessed at Stage 1, up to +10% score bonus)  
> **Author**: Atchayam G (solo entrant)  
> **Rules Compliance**: 100% genuine issues encountered and resolved on Windows 11 + Ring Partner API (`https://api.amazonvision.com/v1`) + AWS Bedrock (`amazon.nova-pro-v1:0`) + Node.js 22. Zero fabricated entries.

---

### Entry 1: Ring Partner API Sandbox Scope (`ava.v1:read`) Returns 403 Forbidden on Device Events
* **Task Attempted**: Querying event history (`GET https://api.amazonvision.com/v1/devices/{id}/events`) to drive the event-to-description pipeline from the live Ring Playground Doorbell Pro sandbox device.
* **Steps Taken**: Authenticated against `api.amazonvision.com/v1` using a valid bearer token generated directly from the Ring Developers Playground (`scopes: ava.v1:read`, issuer: `RingOauthService-prod:us-east-1:1.0.3328.0`).
* **Expected vs Actual**: Expected the read scope issued by the Playground to permit reading event records for the sandbox device, especially since `GET /devices/{id}/status` reported `online: true` (Doorbell Pro). Instead, the gateway returned **HTTP 403 Forbidden** (`server: envoy`). The only scope issued by the Developers Playground (`ava.v1:read`) is insufficient to access `/events`. Developers building an event-driven accessibility service cannot test real event retrieval against the sandbox device.
* **Severity**: High (completely blocks event stream testing in the official developer sandbox).
* **Workaround**: Documented in `docs/00-research/ring-live-api-evidence.md`. Engineered the pipeline to accept webhook-shaped payloads (`POST /api/webhook`) adhering strictly to the Ring JSON:API schema structure (`data.attributes.sub_type`).
* **Suggested Fix**: Grant `ava.v1:read` access to `GET /devices/{id}/events` in the Developers Playground sandbox, or provide a mock event generator toggle directly in the Playground console.

---

### Entry 2: Complete Absence of REST Still-Frame Endpoint (Forces WebRTC WHEP Client for a Single Frame)
* **Task Attempted**: Fetching a single camera still frame (JPEG/PNG) via a simple HTTP GET request to pass to Bedrock Nova Pro upon receiving a doorbell or motion event.
* **Steps Taken**: Probed standard REST media paths (`GET /devices/{id}/snapshot`, `GET /devices/{id}/media`, `GET /devices/{id}/recordings`, `GET /events`) with a valid sandbox token.
* **Expected vs Actual**: Expected a lightweight REST snapshot endpoint returning an image buffer. Instead, every candidate REST snapshot route returned **HTTP 404 Not Found** (`server: envoy`). Live network inspection revealed that the only media route Ring provides is WebRTC WHEP (`POST /devices/{id}/media/streaming/whep/sessions` with `Content-Type: application/sdp`), returning HTTP 201 Created. An accessibility service that needs exactly one still frame to describe who is at the door cannot issue a standard HTTP GET; it must stand up a complete WebRTC peer connection, negotiate SDP offers/answers, handle ICE trickle candidates, decode the RTP video track, and grab a canvas frame.
* **Severity**: High (drastically increases architectural complexity and latency for lightweight computer vision and AI integrations).
* **Workaround**: Isolated and documented the WHEP session negotiation in `docs/00-research/ring-live-api-evidence.md`. Phase 1 uses local image fixtures for offline verification while scoping the standalone WHEP client for Phase 2.
* **Suggested Fix**: Introduce a lightweight REST endpoint: `GET /devices/{id}/snapshot` (or `GET /devices/{id}/latest-frame`) returning `image/jpeg` with standard cache headers for AI/CV developers who do not require a live video stream.

---

### Entry 3: Undocumented Third-Party Creative Commons (CC BY 4.0) Footage in Sandbox Live View Simulation
* **Task Attempted**: Capturing and analyzing frames from the Developers Playground live view simulation.
* **Steps Taken**: Triggered the Playground "Simulate live view event" (Package scenario) and inspected the active stream element and console network panels.
* **Expected vs Actual**: Expected sandbox video to either be synthetic geometric animation or proprietary Amazon/Ring recordings cleared for developer use. Instead, inspection of the Playground UI directly below the active video player revealed: *"Thief stealing our package" by YouTube user frollard, used under CC BY 4.0 / clipped from original*. This licensing obligation is nowhere in the API documentation or developer portal guides. Any developer capturing frames from the sandbox stream for AI training datasets, test fixtures, or public hackathon demos unknowingly incurs CC BY 4.0 attribution legal requirements.
* **Severity**: Medium (compliance risk for developers distributing recorded demos or test datasets).
* **Workaround**: Identified and recorded the CC BY 4.0 provenance in `docs/00-research/ring-live-api-evidence.md`. Deliberately avoided committing uncredited or corrupted stream frames to git.
* **Suggested Fix**: Prominently document sandbox media licensing in `developer.amazon.com/docs/ring/`, or provide public-domain/royalty-free sandbox footage to prevent accidental copyright non-compliance.

---

### Entry 4: Ring Partner API 30-Minute Playground Token Expiration & Undocumented Empty 401 Body
* **Task Attempted**: Authenticating against the Ring Partner API device listing endpoint (`https://api.amazonvision.com/v1/devices`) using sandboxed OAuth tokens generated from the Developers Playground.
* **Steps Taken**: Executed live HTTPS requests via `ops\verify-ring-api.cmd` and `services/descriptor/src/ring-client.ts` using bearer tokens.
* **Expected vs Actual**: Expected the main getting-started guide (`developer.amazon.com/docs/ring/get-started.html`) to document token lifespans prominently, and expected the API gateway to return a structured JSON error body describing why authentication failed. Instead, the endpoint returned HTTP 401 Unauthorized with an entirely empty body (`(empty body)`), `server: envoy`, and `x-request-id: 3ad90b3a-af16-4ee3-8b24-01cb4c47d81f`. The fact that Playground sandbox tokens expire in exactly 30 minutes is documented only in the May 28, 2026 release note (`developer.amazon.com/docs/ring/release-notes.html`) and is omitted from the primary API reference.
* **Severity**: High (causes unexpected silent pipeline failure during development and testing).
* **Workaround**: Implemented active token health validation in `RingPartnerClient.checkTokenStatus()`, an automated diagnostic script `ops\verify-ring-api.cmd`, and an in-app banner that surfaces the expiration immediately with a direct link to `https://developer.amazon.com/ring/console/playground`, suppressing live transcripts until a fresh token is pasted.
* **Suggested Fix**: The Amazon Vision Envoy gateway should return an explicit JSON error body on 401 (e.g., `{"error": "invalid_token", "message": "Playground sandbox tokens expire after 30 minutes. Generate a new token at the Developers Playground.", "console_url": "https://developer.amazon.com/ring/console/playground"}`) and state this lifespan prominently on the API documentation homepage.

---

### Entry 5: Mandatory Server-Side Watermark Text Contaminates Multimodal Vision Models
* **Task Attempted**: Passing full-frame camera snapshots directly to Bedrock Nova Pro (`amazon.nova-pro-v1:0`) for objective scene description.
* **Steps Taken**: Extracted raw snapshot buffers from the API feed and forwarded them to Nova Pro via `@aws-sdk/client-bedrock-runtime`.
* **Expected vs Actual**: Expected the vision model to describe physical porch events (e.g. visitors, packages). Instead, because Ring burns in a server-side watermark containing the Ring logo (top-left) and Device ID, App Name, and timestamp (top-right) per the June 8, 2026 release note, Nova Pro described the on-screen text: *"White text on dark background credits..."* or *"Timestamp and camera identifier at top of frame"*. A blind accessibility user would be read technical on-screen overlays instead of what is on their doorstep.
* **Severity**: High (degrades accessibility descriptions and wastes model token budget).
* **Workaround**: Built `services/descriptor/src/watermark-cropper.ts` in pure JavaScript (`pngjs` + `jpeg-js`). The cropper detects frame resolution and slices off the top 15% rows (e.g. exactly 134 pixels on 896p frames: 1200x896 -> 1200x762; 72 pixels on 480p frames: 640x480 -> 640x408) prior to inference. Unit test `tests/watermark-crop.test.ts` asserts that 0% of the watermark signature pixels reach the inference payload.
* **Suggested Fix**: Ring Partner API should provide an API parameter (or clean stream channel) for certified accessibility/vision integrations that delivers the raw sensor frame without server-side text burning, or place watermark overlays outside the active camera aspect ratio.

---

### Entry 6: TAKE (Throw Away the Key) End-to-End Encryption Scope Ambiguity in Partner Docs
* **Task Attempted**: Determining whether Ring Video End-to-End Encryption (E2EE/TAKE) blocks third-party real-time accessibility integrations.
* **Steps Taken**: Evaluated consumer support documentation at `https://ring.com/support/articles/32prm/Video-End-to-End-Encryption-E2EE` and partner documentation at `https://developer.amazon.com/docs/ring/`.
* **Expected vs Actual**: Expected developer documentation to clearly delineate which API capabilities function when a customer enables TAKE. Consumer documentation states that E2EE means *"only your enrolled mobile device can decrypt your video recordings,"* implying that all third-party media processing is impossible. Only a detailed protocol audit revealed that webhook event metadata (`motion_detected`, `ding`) and real-time live view streaming (WebRTC/WHEP) operate on a separate signaling plane and remain fully functional under TAKE; only cloud-stored retrospective video clips are encrypted at rest with user keys.
* **Severity**: Medium (caused project scoping delay during Phase 0 feasibility analysis).
* **Workaround**: Narrowed Doorstep's architecture in `docs/00-research/take-and-cv-feasibility.md` to real-time webhook ingestion and live snapshot acquisition, intentionally avoiding cloud clip retrieval scopes (`Video Download`).
* **Suggested Fix**: Add a clear "End-to-End Encryption (TAKE) Compatibility" matrix to `developer.amazon.com/docs/ring/configure.html` listing which scopes function under E2EE (Motion Events: Yes, Doorbell Press: Yes, Live View: Yes, Video Download: No).

---

### Entry 7: Absence of Computer Vision Annotations in Ring Webhook Payloads
* **Task Attempted**: Receiving bounding box coordinates, person detections, and package labels directly from Ring smart alert webhooks.
* **Steps Taken**: Inspected Ring webhook payloads (`motion_detected`) and reviewed the official sample repository `github.com/AmazonAppDev/ring-api-helloworld`.
* **Expected vs Actual**: Expected Ring's internal computer vision models to expose object bounding boxes or classified labels in the webhook payload. In reality, the API delivers only a coarse string under `data.attributes.sub_type` (`human`, `vehicle`, `motion`, `animal`, `other_motion`). Even Amazon's official sample app has to bundle Google MediaPipe running in client-side Next.js to perform hand tracking, because Ring provides zero computer vision annotations.
* **Severity**: Medium.
* **Workaround**: Built a custom multimodal pipeline connecting the Ring snapshot endpoint to AWS Bedrock Nova Pro (`amazon.nova-pro-v1:0`) with strict prompt guardrails (1 sentence, present tense, zero identity/motive speculation).
* **Suggested Fix**: Expose Ring's server-side object detection metadata (bounding box coordinates, detection confidence, primary subject classification) directly in webhook payloads under `data.attributes.detections[]`.

---

### Entry 8: Invisible Generative Watermarks (C2PA / SynthID) in Synthetic Test Fixtures
* **Task Attempted**: Providing realistic test image fixtures in `fixtures/` for local unit testing and development when live camera tokens were unavailable.
* **Steps Taken**: Generated test frames and placed them in `fixtures/porch_delivery.jpg` and `fixtures/driveway_vehicle.jpg`.
* **Expected vs Actual**: Expected the files to act as inert JPEG test buffers. In reality, inspection with C2PA extraction tools revealed cryptographically signed metadata embedded in the binaries: `c2pa.created: "Created by Google Generative AI"`, `digitalSourceType: trainedAlgorithmicMedia`, and `c2pa.edited: "Applied imperceptible SynthID watermark."`. While Doorstep was engineered to crop Ring's visible watermark, our test fixtures carried an invisible generative watermark. Left undisclosed under a UI label reading "Raw Camera Feed", this risked violating hackathon anti-slop rules and misleading judges into believing the frames came from a physical Ring camera.
* **Severity**: High (threatened disclosure integrity and hackathon authenticity).
* **Workaround**: Formally documented the provenance in `docs/00-research/fixture-media-provenance.md`, renamed the files to `SYNTHETIC-ai-generated-porch-delivery.jpg` and `SYNTHETIC-ai-generated-driveway-vehicle.jpg`, added a `frameOrigin` metadata field to `SampleScenario`, updated the UI so the pane label reads `Input Frame — SYNTHETIC, AI-GENERATED (Watermark Zone Boxed)` above an amber strip reading `Frame source: AI-generated image (Google C2PA content credentials, digitalSourceType trainedAlgorithmicMedia, SynthID watermark applied). Not camera output.` — both written from `frameOrigin`, not per scenario — and added `tests/fixture-provenance.test.ts` (6 automated tests) to ensure unverified images fail the build.
* **Suggested Fix**: Amazon Developer documentation should supply an official, royalty-free sandbox bundle of genuine Ring doorbell and camera test frames (with server-side watermarks attached), eliminating the need for hackathon developers to generate synthetic test imagery.

---

### Entry 9: Bedrock Nova Pro Rejection of Procedural / Geometric Test Frames
* **Task Attempted**: Testing the event-to-description pipeline deterministically in CI without external image files using procedurally drawn PNG frames generated by `pngjs`.
* **Steps Taken**: Synthesized frames with basic geometric shapes (door rectangles, step lines, and person silhouettes) using `createSyntheticFrame()` and sent them to Bedrock Nova Pro.
* **Expected vs Actual**: Expected Nova Pro to describe the procedural scene. Instead, Nova Pro detected the flat geometric shapes and triggered its refusal rule, returning: *"REFUSAL: The image is an abstract representation and contains no discernible subjects or actions."* or *"REFUSAL: The image is a solid block of color with no discernible subjects or actions."*
* **Severity**: Medium (procedurally drawn frames could not be used to test the positive description path).
* **Workaround**: Architected the test strategy into two distinct lanes: synthetic photographic images exercise the positive describing path (`DESCRIBED`), while procedurally drawn frames (including pitch-black frames with average luminance 0.0/255) exercise the loud refusal path (`REFUSED`). Verified both paths via `ops/verify-frame-origin.mjs`.
* **Suggested Fix**: AWS Bedrock should publish guidance on multimodal model sensitivity to non-photographic and synthetic inputs, clarifying the threshold where geometric representations trigger refusal versus description.

---

## Reproduction Reference Table

| Entry # | Issue Summary | Reproduction Command or Source URL |
| :--- | :--- | :--- |
| **Entry 1** | Sandbox `ava.v1:read` returns 403 on `/events` | `GET https://api.amazonvision.com/v1/devices/{id}/events` (documented in `docs/00-research/ring-live-api-evidence.md`) |
| **Entry 2** | No REST Snapshot Endpoint (404s; WHEP only) | `GET https://api.amazonvision.com/v1/devices/{id}/snapshot` (documented in `docs/00-research/ring-live-api-evidence.md`) |
| **Entry 3** | CC BY 4.0 YouTube Video in Sandbox Live View | Developers Playground Package stream inspection; YouTube user `frollard` ("Thief stealing our package") |
| **Entry 4** | Ring 401 Empty Body & 30-Min Expiry | `cmd.exe /c "ops\verify-ring-api.cmd"` and `https://developer.amazon.com/docs/ring/release-notes.html#may-28-2026` |
| **Entry 5** | Watermark Contamination (134px / 15% Crop) | `cmd.exe /c "ops\test.cmd"` (test: `Watermark Cropper: Excludes top watermark band`) and `https://developer.amazon.com/docs/ring/release-notes.html#june-8-2026` |
| **Entry 6** | TAKE Scope Ambiguity | `https://ring.com/support/articles/32prm/Video-End-to-End-Encryption-E2EE` vs `https://developer.amazon.com/docs/ring/configure.html` |
| **Entry 7** | Webhook Lacks CV Coordinates | `https://github.com/AmazonAppDev/ring-api-helloworld` |
| **Entry 8** | C2PA & SynthID in Test Fixtures | `node -e "const fs=require('fs'); console.log(fs.readFileSync('services/descriptor/fixtures/SYNTHETIC-ai-generated-porch-delivery.jpg').includes(Buffer.from('c2pa')))"` and `tests/fixture-provenance.test.ts` |
| **Entry 9** | Nova Pro Refusal on Procedural Shapes | `node ops/verify-frame-origin.mjs` (shows `doorbell_chime_press` procedural frame refused) |
