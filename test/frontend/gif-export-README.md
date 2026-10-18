# Animated GIF regression test

Run from the repository root after installing the locked development dependencies:

```sh
node test/frontend/gif-export.mjs
```

The test uses Playwright Chromium and Sharp already present in the project. Set
`CHROMIUM_PATH` if Chromium is installed outside Playwright's default location.
The runner also recognizes the existing local Windows and Linux test-browser
locations. It hosts only the local files needed for the test on an ephemeral
loopback port. The default test does not contact an RPC, wallet, image service,
or any other external host.

Coverage includes:

- The actual `site/gif-export.js` browser module and its pinned encoder.
- Native browser SMIL versus exported static-frame screenshots for opacity
  `keyTimes`, negative `begin`, rotate, scale, translate, paced figure-eight
  motion, and smoke path/opacity changes. Isolated fixtures use animation
  definitions from the contract-renderer validation SVG.
- Combined animation from `reports/onchain-metadata-sample.svg` (a generated
  renderer fixture, **not** a live token), every animated `site/lab/assets`
  sample, and a separate saved live-token read.
- Public GGOO token #1 at Base block 52776818. Its saved SVG and read-only
  provenance are `fixtures/ggoo-live-token-1.svg` and its sibling JSON. The
  test verifies the SHA-256 before use. Refreshing this evidence is an explicit
  separate operation through `scripts/read-gif-live-fixture.mjs`.
- Rejection of active/external SVG content, malformed XML, oversized or static
  input, unrevealed art, and invalid token IDs before rendering.
- Pre-cancellation, cancellation between frames, prevention of simultaneous
  exports, recovery after cancellation, monotonic progress, and browser download
  bytes and filename.
- GIF89a decoding, 60 unique frames, 256px dimensions, 100ms frame delays, and
  infinite playback restart. Six decoded GIF frames are compared with native
  screenshots of the saved live SVG, in addition to the static-frame checks.
- X compose URLs with public token-specific links on the custom nested path and
  Vercel root path, without carrying page query parameters into the share URL.

The six-second export preserves the source animation's original timing. It is
an excerpt that restarts, not a claim of a seamless common animation cycle.

Evidence is written to the ignored `artifacts/frontend/gif-export/` directory:

- `live-token-1.gif`: the actual browser download generated from the saved live SVG.
- `live-token-1-contact.png`: decoded GIF frames at 0, 0.7, 1.9, 2.2, 3.3, and 5.9 seconds.
- `report.json`: input hashes and provenance, all native pixel comparisons,
  decoded GIF comparisons, frame/size/progress details, and external requests
  (required to be empty).

The native comparison permits a mean RGB channel difference of at most 1.2 on
the 0–255 scale and at most 3.5% materially differing pixels, accommodating
subpixel rasterization at animated transforms. Decoded GIF checks permit mean
RGBA difference below 2.5 to accommodate palette quantization. Failures retain
paired native/export PNGs for inspection. These checks test browser animation
and GIF output; the application's wallet and token-viewer interaction suites
cover their separate integration behavior.
