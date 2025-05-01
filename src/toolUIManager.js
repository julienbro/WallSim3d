import { currentTool, addState, moveState, selectedElement, originalMovePosition, ghostElement, placementControlsDiv } from './stateVariables.js';
import { selectElement, deselectElement, hideContextMenu, deleteSelectedElement, rotateSelectedElement, triggerMove, triggerDuplicate, updateGhostGeometry, updateCursor, updateInfoText, updateUIToolStates } from './elementActions.js';
import { controls } from './threeSetup.js';
import { selectToolButton, addToolButton, moveToolButton, rotateToolButton, duplicateToolButton, deleteToolButton, toolButtons, toolbar, btnOrbitLeft, btnOrbitRight, btnZoomIn, btnZoomOut, createAssiseButton } from './domElements.js';
import { rotateView, zoomView } from './navigationFunctions.js';

/**
 * Sets the active tool and updates UI accordingly.
 * @param {string} toolName - The name of the tool to activate ('select', 'add', 'move', 'duplicate').
 */
export function setActiveTool(toolName) {
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
export function updateUIToolStates() {
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
export function updateCursor() {
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
export function handleToolbarClick(event) {
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
