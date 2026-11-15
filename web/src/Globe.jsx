import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { geoEquirectangular, geoGraticule10, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import land110 from "world-atlas/land-110m.json";

// Latitude/longitude to a point on a sphere, matching three.js sphere UVs.
function toVec(lat, lon, r) {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lon + 180) * Math.PI) / 180;
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta)
  );
}

// Draw a stylised world map onto a canvas and use it as the globe's skin.
function earthTexture() {
  const W = 2048, H = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  const proj = geoEquirectangular().scale(W / (2 * Math.PI)).translate([W / 2, H / 2]);
  const path = geoPath(proj, ctx);
  ctx.fillStyle = "#0A2247";
  ctx.fillRect(0, 0, W, H);
  ctx.beginPath();
  path(geoGraticule10());
  ctx.strokeStyle = "rgba(120,170,255,0.16)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.beginPath();
  path(feature(land110, land110.objects.land));
  ctx.fillStyle = "#1E6F5C";
  ctx.fill();
  ctx.strokeStyle = "#63D6B0";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

const ORBITS = [
  { r: 1.55, tilt: [1.25, 0.0, 0.3], speed: 0.006, color: "#F2B544", size: 0.04 },
  { r: 1.85, tilt: [1.05, 0.5, -0.4], speed: -0.004, color: "#5BB8FF", size: 0.035 },
  { r: 2.15, tilt: [1.4, -0.3, 0.9], speed: 0.0028, color: "#FFFFFF", size: 0.03 },
];

export default function Globe({ places, onPick }) {
  const mount = useRef(null);
  const [label, setLabel] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const el = mount.current;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      setFailed(true);
      return undefined;
    }
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 200);
    camera.position.set(0, 0, 5.6);
    scene.add(new THREE.AmbientLight(0xffffff, 1.1));
    const sun = new THREE.DirectionalLight(0xffffff, 2.4);
    sun.position.set(-3, 2.5, 4);
    scene.add(sun);

    const world = new THREE.Group();
    world.rotation.set(0.5, 0.44, 0);
    scene.add(world);
    const texture = earthTexture();
    const earth = new THREE.Mesh(
      new THREE.SphereGeometry(1, 64, 64),
      new THREE.MeshStandardMaterial({ map: texture, roughness: 1, metalness: 0 })
    );
    world.add(earth);
    scene.add(new THREE.Mesh(
      new THREE.SphereGeometry(1.07, 48, 48),
      new THREE.MeshBasicMaterial({ color: 0x5bb8ff, transparent: true, opacity: 0.1, side: THREE.BackSide })
    ));

    // Case pins: a dot plus a soft halo, attached to the globe so they turn with it.
    const pins = [];
    Object.entries(places).forEach(([key, p]) => {
      if (key === "bc") return;
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(0.026, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0xf2b544 })
      );
      dot.position.copy(toVec(p.lat, p.lon, 1.012));
      dot.userData = { key, name: p.name };
      const halo = new THREE.Mesh(
        new THREE.RingGeometry(0.04, 0.052, 32),
        new THREE.MeshBasicMaterial({ color: 0xf2b544, transparent: true, opacity: 0.7, side: THREE.DoubleSide })
      );
      halo.position.copy(toVec(p.lat, p.lon, 1.014));
      halo.lookAt(halo.position.clone().multiplyScalar(2));
      const hit = new THREE.Mesh(
        new THREE.SphereGeometry(0.09, 8, 8),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      hit.position.copy(dot.position);
      hit.userData = dot.userData;
      world.add(dot, halo, hit);
      pins.push({ dot, halo, hit });
    });

    // Satellites on tilted orbits; these do not turn with the globe.
    const sats = ORBITS.map((o) => {
      const group = new THREE.Group();
      group.rotation.set(...o.tilt);
      group.add(new THREE.Mesh(
        new THREE.TorusGeometry(o.r, 0.004, 6, 160),
        new THREE.MeshBasicMaterial({ color: 0x3a4e73 })
      ));
      const sat = new THREE.Mesh(
        new THREE.SphereGeometry(o.size, 16, 16),
        new THREE.MeshBasicMaterial({ color: o.color })
      );
      group.add(sat);
      scene.add(group);
      return { sat, o, angle: Math.random() * Math.PI * 2 };
    });

    const starPos = new Float32Array(900 * 3);
    for (let i = 0; i < 900; i += 1) {
      const v = new THREE.Vector3().randomDirection().multiplyScalar(30 + Math.random() * 40);
      starPos.set([v.x, v.y, v.z], i * 3);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.14, transparent: true, opacity: 0.85 })));

    const resize = () => {
      const w = el.clientWidth, h = el.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(el);

    // Pointer: drag to turn, hover a pin for its name, click a pin to open it.
    const ray = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let drag = null, moved = false, hovered = null;
    const pick = (ev) => {
      const rect = el.getBoundingClientRect();
      mouse.set(((ev.clientX - rect.left) / rect.width) * 2 - 1, -((ev.clientY - rect.top) / rect.height) * 2 + 1);
      ray.setFromCamera(mouse, camera);
      const hits = ray.intersectObjects([earth, ...pins.map((p) => p.hit)]);
      return hits.length && hits[0].object.userData.key ? hits[0].object : null;
    };
    const down = (ev) => { drag = { x: ev.clientX, y: ev.clientY }; moved = false; };
    const move = (ev) => {
      if (drag) {
        const dx = ev.clientX - drag.x, dy = ev.clientY - drag.y;
        if (Math.abs(dx) + Math.abs(dy) > 3) moved = true;
        world.rotation.y += dx * 0.006;
        world.rotation.x = Math.max(-1.2, Math.min(1.2, world.rotation.x + dy * 0.006));
        drag = { x: ev.clientX, y: ev.clientY };
        return;
      }
      const obj = pick(ev);
      hovered = obj;
      el.style.cursor = obj ? "pointer" : "grab";
      if (obj) {
        const rect = el.getBoundingClientRect();
        setLabel({ name: obj.userData.name, x: ev.clientX - rect.left, y: ev.clientY - rect.top });
      } else {
        setLabel(null);
      }
    };
    const up = (ev) => {
      const wasDrag = moved;
      drag = null;
      if (!wasDrag) {
        const obj = pick(ev);
        if (obj) onPick(obj.userData.key);
      }
    };
    const leave = () => { drag = null; hovered = null; setLabel(null); };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointerleave", leave);

    let frame = 0, raf = 0;
    const tick = () => {
      frame += 1;
      if (!still && !drag && !hovered) world.rotation.y += 0.0016;
      sats.forEach((s) => {
        if (!still) s.angle += s.o.speed;
        s.sat.position.set(Math.cos(s.angle) * s.o.r, Math.sin(s.angle) * s.o.r, 0);
      });
      const pulse = 1 + 0.25 * Math.sin(frame * 0.05);
      pins.forEach((p) => p.halo.scale.setScalar(still ? 1 : pulse));
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointerleave", leave);
      texture.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === el) el.removeChild(renderer.domElement);
    };
  }, [places, onPick]);

  return (
    <div className="globe-wrap">
      {!failed && (
        <div
          ref={mount}
          className="globe"
          role="img"
          aria-label="Rotating 3D Earth with satellites in orbit and a marker on each place that has a case file. Drag to turn it."
        >
          {label && (
            <div className="tip" style={{ left: label.x, top: label.y }}>
              <strong>{label.name}</strong>
              <span>Click to open its records</span>
            </div>
          )}
        </div>
      )}
      <div className="place-chips" aria-label="Places with case files">
        {Object.entries(places).filter(([k]) => k !== "bc").map(([key, p]) => (
          <button key={key} type="button" className="chip" onClick={() => onPick(key)}>
            <span className="pin-dot" aria-hidden="true" />
            {p.name}
          </button>
        ))}
      </div>
    </div>
  );
}
