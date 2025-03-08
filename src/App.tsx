import { createSignal, createEffect, onMount } from "solid-js";
import { createStore } from "solid-js/store";

/** TYPES **/
type FixedNumbers = {
  top: { [key: number]: number };
  left: { [key: number]: number };
  right: { [key: number]: number };
  bottom: { [key: number]: number };
};
console.log("CI/CD test");
type MirrorType = "/" | "\\";

type Line = {
  start: [number, number]; // (row,col) in the total grid
  end: [number, number];
  color?: string; // "green" or "red"
};

type LaserOutput = {
  product: number;
  color: "red" | "green";
};

/** CONFIGURABLE SIZES **/
// E.g. a 10×10 center
const centerSize = 10;
// We add 2 rings on each side => totalSize = centerSize + 4
//  (1 outer ring + 1 inner ring) × 2
const totalSize = centerSize + 4;
// Index of the last row/column
const last = totalSize - 1;

/** MAIN STORE (NO laser lines/outputs) **/
const [store, setStore] = createStore<{
  fixedNumbers: FixedNumbers;
  mirrors: { [key: string]: MirrorType };
  lines: Line[]; // any original big lines you might have
}>({
  // Example: place numbers on top/bottom/left/right
  fixedNumbers: {
    top: { 4: 112, 6: 48, 7: 3087, 8: 9, 11: 1 },
    left: { 5: 27, 9: 12, 10: 225 },
    right: { 3: 4, 4: 27, 8: 16 },
    bottom: { 2: 2025, 5: 12, 6: 64, 7: 5, 9: 405 },
  },
  mirrors: {},
  lines: [],
});

// Load stored mirrors from localStorage on app mount
onMount(() => {
  const storedMirrors = localStorage.getItem("mirrors");
  if (storedMirrors) {
    try {
      const parsed = JSON.parse(storedMirrors);
      // Overwrite mirrors with the parsed object
      setStore("mirrors", { ...parsed });
    } catch (error) {
      console.error("Error parsing stored mirrors", error);
    }
  }
});

// Save mirrors to localStorage whenever they change
createEffect(() => {
  localStorage.setItem("mirrors", JSON.stringify(store.mirrors));
});

/** SIGNALS FOR LASER DATA **/
const [laserLines, setLaserLines] = createSignal<Line[]>([]);
const [laserOutputs, setLaserOutputs] = createSignal<{
  [key: string]: LaserOutput;
}>({});

/** MIRROR TOGGLING **/
function handleMirrorClick(row: number, col: number, event: MouseEvent) {
  event.preventDefault(); // no default context menu

  const key = `${row},${col}`;
  const current = store.mirrors[key];

  if (event.button === 0) {
    // Left-click => toggle "/"
    if (current === "/") {
      setStore("mirrors", key, undefined);
    } else {
      setStore("mirrors", key, "/");
    }
  } else if (event.button === 2) {
    // Right-click => toggle "\"
    if (current === "\\") {
      setStore("mirrors", key, undefined);
    } else {
      setStore("mirrors", key, "\\");
    }
  }
}

function handleMirrorTouchEnd(row: number, col: number, event: TouchEvent) {
  event.preventDefault(); // prevent emulated mouse events
  const key = `${row},${col}`;
  const current = store.mirrors[key];

  // Mobile behavior: cycle through states on tap
  if (current === undefined) {
    setStore("mirrors", key, "/");
  } else if (current === "/") {
    setStore("mirrors", key, "\\");
  } else {
    setStore("mirrors", key, undefined);
  }
}

/** REFLECTION LOGIC (SWAPPED) **/
// "/" => old "\": up => left, down => right, left => up, right => down
// "\" => old "/": up => right, down => left, left => down, right => up
function reflectDirection(
  dx: number,
  dy: number,
  mirror: MirrorType
): [number, number] {
  if (mirror === "/") {
    if (dx === -1 && dy === 0) return [0, -1]; // up => left
    if (dx === 1 && dy === 0) return [0, 1]; // down => right
    if (dx === 0 && dy === -1) return [-1, 0]; // left => up
    if (dx === 0 && dy === 1) return [1, 0]; // right => down
  } else {
    // mirror === "\\"
    if (dx === -1 && dy === 0) return [0, 1]; // up => right
    if (dx === 1 && dy === 0) return [0, -1]; // down => left
    if (dx === 0 && dy === -1) return [1, 0]; // left => down
    if (dx === 0 && dy === 1) return [-1, 0]; // right => up
  }
  return [dx, dy]; // fallback
}

/** SHOOT A SINGLE LASER **/
interface ShootResult {
  segments: Line[];
  product: number;
  finalDot: [number, number];
}

function shootLaser(
  startRow: number,
  startCol: number,
  dx: number,
  dy: number
): ShootResult {
  let row = startRow;
  let col = startCol;

  const segments: Line[] = [];
  let product = 1;

  let segStart: [number, number] = [row, col];
  let steps = 0;

  while (true) {
    row += dx;
    col += dy;
    steps++;

    // Out of bounds => stop
    if (row < 0 || row > last || col < 0 || col > last) {
      segments.push({ start: segStart, end: [row, col] });
      product *= steps;
      return { segments, product, finalDot: [row, col] };
    }

    // If we reach the "inner ring" (row=1|last-1 or col=1|last-1)
    // that's not the same as the start => stop
    // This is the "outer dot" logic in your puzzle
    if (
      (row === 1 || row === last - 1 || col === 1 || col === last - 1) &&
      !(row === startRow && col === startCol)
    ) {
      segments.push({ start: segStart, end: [row, col] });
      product *= steps;
      return { segments, product, finalDot: [row, col] };
    }

    // If in center => check for mirror
    // center is row=2..(last-2), col=2..(last-2)
    if (row >= 2 && row <= last - 2 && col >= 2 && col <= last - 2) {
      const mirrorKey = `${row - 2},${col - 2}`;
      const mirror = store.mirrors[mirrorKey];
      if (mirror) {
        // End the current segment
        segments.push({ start: segStart, end: [row, col] });
        product *= steps;

        // Reflect
        [dx, dy] = reflectDirection(dx, dy, mirror);

        // Start new segment
        segStart = [row, col];
        steps = 0;
      }
    }
  }
}

/** WHERE TO PLACE THE FINAL PRODUCT IN THE OUTER RING? **/
function outerCellForDot(r: number, c: number): [number, number] {
  // If dot = row=1 => final product at row=0
  if (r === 1) return [0, c];
  // If dot = row=last-1 => final product at row=last
  if (r === last - 1) return [last, c];
  // If dot = col=1 => final product at col=0
  if (c === 1) return [r, 0];
  // If dot = col=last-1 => final product at col=last
  if (c === last - 1) return [r, last];
  // fallback
  return [r, c];
}

/** CREATEEFFECT: SHOOT ALL LASERS WHEN MIRRORS CHANGE **/
createEffect(() => {
  const newLines: Line[] = [];
  const newOutputs: { [key: string]: LaserOutput } = {};

  // Shoot from top
  for (const [colStr, value] of Object.entries(store.fixedNumbers.top)) {
    const col = +colStr;
    const { segments, product, finalDot } = shootLaser(1, col, 1, 0);
    const color = product === value ? "green" : "red";
    segments.forEach((s) => (s.color = color));
    newLines.push(...segments);

    const [nr, nc] = outerCellForDot(finalDot[0], finalDot[1]);
    if (nr >= 0 && nr <= last && nc >= 0 && nc <= last) {
      newOutputs[`${nr},${nc}`] = { product, color };
    }
  }

  // Bottom
  for (const [colStr, value] of Object.entries(store.fixedNumbers.bottom)) {
    const col = +colStr;
    const { segments, product, finalDot } = shootLaser(last - 1, col, -1, 0);
    const color = product === value ? "green" : "red";
    segments.forEach((s) => (s.color = color));
    newLines.push(...segments);

    const [nr, nc] = outerCellForDot(finalDot[0], finalDot[1]);
    if (nr >= 0 && nr <= last && nc >= 0 && nc <= last) {
      newOutputs[`${nr},${nc}`] = { product, color };
    }
  }

  // Left
  for (const [rowStr, value] of Object.entries(store.fixedNumbers.left)) {
    const row = +rowStr;
    const { segments, product, finalDot } = shootLaser(row, 1, 0, 1);
    const color = product === value ? "green" : "red";
    segments.forEach((s) => (s.color = color));
    newLines.push(...segments);

    const [nr, nc] = outerCellForDot(finalDot[0], finalDot[1]);
    if (nr >= 0 && nr <= last && nc >= 0 && nc <= last) {
      newOutputs[`${nr},${nc}`] = { product, color };
    }
  }

  // Right
  for (const [rowStr, value] of Object.entries(store.fixedNumbers.right)) {
    const row = +rowStr;
    const { segments, product, finalDot } = shootLaser(row, last - 1, 0, -1);
    const color = product === value ? "green" : "red";
    segments.forEach((s) => (s.color = color));
    newLines.push(...segments);

    const [nr, nc] = outerCellForDot(finalDot[0], finalDot[1]);
    if (nr >= 0 && nr <= last && nc >= 0 && nc <= last) {
      newOutputs[`${nr},${nc}`] = { product, color };
    }
  }
  setLaserLines(newLines);
  setLaserOutputs(newOutputs);
});

const [showGreen, setShowGreen] = createSignal(true);
const [showRed, setShowRed] = createSignal(true);
const [showLineLength, setShowLineLength] = createSignal(false);

function App() {
  return (
    <>
      <div style="margin-bottom: 10px; flex-wrap: wrap; display: flex; gap: 10px;">
        <button onClick={() => setShowGreen(!showGreen())}>
          {showGreen() ? "Hide Green Lines" : "Show Green Lines"}
        </button>
        <button onClick={() => setShowRed(!showRed())}>
          {showRed() ? "Hide Red Lines" : "Show Red Lines"}
        </button>
        <button onClick={() => setShowLineLength(!showLineLength())}>
          {showLineLength() ? "Hide Line Length" : "Show Line Length"}
        </button>

        <button onClick={() => setStore({ ...store, mirrors: {} })}>
          Clear Mirrors
        </button>
      </div>
      <div>
        4 = 2² | 9 = 3² | 12 = 2² × 3 | 16 = 2⁴ | 27 = 3³ | 48 = 2⁴ × 3 | 64 =
        2⁶ | 112 = 2⁴ × 7 | 225 = 3² × 5² | 405 = 3⁴ × 5 | 2025 = 3⁴ × 5² | 3087
        = 3² × 7³
      </div>
      <div class="grid-container">
        {/* Render a totalSize × totalSize grid */}
        {Array.from({ length: totalSize }).map((_, row) =>
          Array.from({ length: totalSize }).map((_, col) => {
            // Outer ring => row=0|last or col=0|last
            if (row === 0 || row === last || col === 0 || col === last) {
              let fixedNum: number | undefined = undefined;
              if (row === 0 && store.fixedNumbers.top[col] !== undefined) {
                fixedNum = store.fixedNumbers.top[col];
              } else if (
                row === last &&
                store.fixedNumbers.bottom[col] !== undefined
              ) {
                fixedNum = store.fixedNumbers.bottom[col];
              } else if (
                col === 0 &&
                store.fixedNumbers.left[row] !== undefined
              ) {
                fixedNum = store.fixedNumbers.left[row];
              } else if (
                col === last &&
                store.fixedNumbers.right[row] !== undefined
              ) {
                fixedNum = store.fixedNumbers.right[row];
              }

              const laserOut = laserOutputs()[`${row},${col}`];

              return (
                <div class="number">
                  {fixedNum !== undefined && fixedNum}
                  {laserOut && (
                    <span style={{ color: laserOut.color }}>
                      {" "}
                      ({laserOut.product})
                    </span>
                  )}
                </div>
              );
            }

            // Inner ring dots
            if (
              (row === 1 ||
                row === last - 1 ||
                col === 1 ||
                col === last - 1) &&
              !(
                (row === 1 && col === 1) ||
                (row === 1 && col === last - 1) ||
                (row === last - 1 && col === 1) ||
                (row === last - 1 && col === last - 1)
              )
            ) {
              return <div class="dot">•</div>;
            }

            // Center cells for mirrors
            return (
              <div
                class="grid-cell"
                onMouseDown={(e) => handleMirrorClick(row - 2, col - 2, e)}
                onTouchEnd={(e) => handleMirrorTouchEnd(row - 2, col - 2, e)}
                onContextMenu={(e) => e.preventDefault()}
              >
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

        {/* Original big lines (if any) */}
        <svg class="line-overlay">
          {store.lines.map(({ start, end, color }, i) => {
            const cellSize = 50;
            const offset = 25;
            const x1 = start[1] * cellSize + offset;
            const y1 = start[0] * cellSize + offset;
            const x2 = end[1] * cellSize + offset;
            const y2 = end[0] * cellSize + offset;
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={color || "black"}
                stroke-width="2"
              />
            );
          })}
        </svg>

        {/* Laser lines */}
        <svg class="line-overlay">
          {laserLines()
            .filter(
              (line) =>
                (line.color === "green" && showGreen()) ||
                (line.color === "red" && showRed())
            )
            .map(({ start, end, color }, i) => {
              const cellSize = 50;
              const offset = 25;
              const x1 = start[1] * cellSize + offset;
              const y1 = start[0] * cellSize + offset;
              const x2 = end[1] * cellSize + offset;
              const y2 = end[0] * cellSize + offset;

              // For horizontal or vertical lines
              const length =
                (x1 === x2 ? Math.abs(y2 - y1) : Math.abs(x2 - x1)) / cellSize;

              // Calculate midpoint for the text
              const midX = (x1 + x2) / 2;
              const midY = (y1 + y2) / 2;

              return (
                <g key={i}>
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={color || "red"}
                    stroke-width="2"
                  />
                  {showLineLength() && (
                    <text
                      x={midX}
                      y={midY}
                      fill="black"
                      font-size="14"
                      textAnchor="middle"
                      alignmentBaseline="middle"
                    >
                      {length}
                    </text>
                  )}
                </g>
              );
            })}
        </svg>
      </div>
    </>
  );
}

export default App;
