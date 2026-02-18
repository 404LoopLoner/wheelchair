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
camera.position.set(0, 10, 15);
camera.lookAt(0, 0, 0);

// Renderer
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Floor
const floorGeometry = new THREE.PlaneGeometry(20, 20);
const floorMaterial = new THREE.MeshBasicMaterial({
    color: 0x555555,
    side: THREE.DoubleSide
});
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = Math.PI / 2;
scene.add(floor);

// Wheelchair
const geometry = new THREE.BoxGeometry(2, 1, 1);
const material = new THREE.MeshBasicMaterial({ color: 0x0000ff });
const wheelchair = new THREE.Mesh(geometry, material);
scene.add(wheelchair);

// Movement Variables
let theta = 0;
const step = 0.1;
const turn = 0.05;
const boundary = 8;

let commands = [];
let index = 0;

// 🔥 LOAD YOUR JSON FILE
fetch("combined_10_samples_per_label.json")
    .then(response => response.json())
    .then(data => {

        // Convert task_label → movement command
        commands = data.map(row => {
            if (row.task_label === "feet") return "forward";
            if (row.task_label === "tongue") return "back";
            if (row.task_label === "left_hand") return "left";
            if (row.task_label === "right_hand") return "right";
        });

        animate();
    });

function animate() {
    requestAnimationFrame(animate);

    if (index < commands.length) {

        let cmd = commands[index];

        if (cmd === "left") {
            theta += turn;
        }
        else if (cmd === "right") {
            theta -= turn;
        }
        else if (cmd === "forward") {
            wheelchair.position.x += step * Math.cos(theta);
            wheelchair.position.z += step * Math.sin(theta);
        }
        else if (cmd === "back") {
            wheelchair.position.x -= step * Math.cos(theta);
            wheelchair.position.z -= step * Math.sin(theta);
        }

        // Boundary
        wheelchair.position.x = Math.max(Math.min(wheelchair.position.x, boundary), -boundary);
        wheelchair.position.z = Math.max(Math.min(wheelchair.position.z, boundary), -boundary);

        wheelchair.rotation.y = -theta;

        index++;
    }

    renderer.render(scene, camera);
}
