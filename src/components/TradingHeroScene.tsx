"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export function TradingHeroScene() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
      preserveDrawingBuffer: true,
    });

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    camera.position.set(0.2, 2.25, 8.3);
    camera.lookAt(0, -0.55, 0);

    const root = new THREE.Group();
    root.rotation.x = -0.17;
    root.rotation.y = -0.3;
    scene.add(root);

    const grid = new THREE.GridHelper(20, 28, 0x67e8f9, 0x164e63);
    grid.position.y = -2.25;
    grid.position.z = -0.65;
    const gridMaterial = grid.material as THREE.Material | THREE.Material[];
    if (Array.isArray(gridMaterial)) {
      gridMaterial.forEach((material) => {
        material.transparent = true;
        material.opacity = 0.22;
      });
    } else {
      gridMaterial.transparent = true;
      gridMaterial.opacity = 0.22;
    }
    root.add(grid);

    const candleGroup = new THREE.Group();
    const candleMaterialUp = new THREE.MeshBasicMaterial({
      color: 0x34d399,
      transparent: true,
      opacity: 0.72,
    });
    const candleMaterialDown = new THREE.MeshBasicMaterial({
      color: 0xfb7185,
      transparent: true,
      opacity: 0.68,
    });
    const wickMaterial = new THREE.LineBasicMaterial({
      color: 0xa5f3fc,
      transparent: true,
      opacity: 0.38,
    });

    const candleGeometry = new THREE.BoxGeometry(0.14, 1, 0.08);
    const candleCount = 36;
    const pricePoints: THREE.Vector3[] = [];

    for (let index = 0; index < candleCount; index += 1) {
      const x = (index - candleCount / 2) * 0.36;
      const wave = Math.sin(index * 0.43) * 0.7 + Math.cos(index * 0.17) * 0.48;
      const trend = index * 0.028;
      const y = wave + trend - 0.45;
      const height = 0.34 + Math.abs(Math.sin(index * 0.79)) * 1.08;
      const isUp = Math.sin(index * 0.84) > -0.2;
      const candle = new THREE.Mesh(candleGeometry, isUp ? candleMaterialUp : candleMaterialDown);

      candle.position.set(x, y, 0);
      candle.scale.y = height;
      candle.userData.phase = index * 0.31;
      candleGroup.add(candle);

      const wickGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(x, y - height * 0.72, 0),
        new THREE.Vector3(x, y + height * 0.72, 0),
      ]);
      candleGroup.add(new THREE.Line(wickGeometry, wickMaterial));
      pricePoints.push(new THREE.Vector3(x, y + height * 0.36, 0.05));
    }

    root.add(candleGroup);

    const priceGeometry = new THREE.BufferGeometry().setFromPoints(pricePoints);
    const priceLine = new THREE.Line(
      priceGeometry,
      new THREE.LineBasicMaterial({
        color: 0x67e8f9,
        transparent: true,
        opacity: 0.95,
      })
    );
    root.add(priceLine);

    const nodeGeometry = new THREE.SphereGeometry(0.075, 18, 18);
    const nodeMaterial = new THREE.MeshBasicMaterial({
      color: 0xfde68a,
      transparent: true,
      opacity: 0.88,
    });
    const signalNodes = pricePoints
      .filter((_, index) => index % 7 === 2)
      .map((point, index) => {
        const node = new THREE.Mesh(nodeGeometry, nodeMaterial);
        node.position.copy(point);
        node.position.z += 0.12;
        node.userData.phase = index * 0.9;
        root.add(node);
        return node;
      });

    const haloGeometry = new THREE.TorusGeometry(0.16, 0.006, 8, 34);
    const haloMaterial = new THREE.MeshBasicMaterial({
      color: 0x67e8f9,
      transparent: true,
      opacity: 0.42,
    });
    const halos = signalNodes.map((node) => {
      const halo = new THREE.Mesh(haloGeometry, haloMaterial);
      halo.position.copy(node.position);
      halo.rotation.x = Math.PI / 2;
      root.add(halo);
      return halo;
    });

    const particleGeometry = new THREE.BufferGeometry();
    const particleCount = 150;
    const positions = new Float32Array(particleCount * 3);
    for (let index = 0; index < particleCount; index += 1) {
      positions[index * 3] = (Math.random() - 0.5) * 17;
      positions[index * 3 + 1] = (Math.random() - 0.5) * 7;
      positions[index * 3 + 2] = (Math.random() - 0.5) * 4 - 0.2;
    }
    particleGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const particles = new THREE.Points(
      particleGeometry,
      new THREE.PointsMaterial({
        color: 0xa5f3fc,
        size: 0.024,
        transparent: true,
        opacity: 0.42,
        blending: THREE.AdditiveBlending,
      })
    );
    root.add(particles);

    const resize = () => {
      const { width, height } = mount.getBoundingClientRect();
      const safeWidth = Math.max(width, 1);
      const safeHeight = Math.max(height, 1);
      camera.aspect = safeWidth / safeHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(safeWidth, safeHeight, false);
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
    };

    let frame = 0;
    let animationId = 0;
    const animate = () => {
      frame += reducedMotion ? 0.002 : 0.01;
      root.rotation.y = -0.33 + Math.sin(frame * 0.62) * 0.035;
      root.rotation.x = -0.18 + Math.cos(frame * 0.48) * 0.018;
      particles.rotation.y += reducedMotion ? 0.0002 : 0.001;

      candleGroup.children.forEach((child) => {
        if (child instanceof THREE.Mesh) {
          child.position.z = Math.sin(frame * 2 + child.userData.phase) * 0.06;
        }
      });

      signalNodes.forEach((node, index) => {
        const pulse = 1 + Math.sin(frame * 3 + node.userData.phase) * 0.22;
        node.scale.setScalar(pulse);
        halos[index].scale.setScalar(1 + Math.sin(frame * 2.4 + index) * 0.18);
      });

      renderer.render(scene, camera);
      animationId = window.requestAnimationFrame(animate);
    };

    resize();
    animate();
    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
      window.cancelAnimationFrame(animationId);
      mount.removeChild(renderer.domElement);
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Points) {
          object.geometry.dispose();
          const material = object.material;
          if (Array.isArray(material)) {
            material.forEach((item) => item.dispose());
          } else {
            material.dispose();
          }
        }
      });
      renderer.dispose();
    };
  }, []);

  return <div ref={mountRef} aria-hidden className="absolute inset-0 h-full w-full" />;
}
