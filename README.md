# Ganja Ghoulballs

420 fully onchain animated, pixel-edged goo ghosts on Base. Each GGOO is minted only by permanently locking **exactly 13 original Ghoulballs**. The minter sends zero ETH protocol fee. A separate sponsor reserve pays the one-shot Chainlink VRF reveal; network gas and the irreversible loss of the originals still matter. A wallet may mint repeatedly with new ingredients, subject to the absolute 420 cap.

**Release status: HOLD pending inheritance/reveal integration review.** Source, executable local tests, synthetic post-reveal art samples, and a fail-closed website are included. This repository is not evidence of a mainnet deployment. Inspect `deployments/base.json` and the release report for actual network addresses and verified receipts. An unset deployment configuration disables approvals and minting.

## Permanent lock, not a source-contract burn

The original collection has no public burn function. All 13 originals move to a new ownerless, non-upgradeable `GooGraveyard`, which has no withdrawal, approval, arbitrary-call, rescue, or redemption function. Their original `ownerOf` becomes the vault; original `totalSupply` does **not** decrease. Full GGOO mint-out locks 5,460 originals. The arithmetic remainder is 1,207 out of the original 6,667 maximum, not a claim about current minted or circulating supply.

Never transfer an NFT directly to the vault. Direct safe transfers are rejected; raw ERC-721 `transferFrom` can bypass receiver checks and irretrievably lock an NFT without issuing any GGOO. Only the official atomic 13-token mint flow earns a GGOO.

## Reproducible development

Node 24.x is pinned for deployment; 24.19.0 is the tested runtime. Dependencies and their integrity hashes are pinned in `package-lock.json`.

```sh
npm ci --ignore-scripts --include=dev
npm run compile
npm run check
npm run test:contracts
npm run test:genetics
npm run test:source
npm run test:gas
npm run test:art
npm run build
```

The compiler is `solc@0.8.30`, optimizer 50, viaIR, Cancun. `compile` writes ABIs, creation bytecode, deployed runtime templates, immutable reference offsets, compiler metadata, exact standard JSON compiler input, and source hashes under `artifacts/`. It fails if EIP-170 runtime or EIP-3860 creation-code limits are exceeded. No build or test script broadcasts a transaction.

`test:contracts` uses an in-memory EthereumJS EVM and executable mocks. It tests all 420 local redemptions, 100 invalid ingredient sets, approval/ownership/range validation, complete rollback, adversarial source and recipient callbacks, ERC-721 behavior, seed/metadata stability, vault limitations, and supported networks. `test:gas` measures actual locally minted 1/2/4-character tokens and all 36 six-character scene/headwear combinations. Reported gas is EVM execution gas, excluding transaction intrinsic gas and Base L1 data fees.

`test:art` validates 1,000 recipe samples, animated/still equivalence, trait agreement, and 420 thumbnail rasterizations. `test:all` additionally runs frontend and deployment-page browser tests; install Playwright Chromium or set `CHROMIUM_PATH`.

Fresh-install reproducibility must be rerun for each release. Historical reports are not approval for changed inheritance, oracle or renderer code.

Additional independent security and Base64 oracle probes live in `reports/`. See `docs/CONTRACT_TEST_REPORT.md` for precise coverage and limitations. Local EVM success is not a public Base fork test or a professional security audit.

## Contract interface and DNA inheritance

- `mint(uint256[13] selectedIds)`: nonpayable; accepts any input order and sorts the set. Requires distinct caller-owned IDs 1–6,667 and approval for all 13. All parent recipes are validated and snapshotted before custody. All 13 deposits, the paid oracle request, and the pending NFT mint are atomic.
- `ingredientsOf`, `parentGenesOf`, `parentDigestOf`, `lineageOf`: permanent canonical source IDs and compact verified parent chromosomes. Lineage remains available before and after reveal.
- `mintBlockOf`, `mintedBy`: permanently stored actual mint block number and original mint caller, subtly encoded in the image and preserved exactly in metadata. Transfers and reveal do not change them. No transaction hash is claimed.
- `requestIdOf`, `requestPaid`, `requestToken`, `randomWordOf`, `revealed`: fixed request tracking and one-shot reveal status. The immutable wrapper alone can supply entropy.
- `seedOf`, `genomeOf`: available only after reveal. Paired parent alleles, explicit dominance/recessiveness, donor-led inherited colors, polygenic body dimensions and bounded mutations determine the child. No selected-parent offspring-preview function exists.
- `svg`, `svgStill`, `traitsOf`, `tokenURI`: generic sealed pending art before reveal; fully onchain final SVG and nested-base64 metadata afterward. No second reveal transaction is needed. An ERC-4906 metadata update is emitted when entropy arrives.
- `quoteRandomness`, `maxRequestPrice`, `vrfWrapper`: current native quote, immutable sponsor spend cap and fixed oracle service. Separate native ETH donations can fund future requests. Donations and leftovers cannot be withdrawn. Mint fails before any transfer if reserve is insufficient or the quote exceeds the cap.
- `originalCollection`, `graveyard`, `renderer`, `deploymentChainId`; `renderer.backdrop()`: immutable four-contract art/custody wiring. No owner, admin mint, pause, upgrade, reroll, cancellation, provider switch, renderer setter or withdrawal exists.

Constructor: `constructor(address original_, address wrapper_, uint256 maxRequestPriceWei_)`. It creates the vault and renderer; the renderer creates its immutable backdrop helper. Base mainnet (8453) pins the original collection, its actual renderer, and Chainlink wrapper to verified deployed code hashes. Base Sepolia (84532) and local chain 31337 support explicit mocks; all other chains are rejected. Callback parameters are fixed at 100,000 gas, 3 confirmations and one word.

The parent digest excludes the new contract address, caller and mint sequence. All 13 parents contribute to the gene pool and family averages. Actual one-shot oracle entropy chooses allele recombination and mutation after the irreversible mint. This is DNA-inspired art, not biological science or guaranteed rarity. See [the full inheritance rules, packed lineage schema and probabilities](docs/DNA_AND_REVEAL.md).

The Chainlink wrapper is an externally governed service even though our consumer has no administrator. Its configuration, coordinator and future availability are outside this contract's control. If a valid callback never arrives, a token may remain pending permanently. There is no alternate-outcome fallback or claim that a failed callback will automatically retry.

## Web and deployment

`site/` contains the static application. `npm run build` compiles contracts, regenerates renderer-derived previews, builds `dist/`, and includes the user-operated deployment handoff under `/deploy/`. Vercel uses framework Other, project-root build, `npm ci --ignore-scripts --include=dev`, build `npm run build`, and output `dist`.

The production mint stays disabled until Base chain, collection/source/vault/renderer/backdrop/oracle wiring, supply constants, deployment status, and concrete deployed runtime hashes match the release configuration. Runtime artifact templates contain immutable placeholders and are **not** themselves live runtime hashes. Do not unlock configuration with invented addresses or receipts.

The wallet flow verifies owned originals, obtains source approval when required, explains the permanent 13-token lock, and submits the atomic redemption only after the user's action. Synthetic post-reveal art samples are labeled as examples and do not predict the result of a selected 13-parent mint. After deployment, collectible metadata and art are read from the actual chain.

See `docs/DEPLOYMENT.md` for the deployment handoff and release gates. Use a securely authorized funded wallet. Never put private keys or recovery phrases in chat, environment examples, code, or static files. Never use real originals in tests. A local/mock Base-compatible EVM run does not replace the still-required real-source Base simulation and verification.

## Art and compatibility

SVG geometry, palette, character details, metadata and declarative SMIL animation are generated by immutable Solidity. No external image host, JavaScript, GIF codec, or mutable metadata server is needed. Animation plays in compatible SVG viewers; marketplaces may cache SVG thumbnails as static PNGs. Website preview animation does not prove a marketplace supports animation.

## Attribution

Independent parody inspired by the concept of [Ghoulballs](https://ghoulballs.vercel.app/) and [ColinPlatt/sol_vid](https://github.com/ColinPlatt/sol_vid), with newly authored character art and site. Unaffiliated with the original project. Historical input archives under `archive-inputs/` are retained for provenance and contain superseded 15-token requirements; the executable code and current 13-token documentation take precedence.
