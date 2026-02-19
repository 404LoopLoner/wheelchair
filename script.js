// =============================
// PROFESSIONAL EEG SIMULATION
// =============================

// SCENE
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

// CAMERA (Smooth Follow)
const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);
camera.position.set(0, 15, 20);

// RENDERER
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.shadowMap.enabled = true;
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// LIGHTING
scene.add(new THREE.AmbientLight(0xffffff, 0.5));
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(10, 20, 10);
dirLight.castShadow = true;
scene.add(dirLight);

// FLOOR WITH GRID
const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 30),
    new THREE.MeshStandardMaterial({ color: 0x555555 })
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

const grid = new THREE.GridHelper(30, 30);
scene.add(grid);

// =============================
// WHEELCHAIR MODEL (Enhanced)
// =============================

const wheelchair = new THREE.Group();

// Seat
const seat = new THREE.Mesh(
    new THREE.BoxGeometry(4, 0.5, 3),
    new THREE.MeshStandardMaterial({ color: 0x0066ff })
);
seat.position.y = 1.2;
seat.castShadow = true;
wheelchair.add(seat);

// Backrest
const back = new THREE.Mesh(
    new THREE.BoxGeometry(4, 3, 0.4),
    new THREE.MeshStandardMaterial({ color: 0x003366 })
);
back.position.set(0, 2.5, -1.3);
wheelchair.add(back);

// Wheels
const wheelGeo = new THREE.CylinderGeometry(1.2, 1.2, 0.6, 32);
const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111 });

const leftWheel = new THREE.Mesh(wheelGeo, wheelMat);
leftWheel.rotation.z = Math.PI / 2;
leftWheel.position.set(-2.4, 1.2, 0);
wheelchair.add(leftWheel);

const rightWheel = leftWheel.clone();
rightWheel.position.x = 2.4;
wheelchair.add(rightWheel);

// Person
const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.8, 0.8, 2.2, 16),
    new THREE.MeshStandardMaterial({ color: 0x333333 })
);
body.position.y = 2.8;
wheelchair.add(body);

const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.7, 16, 16),
    new THREE.MeshStandardMaterial({ color: 0xffcc99 })
);
head.position.y = 4.4;
wheelchair.add(head);

scene.add(wheelchair);

// =============================
// PROFESSIONAL EEG PANEL
// =============================

const panel = document.createElement("div");
panel.style.position = "absolute";
panel.style.top = "10px";
panel.style.right = "10px";
panel.style.width = "320px";
panel.style.background = "rgba(0,0,0,0.8)";
panel.style.color = "white";
panel.style.padding = "15px";
panel.style.fontFamily = "monospace";
panel.innerHTML = `
<h3>🧠 EEG Monitor</h3>
<div id="shape">Thought: -</div>
<div id="power">EEG Power: -</div>
<canvas id="wave" width="300" height="100"></canvas>
<canvas id="spectrum" width="300" height="80"></canvas>
`;
document.body.appendChild(panel);

const waveCanvas = document.getElementById("wave");
const waveCtx = waveCanvas.getContext("2d");

const specCanvas = document.getElementById("spectrum");
const specCtx = specCanvas.getContext("2d");

const shapeText = document.getElementById("shape");
const powerText = document.getElementById("power");

// =============================
// DATA + PHYSICS
// =============================

let data = [];
let index = 0;

let x = 0, z = 0, theta = 0;
let velocity = 0, turnVelocity = 0;

const maxArea = 10;
const baseSpeed = 0.008;

fetch("combined_10_samples_per_label.json")
    .then(res => res.json())
    .then(json => {
        data = json;
        animate();
    });

let wavePhase = 0;

function animate() {
    requestAnimationFrame(animate);
    if (!data.length) return;

    const row = data[index];
    const power = Math.abs(row.EEG_Ch2);

    let targetSpeed = 0;
    let targetTurn = 0;

    if (row.task_label === "feet") {
        targetSpeed = baseSpeed * power;
        shapeText.innerHTML = "Thought: 🔺 Pyramid (Forward)";
    }
    if (row.task_label === "tongue") {
        targetSpeed = -baseSpeed * power;
        shapeText.innerHTML = "Thought: 🔻 Cone (Backward)";
    }
    if (row.task_label === "left_hand") {
        targetTurn = 0.01 * power;
        shapeText.innerHTML = "Thought: 🟦 Cube (Left)";
    }
    if (row.task_label === "right_hand") {
        targetTurn = -0.01 * power;
        shapeText.innerHTML = "Thought: ⚪ Sphere (Right)";
    }

    powerText.innerHTML = "EEG Power: " + power.toFixed(2);

    velocity += (targetSpeed - velocity) * 0.05;
    turnVelocity += (targetTurn - turnVelocity) * 0.05;

    theta += turnVelocity;
    x += velocity * Math.cos(theta);
    z += velocity * Math.sin(theta);

    x = Math.max(-maxArea, Math.min(maxArea, x));
    z = Math.max(-maxArea, Math.min(maxArea, z));

    wheelchair.position.set(x, 0, z);
    wheelchair.rotation.y = -theta;

    leftWheel.rotation.x -= velocity * 25;
    rightWheel.rotation.x -= velocity * 25;

    // Smooth Camera Follow
    camera.position.lerp(
        new THREE.Vector3(x + 10, 15, z + 15),
        0.05
    );
    camera.lookAt(x, 0, z);

    // =========================
    // EEG TIME DOMAIN WAVE
    // =========================

    waveCtx.fillStyle = "black";
    waveCtx.fillRect(0, 0, 300, 100);

    waveCtx.strokeStyle = "lime";
    waveCtx.beginPath();

    for (let i = 0; i < 300; i++) {
        const y =
            50 +
            Math.sin(i * 0.05 + wavePhase) *
            power *
            5;

        if (i === 0) waveCtx.moveTo(i, y);
        else waveCtx.lineTo(i, y);
    }

    waveCtx.stroke();
    wavePhase += 0.15;

    // =========================
    // SIMPLE SPECTRUM BARS
    // =========================

    specCtx.fillStyle = "black";
    specCtx.fillRect(0, 0, 300, 80);

    for (let i = 0; i < 20; i++) {
        const barHeight =
            Math.abs(Math.sin(wavePhase + i)) *
            power *
            4;

        specCtx.fillStyle = "cyan";
        specCtx.fillRect(i * 15, 80 - barHeight, 10, barHeight);
    }

    index++;
    if (index >= data.length) index = 0;

    renderer.render(scene, camera);
}
