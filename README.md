# Ganja Ghoulballs

420 fully onchain animated, pixel-edged goo ghosts on Base. Each GGOO is minted only by permanently locking **exactly 13 original Ghoulballs**. The minter sends zero ETH protocol fee. A separate sponsor reserve pays the one-shot Chainlink VRF reveal; network gas and the irreversible loss of the originals still matter. A wallet may mint repeatedly with new ingredients, subject to the absolute 420 cap.

**Deployed on Base mainnet (chain 8453).** All four contracts have exact creation and runtime matches on Sourcify. This repository contains reproducible contract source, a static mint website, and local tests. Source verification is not a security audit or a guarantee that oracle service, reserve funding, or wallet transactions will succeed.

## Deployment and verification

- GGOO collection: [`0xeec423a9ed7b303e23f41fbc005944fa3fc631b8`](https://repo.sourcify.dev/8453/0xEec423a9eD7b303E23f41fBC005944fa3FC631b8)
- Permanent graveyard: [`0x1e2eb50f4bdd0311e9cd9dad3e17ae5cf54b292f`](https://repo.sourcify.dev/8453/0x1e2Eb50f4BDD0311E9Cd9DaD3E17AE5cF54B292f)
- SVG renderer: [`0xc5a2cceec73758464c3f50bf506cb49c6e621034`](https://repo.sourcify.dev/8453/0xc5a2CCEec73758464c3f50bF506cB49C6E621034)
- Backdrop: [`0x72f2b22950cef2f56a03144b26fd228156a931df`](https://repo.sourcify.dev/8453/0x72f2b22950Cef2F56a03144B26Fd228156A931df)
- Original Ghoulballs: `0xf3654d0ce6cf518f4efbbe490f4a26483fb0969c`
- Chainlink VRF wrapper: `0xb0407dbe851f8318bd31404a49e658143c982f23`
- [Creation transaction](https://basescan.org/tx/0xfdc129e4da048f2736e054a936e2b68f4abb92004d3b97347b555680a1f0b064), block 52,758,373.

The immutable per-request sponsor ceiling is **0.00001 ETH** (10,000,000,000,000 wei). Minting sends **zero ETH protocol fee**, but the minter pays gas and permanently gives up 13 originals. A separately donated reserve pays the oracle. Donations and unused reserve cannot be withdrawn. Reserve sufficiency and the live quote must be checked when minting; deployment does not guarantee readiness. See [deployment record](deployments/base.json) and [verification instructions](docs/VERIFICATION.md).

GGOO #1 was independently checked on 18 October 2026: [Onchain Checker reports 5/5, Fully On-Chain](https://onchainchecker.xyz/collection/base/0xEec423a9eD7b303E23f41fBC005944fa3FC631b8/1). Its revealed tokenURI embeds its JSON and animated SVG. This is an artwork-storage check, not a contract security audit.

## Permanent lock, not a source-contract burn

The original collection has no public burn function. All 13 originals move to a new ownerless, non-upgradeable `GooGraveyard`, which has no withdrawal, approval, arbitrary-call, rescue, or redemption function. Their original `ownerOf` becomes the vault; original `totalSupply` does **not** decrease. Full GGOO mint-out locks 5,460 originals. The arithmetic remainder is 1,207 out of the original 6,667 maximum, not a claim about current minted or circulating supply.

Never transfer an NFT directly to the vault. Direct safe transfers are rejected; raw ERC-721 `transferFrom` can bypass receiver checks and irretrievably lock an NFT without issuing any GGOO. Only the official atomic 13-token mint flow earns a GGOO.

## Reproducible development

Use Node 24.x. Dependencies and their integrity hashes are pinned in `package-lock.json`.

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

Additional independent security and Base64 oracle probes live in `reports/`. `npm test` regenerates `docs/CONTRACT_TEST_REPORT.md` with hash-bound coverage and limitations. Local EVM success is not a public Base fork test or a professional security audit.

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

See `docs/DEPLOYMENT.md` for the deployment-helper safety model. Use a securely authorized funded wallet. Never put private keys or recovery phrases in chat, environment examples, code, or static files. Never use real originals in tests. A local/mock Base-compatible EVM run does not establish a live oracle round-trip or physical-wallet compatibility.

## Art and compatibility

SVG geometry, palette, character details, metadata and declarative SMIL animation are generated by immutable Solidity. No external image host, JavaScript, GIF codec, or mutable metadata server is needed. Animation plays in compatible SVG viewers; marketplaces may cache SVG thumbnails as static PNGs. Website preview animation does not prove a marketplace supports animation.

## Attribution

Independent parody inspired by the concept of [Ghoulballs](https://ghoulballs.vercel.app/) and [ColinPlatt/sol_vid](https://github.com/ColinPlatt/sol_vid), with newly authored character art and site. Unaffiliated with the original project. Superseded input archives are excluded from the clean export. Dated technical reports and reproducible review tools are retained as checkpoint evidence; see RELEASE_STATUS.md. Project source is MIT-licensed; see [third-party notices and fixture provenance](THIRD_PARTY_NOTICES.md). No professional external audit, physical-wallet acceptance test, or successful live mint/reveal is claimed by these local test suites.
