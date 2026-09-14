# Video Narration Script & Storyboard — Doorstep (Ring Track)

> **Amazon Developer Hackathon (Build, Ship, Shape 2026)**  
> **Project**: Doorstep (Ring Track — Phase 1)  
> **Deliverable**: `doorstep-demo.mp4`  
> **Author & Narrator Voice**: Atchayam G (solo entrant)  
> **Target Duration**: 2:30 – 2:50 (Hard ceiling: 3:00 / 180s)  
> **Resolution**: 1920x1080 @ 30fps with stereo AAC audio  
> **Voice Engine**: Microsoft Edge Neural TTS (`en-IN-PrabhatNeural`, `--rate=+10%`)

---

## Segment Breakdown & Cue Sheet

| Segment | Cue / Beat Name | Visual Action on Screen | Audio Duration | Segment Window |
| :---: | :--- | :--- | :---: | :---: |
| **1** | `opening_problem` | Title card into live UI at `http://localhost:3002`. Header, badge, and honest 401 token banner. | 23.09s | 0:00 – 0:24 |
| **2** | `webhook_schema` | Select `Courier on Porch with Box (motion: human)`. Click execute. Step 1 JSON viewer highlights `sub_type: "human"`. | 21.53s | 0:24 – 0:46 |
| **3** | `watermark_excision`| Scroll to Step 2. Input frame (15% boxed zone) vs cropped frame. Telemetry bar (134px / 15% excised). | 31.06s | 0:46 – 1:18 |
| **4** | `nova_pro_inference`| Scroll to Step 3 & 4. Green `DESCRIBED` badge, amber C2PA provenance strip, single-sentence output, audio playback. | 23.59s | 1:18 – 1:43 |
| **5** | `loud_refusal` | Select `Pitch Black Frame (Loud Refusal Test)`. Click execute. Crimson `🛑 LOUD REFUSAL TRIGGERED` banner (0.0/255 lux). | 23.23s | 1:43 – 2:07 |
| **6** | `truth_in_advertising`| Overview of interface, amber C2PA warning strip, and live Ring API probe reality (6x 200s, no REST snapshot, WHEP roadmap). | 30.96s | 2:07 – 2:38 |
| **7** | `closing_card` | Closing title card with project name, hackathon track, and author credit. | 6.82s | 2:38 – 2:48 |

---

## Verbatim Narration Transcript

#### Segment 1: The Problem & Overview (0:00 – 0:24)
> *"I am Atchayam, building Doorstep for the Ring track. For a blind or low-vision person, a doorbell notification that says 'motion detected' tells you nothing. You cannot tell if someone is delivering a package, standing at the door, or just passing by. Doorstep turns raw Ring alerts into immediate, objective spoken descriptions."*

* **On-Screen Action**: Opening title card transitions to the real Doorstep web surface at `http://localhost:3002`. Camera highlights the header pill `Ring Track — Phase 1` and the amber `No Valid Ring Playground Token Detected` banner showing active 401 token handling.

---

### Segment 2: Webhook Schema Normalisation (0:24 – 0:46)
> *"In Step 1, we simulate an incoming webhook. The Ring Partner API sends no bounding boxes or object labels — only a coarse sub_type in data.attributes. Doorstep normalizes this schema: extracting 'human' from motion alerts and mapping legacy ding signals to button_press."*

* **On-Screen Action**: User selects scenario `Courier on Porch with Box (motion: human)`. Clicks `⚡ Execute Pipeline`. Step 1 JSON tree reveals `data.attributes.sub_type: "human"`.

---

### Segment 3: Watermark Excision & Telemetry (0:46 – 1:18)
> *"Step 2 solves a key friction. Under Ring's June 2026 spec, every frame carries a mandatory watermark: logo top-left, device timestamp top-right. Multimodal models read this text aloud instead of the porch. Doorstep's pure JavaScript cropper excises the top 15% rows — 134 pixels on 896p frames. Our unit tests prove zero percent of watermark pixels reach the model."*

* **On-Screen Action**: Smooth scroll to Step 2. Left pane displays `Input Frame — SYNTHETIC, AI-GENERATED (Watermark Zone Boxed)` with red dashed overlay. Right pane displays the cropped image. Telemetry bar highlights `Original: 1200x896 | Inference: 1200x762 | Rows Excluded: 134px (15%) | Watermark In Payload: EXCISED (0%)`.

---

### Segment 4: Bedrock Nova Pro Inference & Spoken Caption (1:18 – 1:43)
> *"In Step 3, the cropped frame passes to Bedrock Nova Pro under strict accessibility guardrails: one sentence, present tense, zero identity guessing, and zero motive speculation. Nova Pro returns: 'A man wearing a blue jacket and blue jeans stands on the porch holding a cardboard box.' In Step 4, Doorstep speaks this caption aloud."*

* **On-Screen Action**: Scroll to Step 3. Status shows `DESCRIBED`. The verbatim amber provenance strip is clearly visible directly beneath the frame label: `Frame source: AI-generated image (Google C2PA content credentials, digitalSourceType trainedAlgorithmicMedia, SynthID watermark applied). Not camera output.` Step 4 shows speech synthesis controls.

---

### Segment 5: First-Class Loud Refusal on Pitch-Black Frame (1:43 – 2:07)
> *"Refusal is a first-class citizen in Doorstep. When a camera is obstructed or pitch black, polite fallbacks or unhandled crashes mislead low-vision users. Here, an unlit frame with zero luminance triggers our loud refusal state: displaying a prominent red banner with the exact failure reason and sounding an audible refusal alert."*

* **On-Screen Action**: Select scenario `Pitch Black Frame (Loud Refusal Test)`. Click `⚡ Execute Pipeline`. Step 2 calculates average luminance `0.0 / 255`. Step 3 displays bright red `REFUSED` badge and crimson banner: `🛑 LOUD REFUSAL TRIGGERED` with reason `Frame is pitch black (average luminance 0.0/255). No visual features are discernible.` Step 4 formats speech as refusal alert.

---

### Segment 6: Truth in Advertising — Provenance & API Reality (2:07 – 2:38)
> *"Finally, complete transparency on what is real. No frame came from a live Ring camera. Our photographic fixtures are AI-generated test frames with signed Google C2PA credentials, declared in the amber warning strip. While testing against the Ring Playground proved six authenticated endpoints return 200, Ring provides no REST snapshot endpoint. Live frame capture requires WebRTC WHEP, scoped for Phase 2."*

* **On-Screen Action**: Interface overview highlighting the amber provenance badges, honest status pills, and verified architecture.

---

### Segment 7: Conclusion & Outro (2:38 – 2:48)
> *"Doorstep: built on verified API reality, honest refusals, and genuine accessibility."*

* **On-Screen Action**: Closing title card with project metadata, hackathon track, and credits.

---

## Audio & Video Technical Specifications

* **Container**: MP4 (`ISO/IEC 14496-14`) with `faststart` flag for instant streaming playback.
* **Video Stream**: H.264 (`libx264`), High Profile, Level 4.1, 1920x1080 @ 30.0 fps, CRF 20, Pixel Format `yuv420p`.
* **Audio Stream**: AAC-LC, Stereo, 48000 Hz, 192 kbps, EBU R128 loudness normalized (`-16 LUFS`, True Peak `-1.5 dBTP`).
* **Tooling**: Node.js + `puppeteer-core` (Headless Edge screencast) + `edge-tts` + `ffmpeg`.
