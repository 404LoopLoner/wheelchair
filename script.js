// ============================
// SCENE SETUP
// ============================

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x202020);

const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);
camera.position.set(0, 15, 20);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(10, 20, 10);
scene.add(light);

scene.add(new THREE.AmbientLight(0xffffff, 0.4));

// ============================
// FLOOR
// ============================

const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 60),
    new THREE.MeshStandardMaterial({ color: 0x555555 })
);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

// ============================
// WHEELCHAIR MODEL
// ============================

const wheelchair = new THREE.Group();

const base = new THREE.Mesh(
    new THREE.BoxGeometry(4, 0.5, 3),
    new THREE.MeshStandardMaterial({ color: 0x0044aa })
);
base.position.y = 1;
wheelchair.add(base);

const backrest = new THREE.Mesh(
    new THREE.BoxGeometry(4, 3, 0.5),
    new THREE.MeshStandardMaterial({ color: 0x003366 })
);
backrest.position.set(0, 2.5, -1.2);
wheelchair.add(backrest);

// Wheels
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

// Direction arrow
const arrow = new THREE.ArrowHelper(
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(0, 1.2, 0),
    3,
    0xff0000
);
wheelchair.add(arrow);

scene.add(wheelchair);

// ============================
// SIDE PANEL UI
// ============================

const panel = document.createElement("div");
panel.style.position = "absolute";
panel.style.top = "10px";
panel.style.right = "10px";
panel.style.background = "rgba(0,0,0,0.7)";
panel.style.color = "white";
panel.style.padding = "15px";
panel.style.fontFamily = "monospace";
panel.style.width = "250px";
panel.innerHTML = `
<h3>EEG Monitor</h3>
<div id="shape">Shape: -</div>
<div id="freq">EEG Power: -</div>
`;
document.body.appendChild(panel);

const shapeText = document.getElementById("shape");
const freqText = document.getElementById("freq");

// ============================
// DATA + PHYSICS
// ============================

let data = [];
let index = 0;

let x = 0;
let z = 0;
let theta = 0;

const wheelDistance = 4.4;
const baseSpeed = 0.03;

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

    let VL = 0;
    let VR = 0;

    // EEG power intensity
    const power = Math.abs(row.EEG_Ch2);
    const speed = baseSpeed * power;

    // Movement mapping
    if (row.task_label === "feet") {
        VL = speed;
        VR = speed;
        shapeText.innerHTML = "Shape: Pyramid (Forward)";
    }

    else if (row.task_label === "tongue") {
        VL = -speed;
        VR = -speed;
        shapeText.innerHTML = "Shape: Cone (Backward)";
    }

    else if (row.task_label === "left_hand") {
        VL = speed * 0.3;
        VR = speed;
        shapeText.innerHTML = "Shape: Cube (Turn Left)";
    }

    else if (row.task_label === "right_hand") {
        VL = speed;
        VR = speed * 0.3;
        shapeText.innerHTML = "Shape: Sphere (Turn Right)";
    }

    freqText.innerHTML = "EEG Power: " + power.toFixed(2);

    // Differential drive equations
    const v = (VR + VL) / 2;
    const omega = (VR - VL) / wheelDistance;

    theta += omega;
    x += v * Math.cos(theta);
    z += v * Math.sin(theta);

    wheelchair.position.set(x, 0, z);
    wheelchair.rotation.y = -theta;

    // Wheel rotation
    leftWheel.rotation.x -= VL * 5;
    rightWheel.rotation.x -= VR * 5;

    // Update arrow direction
    arrow.setDirection(new THREE.Vector3(
        Math.cos(theta),
        0,
        Math.sin(theta)
    ));

    index++;
    if (index >= data.length) index = 0;

    renderer.render(scene, camera);
}
