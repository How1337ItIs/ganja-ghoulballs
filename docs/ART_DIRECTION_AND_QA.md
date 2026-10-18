# Ganja Ghoulballs: native art and verification

## Visual direction

Haunted, hand-rolled goo confections with a ghoul inside: irregular edges, oat/hash/chocolate flecks, resin drips, dark eye sockets, crooked teeth and heavy red eyes. Beanies, bandanas, crooked shades, spliffs and bone pipes provide the stoner-comedy character. Purple and teal skies, sunset stripes, neon accents, astral rings and perspective floor grids retain the original collection's vaporwave vocabulary.

The references inform a visual vocabulary, not a copied token or likeness: [Based Ghouls](https://linktr.ee/basedghouls) and [Cheech & Chong's official retrospective](https://cheechandchong.com/pages/our-story). Based Ghouls is distinct from the original Base Ghoulballs collection used as ingredients.

## Inheritance and reveal

Each mint permanently locks 13 original Ghoulballs. The core snapshots their actual onchain recipes, including ball colours, radii, phases, count, theme and motion. The original recipe implementation was rebuilt and matched byte-for-byte against its deployed Base renderer; see the original-renderer verification reports.

`GooGenetics` performs the documented donor selection, family colour mixing, paired-allele expression and bounded mutations. All 13 parents contribute to the family commitment. The child is not derived merely from token IDs, its new token number or an imagined collection address. Final recombination uses a one-shot Chainlink VRF result. Rendering becomes deterministic once that result is stored. There is no exact pre-mint offspring predictor. Art samples use clearly identified synthetic post-reveal inputs or local mock families, never purported oracle results or live sacrifice forecasts.

The renderer receives the final seed and packed genome. Literal inherited body/accent/sky colours, count, radius and motion affect the image. Other seeded details include faces, textures, silhouettes, accessories, rare golden veins and exposed third eyes. Trait thresholds are generation rules, not guarantees of the final collection's counts.

## Immutable native SVG

`contracts/GooRenderer.sol` contains `GooRenderer` and its immutable `GooBackdrop` helper. All geometry, colours, metadata traits and animation definitions are onchain. There are no raster images, external assets, fonts, scripts or offchain rendering dependencies inside the SVG.

The composition is 512 × 512 with pixel-edged geometry and vector footer glyphs. Six haunted scenes support groups of 1, 2, 4 or 6 ghouls. The first ghoul supplies the published face/accessory traits; subsequent faces use domain-separated seeds. The first two bodies can carry props/headwear. Shared phenotype colours and inherited body scale keep the group coherent.

Native SMIL supplies:

- Ricochet: a closed, angular bouncing path
- Orbit: an actual elliptical travel path, independently nested with a full spin
- Float: vertical travel with a wobble
- Figure Eight: a closed cubic path with two opposing lobes and a genuine centre crossing, independently nested with a full spin
- Body squash/stretch, counter-moving faces, blinks, jaw movement and resin-path morphing
- Two staggered curling/fading smoke wisps anchored to each actual ember, including the correct spliff, roach and pipe positions

Animation cycles are periodic. `svg(seed, genome, tokenId, mintBlock, minter, false)` contains the same native geometry without animation elements. `pendingSvg(tokenId, mintBlock, minter)` shows a sealed, unrevealed recipe without disclosing its future phenotype. The website loops artwork by default and offers an explicit Pause/Play control with still images.

## Hidden mint provenance

The original mint block and original minter are frozen by the core at mint time. Transfers and delayed reveals do not replace them with the current owner, current block or callback block. Exact values are also present in the NFT's metadata properties. No transaction hash is invented or claimed.

Eighteen faint 2 × 2 floor glints encode all 256 block bits and all 160 address bits. There is no visible number, label or barcode. Engineering decoder details:

- Glint index `i` runs from 0 through 17 in SVG order.
- Position is `x = 24 + 25*i`, `y = 455 + 4*(i % 4)`, opacity 0.18.
- Each RGB colour is one little-endian 24-bit word.
- The first 11 words reconstruct the block with shifts `24*i`.
- The remaining 7 words reconstruct the original minter with shifts `24*(i-11)`.
- The upper 8 bits of the final word of each value are zero padding, not discarded input bits.

`test/art-provenance.mjs` provides the decoder and checks zero, a representative Base block, a high 64-bit block, the maximum 256-bit block and zero/mixed/maximum 160-bit addresses across pending, still and animated output. These are code-level tests, not a public decoding interface.

## Reproduction and scope

Use Node 20 or later and the committed dependency lockfile. The production compiler is Solidity 0.8.30, optimizer 50 runs, viaIR, Cancun. `artifacts/build-manifest.json` records exact source/settings hashes and runtime/initcode sizes. Compiler checks enforce EIP-170 and the 49,152-byte initcode limit including constructor arguments.

1. `npm run compile`
2. `node scripts/art-samples.mjs`
3. `node test/art.mjs`
4. `node test/art-provenance.mjs`
5. `node test/art-bounds.mjs`

The sample generator verifies the compiled artifact's source keccak and compiler settings before assigning a current source hash. It writes 16 synthetic renderer studies plus 8 actual recombination examples from the current passing genetics test report. Those 8 examples use 13 mock originals with the byte-for-byte verified original recipe code and explicit test entropy. They are not live NFTs.

`node scripts/art-samples.mjs --export-site` copies canonical animated/still assets and manifests into the local site. It does not change website HTML, connect a wallet or publish anything.

Current evidence locations:

- `artifacts/art-v3/manifest.json`: exact compiled source/settings hashes, genes, traits and fixture provenance
- `artifacts/art-v3/contact-sheet.png`: 16 diverse still specimens
- `artifacts/art-validation.json`: 1,000 synthetic genomes, 1,000 unique animated/still pairs, 420 thumbnail rasters, XML/SMIL/static-equivalence checks, edge inputs, metadata and gas measurements
- `artifacts/art-provenance.json`: exact full-width hidden-code decoding
- `artifacts/art-final-delta.json`: exact final metadata/Float-layout source changes and 48-file SVG comparison against the prior covered build
- `artifacts/art-v3/bounds-check.json`: conservative maximum-radius travel/rotation/squash/accessory bounds, including the separate Float layout
- `artifacts/lab/figure-eight-trajectory.json`: native-browser centre trajectories sampled 17 times per cycle, independently of nested spin
- `artifacts/lab/smoke-anchor-qa.json`: both smoke origins remain attached through rotation while curls and opacity change
- `site/assets/preview-manifest.json` and `site/lab/manifest.json`: the source-bound assets displayed by the website

A static contact sheet cannot demonstrate movement. Browser trajectory and smoke tests verify actual native playback. Exact report hashes identify their covered build; a later metadata-only cleanup must be accompanied by an explicit equivalence report rather than relabeling old results. Earlier files under `artifacts/art/` and archived input packages are historical evidence, not the current renderer or inheritance rules.

The current manifests are authoritative for release fixtures. Unlisted older SVGs retained in sample directories are historical and must not be included in a current-art reproducibility comparison. The final renderer has fresh 1,000-genome, 3,360-pose and 36-provenance-case reports; the supplemental delta report does not replace those checks.
