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
