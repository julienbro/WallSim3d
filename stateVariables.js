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

// Three.js Core Components
let scene, camera, renderer, controls, raycaster, pointer, axesHelper, gridHelper; // Added gridHelper here
let groundPlane, ghostElement; // Ghost element for placement preview
const objectsToRaycast = []; // Array of objects the raycaster should check against (ground + placed elements)
