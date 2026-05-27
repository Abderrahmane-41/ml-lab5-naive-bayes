import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

const MODEL_URL = "assets/models/humanoid-robot.glb";
const ROTATION_VH = 1.2;

const canvas = document.getElementById("hero-canvas");
const heroViewport = document.querySelector(".hero-viewport");
const loaderEl = document.getElementById("hero-loader");
const loaderText = document.querySelector(".hero-loader-text");

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const isMobile = window.matchMedia("(max-width: 768px)").matches;
const useBloom = !isMobile && !reducedMotion;

let robot = null;
let scrollProgress = 0;
let targetRotationY = 0;
let idleTime = 0;
let rotationScrollMax = 1200;
let composer = null;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x030712, 0.028);

const camera = new THREE.PerspectiveCamera(
  42,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);
camera.position.set(0, 1.15, isMobile ? 3.8 : 3.1);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: !isMobile,
  alpha: true,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;
renderer.shadowMap.enabled = !isMobile;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;

const ambient = new THREE.AmbientLight(0x8899cc, 0.35);
scene.add(ambient);

const keyLight = new THREE.DirectionalLight(0xe8eeff, 1.6);
keyLight.position.set(5, 8, 6);
keyLight.castShadow = !isMobile;
keyLight.shadow.mapSize.set(1024, 1024);
scene.add(keyLight);

const fill = new THREE.DirectionalLight(0x334155, 0.5);
fill.position.set(-4, 2, 2);
scene.add(fill);

const rimCyan = new THREE.DirectionalLight(0x22d3ee, 1.1);
rimCyan.position.set(-6, 3, -4);
scene.add(rimCyan);

const rimViolet = new THREE.DirectionalLight(0xa78bfa, 0.75);
rimViolet.position.set(4, 0, -5);
scene.add(rimViolet);

const ground = new THREE.Mesh(
  new THREE.CircleGeometry(6, 64),
  new THREE.MeshStandardMaterial({
    color: 0x0b1220,
    metalness: 0.85,
    roughness: 0.35,
    transparent: true,
    opacity: 0.55,
  })
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = 0;
ground.receiveShadow = true;
scene.add(ground);

new THREE.TextureLoader().load(
  "assets/hero-space.png",
  (texture) => {
    texture.colorSpace = THREE.SRGBColorSpace;
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(90, 48, 24),
      new THREE.MeshBasicMaterial({ map: texture, side: THREE.BackSide, depthWrite: false })
    );
    scene.add(sky);
  },
  undefined,
  () => {
    scene.background = new THREE.Color(0x030712);
  }
);

const starCount = isMobile ? 800 : 2800;
const starPositions = new Float32Array(starCount * 3);
for (let i = 0; i < starCount; i++) {
  const r = 30 + Math.random() * 50;
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
  starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
  starPositions[i * 3 + 2] = r * Math.cos(phi);
}
const stars = new THREE.Points(
  new THREE.BufferGeometry().setAttribute(
    "position",
    new THREE.BufferAttribute(starPositions, 3)
  ),
  new THREE.PointsMaterial({
    color: 0xffffff,
    size: isMobile ? 0.06 : 0.1,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
  })
);
scene.add(stars);

if (useBloom) {
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.35,
    0.4,
    0.85
  );
  composer.addPass(bloom);
}

function setLoader(visible, message) {
  if (!loaderEl) return;
  loaderEl.classList.toggle("is-hidden", !visible);
  if (loaderText && message) loaderText.textContent = message;
}

function enhanceMaterials(object) {
  object.traverse((child) => {
    if (!child.isMesh) return;
    child.castShadow = !isMobile;
    child.receiveShadow = true;
    const mats = Array.isArray(child.material) ? child.material : [child.material];
    mats.forEach((mat) => {
      if (!mat) return;
      if (mat.isMeshStandardMaterial || mat.isMeshPhysicalMaterial) {
        mat.metalness = Math.min((mat.metalness ?? 0.3) + 0.35, 0.95);
        mat.roughness = Math.max((mat.roughness ?? 0.6) - 0.2, 0.12);
        mat.envMapIntensity = 1.2;
      }
      if (mat.emissive) {
        mat.emissiveIntensity = Math.max(mat.emissiveIntensity ?? 0, 0.15);
      }
    });
  });
}

function fitRobot(model) {
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  const scale = (isMobile ? 1.05 : 1.15) / maxDim;
  model.scale.setScalar(scale);
  model.position.sub(center.multiplyScalar(scale));
  model.position.y += 0.02;
}

function loadModel(url, attempt = 1) {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    loader.load(
      url,
      (gltf) => resolve(gltf.scene),
      (event) => {
        if (event.total && loaderText) {
          const pct = Math.round((event.loaded / event.total) * 100);
          loaderText.textContent = `Loading humanoid systems… ${pct}%`;
        }
      },
      reject
    );
  });
}

async function initRobot() {
  setLoader(true, "Initializing humanoid systems…");
  try {
    robot = await loadModel(MODEL_URL);
  } catch (firstErr) {
    console.warn("Model load attempt 1 failed", firstErr);
    setLoader(true, "Retrying connection…");
    try {
      robot = await loadModel(`${MODEL_URL}?v=2`);
    } catch (secondErr) {
      console.error("Model load failed", secondErr);
      setLoader(true, "Model unavailable — check assets.");
      return;
    }
  }

  enhanceMaterials(robot);
  fitRobot(robot);
  scene.add(robot);
  setLoader(false);
}

function updateRotationBounds() {
  rotationScrollMax = Math.min((ROTATION_VH * window.innerHeight) / 1, 1400);
}

function updateScrollProgress() {
  updateRotationBounds();
  const y = window.scrollY;
  scrollProgress = Math.min(1, Math.max(0, y / rotationScrollMax));
  const fullTurns = reducedMotion ? 0.25 : 2;
  targetRotationY = scrollProgress * Math.PI * 2 * fullTurns;

  if (heroViewport) {
    const fadeStart = rotationScrollMax * 0.65;
    const fadeEnd = rotationScrollMax + window.innerHeight * 0.35;
    const opacity =
      y <= fadeStart
        ? 1
        : Math.max(0.15, 1 - (y - fadeStart) / (fadeEnd - fadeStart));
    heroViewport.style.setProperty("--hero-opacity", String(opacity));
  }
}

initRobot();
updateRotationBounds();
window.addEventListener("scroll", updateScrollProgress, { passive: true });
updateScrollProgress();

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  if (composer) {
    composer.setSize(window.innerWidth, window.innerHeight);
  }
  updateRotationBounds();
}

window.addEventListener("resize", onResize);

function animate() {
  requestAnimationFrame(animate);
  idleTime += 0.012;

  if (robot) {
    robot.rotation.y += (targetRotationY - robot.rotation.y) * 0.09;
    robot.position.y = Math.sin(idleTime) * 0.04;
  }

  stars.rotation.y += 0.00012;
  const camSway = Math.sin(idleTime * 0.35) * 0.08;
  camera.position.x = camSway;
  camera.lookAt(0, 0.95, 0);

  if (composer) composer.render();
  else renderer.render(scene, camera);
}

animate();
