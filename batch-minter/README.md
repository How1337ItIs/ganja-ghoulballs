# Original Ghoulballs batch helper

`GhoulBatchDeploy.sol` and `build.mjs` are unchanged copies from
[`How1337ItIs/ghoulbatch-minter` at `9a3422c54145118d012649e6a64b4068e3d605e5`](https://github.com/How1337ItIs/ghoulbatch-minter/tree/9a3422c54145118d012649e6a64b4068e3d605e5).
The upstream build is retained as provenance; GGOO uses
`node scripts/build-original-minter.mjs` to reproduce and verify the artifact.
No deployed GGOO contract is changed.

The build rejects a changed source SHA-256, compiler version, constructor ABI,
bytecode length or creation-bytecode Keccak-256. It preserves the upstream
Solidity source-unit name, optimizer settings (enabled, 200 runs) and Cancun
EVM target, including compiler metadata. Its outputs are
`site/original-minter.json` and `site/GhoulBatchDeploy.sol`.

The helper only accepts Base, integer quantities 1 through 30 and zero ETH
value. Each fresh child contract consumes its own one-time original-collection
mint allowance and mints directly to the deployment sender. The helper never
receives NFTs or approves an operator. If any child fails, the entire creation
transaction reverts. Gas is still charged for a reverted transaction.

Minting originals is separate from the GGOO action that permanently locks 13
originals. A batch mint does not select, approve, transfer or lock originals.
Contract-wallet recipients must accept ERC-721 safe mints and their wallet
must support contract creation; the exact transaction is simulated first.

## Read-only source verification

The original collection's verified `mintTo` calls `_mintNext(recipient)`.
`_mintNext` checks the 6,667 cap and `hasMinted[msg.sender]`, sets that caller's
flag, increments supply, then calls `_safeMint`. It limits the caller rather
than the recipient, and requires ERC-721 receiver support for contract
recipients. See the [verified original contract](https://basescan.org/address/0xf3654d0ce6cf518f4efbbe490f4a26483fb0969c#code).

Read-only Base RPC observations on 2026-10-18 at 17:01:16 UTC: chain ID 8453,
fixed block `0x3254f3c` (52,776,764), original supply 229 (6,438 remaining), and
GGOO supply 3. The original deployed runtime's Keccak-256 matches the repository's
captured runtime. Live constant reads confirm the original cap of 6,667, GGOO
cap of 420 and 13 required originals. These are observations, never a supply reservation. The frontend must
refresh supply and simulate immediately before requesting wallet approval.
No live transaction was sent. Blockscout's connector returned exhausted API
credits, so verification used the public Base RPC and BaseScan verified
source instead.

Reproduce the evidence with:

```sh
node scripts/build-original-minter.mjs
node test/original-minter.mjs
node scripts/check-original-minter-live.mjs
```

The VM suite covers 28 local cases and saves `reports/original-minter-tests.json`.
It uses realistic mocks for injected failure/receiver cases and pinned deployed
original/renderer bytecode with empty local storage for 1/13/30 mint checks.
The optional live script only permits read RPC methods and saves a single-block
observation to `reports/original-minter-live.json`. No test signs, broadcasts,
or consumes real NFTs.
