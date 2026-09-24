# Product Feedback — Ring Partner API, AWS Bedrock, & Developer Toolchain

> **Amazon Developer Hackathon (Build, Ship, Shape 2026)**  
> **Project**: Doorstep (Ring Track — Phase 1)  
> **Author**: Atchayam G (solo entrant)  
> **Rules Requirement**: Mandatory Product Feedback (Rule Requirement 4) covering every tool, API, and SDK used in this build.

---

## Tool-by-Tool Evaluation

### 1. Ring Partner API & Developers Playground
* **What Worked Well**:
  * **Six Clean REST Discovery Endpoints (HTTP 200)**: With a live Playground bearer token (`ava.v1:read`), six endpoints round-tripped with HTTP 200 and standard Envoy response headers: `GET /devices`, `GET /locations`, `GET /users/me`, `GET /devices/{id}/capabilities`, `GET /devices/{id}/status`, and `GET /devices/{id}/configurations`. The JSON:API response structure is clean and predictable, and the Doorbell Pro status returned `online: true` within ~300ms.
  * **Zero Physical Hardware Gate**: The Developers Playground (`developer.amazon.com/ring/console/playground`) is an exceptional developer feature. Being able to test device discovery and explore WHEP streaming without buying or mounting physical doorbells saves days of setup time.
  * **Active Live View Simulation**: The sandbox initiates real WebRTC WHEP sessions (`POST /devices/{id}/media/streaming/whep/sessions` returning HTTP 201 Created) for Package, Vehicle, and Motion event types.
* **What Needs Improvement**:
  * **Event History Works, but the Sandbox Has No Motion Events**: The documented `GET /v1/history/devices/{id}/events` returned HTTP 200 with the Playground token (7 events, all `on_demand`). We first called an undocumented `/v1/devices/{id}/events`, got 403, and wrongly blamed the scope. The sandbox device records no motion or doorbell events, so an event-driven pipeline still cannot be tested end to end.
  * **Historical Snapshot Access in the Playground**: The [documented](https://developer.amazon.com/docs/ring/api-documentation.html) `POST /devices/{id}/media/image/download` exists. Our 2026-09-23 Playground request returned HTTP 303, but its signed download returned 416 for the latest image in the past 24 hours. The earlier 404s came from guessed GET paths and did not prove endpoint absence. The test did not yield a still for this accessibility pipeline; WHEP negotiation separately returned 201 with an SDP answer, but no frame was received.
  * **Undocumented CC BY 4.0 Third-Party Footage in Live View Simulation**: The sandbox video stream is a licensed Creative Commons clip (*"Thief stealing our package" by YouTube user frollard, CC BY 4.0 / clipped from original*). This attribution requirement is absent from the API documentation and portal guides, creating unexpected copyright compliance obligations for developers capturing frames for training datasets, test fixtures, or public demos.
  * **30-Minute Token Lifespan & Silent 401 Body**: Sandboxed tokens expire in 30 minutes without warning, and the API gateway returns HTTP 401 with `server: envoy` and an entirely empty response body (`(empty body)`). Developers are left guessing why a previously working script failed.
  * **Mandatory Server-Side Watermark**: Burning text (Ring logo, Device ID, timestamp) into media frames per the June 8, 2026 release note contaminates downstream multimodal AI models, forcing developers to build custom crop pipelines.
  * **Absence of Computer Vision Metadata**: Webhook alerts provide only a single coarse string under `data.attributes.sub_type` (`human`, `vehicle`, etc.). There are no bounding boxes, coordinates, or confidence scores.
* **Onboarding Experience**: Smooth in the console itself, but the relationship between consumer End-to-End Encryption (TAKE) and partner API scopes is ambiguous across documentation portals.
* **Testing**: Good interactive curl explorer in the Playground, but lacks an automated local webhook forwarding agent.
* **Reliability**: Envoy proxy gateway demonstrated sub-300ms response times and 100% uptime throughout testing.
* **Would You Build With It Again?**: Yes. The software sandbox makes the Ring Track viable for remote developers; accessible event history and a reproducible Playground snapshot would improve single-frame testing. The earlier suggestion to add a snapshot endpoint was based on incorrect GET probes.

---

### 2. Amazon Bedrock (`amazon.nova-pro-v1:0`) & `@aws-sdk/client-bedrock-runtime`
* **What Worked Well**:
  * **Unified Converse API**: The `ConverseCommand` interface is vastly superior to legacy `InvokeModel`. It accepts binary image buffers directly in memory (`source.bytes: Uint8Array`), eliminating base64 string manipulation or intermediate S3 uploads.
  * **Prompt Adherence & Guardrails**: Nova Pro adhered strictly to our accessibility guidelines (exactly one sentence, present tense, zero identity guessing, zero motive speculation) across all photographic test frames.
  * **Built-in Refusal Discipline**: When presented with unreadable or pitch-black frames, Nova Pro reliably followed instructions to emit a structured `REFUSAL:` prefix rather than hallucinating descriptions.
* **What Needs Improvement**:
  * **Latency Variance**: Inference latency ranged between 3.5s and 5.8s on 896p frames. While acceptable for asynchronous smart-home announcements, sub-2s latency is necessary for immediate doorbell ringing chimes.
  * **Refusal on Flat/Geometric Inputs**: Nova Pro refused procedurally drawn geometric scenes (*"abstract representation"*), requiring photographic test imagery to exercise positive description paths.
* **Onboarding Experience**: Once IAM credentials and `us-east-1` region were configured, calling Bedrock in TypeScript required fewer than 30 lines of code.
* **Testing**: Easily mocked using `aws-sdk-client-mock`, and reliable against real endpoints with low token costs.
* **Reliability**: 100% success rate on valid inputs with zero dropped requests.
* **Would You Build With It Again?**: Yes. Nova Pro offers an outstanding balance of multimodal accuracy, prompt guardrail adherence, and cost.

---

### 3. Node.js 22, TypeScript 5.7, & `tsx`
* **What Worked Well**:
  * **Native ESM & Zero-Build Dev**: Running modern TypeScript via `tsx src/index.ts` enabled instantaneous execution without waiting for compilation steps during active development.
  * **Modern Type Safety**: Strong typing across incoming webhook payloads and image processing buffers caught integration bugs early.
* **What Needs Improvement**:
  * **TypeScript 5.7 `response.json()` Type Change**: In modern TypeScript, `response.json()` returns `unknown` instead of `any`. This caught an initial compile error during `tsc` build on `data.devices`, requiring explicit schema validation or type casting.
  * **Windows Shell Scripts**: Windows PowerShell blocks `.ps1` files by default (`PSSecurityException`), requiring operational commands to be wrapped in `.cmd` scripts calling `npm.cmd`.
* **Onboarding Experience**: Fast, standard npm workflow.
* **Testing**: Node 22 native test runner works out of the box with `tsx --test`.
* **Reliability**: 100% reliable across all operational scripts.
* **Would You Build With It Again?**: Yes. Node 22 + TypeScript + `tsx` is the fastest backend developer stack available.

---

### 4. Express (v4.21)
* **What Worked Well**:
  * **Simplicity & Versatility**: One minimal service handles REST webhook endpoints, image analysis pipelines, and serves the static compiled Vite web surface from `apps/surface/dist`.
  * **Large Payload Support**: Configured `express.json({ limit: '25mb' })` effortlessly handles high-resolution base64 camera frames without memory leaks.
* **What Needs Improvement**:
  * **Async Error Handling**: Express 4 requires manual `try/catch` wrappers in async route handlers to avoid unhandled promise rejections (an issue resolved in Express 5).
* **Onboarding Experience**: Universal, zero learning curve.
* **Testing**: Clean lifecycle management with `server.listen()` and `server.close()`.
* **Reliability**: 100% stable.
* **Would You Build With It Again?**: Yes, for compact microservices.

---

### 5. Vite (v6.4.3)
* **What Worked Well**:
  * **Blazing Fast Builds**: Compiled the complete production accessibility surface in **109ms** (`dist/index.html` 12.04 kB, `dist/assets/index-DIRdjYCk.js` 12.01 kB, `dist/assets/index-Cw4WqIJl.css` 12.28 kB). *(Note: `package.json` declares `"vite": "^6.2.0"`, which npm resolved to `v6.4.3` at installation).*
  * **Seamless Proxying**: Built-in development server proxy (`/api` -> `http://127.0.0.1:3002`) avoided CORS issues during frontend development.
* **What Needs Improvement**:
  * In dual-service setups, relative path resolution for preview and static distribution requires explicit base directory configuration.
* **Onboarding Experience**: Instant setup with `npm create vite`.
* **Testing**: Integrated type-checking via `tsc && vite build`.
* **Reliability**: 100% reliable.
* **Would You Build With It Again?**: Yes, the gold standard for frontend bundling.

---

### 6. Native `node:test` & `node:assert`
* **What Worked Well**:
  * **Blistering Execution Speed**: Executed 17 test suites (image cropping, refusal states, webhook normalization, token verification, fixture provenance) in **1.28 seconds**.
  * **Zero Heavy Dependencies**: Completely avoided Jest's complex VM modules, Babel transformations, and configuration overhead.
* **What Needs Improvement**:
  * Does not provide high-level DOM matchers out of the box (unlike Jest/Vitest testing-library extensions).
* **Onboarding Experience**: Zero setup—built directly into Node.js.
* **Testing**: Deterministic and lightweight.
* **Reliability**: 100%.
* **Would You Build With It Again?**: Yes. For backend services, `node:test` is vastly superior to Jest.

---

### 7. Pure JavaScript Image Processing (`pngjs` & `jpeg-js`)
* **What Worked Well**:
  * **Zero Native C++ Dependencies**: Bypassed native node-gyp compilation entirely. Libraries like `sharp` or `canvas` frequently fail to build on Windows developer environments; `pngjs` and `jpeg-js` installed in seconds without a C++ compiler.
  * **Direct Pixel Buffer Slicing**: Slicing raw RGBA buffer rows (`croppedRgba = rawRgba.subarray(startByteOffset)`) executed in under 40ms.
* **What Needs Improvement**:
  * `jpeg-js` encoding is slower and produces slightly larger file sizes than native libjpeg-turbo.
* **Onboarding Experience**: Standard npm packages.
* **Testing**: 100% deterministic cross-platform unit test assertions.
* **Reliability**: Completely stable.
* **Would You Build With It Again?**: Yes. Cross-platform reliability outweighs native C++ speed for microservice crop workloads.

---

### 8. `puppeteer-core` (v24)
* **What Worked Well**:
  * **Zero Redundant Downloads**: Leveraged the existing system Edge/Chrome browser (`msedge.exe`), avoiding 300MB Chromium downloads.
  * **Automated Evidence Capture**: Automated end-to-end user flows, captured high-DPI screenshots, and generated SHA-256 evidence hashes in under 20 seconds.
* **What Needs Improvement**:
  * Requiring custom path detection for host system browsers on Windows machines.
* **Onboarding Experience**: Lightweight (~4s install).
* **Testing**: Perfect for headless verification.
* **Reliability**: 100% stable.
* **Would You Build With It Again?**: Yes, preferred over full Puppeteer for lightweight CI and verification scripts.

---

## Prioritised Feature Requests

### Priority 0 (Critical Developer Experience)
1. **Ring Partner API — Generate Test Events in the Playground**:
   * *Problem*: Event history is readable (`GET /v1/history/devices/{id}/events`, 200), but the sandbox device logs only `on_demand` live-view events. There is no way to produce a motion, doorbell or package event to test an event-driven pipeline.
   * *Proposed Solution*: Add a "Trigger Test Event" button that writes a motion or doorbell event to history and delivers it to the app's webhook. Also return 404, not 403, for undocumented routes: a 403 on our guessed path cost us a wrong conclusion.
2. **Ring Partner API — Reproducible Playground Snapshot**:
   * *Problem*: The documented historical image-download POST returned 303, then its signed download returned 416 for the latest image in the preceding 24 hours. That proves the route is documented and reachable, but it did not provide a frame for this sandbox test.
   * *Proposed Solution*: Supply a Playground snapshot with a known timestamp or a clearly documented way to create stored test media for the image-download endpoint.
3. **Ring Partner API — Informative JSON Response on 401**:
   * *Problem*: Expired or missing sandbox tokens return HTTP 401 with an empty body (`(empty body)`).
   * *Proposed Solution*: Return a structured payload: `{"error": "unauthorized", "message": "Playground sandbox token expired after 30 minutes", "playground_url": "https://developer.amazon.com/ring/console/playground"}`.

### Priority 1 (High Value Enhancements)
4. **Ring Developer Portal — Document Third-Party Sandbox Media Licensing**:
   * *Problem*: The Playground live view simulation uses a Creative Commons clip (*"Thief stealing our package" by YouTube user frollard, CC BY 4.0*), but this attribution requirement is not documented in the developer guides.
   * *Proposed Solution*: Document sandbox video licensing terms directly in `developer.amazon.com/docs/ring/`, or supply public-domain test video streams.
5. **Ring Partner API — Watermark Bypass Parameter for AI/CV Partners**:
   * *Problem*: Mandatory server-side burned-in watermarks corrupt multimodal AI models, forcing developers to crop 15% of the frame and discard image data.
   * *Proposed Solution*: Provide an authenticated API parameter (e.g. `?watermark=none` or a clean raw stream) for verified accessibility and computer-vision partners.
6. **Ring Partner API — Direct Computer Vision Metadata in Webhooks**:
   * *Problem*: Webhook metadata provides only coarse strings (`human`, `vehicle`).
   * *Proposed Solution*: Expose Ring's internal bounding box coordinates and object confidence scores under `data.attributes.detections[]`.

### Priority 2 (Ecosystem Polish)
7. **Developers Playground — Configurable Sandbox Token Lifespan**:
   * *Problem*: 30 minutes is too short for sustained debugging or demonstration sessions.
   * *Proposed Solution*: Allow developers to select an 8-hour or 24-hour token duration in the Developers Playground for active hackathons and development sprints.
8. **Amazon Bedrock — Synthetic/Procedural Input Guidance**:
   * *Problem*: Nova Pro refuses procedural geometric drawings without clear error boundary documentation.
   * *Proposed Solution*: Publish documentation outlining visual complexity thresholds for multimodal prompts.
9. **Ring Developer Portal — Official Royalty-Free Sandbox Media Fixtures**:
   * *Problem*: Developers without hardware must resort to synthetic generation, risking C2PA / generative watermark issues.
   * *Proposed Solution*: Provide an official, downloadable bundle of real Ring camera test clips and snapshots with watermarks for CI test suites.
