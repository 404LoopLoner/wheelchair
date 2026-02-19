// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x202020);

// Camera
const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);
camera.position.set(0, 12, 18);
camera.lookAt(0, 0, 0);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Lighting
const ambient = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambient);

const light = new THREE.DirectionalLight(0xffffff, 0.6);
light.position.set(10, 20, 10);
scene.add(light);

// Floor
const floorGeo = new THREE.PlaneGeometry(50, 50);
const floorMat = new THREE.MeshStandardMaterial({ color: 0x555555 });
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

// ===============================
// WHEELCHAIR MODEL
// ===============================

const wheelchair = new THREE.Group();

// Base
const base = new THREE.Mesh(
    new THREE.BoxGeometry(4, 0.5, 3),
    new THREE.MeshStandardMaterial({ color: 0x0044aa })
);
base.position.y = 1;
wheelchair.add(base);

// Backrest
const backrest = new THREE.Mesh(
    new THREE.BoxGeometry(4, 3, 0.5),
    new THREE.MeshStandardMaterial({ color: 0x003366 })
);
backrest.position.set(0, 2.5, -1.25);
wheelchair.add(backrest);

// Big Wheels
const wheelGeo = new THREE.CylinderGeometry(1, 1, 0.5, 32);
const wheelMat = new THREE.MeshStandardMaterial({ color: 0x000000 });

const leftWheel = new THREE.Mesh(wheelGeo, wheelMat);
leftWheel.rotation.z = Math.PI / 2;
leftWheel.position.set(-2.2, 1, 0);
wheelchair.add(leftWheel);

const rightWheel = new THREE.Mesh(wheelGeo, wheelMat);
rightWheel.rotation.z = Math.PI / 2;
rightWheel.position.set(2.2, 1, 0);
wheelchair.add(rightWheel);

// Person
const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.7, 0.7, 2, 16),
    new THREE.MeshStandardMaterial({ color: 0x333333 })
);
body.position.y = 2.5;
wheelchair.add(body);

const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.6, 16, 16),
    new THREE.MeshStandardMaterial({ color: 0xffcc99 })
);
head.position.y = 4;
wheelchair.add(head);

// Direction Arrow
const arrow = new THREE.ArrowHelper(
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(0, 1.2, 0),
    3,
    0xff0000
);
wheelchair.add(arrow);

scene.add(wheelchair);

// ===============================
// DATASET LOGIC
// ===============================

let data = [];
let epochIndex = 0;
let x = 0;
let z = 0;
let theta = 0;

const baseStep = 0.05;
const baseTurn = 0.02;

fetch("combined_10_samples_per_label.json")
    .then(res => res.json())
    .then(json => {
        data = json;
        animate();
    });

// Group by epoch
function getEpochCommands() {
    if (epochIndex >= data.length) return null;

    const currentEpoch = data[epochIndex].epoch_id;
    let group = [];

    while (
        epochIndex < data.length &&
        data[epochIndex].epoch_id === currentEpoch
    ) {
        group.push(data[epochIndex]);
        epochIndex++;
    }

    return group;
}

// ===============================
// ANIMATION LOOP
// ===============================

let currentGroup = null;
let groupCounter = 0;

function animate() {
    requestAnimationFrame(animate);

    if (!currentGroup || groupCounter > 60) {
        currentGroup = getEpochCommands();
        groupCounter = 0;
        if (!currentGroup) return;
    }

    const label = currentGroup[0].task_label;

    // Calculate average EEG power
    let avgPower = 0;
    currentGroup.forEach(row => {
        avgPower += Math.abs(row.EEG_Ch2);
    });
    avgPower /= currentGroup.length;

    const step = baseStep * avgPower;
    const turn = baseTurn * avgPower;

    if (label === "left_hand") {
        theta += turn;
    } else if (label === "right_hand") {
        theta -= turn;
    } else if (label === "feet") {
        x += step * Math.cos(theta);
        z += step * Math.sin(theta);

        leftWheel.rotation.x -= step * 5;
        rightWheel.rotation.x -= step * 5;
    } else if (label === "tongue") {
        x -= step * Math.cos(theta);
        z -= step * Math.sin(theta);

        leftWheel.rotation.x += step * 5;
        rightWheel.rotation.x += step * 5;
    }

    // Apply position
    wheelchair.position.set(x, 0, z);
    wheelchair.rotation.y = -theta;

    // Update arrow direction
    arrow.setDirection(new THREE.Vector3(
        Math.cos(theta),
        0,
        Math.sin(theta)
    ));

    groupCounter++;

    renderer.render(scene, camera);
}
