// Constants for scene scaling and snapping
const SCALE_FACTOR = 10; // 1 Three.js unit = 10 cm. So divide cm by 10.
const SNAP_INCREMENT = 1 / SCALE_FACTOR; // Snap to 1cm in Three.js units

// Definitions for available building elements
// w: width (x-axis), h: height (y-axis), d: depth (z-axis) in cm
const elementDefinitions = [
    { name: "Brique M50 (19x5x9)", w: 19, h: 9, d: 5, type: "Brique" },
    { name: "Brique M57 (19x5.7x9)", w: 19, h: 9, d: 5.7, type: "Brique" },
    { name: "Brique M65 (19x6.5x9)", w: 19, h: 9, d: 6.5, type: "Brique" },
    { name: "Brique M90 (19x9x9)", w: 19, h: 9, d: 9, type: "Brique" },
    { name: "Brique WF (21x5x10)", w: 21, h: 10, d: 5, type: "Brique" },
    { name: "Brique WFD (21x6.5x10)", w: 21, h: 10, d: 6.5, type: "Brique" },
    { name: "Bloc B9 (39x19x9)", w: 39, h: 9, d: 19, type: "Bloc" }, // Assuming 19 is depth, 9 is height for Y-up
    { name: "Bloc B14 (39x19x14)", w: 39, h: 14, d: 19, type: "Bloc" },
    { name: "Bloc B19 (39x19x19)", w: 39, h: 19, d: 19, type: "Bloc" },
    { name: "Bloc B29 (39x19x29)", w: 39, h: 29, d: 19, type: "Bloc" },
    { name: "Linteau L120_14 (120x19x14)", w: 120, h: 14, d: 19, type: "Linteau" },
    { name: "Linteau L140_14 (140x19x14)", w: 140, h: 14, d: 19, type: "Linteau" },
    { name: "Linteau L160_14 (160x19x14)", w: 160, h: 14, d: 19, type: "Linteau" },
    { name: "Linteau L180_14 (180x19x14)", w: 180, h: 14, d: 19, type: "Linteau" },
    { name: "Linteau L200_14 (200x19x14)", w: 200, h: 14, d: 19, type: "Linteau" },
    { name: "Isolant PUR5 (120x60x5)", w: 120, h: 5, d: 60, type: "Isolant" }, // Assuming 5 is thickness (height)
    { name: "Isolant PUR6 (120x60x6)", w: 120, h: 6, d: 60, type: "Isolant" },
    { name: "Isolant PUR7 (120x60x7)", w: 120, h: 7, d: 60, type: "Isolant" },
    { name: "Vide (40x19x1-5)", w: 40, h: 3, d: 19, type: "Autre" }, // h is average (1+5)/2 = 3
    { name: "Profil (250x6.5x6.5)", w: 250, h: 6.5, d: 6.5, type: "Autre" },
];

// Three.js core variables
let scene, camera, renderer, orbitControls, transformControls;
let plane, gridHelper, phantomElement; // Scene objects
let placedElements = []; // Array to store placed 3D elements
let selectedElement = null; // Currently selected element

// Raycasting for mouse interaction
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2(); // Normalized mouse coordinates

// Application state variables
let currentTool = 'select'; // Current active tool (select, add, move, rotate)
let currentAssiseY = 0; // Current vertical placement level (in Three.js units)
let useWhiteElements = false; // Flag for element styling (white or colored)
let isAdjustingPhantom = false; // Flag: true if user is adjusting phantom with DPad after initial click

// Material colors
const defaultMaterialColor = 0x95a5a6; // Light grey
const selectedMaterialColor = 0x1abc9c; // Mint green (accent color)
const phantomMaterialColor = 0x2ecc71; // Emerald green for phantom

// DOM Elements (cached for performance)
const customAlertBox = document.getElementById('custom-alert-box');

/**
 * Initializes the Three.js scene, camera, renderer, and essential objects.
 */
function initThree() {
    const canvas = document.getElementById('three-canvas');
    const container = canvas.parentElement; // Viewport container

    // Scene setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x3d566e); // Match CSS background

    // Camera setup
    camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 3000 / SCALE_FACTOR);
    camera.position.set(80 / SCALE_FACTOR, 100 / SCALE_FACTOR, 200 / SCALE_FACTOR); // Initial camera position
    camera.lookAt(0, 0, 0); // Look at the center of the scene

    // Renderer setup
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true; // Enable shadows
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Softer shadows

    // Lighting setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7); // Soft ambient light
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8); // Main directional light
    directionalLight.position.set(100 / SCALE_FACTOR, 150 / SCALE_FACTOR, 100 / SCALE_FACTOR);
    directionalLight.castShadow = true;
    // Configure shadow properties for better quality
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 50 / SCALE_FACTOR;
    directionalLight.shadow.camera.far = 500 / SCALE_FACTOR;
    directionalLight.shadow.camera.left = -150 / SCALE_FACTOR;
    directionalLight.shadow.camera.right = 150 / SCALE_FACTOR;
    directionalLight.shadow.camera.top = 150 / SCALE_FACTOR;
    directionalLight.shadow.camera.bottom = -150 / SCALE_FACTOR;
    scene.add(directionalLight);

    // Ground plane
    const planeGeometry = new THREE.PlaneGeometry(2000 / SCALE_FACTOR, 2000 / SCALE_FACTOR);
    const planeMaterial = new THREE.MeshStandardMaterial({ color: 0x34495e, side: THREE.DoubleSide, roughness: 0.8, metalness: 0.2 });
    plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.rotation.x = -Math.PI / 2; // Rotate to be horizontal
    plane.receiveShadow = true; // Plane can receive shadows
    scene.add(plane);

    // Grid helper
    gridHelper = new THREE.GridHelper(2000 / SCALE_FACTOR, 200, 0x527089, 0x4a6278); // Size, divisions, colors
    scene.add(gridHelper);

    // OrbitControls for camera manipulation
    orbitControls = new THREE.OrbitControls(camera, renderer.domElement);
    orbitControls.enableDamping = true; // Smooth camera movement
    orbitControls.dampingFactor = 0.1;
    orbitControls.screenSpacePanning = false; // Better control for architectural views
    orbitControls.minDistance = 10 / SCALE_FACTOR;
    orbitControls.maxDistance = 1500 / SCALE_FACTOR;

    // TransformControls for moving/rotating selected objects
    transformControls = new THREE.TransformControls(camera, renderer.domElement);
    transformControls.addEventListener('dragging-changed', function (event) {
        orbitControls.enabled = !event.value; // Disable orbit controls while transforming
        if (!event.value && selectedElement) { // Snap after dragging ends
            snapObjectToGrid(selectedElement);
        }
    });
    scene.add(transformControls);

    // Populate the element type dropdown
    const selectElement = document.getElementById('element-type-select');
    elementDefinitions.forEach((el, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = el.name;
        selectElement.appendChild(option);
    });

    // Add global event listeners
    window.addEventListener('resize', onWindowResize);
    renderer.domElement.addEventListener('mousemove', onMouseMove, false);
    renderer.domElement.addEventListener('mousedown', onMouseDown, false);
    document.addEventListener('keydown', onKeyDown, false);

    // Setup UI-specific event listeners
    setupUIListeners();
    updateElementCounter(); // Initialize element counter table
    setCurrentTool('select'); // Start with the select tool active
    animate(); // Start the rendering loop
}

/**
 * Displays a custom alert message at the top of the screen.
 * @param {string} message - The message to display.
 * @param {string} type - Type of alert ('info', 'success', 'error').
 * @param {number} duration - How long the alert stays visible (in ms).
 */
function showCustomAlert(message, type = 'info', duration = 3000) {
    customAlertBox.textContent = message;
    customAlertBox.className = 'custom-alert'; // Reset classes
    customAlertBox.classList.add(type); // Add specific type class
    customAlertBox.style.display = 'block';
    setTimeout(() => {
        customAlertBox.style.display = 'none';
    }, duration);
}

/**
 * Sets up event listeners for UI elements (buttons, menus, etc.).
 */
function setupUIListeners() {
    // File menu actions
    document.getElementById('file-new').addEventListener('click', clearScene);
    document.getElementById('file-export-pdf').addEventListener('click', exportToPDF);
    // (Open and Save are not implemented)

    // Style menu actions
    document.getElementById('style-elements-white').addEventListener('click', () => setElementStyle(true));
    document.getElementById('style-elements-color').addEventListener('click', () => setElementStyle(false));
    // (Toggle shadows not implemented)

    // Help menu actions
    document.getElementById('help-about').addEventListener('click', () => showCustomAlert('Simulateur de Construction 3D\nVersion 0.3\nCréé avec Three.js & ♥', 'info', 5000));
    // (Help docs not implemented)

    // Toolbar tool selection buttons
    const toolButtons = {
        'btn-select': 'select',
        'btn-add': 'add',
        'btn-move': 'move',
        'btn-rotate': 'rotate'
    };
    for (const btnId in toolButtons) {
        document.getElementById(btnId).addEventListener('click', () => setCurrentTool(toolButtons[btnId]));
    }

    // Other toolbar actions
    document.getElementById('btn-duplicate').addEventListener('click', duplicateSelected);
    document.getElementById('btn-delete').addEventListener('click', deleteSelected);
    document.getElementById('btn-add-custom').addEventListener('click', addCustomElement);

    // Assise (layer) management
    const assiseLevelInput = document.getElementById('assise-level');
    assiseLevelInput.addEventListener('change', (e) => {
        currentAssiseY = parseFloat(e.target.value) / SCALE_FACTOR;
        // If phantom exists and not being adjusted by DPad, update its Y position
        if (phantomElement && !isAdjustingPhantom) {
            const defH = phantomElement.userData.definition.h / SCALE_FACTOR;
            phantomElement.position.y = currentAssiseY + defH / 2;
        }
    });
    document.getElementById('btn-go-to-assise').addEventListener('click', () => {
        currentAssiseY = parseFloat(assiseLevelInput.value) / SCALE_FACTOR;
        if (phantomElement && !isAdjustingPhantom) {
            const defH = phantomElement.userData.definition.h / SCALE_FACTOR;
            phantomElement.position.y = currentAssiseY + defH / 2;
        }
        showCustomAlert(`Niveau d'assise réglé à ${assiseLevelInput.value} cm.`, 'info');
    });

    // DPad controls for element adjustment
    document.getElementById('dpad-el-up').addEventListener('click', () => dPadAdjust(0, SNAP_INCREMENT, 0));
    document.getElementById('dpad-el-down').addEventListener('click', () => dPadAdjust(0, -SNAP_INCREMENT, 0));
    document.getElementById('dpad-el-left').addEventListener('click', () => dPadAdjust(-SNAP_INCREMENT, 0, 0));
    document.getElementById('dpad-el-right').addEventListener('click', () => dPadAdjust(SNAP_INCREMENT, 0, 0));
    document.getElementById('dpad-el-forward').addEventListener('click', () => dPadAdjust(0, 0, -SNAP_INCREMENT)); // Z-axis forward
    document.getElementById('dpad-el-backward').addEventListener('click', () => dPadAdjust(0, 0, SNAP_INCREMENT)); // Z-axis backward
    document.getElementById('dpad-rot-left').addEventListener('click', () => dPadAdjustRotation(Math.PI / 2)); // Rotate 90 deg left
    document.getElementById('dpad-rot-right').addEventListener('click', () => dPadAdjustRotation(-Math.PI / 2)); // Rotate 90 deg right
    document.getElementById('dpad-ok').addEventListener('click', confirmPhantomPlacement); // Confirm placement

    // Sidebar toggle buttons
    document.getElementById('toggle-left-sidebar').addEventListener('click', () => {
        document.getElementById('left-sidebar').classList.toggle('collapsed');
        document.getElementById('toggle-left-sidebar').innerHTML = document.getElementById('left-sidebar').classList.contains('collapsed') ? '&gt;' : '&lt;';
        onWindowResize(); // Adjust canvas size
    });
    document.getElementById('toggle-right-sidebar').addEventListener('click', () => {
        document.getElementById('right-sidebar').classList.toggle('collapsed');
        document.getElementById('toggle-right-sidebar').innerHTML = document.getElementById('right-sidebar').classList.contains('collapsed') ? '&lt;' : '&gt;';
        onWindowResize(); // Adjust canvas size
    });
}

/**
 * Snaps a given value to the nearest grid increment.
 * @param {number} value - The value to snap.
 * @returns {number} The snapped value.
 */
function snapToGrid(value) {
    return Math.round(value / SNAP_INCREMENT) * SNAP_INCREMENT;
}

/**
 * Snaps an object's position to the grid.
 * Adjusts Y position to align the base of the object.
 * @param {THREE.Object3D} object - The object to snap.
 */
function snapObjectToGrid(object) {
    if (!object) return;
    object.position.x = snapToGrid(object.position.x);

    let objectHeight;
    // Get object height differently for phantom vs. placed elements
    if (object === phantomElement) {
        objectHeight = object.userData.definition.h / SCALE_FACTOR;
    } else {
        objectHeight = object.geometry.parameters.height;
    }
    // Snap the base of the object to the grid for Y, then add half height
    object.position.y = snapToGrid(object.position.y - objectHeight / 2) + objectHeight / 2;
    object.position.z = snapToGrid(object.position.z);
}

/**
 * Sets the visual style of all placed elements (white or colored).
 * @param {boolean} isWhite - True for white elements, false for colored.
 */
function setElementStyle(isWhite) {
    useWhiteElements = isWhite;
    placedElements.forEach(el => {
        const color = useWhiteElements ? 0xffffff : (el.userData.originalColor || defaultMaterialColor);
        el.material.color.setHex(color);
    });
    if (selectedElement) { // Keep selected element highlighted
        selectedElement.material.color.setHex(selectedMaterialColor);
    }
    showCustomAlert(`Style des éléments changé en : ${isWhite ? 'Blanc' : 'Couleur'}.`, 'info');
}

/**
 * Sets the current active tool and updates UI accordingly.
 * @param {string} tool - The name of the tool to activate.
 */
function setCurrentTool(tool) {
    // If exiting 'add' tool while adjusting phantom, cancel the adjustment
    if (currentTool === 'add' && isAdjustingPhantom && tool !== 'add') {
        cancelPhantomAdjustment();
    }

    currentTool = tool;
    // Update active button style in the toolbar
    document.querySelectorAll('.toolbar button').forEach(b => b.classList.remove('active'));
    const activeButton = Array.from(document.querySelectorAll('.toolbar button')).find(b => b.id === `btn-${tool}`);
    if (activeButton) activeButton.classList.add('active');

    transformControls.detach(); // Detach transform controls when changing tools

    // Remove phantom element if not in 'add' tool
    if (tool !== 'add' && phantomElement) {
        scene.remove(phantomElement);
        if (phantomElement.geometry) phantomElement.geometry.dispose();
        if (phantomElement.material) phantomElement.material.dispose();
        phantomElement = null;
    }

    if (currentTool === 'add') {
        if (!isAdjustingPhantom) { // Only create a new phantom if not already in adjustment mode
            createPhantomElement();
        }
    } else if (selectedElement) { // If an element is selected, attach transform controls for move/rotate
        if (currentTool === 'move') {
            transformControls.setMode("translate");
            transformControls.attach(selectedElement);
        } else if (currentTool === 'rotate') {
            transformControls.setMode("rotate");
            transformControls.attach(selectedElement);
        }
    }
}

/**
 * Creates a new phantom (preview) element based on the selected type.
 */
function createPhantomElement() {
    // Clean up existing phantom if any
    if (phantomElement) {
        scene.remove(phantomElement);
        if (phantomElement.geometry) phantomElement.geometry.dispose();
        if (phantomElement.material) phantomElement.material.dispose();
    }

    const selectedIndex = document.getElementById('element-type-select').value;
    const definition = elementDefinitions[selectedIndex];
    if (!definition) { // No element type selected
        return;
    }

    const geometry = new THREE.BoxGeometry(definition.w / SCALE_FACTOR, definition.h / SCALE_FACTOR, definition.d / SCALE_FACTOR);
    const material = new THREE.MeshStandardMaterial({
        color: phantomMaterialColor,
        transparent: true,
        opacity: 0.7, // Make it slightly more opaque for better visibility
        roughness: 0.7,
        metalness: 0.1
    });
    phantomElement = new THREE.Mesh(geometry, material);
    phantomElement.userData.definition = definition; // Store definition for later use

    // Set initial Y position based on current assise level
    const defH = definition.h / SCALE_FACTOR;
    phantomElement.position.y = currentAssiseY + defH / 2;
    scene.add(phantomElement);
    isAdjustingPhantom = false; // Reset adjustment state
}

/**
 * Adds a new element to the scene at the given position and with the given definition.
 * @param {THREE.Vector3} position - The position to place the element.
 * @param {object} definition - The definition of the element (from elementDefinitions).
 * @param {number} [rotationY=0] - Optional Y-axis rotation.
 * @returns {THREE.Mesh} The newly created element.
 */
function addElementToScene(position, definition, rotationY = 0) {
    const geometry = new THREE.BoxGeometry(definition.w / SCALE_FACTOR, definition.h / SCALE_FACTOR, definition.d / SCALE_FACTOR);
    const baseColor = useWhiteElements ? 0xffffff : getColorForElementType(definition.type);
    const material = new THREE.MeshStandardMaterial({
        color: baseColor,
        roughness: 0.6,
        metalness: 0.2
    });

    const newElement = new THREE.Mesh(geometry, material);
    newElement.position.copy(position);
    newElement.rotation.y = rotationY;

    newElement.castShadow = true; // Element casts shadows
    newElement.receiveShadow = true; // Element can receive shadows
    newElement.userData.definition = definition;
    newElement.userData.originalColor = baseColor; // Store original color for style toggling

    placedElements.push(newElement);
    scene.add(newElement);
    updateElementCounter(); // Update the UI counter
    return newElement;
}

/**
 * Generates a color based on the element type string.
 * @param {string} type - The type of the element (e.g., "Brique", "Bloc").
 * @returns {number} A hex color value.
 */
function getColorForElementType(type) {
    let hash = 0;
    for (let i = 0; i < type.length; i++) {
        hash = type.charCodeAt(i) + ((hash << 5) - hash);
        hash = hash & hash; // Convert to 32bit integer
    }
    // Generate RGB components from hash, ensuring they are reasonably bright
    const r = (hash & 0xFF0000) >> 16;
    const g = (hash & 0x00FF00) >> 8;
    const b = hash & 0x0000FF;
    return new THREE.Color(`rgb(${Math.max(50, r)}, ${Math.max(50, g)}, ${Math.max(50, b)})`).getHex();
}

/**
 * Creates a phantom element based on custom dimensions entered by the user.
 */
function addCustomElement() {
    const w = parseFloat(document.getElementById('custom-width').value);
    const h = parseFloat(document.getElementById('custom-height').value);
    const d = parseFloat(document.getElementById('custom-depth').value);
    const name = document.getElementById('custom-name').value.trim() || `Custom (${w}x${h}x${d})`;

    if (isNaN(w) || isNaN(h) || isNaN(d) || w <= 0 || h <= 0 || d <= 0) {
        showCustomAlert("Dimensions personnalisées invalides.", "error");
        return;
    }
    const definition = { name, w, h, d, type: "Custom" };

    // Create a new phantom with these custom dimensions
    if (phantomElement) { // Clean up existing phantom
        scene.remove(phantomElement);
        if (phantomElement.geometry) phantomElement.geometry.dispose();
        if (phantomElement.material) phantomElement.material.dispose();
    }

    const geometry = new THREE.BoxGeometry(definition.w / SCALE_FACTOR, definition.h / SCALE_FACTOR, definition.d / SCALE_FACTOR);
    const material = new THREE.MeshStandardMaterial({ color: phantomMaterialColor, transparent: true, opacity: 0.7 });
    phantomElement = new THREE.Mesh(geometry, material);
    phantomElement.userData.definition = definition;
    const defH = definition.h / SCALE_FACTOR;
    phantomElement.position.y = currentAssiseY + defH / 2; // Set initial Y
    scene.add(phantomElement);

    setCurrentTool('add'); // Switch to add tool
    isAdjustingPhantom = false; // Allow mouse to position this new custom phantom initially
    showCustomAlert(`Élément personnalisé '${name}' prêt. Cliquez pour positionner, puis ajustez avec DPad.`, 'info');
}

/**
 * Handles mouse move events, primarily for positioning the phantom element.
 * @param {MouseEvent} event - The mouse move event.
 */
function onMouseMove(event) {
    // Only move phantom with mouse if in 'add' mode AND not currently adjusting with DPad
    if (currentTool !== 'add' || !phantomElement || isAdjustingPhantom) return;

    const canvasBounds = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - canvasBounds.left) / canvasBounds.width) * 2 - 1;
    mouse.y = -((event.clientY - canvasBounds.top) / canvasBounds.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(plane); // Intersect with the ground plane

    if (intersects.length > 0) {
        const intersectPoint = intersects[0].point;
        const snappedX = snapToGrid(intersectPoint.x);
        const snappedZ = snapToGrid(intersectPoint.z);

        const defH = phantomElement.userData.definition.h / SCALE_FACTOR;
        phantomElement.position.set(snappedX, currentAssiseY + defH / 2, snappedZ);
    }
}

/**
 * Handles mouse down events for placing, selecting, or interacting with elements.
 * @param {MouseEvent} event - The mouse down event.
 */
function onMouseDown(event) {
    if (event.target !== renderer.domElement) return; // Ignore clicks outside the canvas

    const canvasBounds = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - canvasBounds.left) / canvasBounds.width) * 2 - 1;
    mouse.y = -((event.clientY - canvasBounds.top) / canvasBounds.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    if (currentTool === 'add') {
        if (event.button === 0) { // Left click
            if (!isAdjustingPhantom && phantomElement) {
                // First click: Anchor the phantom element, switch to DPad adjustment mode
                isAdjustingPhantom = true;
                // Phantom is already positioned by onMouseMove, just fix its current position
                if (transformControls.object === phantomElement) transformControls.detach(); // Should not happen
                showCustomAlert("Ajustez avec le DPad. Confirmez avec OK ou Entrée.", "info", 4000);
            }
            // If isAdjustingPhantom is true, mouse clicks are ignored for placement here.
            // Placement is confirmed by DPad OK button or Enter key.
        }
    } else if (currentTool === 'select' || currentTool === 'move' || currentTool === 'rotate') {
        if (event.button === 0) { // Left click
            const intersects = raycaster.intersectObjects(placedElements, false); // Non-recursive
            if (intersects.length > 0 && intersects[0].object !== plane) {
                const newSelected = intersects[0].object;
                selectObject(newSelected);
            } else { // Clicked on empty space or plane
                deselectObject();
            }
        }
    }
}

/**
 * Selects a given 3D object, highlighting it and attaching transform controls if applicable.
 * @param {THREE.Object3D} object - The object to select.
 */
function selectObject(object) {
    if (selectedElement === object) return; // Already selected

    if (selectedElement) { // Deselect previous
        selectedElement.material.color.setHex(useWhiteElements ? 0xffffff : (selectedElement.userData.originalColor || defaultMaterialColor));
    }
    selectedElement = object;
    selectedElement.material.color.setHex(selectedMaterialColor); // Highlight

    // Attach transform controls based on current tool
    if (currentTool === 'move') {
        transformControls.setMode("translate");
        transformControls.attach(selectedElement);
    } else if (currentTool === 'rotate') {
        transformControls.setMode("rotate");
        transformControls.attach(selectedElement);
    } else { // e.g., 'select' tool
        transformControls.detach();
    }
}

/**
 * Deselects the currently selected object.
 */
function deselectObject() {
    if (selectedElement) {
        selectedElement.material.color.setHex(useWhiteElements ? 0xffffff : (selectedElement.userData.originalColor || defaultMaterialColor));
        selectedElement = null;
        transformControls.detach();
    }
}

/**
 * Handles key down events for shortcuts and DPad controls.
 * @param {KeyboardEvent} event - The key down event.
 */
function onKeyDown(event) {
    // Prevent shortcuts if typing in an input field
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') return;
    if (event.repeat) return; // Ignore key repeats

    let toolChangedByShortcut = false;
    switch (event.key.toLowerCase()) {
        // Tool shortcuts
        case 's': setCurrentTool('select'); toolChangedByShortcut = true; break;
        case 'a': setCurrentTool('add'); toolChangedByShortcut = true; break;
        case 'm': setCurrentTool('move'); toolChangedByShortcut = true; break;
        case 'r': setCurrentTool('rotate'); toolChangedByShortcut = true; break;
        // Action shortcuts
        case 'd': if (selectedElement && !isAdjustingPhantom) duplicateSelected(); break;
        case 'delete':
        case 'backspace':
            if (selectedElement && !isAdjustingPhantom) deleteSelected();
            break;
        case 'escape':
            if (isAdjustingPhantom) { // If adjusting phantom, cancel adjustment
                cancelPhantomAdjustment();
            } else if (selectedElement) { // If an element is selected, deselect it
                deselectObject();
            } else if (currentTool === 'add' && phantomElement) { // If phantom exists but not adjusting (e.g. after tool switch)
                cancelPhantomAdjustment(); // This will remove phantom and revert to select tool
            }
            break;
        case 'enter': // Confirm phantom placement with Enter key
            if (isAdjustingPhantom) {
                confirmPhantomPlacement();
            }
            break;
        // DPad keyboard controls (target phantom if adjusting, else selectedElement)
        case 'arrowleft': dPadAdjust(-SNAP_INCREMENT, 0, 0); break;
        case 'arrowright': dPadAdjust(SNAP_INCREMENT, 0, 0); break;
        case 'arrowup': dPadAdjust(0, 0, -SNAP_INCREMENT); break; // Z-axis forward
        case 'arrowdown': dPadAdjust(0, 0, SNAP_INCREMENT); break; // Z-axis backward
        case 'pageup': dPadAdjust(0, SNAP_INCREMENT, 0); break; // Y-axis up
        case 'pagedown': dPadAdjust(0, -SNAP_INCREMENT, 0); break; // Y-axis down
        case 'q': dPadAdjustRotation(Math.PI / 2); break; // Rotate left
        case 'e': dPadAdjustRotation(-Math.PI / 2); break; // Rotate right
    }
    if (toolChangedByShortcut) {
        showCustomAlert(`Outil actif : ${currentTool.charAt(0).toUpperCase() + currentTool.slice(1)}`, 'info', 1500);
    }
}

/**
 * Adjusts the position of the target element (phantom or selected) using DPad inputs.
 * @param {number} dx - Change in X.
 * @param {number} dy - Change in Y.
 * @param {number} dz - Change in Z.
 */
function dPadAdjust(dx, dy, dz) {
    const target = isAdjustingPhantom ? phantomElement : selectedElement;
    if (!target) return;

    target.position.x += dx;
    target.position.y += dy;
    target.position.z += dz;

    snapObjectToGrid(target); // Snap after adjustment

    // If adjusting a selected element with transform controls attached, update gizmo
    if (target === selectedElement && transformControls.object === selectedElement) {
        transformControls.position.copy(target.position);
    }
}

/**
 * Adjusts the Y-axis rotation of the target element (phantom or selected).
 * @param {number} angleY - Rotation angle in radians.
 */
function dPadAdjustRotation(angleY) {
    const target = isAdjustingPhantom ? phantomElement : selectedElement;
    if (!target) return;

    target.rotation.y += angleY;
    // Note: TransformControls directly manipulates rotation. For DPad, we set mesh rotation.
    // If TransformControls is in rotate mode, this might conflict or be overridden.
    // For simplicity, DPad directly controls mesh rotation.
}

/**
 * Confirms the placement of the currently adjusting phantom element.
 */
function confirmPhantomPlacement() {
    if (currentTool === 'add' && isAdjustingPhantom && phantomElement) {
        // Vérifiez si la brique est bien positionnée sur le plateau
        const intersects = raycaster.intersectObject(plane);
        if (intersects.length === 0) {
            showCustomAlert("Impossible de placer l'élément : hors du plateau.", "error");
            return;
        }

        // Ajoutez l'élément à la scène
        addElementToScene(phantomElement.position.clone(), phantomElement.userData.definition, phantomElement.rotation.y);

        isAdjustingPhantom = false;
        createPhantomElement(); // Préparez le prochain placement
        showCustomAlert("Élément placé !", "success");
    }
}

/**
 * Cancels the current phantom adjustment process.
 */
function cancelPhantomAdjustment() {
    if (phantomElement) {
        scene.remove(phantomElement);
        if (phantomElement.geometry) phantomElement.geometry.dispose();
        if (phantomElement.material) phantomElement.material.dispose();
        phantomElement = null;
    }
    isAdjustingPhantom = false;
    // If still in 'add' tool, create a new phantom for mouse placement
    if (currentTool === 'add') {
        createPhantomElement();
    }
    showCustomAlert("Placement annulé.", "info");
}

/**
 * Duplicates the currently selected element.
 */
function duplicateSelected() {
    if (!selectedElement) {
        showCustomAlert("Aucun élément sélectionné à dupliquer.", "error");
        return;
    }
    const newPos = selectedElement.position.clone();
    // Offset the new element slightly to make it visible and avoid z-fighting
    const offsetX = (selectedElement.userData.definition.w / SCALE_FACTOR) * 0.6; // 60% of width
    const offsetZ = (selectedElement.userData.definition.d / SCALE_FACTOR) * 0.6; // 60% of depth
    newPos.x += offsetX;
    newPos.z += offsetZ;

    // Snap the new position before creating the element
    // Create a temporary object structure for snapObjectToGrid as it expects a mesh-like object
    const tempSnapObj = { position: newPos, geometry: { parameters: { height: selectedElement.geometry.parameters.height } } };
    snapObjectToGrid(tempSnapObj); // Snap the calculated new position

    const newElement = addElementToScene(tempSnapObj.position, selectedElement.userData.definition, selectedElement.rotation.y);

    deselectObject(); // Deselect old
    selectObject(newElement); // Select new
    showCustomAlert("Élément dupliqué.", "success");
}

/**
 * Deletes the currently selected element.
 */
function deleteSelected() {
    if (!selectedElement) {
        showCustomAlert("Aucun élément sélectionné à supprimer.", "error");
        return;
    }
    scene.remove(selectedElement);
    transformControls.detach(); // Detach controls before disposing

    if (selectedElement.geometry) selectedElement.geometry.dispose();
    if (selectedElement.material) selectedElement.material.dispose();

    const index = placedElements.indexOf(selectedElement);
    if (index > -1) {
        placedElements.splice(index, 1); // Remove from array
    }
    selectedElement = null;
    updateElementCounter();
    showCustomAlert("Élément supprimé.", "success");
}

/**
 * Clears the entire scene and resets the application state.
 */
function clearScene() {
    if (!confirm("Êtes-vous sûr de vouloir créer un nouveau projet ? Toutes les modifications non sauvegardées seront perdues.")) return;

    if (isAdjustingPhantom) cancelPhantomAdjustment(); // Cancel any ongoing phantom adjustment
    deselectObject(); // Deselect any current object

    // Remove all placed elements from scene and dispose of their resources
    while (placedElements.length > 0) {
        const el = placedElements.pop();
        scene.remove(el);
        if (el.geometry) el.geometry.dispose();
        if (el.material) el.material.dispose();
    }

    updateElementCounter(); // Update UI counter

    // Reset metadata and UI fields
    document.getElementById('meta-title').value = "Nouveau Mur";
    document.getElementById('meta-drafter').value = "Utilisateur";
    document.getElementById('assise-level').value = "0";
    currentAssiseY = 0;

    // Reset camera to initial position and view
    camera.position.set(80 / SCALE_FACTOR, 100 / SCALE_FACTOR, 200 / SCALE_FACTOR);
    camera.lookAt(0, 0, 0);
    orbitControls.reset(); // Reset orbit controls state

    // If in 'add' mode, recreate a phantom element
    if (currentTool === 'add') createPhantomElement();

    showCustomAlert("Scène réinitialisée.", "success");
}

/**
 * Updates the element counter table in the UI.
 */
function updateElementCounter() {
    const counts = {}; // Object to store counts of each element type
    placedElements.forEach(el => {
        const name = el.userData.definition.name;
        counts[name] = (counts[name] || 0) + 1;
    });

    const tbody = document.getElementById('element-counter-table').getElementsByTagName('tbody')[0];
    tbody.innerHTML = ''; // Clear existing rows

    // Populate table with new counts
    for (const name in counts) {
        const row = tbody.insertRow();
        const cellName = row.insertCell();
        const cellQuantity = row.insertCell();
        cellName.textContent = name;
        cellQuantity.textContent = counts[name];
    }
}

/**
 * Exports the current scene to a PDF with multiple views.
 */
function exportToPDF() {
    showCustomAlert("Préparation de l'export PDF... Ceci peut prendre un moment.", "info", 5000);
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({
        orientation: 'landscape', // Landscape for better scene view
        unit: 'mm',
        format: 'a4'
    });

    // Store original visibility of helper objects
    const originalGridVisibility = gridHelper.visible;
    const originalTransformControlsVisibility = transformControls.visible;
    let originalPhantomVisibility = false;
    if (phantomElement) originalPhantomVisibility = phantomElement.visible;

    // Temporarily hide helpers for cleaner screenshots
    gridHelper.visible = false;
    transformControls.visible = false;
    if (phantomElement) phantomElement.visible = false;

    // Render current perspective view
    renderer.render(scene, camera);
    const imgDataPerspective = renderer.domElement.toDataURL('image/png');

    // Restore helper visibility
    gridHelper.visible = originalGridVisibility;
    transformControls.visible = originalTransformControlsVisibility;
    if (phantomElement) phantomElement.visible = originalPhantomVisibility;

    // PDF page dimensions and margins
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const margin = 10; // 10mm margin

    const availableWidth = pdfWidth - 2 * margin;
    const availableHeight = pdfHeight - 2 * margin - 30; // Space for title and metadata

    /**
     * Helper function to add an image to the PDF with a title and metadata.
     * @param {string} imgData - Base64 image data.
     * @param {string} title - Title for this view.
     */
    function addImageToPdf(imgData, title) {
        const imgProps = pdf.getImageProperties(imgData);
        const imgRatio = imgProps.width / imgProps.height;
        let imgPdfWidth = availableWidth;
        let imgPdfHeight = imgPdfWidth / imgRatio;

        // Fit image within available space while maintaining aspect ratio
        if (imgPdfHeight > availableHeight) {
            imgPdfHeight = availableHeight;
            imgPdfWidth = imgPdfHeight * imgRatio;
        }

        const x = margin + (availableWidth - imgPdfWidth) / 2; // Center image
        const y = margin + 25; // Position below title/metadata

        // Add title and metadata to the page
        pdf.setFontSize(16);
        pdf.text(title, margin, margin + 7);
        pdf.setFontSize(10);
        pdf.text(`Ouvrage: ${document.getElementById('meta-title').value || "N/A"}`, margin, margin + 14);
        pdf.text(`Dessinateur: ${document.getElementById('meta-drafter').value || 'N/A'}`, margin, margin + 19);
        pdf.text(`Date: ${new Date().toLocaleDateString()}`, pdfWidth - margin - 30, margin + 7); // Date top right

        pdf.addImage(imgData, 'PNG', x, y, imgPdfWidth, imgPdfHeight);
    }

    addImageToPdf(imgDataPerspective, "Vue en Perspective");

    // Store original camera state to restore after orthographic views
    const originalCamPos = camera.position.clone();
    const originalCamQuaternion = camera.quaternion.clone();
    const originalCamZoom = camera.zoom;
    const isPerspective = camera.isPerspectiveCamera;

    // Calculate bounding box of all placed elements to center orthographic views
    const boundingBox = new THREE.Box3();
    if (placedElements.length > 0) {
        placedElements.forEach(el => boundingBox.expandByObject(el));
    } else { // Default bounding box if scene is empty
        boundingBox.setFromCenterAndSize(new THREE.Vector3(0, 25 / SCALE_FACTOR, 0), new THREE.Vector3(100 / SCALE_FACTOR, 50 / SCALE_FACTOR, 100 / SCALE_FACTOR));
    }
    const center = boundingBox.getCenter(new THREE.Vector3());
    const size = boundingBox.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z, 50 / SCALE_FACTOR); // Ensure a minimum dimension
    const orthoFactor = 1.2; // Zoom out slightly for orthographic views

    // Create an orthographic camera for front, left, back views
    const orthoCam = new THREE.OrthographicCamera(
        -size.x / 2 * orthoFactor, size.x / 2 * orthoFactor, // left, right
        size.y / 2 * orthoFactor, -size.y / 2 * orthoFactor, // top, bottom
        0.01, 2 * maxDim + 200 / SCALE_FACTOR // near, far (adjusted for visibility)
    );

    // --- Front View (camera looks along -Z axis) ---
    orthoCam.position.set(center.x, center.y, center.z + maxDim + 100 / SCALE_FACTOR); // Position camera in front
    orthoCam.lookAt(center); // Look at the center of the bounding box
    renderer.render(scene, orthoCam);
    const imgDataFront = renderer.domElement.toDataURL('image/png');
    pdf.addPage();
    addImageToPdf(imgDataFront, "Vue de Face (Orthographique)");

    // --- Left View (camera looks along +X axis) ---
    orthoCam.position.set(center.x - maxDim - 100 / SCALE_FACTOR, center.y, center.z); // Position camera to the left
    orthoCam.lookAt(center);
    renderer.render(scene, orthoCam);
    const imgDataLeft = renderer.domElement.toDataURL('image/png');
    pdf.addPage();
    addImageToPdf(imgDataLeft, "Vue de Gauche (Orthographique)");

    // --- Back View (camera looks along +Z axis) ---
    orthoCam.position.set(center.x, center.y, center.z - maxDim - 100 / SCALE_FACTOR); // Position camera behind
    orthoCam.lookAt(center);
    renderer.render(scene, orthoCam);
    const imgDataBack = renderer.domElement.toDataURL('image/png');
    pdf.addPage();
    addImageToPdf(imgDataBack, "Vue Arrière (Orthographique)");

    // Restore original camera state
    if (isPerspective) {
        camera.position.copy(originalCamPos);
        camera.quaternion.copy(originalCamQuaternion);
        camera.zoom = originalCamZoom;
        camera.updateProjectionMatrix();
    }
    // If original camera was orthographic, its specific state would need restoring here.

    pdf.save(`construction-3d-${new Date().toISOString().slice(0, 10)}.pdf`); // Save PDF with date
    showCustomAlert("Export PDF terminé.", "success");
}

/**
 * Handles window resize events to adjust camera and renderer.
 */
function onWindowResize() {
    const container = renderer.domElement.parentElement;
    if (!container) return; // Should not happen if elements are correctly structured

    const newWidth = container.clientWidth;
    const newHeight = container.clientHeight;

    if (camera.isPerspectiveCamera) {
        camera.aspect = newWidth / newHeight;
    }
    // For orthographic camera, left/right/top/bottom might need adjustment based on aspect ratio
    // to maintain proportions, but this is often handled by how the ortho camera is defined initially.
    camera.updateProjectionMatrix();
    renderer.setSize(newWidth, newHeight);
}

/**
 * The main animation loop for rendering the scene.
 */
function animate() {
    requestAnimationFrame(animate); // Request the next frame
    orbitControls.update(); // Update orbit controls (for damping)
    renderer.render(scene, camera); // Render the scene
}

// Start the application once the DOM is ready
// (Since script is at the end of body, DOM is parsed. For full safety, use DOMContentLoaded)
// document.addEventListener('DOMContentLoaded', initThree);
initThree(); // Direct call as script is at the end of body

/**
 * Handles double-click events for anchoring the phantom element.
 * @param {MouseEvent} event - The double-click event.
 */
function onDoubleClick(event) {
    if (currentTool === 'add' && phantomElement) {
        // Vérifiez si la brique fantôme est positionnée correctement
        const canvasBounds = renderer.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - canvasBounds.left) / canvasBounds.width) * 2 - 1;
        mouse.y = -((event.clientY - canvasBounds.top) / canvasBounds.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObject(plane);

        if (intersects.length > 0) {
            // Positionnez la brique fantôme à l'intersection détectée
            const intersectPoint = intersects[0].point;
            phantomElement.position.x = snapToGrid(intersectPoint.x);
            phantomElement.position.z = snapToGrid(intersectPoint.z);

            confirmPhantomPlacement(); // Ancrez la brique fantôme
        } else {
            showCustomAlert("Impossible de placer l'élément : hors du plateau.", "error");
        }
    }
}

// Ajoutez l'écouteur d'événement pour le double-clic
renderer.domElement.addEventListener('dblclick', onDoubleClick, false);
