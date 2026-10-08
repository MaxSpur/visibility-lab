const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const root=__dirname+'/../source/';
vm.runInThisContext(['geometry','operation-counts','sample-comparison'].map(n=>fs.readFileSync(root+n+'.js','utf8')).join('\n')+String.raw`
const check=(x,m)=>{if(!x)throw Error(m);};
const blank={outer:[[0,0],[100,0],[100,65],[0,65]],holes:[]},grid=occupancyRaster2([23,31],blank,8);
check(grid.ny===5&&grid.polys.length===40,'Empty grid must be completely visible');
check(grid.stats.queries===40&&grid.stats.cellVisits>=40,'Count all actual queries and traversed cells');
check(grid.stats.centerTests===40&&grid.stats.edgeTests===160,'Preparation must count center and polygon edge checks');
check(grid.area===6500&&grid.work.geometricTests===0,'Binary grid work is not a ray-triangle test');
const wall={...blank,holes:[[[40,0],[60,0],[60,65],[40,65]]]},blocked=occupancyRaster2([15,32.5],wall,10);
check(blocked.polys.length>0,'Near side visible');for(let y=0;y<blocked.ny;y++)for(let x=6;x<10;x++)check(blocked.visible[y*10+x]===0,'Opaque grid wall must block far side');
for(const scene of SCENES)for(const N of [8,24,128]){const r=occupancyRaster2(scene.observer,scene,N);check(r.occupied.length===N*Math.round(.65*N),'Cell count');check(r.polys.length===r.visible.reduce((a,x)=>a+x,0),'Paint exactly visible mask');check(r.area>=0&&r.area<=6500,'Grid area bounded');check(r.stats.cellVisits>=r.stats.queries,'Visited origin for every query');}
for(const phase of [0,.5,1]){const a=sampleComparisonSettings3({variant:'raycast',phase}),b=sampleComparisonSettings3({variant:'raster',phase});check(a.cubeN===b.cubeN&&a.cubeN===Math.round(2+30*phase),'Matched angular grid');check(a.showRays&&a.rayDrawLimit>=6*a.cubeN*a.cubeN,'Draw every direction');}
const base=inputTerrain(3,2),q=[10,30,terrainZ(10,30)+8],prepared=prepare3(base.tris);
for(const N of [2,8,32]){const ray=attachSolverWork(()=>rayCube(q,prepared,N,true)),raster=attachSolverWork(()=>rasterCube(q,base.tris,N));check(ray.ids.length===6*N*N&&raster.ids.length===ray.ids.length,'All six angular faces');check(ray.ids.every((v,i)=>v===raster.ids[i]),'Matched pixel centers select same nearest terrain');check(ray.work.rayPrimitiveTests>0&&raster.work.rayPrimitiveTests===0,'Raster must not ray-test triangles');const a=recoverCells(ray,base.tris),b=recoverCells(raster,base.tris);check(Math.abs(a.area-b.area)<1e-8,'Matched physical reconstruction');check(ray.ids.some(i=>i<0),'Missed cells remain in sample domain');}
console.log('PASS: real binary occupancy traversal; preparation and visited-cell counts; opaque-wall blocking; matched angular grids and physical reconstruction.');
`);
