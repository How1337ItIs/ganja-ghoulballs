# Deployment helper QA

Checked locally on 2026-10-18. No real wallet, blockchain transaction, funding, approval, or NFT sacrifice was used. Release approval remains false.

## Automated helper suite

`node --experimental-vm-modules deploy-ui/test.mjs` passes with synthetic wallet/contract fixtures and captured public runtime references. Coverage includes:

- Exact three-argument constructor, Base network, zero deployment value, cap parameters, whole-artifact hashes, and all four runtime templates.
- Complete constructor initcode including 96 argument bytes must fit EIP-3860; every runtime must fit EIP-170. An incomplete build invalidates old approval metadata before failing.
- Original collection, original renderer, and Chainlink wrapper runtime length/hash pins; empty, wrong-length, and same-length altered code fails closed.
- Wrapper configured/enabled state, current coordinator, and current quote within cap.
- Explicit user connection, read-only simulation, independent review/acknowledgment gates, no automatic wallet calls, and retained evidence for an unfunded wallet.
- A final account/chain/confirmed+pending nonce check after all asynchronous pre-send reads, including a nonce changed during oracle RPC.
- Persistent deployment intent across reloads, existing-intent recheck after preflight, exact intent-storage read-back, uncertain-send lock, explicit-rejection reset, and no send for concurrent/conflicting intents.
- Successful four-contract receipt verification, child CREATE order, immutable getters, and runtime mutations/settings mismatches rejected for each component.
- Exact-decimal user-selected funding amount and unsigned donation simulation only. Changing the amount, account/nonce, or acknowledgment invalidates the record. No funding send handler exists.

## Real local browser

Headless Chromium loaded the built helper with a wallet-request detector at mobile 390×844 and desktop 1440×1000, across all four paths:

- `/deploy/`
- `/deploy`
- `/ganjaghoulballs/deploy/`
- `/ganjaghoulballs/deploy`

All eight combinations loaded the artifact manifest and locally bundled ethers successfully. Connection was available, deployment and funding remained locked, no wallet request was issued, no page errors occurred, and no horizontal overflow occurred. The mobile full-page screenshot was visually inspected for wrapping and controls.

## Remaining release checks

These tests do not prove current Base behavior. Final source/bytecode review, the owner's live wallet-RPC original/parent-renderer/wrapper checks, live constructor simulation, exact cap review, user wallet confirmation, actual receipts, all four explorer source verifications, and separately authorized reserve funding are still required. Re-run the suite and build after any contract/artifact change. No live-site publication is performed by these tests.
