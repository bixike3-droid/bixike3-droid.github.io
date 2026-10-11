import assert from 'node:assert/strict';
import path from 'node:path';
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { createGardenServer } from './server.mjs';
const project = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const output = path.join(project, 'outputs'); mkdirSync(output, { recursive: true });
const dataDir = mkdtempSync(path.join(output, 'aliyun-test-')); const origin = 'http://127.0.0.1:3211';
let app;
const start = async () => { app = createGardenServer({ origin, dataDir, staticDir: path.join(project, 'aliyun/dist') }); app.server.listen(3211,'127.0.0.1'); await once(app.server,'listening'); };
const stop = () => new Promise((resolve,reject) => app.server.close(error=>error?reject(error):resolve()));
const nativeFetch = fetch;
const request = async (url,options={}) => {
 try { return await nativeFetch(url,{...options,headers:{Connection:'close',...options.headers}}); }
 catch(error){throw new Error('Request failed: '+url,{cause:error});}
};
const json = (route,body,cookie='',extra={}) => request(origin+route,{method:route==='/api/guestbook/manage'?'PATCH':'POST',headers:{Origin:origin,'Content-Type':'application/json',Cookie:cookie,...extra},body:JSON.stringify(body)});
const get = async (route,cookie='') => { const response=await request(origin+route,{headers:{Cookie:cookie}}); assert.equal(response.status,200);return response.json(); };
const cookie = response => response.headers.get('set-cookie').split(';')[0];
try {
 await start();
 assert.equal((await request(origin+'/admin/guestbook',{redirect:'manual'})).headers.get('location'),'/setup');
 assert.equal((await request(origin+'/api/guestbook/manage')).status,401);
 const code=readFileSync(app.codeFile,'utf8'); const credentials={username:'test-owner',password:'Local-test-password-2026'};
 let response=await json('/api/auth/setup',{...credentials,code:'wrong'}); assert.equal(response.status,403);
 response=await json('/api/auth/setup',{...credentials,code},'', {Origin:'https://invalid.example'}); assert.equal(response.status,403);
 response=await json('/api/auth/setup',{...credentials,code}); assert.equal(response.status,200); let owner=cookie(response);
 assert.match(response.headers.get('set-cookie'),/HttpOnly.*SameSite=Strict/);
 assert.equal((await json('/api/auth/setup',{...credentials,code})).status,409);
 assert.equal((await get('/api/auth/state',owner)).authenticated,true);
 assert.equal((await json('/api/guestbook',{name:' ',message:'test'})).status,400);
 response=await json('/api/guestbook',{name:'测试访客',message:'<script>verification</script>'});assert.equal(response.status,201);
 const submission=await response.json();assert.equal(submission.pending,true);const id=submission.message.id;
 assert.equal((await get('/api/guestbook')).messages.length,0);
 assert.equal((await json('/api/guestbook',{name:'测试访客',message:'duplicate'})).status,429);
 const update=(status,expectedStatus)=>json('/api/guestbook/manage',{action:'message',id,status,expectedStatus},owner);
 assert.equal((await update('approved','pending')).status,200);assert.equal((await get('/api/guestbook')).messages[0].message,'<script>verification</script>');
 assert.equal((await update('hidden','pending')).status,409);
 assert.equal((await update('hidden','approved')).status,200);assert.equal((await get('/api/guestbook')).messages.length,0);
 assert.equal((await update('deleted','hidden')).status,200);assert.equal((await get('/api/guestbook/manage?status=deleted',owner)).messages[0].id,id);
 assert.equal((await update('pending','deleted')).status,200);
 assert.equal((await json('/api/guestbook/manage',{action:'settings',requireApproval:false,revision:0},owner)).status,200);
 assert.equal((await json('/api/guestbook/manage',{action:'settings',requireApproval:true,revision:0},owner)).status,409);
 const stamp=new Date(Date.now()+1000).toISOString();
 for(let i=0;i<31;i++) app.db.prepare('INSERT INTO guest_messages VALUES(?,?,?,?,?,?)').run(crypto.randomUUID(),'pagination','verification',stamp,'test','pending');
 const first=await get('/api/guestbook/manage',owner);assert.equal(first.messages.length,30);assert(first.nextCursor);
 const next=await get('/api/guestbook/manage?cursor='+encodeURIComponent(first.nextCursor),owner);assert.equal(new Set([...first.messages,...next.messages].map(m=>m.id)).size,32);
 assert.equal((await request(origin+'/%2e%2e/server.mjs')).status,404);
 assert.equal((await request(origin+'/data/setup-code')).status,404);
 assert.equal((await request(origin+'/')).status,200);
 assert.equal((await json('/api/guestbook/manage',null,owner)).status,400);
 assert.equal((await json('/api/guestbook/manage',{action:'settings',requireApproval:true,revision:1},owner,{Origin:'https://invalid.example'})).status,403);
 assert.equal((await json('/api/auth/logout',{},owner)).status,200); assert.equal((await request(origin+'/api/guestbook/manage',{headers:{Cookie:owner}})).status,401);
 await stop(); await start();
 assert.equal((await get('/api/auth/state')).configured,true);assert.equal((await get('/api/guestbook')).requireApproval,false);
 response=await json('/api/auth/login',credentials);assert.equal(response.status,200);owner=cookie(response);
 assert.equal((await get('/api/guestbook/manage?status=all',owner)).counts.pending,32);
 assert.equal((await json('/api/auth/login',{...credentials,password:'Wrong-local-password'})).status,401);
 console.log('Standalone backend passed: setup, login, sessions, moderation, privacy, rate limits, conflicts, pagination, static boundaries and restart persistence.');
} finally {
 if(app?.server.listening)await stop();
 if(!path.resolve(dataDir).startsWith(path.resolve(output)+path.sep+'aliyun-test-'))throw Error('Unexpected test directory');
 rmSync(dataDir,{recursive:true,force:true});
}
