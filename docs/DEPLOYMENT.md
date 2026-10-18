# User-operated Base deployment

This project is not deployed until a successful Base receipt, runtime comparison, and explorer source verification are recorded. Deployment never requires minting or approving any real original NFTs. Never enter a seed phrase, private key, or account credential into this repository, page, or chat.

## Release gate

1. Finish the 420-supply / 13-original contract implementation and independent security review. Run the full test suite, compile, and check runtime/creation bytecode limits. Before a real send, the exact constructor must also pass live simulation against the Base original contract.
2. Commit the reviewed sources to the canonical repository. Record that 40-character commit and the security review summary.
3. Build with `node deploy-ui/build.mjs` after `npm run compile`. The generated `dist/deploy/manifest.json` contains the full constructor transaction data's Keccak-256 hash, bytecode hash, compiler, original collection address, and runtime template hashes.
4. With valid whole-artifact hashes, the page permits explicit user connection and read-only Base simulation while `approved` is false. It cannot request a send. The owner can download the simulation record (including live original runtime hash, block, gas, predicted addresses, and unsigned transaction) for review. Only after review, set `deploy-ui/release-approval.json` to `approved: true` with the exact `deploymentDataHash`, reviewed `sourceCommit`, and meaningful `reviewSummary`. A missing or mismatched approval keeps sending locked. Rebuilding changed contracts invalidates the gate automatically. The approval file never contains wallet credentials.
5. Include `await buildDeployUI()` from `deploy-ui/build.mjs` after the ordinary site build has created `dist`. This copies the page, artifacts, and pinned ethers browser module. Do not publish `node_modules`, archive inputs, `.env`, or secrets.

The hash gate detects accidental release mismatch; it is not independent proof of website integrity. Compare the downloaded artifact and source commit before using the page.

## Deployment transaction

- Network: Base mainnet, chain ID 8453 (`0x2105`).
- Action: one contract-creation transaction; the `to` field is absent.
- Native value: exactly 0 ETH. The deployer pays gas separately.
- Constructor: `GanjaGhoulballs(address original_)` with `original_ = 0xf3654d0ce6cf518f4efbbe490f4a26483fb0969c`.
- Constructor creates its `GooGraveyard` first and `GooRenderer` second. With no pending sender transactions, their expected CREATE addresses are shown before signing.
- No owner/admin, token approval, mint, NFT transfer, or sacrifice is requested by this page.
- Exact gas limit and fees depend on the final bytecode and live Base state. The page runs `eth_call` and `eth_estimateGas`, compares the simulated collection runtime against the compiled template, adds a 25% gas margin, and displays an execution-fee cap. Base L1 data fees are additional. Review the final total in the wallet.

## Wallet handoff

The owner opens the verified production URL ending in `/deploy/` inside MetaMask's Android built-in browser or in a desktop browser with their own wallet extension. No signing connector, custodial key, account import, or private-key environment variable is required. The page makes no wallet requests at load.

The owner personally presses Connect, selects Base, runs Simulate, reads the complete transaction details, ticks the acknowledgment, and presses “Review deployment in my wallet.” They must personally review and approve the wallet's transaction confirmation. The assistant must never press the send or confirmation controls for a real transaction. Reject any unexpected token approval, NFT transfer, nonzero ETH value, or other network request.

The page rejects stale simulations (two minutes), a changed account/chain/nonce, and pending sender transactions. It writes a browser-local intent lock before requesting a send and preserves that lock across reloads, including any uncertain response. A rejected wallet request removes that intent and requires a fresh simulation. If a request outcome is unclear, inspect the wallet activity and check the transaction hash; do not deploy another copy blindly. The lock is local to that browser/device, so do not switch devices to retry a request of unknown status.

Official wallet documentation: https://support.metamask.io/configure/wallet/how-to-use-the-metamask-mobile-browser/ and https://docs.metamask.io/metamask-connect/evm/reference/json-rpc-api/eth_sendTransaction/.

## Verify and activate

1. Read the successful receipt on Base. Check that transaction input hashes to the approved deployment data, the value is zero, and the receipt contract address matches sender/nonce.
2. Read all three runtime bytecodes. Compare against final compiler templates while masking only compiler-reported immutable ranges, then record the actual onchain runtime Keccak hashes. Whole-artifact hashes also cover ABI and immutable-range metadata. Verify the collection's original address, deployment chain 8453, cap 420 and count 13, and the vault's immutable original/redeemer addresses. The output hash keys match site configuration: `ganjaCollection`, `graveyard`, and `renderer`.
3. Download the deployment record from the page, and independently verify all three source contracts with the exact pinned compiler, settings, source input, and constructor arguments. Runtime matching alone is not explorer source verification.
4. Only after independent verification, update `deployments/base.json` and site configuration with actual addresses, source commit, receipt, and verification links. Redeploy the website and test it read-only, including ownership discovery, disabled states, and mobile layout. Do not test with real NFT approvals or mints.
5. Check the public production alias without authentication. Do not change Vercel authentication or new integration permissions without the required approval.

If the owner has not signed, report the website/repository as prepared and the onchain release as awaiting their direct wallet action. Never claim mainnet deployment from a compilation, simulation, or prepared transaction.
