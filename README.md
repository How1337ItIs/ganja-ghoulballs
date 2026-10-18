# Ganja Ghoulballs

420 fully onchain animated, pixel-edged goo ghosts on Base. Each GGOO is minted only by permanently locking **exactly 13 original Ghoulballs**. The mint has zero ETH protocol fee; network gas and the irreversible loss of the originals still matter. A wallet may mint repeatedly with new ingredients, subject to the absolute 420 cap.

**Release status:** source, executable local tests, renderer-derived previews, and a fail-closed website are included. This repository is not evidence of a mainnet deployment. Inspect `deployments/base.json` and the release report for actual network addresses and verified receipts. An unset deployment configuration disables approvals and minting.

## Permanent lock, not a source-contract burn

The original collection has no public burn function. All 13 originals move to a new ownerless, non-upgradeable `GooGraveyard`, which has no withdrawal, approval, arbitrary-call, rescue, or redemption function. Their original `ownerOf` becomes the vault; original `totalSupply` does **not** decrease. Full GGOO mint-out locks 5,460 originals. The arithmetic remainder is 1,207 out of the original 6,667 maximum, not a claim about current minted or circulating supply.

Never transfer an NFT directly to the vault. Direct safe transfers are rejected; raw ERC-721 `transferFrom` can bypass receiver checks and irretrievably lock an NFT without issuing any GGOO. Only the official atomic 13-token mint flow earns a GGOO.

## Reproducible development

Node 24 is the tested runtime. Dependencies and their integrity hashes are pinned in `package-lock.json`.

```sh
npm ci --ignore-scripts
npm run compile
npm run check
npm run test:contracts
npm run test:gas
npm run test:art
npm run build
```

The compiler is `solc@0.8.30`, optimizer 200, viaIR, Cancun. `compile` writes ABIs, creation bytecode, deployed runtime templates, immutable reference offsets, compiler metadata, exact standard JSON compiler input, and source hashes under `artifacts/`. It fails if EIP-170 runtime or EIP-3860 creation-code limits are exceeded. No build or test script broadcasts a transaction.

`test:contracts` uses an in-memory EthereumJS EVM and executable mocks. It tests all 420 local redemptions, 100 malformed recipes, approval/ownership/range validation, complete rollback, adversarial source and recipient callbacks, ERC-721 behavior, seed/metadata stability, vault limitations, and supported networks. `test:gas` measures actual locally minted 1/2/4-character tokens and all 36 six-character scene/headwear combinations. Reported gas is EVM execution gas, excluding transaction intrinsic gas and Base L1 data fees.

`test:art` validates 1,000 recipe samples, animated/still equivalence, trait agreement, and 420 thumbnail rasterizations. `test:all` additionally runs frontend and deployment-page browser tests; install Playwright Chromium or set `CHROMIUM_PATH`.

A clean-directory installation and build with `NODE_PATH` unset produced identical bytecode for all three contracts and identical hero SVG previews; evidence is in `artifacts/reproducibility.json`.

Additional independent security and Base64 oracle probes live in `reports/`. See `docs/CONTRACT_TEST_REPORT.md` for precise coverage and limitations. Local EVM success is not a public Base fork test or a professional security audit.

## Contract interface

- `GanjaGhoulballs`: ERC-165, transferable ERC-721 and metadata, `MAX_SUPPLY() = 420`, `SACRIFICE_COUNT() = 13`.
- `mint(uint256[13] originalIds)`: nonpayable, caller-owned ingredients only, strictly ascending IDs 1–6,667. All ownership and approvals are validated before any transfer. Each original is safe-transferred to the vault; custody of all 13 is rechecked before minting. All work rolls back if any transfer or recipient hook fails.
- `ingredientsOf(tokenId)`: the immutable 13-ID recipe. `packedIngredients(tokenId)` stores thirteen 16-bit IDs. The `GhoulballsSacrificed` event includes all 13 IDs.
- `seedOf`, `svg`, `svgStill`, `traitsOf`, and `tokenURI`: immutable onchain recipe-derived identity, animated/still SVG, trait JSON and complete nested-base64 JSON metadata. The metadata includes source collection, chain, vault, and original IDs.
- `originalCollection`, `graveyard`, `renderer`, and `deploymentChainId`: immutable constructor wiring. No collection owner, admin mint, pause, upgrade, reroll, renderer update, or metadata update exists.

Constructor: `constructor(address original_)`. It deploys its renderer and vault internally. Base mainnet (8453) requires original collection `0xf3654d0ce6cf518f4efbbe490f4a26483fb0969c`; source code and ERC-721 interface support must exist. Base Sepolia (84532) and local chain 31337 support mock originals for testing; all other chain IDs are rejected.

The seed domain is `GANJA_GHOULBALLS_PIXEL_GOO_V2`. It commits to deployment chain, collection address, GGOO ID and packed ingredient IDs. It is deterministic and predictable. Ingredient choices and mint position can be optimized for traits; this is not secure randomness, a fairness ceremony, or a guarantee of trait rarity.

## Web and deployment

`site/` contains the static application. `npm run build` compiles contracts, regenerates renderer-derived previews, builds `dist/`, and includes the user-operated deployment handoff under `/deploy/`. Vercel uses framework Other, project-root build, `npm ci --ignore-scripts --include=dev`, build `npm run build`, and output `dist`.

The production mint stays disabled until Base chain, collection/source/vault/renderer wiring, supply constants, deployment status, and concrete deployed runtime hashes match the release configuration. Runtime artifact templates contain immutable placeholders and are **not** themselves live runtime hashes. Do not unlock configuration with invented addresses or receipts.

The wallet flow verifies owned originals, obtains source approval when required, explains the permanent 13-token lock, and submits the atomic redemption only after the user's action. Renderer-derived predeployment previews are labeled as previews. After deployment, collectible metadata and art are read from the actual chain.

See `docs/DEPLOYMENT.md` for the deployment handoff and release gates. Use a securely authorized funded wallet. Never put private keys or recovery phrases in chat, environment examples, code, or static files. Never use real originals in tests. A local/mock Base-compatible EVM run does not replace the still-required real-source Base simulation and verification.

## Art and compatibility

SVG geometry, palette, character details, metadata and declarative SMIL animation are generated by immutable Solidity. No external image host, JavaScript, GIF codec, or mutable metadata server is needed. Animation plays in compatible SVG viewers; marketplaces may cache SVG thumbnails as static PNGs. Website preview animation does not prove a marketplace supports animation.

## Attribution

Independent parody inspired by the concept of [Ghoulballs](https://ghoulballs.vercel.app/) and [ColinPlatt/sol_vid](https://github.com/ColinPlatt/sol_vid), with newly authored character art and site. Unaffiliated with the original project. Historical input archives under `archive-inputs/` are retained for provenance and contain superseded 15-token requirements; the executable code and current 13-token documentation take precedence.
