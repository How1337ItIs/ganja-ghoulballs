# Ganja Ghoulballs frontend verification

## Production state

The checked-in site is a **predeployment preview**. `site/config.json` contains no live GGOO, vault, renderer or backdrop addresses. Approval and mint remain disabled. The hero and four art-sample cards are exact native SVG outputs from local EVM renderer fixtures, visibly labeled “Illustrative artwork” / “Art samples.” They are not minted tokens or selected-recipe forecasts.

The browser enables writes only after all of the following pass:

- Base mainnet (8453) RPC identity and the exact original collection address.
- Published state `deployed-verified`, four distinct local deployment addresses plus the pinned external VRF wrapper, with five actual deployed-runtime Keccak hashes.
- Deployed code at each address matches its published hash.
- Collection, graveyard, renderer/backdrop and oracle immutable wiring, deployment chain ID, 420 cap, 13-original mint requirement, art version and fixed VRF request parameters match.
- Before either approval or mint review/send: enabled/configured provider, pinned coordinator, and an explicit-gas-price oracle quote within the immutable cap and publisher-funded reserve.
- A successful in-range supply read, the current wallet on Base, exactly 13 owned IDs, current approvals, and explicit action-specific confirmation.

Runtime hashes must be captured from the actual deployed contracts. Compiler runtime templates with unresolved immutables are not valid live hashes.

## UX and transaction protections

- Full checksum wallet/recipient address, explicit account chooser, manual fallback, Base switching and local disconnect.
- Transfer-log ownership discovery with progress, range fallback, candidate checkpoint cache and onchain current-owner verification. Manual IDs reject zero, out-of-range, duplicate, malformed and excess IDs without truncation.
- Broad `setApprovalForAll` consent clearly states that it covers all current and future originals. Approval never automatically proceeds to mint.
- A separate mint review lists all 13 IDs, the exact recipient and vault, permanent-loss consequences, 0 ETH protocol fee and additional Base gas.
- Account/chain/selection generation guards invalidate stale verification and consent. Wallet, code, supply, ownership and approval are rechecked before sends, followed by exact transaction simulation and gas estimation. Every wallet transaction is explicitly pinned to Base.
- Pending intent is durably written and read back before the wallet opens. Unavailable/full storage blocks sending. Transport errors and malformed hashes keep writes locked across reload until the user checks wallet history, supplies an exact matching transaction hash, or explicitly confirms that nothing was submitted.
- Receipts are tracked using the snapshotted recipient even after account changes. Mint success requires both the correct zero-address Transfer event and exact 13-ID `GhoulballsSacrificed` provenance event from the correct collection. A mismatched receipt locks further minting instead of claiming success.
- Onchain gallery loads three SVG reads at a time near the viewport. Cache keys include Base, collection, main runtime hash, renderer runtime hash, token ID and motion mode. The optional artwork cache is capped at 24 entries. Native loops play by default per the owner’s design direction; an explicit Pause/Play choice switches native still/animated outputs and persists for the tab session. Pending cocoons are never cached as immutable final art.
- Token provenance view shows pending/revealed state, native art, current owner/original minter, exact mint block, request ID, collection/vault addresses, all 13 original NFT links, Basescan and share controls. Final seed, genome, donor lineage and mutations appear only after the read-only reveal confirms.
- Originals are irrevocably locked at the successful mint receipt, even during delayed or permanently missing oracle fulfillment. Reveal never requires a second user transaction. See [v3 reveal integration](FRONTEND_REVEAL_QA.md) for the full state/cache model.

## Automated browser QA

Run `npm run test:frontend` (or `node test/frontend/mobile-wallet.mjs`). Install Playwright Chromium first on a clean machine; `CHROMIUM_PATH` can select an existing executable. The supplied environment uses the existing cached headless Chromium binary. No browser download or live signing is required.

The completed 2026-10-18 launch-copy checkpoint passed 67 scenarios, plus an actual-EVM lineage decoding fixture and static invariants. Earlier 39-scenario autoplay reports are historical; the current reveal/fee/race coverage is described in [Frontend reveal integration](FRONTEND_REVEAL_QA.md). Current coverage includes:

- Responsive screenshots at 320, 360, 390, 412, 768 and 1440 CSS pixels, no horizontal overflow, and untruncated full addresses.
- Rejected wrong chain, wrong runtime, wrong immutable wiring, missing hashes, wrong original source and wrong 13-for-1 count.
- Account chooser success, cancellation and unsupported/manual fallback; network switching; inventory discovery and selection.
- Exact 13-ID calldata and selector `0x04266e47`; zero ETH value; explicit `chainId: 0x2105`.
- Separate collection-wide approval, explicit irreversible review, successful recipient/provenance receipt parsing.
- Account changes during verification/review/gas estimation; sold-out and unknown supply; wallet rejection.
- Pending receipt account changes and reload restoration; uncertain transport/invalid-hash outcomes; reverted and wrong-recipient receipts.
- Cancel/Escape dismissal without signing; failed durable browser storage preventing a send.
- Two-timestamp native SVG pixel comparison: moving art changes while the explicitly paused native still output stays identical.

Additional coverage includes mounted root/nested navigation, fee-quote consistency, provider changes during review, uncached cocoons, stale pending SVG rejection, precise uint256 genealogy and pending/revealed screenshots.

Screenshots and machine-readable output: `artifacts/frontend/`.

## Verification limits

All wallet actions and Base RPC responses in these browser tests are mocked. No actual wallet signature, approval, original NFT transfer or mainnet mint was submitted. This is not a physical Android/iOS wallet test. Mainnet deployment, actual runtime publication, explorer verification and a final live read-only integration check remain separate release steps. No minted count or deployed status should be claimed until those steps succeed.
