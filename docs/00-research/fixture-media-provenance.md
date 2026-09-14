# Provenance — image fixtures in `services/descriptor/fixtures/`

**Status: the two original fixtures are AI-GENERATED IMAGES, not camera frames.**
They may be used as test data. They may **not** be presented as Ring camera
output, and the repository must never again describe them as "camera test
frames" without this qualifier.

Recorded 2026-09-14 by the orchestrator, from the files themselves.

## What the files actually contain

Both JPEGs carry a Google **C2PA Content Credentials** manifest, signed by
`Google C2PA Media Services 1P ICA G3` under `Google C2PA Root CA G3`. Read out
of the binary, the action assertions say:

```
action: c2pa.created
description: "Created by Google Generative AI."
digitalSourceType: http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia

action: c2pa.edited
description: "Applied imperceptible SynthID watermark."
```

`trainedAlgorithmicMedia` is the IPTC code for media produced by a trained
generative model. SynthID is Google's invisible watermark for AI-generated
content. This is not an inference from how the pictures look; it is a
cryptographically signed statement attached by the generator.

| File (original name) | Bytes | Verdict |
| --- | --- | --- |
| `porch_delivery.jpg` | 969,052 | Created by Google Generative AI |
| `driveway_vehicle.jpg` | 1,124,414 | Created by Google Generative AI |

Reproduce with `ops-tools/inspect-c2pa-actions.ps1`.

## Why this mattered enough to stop and write it down

The project README listed them as "Doorbell and driveway camera test frames".
The web surface labelled one pane **"Raw Feed"**. All four evidence screenshots
in `handoff-task16.md` are built on them. Read together, a judge would
reasonably conclude they were looking at real Ring camera output.

Three reasons that is not acceptable here rather than merely untidy:

1. **The hackathon screens for it.** The hosts said on the record that they are
   watching for AI slop and for "glossy video, vapour product". An accessibility
   submission caught presenting generated images as device footage loses on
   credibility, not on code.
2. **This portfolio has already done it once.** Fabrication #1 in Project 1 was
   AI-generated artwork documented as CC-BY. The lesson was supposed to be
   learned.
3. **It is the one thing this project argues against.** Doorstep's headline
   feature is cropping Ring's visible watermark off a frame before inference -
   while the frames themselves carried an invisible generative watermark.

To be fair to the agent that produced them: **synthetic test images are normal
and fine.** The defect is disclosure, not generation. Nothing about having a
generated fixture is wrong; describing it as a camera frame is.

## What changed

- Renamed so the origin travels with the file:
  `porch_delivery.jpg` -> `SYNTHETIC-ai-generated-porch-delivery.jpg`
  `driveway_vehicle.jpg` -> `SYNTHETIC-ai-generated-driveway-vehicle.jpg`
- The surface labels the pane **"Synthetic test frame (AI-generated)"** instead
  of "Raw Feed" whenever the source is one of these files.
- `tests/fixture-provenance.test.ts` fails if any image in `fixtures/` is not
  listed in this document.

## The real fix, and what it needs

These stay as unit-test inputs. The **demo** should run on a genuine frame.

Phase 0 established, with verbatim quotes, that the Ring Developers Playground
offers "live view event simulation for Package, Vehicle, and Motion event types
with full WebRTC/WHEP session workflow and live view streaming", needs no app
registration or subscription, and issues a one-click OAuth token valid 30
minutes.

So the demo frame must come from there:
`https://developer.amazon.com/ring/console/playground`

That click can only be made by a human with the developer account. Until it is,
Doorstep's screenshots are honest about being synthetic, and the project claims
nothing it cannot show.
