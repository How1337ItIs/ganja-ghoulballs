# Originals mint and token export review candidate

Baseline: GGOO `ddaf3d204b8b21c87650c1a89fd06665ce6c353c`; helper source/build from `How1337ItIs/ghoulbatch-minter` at `9a3422c54145118d012649e6a64b4068e3d605e5`. This candidate is for review. No branch update, website publication, signing, or real NFT transaction was performed.

## Original acquisition

The existing mint section now offers 1–30 original Ghoulballs in a separate review. The exact connected account receives the originals. The application sends one Base contract-creation request with explicit chain ID, captured sender, no `to`, zero value, and the pinned helper creation bytes plus the ABI-encoded quantity. No approval, signature, GGOO mint, automatic selection, or permanent lock accompanies this action.

The original contract limits `mintTo` by caller, not recipient. The unchanged helper creates one child per original; each child calls the fixed original collection with the helper deployer's address as recipient. Both the helper supply check and original contract enforce the cap. A failure rolls the entire creation back. Contract-wallet recipients must support creation and ERC-721 receiving. Upstream describes the helper as unaudited; deterministic checks and our tests are not a claim of a third-party audit.

The browser pins original runtime code and helper source hash/compiler/ABI/creation hash. It rechecks context after each asynchronous preflight boundary and repeats supply, exact-transaction simulation, and fee checks after review. Gas limits use the successful creation estimate plus 20%, bounded by 16,777,216. The displayed L2 estimate is separate from a conservative total reserve using Base GasPriceOracle L1 upper-bound/operator reads and a further 20% balance buffer. No fixed gas fallback is used. The wallet displays the final fee; an increased reserve requires fresh review.

Original mint readiness is independent of GGOO supply, reserve, and approval gates. All write/account controls share one busy/pending lock. Original intents are persisted and read back before the send request, under a fixed Base/original-collection key, and restored before configuration fetch. Unknown send outcomes and malformed hashes remain locked. Recovery checks exact sender, chain, input, zero value, and creation target. An explicit history acknowledgment can clear an unsent request; nothing retransmits automatically. A present contradictory transaction or mismatched receipt remains locked for review. A temporarily absent transaction lookup retries read-only.

Success requires exactly the requested number of unique original-collection mint Transfer events, zero address to the captured recipient, with valid IDs. Inventory refresh cannot inject NFTs into another connected account. The separate GGOO approval and permanent-lock review remain unchanged. Source review caught and fixed configuration-dependent recovery, stale recovery callbacks overwriting newer pending state, and receipt-before-transaction indexing handling; the regression suite covers these cases.

## GIF and X

Revealed token pages offer a local 256px, 60-frame, six-second GIF excerpt. The loop restarts; it is not a seamless common cycle. The exporter samples actual SVG animation attributes and paths into static frames, then encodes with pinned local gifenc 1.0.3. It does not repeatedly capture an animated image's first frame, change onchain art, or upload artwork to a rendering service. It rejects unsupported/active/external SVG content and has progress, cancellation, single-export locking, and memory/output bounds. Pending or invalid SVG export is explicit. X opens a token-specific compose intent for the user to review; users attach the GIF themselves. See `GIF_EXPORT.md`.

## Reproduce

Use Node 24.x and `npm ci --ignore-scripts --include=dev`, then `npm run build`. The build regenerates the existing genetics fixtures before art export so a fresh checkout preserves the canonical lab manifest. `.gitattributes` keeps source bytes LF on Windows, preventing unchanged Solidity metadata/hash drift. The helper and GIF vendor integrity checks run during build.

Run `npm run check`, `npm run test:originals`, `npm run test:gif`, and `npm run test:frontend`. Playwright Chromium must be installed; `CHROMIUM_PATH` can select an installed browser. The existing mobile suite serves the built `dist` output. New originals tests fulfill all requests from fixtures and prohibit external requests. Optional live evidence scripts use read-only RPC methods only.

Validation: 28 helper VM cases; 79 new original-wallet browser cases; 107 existing GGOO browser cases plus 6 actual token-page export cases; 14 GIF groups with 72 native-frame comparisons; existing lineage fixture test; static invariants; and 22,188 genetics assertions. GIF verification includes the saved revealed production token #1, decoded 60 unique frames, and smoke, spin, blink, drip, and figure-eight comparisons. Mobile 320/390 review, pending, and confirmation screens were visually checked. Physical MetaMask/mobile-device signing was not tested; all wallet requests and transactions in browser tests are mocked.

Read-only evidence at Base block 52,776,764 found original supply 229/6,667 and GGOO 3/420, with 13 originals per GGOO and the original code hash verified. This is a snapshot, not a reservation. Reports include the exact block and limits.

## Publication boundary

Root coordinates final review and any later branch update. Hermes retains custom-domain publication ownership. Preserve the existing art, config, contract/deploy assets, unrelated routes, headers, redirects, and worker. The release delta is the three main frontend files plus new original-mint/GIF modules, helper JSON/source, and the local GIF encoder/license. No authentication or security configuration changes are needed.
