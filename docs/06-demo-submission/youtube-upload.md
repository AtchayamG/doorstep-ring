# YouTube upload — Doorstep demo video

Written 2026-09-21, after an audit found this was the only one of the four
projects with no upload record. The video was already live; its title,
description and tags existed **only on YouTube**, which meant a lost or
re-uploaded video would have had to be reconstructed from memory. Recovered
from the live video and written down here.

**File**: `docs/06-demo-submission/doorstep-demo.mp4` (12.3 MB / 12,846,498
bytes, 170.000s = 2:50.0, 1920x1080 @ 30fps, AAC 48 kHz stereo)

**Thumbnail**: `docs/assets/thumbnail-youtube.png` (476 KB)

**Audio**: integrated -16.0 LUFS, true peak -3.7 dBTP. This is close to
YouTube's normalisation target and needs no remaster. (For contrast, P1 shipped
at -19.9 LUFS and had to be re-mastered — see that project's upload doc for why
a low-LUFS master reaches the viewer quiet.)

10.0 seconds under the 3:00 hard limit. **There is no room to add a segment
without cutting one**, which matters for the open item at the bottom of this
file.

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
2:07  What is real and what is generated — signed C2PA provenance on every fixture
2:38  Close

Two things worth your time:

THE GUARDRAILS ARE MEASURED, NOT ASSERTED. The surface used to print three green ticks — "No Identity Speculation", "No Motive/Intent Guessing", "Present Tense" — hardcoded in the HTML, under a description the app never inspected. Nova Pro returned "A man wearing a blue jacket and jeans…", which is an appearance-derived identity claim a blind user cannot check, and the green tick above it certified that this had not happened. There is now a real checker: it flags gendered, age and occupation claims, motive language, and past tense or multi-sentence output, and names the offending token. In this video you can watch it flag our own headline description in amber. A tick nothing measures is worse than no tick.

NO FRAME CAME FROM A LIVE RING CAMERA. The photographic fixtures are AI-generated test frames carrying signed Google C2PA content credentials, declared on screen in an amber strip on every frame that uses one. Testing against the Ring Developers Playground returned 200 on six authenticated discovery endpoints. Ring also documents `POST /media/image/download`; our 2026-09-23 request returned 303, then its signed download returned 416 for the past 24 hours. WHEP returned 201 with an SDP answer, but no frame was received. The published video predates this correction; its narration about there being no snapshot endpoint is wrong. The evidence and correction are in the repo.

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

**https://youtu.be/4qkuwQc-QwM** — public, 2:50, confirmed live 2026-09-21.

Carried into the Devpost **submission** record and the Devpost **project**
record. Those are two separate records on Devpost: the video link does **not**
propagate between them (the description does). Updating only the submission is
what left project 4's public page playing a superseded cut for days while every
save reported success. If this video is ever replaced, update both:

1. `/submit-to/30992-.../manage/submissions/1183973-doorstep/project_details/edit`
2. `/software/doorstep-xpsj2o/edit`  ← this is what the public gallery renders

Then verify by reading the iframe `src` on the public page. A saved field is not
a refreshed embed.

## OPEN ITEM — the strongest evidence is not in the video

The token-missing banner occupies roughly the top 18% of the frame for all 170
seconds, headlined **"No Valid Ring Playground Token Detected"**. The small
print underneath is honest and on-message — "live Ring API snapshots are
honestly blocked (HTTP 401). No canned live responses are fabricated" — and the
refusal is genuinely the feature.

But the video never shows the six Ring endpoints that **really did return HTTP
200** on 2026-09-14: `/devices`, `/locations`, `/users/me`, and a device's
`/capabilities`, `/status` and `/configurations`, each with `server: envoy` and
a distinct `x-request-id`, against a Doorbell Pro reporting `online: true`.
That is in `docs/00-research/ring-live-api-evidence.md` and in the README — but
Stage 1 of the judging is **pass/fail on real use of the track's APIs**, and the
rules say judges may score from the video and description alone. So the
strongest Stage-1 evidence this project has was missing from the artifact most
likely to be scored.

**Mitigated 2026-09-21 without a re-upload**: that evidence now appears in the
Devpost description at roughly character 700 instead of 4862, directly under
"What it does", together with an explicit explanation of why the video shows the
401 banner. A judge who sees the red banner and then reads the description now
finds the answer immediately rather than two-thirds of the way down.

**If this video is ever re-cut**, the fix is an 8-second full-screen card
showing those six 200s with their request ids. Note the constraint: at 170s
there are only 10s of headroom, and the assembly overlays cards onto one
continuous screencast (`ops/video/assemble.mjs`) rather than concatenating
segments, so a new card means either replacing a stretch of screencast or
re-recording. The narration is already timed to `vo-manifest.json`, so a new
card needs a matching voice line or it will play under narration about something
else.
