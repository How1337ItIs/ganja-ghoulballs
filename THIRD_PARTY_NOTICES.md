# Third-party notices and provenance

Project-authored Solidity, frontend, scripts and documentation are distributed under the root MIT license. Solidity sources retain their MIT SPDX headers. The project is an independent parody, unaffiliated with the original Ghoulballs project.

- Concept references: https://ghoulballs.vercel.app/ and https://github.com/ColinPlatt/sol_vid . Inspiration is not an endorsement or a claim of ownership of upstream brands or artwork.
- `site/vendor/ethers.min.js` is ethers, with its upstream MIT notice preserved in `site/vendor/ETHERS-LICENSE.md`. The build copies ethers and its license from the pinned npm dependency.
- npm dependencies retain their respective upstream licenses. `package-lock.json` records exact versions, registry locations and integrity hashes; dependencies are not vendored in the source distribution.
- `reports/original-basescan-runtime.hex` and `reports/original-basescan-abi.json` are captured public chain/explorer compatibility fixtures for original Ghoulballs at Base `0xf3654d0ce6cf518f4efbbe490f4a26483fb0969c`.
- `reports/original-renderer-source/src/` preserves five upstream renderer source files with their original MIT SPDX headers, captured for reproducible comparison to the verified Base renderer. Their origin is the original Ghoulballs renderer linked below; author attribution is retained in the upstream project link above.
- `reports/original-renderer-runtime.hex` is the corresponding public renderer at Base `0x5902E513C974f5d644DDe577b46626a4BF7CEB30`. `reports/original-trait-probes.json` records derived local recipe fixtures. Tests validate bytecode hashes before use. These externally authored fixtures are not represented as original project-authored code or relicensed by the root license. Upstream rights and notices remain applicable.

The SVG examples are generated from the included GGOO renderer and are illustrative, not predictions of a chosen mint. Historical input archives and dependency/build output are excluded from a fresh export. Dated technical evidence and reproducible review tools are retained. No independent legal clearance of upstream brand/art rights is asserted.
