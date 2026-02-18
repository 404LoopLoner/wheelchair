// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x202020);

// Camera
const camera = new THREE.PerspectiveCamera(
    75,
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

// Light
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(10, 20, 10);
scene.add(light);

// Floor
const floorGeometry = new THREE.PlaneGeometry(40, 40);
const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x555555 });
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

//////////////////////////////////////////////////
// WHEELCHAIR MODEL
//////////////////////////////////////////////////

const wheelchair = new THREE.Group();

// Body
const body = new THREE.Mesh(
    new THREE.BoxGeometry(2, 0.5, 1.2),
    new THREE.MeshStandardMaterial({ color: 0x1565c0 })
);
body.position.y = 0.75;
wheelchair.add(body);

// Back support
const back = new THREE.Mesh(
    new THREE.BoxGeometry(2, 1.2, 0.2),
    new THREE.MeshStandardMaterial({ color: 0x1e88e5 })
);
back.position.set(0, 1.4, -0.5);
wheelchair.add(back);

// Wheels
function createWheel(x, z) {
    const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.5, 0.5, 0.3, 32),
        new THREE.MeshStandardMaterial({ color: 0x111111 })
    );
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, 0.5, z);
    return wheel;
}

wheelchair.add(createWheel(1.1, 0));
wheelchair.add(createWheel(-1.1, 0));

// Person (simple mannequin)
const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 32, 32),
    new THREE.MeshStandardMaterial({ color: 0xffcc99 })
);
head.position.set(0, 2.2, 0);
wheelchair.add(head);

const torso = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 1, 0.5),
    new THREE.MeshStandardMaterial({ color: 0x444444 })
);
torso.position.set(0, 1.5, 0);
wheelchair.add(torso);

// Direction Arrow
const arrow = new THREE.ArrowHelper(
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(0, 1.2, 0),
    2,
    0xff0000
);
wheelchair.add(arrow);

scene.add(wheelchair);

//////////////////////////////////////////////////
// MOVEMENT VARIABLES
//////////////////////////////////////////////////

let x = 0;
let z = 0;
let theta = 0;

const step = 0.15;     
const turn = 0.15;

//////////////////////////////////////////////////
// LOAD JSON DATA
//////////////////////////////////////////////////

let data = [];
let index = 0;
let lastTime = 0;

fetch("combined_10_samples_per_label.json")
    .then(response => response.json())
    .then(json => {
        data = json;
        animate(0);
    });

//////////////////////////////////////////////////
// ANIMATION LOOP
//////////////////////////////////////////////////

function animate(time) {

    requestAnimationFrame(animate);

    if (data.length > 0) {

        // Move only every 150ms (slower)
        if (time - lastTime > 150) {

            const current = data[index];
            const label = current.task_label;

            // LEFT → rotate left
            if (label === "left_hand") {
                theta += turn;
            }

            // RIGHT → rotate right
            if (label === "right_hand") {
                theta -= turn;
            }

            // FEET → forward
            if (label === "feet") {
                x += step * Math.cos(theta);
                z += step * Math.sin(theta);
            }

            // TONGUE → backward
            if (label === "tongue") {
                x -= step * Math.cos(theta);
                z -= step * Math.sin(theta);
            }

            // Apply movement
            wheelchair.position.set(x, 0, z);
            wheelchair.rotation.y = -theta;

            index++;
            if (index >= data.length) index = 0;

            lastTime = time;
        }
    }

    renderer.render(scene, camera);
}
