# Review — Task 15 Phase 0, Ring / TAKE feasibility gate

Reviewed 2026-09-14 by the orchestrator.

## Verdict: **APPROVED. GO, with the narrowed scope agy proposed.**

The task said every one of the five questions had to carry a verbatim quote with
a live URL and a retrieval date, and that I would open each URL and check the
quote word for word — a paraphrase presented as a quote fails. I did that.

**The quotes are real.** Spot-checked against the live pages, the load-bearing
ones first:

| Claim | Source | Result |
| --- | --- | --- |
| Developers Playground: sandbox "without creating an app, completing account linking, or having an active Ring subscription" | `release-notes.html` | **Verbatim** |
| One-click OAuth token, "valid 30 minutes" | `release-notes.html` | **Verbatim** |
| "live view event simulation for Package, Vehicle, and Motion event types with full WebRTC/WHEP session workflow" | `release-notes.html` | **Verbatim** |
| Mandatory burned-in watermark on all Partner API media, incl. "may need to retrain models" | `release-notes.html` | **Verbatim** (entry is dated June 8 2026; agy cited the page but not the date) |
| "Scopes are organized into four groups. The first three are configurable; the fourth is always granted." | `configure.html` | **Verbatim** |
| Cameras and Doorbells "toggled as a whole — individual capabilities cannot be selected separately", 4 capabilities | `configure.html` | **Verbatim** |
| Dynamic scopes Early Access: publishable only at general availability | `configure.html` | **Verbatim** |

This is a real improvement on Task 14, where the protocol work was sound but the
reporting on top of it asserted a comparison the client had never made. Here the
evidence holds up under checking.

## What the gate actually settled

1. **Hardware was never the blocker and now neither is onboarding.** The
   Playground needs no app, no account linking, no subscription, and no
   certification. Wait time is zero; the token lasts 30 minutes.
2. **Ring will not hand us computer vision.** Third parties get event type plus
   a coarse `sub_type` — `motion`, `human`, `vehicle`, `other_motion`. No
   bounding boxes, no package/face detail. Anything richer is our own pipeline
   over a frame we pull ourselves. That is fine: it is also the honest framing,
   and it is what Amazon's own `ring-api-helloworld` does with MediaPipe.
3. **TAKE does not block the design we want.** Webhook metadata is unaffected,
   and live view keeps working. What TAKE removes is cloud access to stored
   video, which this project does not need.

## The finding in here that Phase 1 must design around

agy surfaced it and then did not draw the consequence, so I will: **every frame
the Partner API gives us has a watermark burned in server-side** — Ring logo
top-left, Device ID, App Name and timestamp top-right, and it "cannot be
removed".

We are about to send those frames to Bedrock Nova Pro and ask what is in them.
Nova Pro reads text in images. Left alone it will describe the watermark, and a
blind user will be told the picture contains the word "Ring" and a device
identifier. That is not a hypothetical: the Fire TV track already produced
lines like *"White text on black background credits two people"* because the
model faithfully described on-screen text nobody wanted described.

So Phase 1 crops the watermark bands before inference, and asserts in a test
that a frame containing watermark text does not yield a description mentioning
it. Ring's own release note says as much — "may need to retrain models to
account for the watermark overlay" — which is Amazon telling us this will bite.

## Two corrections to the document itself

1. The watermark entry is dated **June 8, 2026**, not undated. Cite the date the
   way the Playground entry was cited; a dated release note is stronger evidence.
2. The verdict paragraph is one 90-word sentence inside parentheses. It is the
   single most important line in the file and it should be readable — restate it
   as three short sentences.

## Scope discipline for Phase 1

Phase 1 is the Ring event → description service, proven end to end against the
Playground, with its own surface. **It does not touch the Fire TV APK.** Project
1 is being frozen for its submission video; integrating Doorstep into that
binary now would risk the entry that is furthest along, to accelerate the one
that is furthest behind. The Fire TV hand-off is Phase 2, and only once Projects
1 and 3 are submitted.
