import * as THREE from 'three';

const canvas = document.getElementById('bg');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000, 0);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 14;

scene.add(new THREE.AmbientLight(0x334466));
const keyLight = new THREE.PointLight(0x7c6cff, 40, 60);
keyLight.position.set(5, 5, 8);
scene.add(keyLight);

function makeSpriteTexture(inner, outer, size) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, inner);
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(c);
}

const starCount = 2200;
const positions = new Float32Array(starCount * 3);
for (let i = 0; i < starCount; i++) {
  positions[i * 3] = (Math.random() - 0.5) * 120;
  positions[i * 3 + 1] = (Math.random() - 0.5) * 80;
  positions[i * 3 + 2] = (Math.random() - 0.5) * 120;
}
const starGeo = new THREE.BufferGeometry();
starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
const starMat = new THREE.PointsMaterial({
  color: 0xffffff,
  size: 0.12,
  sizeAttenuation: true,
  transparent: true,
  opacity: 0.9,
  depthWrite: false,
});
const stars = new THREE.Points(starGeo, starMat);
scene.add(stars);

const starSprites = new THREE.Group();
for (let i = 0; i < 40; i++) {
  const tex = makeSpriteTexture('rgba(255,255,255,1)', 'rgba(255,255,255,0)', 64);
  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const s = new THREE.Sprite(mat);
  s.position.set((Math.random() - 0.5) * 60, (Math.random() - 0.5) * 40, (Math.random() - 0.5) * 40);
  s.scale.setScalar(0.5 + Math.random() * 0.7);
  starSprites.add(s);
}
scene.add(starSprites);

const core = new THREE.Mesh(
  new THREE.IcosahedronGeometry(2.2, 1),
  new THREE.MeshBasicMaterial({ color: 0x7c6cff, wireframe: true, transparent: true, opacity: 0.5 })
);
scene.add(core);

const coreGlowTex = makeSpriteTexture('rgba(124,108,255,0.8)', 'rgba(124,108,255,0)', 256);
const coreGlow = new THREE.Sprite(
  new THREE.SpriteMaterial({
    map: coreGlowTex,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
);
coreGlow.scale.setScalar(6);
scene.add(coreGlow);

const orbitGroup = new THREE.Group();
const planet = new THREE.Mesh(
  new THREE.SphereGeometry(0.28, 24, 24),
  new THREE.MeshStandardMaterial({ color: 0x5ec8f2, emissive: 0x112233, roughness: 0.4, metalness: 0.2 })
);
const planetGlowTex = makeSpriteTexture('rgba(94,200,242,0.8)', 'rgba(94,200,242,0)', 128);
const planetGlow = new THREE.Sprite(
  new THREE.SpriteMaterial({ map: planetGlowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })
);
planetGlow.scale.setScalar(1.4);
planet.position.set(3.6, 0, 0);
planetGlow.position.copy(planet.position);
orbitGroup.add(planet);
orbitGroup.add(planetGlow);
scene.add(orbitGroup);

let target = { x: 0, y: 0 };
let current = { x: 0, y: 0 };
window.addEventListener('pointermove', (e) => {
  target.x = e.clientX / window.innerWidth - 0.5;
  target.y = e.clientY / window.innerHeight - 0.5;
});

const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();

  current.x += (target.x - current.x) * 0.05;
  current.y += (target.y - current.y) * 0.05;

  stars.rotation.y = t * 0.02;
  stars.rotation.x = Math.sin(t * 0.1) * 0.02;
  starMat.size = 0.12 + Math.sin(t * 2) * 0.01;

  starSprites.children.forEach((s) => {
    if (s.userData.phase === undefined) {
      s.userData.phase = Math.random() * Math.PI * 2;
      s.userData.base = s.scale.x;
    }
    const k = 0.5 + 0.5 * Math.sin(t * 2 + s.userData.phase);
    s.material.opacity = 0.35 + k * 0.65;
    s.scale.setScalar(s.userData.base * (0.7 + k * 0.6));
  });

  core.rotation.y = t * 0.12;
  core.rotation.z = t * 0.05;
  const pulse = 1 + Math.sin(t * 1.5) * 0.05;
  coreGlow.scale.setScalar(6 * pulse);
  coreGlow.material.opacity = 0.6 + Math.sin(t * 1.5) * 0.2;

  orbitGroup.rotation.y = t * 0.3;

  camera.position.x += (current.x * 1.2 - camera.position.x) * 0.04;
  camera.position.y += (-current.y * 0.8 - camera.position.y) * 0.04;
  camera.lookAt(0, 0, 0);

  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const roles = ['Full-stack Engineer', 'Product Builder', 'Campus Platform Creator', '开发者'];
const typedEl = document.getElementById('typed');
let roleIndex = 0;
let charCount = 0;
let deleting = false;

function typeLoop() {
  const word = roles[roleIndex];
  typedEl.textContent = word.slice(0, charCount);
  if (!deleting && charCount < word.length) {
    charCount++;
    setTimeout(typeLoop, 90);
  } else if (!deleting) {
    deleting = true;
    setTimeout(typeLoop, 1600);
  } else if (charCount > 0) {
    charCount--;
    deleting = true;
    setTimeout(typeLoop, 45);
  } else {
    deleting = false;
    roleIndex = (roleIndex + 1) % roles.length;
    setTimeout(typeLoop, 350);
  }
}
typeLoop();

const revealEls = document.querySelectorAll('.card, .tile, .project-card, .section-title');
const io = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add('revealed');
        io.unobserve(e.target);
      }
    });
  },
  { threshold: 0.15 }
);
revealEls.forEach((el) => io.observe(el));

document.getElementById('year').textContent = new Date().getFullYear();

document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    if (id.length > 1) {
      const targetEl = document.querySelector(id);
      if (targetEl) {
        e.preventDefault();
        targetEl.scrollIntoView({ behavior: 'smooth' });
      }
    }
  });
});
