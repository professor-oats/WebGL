import * as THREE from 'three';

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

// light
const light = new THREE.PointLight(0xffffff, 200, 100);
light.position.set(0, 10, 11);
scene.add(light);

// Camera
const camera = new THREE.PerspectiveCamera(
  45,
  800/600,
)
camera.position.z = 20;
scene.add(camera);

// Renderer
const canvas = document.getElementById('canvas');
const renderer = new THREE.WebGLRenderer({ canvas });
renderer.setSize(800, 600);
//renderer.physicallyCorrectLights = true; // For accurate lighting calculations
renderer.render(scene, camera);

