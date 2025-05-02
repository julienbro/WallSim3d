/** The main animation loop, called recursively */
function animate() {
    requestAnimationFrame(animate); // Request the next frame

    // Update controls only if enabled (prevents damping update when tool != select)
    if (controls.enabled) {
        controls.update(); // Update damping and other control states
    }

    // Render the scene
    renderer.render(scene, camera);
}
