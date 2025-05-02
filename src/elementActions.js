import * as THREE from 'three';
import { DEFAULT_CUSTOM_COLOR } from './constants.js';
import { elementTypes } from './elementTypes.js';
import { selectedElement, nextElementId, placedElements, objectsToRaycast, currentTool, addState, moveState, originalMovePosition, ghostElement } from './stateVariables.js';
import { updateUIToolStates, updateInfoText, updateCursor } from './toolUIManager.js';
import { getElementTypeForAdd, getElementTypeForSelected } from './elementDataGeometry.js';
import { selectElement, deselectElement } from './selectionContextMenu.js';

/**
 * Creates and adds a new element mesh to the scene and internal tracking.
 * @param {object} elementType - The type definition of the element to place.
 * @param {THREE.Vector3} position - The center position for the new element.
 * @param {THREE.Euler} rotation - The rotation for the new element.
 * @returns {object | null} The data object of the newly placed element or null on failure.
 */
export function placeElement(elementType, position, rotation) {
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
export function rotateSelectedElement() {
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
export function deleteSelectedElement() {
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
export function triggerMove() {
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
export function triggerDuplicate() {
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
export function placeDuplicateElement() {
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

/** Confirms the placement of a new element */
export function confirmAddPlacement() {
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
export function cancelAddPlacement() {
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
export function confirmMovePlacement() {
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
export function cancelMovePlacement() {
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
