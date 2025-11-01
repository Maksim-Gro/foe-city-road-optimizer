# Forge of Empires City Road Optimizer

A modern, feature-rich web-based tool for simulating and optimizing city layouts from Forge of Empires. Create buildings, manage road connections, and find the most efficient city layout that minimizes road usage using advanced optimization algorithms.

## ✨ Features

### Core Functionality
- **Grid System**: Configurable grid size (1-15 expansions, where each expansion = 4×4 tiles)
- **Building Management**: Add buildings with custom dimensions, road requirements, colors, and grouping
- **Town Hall**: Pre-placed Town Hall (7×6) as the central building
- **Drag & Drop**: Intuitive drag-and-drop interface for placing buildings
- **Road System**: Automatic road generation connecting all road-requiring buildings to the Town Hall
- **Building Sets**: Organize buildings into sets for better management

### Advanced Optimization
- **8 Optimization Algorithms**:
  1. Cluster Strategy - Groups road-requiring buildings near Town Hall
  2. Road Minimization - Minimizes total road length
  3. Density Maximization - Maximizes building density while minimizing roads
  4. Genetic Algorithm - Evolves solutions over generations
  5. Simulated Annealing - Advanced probabilistic optimization
  6. Greedy Algorithm - Greedy placement for optimal local choices
  7. Minimum Spanning Tree - Tree-based road network optimization
  8. Spiral Placement - Spiral pattern around Town Hall
- **Parallel Processing**: Run multiple optimization strategies simultaneously (1-12 processes)
- **Progress Tracking**: Real-time progress updates during optimization
- **Auto-Optimize**: Optional automatic optimization on building changes

### UI Features
- **Zoom Controls**: Zoom in/out with slider (50% - 200%)
- **Rotation**: Rotate canvas view (90°, 180°, 270°)
- **Legend**: Toggle building labels (name, size, both, or none)
- **Statistics**: Real-time statistics (placed buildings, roads, empty tiles, total)
- **Screenshot**: Export canvas as PNG image
- **Undo/Redo**: Full history support with undo/redo (up to 50 states)
- **Import/Export**: Save and load city layouts as JSON files
- **Local Storage**: Save cities to browser storage
- **Modal Dialogs**: Clean modal interface for adding/editing buildings

### Visual Enhancements
- **Modern Design**: Beautiful gradient header and modern UI
- **Responsive Layout**: Works on different screen sizes
- **Material Icons**: Consistent iconography throughout
- **Color Customization**: Choose colors for road-required and non-road buildings
- **Visibility Toggles**: Show/hide buildings and Town Hall
- **Visual Feedback**: Hover effects, transitions, and visual indicators

## 📁 Files

- `index.html` - Main HTML structure with all UI components
- `styles.css` - Modern styling with responsive design
- `script.js` - Complete functionality including optimization algorithms

## 🚀 How to Use

### Getting Started

1. **Open the Application**
   - Open `index.html` in a modern web browser
   - The Town Hall is automatically placed in the center

2. **Set Grid Size**
   - Enter width and height in expansions (1-15)
   - Click "Apply Grid Size"
   - Each expansion = 4×4 tiles (maximum 15×15 = 60×60 tiles)

### Building Management

1. **Add Buildings**
   - Click the "+" button next to "Buildings" or use the Add Building button
   - Fill in the building form:
     - Name (e.g., "House", "Barracks")
     - Width and Height (in tiles)
     - Road requirement checkbox
     - Color selection
     - Optional: Assign to a Building Set
   - Click "Add Building"
   - Drag the building from the sidebar onto the grid

2. **Move Buildings**
   - Click and drag buildings directly on the grid
   - Buildings cannot overlap
   - Buildings are automatically constrained to grid boundaries

3. **Edit Buildings**
   - Click "Edit" on any building in the sidebar
   - Modify properties and click "Update Building"

4. **Delete Buildings**
   - Click the "×" button on any building in the sidebar
   - Town Hall cannot be deleted

5. **Building Sets**
   - Create sets to organize buildings
   - Add buildings to sets when creating them
   - Useful for managing large cities

### Optimization

1. **Configure Optimization**
   - Set number of parallel processes (1-12)
   - Toggle "Auto-Optimize" for automatic optimization
   - Adjust settings as needed

2. **Run Optimization**
   - Click the "Solve" button
   - Watch progress in the footer
   - The system tries multiple algorithms and selects the best result
   - Click "Cancel" to stop optimization if needed

3. **Review Results**
   - Road count is displayed in statistics
   - Compare with original layout
   - Use Undo if you prefer the previous layout

### View Controls

- **Zoom**: Use the zoom slider or +/- buttons (50% - 200%)
- **Rotate**: Use the rotate menu (right-click the rotate button) to rotate view
- **Legend**: Change the legend dropdown to show/hide building labels
- **Screenshot**: Click the screenshot button to save the current view

### Import/Export

1. **Export City**
   - Click "Export" to save city as JSON file
   - Or use Ctrl+S / Cmd+S keyboard shortcut

2. **Import City**
   - Click "Import" to load a saved city
   - Select a JSON file previously exported

3. **Save to Browser**
   - Click "Save" to save to browser's local storage
   - City is automatically loaded on next visit

### Keyboard Shortcuts

- `Ctrl+Z` / `Cmd+Z` - Undo
- `Ctrl+Shift+Z` / `Cmd+Shift+Z` or `Ctrl+Y` / `Cmd+Y` - Redo
- `Ctrl+S` / `Cmd+S` - Export city

## 🔧 Road System

- Roads are automatically generated to connect all buildings requiring roads to the Town Hall
- Roads use Manhattan distance pathfinding (L-shaped paths)
- Roads cannot be placed on buildings
- Road network ensures all road-requiring buildings are connected
- Roads are displayed in grey color
- Road count is minimized during optimization

## 📊 Optimization Algorithms Explained

### 1. Cluster Strategy
Groups road-requiring buildings near the Town Hall to minimize road length.

### 2. Road Minimization
Places buildings in a line from Town Hall to minimize total road tiles.

### 3. Density Maximization
Packs buildings as densely as possible while maintaining road connectivity.

### 4. Genetic Algorithm
Evolves solutions over multiple generations, selecting best layouts and creating variations.

### 5. Simulated Annealing
Uses probabilistic acceptance to escape local optima and find better solutions.

### 6. Greedy Algorithm
Makes optimal local choices at each step, evaluating all positions before placing.

### 7. Minimum Spanning Tree
Uses tree-like placement to minimize road network length.

### 8. Spiral Placement
Places buildings in a spiral pattern around Town Hall for efficient spacing.

## 🎨 Customization

- **Colors**: Choose custom colors for road-required and non-road buildings
- **Grid Size**: Adjust from 1×1 to 15×15 expansions
- **Zoom Level**: Adjust from 50% to 200%
- **Legend Display**: Choose what information to display on buildings

## 💾 Data Format

The export format is JSON:
```json
{
  "version": "1.0",
  "gridWidth": 20,
  "gridHeight": 20,
  "buildings": [...],
  "buildingSets": [...],
  "timestamp": "2024-..."
}
```

## 🔍 Technical Details

- **Canvas Rendering**: HTML5 Canvas for grid and building visualization
- **Pathfinding**: Manhattan distance (L-shaped) paths for roads
- **Overlap Detection**: Collision detection prevents building overlap
- **State Management**: Full undo/redo history system
- **Performance**: Optimized for large grids and many buildings
- **Responsive Design**: Adapts to different screen sizes
- **Browser Compatibility**: Modern browsers (Chrome, Firefox, Safari, Edge)

## 🆚 Improvements Over Reference Site

- **Better UI/UX**: Modern, intuitive interface with Material Design
- **More Optimization Algorithms**: 8 different strategies vs 3
- **Parallel Processing**: Run multiple algorithms simultaneously
- **Better Performance**: Optimized rendering and algorithms
- **More Features**: Building sets, undo/redo, import/export, zoom, rotation
- **Better Statistics**: Detailed statistics display
- **Visual Feedback**: Progress indicators and visual cues
- **Keyboard Shortcuts**: Power user features
- **Auto-Save**: Browser storage integration

## 📝 Notes

- The optimization may take some time for large cities with many buildings
- Some algorithms are probabilistic and may produce different results on each run
- Use parallel processing for faster optimization (more processes = faster but uses more CPU)
- Buildings that don't fit in the grid cannot be placed
- Town Hall cannot be deleted or moved (it's the anchor for all road networks)
