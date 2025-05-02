/**
 * Saves the current state to a JSON file.
 */
function saveToFile() {
    const state = {
        placedElements: placedElements.map(el => ({
            id: el.id,
            typeId: el.typeId,
            position: el.mesh.position.toArray(),
            rotation: el.mesh.rotation.toArray(),
            customDimensions: el.customDimensions || null,
            customName: el.customName || null
        })),
        nextElementId: nextElementId,
        jointThicknessCm: jointThicknessCm,
        assises: assises,
        activeAssiseId: activeAssiseId
    };

    const json = JSON.stringify(state, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'state.json';
    a.click();
    URL.revokeObjectURL(url);
}

/**
 * Loads the state from a JSON file.
 */
function loadFromFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const json = await file.text();
        const state = JSON.parse(json);

        // Clear existing elements
        placedElements.forEach(el => {
            scene.remove(el.mesh);
            if (el.mesh.geometry) el.mesh.geometry.dispose();
            if (el.mesh.material) el.mesh.material.dispose();
        });
        placedElements = [];
        objectsToRaycast.length = 0;
        objectsToRaycast.push(groundPlane);

        // Restore state
        state.placedElements.forEach(el => {
            const elementType = el.typeId === CUSTOM_ELEMENT_ID ? {
                name: el.customName || "Personnalisé",
                dim: el.customDimensions,
                color: DEFAULT_CUSTOM_COLOR,
                isCustom: true
            } : elementTypes[el.typeId];

            const position = new THREE.Vector3().fromArray(el.position);
            const rotation = new THREE.Euler().fromArray(el.rotation);
            placeElement(elementType, position, rotation);
        });

        nextElementId = state.nextElementId;
        jointThicknessCm = state.jointThicknessCm;
        jointInput.value = jointThicknessCm;
        assises = state.assises;
        activeAssiseId = state.activeAssiseId;
        populateAssiseSelector();
        assiseSelect.value = activeAssiseId;

        updateUIToolStates();
        updateInfoText();
        updateGhostGeometry();
        updateCursor();
    };
    input.click();
}
