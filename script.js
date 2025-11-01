// Grid Configuration
const TILE_SIZE = 40;
const EXPANSION_SIZE = 4; // Each expansion = 4×4 tiles

// State Management
let gridWidth = 20; // tiles (5 expansions × 4)
let gridHeight = 20; // tiles (5 expansions × 4)
let buildings = [];
let roads = new Set();
let selectedBuilding = null;
let isDragging = false;
let dragOffset = { x: 0, y: 0 };
let canvas;
let ctx;
let zoomLevel = 1;
let isOptimizing = false;
let optimizationCanceled = false;
let viewMode = 'top-down'; // 'top-down' or 'isometric'

// Building template colors
let buildingColorRoad = '#8B4513';
let buildingColorNoRoad = '#4682B4';


// Initialize
document.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('grid-canvas');
    ctx = canvas.getContext('2d');
    
    // Initialize with Town Hall
    initializeTownHall();
    
    // Setup event listeners
    setupEventListeners();
    
    // Initialize grid
    updateGridSize();
    
    // Draw initial state
    redraw();
    
});

// Initialize Town Hall (7×6 dimensions)
function initializeTownHall() {
    buildings = [{
        id: 'town-hall-' + Date.now(),
        name: 'Town Hall',
        width: 7,
        height: 6,
        x: Math.floor(gridWidth / 2) - 3,
        y: Math.floor(gridHeight / 2) - 3,
        requiresRoad: true,
        color: buildingColorRoad,
        isTownHall: true,
        visible: true
    }];
    updateBuildingList();
    updateStatistics();
}

// Setup event listeners
function setupEventListeners() {
    // Grid size controls
    document.getElementById('apply-grid-btn').addEventListener('click', applyGridSize);
    
    // Building management
    document.getElementById('add-building-btn').addEventListener('click', () => {
        document.getElementById('add-building-modal').classList.add('active');
    });
    document.getElementById('confirm-add-btn').addEventListener('click', addBuilding);
    document.getElementById('cancel-add-btn').addEventListener('click', closeModal);
    document.getElementById('close-modal').addEventListener('click', closeModal);
    
    // Optimization
    document.getElementById('solve-btn').addEventListener('click', optimizeLayout);
    document.getElementById('cancel-btn').addEventListener('click', cancelOptimization);
    document.getElementById('auto-optimize').addEventListener('change', (e) => {
        if (e.target.checked) {
            // Auto-optimize on building changes
        }
    });
    
    // Zoom controls
    document.getElementById('zoom-in-btn').addEventListener('click', () => setZoom(zoomLevel + 0.1));
    document.getElementById('zoom-out-btn').addEventListener('click', () => setZoom(zoomLevel - 0.1));
    document.getElementById('zoom-slider').addEventListener('input', (e) => {
        setZoom(parseFloat(e.target.value));
    });
    
    // Legend
    document.getElementById('legend-select').addEventListener('change', redraw);
    
    // View Mode
    document.getElementById('view-mode-select').addEventListener('change', (e) => {
        viewMode = e.target.value;
        updateGridSize();
        redraw();
    });
    
    // Town Hall visibility
    document.getElementById('townhall-visible').addEventListener('change', (e) => {
        const townHall = buildings.find(b => b.isTownHall);
        if (townHall) townHall.visible = e.target.checked;
        redraw();
    });
    
    // Sidebar toggle
    document.getElementById('sidebar-toggle').addEventListener('click', toggleSidebar);
    
    // Help
    document.getElementById('help-btn').addEventListener('click', () => {
        alert('Forge of Empires City Optimizer\n\nAdd buildings, drag them on the grid, and click Solve to find the optimal layout with minimal roads.');
    });
    
    // Canvas interaction
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseUp);
    
}

// Apply grid size
function applyGridSize() {
    const widthExpansions = parseInt(document.getElementById('grid-width').value);
    const heightExpansions = parseInt(document.getElementById('grid-height').value);
    
    if (widthExpansions < 1 || widthExpansions > 15 || heightExpansions < 1 || heightExpansions > 15) {
        alert('Grid size must be between 1 and 15 expansions');
        return;
    }
    
    gridWidth = widthExpansions * EXPANSION_SIZE;
    gridHeight = heightExpansions * EXPANSION_SIZE;
    
    // Ensure buildings fit in new grid
    buildings = buildings.filter(building => {
        return building.x + building.width <= gridWidth && 
               building.y + building.height <= gridHeight &&
               building.x >= 0 && building.y >= 0;
    });
    
    // Rebuild roads
    rebuildRoads();
    
    updateGridSize();
    redraw();
}

// Update grid size display and canvas
function updateGridSize() {
    document.getElementById('grid-size-display').textContent = `${gridWidth}×${gridHeight}`;
    
    // Calculate canvas size based on view mode
    let canvasWidth, canvasHeight;
    
    if (viewMode === 'isometric') {
        // Isometric view: tiles are rotated, so we need more space
        const isoScale = Math.sqrt(2); // Diagonal scaling
        canvasWidth = (gridWidth + gridHeight) * TILE_SIZE * isoScale * zoomLevel;
        canvasHeight = (gridWidth + gridHeight) * TILE_SIZE * isoScale * zoomLevel;
    } else {
        // Top-down (orthogonal) view: exact grid dimensions
        canvasWidth = gridWidth * TILE_SIZE * zoomLevel;
        canvasHeight = gridHeight * TILE_SIZE * zoomLevel;
    }
    
    // Set canvas dimensions
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    
    // Update canvas style for proper display
    canvas.style.width = canvasWidth + 'px';
    canvas.style.height = canvasHeight + 'px';
    
    // Ensure container has enough space
    const container = canvas.parentElement;
    if (container) {
        container.style.minWidth = Math.max(container.offsetWidth, canvasWidth + 40) + 'px';
        container.style.minHeight = Math.max(container.offsetHeight, canvasHeight + 40) + 'px';
    }
}

// Zoom functions
function setZoom(level) {
    zoomLevel = Math.max(0.5, Math.min(2, level));
    document.getElementById('zoom-slider').value = zoomLevel;
    document.getElementById('zoom-value').textContent = Math.round(zoomLevel * 100) + '%';
    updateGridSize();
    redraw();
}

// Close modal
function closeModal() {
    document.getElementById('add-building-modal').classList.remove('active');
    // Clear form
    document.getElementById('building-name').value = '';
    document.getElementById('building-width').value = '3';
    document.getElementById('building-height').value = '3';
    document.getElementById('building-quantity').value = '1';
    document.getElementById('requires-road').checked = false;
}

// Add building
function addBuilding() {
    const name = document.getElementById('building-name').value.trim();
    const width = parseInt(document.getElementById('building-width').value);
    const height = parseInt(document.getElementById('building-height').value);
    const quantity = parseInt(document.getElementById('building-quantity').value) || 1;
    const requiresRoad = document.getElementById('requires-road').checked;
    
    if (!name) {
        alert('Please enter a building name');
        return;
    }
    
    if (width < 1 || height < 1) {
        alert('Building dimensions must be at least 1×1');
        return;
    }
    
    if (quantity < 1 || quantity > 100) {
        alert('Quantity must be between 1 and 100');
        return;
    }
    
    // Add multiple buildings at once
    let successCount = 0;
    let failCount = 0;
    
    for (let i = 0; i < quantity; i++) {
        const building = {
            id: 'building-' + Date.now() + '-' + i,
            name: name,
            width: width,
            height: height,
            x: 0,
            y: 0,
            requiresRoad: requiresRoad,
            color: requiresRoad ? buildingColorRoad : buildingColorNoRoad,
            isTownHall: false,
            visible: true
        };
        
        // Try to place building automatically
        if (placeBuildingAutomatically(building)) {
            buildings.push(building);
            successCount++;
        } else {
            failCount++;
        }
    }
    
    if (successCount > 0) {
        rebuildRoads();
        updateBuildingList();
        redraw();
        
        if (failCount > 0) {
            alert(`Added ${successCount} building(s), ${failCount} could not be placed (no space available)`);
        } else if (successCount > 1) {
            alert(`Added ${successCount} building(s) successfully`);
        }
    } else {
        alert(`Could not place any buildings. The grid may be full or there's not enough space.`);
    }
    
    closeModal();
}

// Automatically place a building on the grid
function placeBuildingAutomatically(building) {
    // Try to find a valid position starting from Town Hall position
    const townHall = buildings.find(b => b.isTownHall);
    let startX = 0;
    let startY = 0;
    
    if (townHall) {
        // Start searching from Town Hall area
        startX = townHall.x + townHall.width + 1;
        startY = townHall.y;
    }
    
    // Try positions in a spiral pattern starting from Town Hall
    const maxRadius = Math.max(gridWidth, gridHeight);
    
    for (let radius = 0; radius < maxRadius; radius++) {
        for (let dx = -radius; dx <= radius; dx++) {
            for (let dy = -radius; dy <= radius; dy++) {
                // Only check perimeter of current radius
                if (Math.abs(dx) === radius || Math.abs(dy) === radius) {
                    let x = startX + dx;
                    let y = startY + dy;
                    
                    // Ensure coordinates are valid
                    x = Math.max(0, Math.min(x, gridWidth - building.width));
                    y = Math.max(0, Math.min(y, gridHeight - building.height));
                    
                    building.x = x;
                    building.y = y;
                    
                    if (canPlaceBuilding(building, x, y)) {
                        return true;
                    }
                }
            }
        }
    }
    
    // If spiral search failed, try grid scan
    for (let y = 0; y <= gridHeight - building.height; y++) {
        for (let x = 0; x <= gridWidth - building.width; x++) {
            building.x = x;
            building.y = y;
            
            if (canPlaceBuilding(building, x, y)) {
                return true;
            }
        }
    }
    
    return false;
}

// Update building list in sidebar
function updateBuildingList() {
    const list = document.getElementById('buildings-list');
    list.innerHTML = '';
    
    buildings.filter(b => !b.isTownHall).forEach(building => {
        const item = document.createElement('div');
        item.className = 'building-item';
        item.draggable = true;
        item.dataset.buildingId = building.id;
        
        item.innerHTML = `
            <div class="building-item-header">
                <span class="building-item-name">${building.name}</span>
                <div class="building-item-actions">
                    <button class="building-item-edit" data-id="${building.id}">Edit</button>
                    <button class="building-item-delete" data-id="${building.id}">×</button>
                </div>
            </div>
            <div class="building-item-info">
                ${building.width}×${building.height} tiles
                ${building.requiresRoad ? '• Requires Road' : '• No Road'}
                <span class="building-item-color" style="background: ${building.color}"></span>
            </div>
        `;
        
        // Delete button
        item.querySelector('.building-item-delete').addEventListener('click', (e) => {
            e.stopPropagation();
            deleteBuilding(building.id);
        });
        
        // Edit button
        item.querySelector('.building-item-edit').addEventListener('click', (e) => {
            e.stopPropagation();
            editBuilding(building);
        });
        
        // Drag from sidebar
        item.addEventListener('dragstart', (e) => {
            selectedBuilding = building;
            item.classList.add('dragging');
        });
        
        item.addEventListener('dragend', () => {
            item.classList.remove('dragging');
        });
        
        list.appendChild(item);
    });
    
    updateStatistics();
}

// Edit building
function editBuilding(building) {
    document.getElementById('building-name').value = building.name;
    document.getElementById('building-width').value = building.width;
    document.getElementById('building-height').value = building.height;
    document.getElementById('building-quantity').value = '1';
    document.getElementById('requires-road').checked = building.requiresRoad;
    document.getElementById('add-building-modal').classList.add('active');
    
    // Modify confirm button to update instead of add
    const confirmBtn = document.getElementById('confirm-add-btn');
    const originalText = confirmBtn.textContent;
    confirmBtn.textContent = 'Update Building';
    confirmBtn.onclick = () => {
        updateBuilding(building.id);
        confirmBtn.textContent = originalText;
        confirmBtn.onclick = addBuilding;
    };
}

// Update building
function updateBuilding(buildingId) {
    const building = buildings.find(b => b.id === buildingId);
    if (!building) return;
    
    building.name = document.getElementById('building-name').value.trim();
    building.width = parseInt(document.getElementById('building-width').value);
    building.height = parseInt(document.getElementById('building-height').value);
    building.requiresRoad = document.getElementById('requires-road').checked;
    building.color = building.requiresRoad ? buildingColorRoad : buildingColorNoRoad;
    
    // Validate placement
    if (!canPlaceBuilding(building, building.x, building.y)) {
        // Try to find valid position
        findAndPlaceBuilding(building, true);
    }
    
    rebuildRoads();
    updateBuildingList();
    closeModal();
    redraw();
}

// Delete building
function deleteBuilding(buildingId) {
    buildings = buildings.filter(b => b.id !== buildingId);
    rebuildRoads();
    updateBuildingList();
    redraw();
}

// Mouse event handlers
function handleMouseDown(e) {
    if (isOptimizing) return;
    
    const rect = canvas.getBoundingClientRect();
    const scale = zoomLevel;
    
    // Calculate mouse position accounting for canvas centering
    let mouseX = e.clientX - rect.left - rect.width / 2;
    let mouseY = e.clientY - rect.top - rect.height / 2;
    
    let x, y;
    if (viewMode === 'isometric') {
        // Transform back from isometric to grid coordinates
        const tileSize = TILE_SIZE * scale;
        x = Math.floor((mouseX / (tileSize * Math.sqrt(2)) + gridWidth / 2));
        y = Math.floor((mouseY / (tileSize * Math.sqrt(2)) + gridHeight / 2));
    } else {
        // Top-down (orthogonal): direct mapping - canvas is centered in container
        // Get mouse position relative to canvas
        const canvasRect = canvas.getBoundingClientRect();
        const canvasX = e.clientX - canvasRect.left;
        const canvasY = e.clientY - canvasRect.top;
        x = Math.floor(canvasX / (TILE_SIZE * scale));
        y = Math.floor(canvasY / (TILE_SIZE * scale));
    }
    
    // Find building at this position
    const building = findBuildingAt(x, y);
    
    if (building && building.visible) {
        selectedBuilding = building;
        isDragging = true;
        dragOffset.x = x - building.x;
        dragOffset.y = y - building.y;
    } else if (selectedBuilding && selectedBuilding.id) {
        // Place building from sidebar
        tryPlaceBuilding(selectedBuilding, x, y);
    }
}

function handleMouseMove(e) {
    if (!isDragging || !selectedBuilding || isOptimizing) return;
    
    const rect = canvas.getBoundingClientRect();
    const scale = zoomLevel;
    
    // Calculate mouse position accounting for canvas centering
    let mouseX = e.clientX - rect.left - rect.width / 2;
    let mouseY = e.clientY - rect.top - rect.height / 2;
    
    let x, y;
    if (viewMode === 'isometric') {
        // Transform back from isometric to grid coordinates
        const tileSize = TILE_SIZE * scale;
        x = Math.floor((mouseX / (tileSize * Math.sqrt(2)) + gridWidth / 2)) - dragOffset.x;
        y = Math.floor((mouseY / (tileSize * Math.sqrt(2)) + gridHeight / 2)) - dragOffset.y;
    } else {
        // Top-down (orthogonal): direct mapping - canvas is centered in container
        const canvasRect = canvas.getBoundingClientRect();
        const canvasX = e.clientX - canvasRect.left;
        const canvasY = e.clientY - canvasRect.top;
        x = Math.floor(canvasX / (TILE_SIZE * scale)) - dragOffset.x;
        y = Math.floor(canvasY / (TILE_SIZE * scale)) - dragOffset.y;
    }
    
    // Update preview
    selectedBuilding.x = Math.max(0, Math.min(x, gridWidth - selectedBuilding.width));
    selectedBuilding.y = Math.max(0, Math.min(y, gridHeight - selectedBuilding.height));
    
    redraw();
}

function handleMouseUp() {
    if (isDragging && selectedBuilding) {
        // Validate placement
        if (canPlaceBuilding(selectedBuilding, selectedBuilding.x, selectedBuilding.y)) {
            rebuildRoads();
        }
    }
    isDragging = false;
    selectedBuilding = null;
    redraw();
}

// Place building from sidebar
function tryPlaceBuilding(buildingTemplate, x, y) {
    // Check if building already exists in buildings array
    const existingBuilding = buildings.find(b => b.id === buildingTemplate.id);
    if (existingBuilding) {
        return;
    }
    
    // Create a new building instance
    const building = {
        ...buildingTemplate,
        id: 'building-' + Date.now(),
        x: Math.max(0, Math.min(x, gridWidth - buildingTemplate.width)),
        y: Math.max(0, Math.min(y, gridHeight - buildingTemplate.height))
    };
    
    if (canPlaceBuilding(building, building.x, building.y)) {
        buildings.push(building);
        rebuildRoads();
        updateBuildingList();
        redraw();
    } else {
        // Try to find a nearby valid position
        findAndPlaceBuilding(building);
    }
}

// Find building at position
function findBuildingAt(x, y) {
    return buildings.find(b => {
        if (!b.visible) return false;
        return x >= b.x && x < b.x + b.width &&
               y >= b.y && y < b.y + b.height;
    });
}

// Check if building can be placed
function canPlaceBuilding(building, x, y) {
    // Check boundaries
    if (x < 0 || y < 0 || x + building.width > gridWidth || y + building.height > gridHeight) {
        return false;
    }
    
    // Check overlap with other buildings (excluding itself)
    return !buildings.some(b => {
        if (b.id === building.id || !b.visible) return false;
        
        return !(x + building.width <= b.x ||
                x >= b.x + b.width ||
                y + building.height <= b.y ||
                y >= b.y + b.height);
    });
}

// Find and place building at valid position
function findAndPlaceBuilding(building, isUpdate = false) {
    // Try positions in spiral pattern
    for (let radius = 0; radius < Math.max(gridWidth, gridHeight); radius++) {
        for (let dx = -radius; dx <= radius; dx++) {
            for (let dy = -radius; dy <= radius; dy++) {
                if (Math.abs(dx) === radius || Math.abs(dy) === radius) {
                    const x = Math.floor(gridWidth / 2) + dx;
                    const y = Math.floor(gridHeight / 2) + dy;
                    
                    building.x = x;
                    building.y = y;
                    
                    if (canPlaceBuilding(building, x, y)) {
                        if (!isUpdate) {
                            buildings.push(building);
                        }
                        rebuildRoads();
                        updateBuildingList();
                        redraw();
                        return;
                    }
                }
            }
        }
    }
    
    if (!isUpdate) {
        alert('Could not find a valid position for this building');
    }
}

// Redraw everything
function redraw() {
    drawGrid();
    drawRoads();
    drawBuildings();
}

// Draw grid
function drawGrid() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background
    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.save();
    
    if (viewMode === 'isometric') {
        drawIsometricGrid();
    } else {
        drawTopDownGrid();
    }
    
    ctx.restore();
}

// Draw top-down orthogonal grid
function drawTopDownGrid() {
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    
    const tileSize = TILE_SIZE * zoomLevel;
    
    // In orthogonal view, grid fills entire canvas, no offset needed
    // Draw vertical lines
    for (let x = 0; x <= gridWidth; x++) {
        const px = x * tileSize;
        ctx.beginPath();
        ctx.moveTo(px, 0);
        ctx.lineTo(px, canvas.height);
        ctx.stroke();
    }
    
    // Draw horizontal lines
    for (let y = 0; y <= gridHeight; y++) {
        const py = y * tileSize;
        ctx.beginPath();
        ctx.moveTo(0, py);
        ctx.lineTo(canvas.width, py);
        ctx.stroke();
    }
    
    // Draw a subtle border
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);
}

// Draw isometric grid
function drawIsometricGrid() {
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    
    const tileSize = TILE_SIZE * zoomLevel;
    const isoWidth = tileSize;
    const isoHeight = tileSize * 0.5; // Isometric tiles are half-height
    
    // Center the grid
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    // Transform to isometric view
    ctx.translate(centerX, centerY);
    ctx.scale(1, 0.5);
    ctx.rotate(Math.PI / 4); // 45 degrees
    
    // Draw isometric grid lines
    for (let x = 0; x <= gridWidth; x++) {
        const px = (x - gridWidth / 2) * tileSize;
        ctx.beginPath();
        ctx.moveTo(px, -gridHeight * tileSize / 2);
        ctx.lineTo(px, gridHeight * tileSize / 2);
        ctx.stroke();
    }
    
    for (let y = 0; y <= gridHeight; y++) {
        const py = (y - gridHeight / 2) * tileSize;
        ctx.beginPath();
        ctx.moveTo(-gridWidth * tileSize / 2, py);
        ctx.lineTo(gridWidth * tileSize / 2, py);
        ctx.stroke();
    }
}

// Draw buildings
function drawBuildings() {
    ctx.save();
    
    if (viewMode === 'isometric') {
        drawIsometricBuildings();
    } else {
        drawTopDownBuildings();
    }
    
    ctx.restore();
}

// Draw top-down buildings (orthogonal view)
function drawTopDownBuildings() {
    const legendMode = document.getElementById('legend-select').value;
    const tileSize = TILE_SIZE * zoomLevel;
    
    // In orthogonal view, no offset needed - grid starts at 0,0
    buildings.forEach(building => {
        if (!building.visible) return;
        
        const x = building.x * tileSize;
        const y = building.y * tileSize;
        const width = building.width * tileSize;
        const height = building.height * tileSize;
        
        // Draw building rectangle
        ctx.fillStyle = building.color;
        ctx.fillRect(x, y, width, height);
        
        // Draw border
        ctx.strokeStyle = building.isTownHall ? '#FFD700' : '#333';
        ctx.lineWidth = building.isTownHall ? 3 : 2;
        ctx.strokeRect(x, y, width, height);
        
        // Draw label based on legend mode
        if (legendMode !== 'none') {
            ctx.fillStyle = '#fff';
            ctx.font = `bold ${12 * zoomLevel}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            const labelX = x + width / 2;
            const labelY = y + height / 2;
            
            let text = '';
            if (legendMode === 'name-size' || legendMode === 'name') {
                text = building.name;
            }
            if (legendMode === 'name-size' || legendMode === 'size') {
                if (text) text += '\n';
                text += `${building.width}×${building.height}`;
            }
            
            // Text shadow for readability
            ctx.fillStyle = '#000';
            ctx.fillText(text, labelX + 1, labelY + 1);
            ctx.fillStyle = '#fff';
            ctx.fillText(text, labelX, labelY);
        }
        
        // Draw road requirement indicator
        if (building.requiresRoad) {
            ctx.fillStyle = '#FFD700';
            ctx.beginPath();
            ctx.arc(x + 10 * zoomLevel, y + 10 * zoomLevel, 5 * zoomLevel, 0, Math.PI * 2);
            ctx.fill();
        }
    });
}

// Draw isometric buildings
function drawIsometricBuildings() {
    const legendMode = document.getElementById('legend-select').value;
    const tileSize = TILE_SIZE * zoomLevel;
    
    // Center the grid
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    // Transform to isometric view
    ctx.translate(centerX, centerY);
    ctx.scale(1, 0.5);
    ctx.rotate(Math.PI / 4); // 45 degrees
    
    buildings.forEach(building => {
        if (!building.visible) return;
        
        // Calculate isometric position
        const isoX = (building.x - gridWidth / 2) * tileSize;
        const isoY = (building.y - gridHeight / 2) * tileSize;
        const isoWidth = building.width * tileSize;
        const isoHeight = building.height * tileSize;
        
        // Draw building diamond/rhombus
        ctx.fillStyle = building.color;
        
        // Create diamond shape for isometric view
        const centerX_iso = isoX + isoWidth / 2;
        const centerY_iso = isoY + isoHeight / 2;
        const halfW = isoWidth / 2;
        const halfH = isoHeight / 2;
        
        ctx.beginPath();
        ctx.moveTo(centerX_iso, isoY);
        ctx.lineTo(isoX + isoWidth, centerY_iso);
        ctx.lineTo(centerX_iso, isoY + isoHeight);
        ctx.lineTo(isoX, centerY_iso);
        ctx.closePath();
        ctx.fill();
        
        // Draw border
        ctx.strokeStyle = building.isTownHall ? '#FFD700' : '#333';
        ctx.lineWidth = building.isTownHall ? 3 : 2;
        ctx.stroke();
        
        // Draw label
        if (legendMode !== 'none') {
            ctx.save();
            ctx.rotate(-Math.PI / 4); // Rotate text back
            ctx.scale(1, 2); // Scale back for text
            
            ctx.fillStyle = '#fff';
            ctx.font = `bold ${12 * zoomLevel}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            let text = '';
            if (legendMode === 'name-size' || legendMode === 'name') {
                text = building.name;
            }
            if (legendMode === 'name-size' || legendMode === 'size') {
                if (text) text += '\n';
                text += `${building.width}×${building.height}`;
            }
            
            ctx.fillStyle = '#000';
            ctx.fillText(text, centerX_iso, centerY_iso * 2 + 1);
            ctx.fillStyle = '#fff';
            ctx.fillText(text, centerX_iso, centerY_iso * 2);
            
            ctx.restore();
        }
        
        // Draw road requirement indicator
        if (building.requiresRoad) {
            ctx.fillStyle = '#FFD700';
            ctx.beginPath();
            ctx.arc(centerX_iso, centerY_iso, 5 * zoomLevel, 0, Math.PI * 2);
            ctx.fill();
        }
    });
}

// Draw roads
function drawRoads() {
    ctx.save();
    
    if (viewMode === 'isometric') {
        drawIsometricRoads();
    } else {
        drawTopDownRoads();
    }
    
    ctx.restore();
    updateStatistics();
}

// Draw top-down roads (orthogonal view)
function drawTopDownRoads() {
    const tileSize = TILE_SIZE * zoomLevel;
    
    // In orthogonal view, no offset needed - grid starts at 0,0
    roads.forEach(roadKey => {
        const [x, y] = roadKey.split(',').map(Number);
        const px = x * tileSize;
        const py = y * tileSize;
        
        ctx.fillStyle = '#808080';
        ctx.fillRect(px + 2, py + 2, tileSize - 4, tileSize - 4);
        
        // Road marker
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 2, py + 2, tileSize - 4, tileSize - 4);
    });
}

// Draw isometric roads
function drawIsometricRoads() {
    const tileSize = TILE_SIZE * zoomLevel;
    
    // Center the grid
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    // Transform to isometric view
    ctx.translate(centerX, centerY);
    ctx.scale(1, 0.5);
    ctx.rotate(Math.PI / 4); // 45 degrees
    
    roads.forEach(roadKey => {
        const [x, y] = roadKey.split(',').map(Number);
        
        // Calculate isometric position
        const isoX = (x - gridWidth / 2) * tileSize;
        const isoY = (y - gridHeight / 2) * tileSize;
        
        // Draw road as diamond
        ctx.fillStyle = '#808080';
        const centerX_iso = isoX + tileSize / 2;
        const centerY_iso = isoY + tileSize / 2;
        const halfSize = (tileSize - 4) / 2;
        
        ctx.beginPath();
        ctx.moveTo(centerX_iso, isoY + 2);
        ctx.lineTo(isoX + tileSize - 2, centerY_iso);
        ctx.lineTo(centerX_iso, isoY + tileSize - 2);
        ctx.lineTo(isoX + 2, centerY_iso);
        ctx.closePath();
        ctx.fill();
        
        // Road border
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 1;
        ctx.stroke();
    });
}

// Rebuild roads based on current building positions
function rebuildRoads() {
    roads.clear();
    
    const townHall = buildings.find(b => b.isTownHall && b.visible);
    if (!townHall) return;
    
    const buildingsNeedingRoads = buildings.filter(b => b.requiresRoad && b.visible && !b.isTownHall);
    if (buildingsNeedingRoads.length === 0) return;
    
    // Connect all road-requiring buildings to Town Hall using improved pathfinding
    buildingsNeedingRoads.forEach(building => {
        connectBuildingToRoad(building, townHall);
    });
}

// Connect building to road network (improved pathfinding)
function connectBuildingToRoad(building, townHall) {
    const buildingConnections = getBuildingConnectionPoints(building);
    const townHallConnections = getBuildingConnectionPoints(townHall);
    
    let bestPath = null;
    let minDistance = Infinity;
    
    // Try connecting to existing road network first
    buildingConnections.forEach(buildingPoint => {
        if (isConnectedToRoadNetwork(buildingPoint, roads)) {
            const nearestRoad = findNearestRoadPoint(buildingPoint, roads);
            if (nearestRoad) {
                const path = findPath(buildingPoint, nearestRoad);
                if (path.length < minDistance) {
                    minDistance = path.length;
                    bestPath = path;
                }
            }
        } else {
            // Direct connection to Town Hall
            townHallConnections.forEach(townHallPoint => {
                const path = findPath(buildingPoint, townHallPoint);
                if (path.length < minDistance) {
                    minDistance = path.length;
                    bestPath = path;
                }
            });
        }
    });
    
    // Add road tiles from best path
    if (bestPath) {
        bestPath.forEach(point => {
            if (isValidRoadPosition(point.x, point.y)) {
                roads.add(`${point.x},${point.y}`);
            }
        });
    }
}

// Get connection points around a building
function getBuildingConnectionPoints(building) {
    const points = [];
    
    // Top, bottom, left, right edges
    const edges = [
        { x: 0, y: -1, count: building.width, base: { x: building.x, y: building.y - 1 } },
        { x: 0, y: 1, count: building.width, base: { x: building.x, y: building.y + building.height } },
        { x: -1, y: 0, count: building.height, base: { x: building.x - 1, y: building.y } },
        { x: 1, y: 0, count: building.height, base: { x: building.x + building.width, y: building.y } }
    ];
    
    edges.forEach(edge => {
        for (let i = 0; i < edge.count; i++) {
            const x = edge.base.x + (edge.x !== 0 ? 0 : i);
            const y = edge.base.y + (edge.y !== 0 ? 0 : i);
            
            if (x >= 0 && x < gridWidth && y >= 0 && y < gridHeight) {
                points.push({ x, y });
            }
        }
    });
    
    return points;
}

// Find path between two points (Manhattan distance - improved)
function findPath(start, end) {
    const path = [];
    
    // L-shaped path (first horizontal, then vertical)
    const startX = Math.min(start.x, end.x);
    const endX = Math.max(start.x, end.x);
    for (let x = startX; x <= endX; x++) {
        path.push({ x, y: start.y });
    }
    
    const startY = Math.min(start.y, end.y);
    const endY = Math.max(start.y, end.y);
    for (let y = startY; y <= endY; y++) {
        const point = { x: end.x, y };
        if (!path.some(p => p.x === point.x && p.y === point.y)) {
            path.push(point);
        }
    }
    
    return path;
}

// Check if point is connected to road network
function isConnectedToRoadNetwork(point, roadSet) {
    const neighbors = [
        { x: point.x, y: point.y },
        { x: point.x - 1, y: point.y },
        { x: point.x + 1, y: point.y },
        { x: point.x, y: point.y - 1 },
        { x: point.x, y: point.y + 1 }
    ];
    
    return neighbors.some(n => roadSet.has(`${n.x},${n.y}`));
}

// Find nearest road point
function findNearestRoadPoint(point, roadSet) {
    let nearest = null;
    let minDist = Infinity;
    
    roadSet.forEach(roadKey => {
        const [x, y] = roadKey.split(',').map(Number);
        const dist = Math.abs(point.x - x) + Math.abs(point.y - y);
        if (dist < minDist) {
            minDist = dist;
            nearest = { x, y };
        }
    });
    
    return nearest;
}

// Check if road can be placed at position
function isValidRoadPosition(x, y) {
    return !buildings.some(b => {
        return b.visible && x >= b.x && x < b.x + b.width &&
               y >= b.y && y < b.y + b.height;
    });
}

// Update statistics
function updateStatistics() {
    const placedBuildings = buildings.filter(b => !b.isTownHall && b.visible).length;
    const totalBuildings = buildings.filter(b => !b.isTownHall).length;
    const totalTiles = gridWidth * gridHeight;
    const buildingTiles = buildings.filter(b => b.visible).reduce((sum, b) => sum + (b.width * b.height), 0);
    const roadTiles = roads.size;
    const emptyTiles = totalTiles - buildingTiles - roadTiles;
    
    document.getElementById('placed-buildings-count').textContent = `${placedBuildings}/${totalBuildings}`;
    document.getElementById('roads-count').textContent = roadTiles;
    document.getElementById('empty-tiles-count').textContent = emptyTiles;
    document.getElementById('total-tiles-count').textContent = totalTiles;
}


// Toggle sidebar
function toggleSidebar() {
    const sidebar = document.querySelector('.right-sidebar');
    sidebar.style.display = sidebar.style.display === 'none' ? 'flex' : 'none';
}

// Optimization algorithm with parallel processing
async function optimizeLayout() {
    if (buildings.length === 0) {
        alert('Please add buildings first');
        return;
    }
    
    const buildingsToOptimize = buildings.filter(b => !b.isTownHall);
    if (buildingsToOptimize.length === 0) {
        alert('No buildings to optimize (only Town Hall exists)');
        return;
    }
    
    // Save current state
    const originalState = JSON.parse(JSON.stringify(buildings));
    const originalRoads = new Set(roads);
    
    isOptimizing = true;
    optimizationCanceled = false;
    document.getElementById('solve-btn').disabled = true;
    document.getElementById('cancel-btn').disabled = false;
    document.getElementById('optimization-status').style.display = 'flex';
    
    const parallelProcesses = parseInt(document.getElementById('parallel-processes').value) || 4;
    
    try {
        const bestLayout = await runOptimizationParallel(buildingsToOptimize, parallelProcesses);
        
        if (!optimizationCanceled && bestLayout) {
            buildings = bestLayout;
            rebuildRoads();
            updateBuildingList();
            redraw();
            
            alert(`Optimization complete! Road tiles: ${roads.size} (was ${originalRoads.size})`);
        } else if (optimizationCanceled) {
            // Restore original
            buildings = originalState;
            rebuildRoads();
            updateBuildingList();
            redraw();
        }
    } catch (error) {
        console.error('Optimization error:', error);
        alert('Optimization failed: ' + error.message);
        
        // Restore original
        buildings = originalState;
        rebuildRoads();
        updateBuildingList();
        redraw();
    } finally {
        isOptimizing = false;
        document.getElementById('solve-btn').disabled = false;
        document.getElementById('cancel-btn').disabled = true;
        document.getElementById('optimization-status').style.display = 'none';
    }
}

function cancelOptimization() {
    optimizationCanceled = true;
}

// Parallel optimization with genetic algorithm
async function runOptimizationParallel(buildingsToOptimize, numProcesses) {
    const strategies = [
        () => optimizeByCluster(buildingsToOptimize),
        () => optimizeByRoadMinimization(buildingsToOptimize),
        () => optimizeByDensity(buildingsToOptimize),
        () => optimizeByGeneticAlgorithm(buildingsToOptimize, 50, 20), // generations, population
        () => optimizeBySimulatedAnnealing(buildingsToOptimize, 1000), // iterations
        () => optimizeByGreedy(buildingsToOptimize),
        () => optimizeByMinimumSpanningTree(buildingsToOptimize),
        () => optimizeBySpiral(buildingsToOptimize)
    ];
    
    const originalState = JSON.parse(JSON.stringify(buildings));
    const originalRoads = new Set(roads);
    
    let bestLayout = null;
    let minRoads = Infinity;
    
    // Run strategies in batches
    const batchSize = Math.min(numProcesses, strategies.length);
    const batches = [];
    
    for (let i = 0; i < strategies.length; i += batchSize) {
        batches.push(strategies.slice(i, i + batchSize));
    }
    
    for (const batch of batches) {
        if (optimizationCanceled) break;
        
        const promises = batch.map(async (strategy, index) => {
            return new Promise((resolve) => {
                // Use setTimeout to allow UI updates
                setTimeout(() => {
                    try {
                        // Restore original state
                        buildings = JSON.parse(JSON.stringify(originalState));
                        roads.clear();
                        
                        // Run strategy
                        strategy();
                        
                        // Rebuild roads and evaluate
                        rebuildRoads();
                        const roadCount = roads.size;
                        
                        resolve({ roadCount, buildings: JSON.parse(JSON.stringify(buildings)) });
                    } catch (e) {
                        console.error('Strategy failed:', e);
                        resolve(null);
                    }
                }, index * 50); // Stagger execution
            });
        });
        
        const results = await Promise.all(promises);
        
        results.forEach(result => {
            if (result && result.roadCount < minRoads) {
                minRoads = result.roadCount;
                bestLayout = result.buildings;
            }
        });
        
        // Update progress
        const progress = Math.min(100, ((batches.indexOf(batch) + 1) / batches.length) * 100);
        document.getElementById('optimization-progress').textContent = Math.round(progress) + '%';
    }
    
    return bestLayout;
}

// Optimization strategies (keep existing ones and add new ones)

function optimizeByCluster(buildingsToOptimize) {
    const townHall = buildings.find(b => b.isTownHall);
    const roadBuildings = [...buildingsToOptimize.filter(b => b.requiresRoad)];
    const noRoadBuildings = [...buildingsToOptimize.filter(b => !b.requiresRoad)];
    
    buildings = buildings.filter(b => b.isTownHall || !buildingsToOptimize.some(opt => opt.id === b.id));
    
    let currentX = townHall.x + townHall.width + 1;
    let currentY = townHall.y;
    
    roadBuildings.forEach(building => {
        let placed = false;
        for (let attempts = 0; attempts < 200 && !placed; attempts++) {
            if (currentX + building.width > gridWidth) {
                currentX = 0;
                currentY += Math.max(...roadBuildings.map(b => b.height), 2) + 1;
            }
            
            building.x = currentX;
            building.y = currentY;
            
            if (canPlaceBuilding(building, building.x, building.y)) {
                buildings.push(building);
                placed = true;
                currentX += building.width + 1;
            } else {
                currentX += 1;
            }
        }
    });
    
    currentY = Math.max(currentY + 2, townHall.y + townHall.height + 2);
    currentX = 0;
    
    noRoadBuildings.forEach(building => {
        let placed = false;
        for (let attempts = 0; attempts < 200 && !placed; attempts++) {
            if (currentX + building.width > gridWidth) {
                currentX = 0;
                currentY += Math.max(...noRoadBuildings.map(b => b.height), 2) + 1;
            }
            
            building.x = currentX;
            building.y = currentY;
            
            if (canPlaceBuilding(building, building.x, building.y)) {
                buildings.push(building);
                placed = true;
                currentX += building.width + 1;
            } else {
                currentX += 1;
            }
        }
    });
}

function optimizeByRoadMinimization(buildingsToOptimize) {
    const townHall = buildings.find(b => b.isTownHall);
    const roadBuildings = [...buildingsToOptimize.filter(b => b.requiresRoad)].sort((a, b) => 
        (b.width * b.height) - (a.width * a.height)
    );
    const noRoadBuildings = [...buildingsToOptimize.filter(b => !b.requiresRoad)];
    
    buildings = buildings.filter(b => b.isTownHall || !buildingsToOptimize.some(opt => opt.id === b.id));
    
    // Place road buildings in a line from Town Hall
    let currentX = townHall.x;
    let currentY = townHall.y + townHall.height + 1;
    
    roadBuildings.forEach(building => {
        let placed = false;
        for (let attempts = 0; attempts < 200 && !placed; attempts++) {
            building.x = currentX;
            building.y = currentY;
            
            if (canPlaceBuilding(building, building.x, building.y)) {
                buildings.push(building);
                placed = true;
                currentX += building.width + 1;
                if (currentX + Math.max(...roadBuildings.map(b => b.width)) > gridWidth) {
                    currentX = 0;
                    currentY += Math.max(...roadBuildings.map(b => b.height)) + 1;
                }
            } else {
                currentX += 1;
                if (currentX > gridWidth) {
                    currentX = 0;
                    currentY += 1;
                }
            }
        }
    });
    
    currentY = Math.max(currentY + 2, townHall.y + townHall.height + 3);
    currentX = 0;
    
    noRoadBuildings.forEach(building => {
        let placed = false;
        for (let attempts = 0; attempts < 200 && !placed; attempts++) {
            building.x = currentX;
            building.y = currentY;
            
            if (canPlaceBuilding(building, building.x, building.y)) {
                buildings.push(building);
                placed = true;
                currentX += building.width + 1;
                if (currentX + Math.max(...noRoadBuildings.map(b => b.width), 1) > gridWidth) {
                    currentX = 0;
                    currentY += Math.max(...noRoadBuildings.map(b => b.height), 2) + 1;
                }
            } else {
                currentX += 1;
                if (currentX > gridWidth) {
                    currentX = 0;
                    currentY += 1;
                }
            }
        }
    });
}

function optimizeByDensity(buildingsToOptimize) {
    buildings = buildings.filter(b => b.isTownHall || !buildingsToOptimize.some(opt => opt.id === b.id));
    
    buildingsToOptimize.sort((a, b) => {
        if (a.requiresRoad !== b.requiresRoad) {
            return a.requiresRoad ? -1 : 1;
        }
        return (b.width * b.height) - (a.width * a.height);
    });
    
    buildingsToOptimize.forEach(building => {
        let placed = false;
        
        for (let y = 0; y <= gridHeight - building.height && !placed; y++) {
            for (let x = 0; x <= gridWidth - building.width && !placed; x++) {
                building.x = x;
                building.y = y;
                if (canPlaceBuilding(building, x, y)) {
                    buildings.push(building);
                    placed = true;
                }
            }
        }
        
        if (!placed) {
            findAndPlaceBuilding(building);
        }
    });
}

// New optimization strategies

function optimizeByGeneticAlgorithm(buildingsToOptimize, generations, populationSize) {
    buildings = buildings.filter(b => b.isTownHall || !buildingsToOptimize.some(opt => opt.id === b.id));
    const townHall = buildings.find(b => b.isTownHall);
    
    // Create initial population
    let population = [];
    for (let i = 0; i < populationSize; i++) {
        const layout = createRandomLayout(buildingsToOptimize, townHall);
        const fitness = evaluateFitness(layout);
        population.push({ layout, fitness });
    }
    
    // Evolve
    for (let gen = 0; gen < generations && !optimizationCanceled; gen++) {
        // Sort by fitness
        population.sort((a, b) => a.fitness - b.fitness);
        
        // Keep best 50%
        const survivors = population.slice(0, Math.floor(populationSize / 2));
        
        // Create new generation
        const newGeneration = [...survivors];
        
        while (newGeneration.length < populationSize) {
            const parent1 = survivors[Math.floor(Math.random() * survivors.length)];
            const parent2 = survivors[Math.floor(Math.random() * survivors.length)];
            
            const child = crossover(parent1.layout, parent2.layout, buildingsToOptimize, townHall);
            mutate(child, buildingsToOptimize);
            
            const fitness = evaluateFitness(child);
            newGeneration.push({ layout: child, fitness });
        }
        
        population = newGeneration;
    }
    
    // Get best layout
    population.sort((a, b) => a.fitness - b.fitness);
    buildings = population[0].layout;
}

function optimizeBySimulatedAnnealing(buildingsToOptimize, iterations) {
    buildings = buildings.filter(b => b.isTownHall || !buildingsToOptimize.some(opt => opt.id === b.id));
    const townHall = buildings.find(b => b.isTownHall);
    
    let currentLayout = createRandomLayout(buildingsToOptimize, townHall);
    let currentFitness = evaluateFitness(currentLayout);
    
    let temperature = 1000;
    const coolingRate = 0.995;
    
    for (let i = 0; i < iterations && !optimizationCanceled; i++) {
        const newLayout = createNeighborLayout(currentLayout, buildingsToOptimize, townHall);
        const newFitness = evaluateFitness(newLayout);
        
        const delta = newFitness - currentFitness;
        
        if (delta < 0 || Math.random() < Math.exp(-delta / temperature)) {
            currentLayout = newLayout;
            currentFitness = newFitness;
        }
        
        temperature *= coolingRate;
    }
    
    buildings = currentLayout;
}

function optimizeByGreedy(buildingsToOptimize) {
    buildings = buildings.filter(b => b.isTownHall || !buildingsToOptimize.some(opt => opt.id === b.id));
    const townHall = buildings.find(b => b.isTownHall);
    
    // Sort by priority (road buildings first, then by size)
    buildingsToOptimize.sort((a, b) => {
        if (a.requiresRoad !== b.requiresRoad) return a.requiresRoad ? -1 : 1;
        return (b.width * b.height) - (a.width * a.height);
    });
    
    buildingsToOptimize.forEach(building => {
        let bestPos = null;
        let bestScore = Infinity;
        
        // Try all positions and pick the best
        for (let y = 0; y <= gridHeight - building.height; y++) {
            for (let x = 0; x <= gridWidth - building.width; x++) {
                building.x = x;
                building.y = y;
                
                if (canPlaceBuilding(building, x, y)) {
                    // Place temporarily to evaluate
                    buildings.push(building);
                    rebuildRoads();
                    const score = roads.size;
                    buildings.pop();
                    
                    if (score < bestScore) {
                        bestScore = score;
                        bestPos = { x, y };
                    }
                }
            }
        }
        
        if (bestPos) {
            building.x = bestPos.x;
            building.y = bestPos.y;
            buildings.push(building);
        } else {
            findAndPlaceBuilding(building);
        }
    });
}

function optimizeByMinimumSpanningTree(buildingsToOptimize) {
    // Place buildings in positions that minimize road network using MST concept
    buildings = buildings.filter(b => b.isTownHall || !buildingsToOptimize.some(opt => opt.id === b.id));
    const townHall = buildings.find(b => b.isTownHall);
    
    const roadBuildings = buildingsToOptimize.filter(b => b.requiresRoad);
    
    // Place road buildings in a tree-like structure around Town Hall
    roadBuildings.sort((a, b) => (b.width * b.height) - (a.width * a.height));
    
    let placedBuildings = [townHall];
    
    roadBuildings.forEach(building => {
        let bestPos = null;
        let minDistance = Infinity;
        
        // Find position closest to any already placed building
        placedBuildings.forEach(placed => {
            for (let y = 0; y <= gridHeight - building.height; y++) {
                for (let x = 0; x <= gridWidth - building.width; x++) {
                    building.x = x;
                    building.y = y;
                    
                    if (canPlaceBuilding(building, x, y)) {
                        const centerX = x + building.width / 2;
                        const centerY = y + building.height / 2;
                        const placedCenterX = placed.x + placed.width / 2;
                        const placedCenterY = placed.y + placed.height / 2;
                        
                        const dist = Math.abs(centerX - placedCenterX) + Math.abs(centerY - placedCenterY);
                        
                        if (dist < minDistance) {
                            minDistance = dist;
                            bestPos = { x, y };
                        }
                    }
                }
            }
        });
        
        if (bestPos) {
            building.x = bestPos.x;
            building.y = bestPos.y;
            buildings.push(building);
            placedBuildings.push(building);
        } else {
            findAndPlaceBuilding(building);
            placedBuildings.push(building);
        }
    });
    
    // Place non-road buildings
    const noRoadBuildings = buildingsToOptimize.filter(b => !b.requiresRoad);
    noRoadBuildings.forEach(building => {
        findAndPlaceBuilding(building);
    });
}

function optimizeBySpiral(buildingsToOptimize) {
    buildings = buildings.filter(b => b.isTownHall || !buildingsToOptimize.some(opt => opt.id === b.id));
    const townHall = buildings.find(b => b.isTownHall);
    
    const centerX = townHall.x + Math.floor(townHall.width / 2);
    const centerY = townHall.y + Math.floor(townHall.height / 2);
    
    buildingsToOptimize.sort((a, b) => {
        if (a.requiresRoad !== b.requiresRoad) return a.requiresRoad ? -1 : 1;
        return (b.width * b.height) - (a.width * a.height);
    });
    
    buildingsToOptimize.forEach((building, index) => {
        // Place in spiral pattern
        let radius = 1;
        let placed = false;
        
        while (!placed && radius < Math.max(gridWidth, gridHeight)) {
            for (let angle = 0; angle < Math.PI * 2 && !placed; angle += Math.PI / 4) {
                const x = Math.round(centerX + radius * Math.cos(angle)) - Math.floor(building.width / 2);
                const y = Math.round(centerY + radius * Math.sin(angle)) - Math.floor(building.height / 2);
                
                building.x = x;
                building.y = y;
                
                if (canPlaceBuilding(building, x, y)) {
                    buildings.push(building);
                    placed = true;
                }
            }
            radius++;
        }
        
        if (!placed) {
            findAndPlaceBuilding(building);
        }
    });
}

// Helper functions for genetic algorithm
function createRandomLayout(buildingsToOptimize, townHall) {
    const layout = [townHall];
    
    buildingsToOptimize.forEach(building => {
        let placed = false;
        let attempts = 0;
        
        while (!placed && attempts < 1000) {
            building.x = Math.floor(Math.random() * (gridWidth - building.width + 1));
            building.y = Math.floor(Math.random() * (gridHeight - building.height + 1));
            
            if (canPlaceBuilding(building, building.x, building.y)) {
                layout.push({ ...building });
                placed = true;
            }
            attempts++;
        }
        
        if (!placed) {
            // Fallback to spiral placement
            const radius = Math.floor(Math.sqrt(layout.length));
            building.x = Math.max(0, Math.min(gridWidth - building.width, townHall.x + radius));
            building.y = Math.max(0, Math.min(gridHeight - building.height, townHall.y + radius));
            layout.push({ ...building });
        }
    });
    
    return layout;
}

function evaluateFitness(layout) {
    // Temporarily set buildings to evaluate
    const tempBuildings = buildings;
    buildings = layout;
    rebuildRoads();
    const roadCount = roads.size;
    buildings = tempBuildings;
    return roadCount;
}

function crossover(layout1, layout2, buildingsToOptimize, townHall) {
    const child = [townHall];
    
    buildingsToOptimize.forEach((building, index) => {
        const b1 = layout1.find(b => b.id === building.id || (b.name === building.name && b.width === building.width && b.height === building.height));
        const b2 = layout2.find(b => b.id === building.id || (b.name === building.name && b.width === building.width && b.height === building.height));
        
        // Randomly choose from parent 1 or 2
        const parent = Math.random() < 0.5 ? b1 : b2;
        
        if (parent) {
            child.push({ ...building, x: parent.x, y: parent.y });
        } else {
            // Random position
            building.x = Math.floor(Math.random() * (gridWidth - building.width + 1));
            building.y = Math.floor(Math.random() * (gridHeight - building.height + 1));
            child.push({ ...building });
        }
    });
    
    return child;
}

function mutate(layout, buildingsToOptimize) {
    // Randomly move some buildings
    buildingsToOptimize.forEach((building, index) => {
        if (Math.random() < 0.3) { // 30% mutation rate
            const layoutBuilding = layout.find(b => b.id === building.id || (b.name === building.name && b.width === building.width && b.height === building.height));
            if (layoutBuilding) {
                const dx = Math.floor(Math.random() * 7) - 3;
                const dy = Math.floor(Math.random() * 7) - 3;
                
                layoutBuilding.x = Math.max(0, Math.min(gridWidth - building.width, layoutBuilding.x + dx));
                layoutBuilding.y = Math.max(0, Math.min(gridHeight - building.height, layoutBuilding.y + dy));
            }
        }
    });
}

function createNeighborLayout(currentLayout, buildingsToOptimize, townHall) {
    const neighbor = currentLayout.map(b => ({ ...b }));
    
    // Randomly move one building
    const movable = neighbor.filter(b => !b.isTownHall);
    if (movable.length > 0) {
        const building = movable[Math.floor(Math.random() * movable.length)];
        const dx = Math.floor(Math.random() * 7) - 3;
        const dy = Math.floor(Math.random() * 7) - 3;
        
        building.x = Math.max(0, Math.min(gridWidth - building.width, building.x + dx));
        building.y = Math.max(0, Math.min(gridHeight - building.height, building.y + dy));
    }
    
    return neighbor;
}

