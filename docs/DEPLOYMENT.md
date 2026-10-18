# User-operated Base deployment

This release is not deployed until a successful Base receipt, runtime comparison, and explorer source verification are recorded. Deployment never requires approving, transferring, or minting real original NFTs. Never enter a seed phrase, private key, or account credential into this repository, page, or chat.

## Review and build gates

1. Review the inherited-DNA, asynchronous Chainlink VRF reveal, 420-supply / 13-original implementation and all four immutable contracts. Run the full tests, compile, and check runtime and complete initcode limits. The exact constructor must also pass live Base simulation before a real send.
2. Commit the reviewed sources to the canonical repository. Record that 40-character commit and security-review summary. A successful local test or explorer bytecode capture is not a live-wallet simulation or mainnet deployment.
3. `deploy-ui/oracle-config.json` currently proposes a per-request ceiling of **0.00001 ETH** (`10000000000000` wei). This is an **unapproved proposed immutable setting**, not a selected donation or funding authorization. The constructor's absolute upper bound is 0.0001 ETH. Verify the final cap before immutable deployment; it cannot be changed later.
4. Run `node deploy-ui/build.mjs` after compilation, or the ordinary project build. The schema-2 `dist/deploy/manifest.json` includes all constructor parameters, exact deployment-data hash, compiler, original/wrapper runtime references, all four artifact hashes, and their runtime-template hashes.
5. Valid whole-artifact hashes permit explicit user connection and read-only simulation while `release-approval.json` is `approved: false`. Sending stays locked. Only after independent review, bind `approved: true` to the exact `deploymentDataHash`, reviewed source commit, and review summary. Any changed constructor or bytecode invalidates the approval automatically. Do not reuse the earlier three-contract release approval.
6. Publish only through the separately authorized release process. Never include `node_modules`, archived inputs, `.env`, credentials, or scratch files. This helper does not publish anything itself.

The hash gate detects accidental release mismatch, not a malicious replacement of the entire website. Compare the downloaded artifact, constructor parameters, and source commit before using the page.

## Compiler and runtime

The final Solidity settings are `solc@0.8.30`, optimizer enabled with **50 runs**, viaIR, and Cancun. Reproduce explorer verification from the generated standard JSON input; do not reuse earlier optimizer-200 artifacts or metadata. Node **24.x** is the release runtime (tested with 24.19.0).

## Exact deployment transaction

- Network: Base mainnet, chain ID **8453** (`0x2105`).
- Action: one contract creation, with no `to` field and **exactly 0 ETH value**. Gas is separate. No oracle reserve is transferred in this transaction.
- Constructor: `GanjaGhoulballs(address original_, address wrapper_, uint256 maxRequestPriceWei_)`.
- Original: `0xf3654d0ce6cf518f4efbbe490f4a26483fb0969c`.
- Chainlink VRF v2.5 native-payment wrapper: `0xb0407dbe851f8318bd31404a49e658143c982f23`.
- Proposed per-request cap: `10000000000000` wei, displayed prominently before signing.
- Fixed request parameters: 100,000 callback gas, 3 confirmations, 1 random word.
- The collection first creates `GooGraveyard` (collection CREATE nonce 1), then `GooRenderer` (nonce 2). The renderer creates `GooBackdrop` at its own CREATE nonce 1. The helper predicts all four addresses from the sender's confirmed nonce.
- No token approval, NFT transfer, mint, sacrifice, or funding request is included.

The page verifies the original, its pinned parent renderer (`0x5902e513c974f5d644dde577b46626a4bf7ceb30`), and wrapper's exact live `eth_getCode` hashes and lengths against explorer references. It also checks that the wrapper is configured, not disabled, and reports coordinator `0xd5d517abe5cf79b7e95ec98db0f0277788aff634`. It reads a current native request quote at the observed gas price and requires that quote to fit the proposed cap. The quote is a snapshot, not a promise about future requests.

The page runs constructor `eth_call` and `eth_estimateGas`, compares returned runtime to the collection artifact, adds a 25% gas margin, and displays an L2 execution-fee cap. Base L1 data and operator fees are additional. The wallet's final total is authoritative. The constructor may fail if a live dependency no longer matches its immutable assumptions.

## Direct wallet action

Open the verified production `/deploy/` URL in MetaMask's Android browser, or a browser with your own wallet extension. Nothing requests wallet access on page load. Connect, choose Base, run Simulate, read the entire transaction including the immutable cap, tick the acknowledgment, and personally press “Review deployment in my wallet.” Personally review and approve the wallet confirmation. The assistant must never press real transaction send/confirmation controls.

Reject unexpected approvals, NFT transfers, nonzero deployment value, a different network, or different constructor values. Read-only simulation does not authorize funding.

Simulation expires after two minutes. Account, chain, nonce, pending transactions, source identity, wrapper identity/configuration/quote, and available execution balance are checked again before send. A browser-local intent lock is written before requesting a send and restored on reload. Explicit rejection clears the lock; an uncertain response does not. Check wallet activity and receipt rather than blindly deploying again. The lock is local to that browser/device; switching devices is not a safe retry method.

## Separate oracle funding

The protocol's mint is **nonpayable**. There is no protocol mint fee. Chainlink requests instead spend ETH from a shared sponsor reserve held by the collection. The immutable ceiling limits each request; it is neither an initial donation nor a total-budget guarantee. A request priced above the cap, or an insufficient reserve, reverts before any original NFT is transferred.

Funding is a separate voluntary native-ETH transfer to the **verified collection address**, not to the wrapper. The collection's `receive()` accepts donations. There is no owner withdrawal, refund, cancellation, or recovery path. **Unused surplus remains locked forever.** The deployment helper does not choose an initial amount and never invokes `eth_sendTransaction` for funding.

After final release review and successful receipt verification, an owner may enter an exact chosen ETH amount and acknowledge that it cannot be recovered. “Prepare unsigned funding handoff” checks the account/network, current collection runtime, live wrapper/configuration/quote, current reserve, and wallet balance, and simulates the exact donation. It produces an unsigned transaction record and current-price coverage estimate. It does not send, open a wallet transaction, or authorize a donation. The owner must separately review and approve the precise recipient, value, network, and final fees in their own wallet if they decide to fund. Do not send a top-up merely because a quote or coverage estimate appears low.

Quotes change with gas and provider configuration. The collection, vault, renderer, and backdrop are immutable, but Chainlink's wrapper/coordinator remain externally governed and the service may delay or stop. A stuck reveal has no owner override, retry, provider swap, or refund path. Reserve funding cannot guarantee service availability.

## Verify and activate

1. Check the successful Base receipt, exact input hash, zero value, and expected sender/nonce creation address.
2. Verify collection getters for original, chain 8453, cap 420, count 13, wrapper, request-price ceiling, callback gas, and confirmations. Verify vault original/redeemer, renderer and backdrop addresses, and nested CREATE order.
3. Compare **all four** runtime bytecodes to compiler templates, masking only compiler-reported immutable ranges covered by whole-artifact hashes. Record actual runtime hashes with keys `ganjaCollection`, `graveyard`, `renderer`, `backdrop`. The record also reads and pins the external wrapper runtime as `runtimeCodeHashes.vrfWrapper`, and exports `vrfWrapper` and decimal-string `maxRequestPrice` for site configuration.
4. Download the record, then independently verify all four explorer source contracts using the exact compiler, settings, source input, and constructor arguments. Runtime matching is not explorer verification.
5. Inspect the actual current collection balance and live request quote before mint activation. Creation contributes no reserve; preexisting donations may still exist at a predictable address. Require current reserve to cover at least a request, and clearly show available funding/quotes without implying future guarantees.
6. Only after these checks, configure actual addresses, receipt, source commit, hashes, and verification links in the separate deployment/site configuration. Keep minting disabled until all release checks pass. Test read-only ownership discovery, disabled states, inherited-trait descriptions, pending/revealed displays, and mobile layout. Never use real NFT sacrifices for testing.
7. Verify the public production URL without authentication. Do not change hosting authentication or grant new integration access without the required approval.

If no owner-signed receipt exists, the onchain release is still awaiting their direct wallet action.

## Reproducible source archive

Run `python deploy-ui/package-release.py /absolute/path/outside/source --source-commit <40-character-commit>` after source freeze. It creates a deterministic ZIP, a per-file SHA-256 manifest, and SHA256SUMS. The command excludes dependencies, build output, archives, cache, and credential-file patterns. It preserves only the explicit `covered-dca9` full-supply test artifacts and their current executable-equivalence/boundary reports when that historical coverage set is present; incomplete evidence fails packaging. Other generated artifacts remain excluded. It rejects symlinks and writes nothing to external services. The commit argument is a reference only: compare the snapshot to the actual repository before publication. Do not label an in-progress local ZIP as the final release.

Official references: [MetaMask mobile browser](https://support.metamask.io/configure/wallet/how-to-use-the-metamask-mobile-browser/), [MetaMask eth_sendTransaction](https://docs.metamask.io/metamask-connect/evm/reference/json-rpc-api/eth_sendTransaction/), [Chainlink VRF supported networks](https://docs.chain.link/vrf/v2-5/supported-networks).
