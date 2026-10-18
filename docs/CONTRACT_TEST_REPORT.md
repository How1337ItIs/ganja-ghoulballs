# Inheritance and reveal contract test report

Generated 2026-10-18T04:40:54.887Z. No live transaction was signed or broadcast; no real original NFT was transferred and no oracle reserve was funded.

## Build and evidence consistency

Compiler 0.8.30+commit.73712a01.Emscripten.clang, optimizer runs 50, viaIR, Cancun. Exact standard JSON input and immutable runtime templates are in artifacts/. Dependencies are pinned in package-lock.json. This report generator checks current source, compiled build, core tests, gas tests, independent oracle tests and independent genetics tests against their exact source and compiler-settings hashes. A documented unchanged-core equivalence bridge may preserve prior full-supply coverage; it never relabels that run.

- contracts/GanjaGhoulballs.sol: f19920a6b7919e3ed5ee27c8d2cf42b6480be56a961676f344f270967a0bca52
- contracts/GooGenetics.sol: dd4b855c123392248214fb3c048d4e186e1db06d7ccdcc7444d9d521fa7aef90
- contracts/GooGraveyard.sol: 6d2ccc8af0f1e3d2321a4368416d3d74cf306003ce5915b1b4bcd3b74b8951ae
- contracts/GooRenderer.sol: 09e0f93d90ad2bd03f2acddd92e06b11ed00de0d27f3699cd1b4318ade5fb41c

| Contract | Runtime bytes | Creation bytes |
|---|---:|---:|
| GanjaGhoulballs | 15,308 | 48,655 |
| GooGraveyard | 524 | 703 |
| GooBackdrop | 7,634 | 7,660 |
| GooRenderer | 23,802 | 31,585 |

All deployed runtimes fit EIP-170. Collection creation plus its 96-byte constructor arguments is 48,751 bytes, below EIP-3860’s 49,152-byte limit. The creation bytecode includes all nested child deployments. Any source change invalidates this report until rebuilt and retested.

## Executable local coverage

23 core groups passed on the prior renderer snapshot, including the full-supply loop; all 22 remaining groups were also rerun on the final snapshot:
- immutable constructor wiring, 420 cap, 13 ingredients and ERC165
- nonexistent tokens and zero-address balances revert
- approval required for all ingredients before any custody changes
- atomic mint with 13 per-token approvals, exact provenance and event
- same wallet can mint again with fresh originals; global approval
- fixed array rejects 12/14-item function selectors and truncated calldata
- zero, 6668, maxuint and duplicates are rejected atomically
- wrong owner, nonexistent source and revoked approvals are rejected
- mint ETH rejected; separate reserve donations accepted without transferring NFTs
- 13th transfer failure rolls back every earlier original and all mint state
- source returning success without custody is rejected and rolled back
- late malicious source theft of an earlier deposit is detected
- source transfer callback cannot reenter mint
- vault rejects direct safe deposits, non-source callers, and wrong operators
- raw transfers to vault are irretrievable and do not mint or credit provenance
- mint recipient revert and wrong selector roll back 13 originals
- ERC721 authorized transfers, approval clearing and invalid recipient rollback
- VRF pending, one-shot authenticated reveal and immutable genetic lineage
- oracle quote, cap, request failure, reentry and recipient failure are atomic
- seed, SVG, traits and metadata remain identical across callers and later block timestamps
- constructor pins chain, exact Base source/renderer/wrapper code and immutable price cap
- deterministic fuzz: 100 invalid permutations, range and ownership cases preserve state
- full 420-token supply invariant: 5460 locked originals, no bypass or wallet cap

The full-supply run retains renderer SHA256 dca9c7366826fc138fa844ffde3c68815070fb237837bbe017bc837cd9e95cf4. Final renderer SHA256 09e0f93d90ad2bd03f2acddd92e06b11ed00de0d27f3699cd1b4318ade5fb41c removes the marketplace Art Version trait and applies the separately reviewed numerical Float-layout clipping correction. scripts/runtime-equivalence.mjs validates and strips only canonical Solidity CBOR metadata and proves byte-for-byte equality of collection, vault and backdrop executable runtimes, plus identical ABI, storage layout and immutable-reference maps. Final constructor/mint/callback boundaries, actual-source compatibility, gas profiling and all independent security/metadata probes were rerun. The renderer itself is covered by separate final art acceptance, travel-boundary and provenance checks. See artifacts/core-runtime-equivalence.json and artifacts/contract-boundary-tests.json. No prior coverage hash was rewritten.

The full-supply test performs 420 local mints and checks all 5,460 permanently locked source NFTs, canonical 13-ID lineage, unchanged original supply, no per-wallet cap and rejection of mint 421. It uses mutable test-only mocks, not real NFTs.

Genetics tests: 22,188 assertions, 13 exact original parent recipes, 100 input-order permutations, every parent changing the permanent commitment, 10 malformed recipe types and 1,000 synthetic post-commit entropy inputs. Independent genetics probes add 2,855 assertions and paired-allele dominance/recessive oracle comparisons. Every parent contributes to the family means and gene pool; integer quantization does not promise that every small parent edit visibly changes every child trait.

Independent oracle/custody integration: 524 assertions. Tests cover reserve and cap checks, wrapper quote/request failures, all 13 custody, source/wrapper/receiver reentry, recipient rejection rolling back the oracle payment, unknown/malformed/duplicate callbacks, out-of-order fulfillment, zero/max entropy, pending-token transfers, permanent snapshots after source recipe failure, and the absence of admin/retry/withdraw/provider-switch selectors.

Independent ERC-721 authorization/transfer model coverage: 2,900 assertions, including 120 model rounds.

The actual captured original ERC-721 and renderer runtimes also pass a separate local compatibility test: 26 synthetic-account mints, consolidation, 13 actual-source transfers, direct recipes, final lineage, and rollback of actual-source custody/reserve after an oracle-request rejection. Actual-source redemption execution gas is 1,376,819. This starts from empty synthetic storage on local 31337; it is not a Base fork.

The onchain-metadata dependency probe checks 39 pending, 39 revealed and 39 still outputs and stable revealed art after both source-recipe and wrapper failure. No external asset, script, remote font or metadata dependency was found.

The callback is explicitly run with a 100,000-gas cap and cold first writes. It performs no external call, rendering, recombination or receiver hook. It stores one entropy word and the revealed flag, then emits events. Valid zero entropy cannot be confused with pending.

Independent Base64 oracle: 570 cases match Node Buffer, including lengths 0–256, boundaries through 32,769, binary patterns and deliberately dirty trailing allocation. The memory-safe encoder's partial final-group read ends at the last actual input byte; it does not rely on adjacent allocations. These are executable tests, not a formal proof or a professional third-party audit.

## Measured execution gas

In-memory EthereumJS Cancun execution only. Excludes transaction intrinsic/calldata costs and Base L1 data fees. Mint figures use a simplified mock ERC-721 and mock wrapper; actual deployed source/provider gas may differ.

| Operation | Execution gas |
|---|---:|
| Creation including vault, renderer, backdrop | 9,601,753 |
| First mint, 13 per-token approvals | 1,441,980 |
| Later mint,operator approval | 1,312,499 |
| First nonzero callback, cold storage | 49,893 |
| Independent callback including call overhead | 52,880 |
| 13 exact original recipe reads and packing, harness | 613,385 |
| Largest sampled full tokenURI | 9,133,885 |
| Largest sampled animated SVG | 1,530,884 |

The 39 gas-profile tokens are locally minted and revealed with test-only chosen entropy: 1/2/4-ball representatives and all 36 six-ball scene/headwear pairs. Metadata traits are asserted against each target, not inferred only from helper code. Largest sampled tokenURI is 55,965 bytes. This bounds tested structures, not every possible genome/seed. Production entropy is supplied by the one-shot oracle, not selected by a user or this sampling script.

## Permanent rules and external boundaries

- Exactly 13 originals are atomically locked per zero-value mint, up to 420. Source IDs are canonicalized, so order is irrelevant.
- Base deployment pins the original address/runtime, original renderer runtime, and Chainlink wrapper address/runtime. Exact verified explorer source/runtime evidence is retained in reports/; the original renderer was recompiled and matched byte-for-byte.
- The actual mint block and original mint caller are stored once, preserved exactly in metadata and encoded as subtle visual Easter eggs. Neither is replaced by the callback block, current read block, or current owner. No transaction hash is claimed.
- Source recipe snapshots are permanent. Count/motion/theme use paired parent alleles, explicit dominant/recessive expression, donor-led inherited colors and bounded mutations. See docs/DNA_AND_REVEAL.md for exact fields and probabilities.
- One request per minted NFT. No preview endpoint, cancellation, reroll, replacement request, provider switch, owner, rescue, withdrawal or upgrade.
- Separate native donations sponsor oracle fees. An immutable per-request cap bounds reserve spending; unused donations cannot be withdrawn.
- The fixed wrapper is an externally governed oracle service. Its configuration/coordinator and future liveness are not controlled by this ownerless consumer. If no valid callback arrives, a token may remain pending permanently. There is no alternate-seed fallback and no claim of automatic callback retry.
- Original totalSupply does not decrease. These are permanent locks, not source burns. Raw ERC-721 transferFrom can force accidental deposits into the vault without mint credit; never send NFTs directly to it.

## Remaining production gates

No live Base fork integration, public testnet deployment, real oracle round-trip, funding, mainnet deployment or actual sacrifice was performed. A normal RPC attempt was denied; no access control was bypassed. Explorer source/runtime evidence and local tests do not replace a live wallet-RPC simulation and actual deployment receipt verification. Concrete runtime hashes must be collected from deployed contracts with immutable substitutions verified. Website publication does not establish a contract deployment. Deployment and funding approval remain separate user decisions.

## Re-run

npm ci --ignore-scripts --include=dev, then npm test. npm run test:all adds art and browser suites. npm run build compiles, renders bounded example assets and builds the fail-closed static site; it never broadcasts transactions. Machine results: artifacts/contract-tests.json, artifacts/genetics-tests.json, artifacts/gas-profile.json, reports/vrf-security-probes.json, reports/inheritance-probes.json, reports/base64-probes.json.
