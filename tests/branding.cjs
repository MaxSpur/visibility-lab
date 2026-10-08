/* Portable asset/header regression; no runtime dependencies. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'visibility-lab-v4.html'),'utf8');
const header=html.match(/<header class="lab-header">([\s\S]*?)<\/header>/)?.[1];
assert.ok(header);
assert.equal(header.match(/<h1>(.*?)<\/h1>/)?.[1],'Geometric Visibility Lab','Version badge should not consume header space');
assert.deepEqual([...header.matchAll(/<img[^>]+alt="([^"]+)"/g)].map(x=>x[1]),['Geovis Team','UMR LaSTIG','Institut national de l’information géographique et forestière','Géodata Paris','Université Gustave Eiffel']);
for(const name of ['Geovis Team','UMR LaSTIG','Institut national de l’information géographique et forestière'])assert.ok(header.includes(`title="${name}"`),'Logo tooltips must use full affiliation names');
const lastig=fs.readFileSync(path.join(root,'assets/brand/lastig.svg'),'utf8');
assert.ok(!/<rect[\s\S]*?fill:#ffffff[\s\S]*?\/>/.test(lastig),'LaSTIG background must be transparent');
assert.ok(!html.includes('One method and one resolution slider'),'Do not reintroduce the redundant sampling heading');
assert.equal((header.match(/src="data:image\/(?:png|svg\+xml);base64,/g)||[]).length,5,'All logos must remain offline portable');
assert.ok(header.includes('href="https://www.umr-lastig.fr/maxim-spur/">MAXIM SPUR</a>'));
for(const name of ['geovis.png','lastig.svg','ign.svg','geodata.svg','eiffel.svg'])assert.ok(fs.statSync(path.join(root,'assets/brand',name)).size>1000);
assert.ok(!/Arial/i.test(html.replace(/data:image\/(?:png|svg\+xml);base64,[A-Za-z0-9+/=]+/g,'')),'No Arial in the portable lab');
assert.ok(html.includes('Futura'));
console.log('Five ordered, portable affiliation logos; author link; Futura/Helvetica typography.');
