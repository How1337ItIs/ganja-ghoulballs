# Local GIF export

`site/gif-export.js` makes a viewing derivative from the revealed token's actual
animated SVG, passed by the verified onchain read flow. It never changes NFT
metadata, contacts a rendering service, invokes a wallet, or posts to X.

The output is a **six-second excerpt at 256 × 256, 10 fps, 60 frames**. It loops
by restarting the excerpt. Independent native animation periods do not all end
at six seconds, so this is explicitly not advertised as a seamless loop. Native
timing, negative begin offsets, linear/keyTimes interpolation and paced motion
paths are preserved. There is no re-timing or invented animation.

Canvas does not reliably capture a running SVG image's animated state. Instead,
`prepareSvgAnimation` samples native `animate`, `animateTransform`, and
`animateMotion` into deterministic static SVG snapshots. Each snapshot is
rasterized once and encoded as its own GIF frame. SVG path geometry uses the
browser's `getTotalLength` / `getPointAtLength` paced distance metric.

The strict accepted vocabulary matches immutable GooRenderer: native path,
circle, rect and group geometry; opacity, compatible path morphs, replacement
translate/scale/rotate transforms, and paced motion paths. Script, foreignObject,
image, style, href, CSS, resource URLs, external namespaces, DTD/entities,
overlapping transforms, unsupported timing and unknown elements or attributes
are rejected before any insertion or image decoding. The code checks revealed
status, title/token number, viewBox and animation presence. Unknown future art
must fail visibly rather than silently export the first frame.

Bounds: one export per tab, 750,000 SVG characters, 6,000 geometry/animation
nodes, 160 animations, and 8 MB of encoded output. Only one RGBA frame is held
at a time; frames yield to the browser so cancel/progress controls remain usable.
All temporary rasterization blob URLs are revoked in `finally`. The token page
retains the completed GIF behind a persistent **Save GIF** link, so a browser
that suppresses the automatic download still allows a direct user click without
re-rendering or another RPC read. The result is cleared when the token view is
replaced, the route changes, or a new export starts. A result clicked within the
last second receives the remainder of that one-second download handoff window
before its URL is revoked. A new export waits for any pending handoff before rendering, so at most one
completed or retiring result is retained, subject to the 8 MB output cap. Cancellation and errors do not
expose a save link. The standalone `downloadTokenGif` helper retains its existing
one-minute URL handoff; the token page uses `createTokenGif` and owns its result.

## Encoder provenance and reproduction

Vendored dependency: [mattdesl/gifenc](https://github.com/mattdesl/gifenc), version
**1.0.3**, dependency-free published ESM, MIT license included alongside it.
No CDN or package fetch occurs in the production browser or ordinary site build.

Published archive: `https://registry.npmjs.org/gifenc/-/gifenc-1.0.3.tgz`

Published npm integrity (SHA-512 base64):

```
sha512-xdr6AdrfGBcfzncONUOlXMBuc5wJDtOueE3c5rdG0oNgtINLD+f2iFZltrBRZYzACRbKr+mSVU/x98zv2u3jmw==
```

To reproduce the two vendored files, download this exact archive, verify the
above integrity, extract `package/dist/gifenc.esm.js` to
`site/vendor/gifenc-1.0.3.js` and `package/LICENSE.md` to
`site/vendor/GIFENC-LICENSE.md` without modifying bytes. Validate with:

```
node scripts/check-gif-vendor.mjs
node test/frontend/gif-export.mjs
```

The regular site copy step ships the local module, encoder and license under
both the nested custom-domain path and root Vercel path. The tests decode the
generated GIF and compare deterministic frame snapshots to native paused SVG
rendering, including real renderer smoke, blink, drip, spin and figure-eight
motion. Browser artifact output is under `artifacts/frontend/gif-export/`.

The live test fixture `test/frontend/fixtures/ggoo-live-token-1.svg` was read from
the deployed collection at Base block **52,776,818**. Its sibling JSON records
the collection/renderer runtime hashes, reveal status, read time and SVG SHA-256.
The collection and renderer code hashes matched the pinned production config.
The optional `node scripts/read-gif-live-fixture.mjs` refreshes this fixture using
only public `eth_call`, `eth_getCode`, chain-ID and block-number reads. Normal
tests use the checked-in fixture and do not need network access or a wallet.

`buildTokenShareUrl` preserves the current public origin/path, removes query
parameters, and points at `#token/<id>`. X receives only a caption and public
link via its compose intent; the user reviews/publishes. Web intents do not
attach GIFs. The user may attach the downloaded file themselves.
