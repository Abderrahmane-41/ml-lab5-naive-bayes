import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  Environment,
  Float,
  Scroll,
  ScrollControls,
  Text,
  useGLTF,
  useScroll,
  useTexture,
} from "@react-three/drei";
import * as THREE from "three";

const CARD_DATA = [
  {
    title: "Naive Bayes",
    desc: "Probabilistic classifier lab with full evaluation pipeline.",
    x: 1.8,
    y: 0.8,
  },
  {
    title: "Sentiment Analysis",
    desc: "Text processing, TF-IDF features, and baseline models.",
    x: 2.1,
    y: -0.1,
  },
];

function Starfield() {
  const pointsRef = useRef();
  const positions = useMemo(() => {
    const count = 1600;
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 40;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 25;
      arr[i * 3 + 2] = -Math.random() * 45;
    }
    return arr;
  }, []);

  useFrame((_, delta) => {
    if (!pointsRef.current) return;
    pointsRef.current.rotation.y += delta * 0.008;
    pointsRef.current.position.y += Math.sin(performance.now() * 0.0002) * 0.0008;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial color="#89f3ff" size={0.03} transparent opacity={0.85} />
    </points>
  );
}

function RobotRig() {
  const robotRef = useRef();
  const propsRef = useRef();
  const cardsRef = useRef();
  const ringRef = useRef();
  const chestLightRef = useRef();
  const scroll = useScroll();

  const gltf = useGLTF("/assets/models/humanoid-robot.glb");
  const screenTex = useTexture("/assets/cursor-image-demo.png");
  const spaceTex = useTexture("/assets/hero-space.png");

  screenTex.colorSpace = THREE.SRGBColorSpace;
  spaceTex.colorSpace = THREE.SRGBColorSpace;

  useMemo(() => {
    gltf.scene.traverse((child) => {
      if (!child.isMesh) return;
      if (child.material?.isMeshStandardMaterial) {
        child.material.metalness = Math.min(1, (child.material.metalness ?? 0.4) + 0.3);
        child.material.roughness = Math.max(0.12, (child.material.roughness ?? 0.55) - 0.2);
      }
    });
  }, [gltf.scene]);

  useFrame((state, delta) => {
    const t = scroll.offset;
    const p1 = Math.min(1, t / 0.25);
    const p2 = THREE.MathUtils.clamp((t - 0.25) / 0.25, 0, 1);
    const p3 = THREE.MathUtils.clamp((t - 0.5) / 0.25, 0, 1);
    const p4 = THREE.MathUtils.clamp((t - 0.75) / 0.25, 0, 1);

    if (robotRef.current) {
      const targetX =
        THREE.MathUtils.lerp(0, 2.8, p2) +
        THREE.MathUtils.lerp(2.8, -2.5, p3) +
        THREE.MathUtils.lerp(-2.5, 0, p4) -
        2.8 * p3;
      const targetZ = THREE.MathUtils.lerp(0, -1.8, p3) + THREE.MathUtils.lerp(-1.8, 0, p4);
      const targetY = Math.sin(state.clock.elapsedTime * 1.4) * 0.12;
      const targetRotY =
        THREE.MathUtils.lerp(0, 0.35, p2) +
        THREE.MathUtils.lerp(0.35, -0.45, p3) +
        THREE.MathUtils.lerp(-0.45, Math.PI, p4);

      robotRef.current.position.x = THREE.MathUtils.lerp(
        robotRef.current.position.x,
        targetX,
        0.08
      );
      robotRef.current.position.y = THREE.MathUtils.lerp(
        robotRef.current.position.y,
        targetY,
        0.08
      );
      robotRef.current.position.z = THREE.MathUtils.lerp(
        robotRef.current.position.z,
        targetZ,
        0.08
      );
      robotRef.current.rotation.y = THREE.MathUtils.lerp(
        robotRef.current.rotation.y,
        targetRotY,
        0.08
      );
    }

    if (propsRef.current) {
      const propsIn = THREE.MathUtils.smoothstep(p2, 0.15, 0.9);
      const propsOut = THREE.MathUtils.smoothstep(p3, 0.15, 0.95);
      propsRef.current.position.x = THREE.MathUtils.lerp(-6, -2.4, propsIn);
      propsRef.current.position.y = THREE.MathUtils.lerp(-0.8, 0.4, propsIn) + propsOut * 4.8;
      propsRef.current.rotation.z = Math.sin(state.clock.elapsedTime) * 0.08;
      propsRef.current.visible = propsOut < 0.98;
    }

    if (cardsRef.current) {
      const inView = THREE.MathUtils.smoothstep(p3, 0.1, 0.9);
      cardsRef.current.position.x = THREE.MathUtils.lerp(4.8, 1.8, inView);
      cardsRef.current.position.y = THREE.MathUtils.lerp(-0.7, 0.5, inView);
      cardsRef.current.rotation.y = THREE.MathUtils.lerp(0.45, -0.12, inView);
      cardsRef.current.visible = inView > 0.05;
    }

    if (ringRef.current) {
      const ringIn = THREE.MathUtils.smoothstep(p4, 0.1, 0.95);
      ringRef.current.visible = ringIn > 0.02;
      ringRef.current.rotation.y += delta * 0.65;
      ringRef.current.position.y = 0.8;
      ringRef.current.scale.setScalar(THREE.MathUtils.lerp(0.3, 1, ringIn));
    }

    if (chestLightRef.current && robotRef.current) {
      chestLightRef.current.position.set(
        robotRef.current.position.x,
        robotRef.current.position.y + 1.2,
        robotRef.current.position.z + 0.2
      );
      chestLightRef.current.intensity = 1.2 + p1 * 0.6;
    }
  });

  return (
    <>
      <mesh position={[0, 0, -22]}>
        <planeGeometry args={[70, 35]} />
        <meshBasicMaterial map={spaceTex} opacity={0.18} transparent />
      </mesh>

      <group ref={robotRef} position={[0, 0, 0]}>
        <primitive object={gltf.scene} scale={2.9} position={[0, -3.55, 0]} />
      </group>

      <pointLight ref={chestLightRef} color="#00f0ff" intensity={1.2} distance={12} />

      <group ref={propsRef} position={[-6, -1, 0]}>
        <Float speed={1.1} rotationIntensity={0.2} floatIntensity={0.3}>
          <mesh position={[0, 0.9, 0]}>
            <boxGeometry args={[1.6, 1.05, 0.08]} />
            <meshStandardMaterial color="#11131d" metalness={0.9} roughness={0.2} />
          </mesh>
          <mesh position={[0, 0.9, 0.045]}>
            <planeGeometry args={[1.42, 0.84]} />
            <meshBasicMaterial map={screenTex} />
          </mesh>
          <mesh position={[0, 0.3, 0.15]} rotation={[-0.35, 0, 0]}>
            <boxGeometry args={[1.4, 0.08, 0.45]} />
            <meshStandardMaterial color="#191d2b" metalness={0.7} roughness={0.25} />
          </mesh>
        </Float>
        {Array.from({ length: 8 }).map((_, i) => (
          <mesh
            key={i}
            position={[
              -0.8 + (i % 4) * 0.5,
              -0.4 + Math.floor(i / 4) * 0.35,
              -0.2 + (i % 2) * 0.2,
            ]}
          >
            <sphereGeometry args={[0.06, 16, 16]} />
            <meshStandardMaterial color="#00f0ff" emissive="#00f0ff" emissiveIntensity={1.1} />
          </mesh>
        ))}
      </group>

      <group ref={cardsRef} position={[4.8, -0.8, 0]} visible={false}>
        {CARD_DATA.map((card, idx) => (
          <group key={card.title} position={[card.x - 1.6, card.y, idx * -0.3]}>
            <mesh>
              <planeGeometry args={[2.2, 1.1]} />
              <meshStandardMaterial
                color="#0d1424"
                transparent
                opacity={0.88}
                metalness={0.6}
                roughness={0.24}
              />
            </mesh>
            <Text
              position={[-0.9, 0.22, 0.02]}
              fontSize={0.15}
              color="#00f0ff"
              anchorX="left"
              anchorY="middle"
            >
              {card.title}
            </Text>
            <Text
              position={[-0.9, -0.05, 0.02]}
              fontSize={0.085}
              maxWidth={1.75}
              color="#d5dcff"
              anchorX="left"
              anchorY="top"
            >
              {card.desc}
            </Text>
          </group>
        ))}
      </group>

      <group ref={ringRef} visible={false}>
        {["Python", "TensorFlow", "Scikit-Learn"].map((name, i) => {
          const angle = (i / 3) * Math.PI * 2;
          return (
            <group key={name} position={[Math.cos(angle) * 2.5, 0, Math.sin(angle) * 2.5]}>
              <mesh>
                <torusGeometry args={[0.32, 0.05, 16, 80]} />
                <meshStandardMaterial color="#7000ff" emissive="#7000ff" emissiveIntensity={0.45} />
              </mesh>
              <Text position={[0, -0.6, 0]} fontSize={0.18} color="#00f0ff">
                {name}
              </Text>
            </group>
          );
        })}
      </group>
    </>
  );
}

function OverlayContent() {
  return (
    <Scroll html>
      <div className="overlay">
        <section className="panel hero-panel" style={{ top: "13vh" }}>
          <p className="eyebrow">Engineering Intelligence</p>
          <h1>BAATCHIA Abderrahmane</h1>
          <p>AI &amp; Machine Learning Student crafting robust, production-minded ML experiences.</p>
        </section>

        <section className="panel about-panel glass" style={{ top: "130vh" }}>
          <h2>About</h2>
          <p>
            Focused on translating research and coursework into reliable systems with clean
            experimentation, reproducibility, and thoughtful UX.
          </p>
        </section>

        <section className="panel projects-panel glass" style={{ top: "230vh" }}>
          <h2>Projects</h2>
          <div className="cards">
            <article>
              <h3>Naive Bayes</h3>
              <p>End-to-end classification workflow with evaluation and visualization.</p>
            </article>
            <article>
              <h3>Sentiment Analysis</h3>
              <p>Text feature engineering and baseline NLP models.</p>
            </article>
          </div>
        </section>

        <section className="panel skills-panel glass" style={{ top: "335vh" }}>
          <h2>Skills Orbit</h2>
          <p>Python, TensorFlow, Scikit-Learn, Data Pipelines, Experiment Tracking.</p>
        </section>
      </div>
    </Scroll>
  );
}

export default function App() {
  return (
    <div className="app">
      <Canvas camera={{ fov: 45, position: [0, 0, 10] }}>
        <color attach="background" args={["#050814"]} />
        <fog attach="fog" args={["#050814", 12, 38]} />

        <ambientLight color="#1a2e52" intensity={0.35} />
        <directionalLight color="#ffffff" intensity={2.1} position={[6, 7, 4]} />

        <ScrollControls pages={4} damping={0.25}>
          <Starfield />
          <RobotRig />
          <OverlayContent />
        </ScrollControls>

        <Environment preset="city" />
      </Canvas>
    </div>
  );
}

useGLTF.preload("/assets/models/humanoid-robot.glb");
