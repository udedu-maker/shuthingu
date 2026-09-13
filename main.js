import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js";

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

const keys = new Set();
const shots = [];
const enemies = [];
let score = 0;
let shield = 100;
let spawnTimer = 0;
let lastShot = 0;
let gameOver = false;
const clock = new THREE.Clock();
const scoreEl = document.querySelector("#score");
const shieldEl = document.querySelector("#shield");
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
  const laser = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.045, 0.8, 8),
    new THREE.MeshBasicMaterial({ color: 0x8cffff })
  );
  laser.rotation.x = Math.PI / 2;
  laser.position.copy(player.position);
  laser.position.z -= 0.9;
  scene.add(laser);
  shots.push(laser);
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
  scene.add(enemy);
  enemies.push(enemy);
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
  stars.position.z += dt * 1.5;
  if (stars.position.z > 10) stars.position.z = 0;

  for (let i = shots.length - 1; i >= 0; i--) {
    const shot = shots[i];
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
    if (enemy.position.distanceTo(player.position) < 1) {
      scene.remove(enemy); enemies.splice(i, 1); shield -= 20;
    } else if (enemy.position.z > 10) {
      scene.remove(enemy); enemies.splice(i, 1); shield -= 10;
    }
  }
  scoreEl.textContent = String(score).padStart(6, "0");
  shieldEl.textContent = Math.max(0, shield);
  if (shield <= 0) endGame();
}

function animate() {
  requestAnimationFrame(animate);
  update(clock.getDelta());
  renderer.render(scene, camera);
}
addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
animate();
