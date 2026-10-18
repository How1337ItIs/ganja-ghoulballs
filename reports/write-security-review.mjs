/** Rebuild this review only from mutually consistent, passing local evidence. */
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import assert from 'node:assert/strict';import {ContractFactory,keccak256} from 'ethers';
const root=path.resolve(import.meta.dirname,'..'),file=p=>path.join(root,p),load=p=>JSON.parse(fs.readFileSync(file(p))),sha=p=>crypto.createHash('sha256').update(fs.readFileSync(file(p))).digest('hex');
const eq=load('artifacts/core-runtime-equivalence.json');let boundary=load('artifacts/contract-boundary-tests.json');
const b=load('artifacts/build-manifest.json'),t=load('artifacts/contract-tests.json'),g=load('artifacts/gas-profile.json'),v=load('reports/vrf-security-probes.json'),e=load('reports/erc721-model-probes.json'),d=load('reports/inheritance-probes.json'),base64=load('reports/base64-probes.json'),m=load('reports/onchain-metadata-probes.json'),a=load('artifacts/original-runtime-tests.json'),front=load('reports/frontend-review.json'),genetics=load('artifacts/genetics-tests.json'),art=load('artifacts/art-validation.json'),deployUI=load('reports/deployment-ui-review.json');
const usesBridge=JSON.stringify(t.sourceSha256)!==JSON.stringify(b.sourceSha256);if(!usesBridge)boundary=t;
assert.equal(b.compilerSettingsSha256,sha('solc-settings.json'));
for(const report of [t,g,v,e,d,base64,m,a,genetics,eq,boundary])assert.equal(report.compilerSettingsSha256,b.compilerSettingsSha256,'stale compiler settings');
for(const [p,h]of Object.entries(b.sourceSha256)){assert.equal(sha(p),h);for(const report of [boundary,g,v,e,m,a])assert.equal(report.sourceSha256[p],h,'stale evidence '+p);}
if(usesBridge){
assert(eq.pass);assert.deepEqual(eq.changedSources,['contracts/GooRenderer.sol']);assert.deepEqual(eq.currentSourceSha256,b.sourceSha256);assert.deepEqual(eq.priorSourceSha256,t.sourceSha256);
// Recheck the narrow bridge ourselves. Only a canonical compiler metadata trailer is removed.
for(const name of ['GanjaGhoulballs','GooGraveyard','GooBackdrop']){
 const old=load(`artifacts/covered-dca9/${name}.json`),current=load(`artifacts/${name}.json`);
 const executable=artifact=>{const bytes=Buffer.from(artifact.deployedBytecode.slice(2),'hex');assert.equal(bytes.readUInt16BE(bytes.length-2),51);assert.match(bytes.subarray(-53,-2).toString('hex'),/^a2646970667358221220[0-9a-f]{64}64736f6c634300081e$/);return bytes.subarray(0,-53);};
 const x=executable(old),y=executable(current);assert(x.equals(y));assert.deepEqual(old.abi,current.abi);assert.deepEqual(old.immutableReferences,current.immutableReferences);assert(old.storageLayout&&current.storageLayout);assert.deepEqual(old.storageLayout,current.storageLayout);assert.equal(crypto.createHash('sha256').update(y).digest('hex'),eq.contracts[name].currentExecutableSha256);
}
assert.equal(boundary.fullSupplyExecuted,false);assert.equal(boundary.passed,t.passed-1);assert.deepEqual(boundary.tests,t.tests.slice(0,-1));
}
assert(t.tests.includes('full 420-token supply invariant: 5460 locked originals, no bypass or wallet cap'));assert.equal(t.passed,23);
assert.equal(d.sourceSha256,b.sourceSha256['contracts/GooGenetics.sol']);assert.equal(genetics.geneticsSourceSha256,d.sourceSha256);assert.equal(base64.sourceSha256,b.sourceSha256['contracts/GanjaGhoulballs.sol']);assert.equal(art.rendererSourceSha256,b.sourceSha256['contracts/GooRenderer.sol']);
assert(v.pass&&d.pass&&a.passed&&front.pass&&genetics.passed&&art.passed&&deployUI.pass&&m.status==='passed'&&m.metadataStableAfterLocalSourceAndOracleCodeRemoval&&m.currentFixtureByteEqualityChecked);
for(const report of [front,deployUI])for(const[p,h]of Object.entries(report.sourceSha256))assert.equal(sha(p),h,'reviewed UI changed '+p);
const artifact=load('artifacts/GanjaGhoulballs.json'),oracle=load('deploy-ui/oracle-config.json');
const original='0xf3654d0ce6cf518f4efbbe490f4a26483fb0969c',wrapper='0xb0407dbe851f8318bd31404a49e658143c982f23';
const tx=await new ContractFactory(artifact.abi,artifact.bytecode).getDeployTransaction(original,wrapper,oracle.maxRequestPriceWei);
const fullBytes=(tx.data.length-2)/2;assert(fullBytes<=49152);for(const name of ['GanjaGhoulballs','GooGraveyard','GooRenderer','GooBackdrop'])assert(b.contracts[name].runtimeBytes<=24576);
const bounds=load('artifacts/art-v3/bounds-check.json'),provenance=load('artifacts/art-provenance.json');for(const proof of [art,bounds,provenance]){assert(proof.passed);assert.equal(proof.rendererSourceSha256,b.sourceSha256['contracts/GooRenderer.sol']);assert.equal(proof.compilerSettingsSha256,b.compilerSettingsSha256);}
const sourceSha256={...b.sourceSha256,...front.sourceSha256,...deployUI.sourceSha256,'solc-settings.json':b.compilerSettingsSha256};
const summary={reviewDate:new Date().toISOString(),status:'local_code_review_complete_live_production_gates_open',currentReleaseReviewComplete:true,report:'reports/SECURITY_REVIEW.md',unresolvedExploitFindings:{critical:0,high:0,medium:0},sourceSha256,compiler:b.compiler,compilerSettingsSha256:b.compilerSettingsSha256,compilerSettings:{optimizer:b.optimizer,viaIR:b.viaIR,evmVersion:b.evmVersion},reviewedCreation:{creationBytecodeKeccak256:keccak256(artifact.bytecode),deploymentDataKeccak256:keccak256(tx.data),deploymentDataBytes:fullBytes,originalCollectionArgument:original,wrapperArgument:wrapper,maxRequestPriceWei:oracle.maxRequestPriceWei,sourceCommit:null},verified:{artAcceptance:{genomes:art.genomes,thumbnailRasters:art.thumbnailRasters,framingCases:bounds.cases,provenanceCases:provenance.cases},contractTestGroups:t.passed,currentHashBoundaryTestGroups:boundary.passed,fullSupplyEvidence:{report:'artifacts/contract-tests.json',sourceSha256:t.sourceSha256,bridge:usesBridge?'artifacts/core-runtime-equivalence.json':null,basis:usesBridge?'Exact collection executable runtime, immutable references, ABI and storage layout equality; separately retested renderer changes':'Full-supply run directly matches the final source hashes'},fullSupplyMints:420,lockedOriginalsAtFullSupply:5460,independentVRFAssertions:v.assertions,callbackGasWithCallOverhead:v.callbackGasWithCallOverhead,independentERC721Assertions:e.assertions,independentGeneticsAssertions:d.assertions,coreGeneticsAssertions:genetics.assertions,base64OracleCalls:base64.passedCalls,independentFrontendScenarios:front.independentBrowserScenarios,deploymentUITests:'passed',actualOriginalRuntimeLocalIntegration:'passed; fresh local state, not a live Base fork',fullyOnchainMetadata:{pending:m.pendingMetadataSamples,revealed:m.mintedMetadataSamples,still:m.stillSVGSamples,additionalCurrentFixtures:m.additionalRendererFixtureSVGs,negativeDependencyTests:m.negativeTests,externalDependenciesFound:0,decodedVisualBirthmarks:m.decodedBirthmarks,full416BitEdgeCases:m.birthVisualEdgeCases,stableAfterSourceAndOracleCodeRemoval:true}},designRisks:['A valid oracle callback may never arrive; all 13 originals remain locked and the NFT may stay pending permanently.','Wrapper governance/configuration/coordinator are external trust dependencies. Three confirmations are not a guarantee against chain reorganization.','Oracle donations and leftovers are nonwithdrawable. An immutable request cap can prevent future mints if prices rise.','Raw ERC721 transfers to the vault or collection can irreversibly strand NFTs without mint credit.',`Only ${49152-fullBytes} bytes of initcode and ${24576-b.contracts.GooRenderer.runtimeBytes} bytes of renderer runtime headroom at this exact checkpoint; any change requires rebuilding and retesting.`],openProductionGates:['Record the canonical source commit matching these exact reviewed files and deployment data; do not reuse any prior approval.','Confirm the immutable request cap separately from any voluntary reserve donation amount.','Live Base wallet RPC must match original, parent renderer and wrapper code pins and check wrapper configured/enabled/coordinator/current quote.','Simulate the exact final constructor on live Base, check nonce and all fees/balance, then obtain the user’s own wallet confirmation.','Verify deployment receipt, all four deployed runtimes and immutable wiring, and publish matching explorer source.','Any reserve donation requires its own exact amount, recipient and personal wallet approval; leftovers cannot be withdrawn.','Activate public writes only for verified deployed addresses/runtime hashes with a sufficient current reserve.'],limitations:['Independent automated source review and local adversarial tests, not a professional audit or formal proof.','No live Base fork, public testnet oracle round-trip, real NFT transfer, wallet approval, signature, funding or deployment was performed.','Actual original/runtime integration used captured verified bytecode with fresh local storage and a mock oracle.','Gas measurements are local execution, excluding intrinsic/calldata, Base L1 data/operator fees and wallet final totals.','Mock browser tests do not establish physical-wallet behavior, RPC honesty, hosting integrity or finalized-chain behavior.','OnChainChecker 5/5 evidence applies only to the original token 1, not an undeployed GGOO.'],deploymentAuthorization:false};
const table=Object.entries(b.sourceSha256).map(([p,h])=>`| ${p} | ${h} |`).join('\n');const sizes=['GanjaGhoulballs','GooGraveyard','GooRenderer','GooBackdrop'].map(n=>`| ${n} | ${b.contracts[n].runtimeBytes.toLocaleString()} | ${b.contracts[n].initcodeBytes.toLocaleString()} |`).join('\n');
const doc=`# Ganja Ghoulballs: inherited DNA and VRF security review

Reviewed ${summary.reviewDate}. **Local code review complete for the exact hashes below. Live deployment and funding gates remain open.** This replaces the pre-inheritance review; old deterministic-ID-only conclusions do not approve this release.

This is an independent automated code review with local adversarial testing, not a professional audit, formal verification or guarantee. No real NFTs, wallet approvals, signatures, broadcasts, oracle payments or deployment were used.

## Result

No Critical, High or Medium exploitable code defect was confirmed in the reviewed final implementation. Important permanent-custody and external-oracle risks remain and must be accepted explicitly. The release flag can record only this exact local code-review checkpoint after its matching source commit and constructor cap are recorded. It is not transaction authorization or evidence of a live Base simulation.

The contract permits 420 NFTs, exactly 13 distinct originals per mint, no per-wallet restriction and zero ETH value from the minter. A separately donated reserve pays the bounded oracle request. Originals remain owned by the immutable vault forever; they are not burned and original totalSupply does not decrease. Full mint-out locks 5,460 originals.

## Findings and boundaries

### R-01: Oracle liveness and governance can leave a permanent pending NFT

**Material external-dependency risk; explicitly disclosed, not eliminated.** GanjaGhoulballs.mint commits all 13 parent IDs/genes, records the original caller and block, locks all originals, pays one request and creates a pending token. Only the immutable wrapper can supply its one entropy word. There is no cancellation, retry, alternative seed, admin replacement, rescue or withdrawal.

If a valid callback never arrives, the NFT may stay pending permanently with its originals still locked. The pinned wrapper has externally administered configuration/coordinator and service dependencies; a code hash does not freeze that external governance. Three request confirmations do not prove immunity to Base reorganization. The authenticated callback stores only the word and revealed flag and emits events. A cold first nonzero write succeeded under a 100,000-gas call stipend, using ${v.callbackGasWithCallOverhead} gas including the independent call overhead. Unknown, malformed and duplicate callbacks are ignored; a legitimate zero word is accepted once. Out-of-order requests map by request ID.

The UI explains the pending state before irrevocable consent, polls read-only and never requests another outcome. Chainlink recommends fixing inputs before requesting, matching callbacks by request ID, forbidding rerolls and keeping callbacks nonreverting; these controls are tested here. [Chainlink security guidance](https://docs.chain.link/vrf/v2-5/security).

### R-02: Nonwithdrawable reserve and immutable fee ceiling

**Operational/economic design risk.** Anyone can donate ETH, but donations and leftovers cannot be recovered. A request above the immutable cap or available reserve reverts before permanent effects. A failing wrapper request or NFT receiver rolls back all 13 transfers, storage and payment. A high-gas-price minter cannot spend more than the cap per accepted mint, but prices above the cap can halt new minting indefinitely until prices fall. Review the selected cap (${oracle.maxRequestPriceWei} wei in this candidate) separately from any funding amount. Current quotes are estimates, not future-price or reveal guarantees.

The mint UI now obtains an explicit positive gas price, quotes estimateRequestPriceNative at that price and carries the same gasPrice through simulation, wallet estimation and send. This fixes a preflight defect where a default-zero eth_call price could incorrectly pass the budget check. Wallet fee edits or later state changes can still cause a safe revert and gas loss; the onchain cap/reserve checks are authoritative.

### R-03: Accidental raw NFT deposits are irrecoverable

**Low / inherent custody warning.** GooGraveyard.onERC721Received accepts only the pinned original collection with the redeemer as operator. ERC721.transferFrom bypasses that receiver hook: direct raw deposits can still strand originals without creating a GGOO. The same caution applies to raw deposits into the collection. No rescue function exists by design. Use only the reviewed atomic mint flow.

### R-04: Narrow bytecode headroom

**Build/release gate.** Final full initcode is ${fullBytes.toLocaleString()} bytes including all 96 constructor-argument bytes, leaving ${49152-fullBytes} below EIP-3860. Renderer runtime is ${b.contracts.GooRenderer.runtimeBytes.toLocaleString()}, leaving ${24576-b.contracts.GooRenderer.runtimeBytes} below EIP-170. Earlier feature builds exceeded the hard initcode limit. Bounded serialization/arithmetic cleanup and optimizer 50 recovered a valid single-creation build. Compiler and deployment-helper checks now reject oversized artifacts and full creation data. Any source or compiler change invalidates this checkpoint.

## Verified invariants

- Input order is canonicalized. Exactly 13 unique IDs in 1–6667 are required; zero, large IDs, duplicates, nonexistent tokens and different owners fail. Operator authority over someone else’s NFTs does not grant redemption rights.
- All ownership and approval checks precede transfers. Ownership of all 13 originals is rechecked after the last transfer to confirm custody in the vault. A no-op transfer, late theft of an earlier deposit, transfer failure, malformed recipe, failed request or rejected receiver rolls back the whole operation.
- Source, wrapper and recipient callbacks cannot reenter mint. A legitimate receiver may transfer its new GGOO during its receiver hook. ERC721 model tests cover owner, token-approved, operator and both safe-transfer paths, self-transfers, balances and approval clearing.
- The 420 cap is enforced before source transfers. Repeated same-wallet mints are allowed. No privileged mint, administrative owner role, upgrade, arbitrary-call, provider-switch, withdrawal or metadata setter exists.
- Base construction pins the exact original address/runtime, original renderer runtime and wrapper address/runtime. Local/testnet exceptions are chain-specific and cannot select arbitrary sources on Base 8453.
- Parent recipes are read only during mint. Bounded fields are packed into 13 permanent chromosomes; the digest commits to chain, original address, sorted IDs, genes and original seeds. Final art does not depend on later original calls.
- Count, motion and theme select two distinct parent donors with explicit 75/25 dominant/recessive expression for heterozygotes. Color/radius/phase family means weight all 13 parents equally. Bounded one-shot mutations and donor indexes are independently reproduced. These are artistic genetics rules; integer quantization and random sampling do not guarantee every small parent edit is visibly distinguishable.
- Final entropy is supplied after the irreversible commitment, not derived from a manipulable mint-block seed. Changing caller, input order, output position or deployment address cannot reroll a fixed parent commitment and entropy. Pending transfers do not change future genetics.
- mintBlockOf and mintedBy are written once from block.number and msg.sender before the request. Tests mint at block 123, reveal at 456, read at 999 and transfer ownership without changing either value. A smart-contract minter remains the original minter; tx.origin is not substituted. No actual transaction-hash claim is made.

## Fully onchain metadata and hidden provenance

Pending and final tokenURI values are base64 JSON data URIs containing complete SVG data URIs. Native SMIL, vector paths and colors are supplied by immutable GGOO, renderer and backdrop code. There are no image, CSS, font, script, HTTP/IPFS/Arweave or other external media dependencies. The SVG namespace URL is only an identifier.

The dependency crawler examined ${m.pendingMetadataSamples} pending metadata documents, ${m.mintedMetadataSamples} revealed documents, ${m.stillSVGSamples} still outputs and ${m.additionalRendererFixtureSVGs} current-manifest fixtures, each byte-matched against the final renderer. Retained historical files are explicitly excluded. Fourteen negative tests reject external assets, fonts, scripts, foreign content and invalid fragment references. After reveal, transfer and complete local removal of both original and oracle code leave tokenURI byte-identical. This is a local proof-by-test plus source review, not a live-service outage experiment.

Eighteen faint 2×2 RGB glints encode the full 256-bit mint block and 160-bit original minter address. Fixed position i is x=24+25i, y=455+4(i mod 4). First 11 RGB24 words reconstruct the block, last 7 the address, little-endian; unused high bits are zero. The independent decoder checked ${m.decodedBirthmarks} outputs, including ${m.birthVisualEdgeCases} zero/max/random provenance vectors across pending, still and animated rendering. Transfers change the owner, never this birth record. This encoding is provenance, not encryption or a transaction hash.

The linked [original Ghoulballs OnChainChecker result](https://onchainchecker.xyz/collection/base/0xf3654D0ce6CF518F4eFbbe490F4a26483FB0969C/1) displayed 5/5 Fully On-Chain for the original token 1. It does not score an undeployed GGOO. A future checker run should use an ordinarily authorized minted token; never sacrifice real originals merely to test a checker. Marketplace caching or disabled SVG animation does not alter stored contract art.

## Arithmetic and encoding review

GooGenetics unchecked sections retain validation before arithmetic: count 1/2/4/6 and matching lengths; radii 5–10 before 63−2r; bounded phases and RGB24; 13 parent iterations. Family channel sums are at most 3,315 and fixed-point radius sums at most 13,000. Canonical IDs are bounded before sorting. Production combine is reachable only with the stored validated chromosomes. Decimal conversion uses at most 78 digits. Renderer hex and provenance loops have fixed 6/18 bounds. Malformed maximum-uint inputs still reject in the independent tests.

The Base64 memory-safe annotation was reviewed against actual accessed ranges. Full-group loads end at the third consumed byte; partial loads end exactly at the final logical input byte, including short inputs whose load begins in their own length header. Table loads stay within its allocated header+64 bytes; output stores remain within the exact allocated output length. Free-memory and zero-slot values are not modified. ${base64.passedCalls} normal/dirty-tail/binary cases match Node Buffer through 32,769 input bytes. [Solidity memory-safety rules](https://docs.soliditylang.org/en/latest/assembly.html#memory-safety).

## Executable evidence

${usesBridge?`- Core suite: ${t.passed} groups, full 420 mint-out and 5,460 locked originals on the recorded pre-copy/pre-layout renderer hash. Final renderer changes remove the Art Version marketplace trait and correct maximum-radius Float framing without changing mint, genetics or callback logic. Exact collection, vault and backdrop executable runtime equality is independently rechecked after removing only the validated 51-byte Solidity CBOR trailer plus its two-byte length. ABI, immutable offsets and storage layouts also match. Fresh final-hash boundary tests pass ${boundary.passed} groups; constructor, actual source, callback, metadata and gas paths are rerun. The prior full-cap evidence retains its original hash in artifacts/contract-tests.json, with the explicit bridge in artifacts/core-runtime-equivalence.json.`:`- Core suite: ${t.passed} groups, full 420 mint-out and 5,460 locked originals directly on the final source hashes.`}
- Final renderer acceptance: ${art.genomes} genomes, ${art.thumbnailRasters} thumbnail rasters, ${bounds.cases} worst-case motion/framing poses and ${provenance.cases} complete provenance vectors. All bind the final renderer and compiler hashes.
- Independent VRF/custody: ${v.assertions} assertions; independent ERC721 model: ${e.assertions} assertions and 120 transfer rounds.
- Independent genetics: ${d.assertions} assertions; primary genetics suite: ${genetics.assertions}; exact parent-renderer bytecode reproduction: 386 assertions across 96 recipes.
- Exact original-runtime integration: captured 8,229-byte original and 15,787-byte renderer, 26 fresh local synthetic mints/consolidation, 13 real-code safe transfers and failed-request rollback. It is not a Base fork and uses a mock oracle.
- Frontend: ${front.independentBrowserScenarios} independently rerun mocked Chromium scenarios plus a real local EVM chromosome fixture. Separate broad approval/exact 13 consent, wallet races, durable uncertain-send locks, explicit fees, provider/status/cap/reserve changes, receipt provenance and read-only reveal are covered. A delayed pending SVG cannot overwrite revealed art.
- Deployment helper: independently rerun; exact artifact/ABI/immutable-reference hashes, original/renderer/wrapper pins, four-contract receipt wiring, nonce/account/chain freshness, exact durable intent read-back and uncertain-send locks. Read-only simulation is allowed while unapproved; sending remains separately gated. Funding handoff only simulates/downloads an unsigned user-entered donation and has no funding send handler.

Local gas: exact-original mint ${a.mintExecutionGas.toLocaleString()} execution gas; largest sampled full tokenURI ${g.maxTokenURIExecutionGas.toLocaleString()} across ${g.samples} targeted structures. These exclude transaction intrinsic/calldata, Base L1 data/operator fees and wallet totals; real wrapper costs and RPC limits still require live preflight.

## Frozen build

Compiler ${b.compiler}; optimizer ${b.optimizer.runs}; viaIR; Cancun. Settings SHA256: ${b.compilerSettingsSha256}.

| Contract | Runtime bytes | Creation bytes before args |
|---|---:|---:|
${sizes}

Creation Keccak256: ${summary.reviewedCreation.creationBytecodeKeccak256}

Full deployment-data Keccak256: ${summary.reviewedCreation.deploymentDataKeccak256}

Constructor arguments: original ${original}; wrapper ${wrapper}; max request price ${oracle.maxRequestPriceWei} wei. Full data includes these arguments; a cap change requires a new exact-hash approval.

| File | SHA256 |
|---|---|
${table}

Frontend and deployment-helper exact hashes are recorded in security-review-summary.json, frontend-review.json and deployment-ui-review.json. All executable evidence binds source and compiler settings. The prior full-cap report is accepted only through the explicit executable-equivalence bridge above; other stale reports fail the report generator.

## Remaining production gates and limitations

${summary.openProductionGates.map((s,i)=>`${i+1}. ${s}`).join('\n')}

No live Base fork or real Chainlink round-trip has been run. A public RPC route returned 403 and the connected blockchain data source returned 402; no access control was bypassed. Normal read-only explorer pages supplied verified runtime/source evidence and time-stamped quotes. Actual wallet-RPC code equality, constructor simulation, deployment receipt/source verification and separate funding approval remain necessary. This review cannot prove future oracle delivery, finalized-chain behavior, honest RPCs, physical-wallet behavior, marketplace rendering or hosting integrity.

Reproduce from the repository with npm ci --ignore-scripts --include=dev, then npm run test:all. Standalone independent probes live in reports/vrf-security-probes.mjs, erc721-model-probes.mjs, inheritance-probes.mjs, base64-probes.mjs and onchain-metadata-probes.mjs. No test requires a real NFT or wallet signature.
`;
if(!fs.existsSync(file('reports/SECURITY_REVIEW_PRE_INHERITANCE.md')))fs.copyFileSync(file('reports/SECURITY_REVIEW.md'),file('reports/SECURITY_REVIEW_PRE_INHERITANCE.md'));
fs.writeFileSync(file('reports/SECURITY_REVIEW.md'),doc);fs.writeFileSync(file('reports/security-review-summary.json'),JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify({status:summary.status,sourceSha256:b.sourceSha256,creation:summary.reviewedCreation}));
