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
