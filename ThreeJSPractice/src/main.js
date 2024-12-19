import * as THREE from 'three';
import "./style.css"

// Scene
const scene = new THREE.Scene();

// Create our sphere
const geometry = new THREE.SphereGeometry(3, 64, 64);
const material = new THREE.MeshStandardMaterial({
  color: '#00ff83',
  roughness: '0.4',
})

const mesh = new THREE.Mesh(geometry, material)
scene.add(mesh);

// Sizes
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight
}

// Light
const light = new THREE.PointLight(0xffffff, 200, 100);
light.position.set(0, 10, 11);
scene.add(light);

// Camera
const camera = new THREE.PerspectiveCamera(
  45,
  sizes.width/sizes.height,
  0.1,
  100,
)
camera.position.z = 20;
scene.add(camera);

// Renderer
const canvas = document.getElementById('canvas');
const renderer = new THREE.WebGLRenderer({ canvas });
renderer.setSize(sizes.width, sizes.height);
//renderer.physicallyCorrectLights = true; // For accurate lighting calculations
//renderer.render(scene, camera);

// Animation Loop
function animate() {
  requestAnimationFrame(animate); // Schedule the next frame
  renderer.render(scene, camera); // Render the scene
}

animate()


// Resize - So we can resize the scene to render when we resize the window
window.addEventListener('resize', () => {
  // Update Sizes
  console.log(window.innerWidth)
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;
  // Update Camera
  camera.aspect = sizes.width/sizes.height;
  camera.updateProjectionMatrix();
  renderer.setSize(sizes.width, sizes.height);
})

