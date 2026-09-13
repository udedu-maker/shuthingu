import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js";
import { EffectComposer } from "https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/postprocessing/UnrealBloomPass.js";

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x02050d, 0.035);
const camera = new THREE.PerspectiveCamera(65, innerWidth / innerHeight, 0.1, 1000);
camera.position.set(0, 1.4, 11);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
document.body.appendChild(renderer.domElement);
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.8, 0.7, 0.65));

scene.add(new THREE.HemisphereLight(0x9dbdff, 0x1a0d09, 1.8));
const sun = new THREE.DirectionalLight(0xffd6ad, 3.5);
sun.position.set(2, 5, 8);
scene.add(sun);

const player = new THREE.Group();
const ship = new THREE.Mesh(
  new THREE.ConeGeometry(0.45, 1.7, 4),
  new THREE.MeshStandardMaterial({ color: 0x19cfff, emissive: 0x075a89, emissiveIntensity: 2, metalness: 0.65 })
);
ship.rotation.x = Math.PI / 2;
player.add(ship);
const wing = new THREE.Mesh(
  new THREE.BoxGeometry(1.8, 0.08, 0.35),
  new THREE.MeshStandardMaterial({ color: 0x9ceeff, emissive: 0x1da8d1, emissiveIntensity: 1.5 })
);
player.add(wing);
const cockpit = new THREE.Mesh(
  new THREE.SphereGeometry(0.25, 24, 12),
  new THREE.MeshPhysicalMaterial({ color: 0x152a4d, metalness: 0.7, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.08 })
);
cockpit.scale.set(0.8, 0.6, 1.5);
cockpit.position.set(0, 0.18, -0.1);
player.add(cockpit);
const engineGlow = new THREE.Mesh(
  new THREE.SphereGeometry(0.22, 16, 16),
  new THREE.MeshBasicMaterial({ color: 0xff9d38 })
);
engineGlow.position.z = 0.72;
player.add(engineGlow);
player.position.set(0, 0, 7);
scene.add(player);

const stars = new THREE.Points(
  new THREE.BufferGeometry().setFromPoints(Array.from({ length: 450 }, () =>
    new THREE.Vector3((Math.random() - 0.5) * 40, (Math.random() - 0.5) * 24, Math.random() * -55)
  )),
  new THREE.PointsMaterial({ color: 0x73b9ff, size: 0.055 })
);
scene.add(stars);
const nebula = new THREE.Mesh(
  new THREE.SphereGeometry(80, 32, 16),
  new THREE.MeshBasicMaterial({ color: 0x071a35, side: THREE.BackSide, transparent: true, opacity: 0.34 })
);
scene.add(nebula);

const keys = new Set();
const shots = [];
const enemies = [];
const powerups = [];
let score = 0;
let shield = 100;
let spawnTimer = 0;
let powerupTimer = 8;
let lastShot = 0;
let weapon = "NORMAL";
let weaponTimer = 0;
let gameOver = false;
const clock = new THREE.Clock();
const scoreEl = document.querySelector("#score");
const shieldEl = document.querySelector("#shield");
const weaponEl = document.querySelector("#weapon");
const message = document.querySelector("#message");

addEventListener("keydown", (event) => {
  keys.add(event.key.toLowerCase());
  keys.add(event.code);
  if (event.code === "Space") { event.preventDefault(); fire(); }
});
addEventListener("keyup", (event) => {
  keys.delete(event.key.toLowerCase());
  keys.delete(event.code);
});
addEventListener("pointerdown", fire);
document.querySelector("#restart").addEventListener("click", () => location.reload());

function fire() {
  if (gameOver || performance.now() - lastShot < 180) return;
  lastShot = performance.now();
  const offsets = weapon === "WIDE" ? [-0.42, 0, 0.42] : [0];
  offsets.forEach((offset) => {
    const laser = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, weapon === "WIDE" ? 0.07 : 0.045, 0.8, 8),
      new THREE.MeshBasicMaterial({ color: weapon === "WIDE" ? 0xffd36b : 0x8cffff })
    );
    laser.rotation.x = Math.PI / 2;
    laser.position.copy(player.position);
    laser.position.x += offset;
    laser.position.z -= 0.9;
    laser.userData.homing = weapon === "HOMING";
    scene.add(laser);
    shots.push(laser);
  });
}

function spawnEnemy() {
  const enemy = new THREE.Group();
  const geometry = new THREE.IcosahedronGeometry(0.62, 2);
  const vertices = geometry.attributes.position;
  for (let i = 0; i < vertices.count; i++) {
    const radius = 0.82 + Math.random() * 0.32;
    vertices.setXYZ(i, vertices.getX(i) * radius, vertices.getY(i) * radius, vertices.getZ(i) * radius);
  }
  geometry.computeVertexNormals();
  const rock = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({ color: 0x6e5144, roughness: 0.96, metalness: 0.05 })
  );
  enemy.add(rock);
  const craterMaterial = new THREE.MeshStandardMaterial({ color: 0x251b1a, roughness: 1 });
  for (let i = 0; i < 5; i++) {
    const crater = new THREE.Mesh(new THREE.SphereGeometry(0.11 + Math.random() * 0.1, 8, 6), craterMaterial);
    crater.position.set((Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 0.8, 0.5);
    crater.scale.z = 0.18;
    crater.rotation.set(Math.random(), Math.random(), Math.random());
    enemy.add(crater);
  }
  enemy.position.set((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 5, -28);
  enemy.userData.speed = 3 + Math.random() * 2;
  enemy.userData.spin = (Math.random() - 0.5) * 2;
  const trail = new THREE.Mesh(
    new THREE.ConeGeometry(0.18, 0.9, 8),
    new THREE.MeshBasicMaterial({ color: 0xff7a32, transparent: true, opacity: 0.8 })
  );
  trail.rotation.x = -Math.PI / 2;
  trail.position.z = -0.7;
  enemy.add(trail);
  scene.add(enemy);
  enemies.push(enemy);
}

function spawnPowerup() {
  const type = ["SHIELD", "HOMING", "WIDE"][Math.floor(Math.random() * 3)];
  const colors = { SHIELD: 0x54eaff, HOMING: 0xff70d8, WIDE: 0xffc857 };
  const item = new THREE.Group();
  const core = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.38, 1),
    new THREE.MeshStandardMaterial({ color: colors[type], emissive: colors[type], emissiveIntensity: 2.5, metalness: 0.65, roughness: 0.2 })
  );
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.58, 0.035, 8, 24),
    new THREE.MeshBasicMaterial({ color: colors[type], transparent: true, opacity: 0.8 })
  );
  item.add(core, ring);
  item.userData.type = type;
  item.userData.speed = 2.5;
  item.position.set((Math.random() - 0.5) * 9, (Math.random() - 0.5) * 4.5, -28);
  scene.add(item);
  powerups.push(item);
}

function activatePowerup(type) {
  if (type === "SHIELD") {
    shield = Math.min(100, shield + 35);
    shieldEl.textContent = shield;
    return;
  }
  weapon = type;
  weaponTimer = 10;
  weaponEl.textContent = type === "HOMING" ? "追尾弾" : "WIDE LASER";
}

function endGame() {
  gameOver = true;
  document.querySelector("#message-title").textContent = "MISSION FAILED";
  document.querySelector("#message-detail").textContent = `SCORE ${String(score).padStart(6, "0")}`;
  message.classList.remove("hidden");
}

function update(dt) {
  if (gameOver) return;
  const moveX = Number(keys.has("d") || keys.has("ArrowRight")) - Number(keys.has("a") || keys.has("ArrowLeft"));
  const moveY = Number(keys.has("w") || keys.has("ArrowUp")) - Number(keys.has("s") || keys.has("ArrowDown"));
  player.position.x = THREE.MathUtils.clamp(player.position.x + moveX * dt * 7, -5, 5);
  player.position.y = THREE.MathUtils.clamp(player.position.y + moveY * dt * 5, -3.5, 4);
  player.rotation.z = -moveX * 0.25;

  spawnTimer -= dt;
  if (spawnTimer <= 0) { spawnEnemy(); spawnTimer = Math.max(0.35, 1.1 - score / 1000); }
  powerupTimer -= dt;
  if (powerupTimer <= 0) { spawnPowerup(); powerupTimer = 12 + Math.random() * 8; }
  if (weaponTimer > 0) {
    weaponTimer -= dt;
    if (weaponTimer <= 0) { weapon = "NORMAL"; weaponEl.textContent = "NORMAL"; }
  }
  stars.position.z += dt * 1.5;
  if (stars.position.z > 10) stars.position.z = 0;

  for (let i = shots.length - 1; i >= 0; i--) {
    const shot = shots[i];
    if (shot.userData.homing && enemies.length) {
      let target = enemies[0];
      let distance = shot.position.distanceTo(target.position);
      for (const enemy of enemies) {
        const candidateDistance = shot.position.distanceTo(enemy.position);
        if (candidateDistance < distance) { target = enemy; distance = candidateDistance; }
      }
      shot.position.x += THREE.MathUtils.clamp((target.position.x - shot.position.x) * dt * 4, -dt * 8, dt * 8);
      shot.position.y += THREE.MathUtils.clamp((target.position.y - shot.position.y) * dt * 4, -dt * 8, dt * 8);
    }
    shot.position.z -= dt * 24;
    let hit = false;
    for (let j = enemies.length - 1; j >= 0; j--) {
      if (shot.position.distanceTo(enemies[j].position) < 0.75) {
        scene.remove(enemies[j]); enemies.splice(j, 1); score += 100; hit = true; break;
      }
    }
    if (hit || shot.position.z < -35) { scene.remove(shot); shots.splice(i, 1); }
  }
  for (let i = enemies.length - 1; i >= 0; i--) {
    const enemy = enemies[i];
    enemy.position.z += enemy.userData.speed * dt;
    enemy.rotation.x += dt * enemy.userData.spin; enemy.rotation.y += dt * 1.2;
    const horizontalDistance = Math.hypot(
      enemy.position.x - player.position.x,
      enemy.position.y - player.position.y
    );
    const depthDistance = Math.abs(enemy.position.z - player.position.z);
    if (horizontalDistance < 0.78 && depthDistance < 0.78) {
      scene.remove(enemy); enemies.splice(i, 1); shield = 0;
    } else if (enemy.position.z > 10) {
      scene.remove(enemy); enemies.splice(i, 1); score += 25;
    }
    for (let i = powerups.length - 1; i >= 0; i--) {
      const item = powerups[i];
      item.position.z += item.userData.speed * dt;
      item.rotation.y += dt * 2.5;
      item.rotation.z += dt;
      if (item.position.distanceTo(player.position) < 1.1) {
        activatePowerup(item.userData.type);
        scene.remove(item);
        powerups.splice(i, 1);
      } else if (item.position.z > 10) {
        scene.remove(item);
        powerups.splice(i, 1);
      }
    }
  }
  scoreEl.textContent = String(score).padStart(6, "0");
  shieldEl.textContent = Math.max(0, shield);
  if (shield <= 0) endGame();
}

function animate() {
  requestAnimationFrame(animate);
  update(clock.getDelta());
  composer.render();
}
addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
});
animate();
