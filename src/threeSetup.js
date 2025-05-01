import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GRID_SIZE_CM, GRID_STEP_CM } from './constants.js';
import { viewportContainer } from './domElements.js';
import { objectsToRaycast } from './stateVariables.js';

export let scene, camera, renderer, controls, raycaster, pointer, axesHelper, gridHelper, groundPlane, ghostElement;

export function init() {
    // Scene setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // Sky Blue

    // Camera setup
    const aspect = viewportContainer.clientWidth / viewportContainer.clientHeight;
    camera = new THREE.PerspectiveCamera(60, aspect, 1, 5000); // FOV, aspect, near, far
    camera.position.set(40, 45, 40); // Closer position
    camera.lookAt(0, 15, 0); // Adjust lookAt slightly if needed

    // Renderer setup
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(viewportContainer.clientWidth, viewportContainer.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio); // Adjust for high-DPI screens
    renderer.shadowMap.enabled = true; // Enable shadows
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Softer shadows
    viewportContainer.appendChild(renderer.domElement); // Add canvas to the container

    // OrbitControls setup
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; // Smooth camera movement
    controls.dampingFactor = 0.1;
    controls.screenSpacePanning = false; // Pan in the plane orthogonal to camera view
    controls.minDistance = 5; // Adjusted minDistance slightly
    controls.maxDistance = 2000; // Prevent zooming too far
    controls.maxPolarAngle = Math.PI / 2 - 0.01; // Prevent camera going below ground
    controls.target.set(0, 15, 0); // Match adjusted lookAt
    controls.listenToKeyEvents(window); // Allow keyboard controls for orbit (arrows)
    controls.enabled = true; // Start with controls enabled (select tool)
    controls.update();

    // Lighting setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7); // Soft white light
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8); // Sun-like light
    directionalLight.position.set(200, 350, 250); // Position the light source
    directionalLight.castShadow = true; // Enable shadow casting
    // Configure shadow properties for better quality/performance
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 50;
    directionalLight.shadow.camera.far = 1000;
    const shadowCamSize = GRID_SIZE_CM / 1.5; // Adjust shadow camera frustum size
    directionalLight.shadow.camera.left = -shadowCamSize;
    directionalLight.shadow.camera.right = shadowCamSize;
    directionalLight.shadow.camera.top = shadowCamSize;
    directionalLight.shadow.camera.bottom = -shadowCamSize;
    directionalLight.shadow.camera.updateProjectionMatrix();
    scene.add(directionalLight);

    // Ground Plane setup
    const planeGeometry = new THREE.PlaneGeometry(GRID_SIZE_CM * 2, GRID_SIZE_CM * 2);
    const planeMaterial = new THREE.MeshStandardMaterial({ color: 0xF0FFF0, side: THREE.DoubleSide }); // Honeydew
    groundPlane = new THREE.Mesh(planeGeometry, planeMaterial);
    groundPlane.rotation.x = -Math.PI / 2; // Rotate to be horizontal
    groundPlane.position.y = -0.1; // Slightly below grid to avoid z-fighting
    groundPlane.receiveShadow = true; // Allow ground to receive shadows
    groundPlane.userData.isGround = true; // Custom data to identify the ground
    scene.add(groundPlane);
    objectsToRaycast.push(groundPlane); // Add ground to raycasting targets

    // Grid Helper setup
    gridHelper = new THREE.GridHelper(GRID_SIZE_CM, GRID_SIZE_CM / GRID_STEP_CM, 0x666666, 0xaaaaaa);
    gridHelper.position.y = 0; // Place grid at y=0
    gridHelper.visible = false; // Hide the grid
    scene.add(gridHelper);

    // Axes Helper setup (for orientation reference)
    axesHelper = new THREE.AxesHelper(50); // Length of axes lines
    axesHelper.position.set(0, 0.1, 0); // Slightly above grid
    axesHelper.material.linewidth = 2; // Make axes thicker
    scene.add(axesHelper);

    // Raycaster and Pointer setup (for mouse interaction)
    raycaster = new THREE.Raycaster();
    pointer = new THREE.Vector2(); // Stores normalized mouse coordinates (-1 to +1)

    // Ghost Element setup (for placement preview)
    const ghostMaterial = new THREE.MeshStandardMaterial({
        color: 0x00ff00, // Green color for preview
        opacity: 0.6,
        transparent: true,
        depthWrite: false // Prevents ghost from obscuring elements behind it
    });
    ghostElement = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), ghostMaterial); // Start with a dummy geometry
    ghostElement.visible = false; // Initially hidden
    ghostElement.castShadow = false; // Ghost doesn't cast shadows
    scene.add(ghostElement);
}
