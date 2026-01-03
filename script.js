// Global State
const state = {
    maze: [],
    rows: 15,
    cols: 15,
    start: null,
    end: null,
    animationSpeed: 50,
    isRunning: false,
    bfsStats: { time: 0, visited: 0, pathLength: 0, memory: 0 },
    dfsStats: { time: 0, visited: 0, pathLength: 0, memory: 0 },
    charts: {}
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    generateMaze();
    initializeCharts();
});

// Event Listeners
function initializeEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const section = btn.dataset.section;
            document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
            document.getElementById(section).classList.add('active');
        });
    });

    // Controls
    document.getElementById('maze-size').addEventListener('input', (e) => {
        const size = parseInt(e.target.value);
        state.rows = size;
        state.cols = size;
        document.getElementById('maze-size-value').textContent = `${size}x${size}`;
    });

    document.getElementById('obstacle-density').addEventListener('input', (e) => {
        document.getElementById('obstacle-density-value').textContent = `${e.target.value}%`;
    });

    document.getElementById('animation-speed').addEventListener('input', (e) => {
        state.animationSpeed = parseInt(e.target.value);
        document.getElementById('animation-speed-value').textContent = `${e.target.value}ms`;
    });

    // Buttons
    document.getElementById('generate-maze').addEventListener('click', generateMaze);
    document.getElementById('run-bfs').addEventListener('click', () => runAlgorithm('bfs'));
    document.getElementById('run-dfs').addEventListener('click', () => runAlgorithm('dfs'));
    document.getElementById('run-both').addEventListener('click', runBothAlgorithms);
    document.getElementById('reset').addEventListener('click', resetMaze);
}

// Maze Generation
function generateMaze() {
    if (state.isRunning) return;

    const density = parseInt(document.getElementById('obstacle-density').value);
    state.maze = [];

    // Initialize grid
    for (let i = 0; i < state.rows; i++) {
        state.maze[i] = [];
        for (let j = 0; j < state.cols; j++) {
            state.maze[i][j] = {
                row: i,
                col: j,
                isWall: Math.random() * 100 < density,
                isStart: false,
                isEnd: false,
                visited: false,
                parent: null
            };
        }
    }

    // Randomize start position (anywhere in the maze)
    const startRow = Math.floor(Math.random() * state.rows);
    const startCol = Math.floor(Math.random() * state.cols);
    state.start = { row: startRow, col: startCol };

    // Randomize end position (ensure it's far from start)
    let endRow, endCol;
    do {
        endRow = Math.floor(Math.random() * state.rows);
        endCol = Math.floor(Math.random() * state.cols);
        // Calculate Manhattan distance to ensure start and end are reasonably far apart
        const distance = Math.abs(endRow - startRow) + Math.abs(endCol - startCol);
        // Require at least 1/3 of the maximum possible distance
        const minDistance = Math.floor((state.rows + state.cols) / 3);
        if (distance >= minDistance) break;
    } while (true);

    state.end = { row: endRow, col: endCol };

    // Clear walls at start and end positions
    state.maze[state.start.row][state.start.col].isWall = false;
    state.maze[state.start.row][state.start.col].isStart = true;
    state.maze[state.end.row][state.end.col].isWall = false;
    state.maze[state.end.row][state.end.col].isEnd = true;

    renderMaze();
    resetStats();
}

// Render Maze
function renderMaze() {
    const grid = document.getElementById('maze-grid');
    grid.innerHTML = '';
    grid.style.gridTemplateColumns = `repeat(${state.cols}, 1fr)`;

    for (let i = 0; i < state.rows; i++) {
        for (let j = 0; j < state.cols; j++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = i;
            cell.dataset.col = j;

            const cellData = state.maze[i][j];
            if (cellData.isStart) cell.classList.add('start');
            else if (cellData.isEnd) cell.classList.add('end');
            else if (cellData.isWall) cell.classList.add('wall');

            grid.appendChild(cell);
        }
    }
}

// Reset Maze
function resetMaze() {
    if (state.isRunning) return;

    // Clear visited and path states
    for (let i = 0; i < state.rows; i++) {
        for (let j = 0; j < state.cols; j++) {
            state.maze[i][j].visited = false;
            state.maze[i][j].parent = null;
        }
    }

    // Clear visual states
    document.querySelectorAll('.cell').forEach(cell => {
        cell.classList.remove('visited-bfs', 'visited-dfs', 'path');
    });

    // Clear canvas
    const canvas = document.getElementById('path-canvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    resetStats();
}

// Reset Statistics
function resetStats() {
    state.bfsStats = { time: 0, visited: 0, pathLength: 0, memory: 0 };
    state.dfsStats = { time: 0, visited: 0, pathLength: 0, memory: 0 };

    updateStatsDisplay('bfs', state.bfsStats, 'Ready');
    updateStatsDisplay('dfs', state.dfsStats, 'Ready');
}

// Update Statistics Display
function updateStatsDisplay(algorithm, stats, status) {
    const prefix = algorithm;
    document.getElementById(`${prefix}-time`).textContent = stats.time ? `${stats.time}ms` : '-';
    document.getElementById(`${prefix}-visited`).textContent = stats.visited || '-';
    document.getElementById(`${prefix}-path`).textContent = stats.pathLength || '-';
    document.getElementById(`${prefix}-memory`).textContent = stats.memory ? `${stats.memory} nodes` : '-';
    document.getElementById(`${prefix}-status`).textContent = status;
}

// Get Neighbors
function getNeighbors(cell) {
    const neighbors = [];
    const directions = [
        { row: -1, col: 0 },  // Up
        { row: 1, col: 0 },   // Down
        { row: 0, col: -1 },  // Left
        { row: 0, col: 1 }    // Right
    ];

    for (const dir of directions) {
        const newRow = cell.row + dir.row;
        const newCol = cell.col + dir.col;

        if (newRow >= 0 && newRow < state.rows &&
            newCol >= 0 && newCol < state.cols &&
            !state.maze[newRow][newCol].isWall) {
            neighbors.push(state.maze[newRow][newCol]);
        }
    }

    return neighbors;
}

// BFS Algorithm
async function bfs() {
    const startTime = performance.now();
    const queue = [state.maze[state.start.row][state.start.col]];
    const visited = new Set();
    let visitedCount = 0;
    let maxQueueSize = 1;

    visited.add(`${state.start.row},${state.start.col}`);

    while (queue.length > 0) {
        maxQueueSize = Math.max(maxQueueSize, queue.length);
        const current = queue.shift();
        visitedCount++;

        // Visualize
        if (!current.isStart && !current.isEnd) {
            const cell = document.querySelector(`[data-row="${current.row}"][data-col="${current.col}"]`);
            cell.classList.add('visited-bfs');
            await sleep(state.animationSpeed);
        }

        // Check if reached end
        if (current.row === state.end.row && current.col === state.end.col) {
            const endTime = performance.now();
            const path = reconstructPath(current);

            state.bfsStats = {
                time: Math.round(endTime - startTime),
                visited: visitedCount,
                pathLength: path.length,
                memory: maxQueueSize
            };

            await visualizePath(path, 'bfs');
            return true;
        }

        // Explore neighbors
        const neighbors = getNeighbors(current);
        for (const neighbor of neighbors) {
            const key = `${neighbor.row},${neighbor.col}`;
            if (!visited.has(key)) {
                visited.add(key);
                neighbor.parent = current;
                queue.push(neighbor);
            }
        }
    }

    const endTime = performance.now();
    state.bfsStats = {
        time: Math.round(endTime - startTime),
        visited: visitedCount,
        pathLength: 0,
        memory: maxQueueSize
    };

    return false;
}

// DFS Algorithm
async function dfs() {
    const startTime = performance.now();
    const stack = [state.maze[state.start.row][state.start.col]];
    const visited = new Set();
    let visitedCount = 0;
    let maxStackSize = 1;

    visited.add(`${state.start.row},${state.start.col}`);

    while (stack.length > 0) {
        maxStackSize = Math.max(maxStackSize, stack.length);
        const current = stack.pop();
        visitedCount++;

        // Visualize
        if (!current.isStart && !current.isEnd) {
            const cell = document.querySelector(`[data-row="${current.row}"][data-col="${current.col}"]`);
            cell.classList.add('visited-dfs');
            await sleep(state.animationSpeed);
        }

        // Check if reached end
        if (current.row === state.end.row && current.col === state.end.col) {
            const endTime = performance.now();
            const path = reconstructPath(current);

            state.dfsStats = {
                time: Math.round(endTime - startTime),
                visited: visitedCount,
                pathLength: path.length,
                memory: maxStackSize
            };

            await visualizePath(path, 'dfs');
            return true;
        }

        // Explore neighbors
        const neighbors = getNeighbors(current);
        for (const neighbor of neighbors) {
            const key = `${neighbor.row},${neighbor.col}`;
            if (!visited.has(key)) {
                visited.add(key);
                neighbor.parent = current;
                stack.push(neighbor);
            }
        }
    }

    const endTime = performance.now();
    state.dfsStats = {
        time: Math.round(endTime - startTime),
        visited: visitedCount,
        pathLength: 0,
        memory: maxStackSize
    };

    return false;
}

// Reconstruct Path
function reconstructPath(endCell) {
    const path = [];
    let current = endCell;

    while (current !== null) {
        path.unshift(current);
        current = current.parent;
    }

    return path;
}

// Visualize Path with Animated Snake
async function visualizePath(path, algorithm) {
    // Get the maze grid container
    const mazeGrid = document.getElementById('maze-grid');
    const gridRect = mazeGrid.getBoundingClientRect();
    const cellSize = mazeGrid.querySelector('.cell').getBoundingClientRect().width;

    // Create a canvas overlay for the animated line
    let canvas = document.getElementById('path-canvas');
    if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.id = 'path-canvas';
        canvas.style.position = 'absolute';
        canvas.style.pointerEvents = 'none';
        canvas.style.zIndex = '5';
        mazeGrid.style.position = 'relative';
        mazeGrid.appendChild(canvas);
    }

    canvas.width = gridRect.width;
    canvas.height = gridRect.height;
    canvas.style.width = gridRect.width + 'px';
    canvas.style.height = gridRect.height + 'px';
    canvas.style.top = '0';
    canvas.style.left = '0';

    const ctx = canvas.getContext('2d');

    // Clear previous path
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Animate the snake moving through the path
    for (let i = 0; i < path.length; i++) {
        const cell = path[i];

        // Highlight current cell
        if (!cell.isStart && !cell.isEnd) {
            const cellElement = document.querySelector(`[data-row="${cell.row}"][data-col="${cell.col}"]`);
            cellElement.classList.add('path');
        }

        // Draw line segment if not the first cell
        if (i > 0) {
            const prevCell = path[i - 1];

            // Calculate center positions relative to the grid
            // Account for gap (2px) between cells
            const gap = 2;
            const prevX = (prevCell.col * (cellSize + gap)) + cellSize / 2;
            const prevY = (prevCell.row * (cellSize + gap)) + cellSize / 2;
            const currX = (cell.col * (cellSize + gap)) + cellSize / 2;
            const currY = (cell.row * (cellSize + gap)) + cellSize / 2;

            // Draw glowing line segment
            ctx.strokeStyle = algorithm === 'bfs' ? '#0095f6' : '#ec4899';
            ctx.lineWidth = cellSize * 0.4;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            // Outer glow
            ctx.shadowBlur = 20;
            ctx.shadowColor = algorithm === 'bfs' ? 'rgba(0, 149, 246, 0.8)' : 'rgba(236, 72, 153, 0.8)';

            ctx.beginPath();
            ctx.moveTo(prevX, prevY);
            ctx.lineTo(currX, currY);
            ctx.stroke();

            // Inner bright line
            ctx.shadowBlur = 10;
            ctx.strokeStyle = algorithm === 'bfs' ? '#5dbbff' : '#ff8dc7';
            ctx.lineWidth = cellSize * 0.25;

            ctx.beginPath();
            ctx.moveTo(prevX, prevY);
            ctx.lineTo(currX, currY);
            ctx.stroke();

            // Draw a circle at the current position (snake head)
            ctx.shadowBlur = 15;
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath();
            ctx.arc(currX, currY, cellSize * 0.3, 0, Math.PI * 2);
            ctx.fill();
        }

        await sleep(state.animationSpeed * 1.5);
    }

    // Final pulse effect on the end
    const endCell = path[path.length - 1];
    const endElement = document.querySelector(`[data-row="${endCell.row}"][data-col="${endCell.col}"]`);
    endElement.style.animation = 'pulse 0.5s ease-in-out 3';
}

// Run Algorithm
async function runAlgorithm(algorithm) {
    if (state.isRunning) return;

    state.isRunning = true;
    resetMaze();

    updateStatsDisplay(algorithm, algorithm === 'bfs' ? state.bfsStats : state.dfsStats, 'Running...');

    let success;
    if (algorithm === 'bfs') {
        success = await bfs();
    } else {
        success = await dfs();
    }

    const stats = algorithm === 'bfs' ? state.bfsStats : state.dfsStats;
    updateStatsDisplay(algorithm, stats, success ? 'Path Found!' : 'No Path');
    updateCharts();

    state.isRunning = false;
}

// Run Both Algorithms
async function runBothAlgorithms() {
    if (state.isRunning) return;

    // Run BFS
    await runAlgorithm('bfs');

    // Wait a bit
    await sleep(500);

    // Reset only the visual state, not statistics
    // Clear visited and path states
    for (let i = 0; i < state.rows; i++) {
        for (let j = 0; j < state.cols; j++) {
            state.maze[i][j].visited = false;
            state.maze[i][j].parent = null;
        }
    }

    // Clear visual states
    document.querySelectorAll('.cell').forEach(cell => {
        cell.classList.remove('visited-bfs', 'visited-dfs', 'path');
    });

    // Clear canvas
    const canvas = document.getElementById('path-canvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    // Run DFS (BFS stats are preserved)
    await runAlgorithm('dfs');
}

// Utility: Sleep
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Initialize Charts
function initializeCharts() {
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
            legend: {
                labels: {
                    color: '#999',
                    font: { family: 'Inter' }
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: { color: '#999' },
                grid: { color: 'rgba(255, 255, 255, 0.1)' }
            },
            x: {
                ticks: { color: '#999' },
                grid: { color: 'rgba(255, 255, 255, 0.1)' }
            }
        }
    };

    // Time Chart
    state.charts.time = new Chart(document.getElementById('time-chart'), {
        type: 'bar',
        data: {
            labels: ['BFS', 'DFS'],
            datasets: [{
                label: 'Execution Time (ms)',
                data: [0, 0],
                backgroundColor: ['rgba(0, 149, 246, 0.6)', 'rgba(236, 72, 153, 0.6)'],
                borderColor: ['rgb(0, 149, 246)', 'rgb(236, 72, 153)'],
                borderWidth: 2
            }]
        },
        options: chartOptions
    });

    // Space Chart
    state.charts.space = new Chart(document.getElementById('space-chart'), {
        type: 'bar',
        data: {
            labels: ['BFS', 'DFS'],
            datasets: [{
                label: 'Memory Usage (nodes)',
                data: [0, 0],
                backgroundColor: ['rgba(0, 149, 246, 0.6)', 'rgba(236, 72, 153, 0.6)'],
                borderColor: ['rgb(0, 149, 246)', 'rgb(236, 72, 153)'],
                borderWidth: 2
            }]
        },
        options: chartOptions
    });

    // Path Chart
    state.charts.path = new Chart(document.getElementById('path-chart'), {
        type: 'bar',
        data: {
            labels: ['BFS', 'DFS'],
            datasets: [{
                label: 'Path Length',
                data: [0, 0],
                backgroundColor: ['rgba(0, 149, 246, 0.6)', 'rgba(236, 72, 153, 0.6)'],
                borderColor: ['rgb(0, 149, 246)', 'rgb(236, 72, 153)'],
                borderWidth: 2
            }]
        },
        options: chartOptions
    });

    // Exploration Chart
    state.charts.exploration = new Chart(document.getElementById('exploration-chart'), {
        type: 'bar',
        data: {
            labels: ['BFS', 'DFS'],
            datasets: [{
                label: 'Nodes Visited',
                data: [0, 0],
                backgroundColor: ['rgba(0, 149, 246, 0.6)', 'rgba(236, 72, 153, 0.6)'],
                borderColor: ['rgb(0, 149, 246)', 'rgb(236, 72, 153)'],
                borderWidth: 2
            }]
        },
        options: chartOptions
    });
}

// Update Charts
function updateCharts() {
    if (state.charts.time) {
        state.charts.time.data.datasets[0].data = [state.bfsStats.time, state.dfsStats.time];
        state.charts.time.update();
    }

    if (state.charts.space) {
        state.charts.space.data.datasets[0].data = [state.bfsStats.memory, state.dfsStats.memory];
        state.charts.space.update();
    }

    if (state.charts.path) {
        state.charts.path.data.datasets[0].data = [state.bfsStats.pathLength, state.dfsStats.pathLength];
        state.charts.path.update();
    }

    if (state.charts.exploration) {
        state.charts.exploration.data.datasets[0].data = [state.bfsStats.visited, state.dfsStats.visited];
        state.charts.exploration.update();
    }
}
