import { currentTool, addState, moveState, selectedElement, originalMovePosition, ghostElement, placementControlsDiv, isDragging, pointerDownTime, pointerDownCoords, longPressTimer, elementForContextMenu, placedElements, objectsToRaycast } from './stateVariables.js';
import { selectElement, deselectElement, showContextMenu, hideContextMenu, handleContextMenuRotate, handleContextMenuMove, handleContextMenuDuplicate, handleContextMenuDelete } from './selectionContextMenu.js';
import { updateGhostPosition, calculateSnappedPosition } from './raycastingGhostPositioning.js';
import { confirmAddPlacement, cancelAddPlacement, confirmMovePlacement, cancelMovePlacement, placeDuplicateElement, rotateSelectedElement, deleteSelectedElement, triggerMove, triggerDuplicate } from './elementActions.js';
import { updateUIToolStates, updateInfoText, updateCursor } from './toolUIManager.js';
import { controls, camera, renderer, raycaster, pointer } from './threeSetup.js';
import { elementSelect, jointInput, toolbar, placementControlsDiv, contextMenu, selectToolButton, addToolButton, moveToolButton, rotateToolButton, duplicateToolButton, deleteToolButton, customElementGroup, customWidthInput, customHeightInput, customDepthInput, customNameInput, assiseSelect, createAssiseButton } from './domElements.js';
import { getElementTypeForAdd } from './elementDataGeometry.js';
import { DPAD_INCREMENT_CM, ROTATION_INCREMENT, LONG_PRESS_THRESHOLD, DRAG_THRESHOLD_PX, CUSTOM_ELEMENT_ID } from './constants.js';
import { rotateView, zoomView } from './navigationFunctions.js';

/** Handles window resize events */
export function onWindowResize() {
    // Update camera aspect ratio
    camera.aspect = viewportContainer.clientWidth / viewportContainer.clientHeight;
    camera.updateProjectionMatrix();

    // Update renderer size
    renderer.setSize(viewportContainer.clientWidth / viewportContainer.clientHeight);
    // No need to re-render explicitly here, the animation loop handles it
}

/** Handles pointer down events (mouse click, touch start) */
export function onPointerDown(event) {
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
export function onPointerMove(event) {
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
export function onPointerUp(event) {
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
export function handleElementSelectChange(event) {
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
export function handleJointThicknessChange(event) {
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
export function handleKeyDown(event) {
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
export function updateInfoText() {
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
