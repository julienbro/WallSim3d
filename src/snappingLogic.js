/**
 * Snapping logic functions for the application.
 */

/**
 * Snaps a horizontal coordinate (X or Z) based on grid/joint size.
 * Snapping occurs relative to the center of the element.
 * @param {number} value - The raw coordinate value (center).
 * @param {number} dimension - The size of the element along that axis.
 * @param {number} joint - The joint thickness.
 * @returns {number} The snapped coordinate value (center).
 */
export function snapToGridXZ(value, dimension, joint) {
    // Basic grid snapping - adjust as needed for more complex logic
    // Snapping increment could be based on joint size or a fixed grid
    const snapIncrement = Math.max(0.1, joint > 0 ? joint : 1.0); // Use joint or 1cm minimum
    // Snap the center position
    const snappedCenter = Math.round(value / snapIncrement) * snapIncrement;
    return snappedCenter;
    // Alternative: Snap the edge?
    // const edge = value - dimension / 2;
    // const snappedEdge = Math.round(edge / snapIncrement) * snapIncrement;
    // return snappedEdge + dimension / 2;
}

/**
 * Snaps the vertical position (bottom edge) of an element based on the active assise height.
 * If "Pose Libre" is active, no snapping occurs based on assise.
 * @param {number} targetBottomY - The desired bottom Y position (e.g., top of element below + joint).
 * @param {number} elementHeight - The height of the element being placed/moved.
 * @returns {number} The snapped bottom Y coordinate.
 */
export function snapVerticalPosition(targetBottomY, elementHeight) {
    const activeAssiseH = getActiveAssiseHeight(); // Get the height constraint from the active assise

    // If Pose Libre is active or assise height is invalid, don't snap based on assise
    if (activeAssiseH === null || activeAssiseH <= 0) {
        // Return the target Y, potentially snapping to a base grid or minimum height later if needed
        return Math.max(0, targetBottomY); // Ensure it doesn't go below Y=0
    }

    // Snap the target bottom Y to the nearest multiple of the active assise height
    // Ensure we snap upwards if exactly between steps? Or round to nearest? Rounding is simpler.
    const snappedBottomY = Math.round(targetBottomY / activeAssiseH) * activeAssiseH;

    // Debug log (optional)
    // console.log(`Snap Vertical Assise: TargetY=${targetBottomY.toFixed(1)}, ActiveAssiseH=${activeAssiseH.toFixed(1)}, SnappedY=${snappedBottomY.toFixed(1)}`);

    return Math.max(0, snappedBottomY); // Ensure snapped position is not below Y=0
}
