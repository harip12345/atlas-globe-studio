import fs from 'node:fs';
import { build } from 'esbuild';
await build({entryPoints:['scripts/geolib.js'],bundle:true,format:'esm',minify:true,outfile:'public/lib/geo.js',legalComments:'linked'});
fs.writeFileSync('public/lib/LICENSES.txt',['d3-geo','d3-array','internmap'].map(name=>`${name}\n${fs.readFileSync(`node_modules/${name}/LICENSE`,'utf8')}`).join('\n\n'));
console.log('Bundled local geographic renderer and license notices.');
