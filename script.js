// ============================
// BASIC SETUP
// ============================

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x202020);

const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);
camera.position.set(0, 18, 22);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const light = new THREE.DirectionalLight(0xffffff, 0.8);
light.position.set(10, 20, 10);
scene.add(light);

// ============================
// SMALL LAB FLOOR
// ============================

const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(25, 25),
    new THREE.MeshStandardMaterial({ color: 0x666666 })
);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

// Boundary box
const boundary = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(20, 0.1, 20)),
    new THREE.LineBasicMaterial({ color: 0xffffff })
);
boundary.position.y = 0.05;
scene.add(boundary);

// ============================
// REALISTIC WHEELCHAIR
// ============================

const wheelchair = new THREE.Group();

// Seat
const seat = new THREE.Mesh(
    new THREE.BoxGeometry(4, 0.4, 3),
    new THREE.MeshStandardMaterial({ color: 0x0055cc })
);
seat.position.y = 1.2;
wheelchair.add(seat);

// Backrest
const back = new THREE.Mesh(
    new THREE.BoxGeometry(4, 3, 0.4),
    new THREE.MeshStandardMaterial({ color: 0x003366 })
);
back.position.set(0, 2.5, -1.2);
wheelchair.add(back);

// Arm rests
const armGeo = new THREE.BoxGeometry(0.3, 1.5, 2.8);
const armL = new THREE.Mesh(armGeo, new THREE.MeshStandardMaterial({ color: 0x222222 }));
armL.position.set(-2, 2, 0);
wheelchair.add(armL);

const armR = armL.clone();
armR.position.x = 2;
wheelchair.add(armR);

// Big wheels
const wheelGeo = new THREE.CylinderGeometry(1.2, 1.2, 0.5, 32);
const wheelMat = new THREE.MeshStandardMaterial({ color: 0x000000 });

const leftWheel = new THREE.Mesh(wheelGeo, wheelMat);
leftWheel.rotation.z = Math.PI / 2;
leftWheel.position.set(-2.4, 1.2, 0);
wheelchair.add(leftWheel);

const rightWheel = leftWheel.clone();
rightWheel.position.x = 2.4;
wheelchair.add(rightWheel);

// Small front casters
const casterGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 16);
const casterL = new THREE.Mesh(casterGeo, wheelMat);
casterL.rotation.z = Math.PI / 2;
casterL.position.set(-1.5, 0.5, 1.3);
wheelchair.add(casterL);

const casterR = casterL.clone();
casterR.position.x = 1.5;
wheelchair.add(casterR);

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

// ============================
// EEG BRAIN WAVE PANEL
// ============================

const eegCanvas = document.createElement("canvas");
eegCanvas.width = 300;
eegCanvas.height = 120;
eegCanvas.style.position = "absolute";
eegCanvas.style.top = "10px";
eegCanvas.style.right = "10px";
eegCanvas.style.background = "black";
document.body.appendChild(eegCanvas);

const eegCtx = eegCanvas.getContext("2d");

let wavePhase = 0;

// ============================
// DATA + MOVEMENT
// ============================

let data = [];
let index = 0;

let x = 0;
let z = 0;
let theta = 0;

let velocity = 0;
let turnVelocity = 0;

const maxArea = 9;
const baseSpeed = 0.01;

fetch("combined_10_samples_per_label.json")
    .then(res => res.json())
    .then(json => {
        data = json;
        animate();
    });

function animate() {
    requestAnimationFrame(animate);
    if (!data.length) return;

    const row = data[index];
    const power = Math.abs(row.EEG_Ch2);

    let targetSpeed = 0;
    let targetTurn = 0;

    if (row.task_label === "feet") targetSpeed = baseSpeed * power;
    if (row.task_label === "tongue") targetSpeed = -baseSpeed * power;
    if (row.task_label === "left_hand") targetTurn = 0.01 * power;
    if (row.task_label === "right_hand") targetTurn = -0.01 * power;

    // Smooth acceleration
    velocity += (targetSpeed - velocity) * 0.05;
    turnVelocity += (targetTurn - turnVelocity) * 0.05;

    theta += turnVelocity;
    x += velocity * Math.cos(theta);
    z += velocity * Math.sin(theta);

    // Boundary limit
    x = Math.max(-maxArea, Math.min(maxArea, x));
    z = Math.max(-maxArea, Math.min(maxArea, z));

    wheelchair.position.set(x, 0, z);
    wheelchair.rotation.y = -theta;

    // Wheel rotation realistic
    leftWheel.rotation.x -= velocity * 20;
    rightWheel.rotation.x -= velocity * 20;

    // ======================
    // EEG WAVE DRAW
    // ======================

    eegCtx.fillStyle = "black";
    eegCtx.fillRect(0, 0, eegCanvas.width, eegCanvas.height);

    eegCtx.strokeStyle = "lime";
    eegCtx.beginPath();

    for (let i = 0; i < eegCanvas.width; i++) {
        const y =
            eegCanvas.height / 2 +
            Math.sin(i * 0.05 + wavePhase) * power * 5;

        if (i === 0) eegCtx.moveTo(i, y);
        else eegCtx.lineTo(i, y);
    }

    eegCtx.stroke();

    wavePhase += 0.1;

    index++;
    if (index >= data.length) index = 0;

    renderer.render(scene, camera);
}
