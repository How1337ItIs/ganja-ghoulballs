# Frontend v3 reveal integration

This is development-only source. `site/config.json` remains `awaiting-contract-deployment` with no main collection, vault, renderer, backdrop or request-price cap. It cannot enable approvals or minting. Do not publish a live configuration until actual deployed code and immutable settings are independently verified.

## Trust and transaction boundaries

- The client verifies Base 8453, the exact original collection, 420 maximum supply and 13 originals per mint.
- Four collection runtime identities are required: collection, graveyard, renderer and backdrop. The pinned external VRF wrapper is the fifth code identity; its runtime hash is fixed in the client and must match the deployment record.
- Wiring checks include renderer → backdrop, collection → wrapper, immutable request cap, callback gas 100,000, three confirmations, one word and art-version v3.
- Before showing either approval or irreversible-mint review, the client checks the current oracle quote, reserve balance, provider configured/enabled status and expected coordinator. It rechecks runtime/wiring, all original owners, quote/reserve/provider and wallet identity before sending either transaction. Pricing uses the wrapper’s explicit-gas-price estimator at a fresh Base gas price; that exact gas price is sent with simulation, wallet gas estimation and the transaction. Wallet fee edits can alter the quote, so the contract’s cap and reserve check remain the final protection.
- The minter sends exactly zero ETH protocol value. Publisher-funded oracle reserve is separate. No reserve-funding transaction is initiated by the mint client.
- The existing durable pre-send intent, uncertain-wallet handling, chain ID, account/selection snapshots, exact receipt event validation and no-automatic-retry boundaries remain. A successful exact mint receipt clears the transaction lock independently of eventual reveal. A pending or ambiguous transaction never clears merely because an oracle state changed.

## Pending and revealed NFTs

- A successful receipt confirms a pending NFT and permanent lock of the 13 originals. The UI explicitly states that originals cannot be recovered while awaiting randomness and that oracle failure can leave the NFT unrevealed permanently.
- There is no pre-mint offspring predictor, final-art preview, cancel, reroll, second request or finalize transaction.
- Pending artwork is read from `svg`/`svgStill` but is never stored in the persistent or in-memory immutable-art cache. Revealed artwork is cached by Base chain, collection address, main runtime, renderer runtime, art version, token and motion mode.
- Visible pending tokens and the latest confirmed mint are checked read-only every 12 seconds while the tab is visible, and on returning to it. Failed reveal reads remain pending; they never initiate a transaction.
- `revealed(tokenId)` is authoritative, not the entropy or seed being nonzero. `seedOf`, `genomeOf` and parent chromosome reads are not attempted for pending tokens.
- After reveal, the page reads actual onchain parent genes and donor indexes, displays all 13 original links, the parent digest, full decimal genome/seed and full decimal mint-block provenance. Chromosome decoding uses `BigInt` throughout and validates version, counts, donor bounds and active ball indexes.
- Dominance and bounded mutations are described as artistic rules. Displayed donor colors are distinguished from the final polygenic mix and possible body-tint mutation.

## Motion

Native SVG loops play by default, including on reduced-motion devices, per the owner's explicit design direction. The compact Pause/Play control switches all five home specimens and onchain gallery/provenance between native animated/still output. An explicit choice persists in the tab session across root and nested route navigation. No CSS-generated replacement animation is used.

## Local validation

Run `npm run test:frontend` for mocked browser tests, `node test/frontend/lineage.mjs` for the captured actual EVM chromosome fixture, and `npm run check` for static invariants. The fixture uses a mocked EIP-1193 wallet and mocked Base RPC with the public wrapper runtime as verification input. No real wallet approval, NFT transfer, oracle request, funding or deployment is performed.

The completed 2026-10-18 automatic-inventory checkpoint passed all 89 browser scenarios, the actual-EVM chromosome fixture, and static invariants (`npm run test:frontend && npm run check`). Browser results report zero page errors and zero live transactions. Screenshots and machine-readable results are written to `artifacts/frontend/`. Application SHA256 at this checkpoint: `6b890b4e861bd22333f8e21ff1f398810fe2bf309d18708972e25c085d51bab6`.
