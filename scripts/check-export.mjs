import { readdir, readFile, stat } from 'node:fs/promises';
import { createServer, get, Agent } from 'node:http';
import { resolve, extname, join, sep } from 'node:path';
import assert from 'node:assert/strict';
const root=resolve('dist');
async function walk(dir){const entries=await readdir(dir,{withFileTypes:true});const result=[];for(const e of entries){const path=join(dir,e.name);if(e.isDirectory())result.push(...await walk(path));else result.push(path);}return result;}
const files=await walk(root);const html=await readFile(join(root,'index.html'),'utf8');
for(const marker of ['<title>','name="description"','property="og:title"','property="og:image"','rel="icon"'])assert.ok(html.includes(marker),`Missing ${marker}`);
const refs=[...html.matchAll(/(?:src|href|content)="([^"\s]+\.(?:js|css|svg|png|woff2))"/g)].map(m=>({ref:m[1],base:root}));
for(const path of files.filter(p=>p.endsWith('.css'))){const css=await readFile(path,'utf8');for(const m of css.matchAll(/url\(["']?([^)'"\s]+)["']?\)/g)){if(!m[1].startsWith('data:'))refs.push({ref:m[1],base:resolve(path,'..')});}}
for(const {ref,base} of refs){assert.ok(!ref.startsWith('/')&&!/^https?:/.test(ref),`Asset URL must be relative: ${ref}`);assert.ok((await stat(resolve(base,ref))).isFile(),`Missing ${ref}`);}
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2','.txt':'text/plain'};
const server=createServer(async(req,res)=>{try{const prefix='/nested/static/';if(!req.url.startsWith(prefix))return res.writeHead(404).end();const path=resolve(root,req.url.slice(prefix.length)||'index.html');if(!path.startsWith(root+sep))return res.writeHead(403).end();res.setHeader('Content-Type',types[extname(path)]??'application/octet-stream');res.end(await readFile(path));}catch{res.writeHead(404).end();}});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
try{const base=`http://127.0.0.1:${server.address().port}/nested/static/`;for(const path of files){const status=await new Promise((done,fail)=>{get(base+path.slice(root.length+1),{agent:new Agent({keepAlive:false})},res=>{res.resume();res.on('end',()=>done(res.statusCode));}).on('error',fail);});assert.equal(status,200,path);}console.log(`PASS: ${files.length} export files served under a nested subpath; ${refs.length} relative asset references verified; metadata complete.`);}finally{server.close();}
let bytes=0;for(const p of files)bytes+=(await stat(p)).size;console.log(`Production export: ${bytes} bytes.`);assert.ok(bytes<4_500_000,'Export exceeds allocated path budget.');
