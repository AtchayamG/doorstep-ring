# YouTube upload — Doorstep demo video

Written 2026-09-21, after an audit found this was the only one of the four
projects with no upload record. The video was already live; its title,
description and tags existed **only on YouTube**, which meant a lost or
re-uploaded video would have had to be reconstructed from memory. Recovered
from the live video and written down here.

**File**: `docs/06-demo-submission/doorstep-demo.mp4`, re-cut 2026-09-24 (175.74s = 2:55.7, 1920x1080 @ 30fps, AAC 48 kHz stereo).
Segments 1-5 are the 2026-09-15 cut, unchanged; segment 6 and the closing card are new.

**Thumbnail**: `docs/assets/thumbnail-youtube.png` (476 KB)

**Audio**: integrated -16.1 LUFS (measured with ffmpeg ebur128 on the re-cut). No remaster needed.




4.3 seconds under the 3:00 hard limit. There is no room to add anything without cutting something.



## Visibility

**Public.** The rules require a publicly viewable video and a judge following
the Devpost link must not hit a sign-in wall.

## Title

```
Doorstep — a Ring doorbell that says what it sees, and refuses when it can't
```

## Description

```
Doorstep turns a Ring motion alert into an immediate, objective spoken description for blind and low-vision users — and refuses out loud when the frame cannot be described.

"Motion detected" tells a blind person nothing. Someone delivering a package, someone standing at the door, and someone walking past all produce the same notification. Doorstep normalises the Ring webhook, excises the mandatory watermark band before inference, asks Amazon Bedrock Nova Pro for one factual present-tense sentence, and speaks it.

What this demo shows, in order:
0:00  The problem, and the honest 401 state when no sandbox token is set
0:24  Ring webhook schema normalisation — sub_type "human" out of data.attributes
0:46  Watermark excision: the top 15% (134px on an 896px frame) never reaches the model
1:18  Nova Pro under accessibility guardrails, and the audit that checks them
1:43  A pitch-black frame: first-class loud refusal, not a polite fallback
2:11  A real Ring frame from the Developers Playground (over WHEP), described by Nova Pro
2:48  Close

Two things worth your time:

THE GUARDRAILS ARE MEASURED, NOT ASSERTED. The surface used to print three green ticks — "No Identity Speculation", "No Motive/Intent Guessing", "Present Tense" — hardcoded in the HTML, under a description the app never inspected. Nova Pro returned "A man wearing a blue jacket and jeans…", which is an appearance-derived identity claim a blind user cannot check, and the green tick above it certified that this had not happened. There is now a real checker: it flags gendered, age and occupation claims, motive language, and past tense or multi-sentence output, and names the offending token. In this video you can watch it flag our own headline description in amber. A tick nothing measures is worse than no tick.

ONE REAL RING FRAME, AND WHAT IS STILL GENERATED. At 2:11 Doorstep opens a WebRTC WHEP session on the Ring Developers Playground sandbox device, decodes one 1280x720 frame and runs it through the same pipeline. The first time, Nova Pro refused it, because our prompt told the model to expect a person; after the fix it describes the frame 6 times out of 6. It is a sandbox stream, not a customer camera, and the Playground clip is "Thief stealing our package" by frollard, CC BY 4.0. The two photographic presets are AI-generated test frames with signed Google C2PA content credentials, labelled on screen. The Playground token also returned 200 on six discovery endpoints and on event history. Evidence for every number is in the repo.

Amazon "Build, Ship, Shape" Developer Hackathon 2026
Track: Ring · Mini: Open Source
Entrant: Atchayam G (solo)

Narration synthesized with Microsoft Edge Neural TTS.
```

## Tags

```
Ring, video doorbell, accessibility, blind, low vision, audio description, Amazon Bedrock, Nova Pro, C2PA, assistive technology, MCP, hackathon
```

## Settings that matter

- Visibility: **Public**
- Audience: **No, it's not made for kids**
- Altered or synthetic content: **Yes** — the narration voice is synthesized and
  the photographic fixtures are AI-generated. Both are stated on screen.
- Category: **Science & Technology**
- Thumbnail: upload `docs/assets/thumbnail-youtube.png`
- Comments: leave on

## Uploaded

**Re-cut pending upload (2026-09-24).** Previous upload: https://youtu.be/4qkuwQc-QwM (2:50, 2026-09-15 cut; its narration wrongly said Ring has no snapshot endpoint). Replace this line with the new link once the re-cut is live.

Carried into the Devpost **submission** record and the Devpost **project**
record. Those are two separate records on Devpost: the video link does **not**
propagate between them (the description does). Updating only the submission is
what left project 4's public page playing a superseded cut for days while every
save reported success. If this video is ever replaced, update both:

1. `/submit-to/30992-.../manage/submissions/1183973-doorstep/project_details/edit`
2. `/software/doorstep-xpsj2o/edit`  ← this is what the public gallery renders

Then verify by reading the iframe `src` on the public page. A saved field is not
a refreshed embed.

## Resolved 2026-09-24: Ring API use is now in the video

The re-cut shows a real Ring frame arriving over WHEP and being described (2:11), and the closing card lists the
six discovery endpoints and event history returning 200. The token banner still shows for the reused segments,
which is accurate: the app holds no token at runtime; the capture script uses a hidden-prompt token and exits.