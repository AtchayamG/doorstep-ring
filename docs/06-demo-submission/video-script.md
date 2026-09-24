# Video Narration Script & Storyboard — Doorstep (Ring Track)

> **Amazon Developer Hackathon (Build, Ship, Shape 2026)**  
> **Project**: Doorstep (Ring Track)
> **Deliverable**: `doorstep-demo.mp4`  
> **Author**: Atchayam G (solo entrant)  
> **Narrator Voice**: Microsoft Edge Neural TTS (`en-IN-PrabhatNeural`)  
> **Target Duration**: under 3:00 (Hard ceiling: 180s; Actual: 2:55.7 / 175.74s, re-cut 2026-09-24)
> **Resolution**: 1920x1080 @ 30fps with stereo AAC audio  
> **Voice Engine**: Microsoft Edge Neural TTS (`en-IN-PrabhatNeural`, `--rate=+12%` / `--rate=+15%`)

---

## Segment Breakdown & Cue Sheet

| Segment | Cue / Beat Name | Visual Action on Screen | Audio Duration | Segment Window |
| :---: | :--- | :--- | :---: | :---: |
| **1** | `opening_problem` | Title card into live UI at `http://localhost:3002`. Header, badge, and honest 401 token banner. | 23.64s | 0:00 – 0:25 |
| **2** | `webhook_schema` | Select `Courier on Porch with Box (motion: human)`. Click execute. Step 1 JSON viewer highlights `sub_type: "human"`. | 21.14s | 0:25 – 0:47 |
| **3** | `watermark_excision`| Scroll to Step 2. Input frame (15% boxed zone) vs cropped frame. Telemetry bar (134px / 15% excised). | 30.50s | 0:47 – 0:78 |
| **4** | `nova_pro_guardrail_audit`| Scroll to Step 3 & 4. Green `DESCRIBED` badge, amber `Identity inference: 'man'` pill, green motive/tense pills, spoken caption. | 29.18s | 0:78 – 1:07 |
| **5** | `loud_refusal` | Select `Pitch Black Frame (Loud Refusal Test)`. Click execute. Crimson `🛑 LOUD REFUSAL TRIGGERED` banner (0.0/255 lux). | 22.82s | 1:07 – 1:31 |
| **6** | `real_ring_frame` | Re-recorded 2026-09-24. Select `Ring Playground WHEP sandbox capture`, execute. The real Playground frame (captured over WHEP) is cropped and described by Nova Pro; guardrails pass; on-screen credit for the CC BY 4.0 Playground clip. | 35.90s | 2:11 – 2:48 |
| **7** | `closing_card` | Closing card (re-rendered 2026-09-24): six discovery endpoints and event history return 200; one real WHEP frame; AI-generated presets labelled; Edge TTS disclosure. | 6.70s | 2:48 – 2:56 |

---

## Verbatim Narration Transcript

#### Segment 1: The Problem & Overview (0:00 – 0:25)
> *"Doorstep is an accessibility vision narrator built for the Ring track by Atchayam G. For a blind or low-vision person, a doorbell notification that says 'motion detected' tells you nothing. You cannot tell if someone is delivering a package, standing at the door, or just passing by. Doorstep turns raw Ring alerts into immediate, objective spoken descriptions."*

* **On-Screen Action**: Opening title card transitions to the real Doorstep web surface at `http://localhost:3002`. Camera highlights the header pill `Ring Track — Phase 1` and the amber `No Valid Ring Playground Token Detected` banner showing active 401 token handling.

---

### Segment 2: Webhook Schema Normalisation (0:25 – 0:47)
> *"In Step 1, we simulate an incoming webhook. The Ring Partner API sends no bounding boxes or object labels — only a coarse sub_type in data.attributes. Doorstep normalizes this schema: extracting 'human' from motion alerts and mapping legacy ding signals to button_press."*

* **On-Screen Action**: User selects scenario `Courier on Porch with Box (motion: human)`. Clicks `⚡ Execute Pipeline`. Step 1 JSON tree reveals `data.attributes.sub_type: "human"`.

---

### Segment 3: Watermark Excision & Telemetry (0:47 – 0:78)
> *"Step 2 solves a key friction. Under Ring's June 2026 spec, every frame carries a mandatory watermark: logo top-left, device timestamp top-right. Multimodal models read this text aloud instead of the porch. Doorstep's pure JavaScript cropper excises the top 15% rows — 134 pixels on 896p frames. Our unit tests prove zero percent of watermark pixels reach the model."*

* **On-Screen Action**: Smooth scroll to Step 2. Left pane displays `Input Frame — SYNTHETIC, AI-GENERATED (Watermark Zone Boxed)` with red dashed overlay. Right pane displays the cropped image. Telemetry bar highlights `Original: 1200x896 | Inference: 1200x762 | Rows Excluded: 134px (15%) | Watermark In Payload: EXCISED (0%)`.

---

### Segment 4: Bedrock Nova Pro Inference & Active Guardrail Audit (0:78 – 1:07)
> *"In Step 3, the cropped frame passes to Bedrock Nova Pro. Asked for no identity speculation, the model still returned: 'A man wearing a blue jacket and jeans stands on the porch holding a cardboard box.' Inferring gender is identity speculation. Doorstep now actively audits compliance instead of asserting it: motive and tense pass green, but identity turns amber, flagging 'man'. In Step 4, Doorstep speaks the caption aloud."*

* **On-Screen Action**: Scroll to Step 3. Status shows `DESCRIBED`. The description text is displayed with three measured guardrail badges below: the amber `Identity inference: 'man'` pill, and two green passing pills (`No Motive Guessing`, `Single Present-Tense Sentence`). The amber C2PA provenance strip is clearly visible directly beneath the frame. Step 4 shows speech synthesis controls.

---

### Segment 5: First-Class Loud Refusal on Pitch-Black Frame (1:07 – 1:31)
> *"Refusal is a first-class citizen in Doorstep. When a camera is obstructed or pitch black, polite fallbacks or unhandled crashes mislead low-vision users. Here, an unlit frame with zero luminance triggers our loud refusal state: displaying a prominent red banner with the exact failure reason and sounding an audible refusal alert."*

* **On-Screen Action**: Select scenario `Pitch Black Frame (Loud Refusal Test)`. Click `⚡ Execute Pipeline`. Step 2 calculates average luminance `0.0 / 255`. Step 3 displays bright red `REFUSED` badge and crimson banner: `🛑 LOUD REFUSAL TRIGGERED` with reason `Frame is pitch black (average luminance 0.0/255). No visual features are discernible.` Step 4 formats speech as refusal alert.

---

### Segment 6: A Real Ring Frame, Described (2:11 – 2:48)
> *"Now a real Ring frame. On the Ring Developers Playground sandbox device, Doorstep opens a live WebRTC WHEP session, decodes one frame, and runs it through the same pipeline. The watermark band is cut away, and Nova Pro describes the parcel on the snowy steps. The first time, it refused, because our prompt had told the model to expect a person. We fixed the prompt, and it now describes this frame six times out of six. The two photographic presets are still AI-generated test frames, labelled on screen."*

* **On-Screen Action**: Scenario `Ring Playground WHEP sandbox capture`, sub_type shown as none (no Ring event exists for this frame). Step 2 shows the 1280x720 Playground frame with the 108-row watermark band excised; Step 3 shows `DESCRIBED` with Nova Pro's sentence about the package on the snowy steps and three green guardrails. A top-right credit reads: Frame source: Ring Developers Playground sandbox stream (not a customer camera). Clip: "Thief stealing our package" by frollard, CC BY 4.0. Segments 1-5 are reused unchanged from the 2026-09-15 cut.

---

### Segment 7: Conclusion & Outro (2:48 – 2:56)
> *"Doorstep: built on verified API reality, honest refusals, and genuine accessibility."*

* **On-Screen Action**: Closing title card with project metadata, hackathon track, credits, and Neural TTS disclosure.

---

## Audio & Video Technical Specifications

* **Container**: MP4 (`ISO/IEC 14496-14`) with `faststart` flag for instant streaming playback.
* **Video Stream**: H.264 (`libx264`), High Profile, Level 4.1, 1920x1080 @ 30.0 fps, CRF 20, Pixel Format `yuv420p`.
* **Audio Stream**: AAC-LC, Stereo, 48000 Hz, 192 kbps, EBU R128 loudness normalized (`-16 LUFS`, True Peak `-1.5 dBTP`).
* **Tooling**: Node.js + `puppeteer-core` (Headless Edge screencast) + `edge-tts` + `ffmpeg`.
