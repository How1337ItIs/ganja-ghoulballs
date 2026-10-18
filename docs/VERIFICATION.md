# Reproduce deployed source

The four Sourcify links in the README record exact creation and runtime matches on Base (8453), verified on 2026-10-18. This is source/bytecode verification, not an external audit. Other explorers are not claimed source-verified here.

1. Use Node 24.x and `npm ci --ignore-scripts --include=dev`.
2. Run `npm run compile`. The pinned compiler is Solidity `v0.8.30+commit.73712a01`, optimizer 50, viaIR, Cancun.
3. Use generated `artifacts/standard-input.json` without edits for standard-JSON verification. The source files and exact compiler settings are committed; generated artifacts are deliberately excluded.
4. Targets: `contracts/GanjaGhoulballs.sol:GanjaGhoulballs`, `contracts/GooGraveyard.sol:GooGraveyard`, `contracts/GooRenderer.sol:GooRenderer`, and `contracts/GooRenderer.sol:GooBackdrop`.
5. Collection constructor arguments: original `0xf3654d0ce6cf518f4efbbe490f4a26483fb0969c`, wrapper `0xb0407dbe851f8318bd31404a49e658143c982f23`, max request price `10000000000000` wei. Graveyard constructor: original followed by the collection address. Renderer and backdrop have no constructor arguments.
6. Runtime templates have immutable placeholders. Compare live code while accounting only for compiler-reported immutable ranges and independently verify each immutable value. `deployments/base.json` records concrete live runtime hashes, not template hashes.

The deployment record's sourceCommit is historical private-repository provenance; it does not claim that commit is reachable in a fresh public export. Exact Solidity source hashes and compiler-generated metadata, rather than a repository-name assumption, establish the reproduction link.

The tests use local EVMs and mocks. `test:source` uses captured public runtime bytecode with fresh local state; it is not a live Base fork. Local results and verified deployment do not establish that any NFT has successfully completed the live mint/reveal flow.
