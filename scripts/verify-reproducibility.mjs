import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const root=path.resolve(import.meta.dirname,'..'),fresh=path.resolve(process.argv[2]||'');
assert(process.argv[2]&&fresh!==root,'Pass the separately npm-ci-installed, built directory');
assert(!fs.lstatSync(path.join(fresh,'node_modules')).isSymbolicLink(),'Fresh dependencies must not be a symlink');
const read=(dir,p)=>fs.readFileSync(path.join(dir,p)),json=(dir,p)=>JSON.parse(read(dir,p)),sha=x=>crypto.createHash('sha256').update(x).digest('hex');
for(const file of ['package.json','package-lock.json','solc-settings.json'])assert(read(root,file).equals(read(fresh,file)),`Current ${file} must match clean build`);
const a=json(root,'artifacts/build-manifest.json'),b=json(fresh,'artifacts/build-manifest.json');assert.deepEqual(a,b);
for(const [file,hash] of Object.entries(a.sourceSha256)){assert.equal(sha(read(root,file)),hash);assert.equal(sha(read(fresh,file)),hash);}
const contracts=['GanjaGhoulballs','GooGraveyard','GooRenderer','GooBackdrop'];
for(const name of contracts){const x=json(root,`artifacts/${name}.json`),y=json(fresh,`artifacts/${name}.json`);for(const field of ['bytecode','deployedBytecode','abi','immutableReferences','storageLayout','metadata'])assert.deepEqual(x[field],y[field],`${name}.${field}`);}
const fixtures=json(root,'artifacts/art-v3/manifest.json');assert.deepEqual(fixtures,json(fresh,'artifacts/art-v3/manifest.json'));const svgs=[...fixtures.selected.map(x=>'goo-'+x.id),...fixtures.lineage.map(x=>'lineage-'+x.id)].flatMap(prefix=>[prefix+'.svg',prefix+'-still.svg']).sort();assert(svgs.length>=32);for(const file of svgs)assert(read(root,`artifacts/art-v3/${file}`).equals(read(fresh,`artifacts/art-v3/${file}`)),file);
const report={passed:true,timestamp:new Date().toISOString(),node:process.version,cleanInstall:'npm ci --ignore-scripts --include=dev',build:'env -u NODE_PATH npm run build',globalNodePath:'unset',dependencies:'Fresh non-symlink node_modules, pinned package-lock.json, official npm registry',packageLockSha256:sha(read(root,'package-lock.json')),compilerSettingsSha256:a.compilerSettingsSha256,sourceSha256:a.sourceSha256,exactBytecodeMatches:contracts,exactSvgMatches:svgs.length,notes:['Clean isolated build regenerated every contract artifact from source; pre-existing output files are not compiler inputs. A current genetics-test report was copied solely to reproduce eight optional actual-recombination art examples.','No signing, RPC write, NFT transfer, oracle funding or deployment occurred.','Compiler metadata, ABI, immutable references, storage layout and complete creation/runtime bytecode all match.']};
fs.writeFileSync(path.join(root,'artifacts/reproducibility.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
