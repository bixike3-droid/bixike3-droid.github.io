import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const $ = id => document.getElementById(id);
const renderer = new THREE.WebGLRenderer({ antialias:true, preserveDrawingBuffer:true, powerPreference:'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
renderer.setSize(innerWidth,innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;
renderer.info.autoReset = false;
document.body.prepend(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color('#071221');
scene.fog = new THREE.FogExp2('#101e32',0.003);
const camera = new THREE.PerspectiveCamera(38,innerWidth/innerHeight,0.1,500);
const controls = new OrbitControls(camera,renderer.domElement);
controls.enableDamping = true; controls.dampingFactor = 0.06;
controls.minDistance = 2; controls.maxDistance = 160; controls.autoRotateSpeed = 0.25;
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene,camera));
composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),0.22,0.45,1.25));
composer.addPass(new OutputPass());
const windTime = {value:0}, windStrength = {value:0.65};
let homePosition, homeQuaternion, homeTarget, ready=false;
let t=0, last=performance.now(), fpsTime=last, frames=0;

function windMaterial(material,kind){
  const m=material.clone();
  m.onBeforeCompile = shader => {
    shader.uniforms.uWindTime=windTime; shader.uniforms.uWindStrength=windStrength;
    shader.vertexShader='uniform float uWindTime; uniform float uWindStrength;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      float h = max(position.y - 2.5, 0.0);
      float weight = min(h * 0.065, 1.0);
      float sway = sin(uWindTime * 0.8 + position.z * 0.11) * 0.10 + sin(uWindTime * 1.35 + position.x * 0.15) * 0.045;
      transformed.x += sway * weight * uWindStrength;
      transformed.z += cos(uWindTime * 0.65 + position.x * 0.12) * 0.04 * weight * uWindStrength;
      ${kind==='flowers'?'transformed.y += sin(uWindTime * 2.8 + position.x * 1.8 + position.z * 1.3) * 0.014 * weight * uWindStrength;':''}
    `);
  };
  m.customProgramCacheKey=()=>`garden-wind-${kind}`;
  return m;
}

// Merge compatible pieces by material and animation type, retaining all geometry.
function batchScene(root){
  root.updateMatrixWorld(true);
  const groups=new Map(); let sourceMeshes=0;
  root.traverse(o=>{
    if(!o.isMesh)return;
    sourceMeshes++;
    const materials=Array.isArray(o.material)?o.material:[o.material];
    const parts=Array.isArray(o.material)?o.geometry.groups:[{start:0,count:o.geometry.index?o.geometry.index.count:o.geometry.attributes.position.count,materialIndex:0}];
    for(const part of parts){
      const mat=materials[part.materialIndex]; if(!mat)continue;
      const name=mat.name.toLowerCase();
      const kind=/sakura|flower hearts/.test(name)?'flowers':/old cherry bark/.test(name)?'branches':'static';
      const key=mat.uuid+kind;
      if(!groups.has(key))groups.set(key,{material:mat,kind,geometries:[]});
      const g=o.geometry.clone();
      if(g.index){const array=g.index.array.slice(part.start,part.start+part.count);g.setIndex(new THREE.BufferAttribute(array,1));}
      else g.setDrawRange(part.start,part.count);
      g.clearGroups();
      for(const attr of Object.keys(g.attributes))if(!['position','normal','uv','color'].includes(attr))g.deleteAttribute(attr);
      if(!g.attributes.uv)g.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(g.attributes.position.count*2),2));
      g.applyMatrix4(o.matrixWorld);
      groups.get(key).geometries.push(g);
    }
  });
  let batches=0;
  for(const group of groups.values()){
    const geometry=mergeGeometries(group.geometries,false);
    if(!geometry)throw new Error('模型合批失败：'+group.material.name);
    const material=group.kind==='static'?group.material:windMaterial(group.material,group.kind);
    material.side=THREE.DoubleSide;
    // Lightweight procedural surface colour restores some exported node detail.
    if(/bark|stone|earth|cedar/.test(material.name.toLowerCase()) && group.kind==='static'){
      material.onBeforeCompile=shader=>{
        shader.vertexShader='varying vec3 vGardenPosition;\n'+shader.vertexShader;
        shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvGardenPosition = position;');
        shader.fragmentShader='varying vec3 vGardenPosition;\n'+shader.fragmentShader;
        shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nfloat grain=sin(vGardenPosition.x*17.0+sin(vGardenPosition.z*9.0))*sin(vGardenPosition.y*12.0+vGardenPosition.z*5.0); diffuseColor.rgb *= 0.86+0.14*grain;');
      }; material.customProgramCacheKey=()=> 'garden-grain';
    }
    const mesh=new THREE.Mesh(geometry,material);mesh.name=group.material.name;
    geometry.computeBoundingSphere();mesh.frustumCulled=false;
    scene.add(mesh);batches++;
    for(const g of group.geometries)g.dispose();
  }
  const geometries=new Set();root.traverse(o=>{if(o.isMesh)geometries.add(o.geometry);});for(const g of geometries)g.dispose();
  return {sourceMeshes,batches};
}

function restoreView(){
  if(!ready)return;
  camera.position.copy(homePosition);camera.quaternion.copy(homeQuaternion);
  controls.target.copy(homeTarget);controls.update();
}

async function load(){
  try{
    const response=await fetch('./scene-info.json');if(!response.ok)throw new Error('场景信息读取失败');const meta=await response.json();
    const gltf=await new GLTFLoader().loadAsync('./scene.glb',p=>{$('progress').textContent=p.total?`正在加载模型 ${Math.round(p.loaded/p.total*100)}%`:`正在加载模型 ${(p.loaded/1048576).toFixed(1)} MB`;});
    $('progress').textContent='正在准备材质和实时风动…';
    const materialInfo=new Map(meta.materials.map(m=>[m.name,m]));
    gltf.scene.traverse(o=>{
      if(!o.isMesh)return;
      for(const m of (Array.isArray(o.material)?o.material:[o.material])){
        const info=materialInfo.get(m.name);if(!info)continue;
        let base=info.base;
        if(info.linked&&info.ramps.length){const c=info.ramps[0].colors;base=c[0].map((v,i)=>v*0.6+c[c.length-1][i]*0.4);}
        m.color.setRGB(...base.slice(0,3));m.roughness=info.roughness;
        m.emissive.setRGB(...info.emission.slice(0,3));m.emissiveIntensity=info.emissionStrength;
      }
    });
    const batches=batchScene(gltf.scene);
    const original=gltf.cameras[0];
    if(original){original.updateWorldMatrix(true,false);homePosition=original.getWorldPosition(new THREE.Vector3());homeQuaternion=original.getWorldQuaternion(new THREE.Quaternion());camera.fov=original.fov;}
    else {homePosition=new THREE.Vector3(...meta.camera.position);homeQuaternion=new THREE.Quaternion().setFromEuler(new THREE.Euler(0,0,0));camera.fov=meta.camera.fov;}
    homeTarget=homePosition.clone().add(new THREE.Vector3(0,0,-1).applyQuaternion(homeQuaternion).multiplyScalar(25));
    camera.updateProjectionMatrix();
    scene.add(new THREE.HemisphereLight(0x8ca5df,0x30212c,0.36));
    RectAreaLightUniformsLib.init();
    for(const info of meta.lights){
      if(info.type==='AREA'){
        const color=new THREE.Color(...info.color);
        const light=new THREE.RectAreaLight(color,info.energy/(info.size*info.size)*0.16,info.size,info.size);
        light.position.set(...info.position);
        const d=info.direction;light.lookAt(light.position.clone().add(new THREE.Vector3(d[0],d[2],-d[1])));scene.add(light);
      }else if(info.type==='POINT'&&/Amber|bench/i.test(info.name)){
        const light=new THREE.PointLight(new THREE.Color(...info.color),info.energy*0.12,12,2);light.position.set(...info.position);scene.add(light);
      }
    }
    ready=true;restoreView();
    window.gardenPreview={ready:true,batches,source:meta.scene};
    renderer.info.reset();composer.render();$('loading').style.display='none';
    $('counts').textContent=`${(meta.vertices/10000).toFixed(1)} 万顶点 · ${batches.batches} 材质批次`;
  }catch(error){console.error(error);$('progress').textContent='预览加载失败：'+error.message;$('progress').className='error';window.gardenPreview={ready:false,error:error.message};}
}
$('wind').onchange=()=>windStrength.value=$('wind').checked?Number($('strength').value):0;
$('strength').oninput=()=>windStrength.value=$('wind').checked?Number($('strength').value):0;
$('exposure').oninput=()=>renderer.toneMappingExposure=Number($('exposure').value);
$('orbit').onchange=()=>controls.autoRotate=$('orbit').checked;
$('reset').onclick=restoreView;
$('overview').onclick=()=>{if(!ready)return;camera.position.set(38,30,47);controls.target.set(0,3,-15);controls.update();};
$('quality').onchange=()=>{renderer.setPixelRatio(Math.min(devicePixelRatio,Number($('quality').value)));composer.setPixelRatio(renderer.getPixelRatio());};
$('reference').onclick=()=>$('reference-view').style.display='flex';
$('close-reference').onclick=()=>$('reference-view').style.display='none';
$('capture').onclick=()=>{if(!ready)return;composer.render();const a=document.createElement('a');a.download='夜樱庭院.png';a.href=renderer.domElement.toDataURL('image/png');a.click();};
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);composer.setSize(innerWidth,innerHeight);});
renderer.setAnimationLoop(now=>{
  const dt=Math.min((now-last)/1000,0.05);last=now;
  if(document.hidden)return;
  t+=dt;windTime.value=t;controls.update();
  if(ready){renderer.info.reset();composer.render();frames++;if(now-fpsTime>1000){const fps=Math.round(frames*1000/(now-fpsTime));$('fps').textContent=`${fps} FPS`;$('counts').textContent=`${(renderer.info.render.triangles/10000).toFixed(1)} 万三角形 · ${renderer.info.render.calls} 次绘制`;window.gardenPreview.fps=fps;frames=0;fpsTime=now;}}
});
load();
