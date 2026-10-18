import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..'),load=p=>JSON.parse(fs.readFileSync(path.join(root,p)));
const b=load('artifacts/build-manifest.json'),t=load('artifacts/contract-tests.json'),g=load('artifacts/gas-profile.json'),s=load('reports/vrf-security-probes.json'),base64=load('reports/base64-probes.json'),dna=load('artifacts/genetics-tests.json'),independentDNA=load('reports/inheritance-probes.json'),actualSource=load('artifacts/original-runtime-tests.json'),metadata=load('reports/onchain-metadata-probes.json'),erc721=load('reports/erc721-model-probes.json');
let boundary=t,bridge=null;
if(Object.keys(b.sourceSha256).some(f=>t.sourceSha256[f]!==b.sourceSha256[f])) {
 execFileSync(process.execPath,[path.join(root,'scripts/runtime-equivalence.mjs')],{stdio:'pipe'});
 bridge=load('artifacts/core-runtime-equivalence.json');boundary=load('artifacts/contract-boundary-tests.json');
 assert(bridge.pass);assert.deepEqual(bridge.currentSourceSha256,b.sourceSha256);assert.deepEqual(bridge.priorSourceSha256,t.sourceSha256);
 assert.equal(bridge.compilerSettingsSha256,b.compilerSettingsSha256);assert.equal(boundary.compilerSettingsSha256,b.compilerSettingsSha256);
 assert.deepEqual(boundary.sourceSha256,b.sourceSha256);assert.equal(boundary.fullSupplyExecuted,false);
 assert.equal(boundary.passed,t.passed-1);assert.deepEqual(boundary.tests,t.tests.slice(0,-1));
 assert.match(t.tests.at(-1),/^full 420-token supply invariant:/);
}
assert.equal(b.compilerSettingsSha256,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'solc-settings.json'))).digest('hex'),'compiler settings changed after build');
for(const report of [t,g,s,base64,dna,independentDNA,actualSource,metadata,erc721]) assert.equal(report.compilerSettingsSha256,b.compilerSettingsSha256,'compiler settings stale in report');
for(const [file,hash] of Object.entries(b.sourceSha256)) {
 assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex'),hash,'source changed since build');
 assert.equal((bridge?boundary:t).sourceSha256[file],hash,'current contract tests ran on stale build');
 assert.equal(g.sourceSha256[file],hash,'gas tests ran on stale build');
 assert.equal(s.sourceSha256[file],hash,'VRF security probes ran on stale source');
 assert.equal(actualSource.sourceSha256[file],hash,'original runtime probe stale');
 assert.equal(metadata.sourceSha256[file],hash,'metadata probe stale');
 assert.equal(erc721.sourceSha256[file],hash,'ERC721 model probe stale');
}
assert.equal(base64.sourceSha256,b.sourceSha256['contracts/GanjaGhoulballs.sol'],'Base64 probe stale');
assert.equal(dna.geneticsSourceSha256,b.sourceSha256['contracts/GooGenetics.sol'],'genetics tests stale');
assert.equal(independentDNA.sourceSha256,b.sourceSha256['contracts/GooGenetics.sol'],'independent genetics probe stale');
assert(s.pass&&dna.passed&&independentDNA.pass);
const n=x=>Number(x).toLocaleString('en-US');
const sizes=Object.entries(b.contracts).filter(([name])=>['GanjaGhoulballs','GooGraveyard','GooRenderer','GooBackdrop'].includes(name)).map(([name,a])=>`| ${name} | ${n(a.runtimeBytes)} | ${n(a.initcodeBytes)} |`).join('\n');
const doc=`# Inheritance and reveal contract test report

Generated ${new Date().toISOString()}. No live transaction was signed or broadcast; no real original NFT was transferred and no oracle reserve was funded.

## Build and evidence consistency

Compiler ${b.compiler}, optimizer runs ${b.optimizer.runs}, viaIR, Cancun. Exact standard JSON input and immutable runtime templates are in artifacts/. Dependencies are pinned in package-lock.json. This report generator checks current source, compiled build, core tests, gas tests, independent oracle tests and independent genetics tests against their exact source and compiler-settings hashes. A documented unchanged-core equivalence bridge may preserve prior full-supply coverage; it never relabels that run.

${Object.entries(b.sourceSha256).map(([f,h])=>`- ${f}: ${h}`).join('\n')}

| Contract | Runtime bytes | Creation bytes |
|---|---:|---:|
${sizes}

All deployed runtimes fit EIP-170. Collection creation plus its 96-byte constructor arguments is ${n(b.contracts.GanjaGhoulballs.initcodeBytes+96)} bytes, below EIP-3860’s 49,152-byte limit. The creation bytecode includes all nested child deployments. Any source change invalidates this report until rebuilt and retested.

## Executable local coverage

${t.passed} core groups passed${bridge?' on the prior renderer snapshot, including the full-supply loop; all '+boundary.passed+' remaining groups were also rerun on the final snapshot':''}:
${t.tests.map(x=>`- ${x}`).join('\n')}

${bridge?`The full-supply run retains renderer SHA256 ${bridge.priorSourceSha256['contracts/GooRenderer.sol']}. Final renderer SHA256 ${bridge.currentSourceSha256['contracts/GooRenderer.sol']} removes the marketplace Art Version trait and applies the separately reviewed numerical Float-layout clipping correction. scripts/runtime-equivalence.mjs validates and strips only canonical Solidity CBOR metadata and proves byte-for-byte equality of collection, vault and backdrop executable runtimes, plus identical ABI, storage layout and immutable-reference maps. Final constructor/mint/callback boundaries, actual-source compatibility, gas profiling and all independent security/metadata probes were rerun. The renderer itself is covered by separate final art acceptance, travel-boundary and provenance checks. See artifacts/core-runtime-equivalence.json and artifacts/contract-boundary-tests.json. No prior coverage hash was rewritten.\n\n`:''}The full-supply test performs 420 local mints and checks all 5,460 permanently locked source NFTs, canonical 13-ID lineage, unchanged original supply, no per-wallet cap and rejection of mint 421. It uses mutable test-only mocks, not real NFTs.

Genetics tests: ${n(dna.assertions)} assertions, 13 exact original parent recipes, 100 input-order permutations, every parent changing the permanent commitment, 10 malformed recipe types and 1,000 synthetic post-commit entropy inputs. Independent genetics probes add ${n(independentDNA.assertions)} assertions and paired-allele dominance/recessive oracle comparisons. Every parent contributes to the family means and gene pool; integer quantization does not promise that every small parent edit visibly changes every child trait.

Independent oracle/custody integration: ${n(s.assertions)} assertions. Tests cover reserve and cap checks, wrapper quote/request failures, all 13 custody, source/wrapper/receiver reentry, recipient rejection rolling back the oracle payment, unknown/malformed/duplicate callbacks, out-of-order fulfillment, zero/max entropy, pending-token transfers, permanent snapshots after source recipe failure, and the absence of admin/retry/withdraw/provider-switch selectors.

Independent ERC-721 authorization/transfer model coverage: ${n(erc721.assertions)} assertions, including 120 model rounds.

The actual captured original ERC-721 and renderer runtimes also pass a separate local compatibility test: 26 synthetic-account mints, consolidation, 13 actual-source transfers, direct recipes, final lineage, and rollback of actual-source custody/reserve after an oracle-request rejection. Actual-source redemption execution gas is ${n(actualSource.mintExecutionGas)}. This starts from empty synthetic storage on local 31337; it is not a Base fork.

The onchain-metadata dependency probe checks 39 pending, 39 revealed and 39 still outputs and stable revealed art after both source-recipe and wrapper failure. No external asset, script, remote font or metadata dependency was found.

The callback is explicitly run with a 100,000-gas cap and cold first writes. It performs no external call, rendering, recombination or receiver hook. It stores one entropy word and the revealed flag, then emits events. Valid zero entropy cannot be confused with pending.

Independent Base64 oracle: ${n(base64.passedCalls)} cases match Node Buffer, including lengths 0–256, boundaries through 32,769, binary patterns and deliberately dirty trailing allocation. The memory-safe encoder's partial final-group read ends at the last actual input byte; it does not rely on adjacent allocations. These are executable tests, not a formal proof or a professional third-party audit.

## Measured execution gas

In-memory EthereumJS Cancun execution only. Excludes transaction intrinsic/calldata costs and Base L1 data fees. Mint figures use a simplified mock ERC-721 and mock wrapper; actual deployed source/provider gas may differ.

| Operation | Execution gas |
|---|---:|
| Creation including vault, renderer, backdrop | ${n(boundary.gas.deploymentExecution)} |
| First mint, 13 per-token approvals | ${n(boundary.gas.firstMintPerTokenApproval)} |
| Later mint,operator approval | ${n(boundary.gas.secondMintGlobalApproval)} |
| First nonzero callback, cold storage | ${n(boundary.gas.callbackColdFirstWrite)} |
| Independent callback including call overhead | ${n(s.callbackGasWithCallOverhead)} |
| 13 exact original recipe reads and packing, harness | ${n(dna.snapshotExecutionGas)} |
| Largest sampled full tokenURI | ${n(g.maxTokenURIExecutionGas)} |
| Largest sampled animated SVG | ${n(g.maxSVGExecutionGas)} |

The ${g.samples} gas-profile tokens are locally minted and revealed with test-only chosen entropy: 1/2/4-ball representatives and all 36 six-ball scene/headwear pairs. Metadata traits are asserted against each target, not inferred only from helper code. Largest sampled tokenURI is ${n(g.maxTokenURIBytes)} bytes. This bounds tested structures, not every possible genome/seed. Production entropy is supplied by the one-shot oracle, not selected by a user or this sampling script.

## Permanent rules and external boundaries

- Exactly 13 originals are atomically locked per zero-value mint, up to 420. Source IDs are canonicalized, so order is irrelevant.
- Base deployment pins the original address/runtime, original renderer runtime, and Chainlink wrapper address/runtime. Exact verified explorer source/runtime evidence is retained in reports/; the original renderer was recompiled and matched byte-for-byte.
- The actual mint block and original mint caller are stored once, preserved exactly in metadata and encoded as subtle visual Easter eggs. Neither is replaced by the callback block, current read block, or current owner. No transaction hash is claimed.
- Source recipe snapshots are permanent. Count/motion/theme use paired parent alleles, explicit dominant/recessive expression, donor-led inherited colors and bounded mutations. See docs/DNA_AND_REVEAL.md for exact fields and probabilities.
- One request per minted NFT. No preview endpoint, cancellation, reroll, replacement request, provider switch, owner, rescue, withdrawal or upgrade.
- Separate native donations sponsor oracle fees. An immutable per-request cap bounds reserve spending; unused donations cannot be withdrawn.
- The fixed wrapper is an externally governed oracle service. Its configuration/coordinator and future liveness are not controlled by this ownerless consumer. If no valid callback arrives, a token may remain pending permanently. There is no alternate-seed fallback and no claim of automatic callback retry.
- Original totalSupply does not decrease. These are permanent locks, not source burns. Raw ERC-721 transferFrom can force accidental deposits into the vault without mint credit; never send NFTs directly to it.

## Remaining production gates

No live Base fork integration, public testnet deployment, real oracle round-trip, funding, mainnet deployment or actual sacrifice was performed. A normal RPC attempt was denied; no access control was bypassed. Explorer source/runtime evidence and local tests do not replace a live wallet-RPC simulation and actual deployment receipt verification. Concrete runtime hashes must be collected from deployed contracts with immutable substitutions verified. Website publication does not establish a contract deployment. Deployment and funding approval remain separate user decisions.

## Re-run

npm ci --ignore-scripts --include=dev, then npm test. npm run test:all adds art and browser suites. npm run build compiles, renders bounded example assets and builds the fail-closed static site; it never broadcasts transactions. Machine results: artifacts/contract-tests.json, artifacts/genetics-tests.json, artifacts/gas-profile.json, reports/vrf-security-probes.json, reports/inheritance-probes.json, reports/base64-probes.json.
`;
fs.writeFileSync(path.join(root,'docs/CONTRACT_TEST_REPORT.md'),doc);console.log('Inheritance/reveal contract report verified against current source hashes.');
