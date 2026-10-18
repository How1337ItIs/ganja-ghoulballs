import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const root=path.resolve(import.meta.dirname,'..');
for(const [file,expected] of Object.entries({
 'site/vendor/gifenc-1.0.3.js':'217761244379253ba5815510d3048a4fb1f4c4dbe9fb51a5cfbfe26f34eec093',
 'site/vendor/GIFENC-LICENSE.md':'47bc590c39d8ccccfc544875a9faebf44bafa828ef20315b396b5d0629f0cfd6'
}))assert.equal(createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex'),expected,`${file} must match the unmodified gifenc 1.0.3 npm release`);
console.log('PASS gifenc 1.0.3 vendored ESM and MIT license SHA-256 pins');
