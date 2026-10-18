# Ganja Ghoulballs: native art

## Approved direction

Haunted, hand-rolled goo-ball confections with a ghoul skull embedded inside: wide irregular edges, oat/hash/chocolate flecks, resin drips, black eye cavities, crooked teeth and red, heavy-lidded eyes. The palette favors cannabutter olive, chocolate brown, purple hash, amber resin and ashen mint, with sparse acid highlights. Bandanas, battered beanies, crooked shades, spliffs and bone pipes give the collection a grimy stoner-comedy character.

The reference is a visual vocabulary, not a copied token or likeness. Based Ghouls is the [Ethereum collection by Quinterrible](https://opensea.io/collection/based-ghouls), linked by its [official project page](https://linktr.ee/basedghouls). It is distinct from the original Base Ghoulballs collection used as ingredients. Cheech & Chong's [official retrospective](https://cheechandchong.com/pages/our-story) informed the relaxed, ramshackle comedy and accessories, without reproducing their faces or characters.

## Implementation

- Original SVG geometry and metadata are constructed entirely in `contracts/GooRenderer.sol`.
- No raster images, external URLs, fonts, scripts, image-generation assets or offchain renderer dependencies.
- Fixed 512 × 512 composition with pixel-edged geometry and vector lettering.
- Six scenes: Graveyard Parking Lot, Crypt Hotbox, Deadwood Sesh, Cursed Shakedown, Basement Seance and Astral Ashtray.
- Groups of one, two, four or six ghouls; the first ghoul determines the published mood, silhouette, headwear, prop, texture and eye traits. Additional ghouls have domain-separated face variations; the group shares its material and backdrop.
- Golden Grave Goo and an exposed third eye are rare features. Third-eye ghouls have no headwear to conceal that feature.
- Native SVG SMIL animates a restrained float, drip, blink, ember and smoke cycle. Every animation returns to its starting state. `svg(..., false)` produces a fully static fallback; no JavaScript is required.
- Recipe randomness is deterministic and publicly computable. It is not concealed, reveal-based or manipulation-resistant randomness. Trait threshold percentages are generation rules, not guaranteed final collection counts.

## Reproduce

Run `npm run compile`, then `node scripts/art-samples.mjs` and `node test/art.mjs`. Regenerate PNG evidence with `node scripts/art-contact-sheet.cjs`.

The sample script uses the actual seed encoding with chain ID 8453, a hypothetical collection address and 420 sorted, disjoint 13-original recipes spanning IDs 1–5460. These images are predeployment renderer fixtures, not minted NFTs or predictions of live rarity. The test adds 580 deterministic, randomly selected 13-ID recipes drawn from IDs 1–6667.

Generated evidence:

- `artifacts/art/manifest.json`: recipes, traits, selected SVG fixture data and source hash.
- `artifacts/art/contact-sheet.png`: 16 diverse compiled renderer specimens.
- `artifacts/art/thumbnails-64px.png`: small-size visual readability.
- `artifacts/art-validation.json`: reproducible XML, deterministic-rendering, static-equivalence, uniqueness, gas, size and rasterization results.
- `site/assets/`: exact animated and still SVG renderer previews for the frontend.

Final renderer source SHA-256:

`92037149681b52dfe671ac5b01ab602c5106e872bdfa165265b5ec3579062aa8`

Runtime size is 24,124 bytes, leaving 452 bytes beneath EIP-170. Do not add features without rerunning compiler-size checks and full acceptance tests. Native animation playback and frontend reduced-motion behavior passed separate Chromium browser QA: animated hero pixels changed between captures 1.4 seconds apart, while the reduced-motion still was byte-identical. Evidence is in `artifacts/frontend/renderer-animated-t0.png`, `renderer-animated-t1.png`, `renderer-still-t0.png` and `renderer-still-t1.png`.
