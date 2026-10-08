import { build } from 'vite';
import { mkdir,cp } from 'node:fs/promises';
await build({configFile:'aliyun/vite.config.mjs'});
await mkdir('aliyun/dist/assets',{recursive:true});
for(const name of ['night-sakura.webp','scene-garden.webp','scene-works.webp','scene-about.webp','scene-interests.webp','scene-guestbook.webp'])await cp('public/assets/'+name,'aliyun/dist/assets/'+name);
await cp('public/favicon.svg','aliyun/dist/favicon.svg');
console.log('Standalone site build complete.');
