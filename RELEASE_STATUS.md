# Ganja Ghoulballs release candidate

Updated 18 October 2026 for the inherited-DNA / Chainlink VRF implementation. This replaces the earlier three-contract, optimizer-200 release note. That earlier deployment hash and its test counts do not describe this candidate.

## Current state

The source includes a fail-closed public mint interface and a user-operated deployment helper. No successful Base deployment receipt, oracle-reserve donation, or real NFT sacrifice is recorded in this package. Public website availability is not evidence of onchain deployment. Consult `deployments/base.json` and `deploy-ui/release-approval.json` for current activation and exact-bytecode review state.

The collection has a maximum supply of 420. Each nonpayable mint atomically locks exactly 13 originals, then waits for Chainlink VRF reveal. The immutable vault has no recovery path. Inherited DNA, native animated SVG art, and provenance are stored or derived onchain. The collection, vault, renderer, and backdrop are four separate immutable contracts created by one zero-value deployment transaction.

There is no protocol mint fee. Oracle requests spend from a separately donated shared ETH reserve. The proposed per-request ceiling is 0.00001 ETH; this is not a funding authorization. Initial funding is unselected. Donations, including unused surplus, cannot be withdrawn or refunded. Chainlink remains an externally governed service that may delay or stop.

## Reproduction and evidence

- Node 24.x is pinned; tested runtime 24.19.0.
- Solidity 0.8.30, optimizer 50, viaIR, Cancun.
- Install: `npm ci --ignore-scripts --include=dev`.
- Build: `npm run build`.
- Full current-source test suite: `npm run test:all`.
- Deployment-helper tests: `npm run test:deploy`.

Final test outcomes and their source hashes belong in `docs/CONTRACT_TEST_REPORT.md`, `reports/SECURITY_REVIEW.md`, and their machine-readable evidence. Historical full-420 coverage is explicitly preserved under `artifacts/covered-dca9/`; current executable-equivalence and boundary evidence must not be described as a new full-420 run. A fresh full test suite executes all 420 on current sources. Automated independent review is not a formal external audit.

The numeric-layout-fix renderer source checkpoint is `09e0f93d90ad2bd03f2acddd92e06b11ed00de0d27f3699cd1b4318ade5fb41c`. At the proposed 10^13-wei cap, the current complete constructor data is 48,751 bytes, Keccak-256 `0xdbd21aeea3ce017adff5866f3903569a84ad5a2d7ee182ddd7dac98261a1a39c`. This identifies a candidate, not permission to sign. Rebuilding or changing any constructor value requires a fresh hash comparison and review.

## Remaining deployment requirements

1. Complete final security, art, frontend, and source-snapshot review. Publish the reviewed source through the canonical private repository and verified hosting workflow.
2. Bind any local release unlock to the exact source commit and complete deployment-data hash. The review flag never authorizes a wallet transaction.
3. The owner must personally verify live Base original/parent-renderer/wrapper runtime pins, the current wrapper status and quote, the immutable request ceiling, constructor simulation, and final wallet fees before approving deployment.
4. Verify the actual receipt, all four deployed runtime templates and wiring, the external wrapper pin, and all four explorer source contracts.
5. If the owner chooses to fund the reserve, prepare a separate exact-amount donation and obtain their own wallet confirmation. Keep minting disabled until all activation checks pass. Do not sacrifice real NFTs for testing.

## Package identity

The former root `RELEASE_SHA256.json` inventory was superseded because it described older source and generated output. The deterministic source packager now emits a per-file `release-snapshot.json`, embeds `RELEASE-SNAPSHOT.json` in the ZIP, and writes `SHA256SUMS` for the archive. Run it only after source freeze, with the actual source commit reference. See `docs/DEPLOYMENT.md` for the command and exact evidence allowlist.
