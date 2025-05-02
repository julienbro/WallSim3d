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
