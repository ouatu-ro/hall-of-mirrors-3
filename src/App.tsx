import { createStore } from "solid-js/store";

type FixedNumbers = {
  top: { [key: number]: number };
  left: { [key: number]: number };
  right: { [key: number]: number };
  bottom: { [key: number]: number };
};

type Line = {
  start: [number, number]; // [row, col]
  end: [number, number]; // [row, col]
};

export const [store, setStore] = createStore<{
  fixedNumbers: FixedNumbers;
  grid: string[][];
  lines: Line[];
}>({
  fixedNumbers: {
    top: { 3: 9 },
    left: { 4: 16 },
    right: { 2: 75 },
    bottom: { 3: 36 },
  },
  grid: Array.from({ length: 5 }, () => Array(5).fill("")),
  lines: [], // Store drawn lines
});

// Function to add a line
const addLine = (start: [number, number], end: [number, number]) => {
  setStore("lines", (lines) => [...lines, { start, end }]);
};

const App = () => {
  return (
    <div class="grid-container">
      {/* Render the grid */}
      {Array.from({ length: 9 }).map((_, row) =>
        Array.from({ length: 9 }).map((_, col) => {
          // Outer circle: Numbers
          if (row === 0 || row === 8 || col === 0 || col === 8) {
            return (
              <div class="number">
                {(row === 0 && store.fixedNumbers.top[col - 1]) ||
                  (row === 8 && store.fixedNumbers.bottom[col - 1]) ||
                  (col === 0 && store.fixedNumbers.left[row - 1]) ||
                  (col === 8 && store.fixedNumbers.right[row - 1])}
              </div>
            );
          }

          // Inner circle: Dots
          if (
            (row === 1 || row === 7 || col === 1 || col === 7) &&
            !(row === 1 && col === 1) &&
            !(row === 1 && col === 7) &&
            !(row === 7 && col === 1) &&
            !(row === 7 && col === 7)
          ) {
            return <div class="dot">•</div>;
          }

          // Center: 5x5 Grid
          return <div class="grid-cell">{store.grid[row - 2]?.[col - 2]}</div>;
        })
      )}

      {/* SVG Overlay for Lines */}
      <svg class="line-overlay">
        {store.lines.map(({ start, end }) => {
          const cellSize = 50; // Adjust based on your grid cell size
          const offset = 25; // Half of cell size for centering
          const x1 = start[1] * cellSize + offset;
          const y1 = start[0] * cellSize + offset;
          const x2 = end[1] * cellSize + offset;
          const y2 = end[0] * cellSize + offset;

          return (
            <line
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="black"
              stroke-width="2"
            />
          );
        })}
      </svg>
    </div>
  );
};

export default App;
