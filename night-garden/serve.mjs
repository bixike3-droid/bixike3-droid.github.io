import http from 'node:http';
import {createReadStream} from 'node:fs';
import {stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const port=Number(process.env.GARDEN_PREVIEW_PORT||5186);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.glb':'model/gltf-binary','.png':'image/png'};
http.createServer(async(req,res)=>{
  try{
    const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const target=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
    if(target!==root&&!target.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
    const info=await stat(target);if(!info.isFile()){res.writeHead(404);res.end();return;}
    res.writeHead(200,{'Content-Type':types[path.extname(target)]||'application/octet-stream','Content-Length':info.size,'Cache-Control':'no-cache'});
    if(req.method==='HEAD'){res.end();return;}createReadStream(target).pipe(res);
  }catch{res.writeHead(404);res.end('Not found');}
}).listen(port,'127.0.0.1',()=>console.log(`Local: http://127.0.0.1:${port}/`));
