# Contract verification report

Generated 2026-10-18T01:21:48.807Z. No live transaction was signed or broadcast and no real original NFT was transferred.

## Build provenance

- Compiler: 0.8.30+commit.73712a01.Emscripten.clang
- Optimizer 200; viaIR; Cancun; tested Node 24.19.0
- Exact input: artifacts/standard-input.json
- Pinned dependency lockfile passed a fresh official-registry npm ci --ignore-scripts installation.
- contracts/GanjaGhoulballs.sol SHA-256: 626c4bd259b14da38ea0f02012f075231e553c995a4dd46455c34577c50ea192
- contracts/GooGraveyard.sol SHA-256: 6d2ccc8af0f1e3d2321a4368416d3d74cf306003ce5915b1b4bcd3b74b8951ae
- contracts/GooRenderer.sol SHA-256: 92037149681b52dfe671ac5b01ab602c5106e872bdfa165265b5ec3579062aa8

This report generator verifies that current source, compiled build, contract tests, gas tests, and independent security reports all refer to exactly the same source hashes.

## Chain size limits

| Contract | Runtime bytes | Creation code bytes |
|---|---:|---:|
| GanjaGhoulballs | 7,911 | 33,424 |
| GooGraveyard | 524 | 703 |
| GooRenderer | 24,124 | 24,150 |

Every runtime is below EIP-170's 24,576-byte limit. Collection creation code plus its 32-byte constructor argument is 33,456 bytes, below EIP-3860's 49,152-byte limit. Renderer headroom is 452 bytes. Any further art edit requires rechecking sizes and gas.

## Executable tests: passed

22 contract test groups:
- immutable constructor wiring, 420 cap, 13 ingredients and ERC165
- nonexistent tokens and zero-address balances revert
- approval required for all ingredients before any custody changes
- atomic mint with 13 per-token approvals, exact provenance and event
- same wallet can mint again with fresh originals; global approval
- fixed array rejects 12/14-item function selectors and truncated calldata
- zero, 6668, maxuint, duplicates and nonascending IDs are rejected atomically
- wrong owner, nonexistent source and revoked approvals are rejected
- ETH rejected without transferring source NFTs
- 13th transfer failure rolls back every earlier original and all mint state
- source returning success without custody is rejected and rolled back
- late malicious source theft of an earlier deposit is detected
- source transfer callback cannot reenter mint
- vault rejects direct safe deposits, non-source callers, and wrong operators
- raw transfers to vault are irretrievable and do not mint or credit provenance
- mint recipient revert and wrong selector roll back 13 originals
- ERC721 authorized transfers, approval clearing and invalid recipient rollback
- immutable seed and metadata provenance match canonical encoding after transfer
- seed, SVG, traits and metadata remain identical across callers and later block timestamps
- constructor rejects wrong chain, wrong Base source, EOA and non-ERC721 source
- deterministic fuzz: 100 invalid permutations, range and ownership cases preserve state
- full 420-token supply invariant: 5460 locked originals, no bypass or wallet cap

The full-supply test executes 420 actual local mints, checks all 5,460 source-NFT owners and each 13-ID recipe, keeps source totalSupply unchanged, and rejects the 421st mint without moving its ingredients. There are 100 deterministic malformed-recipe cases. This is bounded executable invariant/property testing, not a formal proof or an exhaustive fuzzer.

Independent security probes pass 2,895 assertions, including 120 model-based ERC-721 transfer rounds. Independent Base64 probes pass 570 byte-for-byte oracle calls against Node Buffer: all lengths 0–256, padding/buffer boundaries through 32,769 bytes, arbitrary binary patterns and deliberately dirty trailing memory. The optimized encoder fixed a measured original-code problem where nested tokenURI encoding exceeded 20M gas.

Machine-readable results and executable scripts:
- artifacts/contract-tests.json and test/contracts.mjs
- reports/security-probes.json and reports/security-probes.mjs
- reports/base64-probes.json and reports/base64-probes.mjs

## Gas and output measurements

These are EVM execution gas from an in-memory EthereumJS Cancun environment. Mint measurements use the simplified test-only source ERC-721, not the deployed original contract; its transfer implementation can have different gas costs. They exclude transaction intrinsic calldata cost and Base L1 data fees and are not public-chain receipts or monetary fee quotes.

| Operation | Execution gas |
|---|---:|
| Collection creation including vault and renderer | 6,618,815 |
| First mint with 13 token approvals | 407,329 |
| Later mint with operator approval | 309,642 |
| Largest sampled full tokenURI | 6,029,316 |
| Largest sampled svg | 1,046,481 |

39 actual local tokens were minted for gas sampling: 1/2/4-character representatives plus all 36 six-character scene/headwear combinations. Every full tokenURI call succeeded under 20M and met the 12M target. Largest sampled tokenURI is 38,305 bytes. This is representative maximum-structure sampling, not a mathematical maximum over all seeds. Exact seeds, recipes, sizes and gas are in artifacts/gas-profile.json.

## Security design and boundaries

- Base 8453 binds to original 0xf3654d0ce6cf518f4efbbe490f4a26483fb0969c with deployed code and ERC-721 interface support. ERC-165 is not proof of honest behavior; production release must verify the real source runtime.
- Base Sepolia 84532 and local 31337 are explicit mock-testing paths; other chains are rejected.
- The fixed 13-ID array must be strictly ascending, in 1–6,667, caller-owned, and approved per token or globally. Referenced original source uses sequential IDs beginning at 1 with cap 6,667; 16-bit packing is collection-specific.
- Every custody postcondition is checked after all 13 transfers. Transfer failure, no-op transfer, later custody theft and rejecting recipient hook roll everything back.
- A reentrancy guard covers source callbacks and the final mint callback. Standard ERC-721 receivers may transfer their newly received GGOO in their hook; they cannot reenter mint.
- There is no owner, admin mint, rescue, withdrawal, renderer setter, pause, proxy or upgrade.
- Raw transferFrom can bypass vault receiver checks. Such accidental deposits remain irretrievable and receive no GGOO credit. Never send originals directly to the vault.
- Seed identity is immutable across owners, callers and timestamps, but predictable and grindable through ingredient selection and mint order. It is not fair randomness or a rarity guarantee.
- Immutable code cannot be repaired after deployment. This testing is not a professional third-party audit.

## Not executed / production gates

- No live original-contract Base fork integration completed. The attempted Base RPC read returned HTTP 403; the available explorer tool reported exhausted credits. Repository source supports intended behavior, but live original runtime equivalence remains unverified here.
- No public Base Sepolia deployment occurred. This local Cancun EVM is not a complete OP Stack/Base node.
- No mainnet deployment, Basescan source verification or real sacrifice occurred. Secure signer approval, real-source simulation, current network code verification and actual receipts remain required.
- Artifact runtime templates contain immutable placeholders. Production runtime hashes must come from actual deployed code and be checked against immutable substitutions.
- Website publication or renderer preview generation does not establish an NFT deployment. The release/deployment handoff must remain gated until these checks are satisfied.

## Re-run

Run npm ci --ignore-scripts, then npm test. This compiles, checks static invariants, runs core/gas/independent-security probes, and regenerates this report with source-hash consistency checks. npm run test:all also runs browser frontend and user-operated deployment-page tests; a Playwright Chromium installation or CHROMIUM_PATH is required. npm run build emits the static site and deployment handoff without sending transactions.

Historical 15-token requirements in archive-inputs/ are superseded by this 13-token implementation.
