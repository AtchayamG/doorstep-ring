# Ring Partner API — what a live Playground token actually returns

Recorded 2026-09-14. Every line below is output from a real HTTPS request made
with a Ring Developers Playground OAuth token, not from documentation.

The token itself is never stored in this repository. It was held in a file
outside the project tree, expires 30 minutes after issue, and is read-only. Its
own JWT payload declares:

```
scopes  : ava.v1:read
issuer  : RingOauthService-prod:us-east-1:1.0.3328.0
lifetime: 1800s
```

Reproduce with `node ops-tools/ring-live-probe.mjs` and
`node ops-tools/ring-media-probe.mjs` (both in the workspace ops-tools folder,
outside this repo, because they need a token path).

---

## 1. Authenticated round-trips that succeeded

Base: `https://api.amazonvision.com/v1`

| Request | HTTP | `server` | Content type | Bytes |
| :--- | :--- | :--- | :--- | :--- |
| `GET /devices` | **200** | `envoy` | `application/json` | 2291 |
| `GET /locations` | **200** | `envoy` | `application/json` | 344 |
| `GET /users/me` | **200** | `envoy` | `application/json; charset=utf-8` | 324 |
| `GET /devices/{id}/capabilities` | **200** | `envoy` | `application/json` | 1440 |
| `GET /devices/{id}/status` | **200** | `envoy` | `application/json` | 453 |
| `GET /devices/{id}/configurations` | **200** | `envoy` | `application/json` | 1449 |

Each response carried a distinct `x-request-id`, e.g. `/devices` returned
`d5791cac-8808-4824-aad8-1cf7486f1682`.

**This supersedes the earlier README row.** Until today the strongest claim this
project could make was that an unauthenticated probe returned HTTP 401, which
only proved a gateway existed. These are authenticated reads returning real
account data.

Device ids, location ids and account ids are omitted here deliberately —
they are account identifiers, and a provenance document is not the place for
them.

### Shape of what came back

`GET /devices` is JSON:API shaped — `data[]` with `type`, `id`, `attributes`,
`relationships`, plus a `meta.time` server timestamp. The sandbox account holds
exactly one device:

- `attributes.name`: `Playground Device`
- `attributes.image_url`: a Ring CDN image identifying it as a **Doorbell Pro**
- `relationships`: `capabilities`, `status`, `location`, `configurations`, each
  with a `links.related` path to follow

`capabilities.attributes` declares which detectors exist, with `null` for the
ones this device does not have:

- present: `audio`, `video`, `motion_detection`, `image_enhancements`
- `null`: `flood_detection`, `smoke_detection`, `co_detection_listener`,
  `battery_status`, `glass_break_detection`, `tamper_detection`,
  `contact_detection`, `freeze_detection`

`status.attributes` reported `online: true` with `reported_at`
`2026-09-14T16:36:05Z` — about a minute before we read it.

---

## 2. What the read scope will not give you

| Request | HTTP | Reading |
| :--- | :--- | :--- |
| `GET /devices/{id}/events` | **403** | **Not the documented route.** Ring documents event history at `GET /v1/history/devices/{id}/events`, which returned **200** (section 2a). A made-up route returns 404, so this 403 means something else, and we do not know what. It does not show a missing scope. |
| `GET /devices/{id}/snapshot` | 404 | No such route. |
| `GET /devices/{id}/media` | 404 | No such route. |
| `GET /devices/{id}/recordings` | 404 | No such route. |
| `GET /events` | 404 | No such route. |

### 2a. Event history at the documented path (2026-09-24)

`ops/probe-ring-events.mjs`, run through `ops/with-ring-token.ps1` with a fresh Playground token.
Status-only output:

```text
Device list: HTTP 200
Documented  GET /v1/history/devices/{id}/events: HTTP 200; content-type application/json
  items: 7; top-level keys: data
  item keys: attributes, id, meta, relationships, type; attribute keys: end, event_type, is_third_party_reviewed, start
  event types: event_type=on_demand, type=history-events
Old guess   GET /v1/devices/{id}/events: HTTP 403; content-type (none)
Control     GET /v1/devices/{id}/no-such-route: HTTP 404; content-type (none)
```

Event history is readable with `ava.v1:read`. Every event is `on_demand` (a live-view session);
the sandbox device has no motion, doorbell or package events.

The 403/404 split matters: a 403 says "this exists and you may not", a 404 says
"this is not the endpoint you think it is". **Correction (2026-09-23):** those
GET 404s did not test the [documented historical image-download POST](https://developer.amazon.com/docs/ring/api-documentation.html).
Our `latest_in_range` request for the preceding 24 hours returned HTTP 303,
then the signed download returned HTTP 416 (no media in that range). The earlier
"no REST route" conclusion was incorrect. The published demo still runs on
fixtures because no Ring image was obtained.

---

## 3. Live media is WHEP; historical image download is a separate POST

The Playground's "Simulate live view event" offers three events — **Package**,
**Vehicle**, **Motion** — and each starts a real WHEP session. Captured from
the Playground's own request panel while a stream was running:

```
POST https://api.amazonvision.com/v1/devices/{deviceId}/media/streaming/whep/sessions
Authorization: Bearer <token>
Content-Type: application/sdp

HTTP/1.1 201 Created
Content-Type: application/sdp
Location: https://api.amazonvision.com/v1/devices/{deviceId}/media/streaming/whep/sessions/{sessionId}
```

Live frames arrive over WebRTC after an SDP offer/answer exchange. The image
download route is separate and searches historical media; it is not a simple
GET for a current live frame.

**A frame was received on 2026-09-23** with `ops/capture-ring-browser.mjs` (headless Chrome is the
WebRTC peer; the token stays in Node). Status-only output:

```text
Device list HTTP: 200
WHEP session HTTP: 201
Negotiated codec (answer): H264 64001f
Decoded frames: 15; ICE: connected; codec (stats): video/H264
Frame: 1280x720; luma mean 122, std 46; blank: false
Captured JPEG: ops/captures/ring-playground-whep.jpg (156133 bytes)
WHEP session close HTTP: 200
```

The `werift` capture client's offer on the same date got **HTTP 500**. Its offer lists VP8 and a
single H264 profile (`42e01f`). Chrome's offer lists every H264 profile, including `64001f`, which
is the one the Playground answered with. Our reading is that the server could not match its
stream to the shorter list, and it answered 500 rather than a 4xx. We have not confirmed this
with Ring.

We confirmed the stream plays: a 1280x720 track rendered in the Playground with
the mandatory Ring watermark in the top-right corner and a `Front` camera label
bottom-left — which is exactly the band
`services/descriptor/src/watermark-cropper.ts` is designed to excise. The cropper
was checked against the captured Ring frame on 2026-09-23. It removed 108 of 720 rows, and
the Ring logo, `Device-ID` and `Partner` text are gone from what the model receives (see
`docs/assets/ring-playground-frame-model-view.jpg`). The `Front` label and the bottom-right
timestamp are outside the band and remain.

### Amazon's own live-view footage is a licensed YouTube clip

The Playground labels the Package stream, on the page, directly under the video:

> "Thief stealing our package" by YouTube user frollard, used under CC BY 4.0 /
> clipped from original.

Worth stating plainly for anyone building against this sandbox: the live-view
simulation is not camera output either. It is a Creative-Commons video played
through the real media pipeline. If a submission ships a frame from it, CC BY
4.0 attribution is required — the same obligation this project already carries
for the Blender films in Project 1.

### Why there is no captured frame in this repository

We tried to lift a frame out of the running stream programmatically and
stopped. The Playground page sets a Content Security Policy that blocks
`fetch`/XHR to a local receiver, blocks `fetch` on `data:` URLs, denies
clipboard writes, and blocks `window.open`, and the browser we drove does not
deliver `<a download>` files to disk. A frame relayed as base64 through the
automation channel arrived corrupted at a chunk boundary, and a corrupted
fixture presented as a real Ring frame would be worse than no fixture at all.

The correct fix is not a screenshot. It is to obtain and decode a frame through
an authorized media route, then label its origin precisely (a Playground
sandbox stream is not a customer camera). The guard test in
`services/descriptor/tests/fixture-provenance.test.ts` already refuses to let
any disk fixture claim `ring-live`.

---

## 4. Consequences for this project

1. The README's Ring row is upgraded from "401 proves a gateway" to six
   authenticated endpoints returning real data, with request ids.
2. `ava.v1:read` can read event history at the documented
   `/v1/history/devices/{id}/events` (200 on 2026-09-24; only `on_demand` events). Our earlier
   "needs a broader scope" reading came from an undocumented path.
3. The official API documents historical image download via POST. In the
   Playground test it returned 303 then 416 for the preceding 24 hours; WHEP
   returned a 201 SDP answer. The earlier "no snapshot endpoint" claim was wrong.
   WHEP did yield a frame on 2026-09-23, via the browser-built offer (section 3).
4. The watermark band our cropper removes is confirmed present, in the expected
   corner, on a genuine Ring stream.
5. One frame comes from Ring: the Playground sandbox stream (CC BY 4.0 clip, credited in
   README), not a customer camera. The two fixtures remain
   AI-generated and are labelled as such everywhere they appear — see
   [`fixture-media-provenance.md`](fixture-media-provenance.md).
