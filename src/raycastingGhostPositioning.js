import { jointThicknessCm, selectedElement, currentTool, addState, moveState, ghostElement, pointer, raycaster, objectsToRaycast } from './stateVariables.js';
import { snapToGridXZ, snapVerticalPosition } from './snappingLogic.js';
import { renderer, camera } from './threeSetup.js';

/**
 * Calculates the snapped position based on a raycaster intersection.
 * Used by both updateGhostPosition and the click handler in onPointerUp.
 * @param {THREE.Intersection} intersection - The intersection result from the raycaster.
 * @returns {THREE.Vector3 | null} The calculated and snapped center position for the ghost, or null if invalid.
 */
export function calculateSnappedPosition(intersection) {
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
export function updateGhostPosition(event) {
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
