import { buildDeployUI } from '../deploy-ui/build.mjs';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const root=path.resolve(import.meta.dirname,'..');
fs.rmSync(path.join(root,'dist'),{recursive:true,force:true});
fs.cpSync(path.join(root,'site'),path.join(root,'dist'),{recursive:true});
const require=createRequire(import.meta.url);
const ethersRoot=path.resolve(path.dirname(require.resolve('ethers')),'..');
fs.mkdirSync(path.join(root,'dist','vendor'),{recursive:true});
fs.copyFileSync(path.join(ethersRoot,'dist','ethers.min.js'),path.join(root,'dist','vendor','ethers.min.js'));
fs.copyFileSync(path.join(ethersRoot,'LICENSE.md'),path.join(root,'dist','vendor','ETHERS-LICENSE.md'));
fs.mkdirSync(path.join(root,'dist','contracts'),{recursive:true});
for (const f of ['GanjaGhoulballs.json','GooRenderer.json','GooGraveyard.json','standard-input.json','build-manifest.json']) {
 fs.copyFileSync(path.join(root,'artifacts',f),path.join(root,'dist','contracts',f));
}
fs.copyFileSync(path.join(root,'solc-settings.json'),path.join(root,'dist','contracts','solc-settings.json'));
console.log('Built site + immutable contract artifacts');

await buildDeployUI();
