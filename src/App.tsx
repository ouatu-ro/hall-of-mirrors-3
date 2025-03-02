import { createStore } from "solid-js/store";

type FixedNumbers = {
  top: { [key: number]: number };
  left: { [key: number]: number };
  right: { [key: number]: number };
  bottom: { [key: number]: number };
};

type Line = {
  start: [number, number];
  end: [number, number];
};

type MirrorType = "/" | "\\";

export const [store, setStore] = createStore<{
  fixedNumbers: FixedNumbers;
  grid: string[][];
  lines: Line[];
  mirrors: { [key: string]: MirrorType };
}>({
  fixedNumbers: {
    top: { 3: 9 },
    left: { 4: 16 },
    right: { 2: 75 },
    bottom: { 3: 36 },
  },
  grid: Array.from({ length: 5 }, () => Array(5).fill("")),
  lines: [],
  mirrors: {},
});

// Toggle mirrors via left/right clicks
const handleMirrorClick = (row: number, col: number, event: MouseEvent) => {
  event.preventDefault(); // Prevents default right-click menu

  const key = `${row},${col}`;
  const currentMirror = store.mirrors[key];

  if (event.button === 0) {
    // Left Click → Toggle "/"
    if (currentMirror === "/") {
      // Remove existing "/"
      setStore("mirrors", key, undefined);
    } else {
      // Place "/"
      setStore("mirrors", key, "/");
    }
  } else if (event.button === 2) {
    // Right Click → Toggle "\"
    if (currentMirror === "\\") {
      // Remove existing "\"
      setStore("mirrors", key, undefined);
    } else {
      // Place "\"
      setStore("mirrors", key, "\\");
    }
  }
};

const App = () => {
  return (
    <div class="grid-container">
      {/* 1) Render the 9x9 grid */}

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
          return (
            <div
              class="grid-cell"
              onMouseDown={(event) =>
                handleMirrorClick(row - 2, col - 2, event)
              }
              onContextMenu={(event) => event.preventDefault()}
            >
              {/* 2) Render a small SVG inside each cell for the mirror */}
              <svg class="mirror-overlay">
                {store.mirrors[`${row - 2},${col - 2}`] === "/" && (
                  <line
                    x1="5"
                    y1="5"
                    x2="45"
                    y2="45"
                    stroke="black"
                    stroke-width="2"
                  />
                )}
                {store.mirrors[`${row - 2},${col - 2}`] === "\\" && (
                  <line
                    x1="5"
                    y1="45"
                    x2="45"
                    y2="5"
                    stroke="black"
                    stroke-width="2"
                  />
                )}
              </svg>
            </div>
          );
        })
      )}

      {/* 3) SVG overlay for big lines between cells */}
      <svg class="line-overlay">
        {store.lines.map(({ start, end }) => {
          const cellSize = 50;
          const offset = 25;
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
