/** Assise Management */

/** Populates the assise selection dropdown */
function populateAssiseSelector() {
    const currentVal = assiseSelect.value; // Preserve selection if possible
    assiseSelect.innerHTML = ''; // Clear existing options
    assises.forEach(assise => {
        const option = document.createElement('option');
        option.value = assise.id;
        // Display height if it's not the "Pose Libre" option
        option.textContent = assise.name + (assise.height !== null ? ` (${assise.height.toFixed(1)} cm)` : '');
        assiseSelect.appendChild(option);
    });
    // Try to restore previous selection or default to activeAssiseId
    if (assises.some(a => a.id === currentVal)) {
         assiseSelect.value = currentVal;
    } else {
         assiseSelect.value = activeAssiseId;
    }
}

/** Handles the creation of a new assise based on the currently selected element type */
function handleCreateAssise() {
    const selectedType = getElementTypeForAdd(); // Get type from the main element dropdown
    if (!selectedType) {
        alert("Veuillez sélectionner un type d'élément valide dans la liste principale pour créer une assise.");
        return;
    }

    // Dimension index 1 is height (width, height, depth)
    const [, elemHeight,] = selectedType.dim;
    if (typeof elemHeight !== 'number' || elemHeight <= 0) {
         alert("La hauteur de l'élément sélectionné est invalide pour créer une assise.");
         return;
    }

    const currentJoint = parseFloat(jointInput.value) || 0;
    const assiseHeight = elemHeight + currentJoint;

    // Check if an assise with this exact height already exists (avoid duplicates)
    if (assises.some(a => a.height !== null && Math.abs(a.height - assiseHeight) < 0.01)) { // Check with tolerance
         alert(`Une assise de hauteur ${assiseHeight.toFixed(1)} cm existe déjà.`);
         return;
    }

    const newAssiseId = `assise-${Date.now()}`; // Use timestamp for a more unique ID
    // Create a descriptive name, e.g., "Assise 1 (M50)"
    const newAssiseName = `Assise ${assises.filter(a => a.height !== null).length + 1} (${selectedType.name.split(' ')[0]})`;
    const newAssise = { id: newAssiseId, name: newAssiseName, height: assiseHeight };

    assises.push(newAssise);
    assises.sort((a, b) => { // Keep sorted by height, Pose Libre first
         if (a.height === null) return -1;
         if (b.height === null) return 1;
         return a.height - b.height;
    });
    populateAssiseSelector();
    activeAssiseId = newAssiseId; // Activate the newly created assise
    assiseSelect.value = activeAssiseId; // Update dropdown selection
    console.log("Nouvelle assise créée:", newAssise);
    updateInfoText(); // Update info text to show the new active assise
}

/** Handles changes in the assise selection dropdown */
function handleAssiseSelectChange() {
    activeAssiseId = assiseSelect.value;
    console.log("Assise active changée:", activeAssiseId, getActiveAssiseHeight());
    updateInfoText();
    // If positioning, the next ghost update or DPad move will use the new height
}

/**
 * Gets the height constraint of the currently active assise.
 * @returns {number | null} The height in cm, or null if "Pose Libre" is active.
 */
function getActiveAssiseHeight() {
    if (activeAssiseId === POSE_LIBRE_ID) {
        return null; // Indicate free placement (no vertical snapping based on assise)
    }
    const activeAssise = assises.find(a => a.id === activeAssiseId);
    return activeAssise ? activeAssise.height : null; // Return height or null if not found (shouldn't happen)
}
