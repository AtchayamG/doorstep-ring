# Phase 0 Feasibility Gate: TAKE Encryption & Ring Computer Vision / Event APIs

**Document:** `projects/02-ring-doorstep/docs/00-research/take-and-cv-feasibility.md`  
**Author:** Antigravity (Implementation Worker)  
**Project:** Project 2 — Ring Track: "Doorstep" (Working Title)  
**Date Retrieved / Evaluated:** 2026-09-14  

---

## Executive Summary

This feasibility study investigates the operational constraints imposed by Ring's **TAKE ("Throw Away the Key")** default end-to-end encryption architecture, the accessibility of Ring's computer vision and object detection capabilities for third-party developers, the virtual emulator / Developers Playground environment, dynamic scope requirements, and portal approval turnaround times.

Each of the five required questions is answered below with **verbatim quotes**, **canonical source URLs**, and the **retrieval date (2026-09-14)**.

---

## Question 1: Under TAKE, what event data can a third-party integration still receive? Event type and metadata only, or frames/thumbnails/video?

### Answer
Under Ring's webhook notification architecture and the TAKE encryption model, a third-party integration receives **event type and metadata only** (event IDs, timestamps, device IDs, account IDs, and coarse detection classification like `human`, `vehicle`, or general `motion`). Webhook event payloads contain **no frames, no image thumbnails, and no video data**.

While separate media endpoints (`/media/video/download`, `/media/image/download`, and WHEP `/media/streaming/whep/sessions`) exist in the Ring Partner API for authorized accounts with active cloud subscriptions, TAKE encryption means Ring temporarily holds video encryption keys in cloud Nitro enclaves only to power active cloud features before permanently deleting them. Under optional full E2EE, cloud-based features and shared user access are completely disabled, though direct client live streaming continues.

### Verbatim Evidence

#### 1. Webhook Payload & Data Attributes
- **Source URL:** `https://developer.amazon.com/docs/ring/api-documentation.html`
- **Retrieval Date:** 2026-09-14
- **Verbatim Quote:**
> ```
> Payload Fields
> Meta Information
> version : Webhook payload version ( 1.1 includes account_id )
> time : ISO 8601 timestamp when Ring sent the webhook
> request_id : Unique identifier for this webhook request (use for idempotency)
> account_id : The Account ID of the Ring user associated with this event
> Event Data
> id : Unique identifier for this specific motion event (format: <device_id>_<sub_type>_<timestamp>)
> type : Always motion_detected for motion events
> sub_type : Classification of the motion detected (for example, motion, human). Returned inside attributes.
> source : Device ID that detected the motion
> source_type : Always devices for device-originated events
> timestamp : Epoch milliseconds when motion was detected
> timestamp_readable : Human-readable rendering of timestamp, for logs and debugging. No timezone offset is included — use timestamp for any time calculation.
> component_ids : Array of strings naming the camera modules that contributed to the event. Present only on multi-camera devices such as Ring Elite. See Multi-Camera Devices.
> ```

#### 2. Button Press Webhook Payload
- **Source URL:** `https://developer.amazon.com/docs/ring/api-documentation.html`
- **Retrieval Date:** 2026-09-14
- **Verbatim Quote:**
> ```
> Payload Fields
> Meta Information
> version : Webhook payload version ( 1.1 includes account_id )
> time : ISO 8601 timestamp when Ring sent the webhook
> request_id : Unique identifier for this webhook request (use for idempotency)
> account_id : The Account ID of the Ring user associated with this event
> Event Data
> id : Unique identifier (format: <device_id>_button_press_<timestamp> )
> type : Always button_press for doorbell press events
> source : Device ID of the doorbell that was pressed
> source_type : Always devices
> timestamp : Epoch milliseconds when the button was pressed
> ```

#### 3. TAKE Encryption Operation & Cloud Video Access
- **Source URL:** `https://www.aboutamazon.com/news/devices/ring-take-encryption`
- **Retrieval Date:** 2026-09-14
- **Verbatim Quote:**
> "With TAKE, your Ring videos are protected with unique, rotating encryption keys. A copy of the keys is temporarily held inside a secure enclave within the cloud; think of it as a sealed vault that can only provide Ring access to the key under strict, limited conditions. Ring can only receive access to power the intelligent features that you have active on your account, and then throws away and deletes the keys. After that, only you—and any trusted Shared Users that you have chosen to enable—retain the keys to your video on your enrolled devices, like your phone, tablet, or computer."
> 
> "End-to-End Encryption for those who want it: Back in 2021, Ring was the first major smart home security provider to offer video E2EE to customers who wanted the highest level of control available—and it will remain in place today as an option. With E2EE enabled, only your enrolled devices ever have access to your encryption keys. Because access is limited by design, Shared Users and cloud-based features are not available. Core functions like live view, playback, and video sharing continue to work seamlessly."

---

## Question 2: Do the Ring computer-vision / object-detection APIs expose results to a third-party integration, or only inside Ring's own apps?

### Answer
Ring's APIs **do not expose detailed computer-vision or object-detection results** (such as bounding boxes, normalized pixel coordinates, facial recognition, or object segmentation) to third-party integrations.

Ring exposes only **coarse categorization labels** via the `sub_type` field in the motion detection webhook and the Event History API: `human`, `vehicle`, `motion`, `animal`, and `other_motion`. Advanced computer vision features (such as Smart Alerts, Package Detection, and intelligent Video Descriptions) operate inside Ring's internal cloud enclaves and are displayed inside Ring's first-party apps.

Third-party integrations requiring object detection or visual AI must pull the video feed (WebRTC WHEP or RTSP) or image snapshots and process frames using their **own computer vision pipeline or client-side models** (as demonstrated by Amazon's official `ring-api-helloworld` sample using MediaPipe Hands).

### Verbatim Evidence

#### 1. Supported Detection Subtypes in Webhooks
- **Source URL:** `https://developer.amazon.com/docs/ring/api-documentation.html`
- **Retrieval Date:** 2026-09-14
- **Verbatim Quote:**
> ```
> Valid sub_type values:
> Sub Type | Description
> motion | General motion detected
> human | Human detected
> vehicle | Vehicle detected
> other_motion | Unable to categorize motion
> Important: sub_type is returned inside attributes — read it as data.attributes.sub_type, not data.subType.
> ```

#### 2. Event History API Subtypes
- **Source URL:** `https://developer.amazon.com/docs/ring/api-documentation.html`
- **Retrieval Date:** 2026-09-14
- **Verbatim Quote:**
> ```
> Event types
> Event Type | Subtypes | Description
> motion | motion.human , motion.vehicle , motion.animal , motion.other_motion | Motion detected by device camera
> on_demand | — | User or partner initiated a live view session
> ding | — | Doorbell button was pressed
> ```

#### 3. Third-Party Media Processing & AI/ML Models
- **Source URL:** `https://developer.amazon.com/docs/ring/release-notes.html` (under section: `June 8, 2026 / API changes`)
- **Retrieval Date:** 2026-09-14
- **Verbatim Quote:**
> "Watermark added to Live Video, Media Clips, and Image Snapshots — All media content delivered through the Ring Partner API now includes a mandatory visible watermark overlay containing the Ring logo (top-left), Device ID, App Name, and timestamp (top-right). This applies to Live Video Streaming, Media Clip downloads, and Image Snapshot downloads. The watermark is applied server-side and cannot be removed. No changes are required to existing API request parameters. Ring developers using AI/ML models to process media content may need to retrain models to account for the watermark overlay."

#### 4. Official Sample Implementation of Third-Party Video Processing
- **Source URL:** `https://github.com/AmazonAppDev/ring-api-helloworld`
- **Retrieval Date:** 2026-09-14
- **Verbatim Quote:**
> ```
> ## Tech Stack
> - Scripts: Python 3.8+ with requests
> - Web App: Next.js 14 (App Router), TypeScript, Tailwind CSS
> - Video: WebRTC (WHEP protocol), MediaPipe Hands
> - Validation: Zod
> - Events: Server-Sent Events (SSE)
> ```
> and
> ```
> ### Refresh Token Mode (Production)
> - Everything above, plus:
> - Webhook Events — Real-time SSE for Ring camera webhooks (motion, doorbell, etc.)
> - Video Processors — Plugin system for real-time video analysis
> - Hand Tracking Game — Catch-the-box game using MediaPipe hand detection
> - Canvas Overlays — Bounding boxes, heatmaps, and visual effects
> ```

---

## Question 3: What exactly does the documented virtual emulator let you simulate — event types, object detection, live frames? Name the page.

### Answer
The documented virtual testing environment is the **Developers Playground** (also referred to in developer terminology as the **Sandbox Environment**).
- **Page Name in Documentation:** "Developers Playground" (in `release-notes.html`) and "Sandbox Environment" (in `get-started.html`).
- **Interactive Console URL:** `https://developer.amazon.com/ring/console/playground`
- **What it lets you simulate:**
  1. **Event Types & Object Detection:** Live view event simulation for **Package**, **Vehicle**, and **Motion** event types.
  2. **Live Frames:** Full **WebRTC/WHEP session workflow and live view streaming**.
  3. **API Exploration & Telemetry:** Interactive API explorer with curl commands and live JSON responses for device, media, and account APIs.
  4. **Access Tokens:** One-click OAuth token generation (valid ~30 minutes) to test all Ring APIs without physical devices, app registration, or subscriptions.

### Verbatim Evidence

#### 1. Developers Playground Release Specification
- **Source URL:** `https://developer.amazon.com/docs/ring/release-notes.html` (under section: `May 28, 2026`)
- **Retrieval Date:** 2026-09-14
- **Verbatim Quote:**
> "May 28, 2026
> Developers Playground
> Released the Playground, a sandbox to test Ring device, media, and account APIs in real-time without creating an app, completing account linking, or having an active Ring subscription. These steps are still required for production deployment.
> Added one-click OAuth token generation (valid 30 minutes), an interactive API explorer with curl commands and live JSON responses, and quick-start links to the Ring MCP server, GitHub sample app, and getting-started guides.
> Added live view event simulation for Package, Vehicle, and Motion event types with full WebRTC/WHEP session workflow and live view streaming."

#### 2. Sandbox Environment Definition
- **Source URL:** `https://developer.amazon.com/docs/ring/get-started.html`
- **Retrieval Date:** 2026-09-14
- **Verbatim Quote:**
> "Sandbox Environment
> A testing environment with synthetic Ring devices and events that allows you to test your integration without affecting real customer accounts or devices. No rate limits apply in sandbox."

#### 3. Playground Token Capability
- **Source URL:** `https://github.com/AmazonAppDev/ring-api-helloworld`
- **Retrieval Date:** 2026-09-14
- **Verbatim Quote:**
> "The Playground gives you a short-lived access token (~30 minutes) that works with all Ring APIs. No app registration, OAuth setup, or client credentials needed — just the token."

---

## Question 4: Does the developer portal need an approved app / dynamic scopes before the emulator works at all, and if so what is the wait?

### Answer
**No.** The Playground / virtual emulator does **not** require an approved app, does **not** require dynamic scopes, and does **not** require app registration, OAuth account linking setup, client credentials, or an active Ring subscription before it works.

- **Emulator / Playground Wait Time:** **0 minutes** (one-click instant access token generation valid for 30 minutes).
- **Developer Account Identity Verification Wait Time:** **Typically completes within minutes** (automated verification using government-issued photo ID).
- **App Certification Wait Time (Production Publication only):** On average, **90% of submissions are reviewed in less than 48 hours**. Certification is only required when publishing public apps to the Ring Appstore, not for development, playground simulation, or staging user testing.
- **Dynamic Scopes Status:** Dynamic scopes are in **Early Access**; developers can select and test them during development and staging, while app publishing is held until general availability.

### Verbatim Evidence

#### 1. Zero Prerequisite for Playground / Sandbox
- **Source URL:** `https://developer.amazon.com/docs/ring/release-notes.html`
- **Retrieval Date:** 2026-09-14
- **Verbatim Quote:**
> "Released the Playground, a sandbox to test Ring device, media, and account APIs in real-time without creating an app, completing account linking, or having an active Ring subscription. These steps are still required for production deployment."

#### 2. No App Registration Needed for Playground Token
- **Source URL:** `https://github.com/AmazonAppDev/ring-api-helloworld`
- **Retrieval Date:** 2026-09-14
- **Verbatim Quote:**
> "The Playground gives you a short-lived access token (~30 minutes) that works with all Ring APIs. No app registration, OAuth setup, or client credentials needed — just the token."

#### 3. Testing Without Certification
- **Source URL:** `https://developer.amazon.com/docs/ring/get-started.html`
- **Retrieval Date:** 2026-09-14
- **Verbatim Quote:**
> "Can I test my application without certification?
> Yes. You can test with your personal Ring account during development. You can also use the sandbox environment with synthetic test data."

#### 4. Account Identity Verification Wait Time
- **Source URL:** `https://developer.amazon.com/docs/ring/get-started.html`
- **Retrieval Date:** 2026-09-14
- **Verbatim Quote:**
> "Account Identity Verification
> Amazon requires all developer accounts to complete identity verification before you can submit apps. This is a one-time process that confirms the account owner's identity using a government-issued photo ID.
> What to expect:
> You'll be prompted to upload photos (front and back) of a valid, unexpired government-issued ID such as a passport, driver's license, or national ID card.
> The full legal name on your Developer Console Company Profile must match the name on your ID exactly.
> Verification typically completes within minutes. You have up to three attempts."

#### 5. Certification Review Wait Time
- **Source URL:** `https://developer.amazon.com/docs/ring/get-started.html`
- **Retrieval Date:** 2026-09-14
- **Verbatim Quote:**
> "How long does certification take?
> On average, 90% of submissions are reviewed in less than 48 hours. You'll be notified by email of status changes. To check your review status, go to the Ring Developer Console, select your app, and click Certify (enabled while certification is in progress)."

#### 6. Dynamic Scopes Early Access Policy
- **Source URL:** `https://developer.amazon.com/docs/ring/configure.html`
- **Retrieval Date:** 2026-09-14
- **Verbatim Quote:**
> "Early Access : Dynamic scopes are in Early Access for developers. You can select and configure scopes now, but apps using them can only be published once dynamic scopes reach general availability for Ring customers."

---

## Question 5: Which of the early-access dynamic scopes (Cameras and Doorbells, Sensors, Chimes) would this need?

### Answer
For Project 2 Doorstep:
1. **Cameras and Doorbells** is **strictly required**. It is toggled as a single unit and grants access to Motion Events, Doorbell press events, Livestream (WebRTC WHEP), and Video Download.
2. **Sensors** is **optional but recommended** if the integration monitors door contact sensors (`Contact Sensors (Indoor & Outdoor)`).
3. **Chimes** is **not needed** because Doorstep routes spoken accessibility notifications to Fire TV via NarraTV's overlay rather than sounding an indoor Ring Chime.
4. **Account and Lifecycle** is **always granted automatically** (covering integration status, device addition/removal, online/offline status, and subscription state).

### Verbatim Evidence

- **Source URL:** `https://developer.amazon.com/docs/ring/configure.html`
- **Retrieval Date:** 2026-09-14
- **Verbatim Quote:**
> ```
> Scopes are organized into four groups. The first three are configurable; the fourth is always granted.
> Cameras and Doorbells
> Requests access to Ring camera and doorbell monitoring capabilities, on all Ring camera and doorbell models. This group is toggled as a whole — individual capabilities cannot be selected separately.
> Capability | What it covers
> Motion Events | Receive events when a camera or doorbell detects motion.
> Doorbell press events | Receive events when a doorbell button is pressed.
> Livestream | Start and view a live video stream from a device.
> Video Download | Download recorded video from a device.
> 
> Sensors
> Requests access to Ring sensor monitoring capabilities. Each sensor type is toggled individually, so you can request only the ones your app needs.
> Sensor | What it covers
> Contact Sensors (Indoor & Outdoor) | Door/window open/close and tamper alerts.
> Flood/Freeze Sensors | Water detection and freeze alerts.
> Temperature & Humidity Sensors | Track temperature and humidity levels and alerts.
> Air Quality Monitors | Track temperature, CO, humidity, and particulate matter.
> 
> Chimes
> Requests access to Ring Chime monitoring and control capabilities, on Ring Chime and Ring Chime Pro.
> Capability | What it covers
> Chime device state and settings | Receive events when chime device state or settings change. Granted with the group.
> Chime Controls | Play and change chime audio, ring tones, snoozes, and audio settings. Selectable after you enable the group.
> 
> Account and Lifecycle
> These event scopes are always available to apps; no configuration is required to enable them.
> Scope | What it covers
> Integration status | Receive events when a user interacts with the app integration.
> Device addition and removal | Receive events when a device is added or removed from a user's Ring account.
> Device statuses | Receive events when a device goes online or offline.
> Subscription changes | Receive events when a Ring subscription changes: upgrades, downgrades, renewals, cancellations.
> ```

---

## Final Feasibility Verdict

GO WITH THIS NARROWER SCOPE. Ring webhook events deliver coarse detection metadata (`sub_type`) while TAKE encryption restricts retrospective cloud video access. Doorstep consumes real-time doorbell and motion events, crops watermark bands from live video frames for Bedrock Nova Pro analysis, and delivers spoken accessibility announcements scheduled into Fire TV viewing gaps.
