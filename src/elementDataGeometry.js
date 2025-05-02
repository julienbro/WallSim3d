import { CUSTOM_ELEMENT_ID, DEFAULT_CUSTOM_COLOR } from './constants.js';
import { elementTypes } from './elementTypes.js';
import { elementSelect, customWidthInput, customHeightInput, customDepthInput, customNameInput } from './domElements.js';
import { selectedElementTypeId, selectedElement, currentTool, addState, moveState, ghostElement } from './stateVariables.js';

/** Populates the element selection dropdown */
export function populateElementSelector() {
    elementSelect.innerHTML = ''; // Clear existing options

    // Add the "Custom" option first
    const customOption = document.createElement('option');
    customOption.value = CUSTOM_ELEMENT_ID;
    customOption.textContent = "[ Élément Personnalisé ]";
    elementSelect.appendChild(customOption);

    // Add predefined element types
    for (const id in elementTypes) {
        const type = elementTypes[id];
        const [w, h, d] = type.dim; // width, height, depth
        const option = document.createElement('option');
        option.value = id;
        option.textContent = `${type.name} (${w} x ${h} x ${d} cm)`;
        elementSelect.appendChild(option);
    }

    // Set the initial selection (first predefined element or custom if none exist)
    const firstPredefinedId = Object.keys(elementTypes)[0];
    if (firstPredefinedId) {
        selectedElementTypeId = firstPredefinedId;
        elementSelect.value = selectedElementTypeId;
    } else {
        selectedElementTypeId = CUSTOM_ELEMENT_ID;
        elementSelect.value = selectedElementTypeId;
    }
}

/**
 * Gets the element type definition based on the current selection in the dropdown or custom inputs.
 * Used when preparing to add a new element.
 * @returns {object | null} The element type definition {name, dim, color, isCustom?} or null if invalid.
 */
export function getElementTypeForAdd() {
    if (selectedElementTypeId === CUSTOM_ELEMENT_ID) {
        // Get dimensions from custom input fields
        const w = parseFloat(customWidthInput.value);
        const h = parseFloat(customHeightInput.value);
        const d = parseFloat(customDepthInput.value);
        const name = customNameInput.value.trim() || "Personnalisé"; // Default name if empty

        // Validate custom dimensions
        if (isNaN(w) || w <= 0 || isNaN(h) || h <= 0 || isNaN(d) || d <= 0) {
            console.warn("Dimensions personnalisées invalides.");
            alert("Les dimensions personnalisées (L, H, P) doivent être des nombres positifs.");
            return null; // Invalid custom dimensions
        }
        return { name: name, dim: [w, h, d], color: DEFAULT_CUSTOM_COLOR, isCustom: true };
    } else {
        // Get from predefined types
        const type = elementTypes[selectedElementTypeId];
         if (!type) {
             console.error(`Type d'élément sélectionné introuvable: ${selectedElementTypeId}`);
             return null;
         }
        return { ...type, isCustom: false }; // Return a copy
    }
}

/**
 * Gets the element type definition for the currently selected element in the scene.
 * Used for actions like move or duplicate where the source is an existing element.
 * @returns {object | null} The element type definition {name, dim, color, isCustom?, originalTypeId?} or null if no valid selection.
 */
export function getElementTypeForSelected() {
    if (!selectedElement) return null;

    if (selectedElement.typeId === CUSTOM_ELEMENT_ID) {
        // It's a custom element placed previously
        if (!selectedElement.customDimensions) {
            console.error("Données de dimensions personnalisées manquantes pour l'élément sélectionné:", selectedElement.id);
            return null;
        }
        return {
            name: selectedElement.customName || "Personnalisé",
            dim: selectedElement.customDimensions,
            color: DEFAULT_CUSTOM_COLOR, // Use default custom color, or could store original color if needed
            isCustom: true,
            originalTypeId: selectedElement.typeId // Keep track that it was originally custom
        };
    } else {
        // It's a predefined element
        const type = elementTypes[selectedElement.typeId];
        if (!type) {
            console.error(`Type d'élément prédéfini introuvable pour l'élément sélectionné: ${selectedElement.typeId}`);
            return null;
        }
        // Return a copy of the type definition, marking it as not custom
        return { ...type, isCustom: false, originalTypeId: selectedElement.typeId };
    }
}

/** Updates the geometry and color of the ghost element based on the current tool and selection */
export function updateGhostGeometry() {
    let elementType = null;

    // Determine which element type to use for the ghost
    if (currentTool === 'add') {
        elementType = getElementTypeForAdd();
    } else if ((currentTool === 'move' || currentTool === 'duplicate') && selectedElement) {
        elementType = getElementTypeForSelected();
    } else {
        // No ghost needed for other tools or states
        ghostElement.visible = false;
        return;
    }

    // If no valid type could be determined, hide the ghost
    if (!elementType) {
        console.warn("Impossible d'obtenir le type d'élément pour le fantôme.");
        ghostElement.visible = false;
        return;
    };

    const [widthCm, heightCm, depthCm] = elementType.dim;

    // Check if geometry needs updating (avoids unnecessary recreation)
    if (!ghostElement.geometry ||
        Math.abs(ghostElement.geometry.parameters.width - widthCm) > 0.01 ||
        Math.abs(ghostElement.geometry.parameters.height - heightCm) > 0.01 ||
        Math.abs(ghostElement.geometry.parameters.depth - depthCm) > 0.01)
    {
        if (ghostElement.geometry) {
            ghostElement.geometry.dispose(); // Dispose old geometry to free memory
        }
        // Create new geometry with correct dimensions
        ghostElement.geometry = new THREE.BoxGeometry(widthCm, heightCm, depthCm);
        console.log(`Géométrie fantôme mise à jour: ${widthCm}x${heightCm}x${depthCm}`);
    }

    // Update ghost color
    if ((currentTool === 'move' || currentTool === 'duplicate') && selectedElement && selectedElement.mesh.material) {
        // Match the color of the element being moved/duplicated
        ghostElement.material.color.copy(selectedElement.mesh.material.color);
    } else {
        // Default green color for adding new elements
        ghostElement.material.color.setHex(0x00ff00);
    }
    ghostElement.material.needsUpdate = true; // Ensure material changes are applied

    // Update ghost rotation
    if ((currentTool === 'move' || currentTool === 'duplicate') && selectedElement) {
        // Match the rotation of the element being moved/duplicated
        ghostElement.rotation.copy(selectedElement.mesh.rotation);
    } else if (currentTool === 'add') {
        // Reset rotation when adding a new element (unless already positioning)
         if (addState === 'idle') {
             ghostElement.rotation.set(0, 0, 0);
         } // Keep current rotation if already positioning
    }

    // Ensure ghost is visible if geometry was updated successfully
    // Visibility is primarily controlled by updateGhostPosition and tool state changes
    // ghostElement.visible = true; // Might make it flash visible briefly sometimes
}
