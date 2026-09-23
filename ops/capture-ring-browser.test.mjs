import assert from 'node:assert/strict';
import { test } from 'node:test';
import { negotiatedCodec } from './capture-ring-browser.mjs';

test('reads the first video payload type and its H264 profile from an SDP answer', () => {
  const sdp = 'v=0\r\nm=video 9 UDP/TLS/RTP/SAVPF 102 96\r\na=rtpmap:96 VP8/90000\r\na=rtpmap:102 H264/90000\r\n' +
    'a=fmtp:102 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=64001F\r\n';
  assert.equal(negotiatedCodec(sdp), 'H264 64001f');
});

test('reports a non-H264 codec without a profile', () => {
  assert.equal(negotiatedCodec('v=0\nm=video 9 UDP/TLS/RTP/SAVPF 96\na=rtpmap:96 vp8/90000\n'), 'VP8');
});

test('returns null when there is no video section', () => {
  assert.equal(negotiatedCodec('v=0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\n'), null);
  assert.equal(negotiatedCodec(''), null);
});
