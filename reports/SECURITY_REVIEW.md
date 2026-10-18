# Ganja Ghoulballs security review

Review date: 2026-10-18 UTC. Status: **complete for the frozen source/site release; live Base verification remains an open production gate**.

This is an independent automated code review and local adversarial test pass, not a professional audit, formal verification, live Base fork test, or guarantee of safety. No real NFTs, wallet approvals, signatures, transactions, or deployment were used for this review.

## Executive result

No Critical, High or Medium vulnerability has been confirmed in the reviewed contract logic. The implemented economics are 420 maximum GGOO, exactly 13 distinct original Ghoulballs for each mint, zero ETH protocol payment, and no per-wallet mint limit. Originals remain ERC-721 tokens owned by the immutable graveyard; this is permanent custody, not an ERC-721 burn. Full mint-out locks 5,460 originals and does not reduce the original collection's `totalSupply`.

**Production activation is still gated.** The original contract’s verified source and displayed runtime were inspected on Basescan during this review. This is explorer evidence, not a direct-RPC snapshot. The exact new GGOO constructor has not been simulated on live Base, and this review does not attest to any deployed GGOO address or its explorer verification. Keep public approval/mint writes disabled until the post-deployment gates below are satisfied. The release flag may record completion of this local code review for the exact frozen bytecode and source commit; it must not be described as live-chain validation or transaction approval. Matching live RPC code to the verified explorer reference and constructor preflight remain required before the owner signs. The deployment page also permits explicit, read-only wallet connection and constructor simulation while the release flag is false; its transaction-send path remains separately locked.

## Scope and trust boundaries

Reviewed:
- `contracts/GanjaGhoulballs.sol`: ownership, approval, reentrancy, supply, exact recipe, full final-custody postconditions, recipient hooks, deterministic seed, metadata encoding, and ERC-721 transfer paths.
- `contracts/GooGraveyard.sol`: immutable original/redeemer wiring, receiver authorization, lack of withdrawal/approval/upgrade paths, and unavoidable raw-transfer deposits.
- `contracts/GooRenderer.sol`: pure/deterministic output, no externally supplied SVG content or external media, trait derivation, code size and read-gas constraints.
- `site/app.js`: ABI, approval scope, wallet/selection races, write gating, transaction outcome persistence, receipt/provenance validation, and image-cache identity.
- `deploy-ui/`: exact creation data, release gate, wallet handoff, runtime template/immutable validation, receipt wiring, and uncertain-send handling.

The fixed Base source address is `0xf3654d0ce6cf518f4efbbe490f4a26483fb0969c`. Constructor support for 31337 and 84532 is solely for local development and Base Sepolia. Test mocks are intentionally mutable and are not suitable production originals. A malicious source can lie consistently about ownership; local postcondition checks are defense in depth and do not replace validation of the real immutable source.

## Findings and disposition

### R-01 — Live RPC code matching and constructor preflight remain production gates

Severity: **release gate**, not a demonstrated contract exploit. Status: **original explorer source verified; live RPC comparison and GGOO constructor preflight open**.

`GanjaGhoulballs.sol:63-77` pins the production address, requires code, checks the ERC-721 interface, and deploys its own vault and renderer. The source-ID bound in `:91` is specifically 1 through 6667; 13 IDs fit without truncation into 208 bits of the packed recipe.

The original project's [SolVideoNFT source](https://github.com/ColinPlatt/sol_vid/blob/main/src/SolVideoNFT.sol) retrieved during review declares a 6667 cap and increments supply before assigning each ID. Its [Base deployment record](https://github.com/ColinPlatt/sol_vid/blob/main/deployments/base.json) identifies the required address and reports prior bytecode matching. That is repository evidence, not independently observed current chain code. Source file blob SHA retrieved: `bd1b2ecc7efe2e53b81846190578d314e4f0c9f1`; deployment-record blob SHA: `ae91f824c92d6e57cfd79b038ef8fd4022b3bd1c`.

On 2026-10-18 at approximately 01:27 UTC, a normal cloud-browser visit to the [original Basescan contract page](https://basescan.org/address/0xf3654d0ce6cf518f4efbbe490f4a26483fb0969c#code) succeeded. The page showed **Source Code Verified / Exact Match**, `SolVideoNFT`, solc `v0.8.30+commit.73712a01`, optimizer 200, and Cancun. The visible source confirms `MAX_SUPPLY = 6667` and `tokenId = ++totalSupply`, supporting IDs 1..6667. The displayed ABI has standard ERC-721 transfer/approval functions, mint/mintTo and views; no owner/admin/upgrade/rescue/public-burn entry point was found.

At approximately 01:29 UTC, the explorer’s public Read Contract UI, without a connected wallet, returned `true` for `supportsInterface(0x80ac58cd)`, `6667` for `MAX_SUPPLY`, and `158` for `totalSupply`. No block number was displayed; the supply observation is time-sensitive.

The complete explorer-displayed deployed runtime is **8,229 bytes**, Keccak-256 **`0x4fe189e2554350c36d652e3573f8bbd0dc3b45c99a4bf799998623339ab3873a`**. Evidence is preserved in `reports/original-basescan-evidence.json`, `reports/original-basescan-runtime.hex` and `reports/original-basescan-abi.json`. This is current explorer evidence, not a direct-RPC or fork test. Earlier direct Base RPC returned HTTP 403, and the connected blockchain data source returned HTTP 402; the later successful browser read supersedes the earlier explorer-access limitation.

The deployment UI now pins this exact hash and 8,229-byte length in both its fixed reference constants and generated manifest, and checks live `eth_getCode` before constructor simulation and again immediately before any wallet send request. Empty code, wrong length, and a same-length mutation are rejected in unit/UI regressions. Artifact fetching is module-relative and tested at a nested slashless deployment URL.

Required before production: perform this live wallet-RPC equality check on chain 8453 and simulate the exact final creation data against that actual source; local mocked tests do not establish that this live preflight has occurred. After the owner deploys, verify the receipt, all three runtime bytecodes and immutables, original/vault/renderer wiring, cap 420, count 13, and deployment chain ID 8453. Verify all three source contracts on the explorer before enabling mint writes.

### R-02 — Deterministic traits are selectable, not fair randomness

Severity: **informational / product disclosure**. Status: accepted design boundary; disclose.

`GanjaGhoulballs.sol:126-128` hashes the public deployment domain, chain ID, contract address, output ID and chosen recipe. `GooRenderer.sol:17-34` maps the seed to weighted traits. A holder can enumerate ingredient combinations and choose a desired result at the next mint position. Front-running another mint can change that position. There is no VRF, hidden entropy, commit/reveal, or collection-level rarity quota.

Reproduction: offline enumeration for hypothetical chain 8453, collection `0x1111111111111111111111111111111111111111`, output #1, and 13-ID subsets of IDs 1..20 found a Golden Goo candidate after only 99 combinations. Recipe `[1,2,3,4,5,6,7,8,9,10,14,18,20]` yields material roll 27, below the threshold 42. This is a hypothetical demonstration, not a prediction for a live deployment.

Recommendation: describe traits as deterministic and previewable/selectable; do not promise random allocation, guaranteed scarcity, or exactly weighted outcomes across 420 tokens.

### R-03 — Direct raw transfers are permanently lost without a mint

Severity: **low / inherent custody warning**. Status: documented contract limitation.

`GooGraveyard.sol:19-23` rejects unauthorized safe deposits, but standard ERC-721 `transferFrom` does not call the receiver hook. Any approved owner/operator can raw-transfer an original to the graveyard; it becomes irretrievable and does not create a GGOO or provenance credit. Raw transfers to the GGOO contract itself can likewise strand tokens. This is not a mint bypass or a way for GGOO to seize unapproved tokens.

Reproduction: the contract suite's "raw transfers to vault" test transfers one original directly, confirms unchanged GGOO supply, confirms vault ownership, and proves the owner cannot retrieve it. The immutable vault exposes only `originalCollection`, `redeemer` and `onERC721Received`.

Recommendation: warn users never to transfer NFTs directly to either contract. Use only the reviewed atomic mint flow. A rescue function would contradict the explicitly accepted permanent-custody design.

### R-04 — Renderer has limited EIP-170 headroom

Severity: **informational / build gate**. Status: enforced by compiler script.

The reviewed renderer is close to the 24,576-byte runtime ceiling. The compiler checks runtime and initcode limits. Preserve those checks and recompile after every art or compiler-setting change. Constructor creation data includes nested child creation code; its size must be checked independently of each deployed runtime. Final sizes are recorded below.

### Resolved during the review

- **Metadata read-gas availability:** the original bytewise Base64 implementation exceeded a 20 million execution-gas test. It was replaced by a bounded 3-byte assembly encoder with explicit final-group masks and `=` padding. Independent dirty-memory/binary oracle tests pass. Representative six-ball metadata is now practical in local execution; exact current RPC caps still need a real read check.
- **Missing final-custody postcondition:** mint now verifies ownership of all 13 originals after all transfers. A success-returning/no-op source and a source that steals an earlier deposit after transfer 13 both cause complete rollback.
- **Mutable chain-domain art:** seed generation now uses immutable `deploymentChainId`, preventing art changes from later changes to the chain ID reported by an environment.
- **Uncertain wallet responses:** UI owners added persisted pre-send intent locks, reload recovery and explicit handling of rejected versus uncertain requests. A missing transaction hash must not cause automatic resend.
- **Wallet chain race:** mint and approval requests explicitly include Base chain ID in addition to wallet checks.
- **Verification metadata integrity:** deployment manifests now hash complete artifacts, including ABI and compiler immutable-reference ranges, and receipt verification reads `deploymentChainId`.
- **Gallery cache namespace:** same renderer code can serve different collection seeds; the cache must include chain and collection identity as well as runtime hashes and token ID. The final application uses chain, collection, main runtime hash, renderer runtime hash, token ID and motion mode; a bounded optional image cache cannot displace the strict pre-send persistence requirement.

## Verified contract properties

- Only the actual owner (`msg.sender`) can redeem originals; having operator authority over another person's originals does not grant redemption rights.
- All ownership and approval checks occur before the first transfer. The source may use collection-wide or individual-token approvals.
- Exactly 13 calldata IDs are consumed; duplicate, descending, zero, out-of-range, nonexistent and differently owned IDs revert. Strict sorting prevents permutation aliases of the same recipe.
- A failed 13th transfer, no-op transfer, late custody theft, receiver revert or wrong selector rolls back the entire mint and all original transfers.
- The mint lock spans external source transfers and output receiver callbacks. A receiver can legitimately transfer its newly received GGOO while reentrant minting is rejected.
- All 420 sequential mints succeed with fresh inputs; mint 421 reverts before moving originals. The same wallet can mint repeatedly.
- GGOO transfers clear token approvals, preserve recipe/seed/metadata, and maintain balances across owner, token-approved and operator paths, including self-transfers and safe-transfer overloads.
- No owner/admin setter, arbitrary execution, upgrade, privileged mint, withdrawal or approval escape path was found in the GGOO/vault ABI or source.
- Metadata and SVG are generated from immutable contract code, with no HTTP/IPFS/external `<image>` dependency. Standard marketplace animation support is outside the contract's control.

## Fully-onchain acceptance check

The linked [OnChainChecker result for original ghoulballs #1](https://onchainchecker.xyz/collection/base/0xf3654D0ce6CF518F4eFbbe490F4a26483FB0969C/1) was read on 2026-10-18. It displayed **5/5 Fully On-Chain**. Its highest score covers metadata, artwork, thumbnails and all dependencies. This result belongs to the original collection, **not** to an undeployed GGOO. The original’s displayed 34.6M tokenURI gas is likewise separate from GGOO’s local gas measurements. Evidence: `reports/onchainchecker-original-evidence.json`.

The frozen GGOO implementation satisfies that zero-offchain-dependency design standard in the reviewed source and local outputs:
- `tokenURI` returns base64 data-URI JSON whose `image` is a complete base64 data-URI SVG. The SVG contains native animation; there is no separate externally hosted thumbnail or animation asset.
- The immutable onchain renderer supplies all shapes, colours, text metadata and motion. No HTTP, IPFS, Arweave, external image, CSS, font, JavaScript, iframe, or offchain asset is needed. The SVG XML namespace URL is an identifier, not a network dependency.
- The dependency-crawl test passed 39 locally minted metadata documents and their 39 animated SVGs, 39 still SVGs, and 32 additional renderer fixtures, covering the existing full six-ball scene/headwear matrix. Fourteen negative fixtures demonstrated rejection of remote assets, scripts, fonts, external metadata and invalid fragment references.
- The same test verifies immutable original/vault/renderer/chain fields, pure renderer functions, no metadata/admin setter, and no proxy/destruction path in the reviewed source. A transfer left the complete tokenURI byte-identical.

Machine-readable evidence is `reports/onchain-metadata-probes.json`; the reproducible script is `reports/onchain-metadata-probes.mjs`; actual locally decoded examples are `reports/onchain-metadata-sample.json` and `.svg`. This is a source/output acceptance check, not a claim that OnChainChecker has scored a live GGOO. Repeat the external check only after deployment and an ordinarily authorized first mint; never sacrifice real originals merely to produce a test token. A marketplace may cache thumbnails, freeze its own presentation, or disable SVG animation, but that does not change the immutable onchain metadata or artwork.

## Reproduction and evidence

Run from the repository root after `npm ci`:

```sh
npm run compile
node test/contracts.mjs
node reports/security-probes.mjs
node reports/base64-probes.mjs
node reports/onchain-metadata-probes.mjs
node --experimental-vm-modules deploy-ui/test.mjs
CHROMIUM_PATH=/tmp/ghoulbatch-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell node test/frontend/mobile-wallet.mjs
```

Independent checks executed:
- Contract suite: 22 groups, including 100 malformed recipes, receiver/source reentrancy and all 420 redemptions. Independently rerun successfully.
- `security-probes.mjs`: 2,895 assertions with independent malicious-source behavior and 120 model-based transfer rounds. No RPC or signing.
- `base64-probes.mjs`: 570 successful comparisons against Node Buffer. Lengths 0..256 and 511/512/513, 1023/1024/1025, 4095/4096/4097, 32767/32768/32769; arbitrary binary and repeated 00/ff/80/3d; both normal and deliberately nonzero trailing allocation.
- Deployment UI tests: rerun on the final runtime-pin/subpath checkpoint, passing exact hash/economics/chain gates, immutable-only differences, explicit zero-value creation, stale nonce/review checks, rejection reset and uncertain-send lock across reload. The final split gate also allows read-only simulation without release approval, keeps Send disabled, and preserves successful evidence for an unfunded wallet while preventing deployment.
- Final frontend rerun: 27 mocked Chromium scenarios independently passed, including uncertainty/reload recovery, rejected/reverted outcomes, wrong recipient, unknown supply, stale wallet/selection results, explicit Base transactions, and storage-quota failure before any send. The renderer also handled public edge seeds 0, 1, uint256 max−1 and uint256 max with maximum public token ID in both motion modes. Physical wallet behavior was not tested.

Core review evidence files: `reports/security-probes.json`, `reports/base64-probes.json`, `artifacts/contract-tests.json`, `artifacts/build-manifest.json`, `artifacts/gas-profile.json`. Frozen source hashes and size measurements are below. An additional independent run of `npm run test:all` completed with exit code 0 on the frozen release, including 22 contract groups, independent probes, 28 frontend scenarios (including native SVG animation/reduced motion), and deployment UI tests.

## Remaining limitations

Testing uses an in-memory Cancun EVM and test sources. Execution gas excludes transaction intrinsic gas, calldata/creation overhead, Base L1 data and any operator fees, and wallet-specific behavior. Representative gas samples are not exhaustive over every seed. Real device wallets, third-party indexers, marketplace animation behavior, public-chain reorg handling and production hosting integrity require separate validation. The deployed bytecode and the served website must match this reviewed release; any subsequent source change invalidates these results for the changed code.

## Frozen release checkpoint

Compiler: solc 0.8.30+commit.73712a01, optimizer 200, viaIR, Cancun.

Exact reviewed creation bytecode Keccak-256: `0x479fb353fa1c628ae5a97b72a05a7d713c87ecb188cd65fb06ee24243a72bc62`. Full deployment data, including the fixed original-address argument: `0xd222acf40438b5852558fd60093e63b15c0c885cec68fa284fe089c287129662` (33,456 bytes).

| File | SHA-256 |
|---|---|
| contracts/GanjaGhoulballs.sol | 626c4bd259b14da38ea0f02012f075231e553c995a4dd46455c34577c50ea192 |
| contracts/GooGraveyard.sol | 6d2ccc8af0f1e3d2321a4368416d3d74cf306003ce5915b1b4bcd3b74b8951ae |
| contracts/GooRenderer.sol | 92037149681b52dfe671ac5b01ab602c5106e872bdfa165265b5ec3579062aa8 |
| site/app.js | bc86466563cce723f61e6eb828e552ea41d0dededb5fe99087904d509c695b84 |
| deploy-ui/deploy.js | 2215b3429694249c55e4a98e5bb10b53dd5689351dc168f08167df4a2c2dc134 |
| deploy-ui/lib.mjs | 23c0b1ed8f0bd7b438e1aaf706bd3eb2e0bab732a2ee76230598da4c3c0a63c1 |
| deploy-ui/build.mjs | 8f54d7242a3b2079adde5c1cf47d6b526db3f0073364f1126f8b3f2823772a33 |
| deploy-ui/test.mjs | d822a3f393436070b9d63ea16c2736af8a98267e7089c8cca909f203487e7add |

| Contract | Runtime bytes | Creation code bytes |
|---|---:|---:|
| GanjaGhoulballs | 7,911 | 33,424 |
| GooGraveyard | 524 | 703 |
| GooRenderer | 24,124 | 24,150 |

The GGOO full creation data is 33,456 bytes including its 32-byte constructor argument, below 49,152. Renderer runtime headroom is **452 bytes** below 24,576. The final local constructor used 6,618,815 EVM execution gas; sample operator-approval mint used 309,642 and first per-token-approval mint used 407,329. These are mock-source execution measurements, not Base fee estimates or live transaction gas guarantees.

Final corrected gas-profile evidence contains 39 locally minted samples, including all 36 distinct actual six-ball scene/headwear pairs. The reviewer independently recomputed those pairs from every recorded seed and found zero mismatches after fixing the third-eye/headwear helper. Maximum sampled `tokenURI` execution gas is 6,029,316 (38,305 output bytes); maximum sampled raw SVG execution gas is 1,046,481. These are representative structural samples, not an exhaustive bound over every seed or proof of a current RPC service limit.

### Release recommendation

The frozen source and fail-closed website are suitable for publication from this limited code-review perspective. No unresolved Critical, High, or Medium exploit finding remains in the reviewed local code. Keep public approval/mint controls disabled until actual deployment and verification. Local code-review approval is not approval of a mainnet transaction, a substitute for live RPC original-code matching, or permission to bypass the required live simulation, user wallet confirmation, receipt checks, and explorer source verification. The open R-01 production gate must remain clearly disclosed.
