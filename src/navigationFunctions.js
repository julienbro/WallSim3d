import { controls } from './threeSetup.js';

/** Rotates the camera view horizontally */
export function rotateView(angle) {
    if (!controls || !controls.enabled) return; // Only rotate if controls are enabled
    controls.rotateLeft(angle); // Positive angle rotates left (counter-clockwise from top)
    controls.update(); // Apply the change
}

/** Zooms the camera view in or out */
export function zoomView(factor) {
    if (!controls || !controls.enabled) return; // Only zoom if controls are enabled
    if (factor < 1) {
        controls.dollyIn(1 / factor); // dollyIn expects factor > 1 for zooming in
    } else {
        controls.dollyOut(factor); // dollyOut expects factor > 1 for zooming out
    }
    controls.update(); // Apply the change
}
