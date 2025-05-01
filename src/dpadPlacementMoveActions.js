import { DPAD_INCREMENT_CM, ROTATION_INCREMENT } from './constants.js';
import { currentTool, addState, moveState, ghostElement } from './stateVariables.js';
import { snapVerticalPosition } from './snappingLogic.js';

/**
 * Moves the ghost element horizontally using DPad/arrow keys.
 * @param {number} dx - Change in X.
 * @param {number} dy - Change in Y (typically 0 for horizontal).
 * @param {number} dz - Change in Z.
 */
export function moveGhostWithDPad(dx, dy, dz) {
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
export function moveGhostWithDPadY(direction) {
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
export function rotateGhost(angle) {
    if (ghostElement.visible && ((currentTool === 'add' && addState === 'positioning') || (currentTool === 'move' && moveState === 'moving'))) {
        ghostElement.rotateY(angle);
        console.log("Rotation Fantôme:", THREE.MathUtils.radToDeg(ghostElement.rotation.y).toFixed(0) + "°");
    }
}
