import * as THREE from 'three';
        import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

        // --- Constants ---
        const GRID_SIZE_CM = 1000; // Size of the grid in cm
        const GRID_STEP_CM = 50; // Spacing of grid lines in cm
        const CUSTOM_ELEMENT_ID = "custom"; // ID for the custom element option
        const DEFAULT_CUSTOM_COLOR = 0xAAAAAA; // Default color for custom elements
        const SELECTION_COLOR = 0xffaa00; // Emissive color for selected elements
        const CLICK_THRESHOLD = 200; // Max duration (ms) for a click vs hold
        const LONG_PRESS_THRESHOLD = 500; // Duration (ms) to trigger context menu
        const DPAD_INCREMENT_CM = 1; // Movement step (cm) using DPad/arrows
        const ROTATION_INCREMENT = Math.PI / 4; // Rotation step (45 degrees)
        const DRAG_THRESHOLD_PX = 5; // Minimum pixel distance to register a drag
        const POSE_LIBRE_ID = "pose-libre"; // Special ID for free placement (no assise constraint)

        // --- DOM Elements ---
        const viewportContainer = document.getElementById('viewport-container');
        const toolbar = document.getElementById('toolbar');
        const elementSelect = document.getElementById('element-select');
        const jointInput = document.getElementById('joint-thickness');
        const infoText = document.querySelector('.info-text');
        const selectToolButton = document.getElementById('tool-select');
        const addToolButton = document.getElementById('tool-add');
        const moveToolButton = document.getElementById('tool-move');
        const rotateToolButton = document.getElementById('tool-rotate');
        const duplicateToolButton = document.getElementById('tool-duplicate');
        const deleteToolButton = document.getElementById('tool-delete');
        const toolButtons = [selectToolButton, addToolButton, moveToolButton, rotateToolButton, duplicateToolButton, deleteToolButton];
        const customElementGroup = document.getElementById('custom-element-group');
        const customNameInput = document.getElementById('custom-name');
        const customWidthInput = document.getElementById('custom-width');
        const customHeightInput = document.getElementById('custom-height');
        const customDepthInput = document.getElementById('custom-depth');
        const btnOrbitLeft = document.getElementById('btn-orbit-left');
        const btnOrbitRight = document.getElementById('btn-orbit-right');
        const btnZoomIn = document.getElementById('btn-zoom-in');
        const btnZoomOut = document.getElementById('btn-zoom-out');
        const placementControlsDiv = document.getElementById('placement-controls');
        const dpadUp = document.getElementById('dpad-up');
        const dpadDown = document.getElementById('dpad-down');
        const dpadLeft = document.getElementById('dpad-left');
        const dpadRight = document.getElementById('dpad-right');
        const placementRotateLeft = document.getElementById('placement-rotate-left');
        const placementRotateRight = document.getElementById('placement-rotate-right');
        const dpadUpY = document.getElementById('dpad-up-y'); // Vertical DPad Up
        const dpadDownY = document.getElementById('dpad-down-y'); // Vertical DPad Down
        const placeButton = document.getElementById('btn-place-element');
        const confirmMoveButton = document.getElementById('btn-confirm-move');
        const cancelPlacementButton = document.getElementById('btn-cancel-placement');
        const cancelMoveButton = document.getElementById('btn-cancel-move');
        const contextMenu = document.getElementById('context-menu');
        const ctxRotateButton = document.getElementById('ctx-rotate');
        const ctxMoveButton = document.getElementById('ctx-move');
        const ctxDuplicateButton = document.getElementById('ctx-duplicate');
        const ctxDeleteButton = document.getElementById('ctx-delete');
        // Assise Controls
        const assiseSelect = document.getElementById('assise-select');
        const createAssiseButton = document.getElementById('btn-create-assise');
        // Save and Open Buttons
        const saveButton = document.getElementById('btn-save'); // P88c2
        const openButton = document.getElementById('btn-open'); // P88c2

        // --- Element Type Definitions (Dimensions in cm: width, height, depth) ---
        // Note: Using numeric color values (Hexadecimal)
        const elementTypes = {
            "M50": { name: "Brique M50", dim: [19, 5, 9], color: 0xCC6633 },
            "M57": { name: "Brique M57", dim: [19, 5.7, 9], color: 0xCC6633 },
            "M65": { name: "Brique M65", dim: [19, 6.5, 9], color: 0xCC6633 },
            "M90": { name: "Brique M90", dim: [19, 9, 9], color: 0xCC6633 },
            "WF": { name: "Brique WF", dim: [21, 5, 10], color: 0xD2691E },
            "WFD": { name: "Brique WFD", dim: [21, 6.5, 10], color: 0xD2691E },
            "M50c": { name: "M50 champ", dim: [9, 19, 5], color: 0xB87333 },
            "M57c": { name: "M57 champ", dim: [9, 19, 5.7], color: 0xB87333 },
            "M65c": { name: "M65 champ", dim: [9, 19, 6.5], color: 0xB87333 },
            "M90c": { name: "M90 champ", dim: [9, 19, 9], color: 0xB87333 },
            "WFc": { name: "WF champ", dim: [10, 21, 5], color: 0xC0C0C0 }, // Example different color
            "WFDc": { name: "WFD champ", dim: [10, 21, 6.5], color: 0xC0C0C0 },
            "B9": { name: "Bloc 9", dim: [39, 19, 9], color: 0xAAAAAA },
            "B14": { name: "Bloc 14", dim: [39, 19, 14], color: 0xAAAAAA },
            "B19": { name: "Bloc 19", dim: [39, 19, 19], color: 0xAAAAAA },
            "B29": { name: "Bloc 29", dim: [39, 19, 29], color: 0xAAAAAA },
            "V1": { name: "Vide 1cm", dim: [40, 19, 1], color: 0xDDDDDD },
            "V2": { name: "Vide 2cm", dim: [40, 19, 2], color: 0xDDDDDD },
            "V3": { name: "Vide 3cm", dim: [40, 19, 3], color: 0xDDDDDD },
            "V4": { name: "Vide 4cm", dim: [40, 19, 4], color: 0xDDDDDD },
            "V5": { name: "Vide 5cm", dim: [40, 19, 5], color: 0xDDDDDD },
            "L120_14": { name: "Lint 120x14", dim: [120, 19, 14], color: 0x888888 },
            "L140_14": { name: "Lint 140x14", dim: [140, 19, 14], color: 0x888888 },
            "L160_14": { name: "Lint 160x14", dim: [160, 19, 14], color: 0x888888 },
            "L180_14": { name: "Lint 180x14", dim: [180, 19, 14], color: 0x888888 },
            "L200_14": { name: "Lint 200x14", dim: [200, 19, 14], color: 0x888888 },
            "L220_14": { name: "Lint 220x14", dim: [220, 19, 14], color: 0x888888 },
            "L240_14": { name: "Lint 240x14", dim: [240, 19, 14], color: 0x888888 },
            "L260_14": { name: "Lint 260x14", dim: [260, 19, 14], color: 0x888888 },
            "L280_14": { name: "Lint 280x14", dim: [280, 19, 14], color: 0x888888 },
            "L300_14": { name: "Lint 300x14", dim: [300, 19, 14], color: 0x888888 },
            "L100_9": { name: "Lint 100x9", dim: [100, 19, 9], color: 0x888888 },
            "L120_9": { name: "Lint 120x9", dim: [120, 19, 9], color: 0x888888 },
            "L160_9": { name: "Lint 160x9", dim: [160, 19, 9], color: 0x888888 },
            "L180_9": { name: "Lint 180x9", dim: [180, 19, 9], color: 0x888888 },
            "L200_9": { name: "Lint 200x9", dim: [200, 19, 9], color: 0x888888 },
            "L220_9": { name: "Lint 220x9", dim: [220, 19, 9], color: 0x888888 },
            "L240_9": { name: "Lint 240x9", dim: [240, 19, 9], color: 0x888888 },
            "L260_9": { name: "Lint 260x9", dim: [260, 19, 9], color: 0x888888 },
            "L280_9": { name: "Lint 280x9", dim: [280, 19, 9], color: 0x888888 },
            "L300_9": { name: "Lint 300x9", dim: [300, 19, 9], color: 0x888888 },
            "L100_19": { name: "Lint 100x19", dim: [100, 19, 19], color: 0x888888 },
            "L120_19": { name: "Lint 120x19", dim: [120, 19, 19], color: 0x888888 },
            "L160_19": { name: "Lint 160x19", dim: [160, 19, 19], color: 0x888888 },
            "L180_19": { name: "Lint 180x19", dim: [180, 19, 19], color: 0x888888 },
            "L200_19": { name: "Lint 200x19", dim: [200, 19, 19], color: 0x888888 },
            "L220_19": { name: "Lint 220x19", dim: [220, 19, 19], color: 0x888888 },
            "L240_19": { name: "Lint 240x19", dim: [240, 19, 19], color: 0x888888 },
            "L260_19": { name: "Lint 260x19", dim: [260, 19, 19], color: 0x888888 },
            "L280_19": { name: "Lint 280x19", dim: [280, 19, 19], color: 0x888888 },
            "L300_19": { name: "Lint 300x19", dim: [300, 19, 19], color: 0x888888 },
            "BCA60_9": { name: "BC Ass 60x9", dim: [60, 20, 9], color: 0xE0E0E0 },
            "BCA60_14": { name: "BC Ass 60x14", dim: [60, 20, 14], color: 0xE0E0E0 },
            "BCA60_19": { name: "BC Ass 60x19", dim: [60, 20, 19], color: 0xE0E0E0 },
            "BC60_10": { name: "BC 60x10", dim: [60, 25, 10], color: 0xF0F0F0 },
            "BC60_15": { name: "BC 60x15", dim: [60, 25, 15], color: 0xF0F0F0 },
            "BC60_20": { name: "BC 60x20", dim: [60, 25, 20], color: 0xF0F0F0 },
            "BC60_24": { name: "BC 60x24", dim: [60, 25, 24], color: 0xF0F0F0 },
            "BC60_30": { name: "BC 60x30", dim: [60, 25, 30], color: 0xF0F0F0 },
            "BC60_36": { name: "BC 60x36.5", dim: [60, 25, 36.5], color: 0xF0F0F0 },
            "PUR5": { name: "PUR 5cm", dim: [120, 60, 5], color: 0xFFFF99 },
            "PUR6": { name: "PUR 6cm", dim: [120, 60, 6], color: 0xFFFF99 },
            "PUR7": { name: "PUR 7cm", dim: [120, 60, 7], color: 0xFFFF99 },
            "PUR8": { name: "PUR 8cm", dim: [120, 60, 8], color: 0xFFFF99 },
            "PUR9": { name: "PUR 9cm", dim: [120, 60, 9], color: 0xFFFF99 },
            "PUR10": { name: "PUR 10cm", dim: [120, 60, 10], color: 0xFFFF99 },
            "PUR11": { name: "PUR 11cm", dim: [120, 60, 11], color: 0xFFFF99 },
            "PUR12": { name: "PUR 12cm", dim: [120, 60, 12], color: 0xFFFF99 },
            "PUR13": { name: "PUR 13cm", dim: [120, 60, 13], color: 0xFFFF99 },
            "PUR14": { name: "PUR 14cm", dim: [120, 60, 14], color: 0xFFFF99 },
            "PUR15": { name: "PUR 15cm", dim: [120, 60, 15], color: 0xFFFF99 },
            "PUR16": { name: "PUR 16cm", dim: [120, 60, 16], color: 0xFFFF99 },
            "PUR18": { name: "PUR 18cm", dim: [120, 60, 18], color: 0xFFFF99 },
            "PROFIL": { name: "Profil", dim: [250, 6.5, 6.5], color: 0xC0C0C0 }
        };

        // --- State Variables ---
        let currentTool = 'select'; // Current active tool ('select', 'add', 'move', 'duplicate')
        let addState = 'idle'; // State for the add tool ('idle', 'positioning')
        let moveState = 'idle'; // State for the move tool ('idle', 'moving')
        let selectedElementTypeId = Object.keys(elementTypes)[0]; // ID of the element type selected in the dropdown
        let jointThicknessCm = parseFloat(jointInput.value) || 1.2; // Thickness of the joint in cm
        let placedElements = []; // Array to store data of placed elements {id, typeId, mesh, customDimensions?, customName?}
        let nextElementId = 0; // Counter for assigning unique IDs to placed elements
        let selectedElement = null; // Reference to the currently selected element's data object
        let elementForContextMenu = null; // Reference to the element targeted by the context menu
        let isDragging = false; // Flag to track if the pointer is being dragged (for orbit vs click)
        let pointerDownTime = 0; // Timestamp when the pointer was pressed down
        let longPressTimer = null; // Timer for detecting long press
        let originalMovePosition = null; // Stores the original position when starting a move operation
        let pointerDownCoords = { x: 0, y: 0 }; // Stores pointer coordinates on pointer down

        // Assise Management
        let assises = [{ id: POSE_LIBRE_ID, name: "Pose Libre", height: null }]; // Array of defined assises {id, name, height}
        let activeAssiseId = POSE_LIBRE_ID; // ID of the currently active assise

        // --- Three.js Core Components ---
        let scene, camera, renderer, controls, raycaster, pointer, axesHelper, gridHelper; // Added gridHelper here
        let groundPlane, ghostElement; // Ghost element for placement preview
        const objectsToRaycast = []; // Array of objects the raycaster should check against (ground + placed elements)

        /** Initializes the Three.js scene, camera, renderer, controls, lights, and helpers */
        function init() {
            // Scene setup
            scene = new THREE.Scene();
            // MODIFICATION: Set background to sky blue
            scene.background = new THREE.Color(0x87CEEB); // Sky Blue

            // Camera setup
            const aspect = viewportContainer.clientWidth / viewportContainer.clientHeight;
            camera = new THREE.PerspectiveCamera(60, aspect, 1, 5000); // FOV, aspect, near, far
            // MODIFICATION: Start camera closer
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
            // MODIFICATION: Change ground color to very light green (Honeydew)
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
            // MODIFICATION: Hide the grid
            gridHelper.visible = false;
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

            // --- Initial UI Setup ---
            populateElementSelector();
            populateAssiseSelector(); // Populate assise dropdown
            handleElementSelectChange(); // Set initial custom group visibility
            updateUIToolStates(); // Set initial button disabled states
            updateInfoText(); // Set initial info text
            updateGhostGeometry(); // Set initial ghost size based on selected element
            updateCursor(); // Set initial cursor style

            // --- Event Listeners ---
            window.addEventListener('resize', onWindowResize);
            viewportContainer.addEventListener('pointerdown', onPointerDown, false);
            viewportContainer.addEventListener('pointermove', onPointerMove, false);
            viewportContainer.addEventListener('pointerup', onPointerUp, false);
            viewportContainer.addEventListener('contextmenu', (e) => e.preventDefault()); // Prevent default right-click menu

            // Toolbar interactions
            toolbar.addEventListener('click', handleToolbarClick);
            elementSelect.addEventListener('change', handleElementSelectChange);
            jointInput.addEventListener('change', handleJointThicknessChange);
            // Custom element input changes
            customWidthInput.addEventListener('input', updateGhostGeometry);
            customHeightInput.addEventListener('input', updateGhostGeometry);
            customDepthInput.addEventListener('input', updateGhostGeometry);
            customNameInput.addEventListener('input', updateGhostGeometry); // Update ghost if name changes (though ghost doesn't show name)

            // Keyboard shortcuts
            window.addEventListener('keydown', handleKeyDown);

            // Placement Controls (DPad, Rotation, Actions)
            dpadUp.addEventListener('click', () => moveGhostWithDPad(0, 0, -DPAD_INCREMENT_CM));
            dpadDown.addEventListener('click', () => moveGhostWithDPad(0, 0, DPAD_INCREMENT_CM));
            dpadLeft.addEventListener('click', () => moveGhostWithDPad(-DPAD_INCREMENT_CM, 0, 0));
            dpadRight.addEventListener('click', () => moveGhostWithDPad(DPAD_INCREMENT_CM, 0, 0));
            placementRotateLeft.addEventListener('click', () => rotateGhost(-ROTATION_INCREMENT));
            placementRotateRight.addEventListener('click', () => rotateGhost(ROTATION_INCREMENT));
            dpadUpY.addEventListener('click', () => moveGhostWithDPadY(1)); // Vertical Up
            dpadDownY.addEventListener('click', () => moveGhostWithDPadY(-1)); // Vertical Down
            placeButton.addEventListener('click', confirmAddPlacement);
            confirmMoveButton.addEventListener('click', confirmMovePlacement);
            cancelPlacementButton.addEventListener('click', cancelAddPlacement);
            cancelMoveButton.addEventListener('click', cancelMovePlacement);

            // Context Menu Actions
            ctxRotateButton.addEventListener('click', handleContextMenuRotate);
            ctxMoveButton.addEventListener('click', handleContextMenuMove);
            ctxDuplicateButton.addEventListener('click', handleContextMenuDuplicate);
            ctxDeleteButton.addEventListener('click', handleContextMenuDelete);
            // Close context menu if clicking outside of it
            document.addEventListener('click', handleClickOutsideContextMenu, true); // Use capture phase

            // Assise Controls Listeners
            assiseSelect.addEventListener('change', handleAssiseSelectChange); // Listener for assise dropdown change
            createAssiseButton.addEventListener('click', handleCreateAssise); // Listener for create assise button

            // Save and Open Buttons Listeners
            saveButton.addEventListener('click', saveToFile); // P88c2
            openButton.addEventListener('click', loadFromFile); // P88c2

            // Start the animation loop
            animate();
            console.log("Simulateur initialisé. Caméra rapprochée, grille cachée, sol vert très clair, ciel bleu.");
        }

        // --- Tool and UI Management ---

        /**
         * Sets the active tool and updates UI accordingly.
         * @param {string} toolName - The name of the tool to activate ('select', 'add', 'move', 'duplicate').
         */
        function setActiveTool(toolName) {
            // Avoid redundant activation or activating while positioning/moving
            if (currentTool === toolName && currentTool !== 'select' && toolName !== 'delete') return;
            console.log(`Activation outil: ${toolName}, Actuel: ${currentTool}`);
            const previousTool = currentTool;

            // Cancel ongoing actions if switching tools
            if (previousTool === 'add' && addState === 'positioning') {
                cancelAddPlacement();
            }
            if (previousTool === 'move' && moveState === 'moving') {
                cancelMovePlacement(); // This will also reset originalMovePosition
            } else {
                 originalMovePosition = null; // Ensure reset if not cancelled via cancelMovePlacement
            }

            // Reset states
            addState = 'idle';
            moveState = 'idle';
            hideContextMenu(); // Hide context menu when switching tools

            // Handle special case: Delete tool is an immediate action, not a persistent mode
            if (toolName === 'delete') {
                if (selectedElement) {
                    deleteSelectedElement();
                } else {
                    console.warn("Clic sur Supprimer (toolbar) mais aucun élément sélectionné.");
                }
                // Do not change currentTool state for delete action, it's instant
                return;
            }

            currentTool = toolName;

            // Restore visibility if move was cancelled implicitly by switching tool
            if (previousTool === 'move' && selectedElement && !originalMovePosition) {
                 // This condition might be tricky if cancelMovePlacement didn't run
                 // Let's ensure visibility is correct based on the new tool state
            }

            // Deselect element when switching to 'add' tool
            if (currentTool === 'add' && selectedElement) {
                deselectElement();
            }

            // Update toolbar button active states
            toolButtons.forEach(button => {
                button.classList.toggle('active', button.id === `tool-${currentTool}`);
            });

            // Enable/disable OrbitControls based on the tool
            controls.enabled = (currentTool === 'select');

            // Update ghost visibility based on the new tool and state
            ghostElement.visible = (currentTool === 'add' && addState === 'positioning') ||
                                   (currentTool === 'move' && moveState === 'moving') ||
                                   (currentTool === 'duplicate' && selectedElement); // Show ghost immediately for duplicate

            // Ensure selected element mesh visibility is correct
            if (selectedElement) {
                selectedElement.mesh.visible = (currentTool !== 'move' || moveState !== 'moving');
            }

            // Show/hide placement controls (DPad, etc.)
            placementControlsDiv.style.display = (currentTool === 'add' && addState === 'positioning') ||
                                                 (currentTool === 'move' && moveState === 'moving') ? 'flex' : 'none';

            // Update ghost geometry if it's now visible
            if(ghostElement.visible) {
                updateGhostGeometry();
            }

            // Update UI element states (buttons, inputs)
            updateUIToolStates();
            // Update the information text display
            updateInfoText();
            // Update the mouse cursor style
            updateCursor();
        }

        /** Updates the enabled/disabled state of UI elements based on the current tool and selection */
        function updateUIToolStates() {
            const hasSelection = selectedElement !== null;
            const isPositioning = currentTool === 'add' && addState === 'positioning';
            const isMoving = currentTool === 'move' && moveState === 'moving';
            const isPlacingOrMoving = isPositioning || isMoving;

            // Tool buttons
            selectToolButton.disabled = isPlacingOrMoving;
            addToolButton.disabled = isPlacingOrMoving;
            moveToolButton.disabled = isPlacingOrMoving || !hasSelection;
            rotateToolButton.disabled = isPlacingOrMoving || !hasSelection;
            duplicateToolButton.disabled = isPlacingOrMoving || !hasSelection;
            deleteToolButton.disabled = isPlacingOrMoving || !hasSelection;

            // Input fields and selects
            const manipulationActive = (currentTool === 'duplicate') && hasSelection; // Duplicating locks inputs
            const disableInputs = manipulationActive || isPlacingOrMoving;

            elementSelect.disabled = disableInputs;
            jointInput.disabled = disableInputs;
            assiseSelect.disabled = disableInputs; // Disable assise select during actions
            createAssiseButton.disabled = disableInputs; // Disable create assise during actions

            // Custom element group
            const disableCustomGroup = disableInputs || (currentTool === 'add' && selectedElementTypeId !== CUSTOM_ELEMENT_ID);
            customElementGroup.style.pointerEvents = disableCustomGroup ? 'none' : 'auto';
            customElementGroup.style.opacity = disableCustomGroup ? 0.5 : 1;
            customNameInput.disabled = disableCustomGroup;
            customWidthInput.disabled = disableCustomGroup;
            customHeightInput.disabled = disableCustomGroup;
            customDepthInput.disabled = disableCustomGroup;


            // Placement control buttons visibility
            placeButton.style.display = isPositioning ? 'flex' : 'none';
            cancelPlacementButton.style.display = isPositioning ? 'flex' : 'none';
            confirmMoveButton.style.display = isMoving ? 'flex' : 'none';
            cancelMoveButton.style.display = isMoving ? 'flex' : 'none';
        }

        /** Updates the mouse cursor style based on the current tool */
        function updateCursor() {
            viewportContainer.classList.remove('crosshair-cursor', 'pointer-cursor');
            if ((currentTool === 'add' && addState === 'idle') || // Ready to place first click
                (currentTool === 'move' && moveState === 'idle' && selectedElement) || // Ready to start move (though usually triggered by button/menu)
                 currentTool === 'duplicate' && selectedElement) { // Ready to place duplicate
                viewportContainer.classList.add('crosshair-cursor');
            } else if (currentTool === 'select') { // Default select/orbit mode
                viewportContainer.classList.add('pointer-cursor');
            } else { // Other states (positioning, moving, no selection for move/duplicate)
                viewportContainer.style.cursor = 'default';
            }
        }

        /** Handles clicks on the toolbar buttons */
        function handleToolbarClick(event) {
            const button = event.target.closest('button');
            if (!button) return; // Click wasn't on a button

            const buttonId = button.id;

            // Navigation buttons
            if (buttonId === 'btn-orbit-left') { rotateView(0.1); return; }
            if (buttonId === 'btn-orbit-right') { rotateView(-0.1); return; }
            if (buttonId === 'btn-zoom-in') { zoomView(0.8); return; }
            if (buttonId === 'btn-zoom-out') { zoomView(1.2); return; }

            // Assise creation button
            if (buttonId === 'btn-create-assise') {
                 if (!button.disabled) handleCreateAssise();
                 return;
            }

            // Tool activation/action buttons
            if (buttonId.startsWith('tool-')) {
                // Ignore clicks on disabled buttons
                if (button.disabled || button.classList.contains('disabled')) {
                    console.log(`Clic sur l'outil désactivé: ${buttonId}`);
                    return;
                }

                const toolName = buttonId.substring(5); // Extract tool name (e.g., 'select', 'add')

                // Handle immediate actions (Rotate, Delete, Move, Duplicate)
                if (toolName === 'rotate') {
                    if (selectedElement) {
                        rotateSelectedElement();
                    } else {
                        console.warn("Clic sur Rotation (toolbar) mais aucun élément sélectionné.");
                    }
                } else if (toolName === 'delete') {
                     // setActiveTool handles delete internally now
                     setActiveTool('delete');
                } else if (toolName === 'move') {
                    if (selectedElement) {
                        triggerMove(); // Initiates the move state
                    } else {
                        console.warn("Clic sur Déplacer (toolbar) mais aucun élément sélectionné.");
                    }
                } else if (toolName === 'duplicate') {
                    if (selectedElement) {
                        triggerDuplicate(); // Initiates the duplicate state
                    } else {
                        console.warn("Clic sur Dupliquer (toolbar) mais aucun élément sélectionné.");
                    }
                } else {
                    // Activate the tool mode (Select, Add)
                    setActiveTool(toolName);
                }
            }
        }

        // --- Assise Management ---

        /** Populates the assise selection dropdown */
        function populateAssiseSelector() {
            const currentVal = assiseSelect.value; // Preserve selection if possible
            assiseSelect.innerHTML = ''; // Clear existing options
            assises.forEach(assise => {
                const option = document.createElement('option');
                option.value = assise.id;
                // Display height if it's not the "Pose Libre" option
                option.textContent = assise.name + (assise.height !== null ? ` (${assise.height.toFixed(1)} cm)` : '');
                assiseSelect.appendChild(option);
            });
            // Try to restore previous selection or default to activeAssiseId
            if (assises.some(a => a.id === currentVal)) {
                 assiseSelect.value = currentVal;
            } else {
                 assiseSelect.value = activeAssiseId;
            }
        }

        /** Handles the creation of a new assise based on the currently selected element type */
        function handleCreateAssise() {
            const selectedType = getElementTypeForAdd(); // Get type from the main element dropdown
            if (!selectedType) {
                alert("Veuillez sélectionner un type d'élément valide dans la liste principale pour créer une assise.");
                return;
            }

            // Dimension index 1 is height (width, height, depth)
            const [, elemHeight,] = selectedType.dim;
            if (typeof elemHeight !== 'number' || elemHeight <= 0) {
                 alert("La hauteur de l'élément sélectionné est invalide pour créer une assise.");
                 return;
            }

            const currentJoint = parseFloat(jointInput.value) || 0;
            const assiseHeight = elemHeight + currentJoint;

            // Check if an assise with this exact height already exists (avoid duplicates)
            if (assises.some(a => a.height !== null && Math.abs(a.height - assiseHeight) < 0.01)) { // Check with tolerance
                 alert(`Une assise de hauteur ${assiseHeight.toFixed(1)} cm existe déjà.`);
                 return;
            }

            const newAssiseId = `assise-${Date.now()}`; // Use timestamp for a more unique ID
            // Create a descriptive name, e.g., "Assise 1 (M50)"
            const newAssiseName = `Assise ${assises.filter(a => a.height !== null).length + 1} (${selectedType.name.split(' ')[0]})`;
            const newAssise = { id: newAssiseId, name: newAssiseName, height: assiseHeight };

            assises.push(newAssise);
            assises.sort((a, b) => { // Keep sorted by height, Pose Libre first
                 if (a.height === null) return -1;
                 if (b.height === null) return 1;
                 return a.height - b.height;
            });
            populateAssiseSelector();
            activeAssiseId = newAssiseId; // Activate the newly created assise
            assiseSelect.value = activeAssiseId; // Update dropdown selection
            console.log("Nouvelle assise créée:", newAssise);
            updateInfoText(); // Update info text to show the new active assise
        }

        /** Handles changes in the assise selection dropdown */
        function handleAssiseSelectChange() {
            activeAssiseId = assiseSelect.value;
            console.log("Assise active changée:", activeAssiseId, getActiveAssiseHeight());
            updateInfoText();
            // If positioning, the next ghost update or DPad move will use the new height
        }

        /**
         * Gets the height constraint of the currently active assise.
         * @returns {number | null} The height in cm, or null if "Pose Libre" is active.
         */
        function getActiveAssiseHeight() {
            if (activeAssiseId === POSE_LIBRE_ID) {
                return null; // Indicate free placement (no vertical snapping based on assise)
            }
            const activeAssise = assises.find(a => a.id === activeAssiseId);
            return activeAssise ? activeAssise.height : null; // Return height or null if not found (shouldn't happen)
        }


        // --- Selection and Context Menu ---

        /**
         * Selects an element, highlighting it and updating UI.
         * @param {object} elementData - The data object of the element to select.
         * @param {boolean} [keepContextMenuOpen=false] - If true, prevents hiding the context menu (used when opening it).
         */
        function selectElement(elementData, keepContextMenuOpen = false) {
            if (!elementData || !elementData.mesh || !elementData.mesh.material) {
                console.error("Tentative de sélection d'un élément invalide:", elementData);
                return;
            }
            // If already selected, do nothing unless we need to keep the context menu
            if (selectedElement === elementData) {
                console.log(`Élément ${elementData.id} déjà sélectionné.`);
                if (!keepContextMenuOpen) hideContextMenu();
                return;
            }

            deselectElement(); // Deselect any previously selected element

            selectedElement = elementData;

            // Store original emissive color if not already stored
            if (selectedElement.mesh.material.userData.originalEmissive === undefined) {
                selectedElement.mesh.material.userData.originalEmissive = selectedElement.mesh.material.emissive.getHex();
            }
            // Apply selection highlight
            selectedElement.mesh.material.emissive.setHex(SELECTION_COLOR);
            selectedElement.mesh.material.needsUpdate = true; // Important for material changes

            console.log("Élément sélectionné:", selectedElement.id);
            updateUIToolStates(); // Update button states based on selection
            updateInfoText(); // Update info text
            if (!keepContextMenuOpen) {
                hideContextMenu(); // Hide context menu if it wasn't explicitly kept open
            }
        }

        /** Deselects the currently selected element, removing highlight and updating UI */
        function deselectElement() {
            hideContextMenu(); // Always hide context menu on deselect
            const wasMoving = currentTool === 'move' && moveState === 'moving';

            if (selectedElement && selectedElement.mesh && selectedElement.mesh.material) {
                console.log("Désélection de l'élément:", selectedElement.id);
                // Restore original emissive color
                const originalEmissive = selectedElement.mesh.material.userData.originalEmissive ?? 0x000000; // Default to black if somehow missing
                selectedElement.mesh.material.emissive.setHex(originalEmissive);
                selectedElement.mesh.material.needsUpdate = true;

                // If deselection happens during a move, cancel the move and restore position
                if (wasMoving && originalMovePosition) {
                    console.log("Annulation déplacement par désélection.");
                    selectedElement.mesh.position.copy(originalMovePosition);
                    selectedElement.mesh.visible = true; // Ensure it's visible again
                }
            }

            selectedElement = null;
            originalMovePosition = null; // Clear original position tracking

            updateUIToolStates(); // Update button states (most should become disabled)
            updateInfoText(); // Update info text

            // If a move was cancelled by deselection, reset the tool state
            if (wasMoving) {
                moveState = 'idle';
                placementControlsDiv.style.display = 'none';
                setActiveTool('select'); // Revert to select tool after cancelling move via deselect
            }
        }

        /**
         * Shows the context menu at the specified pointer event location.
         * @param {PointerEvent} event - The pointer event (usually from long press).
         * @param {object} elementData - The data object of the element to show the menu for.
         */
        function showContextMenu(event, elementData) {
            elementForContextMenu = elementData;
            selectElement(elementData, true); // Select the element and keep the menu potentially open

            const menuWidth = contextMenu.offsetWidth;
            const menuHeight = contextMenu.offsetHeight;
            const viewportWidth = viewportContainer.clientWidth;
            const viewportHeight = viewportContainer.clientHeight;

            // Position menu near the click, ensuring it stays within viewport bounds
            let top = event.clientY;
            let left = event.clientX;

            // Adjust if menu goes off-screen right or bottom
            if (left + menuWidth > viewportWidth - 10) { // 10px buffer
                left = viewportWidth - menuWidth - 10;
            }
            if (top + menuHeight > viewportHeight - 10) { // 10px buffer
                top = viewportHeight - menuHeight - 10;
            }
            // Ensure menu doesn't go off-screen top or left (less common)
            if (left < 10) left = 10;
            if (top < 10) top = 10;


            contextMenu.style.left = `${left}px`;
            contextMenu.style.top = `${top}px`;
            contextMenu.style.display = 'flex'; // Show the menu
            console.log("Affichage menu contextuel pour élément:", elementData.id);
        }

        /** Hides the context menu */
        function hideContextMenu() {
            if (contextMenu.style.display !== 'none') {
                 contextMenu.style.display = 'none';
                 elementForContextMenu = null; // Clear the reference when hiding
                 // console.log("Menu contextuel caché.");
            }
        }

        /** Closes the context menu if a click occurs outside of it */
        function handleClickOutsideContextMenu(event) {
            // Check if the menu is visible and the click target is not the menu itself or one of its descendants
            if (contextMenu.style.display === 'flex' && !contextMenu.contains(event.target)) {
                // Optional: Check if the click was back on the element the menu was for.
                // This prevents immediate closure if you click the element again while the menu is open.
                // However, current behavior is to close it, which might be preferred.

                // Check if the click was on a placed element. If so, the regular click handler
                // will either re-select it (and hide the menu via selectElement) or deselect.
                // If the click is on the background, we definitely want to hide the menu.
                const rect = renderer.domElement.getBoundingClientRect();
                pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
                pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
                raycaster.setFromCamera(pointer, camera);
                const placedMeshes = placedElements.map(el => el.mesh).filter(mesh => mesh);
                const intersects = raycaster.intersectObjects(placedMeshes, false);

                // Hide if the click was not on any placed element, OR if it was on a DIFFERENT element
                // than the one the context menu was for.
                if (intersects.length === 0 || !elementForContextMenu || intersects[0].object !== elementForContextMenu.mesh) {
                    console.log("Clic hors menu contextuel, fermeture.");
                    hideContextMenu();
                }
            }
        }

        // --- Context Menu Action Handlers ---
        function handleContextMenuRotate() {
            if (elementForContextMenu) {
                console.log("Action Menu: Rotation");
                // Ensure the element is selected before rotating
                if (selectedElement !== elementForContextMenu) {
                     selectElement(elementForContextMenu);
                }
                rotateSelectedElement();
            }
            hideContextMenu();
        }
        function handleContextMenuMove() {
            if (elementForContextMenu) {
                console.log("Action Menu: Déplacer");
                 // Ensure the element is selected before triggering move
                if (selectedElement !== elementForContextMenu) {
                     selectElement(elementForContextMenu);
                }
                triggerMove(); // This will handle the state change
            }
            hideContextMenu(); // Hide menu after initiating move
        }
        function handleContextMenuDuplicate() {
            if (elementForContextMenu) {
                console.log("Action Menu: Dupliquer");
                 // Ensure the element is selected before triggering duplicate
                if (selectedElement !== elementForContextMenu) {
                     selectElement(elementForContextMenu);
                }
                triggerDuplicate(); // This will handle the state change
            }
            hideContextMenu(); // Hide menu after initiating duplicate
        }
        function handleContextMenuDelete() {
            if (elementForContextMenu) {
                console.log("Action Menu: Supprimer");
                 // Ensure the element is selected before deleting
                if (selectedElement !== elementForContextMenu) {
                     selectElement(elementForContextMenu);
                }
                deleteSelectedElement(); // This will handle deselection
            }
            hideContextMenu(); // Hide menu after deletion
        }


        // --- Element Data and Geometry ---

        /** Populates the element selection dropdown */
        function populateElementSelector() {
            elementSelect.innerHTML = ''; // Clear existing options

            // Add the "Custom" option first
            const customOption = document.createElement('option');
            customOption.value = CUSTOM_ELEMENT_ID;
            customOption.textContent = "[ Élément Personnalisé ]";
            elementSelect.appendChild(customOption);

            // Add predefined element types
            for (const id in elementTypes) {
                const type = elementTypes[id];
                const [w, h, d] = type.dim; // width, height, depth
                const option = document.createElement('option');
                option.value = id;
                option.textContent = `${type.name} (${w} x ${h} x ${d} cm)`;
                elementSelect.appendChild(option);
            }

            // Set the initial selection (first predefined element or custom if none exist)
            const firstPredefinedId = Object.keys(elementTypes)[0];
            if (firstPredefinedId) {
                selectedElementTypeId = firstPredefinedId;
                elementSelect.value = selectedElementTypeId;
            } else {
                selectedElementTypeId = CUSTOM_ELEMENT_ID;
                elementSelect.value = selectedElementTypeId;
            }
        }

        /**
         * Gets the element type definition based on the current selection in the dropdown or custom inputs.
         * Used when preparing to add a new element.
         * @returns {object | null} The element type definition {name, dim, color, isCustom?} or null if invalid.
         */
        function getElementTypeForAdd() {
            if (selectedElementTypeId === CUSTOM_ELEMENT_ID) {
                // Get dimensions from custom input fields
                const w = parseFloat(customWidthInput.value);
                const h = parseFloat(customHeightInput.value);
                const d = parseFloat(customDepthInput.value);
                const name = customNameInput.value.trim() || "Personnalisé"; // Default name if empty

                // Validate custom dimensions
                if (isNaN(w) || w <= 0 || isNaN(h) || h <= 0 || isNaN(d) || d <= 0) {
                    console.warn("Dimensions personnalisées invalides.");
                    alert("Les dimensions personnalisées (L, H, P) doivent être des nombres positifs.");
                    return null; // Invalid custom dimensions
                }
                return { name: name, dim: [w, h, d], color: DEFAULT_CUSTOM_COLOR, isCustom: true };
            } else {
                // Get from predefined types
                const type = elementTypes[selectedElementTypeId];
                 if (!type) {
                     console.error(`Type d'élément sélectionné introuvable: ${selectedElementTypeId}`);
                     return null;
                 }
                return { ...type, isCustom: false }; // Return a copy
            }
        }

        /**
         * Gets the element type definition for the currently selected element in the scene.
         * Used for actions like move or duplicate where the source is an existing element.
         * @returns {object | null} The element type definition {name, dim, color, isCustom?, originalTypeId?} or null if no valid selection.
         */
        function getElementTypeForSelected() {
            if (!selectedElement) return null;

            if (selectedElement.typeId === CUSTOM_ELEMENT_ID) {
                // It's a custom element placed previously
                if (!selectedElement.customDimensions) {
                    console.error("Données de dimensions personnalisées manquantes pour l'élément sélectionné:", selectedElement.id);
                    return null;
                }
                return {
                    name: selectedElement.customName || "Personnalisé",
                    dim: selectedElement.customDimensions,
                    color: DEFAULT_CUSTOM_COLOR, // Use default custom color, or could store original color if needed
                    isCustom: true,
                    originalTypeId: selectedElement.typeId // Keep track that it was originally custom
                };
            } else {
                // It's a predefined element
                const type = elementTypes[selectedElement.typeId];
                if (!type) {
                    console.error(`Type d'élément prédéfini introuvable pour l'élément sélectionné: ${selectedElement.typeId}`);
                    return null;
                }
                // Return a copy of the type definition, marking it as not custom
                return { ...type, isCustom: false, originalTypeId: selectedElement.typeId };
            }
        }

        /** Updates the geometry and color of the ghost element based on the current tool and selection */
        function updateGhostGeometry() {
            let elementType = null;

            // Determine which element type to use for the ghost
            if (currentTool === 'add') {
                elementType = getElementTypeForAdd();
            } else if ((currentTool === 'move' || currentTool === 'duplicate') && selectedElement) {
                elementType = getElementTypeForSelected();
            } else {
                // No ghost needed for other tools or states
                ghostElement.visible = false;
                return;
            }

            // If no valid type could be determined, hide the ghost
            if (!elementType) {
                console.warn("Impossible d'obtenir le type d'élément pour le fantôme.");
                ghostElement.visible = false;
                return;
            };

            const [widthCm, heightCm, depthCm] = elementType.dim;

            // Check if geometry needs updating (avoids unnecessary recreation)
            if (!ghostElement.geometry ||
                Math.abs(ghostElement.geometry.parameters.width - widthCm) > 0.01 ||
                Math.abs(ghostElement.geometry.parameters.height - heightCm) > 0.01 ||
                Math.abs(ghostElement.geometry.parameters.depth - depthCm) > 0.01)
            {
                if (ghostElement.geometry) {
                    ghostElement.geometry.dispose(); // Dispose old geometry to free memory
                }
                // Create new geometry with correct dimensions
                ghostElement.geometry = new THREE.BoxGeometry(widthCm, heightCm, depthCm);
                console.log(`Géométrie fantôme mise à jour: ${widthCm}x${heightCm}x${depthCm}`);
            }

            // Update ghost color
            if ((currentTool === 'move' || currentTool === 'duplicate') && selectedElement && selectedElement.mesh.material) {
                // Match the color of the element being moved/duplicated
                ghostElement.material.color.copy(selectedElement.mesh.material.color);
            } else {
                // Default green color for adding new elements
                ghostElement.material.color.setHex(0x00ff00);
            }
            ghostElement.material.needsUpdate = true; // Ensure material changes are applied

            // Update ghost rotation
            if ((currentTool === 'move' || currentTool === 'duplicate') && selectedElement) {
                // Match the rotation of the element being moved/duplicated
                ghostElement.rotation.copy(selectedElement.mesh.rotation);
            } else if (currentTool === 'add') {
                // Reset rotation when adding a new element (unless already positioning)
                 if (addState === 'idle') {
                     ghostElement.rotation.set(0, 0, 0);
                 } // Keep current rotation if already positioning
            }

            // Ensure ghost is visible if geometry was updated successfully
            // Visibility is primarily controlled by updateGhostPosition and tool state changes
            // ghostElement.visible = true; // Might make it flash visible briefly sometimes
        }


        // --- Snapping Logic ---

        /**
         * Snaps a horizontal coordinate (X or Z) based on grid/joint size.
         * Snapping occurs relative to the center of the element.
         * @param {number} value - The raw coordinate value (center).
         * @param {number} dimension - The size of the element along that axis.
         * @param {number} joint - The joint thickness.
         * @returns {number} The snapped coordinate value (center).
         */
        function snapToGridXZ(value, dimension, joint) {
            // Basic grid snapping - adjust as needed for more complex logic
            // Snapping increment could be based on joint size or a fixed grid
            const snapIncrement = Math.max(0.1, joint > 0 ? joint : 1.0); // Use joint or 1cm minimum
            // Snap the center position
            const snappedCenter = Math.round(value / snapIncrement) * snapIncrement;
            return snappedCenter;
            // Alternative: Snap the edge?
            // const edge = value - dimension / 2;
            // const snappedEdge = Math.round(edge / snapIncrement) * snapIncrement;
            // return snappedEdge + dimension / 2;
        }

        /**
         * Snaps the vertical position (bottom edge) of an element based on the active assise height.
         * If "Pose Libre" is active, no snapping occurs based on assise.
         * @param {number} targetBottomY - The desired bottom Y position (e.g., top of element below + joint).
         * @param {number} elementHeight - The height of the element being placed/moved.
         * @returns {number} The snapped bottom Y coordinate.
         */
        function snapVerticalPosition(targetBottomY, elementHeight) {
            const activeAssiseH = getActiveAssiseHeight(); // Get the height constraint from the active assise

            // If Pose Libre is active or assise height is invalid, don't snap based on assise
            if (activeAssiseH === null || activeAssiseH <= 0) {
                // Return the target Y, potentially snapping to a base grid or minimum height later if needed
                return Math.max(0, targetBottomY); // Ensure it doesn't go below Y=0
            }

            // Snap the target bottom Y to the nearest multiple of the active assise height
            // Ensure we snap upwards if exactly between steps? Or round to nearest? Rounding is simpler.
            const snappedBottomY = Math.round(targetBottomY / activeAssiseH) * activeAssiseH;

            // Debug log (optional)
            // console.log(`Snap Vertical Assise: TargetY=${targetBottomY.toFixed(1)}, ActiveAssiseH=${activeAssiseH.toFixed(1)}, SnappedY=${snappedBottomY.toFixed(1)}`);

            return Math.max(0, snappedBottomY); // Ensure snapped position is not below Y=0
        }


        // --- Raycasting and Ghost Positioning ---

        /**
         * Calculates the snapped position based on a raycaster intersection.
         * Used by both updateGhostPosition and the click handler in onPointerUp.
         * @param {THREE.Intersection} intersection - The intersection result from the raycaster.
         * @returns {THREE.Vector3 | null} The calculated and snapped center position for the ghost, or null if invalid.
         */
        function calculateSnappedPosition(intersection) {
             if (!intersection || !ghostElement.geometry || !ghostElement.geometry.parameters) {
                 console.warn("calculateSnappedPosition: Intersection or ghost geometry invalid.");
                 return null;
             }

             const point = intersection.point;
             const object = intersection.object;
             const { width: ghostWidth, height: ghostHeight, depth: ghostDepth } = ghostElement.geometry.parameters;

             // Determine Base Y Position
             let topYBelow = 0;
             if (object && !object.userData.isGround && object.geometry && object.geometry.parameters) {
                 topYBelow = object.position.y + object.geometry.parameters.height / 2;
             }
             const potentialBottomY = topYBelow + jointThicknessCm;

             // Snap Vertical Position
             const snappedBottomY = snapVerticalPosition(potentialBottomY, ghostHeight);
             const targetCenterY = snappedBottomY + ghostHeight / 2;

             // Determine Horizontal Position
             const targetPoint = point.clone();
             const snappedCenterX = snapToGridXZ(targetPoint.x, ghostWidth, jointThicknessCm);
             const snappedCenterZ = snapToGridXZ(targetPoint.z, ghostDepth, jointThicknessCm);

             return new THREE.Vector3(snappedCenterX, targetCenterY, snappedCenterZ);
        }


        /**
         * Updates the position and visibility of the ghost element based on pointer intersection.
         * Applies snapping logic (horizontal and vertical based on assise).
         * @param {PointerEvent} event - The pointer move event.
         */
        function updateGhostPosition(event) {
            // Only update ghost if in a relevant tool state
            if (!((currentTool === 'add' && addState === 'idle') || // Ready to place first click
                  (currentTool === 'move' && moveState === 'moving') || // Actively moving
                  (currentTool === 'duplicate' && selectedElement))) { // Ready to place duplicate
                if (ghostElement.visible) {
                     // console.log("Ghost hidden: Incorrect tool state."); // DEBUG
                     ghostElement.visible = false; // Ensure ghost is hidden otherwise
                }
                return;
            }

            // Calculate normalized pointer coordinates
            const rect = renderer.domElement.getBoundingClientRect();
            pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

            // Update the raycaster
            raycaster.setFromCamera(pointer, camera);

            // Determine objects to check for intersection
            const activeObjectsToRaycast = objectsToRaycast.filter(obj =>
                !selectedElement || obj !== selectedElement.mesh || currentTool !== 'move'
            );

            const intersects = raycaster.intersectObjects(activeObjectsToRaycast, false); // Don't check children

            if (intersects.length > 0) {
                 const snappedPosition = calculateSnappedPosition(intersects[0]);
                 if (snappedPosition) {
                     ghostElement.position.copy(snappedPosition);
                     if (!ghostElement.visible) {
                         // console.log("Ghost made visible at:", ghostElement.position); // DEBUG
                         ghostElement.visible = true;
                     }
                 } else {
                      // Calculation failed, hide ghost
                      if (ghostElement.visible) ghostElement.visible = false;
                 }
            } else {
                // No intersection, hide the ghost
                 if (ghostElement.visible) {
                    // console.log("Ghost hidden: No intersection."); // DEBUG
                    ghostElement.visible = false;
                 }
            }
        }


        // --- Element Actions (Place, Rotate, Delete, Move, Duplicate) ---

        /**
         * Creates and adds a new element mesh to the scene and internal tracking.
         * @param {object} elementType - The type definition of the element to place.
         * @param {THREE.Vector3} position - The center position for the new element.
         * @param {THREE.Euler} rotation - The rotation for the new element.
         * @returns {object | null} The data object of the newly placed element or null on failure.
         */
        function placeElement(elementType, position, rotation) {
            if (!elementType || !elementType.dim || elementType.dim.length !== 3) {
                console.error("placeElement: Type d'élément invalide ou dimensions manquantes.", elementType);
                return null;
            }

            const [widthCm, heightCm, depthCm] = elementType.dim;

            // Create geometry and material
            const geometry = new THREE.BoxGeometry(widthCm, heightCm, depthCm);
            const material = new THREE.MeshStandardMaterial({
                color: elementType.color || DEFAULT_CUSTOM_COLOR, // Use defined color or default
                roughness: 0.8,
                metalness: 0.1,
                emissive: 0x000000 // Start with no emissive color
            });
            material.userData.originalEmissive = 0x000000; // Store the base emissive color

            // Create mesh
            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.copy(position);
            if (rotation) {
                mesh.rotation.copy(rotation);
            }
            mesh.castShadow = true; // Element casts shadows
            mesh.receiveShadow = true; // Element receives shadows

            // Determine the type ID to store (predefined ID or CUSTOM_ELEMENT_ID)
            let storedTypeId = CUSTOM_ELEMENT_ID;
            if (!elementType.isCustom) {
                // Find the original ID from the elementTypes map based on properties
                // This assumes names and dimensions are unique enough for predefined types
                const foundId = Object.keys(elementTypes).find(key =>
                    elementTypes[key].name === elementType.name &&
                    elementTypes[key].dim.every((dim, i) => Math.abs(dim - elementType.dim[i]) < 0.01) // Compare dims with tolerance
                );
                 storedTypeId = foundId || elementType.originalTypeId || selectedElementTypeId; // Fallback logic
                 if (!foundId) console.warn(`Could not find original ID for ${elementType.name, using fallback: ${storedTypeId}`);
            }

            // Create data object for tracking
            const elementData = {
                id: nextElementId++,
                typeId: storedTypeId, // Store the determined ID
                mesh: mesh,
                // Store custom dimensions and name only if it's a custom element
                ...(elementType.isCustom && {
                    customDimensions: [...elementType.dim], // Store a copy
                    customName: elementType.name
                })
            };

            // Add to scene and tracking arrays
            placedElements.push(elementData);
            scene.add(mesh);
            objectsToRaycast.push(mesh); // Add to raycasting targets

            console.log(`Élément placé: ID=${elementData.id}, TypeID=${elementData.typeId}, Total=${placedElements.length}`);
            return elementData; // Return the data object
        }

        /** Rotates the currently selected element by ROTATION_INCREMENT around the Y axis */
        function rotateSelectedElement() {
            if (!selectedElement) {
                console.warn("Rotation sélection annulée: aucun élément n'est sélectionné.");
                return;
            }
            console.log(`Rotation sélection ${selectedElement.id} de ${THREE.MathUtils.radToDeg(ROTATION_INCREMENT)}°`);
            selectedElement.mesh.rotateY(ROTATION_INCREMENT);

            // If ghost is visible (e.g., during move/duplicate), update its rotation too
            if (ghostElement.visible && (currentTool === 'move' || currentTool === 'duplicate')) {
                ghostElement.rotation.copy(selectedElement.mesh.rotation);
            }
        }

        /** Deletes the currently selected element */
        function deleteSelectedElement() {
            if (!selectedElement) {
                console.warn("Suppression annulée: aucun élément n'est sélectionné.");
                return;
            }
            const elementToDelete = selectedElement; // Keep reference for cleanup
            const deletedId = elementToDelete.id;
            console.log(`Suppression élément ${deletedId}`);

            // Remove from scene
            scene.remove(elementToDelete.mesh);

            // Remove from raycasting targets
            const raycastIndex = objectsToRaycast.indexOf(elementToDelete.mesh);
            if (raycastIndex > -1) {
                objectsToRaycast.splice(raycastIndex, 1);
            } else {
                 console.warn(`Mesh de l'élément ${deletedId} non trouvé dans objectsToRaycast.`);
            }

            // Remove from placed elements array
            const placedIndex = placedElements.findIndex(el => el.id === deletedId);
            if (placedIndex > -1) {
                placedElements.splice(placedIndex, 1);
            } else {
                 console.warn(`Data de l'élément ${deletedId} non trouvé dans placedElements.`);
            }

            // Dispose of geometry and material to free GPU memory
            if (elementToDelete.mesh.geometry) {
                 elementToDelete.mesh.geometry.dispose();
                 // console.log(`Geometry disposed for element ${deletedId}`);
            }
            if (elementToDelete.mesh.material) {
                 // Check if material is shared before disposing? For now, assume unique materials per element.
                 elementToDelete.mesh.material.dispose();
                 // console.log(`Material disposed for element ${deletedId}`);
            }

            // Clear selection state AFTER cleanup
            selectedElement = null;
            originalMovePosition = null; // Ensure this is cleared

            updateUIToolStates(); // Update UI (buttons should disable)
            updateInfoText(); // Update info text
            console.log(`Élément ${deletedId} supprimé. Total restant: ${placedElements.length}`);
        }

        /** Initiates the move operation for the selected element */
        function triggerMove() {
            if (!selectedElement) return;
            console.log(`Déclenchement Déplacer pour ${selectedElement.id}`);

            // Store the starting position for cancellation
            originalMovePosition = selectedElement.mesh.position.clone();

            // Set the tool and state
            setActiveTool('move'); // This now handles resetting other states
            moveState = 'moving';

            // Prepare the ghost element
            updateGhostGeometry(); // Set ghost size/color/rotation to match selected
            ghostElement.position.copy(selectedElement.mesh.position); // Start ghost at current position
            ghostElement.visible = true;

            // Hide the original mesh
            selectedElement.mesh.visible = false;

            // Show placement controls
            placementControlsDiv.style.display = 'flex';

            // Update UI states and info
            updateUIToolStates();
            updateInfoText();
            updateCursor();
        }

        /** Initiates the duplicate operation for the selected element */
        function triggerDuplicate() {
             if (!selectedElement) return;
             console.log(`Déclenchement Dupliquer pour ${selectedElement.id}`);

             // Set the tool state (no specific 'duplicateState' needed, just the tool)
             setActiveTool('duplicate'); // This handles resetting other states

             // Prepare the ghost element
             updateGhostGeometry(); // Set ghost size/color/rotation to match selected
             // Start ghost slightly offset from the original position
             ghostElement.position.copy(selectedElement.mesh.position).add(new THREE.Vector3(10, 0, 0)); // Offset X by 10cm
             ghostElement.visible = true;

             // Keep the original mesh visible
             selectedElement.mesh.visible = true;

             // Hide placement controls (not used for duplicate click-placement)
             placementControlsDiv.style.display = 'none';

             // Update UI states and info
             updateUIToolStates();
             updateInfoText();
             updateCursor(); // Should show crosshair
        }

         /** Places a new element based on the ghost's position during a duplicate operation */
         function placeDuplicateElement() {
             if (currentTool !== 'duplicate' || !selectedElement || !ghostElement.visible) {
                 console.warn("placeDuplicateElement appelé dans un état incorrect.");
                 return;
             }
             console.log(`Placement de la copie de ${selectedElement.id}`);
             const elementType = getElementTypeForSelected(); // Get type definition from the original selected element
             if (!elementType) {
                 console.error("Impossible d'obtenir le type de l'élément original pour la duplication.");
                 setActiveTool('select'); // Revert to select tool on error
                 return;
             }

             // Place the new element using the ghost's current position and rotation
             const newElement = placeElement(elementType, ghostElement.position, ghostElement.rotation);

             if (newElement) {
                  // After successful placement, select the newly created element
                  selectElement(newElement);
             }

             // Revert to select tool after placing the duplicate
             setActiveTool('select');
         }


        // --- DPad Placement/Move Actions ---

        /**
         * Moves the ghost element horizontally using DPad/arrow keys.
         * @param {number} dx - Change in X.
         * @param {number} dy - Change in Y (typically 0 for horizontal).
         * @param {number} dz - Change in Z.
         */
        function moveGhostWithDPad(dx, dy, dz) {
            if (ghostElement.visible && ((currentTool === 'add' && addState === 'positioning') || (currentTool === 'move' && moveState === 'moving'))) {
                ghostElement.position.x += dx;
                ghostElement.position.y += dy; // Allow vertical if needed, though usually handled by moveGhostWithDPadY
                ghostElement.position.z += dz;
                // Optional: Re-snap after manual DPad move? Could be jerky.
                // const { height: ghostHeight } = ghostElement.geometry.parameters;
                // const snappedBottomY = snapVerticalPosition(ghostElement.position.y - ghostHeight / 2, ghostHeight);
                // ghostElement.position.y = snappedBottomY + ghostHeight / 2;
            }
        }

        /**
         * Moves the ghost element vertically using the vertical DPad buttons or PageUp/PageDown.
         * Respects the active assise height for the increment.
         * @param {number} direction - 1 for up, -1 for down.
         */
        function moveGhostWithDPadY(direction) {
             if (ghostElement.visible && ((currentTool === 'add' && addState === 'positioning') || (currentTool === 'move' && moveState === 'moving'))) {
                 const activeAssiseH = getActiveAssiseHeight();
                 const { height: ghostHeight } = ghostElement.geometry.parameters;

                 // Determine the vertical increment: use assise height if defined, otherwise use default DPad increment
                 const incrementY = (activeAssiseH !== null && activeAssiseH > 0) ? activeAssiseH : DPAD_INCREMENT_CM;

                 // Calculate the new target bottom Y position
                 const currentBottomY = ghostElement.position.y - ghostHeight / 2;
                 let newBottomY = currentBottomY + (direction * incrementY);

                 // Ensure the new position doesn't go below zero
                 newBottomY = Math.max(0, newBottomY);

                 // If an assise is active, snap the *resulting* position just in case the increment wasn't exact
                 // (Though it should be if incrementY is the assise height)
                 const snappedBottomY = snapVerticalPosition(newBottomY, ghostHeight);

                 // Set the new center Y position based on the snapped bottom Y
                 ghostElement.position.y = snappedBottomY + ghostHeight / 2;

                 console.log(`DPad move Y: Direction=${direction}, Increment=${incrementY.toFixed(1)}, NewCenterY=${ghostElement.position.y.toFixed(1)}`);
             }
        }

        /**
         * Rotates the ghost element using rotation buttons or Q/E keys.
         * @param {number} angle - The rotation angle (in radians).
         */
        function rotateGhost(angle) {
            if (ghostElement.visible && ((currentTool === 'add' && addState === 'positioning') || (currentTool === 'move' && moveState === 'moving'))) {
                ghostElement.rotateY(angle);
                console.log("Rotation Fantôme:", THREE.MathUtils.radToDeg(ghostElement.rotation.y).toFixed(0) + "°");
            }
        }

        /** Confirms the placement of a new element */
        function confirmAddPlacement() {
            if (currentTool === 'add' && addState === 'positioning' && ghostElement.visible) {
                console.log("Confirmation placement ADD.");
                const elementType = getElementTypeForAdd(); // Get the type definition
                if (elementType) {
                    const newElement = placeElement(elementType, ghostElement.position, ghostElement.rotation);
                     if (newElement) {
                         // Optional: Select the newly placed element? Or keep tool active?
                         // selectElement(newElement);
                         // setActiveTool('select'); // Switch back to select after placement
                         // Keep 'add' tool active, reset state to idle for next placement
                         addState = 'idle';
                         ghostElement.visible = false; // Hide ghost until next pointer move
                         placementControlsDiv.style.display = 'none';
                         updateUIToolStates();
                         updateInfoText();
                         updateCursor(); // Set cursor back to crosshair for add tool
                         return; // Success
                     }
                }
                 // If placement failed (invalid type or placeElement error)
                 console.error("Échec du placement de l'élément.");
                 // Optionally revert state or show error
                 cancelAddPlacement(); // Cancel if placement failed
            }
        }

        /** Cancels the current add placement operation */
        function cancelAddPlacement() {
            if (currentTool === 'add' && addState === 'positioning') {
                console.log("Annulation placement ADD.");
                addState = 'idle'; // Reset state
                ghostElement.visible = false; // Hide ghost
                placementControlsDiv.style.display = 'none'; // Hide DPad controls
                updateUIToolStates();
                updateInfoText();
                updateCursor(); // Update cursor for 'add idle' state
            }
        }

        /** Confirms the new position of a moved element */
        function confirmMovePlacement() {
            if (currentTool === 'move' && moveState === 'moving' && selectedElement && ghostElement.visible) {
                console.log("Confirmation placement MOVE.");
                // Apply the ghost's position and rotation to the actual element
                selectedElement.mesh.position.copy(ghostElement.position);
                selectedElement.mesh.rotation.copy(ghostElement.rotation);
                selectedElement.mesh.visible = true; // Make the element visible again

                // Reset state
                moveState = 'idle';
                originalMovePosition = null; // Clear the original position
                ghostElement.visible = false; // Hide ghost
                placementControlsDiv.style.display = 'none'; // Hide DPad

                // Important: Switch back to select tool AFTER confirming move
                setActiveTool('select');
                // Ensure the moved element remains selected after confirmation
                // selectElement(selectedElement); // setActiveTool('select') might deselect, so re-select if needed. Check setActiveTool logic.
                 // Let's test if setActiveTool('select') keeps the selection. If not, uncomment the line above.
            }
        }

        /** Cancels the current move operation, restoring the element's original position */
        function cancelMovePlacement() {
            if (currentTool === 'move' && moveState === 'moving' && selectedElement) {
                console.log("Annulation placement MOVE.");
                // Restore original position if available
                if (originalMovePosition) {
                    selectedElement.mesh.position.copy(originalMovePosition);
                } else {
                    console.warn("Position originale non disponible pour l'annulation du déplacement.");
                }
                selectedElement.mesh.visible = true; // Make element visible again

                // Reset state
                moveState = 'idle';
                originalMovePosition = null;
                ghostElement.visible = false;
                placementControlsDiv.style.display = 'none';

                // Important: Switch back to select tool AFTER cancelling move
                setActiveTool('select');
                // Keep the element selected after cancelling the move
                // selectElement(selectedElement); // As above, check if needed after setActiveTool.
            }
        }


        // --- Event Handlers ---

        /** Handles window resize events */
        function onWindowResize() {
            // Update camera aspect ratio
            camera.aspect = viewportContainer.clientWidth / viewportContainer.clientHeight;
            camera.updateProjectionMatrix();

            // Update renderer size
            renderer.setSize(viewportContainer.clientWidth, viewportContainer.clientHeight);
            // No need to re-render explicitly here, the animation loop handles it
        }

        /** Handles pointer down events (mouse click, touch start) */
        function onPointerDown(event) {
            // Ignore clicks on UI elements overlaying the viewport
            if (toolbar.contains(event.target) || placementControlsDiv.contains(event.target) || contextMenu.contains(event.target)) {
                return;
            }

            // Check if the click is within the renderer's canvas bounds
            const rect = renderer.domElement.getBoundingClientRect();
            const isClickInsideViewport = event.clientX >= rect.left && event.clientX <= rect.right &&
                                          event.clientY >= rect.top && event.clientY <= rect.bottom;
            if (!isClickInsideViewport) return;

            // Prevent default browser actions (like text selection, image drag)
            // event.preventDefault(); // Careful: This might interfere with OrbitControls panning/dragging

            isDragging = false; // Reset drag flag
            pointerDownTime = Date.now(); // Record time for click vs long press detection
            pointerDownCoords = { x: event.clientX, y: event.clientY }; // Record start coords for drag detection

            clearTimeout(longPressTimer); // Clear any existing long press timer
            hideContextMenu(); // Hide context menu on any new click

            // Enable OrbitControls only if in select mode
            // controls.enabled = (currentTool === 'select'); // Moved to setActiveTool

            // If in select mode, start long press timer for context menu
            if (currentTool === 'select') {
                // Calculate pointer coords immediately for potential raycast
                pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
                pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
                raycaster.setFromCamera(pointer, camera);

                const placedMeshes = placedElements.map(el => el.mesh).filter(mesh => mesh);
                const intersects = raycaster.intersectObjects(placedMeshes, false);

                if (intersects.length > 0) {
                    const intersectedObject = intersects[0].object;
                    const elementData = placedElements.find(el => el.mesh === intersectedObject);

                    if (elementData) {
                        // Start timer only if an element is clicked
                        longPressTimer = setTimeout(() => {
                            // Check if pointer moved significantly during the hold
                            const distanceMoved = Math.sqrt(
                                Math.pow(event.clientX - pointerDownCoords.x, 2) +
                                Math.pow(event.clientY - pointerDownCoords.y, 2)
                            );
                            if (distanceMoved < DRAG_THRESHOLD_PX) {
                                console.log("Appui long détecté sur", elementData.id);
                                showContextMenu(event, elementData); // Show context menu
                                pointerDownTime = 0; // Prevent click action on pointerUp after long press
                            } else {
                                console.log("Appui long annulé par mouvement.");
                            }
                        }, LONG_PRESS_THRESHOLD);
                    }
                }
            }
        }

        /** Handles pointer move events (mouse move, touch move) */
        function onPointerMove(event) {
            // --- Drag Detection ---
            // Check if pointer button is down and we haven't already started dragging
            if (event.buttons > 0 && pointerDownTime > 0 && !isDragging) { // Check pointerDownTime to ensure button is still held from our start
                const distanceMoved = Math.sqrt(
                    Math.pow(event.clientX - pointerDownCoords.x, 2) +
                    Math.pow(event.clientY - pointerDownCoords.y, 2)
                );
                if (distanceMoved >= DRAG_THRESHOLD_PX) {
                    isDragging = true; // Set drag flag
                    clearTimeout(longPressTimer); // Cancel long press if dragging starts
                    hideContextMenu(); // Hide context menu if dragging starts
                    console.log("Début du glissement (drag).");
                    // If dragging starts during placement/move, maybe hide the ghost?
                    if (ghostElement.visible && ( (currentTool === 'add' && addState === 'positioning') || (currentTool === 'move' && moveState === 'moving') )) {
                         // ghostElement.visible = false; // Decide if this is desired behavior
                    }
                }
            }

            // --- Ghost Positioning ---
            // Only update ghost position if NOT dragging (OrbitControls handles drag)
            // and if in a relevant tool state.
            if (!isDragging) {
                 if ((currentTool === 'add' && addState === 'idle') || // Update ghost while hovering before first click
                     (currentTool === 'move' && moveState === 'moving') || // Update ghost while actively moving
                     (currentTool === 'duplicate' && selectedElement)) { // Update ghost while hovering to place duplicate
                     updateGhostPosition(event);
                 }
            } else {
                 // If dragging, ensure ghost is hidden if it was visible due to placement/move state
                 if (ghostElement.visible && ( (currentTool === 'add' && addState === 'positioning') || (currentTool === 'move' && moveState === 'moving') )) {
                     // ghostElement.visible = false; // Hiding ghost during orbit might feel weird, maybe keep it? Test usability.
                 }
            }
        }

        /** Handles pointer up events (mouse release, touch end) */
        function onPointerUp(event) {
            clearTimeout(longPressTimer); // Clear long press timer

            // Ignore if the release happens over UI elements
            if (toolbar.contains(event.target) || placementControlsDiv.contains(event.target) || contextMenu.contains(event.target)) {
                isDragging = false; // Reset drag flag even if released over UI
                pointerDownTime = 0; // Reset timer
                return;
            }

            const clickDuration = Date.now() - pointerDownTime;
            const rect = renderer.domElement.getBoundingClientRect();
            const isClickInsideViewport = event.clientX >= rect.left && event.clientX <= rect.right &&
                                          event.clientY >= rect.top && event.clientY <= rect.bottom;

            // Process as a 'click' only if it was inside the viewport, not a drag,
            // and shorter than the long press threshold (and pointerDownTime is valid).
            if (isClickInsideViewport && !isDragging && clickDuration < LONG_PRESS_THRESHOLD && pointerDownTime !== 0) {
                console.log("Click détecté.");
                // Calculate pointer coordinates for raycasting
                pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
                pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
                raycaster.setFromCamera(pointer, camera);

                // --- Handle Click Actions Based on Tool ---
                if (currentTool === 'select') {
                    const placedMeshes = placedElements.map(el => el.mesh).filter(mesh => mesh);
                    const intersects = raycaster.intersectObjects(placedMeshes, false);
                    if (intersects.length > 0) {
                        const elementData = placedElements.find(el => el.mesh === intersects[0].object);
                        if (elementData) {
                            selectElement(elementData); // Select the clicked element
                        } else {
                             console.warn("Intersection trouvée mais données élément correspondantes manquantes.");
                             deselectElement(); // Deselect if data is inconsistent
                        }
                    } else {
                        deselectElement(); // Clicked on background, deselect
                    }
                } else if (currentTool === 'add') {
                    // MODIFICATION START: Handle click for 'add' tool more robustly
                    if (addState === 'idle') {
                        // Raycast from the click position to see if it hits a valid surface
                        const activeObjectsToRaycast = objectsToRaycast.filter(obj =>
                            !selectedElement || obj !== selectedElement.mesh // Should always be true in add mode
                        );
                        const intersects = raycaster.intersectObjects(activeObjectsToRaycast, false);

                        if (intersects.length > 0) {
                             // Calculate the snapped position based on the click intersection
                             const snappedPosition = calculateSnappedPosition(intersects[0]);

                             if (snappedPosition) {
                                 console.log("Premier clic valide pour ajouter, passage en positionnement.");
                                 addState = 'positioning';
                                 updateGhostGeometry(); // Ensure ghost has correct geometry/material
                                 ghostElement.position.copy(snappedPosition); // Position ghost at the clicked spot
                                 ghostElement.visible = true; // Make ghost visible
                                 placementControlsDiv.style.display = 'flex'; // Show DPad
                                 updateUIToolStates();
                                 updateInfoText();
                                 updateCursor(); // Update cursor for positioning state
                             } else {
                                 console.warn("Clic pour ajouter, mais position calculée invalide.");
                             }
                        } else {
                             console.log("Clic pour ajouter, mais n'a pas touché une surface valide.");
                             // Optional: Provide feedback to the user?
                        }
                    } else if (addState === 'positioning') {
                        // Click while already positioning: Ignore, placement is confirmed via button/enter
                        console.log("Clic ignoré en mode positionnement (utiliser ✅ ou Entrée).");
                    }
                    // MODIFICATION END
                } else if (currentTool === 'move') {
                     // Click is generally ignored in move mode (use DPad/Confirm button)
                     console.log("Clic ignoré en mode déplacement (utiliser DPad/✅ ou Entrée).");
                } else if (currentTool === 'duplicate') {
                    if (selectedElement && ghostElement.visible) {
                        // Click while duplicate tool is active: Place the duplicate
                        placeDuplicateElement();
                    } else {
                         // Clicked background or no valid ghost? Revert to select.
                         setActiveTool('select');
                    }
                }
            } else if (isDragging) {
                console.log("Fin du glissement (drag).");
                // No specific action needed on drag end, OrbitControls handles it
            } else if (clickDuration >= LONG_PRESS_THRESHOLD) {
                 // Long press was handled by the timer, do nothing here
                 // console.log("Pointer Up après appui long.");
            }

            // Reset flags and timers
            isDragging = false;
            // controls.enabled = (currentTool === 'select'); // Handled by setActiveTool
            pointerDownTime = 0; // Reset timer after processing up event
        }

        /** Handles changes in the main element selection dropdown */
        function handleElementSelectChange(event) {
            selectedElementTypeId = elementSelect.value;
            // Show/hide custom dimension inputs
            customElementGroup.style.display = (selectedElementTypeId === CUSTOM_ELEMENT_ID) ? 'flex' : 'none';

            // If in 'add' tool idle state, update the ghost geometry preview
            if (currentTool === 'add' && addState === 'idle') {
                updateGhostGeometry();
                ghostElement.visible = false; // Keep ghost hidden until pointer moves over viewport
            }
            // Update UI states (e.g., if custom is selected, maybe disable 'Create Assise'?)
            updateUIToolStates();
            updateInfoText(); // Update info text to reflect new selection for 'Add' mode
        }

        /** Handles changes in the joint thickness input */
        function handleJointThicknessChange(event) {
            const value = parseFloat(event.target.value);
            if (!isNaN(value) && value >= 0) {
                jointThicknessCm = value;
                console.log(`Épaisseur du joint changée à: ${jointThicknessCm} cm`);
                // No immediate visual change needed, but will affect next placement/snap
            } else {
                // Revert to previous value if input is invalid
                event.target.value = jointThicknessCm;
            }
        }

        /** Handles keyboard shortcuts */
        function handleKeyDown(event) {
            // Ignore keyboard events if focus is on an input/select element
            if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'SELECT') {
                return;
            }

            const key = event.key.toLowerCase(); // Use lowercase key

            // --- Global Shortcuts (Escape, Enter, Delete) ---
            if (key === 'escape') {
                event.preventDefault(); // Prevent potential browser default actions
                hideContextMenu();
                if (currentTool === 'add' && addState === 'positioning') {
                    cancelAddPlacement();
                } else if (currentTool === 'move' && moveState === 'moving') {
                    cancelMovePlacement();
                } else if (selectedElement) {
                    deselectElement(); // Deselect if just selected
                }
                return; // Stop further processing
            }

            if (key === 'enter') {
                 // Prevent default form submission if inside one
                event.preventDefault();
                if (currentTool === 'add' && addState === 'positioning') {
                    confirmAddPlacement();
                } else if (currentTool === 'move' && moveState === 'moving') {
                    confirmMovePlacement();
                }
                return; // Stop further processing
            }

            if (key === 'delete' || key === 'backspace') {
                 // Check if delete button is enabled (i.e., element selected and not placing/moving)
                 if (!deleteToolButton.disabled) {
                     event.preventDefault(); // Prevent browser back navigation on backspace
                     deleteSelectedElement();
                 }
                 return; // Stop further processing
            }


            // --- Placement/Move Mode Shortcuts (Arrows, QE, PageUp/Down) ---
            if ((currentTool === 'add' && addState === 'positioning') || (currentTool === 'move' && moveState === 'moving')) {
                let handled = true; // Assume handled unless case falls through
                switch(key) {
                    case 'arrowup':
                    case 'w': // WASD controls optional
                        moveGhostWithDPad(0, 0, -DPAD_INCREMENT_CM); // Move forward (Z-)
                        break;
                    case 'arrowdown':
                    case 's': // WASD controls optional
                        moveGhostWithDPad(0, 0, DPAD_INCREMENT_CM); // Move backward (Z+)
                        break;
                    case 'arrowleft':
                    case 'a': // WASD controls optional
                        moveGhostWithDPad(-DPAD_INCREMENT_CM, 0, 0); // Move left (X-)
                        break;
                    case 'arrowright':
                    case 'd': // WASD controls optional
                        moveGhostWithDPad(DPAD_INCREMENT_CM, 0, 0); // Move right (X+)
                        break;
                    case 'pageup': // Vertical Up
                        moveGhostWithDPadY(1);
                        break;
                    case 'pagedown': // Vertical Down
                        moveGhostWithDPadY(-1);
                        break;
                    case 'q': // Rotate Left
                        rotateGhost(-ROTATION_INCREMENT);
                        break;
                    case 'e': // Rotate Right
                        rotateGhost(ROTATION_INCREMENT);
                        break;
                    default:
                         handled = false; // Key not used in this context
                         break;
                }
                if (handled) {
                     event.preventDefault(); // Prevent default browser action (e.g., scrolling)
                     return; // Stop further processing
                }
            }

            // --- Tool Activation Shortcuts (S, A, M, R, D) ---
            // Check if corresponding button is enabled before activating
            switch(key) {
                case 's': // Select Tool
                     if (!selectToolButton.disabled) setActiveTool('select');
                     break;
                case 'a': // Add Tool
                     if (!addToolButton.disabled) setActiveTool('add');
                     break;
                case 'm': // Move Tool (Trigger)
                     if (!moveToolButton.disabled) triggerMove();
                     break;
                case 'r': // Rotate Action
                     if (!rotateToolButton.disabled) rotateSelectedElement();
                     break;
                case 'd': // Duplicate Tool (Trigger)
                     if (!duplicateToolButton.disabled) triggerDuplicate();
                     break;
                // Add other shortcuts if needed
            }
            // No return here, allow potential browser shortcuts if not handled above
        }

        /** Updates the informational text display at the bottom of the toolbar */
        function updateInfoText() {
            let text = "";
            const activeAssise = assises.find(a => a.id === activeAssiseId);
            const assiseInfo = activeAssise ? ` | Assise: ${activeAssise.name}` + (activeAssise.height !== null ? ` (${activeAssise.height.toFixed(1)} cm)` : '') : '';

            switch(currentTool) {
                case 'select':
                    text = selectedElement ? `Mode: Sélectionné (ID: ${selectedElement.id})` : 'Mode: Sélection / Navigation';
                    text += " (Clic/Appui long, Glisser: Orbiter)";
                    break;
                case 'add':
                    const addType = getElementTypeForAdd();
                    const addName = addType ? addType.name : "Invalide";
                    if (addState === 'positioning') {
                        text = `Positionnement (${addName}): Ajustez (Flèches/PgUpDn), Rotation (QE), puis Placer (✅/Entrée) ou Annuler (❌/Échap)`;
                    } else {
                        text = `Mode: Ajouter (${addName}) - Cliquez/Tapez pour positionner`;
                    }
                    text += assiseInfo; // Add assise info only in add mode
                    break;
                case 'move':
                     if (moveState === 'moving') {
                         const moveName = getElementTypeForSelected()?.name || `ID ${selectedElement?.id}`;
                         text = `Déplacement (${moveName}): Ajustez (Flèches/PgUpDn), Rotation (QE), puis Confirmer (✅/Entrée) ou Annuler (❌/Échap)`;
                          text += assiseInfo; // Add assise info during move
                     } else {
                         text = selectedElement ? `Mode: Déplacer (Prêt pour ID: ${selectedElement.id})` : 'Mode: Déplacer (Sélectionnez d\'abord)';
                     }
                     break;
                case 'duplicate':
                    const dupName = getElementTypeForSelected()?.name || `ID ${selectedElement?.id}`;
                    text = selectedElement ? `Mode: Dupliquer (${dupName}) - Cliquez/Tapez pour placer copie` : 'Mode: Dupliquer (Sélectionnez d\'abord)';
                     text += assiseInfo; // Add assise info for duplicate placement reference
                    break;
                default:
                    text = `Mode: ${currentTool}`;
            }
            infoText.textContent = text;
        }

        // --- Navigation Functions ---

        /** Rotates the camera view horizontally */
        function rotateView(angle) {
            if (!controls || !controls.enabled) return; // Only rotate if controls are enabled
            controls.rotateLeft(angle); // Positive angle rotates left (counter-clockwise from top)
            controls.update(); // Apply the change
        }

        /** Zooms the camera view in or out */
        function zoomView(factor) {
            if (!controls || !controls.enabled) return; // Only zoom if controls are enabled
            if (factor < 1) {
                controls.dollyIn(1 / factor); // dollyIn expects factor > 1 for zooming in
            } else {
                controls.dollyOut(factor); // dollyOut expects factor > 1 for zooming out
            }
            controls.update(); // Apply the change
        }

        // --- Animation Loop ---

        /** The main animation loop, called recursively */
        function animate() {
            requestAnimationFrame(animate); // Request the next frame

            // Update controls only if enabled (prevents damping update when tool != select)
            if (controls.enabled) {
                controls.update(); // Update damping and other control states
            }

            // Render the scene
            renderer.render(scene, camera);
        }

        // --- Save and Load Functions ---

        /**
         * Saves the current state to a JSON file.
         */
        function saveToFile() {
            const state = {
                placedElements: placedElements.map(el => ({
                    id: el.id,
                    typeId: el.typeId,
                    position: el.mesh.position.toArray(),
                    rotation: el.mesh.rotation.toArray(),
                    customDimensions: el.customDimensions || null,
                    customName: el.customName || null
                })),
                nextElementId: nextElementId,
                jointThicknessCm: jointThicknessCm,
                assises: assises,
                activeAssiseId: activeAssiseId
            };

            const json = JSON.stringify(state, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'state.json';
            a.click();
            URL.revokeObjectURL(url);
        }

        /**
         * Loads the state from a JSON file.
         */
        function loadFromFile() {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'application/json';
            input.onchange = async (event) => {
                const file = event.target.files[0];
                if (!file) return;

                const json = await file.text();
                const state = JSON.parse(json);

                // Clear existing elements
                placedElements.forEach(el => {
                    scene.remove(el.mesh);
                    if (el.mesh.geometry) el.mesh.geometry.dispose();
                    if (el.mesh.material) el.mesh.material.dispose();
                });
                placedElements = [];
                objectsToRaycast.length = 0;
                objectsToRaycast.push(groundPlane);

                // Restore state
                state.placedElements.forEach(el => {
                    const elementType = el.typeId === CUSTOM_ELEMENT_ID ? {
                        name: el.customName || "Personnalisé",
                        dim: el.customDimensions,
                        color: DEFAULT_CUSTOM_COLOR,
                        isCustom: true
                    } : elementTypes[el.typeId];

                    const position = new THREE.Vector3().fromArray(el.position);
                    const rotation = new THREE.Euler().fromArray(el.rotation);
                    placeElement(elementType, position, rotation);
                });

                nextElementId = state.nextElementId;
                jointThicknessCm = state.jointThicknessCm;
                jointInput.value = jointThicknessCm;
                assises = state.assises;
                activeAssiseId = state.activeAssiseId;
                populateAssiseSelector();
                assiseSelect.value = activeAssiseId;

                updateUIToolStates();
                updateInfoText();
                updateGhostGeometry();
                updateCursor();
            };
            input.click();
        }

        // --- Initialization ---
        // Wait for the DOM to be fully loaded before initializing Three.js
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
        } else {
            init(); // DOM is already loaded
        }
