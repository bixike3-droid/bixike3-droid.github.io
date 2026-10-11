import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
const base="http://localhost:5173";
let saved;
const post=(body,headers={})=>fetch(base+"/api/guestbook",{method:"POST",headers:{Origin:base,"Content-Type":"application/json",...headers},body:typeof body==="string"?body:JSON.stringify(body)});
try{
 let r=await post({name:"访客",message:"问候"},{Origin:"https://invalid.example"});assert.equal(r.status,403);
 r=await post("{");assert.equal(r.status,400);
 r=await post({name:" ",message:"问候"});assert.equal(r.status,400);
 r=await post({name:"访客",message:"x".repeat(401)});assert.equal(r.status,400);
 r=await post({name:"访客",message:"问候",website:"spam"});assert.equal(r.status,400);
 r=await post({name:"本地验证",message:"<script>validation-only</script>"});assert.equal(r.status,201);const submission=await r.json();saved=submission.message;
 assert.equal(saved.name,"本地验证");assert.equal(saved.message,"<script>validation-only</script>");assert.equal("visitorKey" in saved,false);
 const cookie=r.headers.get("set-cookie").split(";")[0];
 const list=await fetch(base+"/api/guestbook").then(r=>r.json());assert.equal(list.messages.some(m=>m.id===saved.id),!submission.pending);
 r=await post({name:"本地验证",message:"重复提交"},{Cookie:cookie});assert.equal(r.status,429);
 console.log("Guestbook verified: origin, parsing, limits, honeypot, persistence, rate limit, private fields.");
}finally{
 if(saved){assert.match(saved.id,/^[a-f0-9-]{36}$/);const r=spawnSync(process.execPath,["--import","./scripts/sites-env.mjs","./node_modules/wrangler/bin/wrangler.js","d1","execute","DB","--local","--config","dist/server/wrangler.json","--persist-to",".wrangler/state","--command",`DELETE FROM guest_messages WHERE id = '${saved.id}'`],{encoding:"utf8"});if(r.status!==0)throw new Error("Test cleanup failed: "+r.stderr);console.log("Local verification message removed.");}
}
