import { createSignal, createEffect } from "solid-js";
import { createStore } from "solid-js/store";

/** TYPES **/

type FixedNumbers = {
  top: { [key: number]: number };
  left: { [key: number]: number };
  right: { [key: number]: number };
  bottom: { [key: number]: number };
};

type MirrorType = "/" | "\\";

// Original big lines you might have had
type Line = {
  start: [number, number]; // (row,col) in the 9x9
  end: [number, number];
  color?: string; // e.g. "red" or "green" for lasers
};

type LaserOutput = {
  product: number;
  color: "red" | "green";
};

/** MAIN STORE (NO laser results here) **/
const [store, setStore] = createStore<{
  fixedNumbers: FixedNumbers;
  mirrors: { [key: string]: MirrorType };
  grid: string[][];
  lines: Line[]; // any original big lines you want to keep
}>({
  fixedNumbers: {
    top: { 3: 9 },
    left: { 4: 16 },
    right: { 2: 75 },
    bottom: { 3: 36 },
  },
  mirrors: {},
  grid: Array.from({ length: 5 }, () => Array(5).fill("")),
  lines: [],
});

/** SIGNALS FOR LASER DATA (EPHEMERAL) **/
const [laserLines, setLaserLines] = createSignal<Line[]>([]);
const [laserOutputs, setLaserOutputs] = createSignal<{
  [key: string]: LaserOutput;
}>({});

/** 1) Mirror toggling: left-click => "/", right-click => "\" **/
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

/** 2) Reflection logic (SWAPPED) **/
// "/" now behaves like old "\":
//   up => left, down => right, left => up, right => down
// "\" now behaves like old "/":
//   up => right, down => left, left => down, right => up
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

/** 3) Shoot a single laser **/
type ShootResult = {
  segments: Line[];
  product: number; // multiply # of steps for each run
  finalDot: [number, number]; // where the laser stops
};

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
    if (row < 0 || row > 8 || col < 0 || col > 8) {
      segments.push({ start: segStart, end: [row, col] });
      product *= steps;
      return { segments, product, finalDot: [row, col] };
    }

    // If we reach row=1|7 or col=1|7 (outer dot) that's not the start => stop
    if (
      (row === 1 || row === 7 || col === 1 || col === 7) &&
      !(row === startRow && col === startCol)
    ) {
      segments.push({ start: segStart, end: [row, col] });
      product *= steps;
      return { segments, product, finalDot: [row, col] };
    }

    // If in center => check for mirror
    if (row >= 2 && row <= 6 && col >= 2 && col <= 6) {
      const mirrorKey = `${row - 2},${col - 2}`;
      const mirror = store.mirrors[mirrorKey];
      if (mirror) {
        // End this segment
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

/** 4) Place final product in outer ring **/
function outerCellForDot(r: number, c: number): [number, number] {
  if (r === 1) return [0, c];
  if (r === 7) return [8, c];
  if (c === 1) return [r, 0];
  if (c === 7) return [r, 8];
  return [r, c]; // fallback
}

/** 5) Main App Component **/
export default function App() {
  // Recompute lasers in a createEffect that depends on store.mirrors
  createEffect(() => {
    // read store.mirrors => triggers effect on mount + whenever mirrors change
    void store.mirrors;

    // Build ephemeral arrays/objects
    const newLines: Line[] = [];
    const newOutputs: { [key: string]: LaserOutput } = {};

    // 1) Top
    for (const [colStr, value] of Object.entries(store.fixedNumbers.top)) {
      const col = +colStr + 1;
      const { segments, product, finalDot } = shootLaser(1, col, 1, 0);
      const color = product === value ? "green" : "red";
      segments.forEach((s) => (s.color = color));
      newLines.push(...segments);

      const [nr, nc] = outerCellForDot(finalDot[0], finalDot[1]);
      if (nr >= 0 && nr <= 8 && nc >= 0 && nc <= 8) {
        newOutputs[`${nr},${nc}`] = { product, color };
      }
    }

    // 2) Bottom
    for (const [colStr, value] of Object.entries(store.fixedNumbers.bottom)) {
      const col = +colStr + 1;
      const { segments, product, finalDot } = shootLaser(7, col, -1, 0);
      const color = product === value ? "green" : "red";
      segments.forEach((s) => (s.color = color));
      newLines.push(...segments);

      const [nr, nc] = outerCellForDot(finalDot[0], finalDot[1]);
      if (nr >= 0 && nr <= 8 && nc >= 0 && nc <= 8) {
        newOutputs[`${nr},${nc}`] = { product, color };
      }
    }

    // 3) Left
    for (const [rowStr, value] of Object.entries(store.fixedNumbers.left)) {
      const row = +rowStr + 1;
      const { segments, product, finalDot } = shootLaser(row, 1, 0, 1);
      const color = product === value ? "green" : "red";
      segments.forEach((s) => (s.color = color));
      newLines.push(...segments);

      const [nr, nc] = outerCellForDot(finalDot[0], finalDot[1]);
      if (nr >= 0 && nr <= 8 && nc >= 0 && nc <= 8) {
        newOutputs[`${nr},${nc}`] = { product, color };
      }
    }

    // 4) Right
    for (const [rowStr, value] of Object.entries(store.fixedNumbers.right)) {
      const row = +rowStr + 1;
      const { segments, product, finalDot } = shootLaser(row, 7, 0, -1);
      const color = product === value ? "green" : "red";
      segments.forEach((s) => (s.color = color));
      newLines.push(...segments);

      const [nr, nc] = outerCellForDot(finalDot[0], finalDot[1]);
      if (nr >= 0 && nr <= 8 && nc >= 0 && nc <= 8) {
        newOutputs[`${nr},${nc}`] = { product, color };
      }
    }

    // Set them in signals (not in the store!)
    setLaserLines(newLines);
    setLaserOutputs(newOutputs);
  });

  return (
    <div class="grid-container">
      {/* Render the 9×9 grid */}
      {Array.from({ length: 9 }).map((_, row) =>
        Array.from({ length: 9 }).map((_, col) => {
          // Outer ring
          if (row === 0 || row === 8 || col === 0 || col === 8) {
            // Original number?
            const fixedNum =
              (row === 0 && store.fixedNumbers.top[col - 1]) ||
              (row === 8 && store.fixedNumbers.bottom[col - 1]) ||
              (col === 0 && store.fixedNumbers.left[row - 1]) ||
              (col === 8 && store.fixedNumbers.right[row - 1]);

            // Laser result?
            const outKey = `${row},${col}`;
            const laserOut = laserOutputs()[outKey];

            return (
              <div class="number">
                {fixedNum}
                {laserOut && (
                  <span style={{ color: laserOut.color }}>
                    {" "}
                    ({laserOut.product})
                  </span>
                )}
              </div>
            );
          }

          // Inner dots
          if (
            (row === 1 || row === 7 || col === 1 || col === 7) &&
            !(row === 1 && col === 1) &&
            !(row === 1 && col === 7) &&
            !(row === 7 && col === 1) &&
            !(row === 7 && col === 7)
          ) {
            return <div class="dot">•</div>;
          }

          // Center 5×5 => mirrors
          return (
            <div
              class="grid-cell"
              onMouseDown={(e) => handleMirrorClick(row - 2, col - 2, e)}
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

      {/* 1) Original big lines (if any) */}
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

      {/* 2) Laser lines from ephemeral signal (colored green/red) */}
      <svg class="line-overlay">
        {laserLines().map(({ start, end, color }, i) => {
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
              stroke={color || "red"}
              stroke-width="2"
            />
          );
        })}
      </svg>
    </div>
  );
}
