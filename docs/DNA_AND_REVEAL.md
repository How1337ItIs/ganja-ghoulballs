# DNA-inspired inheritance and one-shot reveal

This is an artistic genetics system, not a scientific model of reproduction. Each GGOO permanently records its 13 original parent IDs and 13 compact parent chromosomes. The recipe is read directly from the verified original collection; the contract never asks a GIF, token URI, server, or owner to describe the parents.

## Commit first, reveal later

1. `mint(uint256[13])` sorts the chosen IDs. Input order does not affect inheritance. It requires 13 distinct IDs in the original collection's supported 1–6667 range, caller ownership, and approval for every parent.
2. It checks the current native Chainlink quote against the immutable per-request price cap and available sponsor reserve. Mint itself is nonpayable.
3. It reads and validates all parent recipes, snapshots their genes, and permanently transfers all 13 originals to the immutable vault. It verifies custody of every parent after the last transfer.
4. It pays for one Chainlink VRF request and mints a pending NFT. A failed request, failed transfer, or rejected NFT receiver rolls back the whole transaction, including the fee and all source transfers.
5. The immutable wrapper delivers one random word. A constant-work callback stores it once and emits an ERC-4906 metadata update. The final genome and SVG are derived by read-only functions. No second user transaction is needed.

There is no offspring-preview function, cancellation, retry, second request, alternative seed, administrator, mutable renderer, or withdrawal. A pending NFT remains transferable. Its source parents remain locked. Unknown, duplicate, or malformed authenticated callbacks are ignored. Zero is a valid random word. Unauthorized callbacks revert.

The fixed provider is Chainlink's Base native-payment direct-funding wrapper, `0xb0407dbe851f8318bd31404A49e658143C982F23`. The consumer requests one word with 100,000 callback gas and 3 confirmations. Base deployment pins the wrapper, original collection, and original renderer code hashes. The wrapper's governance/configuration/coordinator and service liveness remain external dependencies. If the service never supplies a valid callback, the NFT can remain pending permanently; there is deliberately no fake recovery or alternate-outcome fallback. Chainlink does not automatically retry a reverting consumer callback. Local tests measure the small, external-call-free callback with cold storage writes, but they do not prove future oracle delivery.

## Mint-block and minter Easter eggs

The collection records the actual `block.number` of the mint once in `mintBlockOf(tokenId)`. Pending and revealed SVGs receive that stored value, never the current read block or later oracle callback block. The image encodes it subtly as an Easter egg rather than an obvious number or barcode; exact provenance is also exposed as the decimal-string `properties.mint_block` in metadata. This is a block number, not a claim to encode the current mint block's hash (which is unavailable within that mint transaction). The original mint caller is also stored once as `mintedBy(tokenId)`, retained exactly in `properties.minted_by`, and covertly encoded alongside the block. For smart-contract minters this is the receiver contract address (`msg.sender`), never `tx.origin`. Transfers do not alter either birthmark. No transaction hash or substitute fingerprint is encoded. These birthmarks do not affect parent-allele inheritance or oracle entropy.

## Parent chromosomes

Each parent word preserves every active original ball's RGB color and radius, the original ball count, theme, motion and scene, the average of its eight sky colors, and mean X/Y phases. Parent recipes must have the verified source shape: count 1/2/4/6, matching scene 7/8/9/10, theme/motion 0–3, 48 palette bytes, radii 5–10, legal phases, and ball colors matching the palette. Parent seeds must match the original collection's chain/address/token domain.

The immutable parent digest commits to the chain, original collection, sorted IDs, chromosomes, and original seeds. It excludes the new collection address, redeemer, token number, block timestamp and mint order. After mint, art never depends on another call to the original collection.

## Alleles, dominance and recombination

Count, motion and theme are separate loci. Each locus draws two distinct parent chromosomes uniformly from the 13-parent pool. Therefore each parent's inclusion probability at each locus is exactly 2/13 before negligible modulo bias; common alleles are more likely to appear in a pair. The three loci recombine independently using domain-separated hashes of the one VRF-derived final seed.

- Count dominance order: **2 > 4 > 1 > 6**.
- Motion and theme dominance order: **0 > 1 > 2 > 3**.
- Equal paired alleles always express their shared value before mutation.
- Different paired alleles express the dominant value with nominal probability **75%**, the recessive value **25%**, before mutation.

These dominance ranks are explicit creative rules, not claims that those source traits have biological dominance. Both donor indexes for every locus remain in the final genome, so the expressed and unexpressed alleles can be reconstructed from permanent lineage.

Color has donor-led, polygenic expression: body and accent each select an actual active ball from two distinct uniformly selected parent donors, then mix 75% of that ball's RGB with 25% of the equally weighted 13-parent family RGB mean. A separate sky donor contributes 75% of its mean sky color with 25% of the family's sky mean. Every parent contributes equally to family means regardless of its ball count. Radius and phase offsets are equal-parent polygenic averages. Integer quantization means changing one parent need not visibly change every averaged trait.

The final scene is derived from inherited theme plus a random choice of compatible backdrop grouping. Ghoul accessories, facial differences and secondary art details are final-seed-derived artistic variation.

## Bounded mutations

Independent domain-separated decisions apply after inheritance:

| Flag bit | Nominal probability | Effect |
|---|---:|---|
| 0 | 1/8 (12.5%) | Count moves one adjacent category in 1,2,4,6; endpoints move inward |
| 1 | 1/10 (10%) | Motion changes to one of the other three modes |
| 2 | 1/5 (20%) | Body RGB channels each receive the same +8 or -8 tint, clamped to 0–255 |
| 3 | 1/10 (10%) | Radius changes by one; 5 and 10 move inward |

The nominal chance of one or more of these four mutations is 43.3%; about 56.7% have none. These are design probabilities under uniformly distributed oracle entropy, not promised collection frequencies. Modulo reductions have negligible mathematical bias. Accessories have their own renderer rules.

## Packed layouts

Offsets are inclusive. All words are unsigned 256-bit integers. RGB is standard 24-bit big-endian channel order within each color field.

### Parent word (version 3)

| Bits | Field |
|---|---|
| 0–143 | Six RGB24 slots, active ball colors first; unused slots zero |
| 144–167 | Six radius4 slots |
| 168–175 | Original ball count |
| 176–183 | Theme |
| 184–191 | Motion |
| 192–199 | Original scene |
| 200–223 | Mean sky RGB24 |
| 224–231 / 232–239 | Mean X / Y phase |
| 240–247 | Version = 3 |
| 248–255 | Zero |

### Child genome (version 3)

| Bits | Field |
|---|---|
| 0–23 / 24–47 | Body / accent RGB24 |
| 48–55 / 56–63 / 64–71 | Final ball count / scene / motion |
| 72–79 / 80–87 | Radius / mutation flags |
| 88–95 / 96–103 | Inherited count / motion before mutation |
| 104–111 | Version = 3 |
| 112–135 / 136–143 | Sky RGB24 / inherited theme |
| 144–151 / 152–159 | Mean X / Y phase |
| 160–167 / 168–175 / 176–183 | Body / accent / sky parent donor indexes |
| 184–191 / 192–199 | Body / accent ball indexes |
| 200–207 / 208–215 | Count allele donor A / B |
| 216–223 / 224–231 | Motion allele donor A / B |
| 232–239 / 240–247 | Theme allele donor A / B |
| 248–255 | Zero |

All parent indexes refer to the ascending `ingredientsOf(tokenId)` / `parentGenesOf(tokenId)` arrays. `lineageOf` returns both arrays and the digest. `genomeOf` and `seedOf` revert before reveal. `svg`, `svgStill`, `traitsOf` and `tokenURI` return generic pending content before reveal. Metadata retains source IDs and chromosome strings to avoid JavaScript integer truncation.

## Sponsor reserve and limits

Anyone can donate native ETH using a separate transfer to the collection. Donations and unspent leftovers cannot be withdrawn. Only an atomic mint can pay the pinned wrapper. The immutable per-request cap prevents high-gas-price transactions from consuming more than the selected cap per mint. Funding `420 × cap` covers the maximum consumer-side request spend if all 420 requests are accepted below that cap, but is intentionally larger than a current-quote estimate. The deployment handoff must display the selected cap and funding amount separately and obtain the user's wallet approval. No oracle funds or real NFT transactions were sent during development.

Official references: [direct funding](https://docs.chain.link/vrf/v2-5/overview/direct-funding), [consumer integration](https://docs.chain.link/vrf/v2-5/direct-funding/get-a-random-number), [security considerations](https://docs.chain.link/vrf/v2-5/security).
