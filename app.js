import { GRID_SIZE_CM, GRID_STEP_CM, CUSTOM_ELEMENT_ID, DEFAULT_CUSTOM_COLOR, SELECTION_COLOR, CLICK_THRESHOLD, LONG_PRESS_THRESHOLD, DPAD_INCREMENT_CM, ROTATION_INCREMENT, DRAG_THRESHOLD_PX, POSE_LIBRE_ID } from './src/constants.js';
import { viewportContainer, toolbar, elementSelect, jointInput, infoText, selectToolButton, addToolButton, moveToolButton, rotateToolButton, duplicateToolButton, deleteToolButton, toolButtons, customElementGroup, customNameInput, customWidthInput, customHeightInput, customDepthInput, btnOrbitLeft, btnOrbitRight, btnZoomIn, btnZoomOut, placementControlsDiv, dpadUp, dpadDown, dpadLeft, dpadRight, placementRotateLeft, placementRotateRight, dpadUpY, dpadDownY, placeButton, confirmMoveButton, cancelPlacementButton, cancelMoveButton, contextMenu, ctxRotateButton, ctxMoveButton, ctxDuplicateButton, ctxDeleteButton, assiseSelect, createAssiseButton } from './src/domElements.js';
import { elementTypes } from './src/elementTypes.js';
import { currentTool, addState, moveState, selectedElementTypeId, jointThicknessCm, placedElements, nextElementId, selectedElement, elementForContextMenu, isDragging, pointerDownTime, longPressTimer, originalMovePosition, pointerDownCoords, assises, activeAssiseId, scene, camera, renderer, controls, raycaster, pointer, axesHelper, gridHelper, groundPlane, ghostElement, objectsToRaycast } from './src/stateVariables.js';
import { init } from './src/threeSetup.js';
import { setActiveTool, updateUIToolStates, updateCursor, handleToolbarClick } from './src/toolUIManager.js';
import { selectElement, deselectElement, showContextMenu, hideContextMenu, handleClickOutsideContextMenu, handleContextMenuRotate, handleContextMenuMove, handleContextMenuDuplicate, handleContextMenuDelete } from './src/selectionContextMenu.js';
import { populateElementSelector, getElementTypeForAdd, getElementTypeForSelected, updateGhostGeometry } from './src/elementDataGeometry.js';
import { snapToGridXZ, snapVerticalPosition } from './src/snappingLogic.js';
import { calculateSnappedPosition, updateGhostPosition } from './src/raycastingGhostPositioning.js';
import { placeElement, rotateSelectedElement, deleteSelectedElement, triggerMove, triggerDuplicate, placeDuplicateElement, confirmAddPlacement, cancelAddPlacement, confirmMovePlacement, cancelMovePlacement } from './src/elementActions.js';
import { moveGhostWithDPad, moveGhostWithDPadY, rotateGhost } from './src/dpadPlacementMoveActions.js';
import { onWindowResize, onPointerDown, onPointerMove, onPointerUp, handleElementSelectChange, handleJointThicknessChange, handleKeyDown, updateInfoText } from './src/eventHandlers.js';
import { rotateView, zoomView } from './src/navigationFunctions.js';

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

// Start the animation loop
animate();
console.log("Simulateur initialisé. Caméra rapprochée, grille cachée, sol vert très clair, ciel bleu.");

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init(); // DOM is already loaded
}
