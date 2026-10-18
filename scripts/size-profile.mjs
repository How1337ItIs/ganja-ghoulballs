import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import solc from 'solc';
const root=path.resolve(import.meta.dirname,'..');
const files=fs.readdirSync(path.join(root,'contracts')).filter(f=>f.endsWith('.sol')).sort();
const sources=Object.fromEntries(files.map(f=>['contracts/'+f,{content:fs.readFileSync(path.join(root,'contracts',f),'utf8')}]));
const sourceSha256=Object.fromEntries(Object.entries(sources).map(([p,s])=>[p,crypto.createHash('sha256').update(s.content).digest('hex')]));
const rows=[];
for(const runs of (process.env.RUNS||'200,100,50,1').split(',').map(Number)){
 const input=JSON.parse(fs.readFileSync(path.join(root,'solc-settings.json')));input.sources=sources;input.settings.optimizer.runs=runs;input.settings.outputSelection={'*':{'*':['evm.bytecode.object','evm.deployedBytecode.object']}};
 const out=JSON.parse(solc.compile(JSON.stringify(input)));for(const e of out.errors||[])if(e.severity==='error')throw Error(e.formattedMessage);
 const result={optimizerRuns:runs,contracts:{}};
 for(const contracts of Object.values(out.contracts))for(const [name,c]of Object.entries(contracts))if(['GanjaGhoulballs','GooRenderer','GooBackdrop','GooGraveyard'].includes(name))result.contracts[name]={runtimeBytes:c.evm.deployedBytecode.object.length/2,initcodeBytes:c.evm.bytecode.object.length/2};
 result.collectionInitWithArgs=result.contracts.GanjaGhoulballs.initcodeBytes+96;result.withinLimits=result.collectionInitWithArgs<=49152&&Object.values(result.contracts).every(c=>c.runtimeBytes<=24576);rows.push(result);console.log(JSON.stringify(result));
}
fs.writeFileSync(path.join(root,'artifacts/compiler-size-tradeoff.json'),JSON.stringify({timestamp:new Date().toISOString(),compiler:solc.version(),sourceSha256,rows,note:'Static compilation size comparison only; no network access or transaction. Final chosen compiler settings require full executable tests.'},null,2));
