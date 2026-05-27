import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const ROBOT_URL =
  "https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Models@master/2.0/RobotExpressive/glTF/RobotExpressive.gltf";

const canvas = document.getElementById("hero-canvas");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const isMobile = window.matchMedia("(max-width: 640px)").matches;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x030712, 0.035);

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);
camera.position.set(0, 1.4, isMobile ? 5.5 : 4.2);

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
renderer.toneMappingExposure = 1.1;

const ambient = new THREE.AmbientLight(0x404880, 0.55);
scene.add(ambient);

const keyLight = new THREE.DirectionalLight(0xc4d4ff, 1.4);
keyLight.position.set(4, 6, 5);
scene.add(keyLight);

const rimCyan = new THREE.DirectionalLight(0x22d3ee, 0.9);
rimCyan.position.set(-5, 2, -3);
scene.add(rimCyan);

const rimMagenta = new THREE.DirectionalLight(0xc084fc, 0.65);
rimMagenta.position.set(3, -1, -4);
scene.add(rimMagenta);

const textureLoader = new THREE.TextureLoader();
textureLoader.load(
  "assets/hero-space.png",
  (texture) => {
    texture.colorSpace = THREE.SRGBColorSpace;
    const skyGeo = new THREE.SphereGeometry(80, 64, 32);
    const skyMat = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.BackSide,
      depthWrite: false,
    });
    const sky = new THREE.Mesh(skyGeo, skyMat);
    scene.add(sky);
  },
  undefined,
  () => {
    scene.background = new THREE.Color(0x030712);
  }
);

const starCount = isMobile ? 1200 : 3500;
const starPositions = new Float32Array(starCount * 3);
for (let i = 0; i < starCount; i++) {
  const r = 25 + Math.random() * 45;
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
    size: isMobile ? 0.08 : 0.12,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
  })
);
scene.add(stars);

let robot = null;
let scrollProgress = 0;
let targetRotationY = 0;
let idleTime = 0;

function createProceduralRobot() {
  const group = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    metalness: 0.75,
    roughness: 0.28,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: 0x0ea5e9,
    emissive: 0x22d3ee,
    emissiveIntensity: 0.55,
    metalness: 0.6,
    roughness: 0.35,
  });

  const torso = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.4, 0.65), bodyMat);
  torso.position.y = 1.2;
  group.add(torso);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.75, 0.75), bodyMat);
  head.position.y = 2.35;
  group.add(head);

  const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.08, 0.05), accentMat);
  eyeL.position.set(-0.2, 2.4, 0.38);
  group.add(eyeL);

  const eyeR = eyeL.clone();
  eyeR.position.x = 0.2;
  group.add(eyeR);

  const armGeo = new THREE.BoxGeometry(0.28, 1.1, 0.28);
  const armL = new THREE.Mesh(armGeo, bodyMat);
  armL.position.set(-0.85, 1.25, 0);
  group.add(armL);

  const armR = armL.clone();
  armR.position.x = 0.85;
  group.add(armR);

  const legGeo = new THREE.BoxGeometry(0.35, 1.0, 0.35);
  const legL = new THREE.Mesh(legGeo, bodyMat);
  legL.position.set(-0.35, 0.35, 0);
  group.add(legL);

  const legR = legL.clone();
  legR.position.x = 0.35;
  group.add(legR);

  const antenna = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 0.5, 8),
    accentMat
  );
  antenna.position.set(0, 2.85, 0);
  group.add(antenna);

  group.scale.setScalar(0.85);
  return group;
}

function fitRobot(model) {
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  const scale = 2.2 / maxDim;

  model.scale.setScalar(scale);
  model.position.sub(center.multiplyScalar(scale));
  model.position.y += 0.15;
}

function loadRobot() {
  const loader = new GLTFLoader();
  loader.load(
    ROBOT_URL,
    (gltf) => {
      robot = gltf.scene;
      robot.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = false;
          child.receiveShadow = false;
          if (child.material) {
            child.material.metalness = Math.min(
              child.material.metalness ?? 0.5,
              0.85
            );
            child.material.roughness = Math.max(
              child.material.roughness ?? 0.5,
              0.2
            );
          }
        }
      });
      fitRobot(robot);
      scene.add(robot);
    },
    undefined,
    () => {
      robot = createProceduralRobot();
      scene.add(robot);
    }
  );
}

loadRobot();

function updateScrollProgress() {
  const maxScroll =
    document.documentElement.scrollHeight - window.innerHeight;
  scrollProgress =
    maxScroll > 0 ? Math.min(1, Math.max(0, window.scrollY / maxScroll)) : 0;

  const fullTurns = reducedMotion ? 0.25 : 2;
  targetRotationY = scrollProgress * Math.PI * 2 * fullTurns;
}

window.addEventListener("scroll", updateScrollProgress, { passive: true });
updateScrollProgress();

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener("resize", onResize);

function animate() {
  requestAnimationFrame(animate);
  idleTime += 0.01;

  if (robot) {
    robot.rotation.y += (targetRotationY - robot.rotation.y) * 0.08;
    robot.position.y = Math.sin(idleTime) * 0.06;
  }

  stars.rotation.y += 0.00015;
  camera.position.x = Math.sin(idleTime * 0.4) * 0.12;
  camera.lookAt(0, 1.1, 0);

  renderer.render(scene, camera);
}

animate();
