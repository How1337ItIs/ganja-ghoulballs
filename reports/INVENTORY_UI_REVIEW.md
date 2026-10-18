# Owned-inventory UI review

Result: **GO for publication of the exact frontend checkpoint below.** No open blocking finding. This addendum covers the new inventory selection UI; the prior 67-scenario frontend report remains a historical checkpoint.

## Independent evidence

- 89 mocked browser/mobile scenarios passed, plus the actual local-EVM lineage fixture and static invariants.
- Source and test hashes were identical before and after the independent run.
- The 390px owned-selection screenshot was inspected.
- Deployment-data Keccak remains `0xdbd21aeea3ce017adff5866f3903569a84ad5a2d7ee182ddd7dac98261a1a39c` (48751 bytes). Contract sources and compiler settings are unchanged.

## Security result

The original Base collection must pass exact address, runtime length and runtime hash checks before discovery. Account/network/scan epochs prevent stale results from updating a newer wallet. Balance and owner checks reconcile the inventory at one block; current ownership is checked again before a write. Selection remains capped at 13. Read-only discovery works before deployment and when the oracle reserve is unfunded, while approval and mint remain gated.

Three review findings were corrected and regression-tested: incomplete scans now reset the history cursor; source verification failure disables write readiness and invalidates consent; nonexistent cached extras cannot poison a complete verified owner set.

Cards load only bounded onchain recipe values, with three concurrent calls and a small cache. Malicious colors are rejected. No original metadata/GIF or remote artwork loader was added. Explicit approval/mint consent, durable transaction intent, oracle reserve/cap checks, and receipt/provenance verification remain enforced.

## Reviewed hashes

- `site/app.js`: `6b890b4e861bd22333f8e21ff1f398810fe2bf309d18708972e25c085d51bab6`
- `site/index.html`: `ffb60bb6d5138be15a1f4aa989238c1d5fa741892c3e7bf97785cfc114f91e77`
- `site/style.css`: `d4c85a5fef93db2c468d96e3a69405ccb3ec3a93745d038249d18d19efa2cfed`
- `site/lineage.js`: `93104dff989671b974e0860773ca44af0f60b0d428ffdc870034ec51ef66569d`
- `site/config.json`: `a4d135e18fa689a5a646da50fd4771194ab5c759015741cb03813d73d3edd1a8`
- `test/frontend/mobile-wallet.mjs`: `36fd1b313a2fcfe030b128ff3adafdc918300ea8c6160c85b102dbf93c8c703e`
- `test/frontend/lineage.mjs`: `b299e608980a4bee2ff2b05f8c8e44773825869b4da1ac347f19b8cc188cef6a`

## Remaining caveats

- Browser wallet and Base RPC were mocked in local headless Chromium. No physical-wallet or live-wallet holdings test, transaction, approval, funding or NFT transfer was performed.
- RPC availability, history completeness and chain reorganizations remain external limitations; refresh and manual-ID fallback may be needed.
- Inventory ownership is a pinned-block snapshot. A later transfer can change eligibility; preflight and the contract enforce current ownership.
- This is automated/local security review, not a formal external audit. Existing mandatory live Base preflight and direct owner wallet confirmation remain required.

Machine-readable evidence: `reports/inventory-ui-review.json`.
