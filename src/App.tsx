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
const centerSize = 10;
const totalSize = centerSize + 4;
const last = totalSize - 1;

// initial fixed numbers (used when the puzzle is unsolved)
const initialFixedNumbers: FixedNumbers = {
  top: { 4: 112, 6: 48, 7: 3087, 8: 9, 11: 1 },
  left: { 5: 27, 9: 12, 10: 225 },
  right: { 3: 4, 4: 27, 8: 16 },
  bottom: { 2: 2025, 5: 12, 6: 64, 7: 5, 9: 405 },
};

// fixedNumbers2 with zeros marking the missing clues
const fixedNumbers2: FixedNumbers = {
  top: {
    2: 0,
    3: 0,
    4: 112,
    5: 0,
    6: 48,
    7: 3087,
    8: 9,
    9: 0,
    10: 0,
    11: 1,
  },
  left: {
    2: 0,
    3: 0,
    4: 0,
    5: 27,
    6: 0,
    7: 0,
    8: 0,
    9: 12,
    10: 225,
    11: 0,
  },
  right: {
    2: 0,
    3: 4,
    4: 27,
    5: 0,
    6: 0,
    7: 0,
    8: 16,
    9: 0,
    10: 0,
    11: 0,
  },
  bottom: {
    2: 2025,
    3: 0,
    4: 0,
    5: 12,
    6: 64,
    7: 5,
    8: 0,
    9: 405,
    10: 0,
    11: 0,
  },
};

/** MAIN STORE **/
const [store, setStore] = createStore<{
  fixedNumbers: FixedNumbers;
  mirrors: { [key: string]: MirrorType };
  lines: Line[];
  allGreens: boolean;
}>({
  fixedNumbers: initialFixedNumbers,
  mirrors: {},
  lines: [],
  allGreens: false,
});

// Load stored mirrors from localStorage on app mount
onMount(() => {
  const storedMirrors = localStorage.getItem("mirrors");
  if (storedMirrors) {
    try {
      const parsed = JSON.parse(storedMirrors);
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

const [missingNumbers, setMissingNumbers] = createSignal<{
  top: number[];
  left: number[];
  right: number[];
  bottom: number[];
  calculation: number;
} | null>(null);

/** MIRROR TOGGLING **/
function handleMirrorClick(row: number, col: number, event: MouseEvent) {
  event.preventDefault();
  const key = `${row},${col}`;
  const current = store.mirrors[key];

  if (event.button === 0) {
    if (current === "/") {
      setStore("mirrors", key, undefined);
    } else {
      setStore("mirrors", key, "/");
    }
  } else if (event.button === 2) {
    if (current === "\\") {
      setStore("mirrors", key, undefined);
    } else {
      setStore("mirrors", key, "\\");
    }
  }
}

function handleMirrorTouchEnd(row: number, col: number, event: TouchEvent) {
  event.preventDefault();
  const key = `${row},${col}`;
  const current = store.mirrors[key];
  if (current === undefined) {
    setStore("mirrors", key, "/");
  } else if (current === "/") {
    setStore("mirrors", key, "\\");
  } else {
    setStore("mirrors", key, undefined);
  }
}

/** REFLECTION LOGIC **/
function reflectDirection(
  dx: number,
  dy: number,
  mirror: MirrorType
): [number, number] {
  if (mirror === "/") {
    if (dx === -1 && dy === 0) return [0, -1];
    if (dx === 1 && dy === 0) return [0, 1];
    if (dx === 0 && dy === -1) return [-1, 0];
    if (dx === 0 && dy === 1) return [1, 0];
  } else {
    if (dx === -1 && dy === 0) return [0, 1];
    if (dx === 1 && dy === 0) return [0, -1];
    if (dx === 0 && dy === -1) return [1, 0];
    if (dx === 0 && dy === 1) return [-1, 0];
  }
  return [dx, dy];
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

    if (row < 0 || row > last || col < 0 || col > last) {
      segments.push({ start: segStart, end: [row, col] });
      product *= steps;
      return { segments, product, finalDot: [row, col] };
    }

    if (
      (row === 1 || row === last - 1 || col === 1 || col === last - 1) &&
      !(row === startRow && col === startCol)
    ) {
      segments.push({ start: segStart, end: [row, col] });
      product *= steps;
      return { segments, product, finalDot: [row, col] };
    }

    if (row >= 2 && row <= last - 2 && col >= 2 && col <= last - 2) {
      const mirrorKey = `${row - 2},${col - 2}`;
      const mirror = store.mirrors[mirrorKey];
      if (mirror) {
        segments.push({ start: segStart, end: [row, col] });
        product *= steps;
        [dx, dy] = reflectDirection(dx, dy, mirror);
        segStart = [row, col];
        steps = 0;
      }
    }
  }
}

/** DETERMINE FINAL OUTPUT CELL **/
function outerCellForDot(r: number, c: number): [number, number] {
  if (r === 1) return [0, c];
  if (r === last - 1) return [last, c];
  if (c === 1) return [r, 0];
  if (c === last - 1) return [r, last];
  return [r, c];
}

/** CREATEEFFECT: SHOOT ALL LASERS WHEN MIRRORS CHANGE **/
createEffect(() => {
  const newLines: Line[] = [];
  const newOutputs: { [key: string]: LaserOutput } = {};

  // Top side
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

  // Bottom side
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

  // Left side
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

  // Right side
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
  setStore(
    "allGreens",
    newLines.every((line) => line.color === "green")
  );
});

function handleCheckResult() {
  setStore("fixedNumbers", fixedNumbers2);
  const outputs = laserOutputs();

  const missingTop = Object.keys(fixedNumbers2.top)
    .filter((col) => fixedNumbers2.top[+col] === 0)
    .map((col) => outputs[`0,${col}`]?.product ?? 0);
  const missingBottom = Object.keys(fixedNumbers2.bottom)
    .filter((col) => fixedNumbers2.bottom[+col] === 0)
    .map((col) => outputs[`${last},${col}`]?.product ?? 0);
  const missingLeft = Object.keys(fixedNumbers2.left)
    .filter((row) => fixedNumbers2.left[+row] === 0)
    .map((row) => outputs[`${row},0`]?.product ?? 0);
  const missingRight = Object.keys(fixedNumbers2.right)
    .filter((row) => fixedNumbers2.right[+row] === 0)
    .map((row) => outputs[`${row},${last}`]?.product ?? 0);

  const sumLeft = missingLeft.reduce((a, b) => a + b, 0);
  const sumTop = missingTop.reduce((a, b) => a + b, 0);
  const sumRight = missingRight.reduce((a, b) => a + b, 0);
  const sumBottom = missingBottom.reduce((a, b) => a + b, 0);
  const calculation = sumLeft * sumTop * sumRight * sumBottom;

  setMissingNumbers({
    top: missingTop,
    left: missingLeft,
    right: missingRight,
    bottom: missingBottom,
    calculation,
  });
}

const factorisation = {
  1: "1¹",
  4: "2²",
  5: "5¹",
  9: "3²",
  12: "2² × 3",
  16: "2⁴",
  27: "3³",
  48: "2⁴ × 3",
  64: "2⁶",
  112: "2⁴ × 7",
  225: "3² × 5²",
  405: "3⁴ × 5",
  2025: "3⁴ × 5²",
  3087: "3² × 7³",
};

function App() {
  createEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "a":
          setShowGreen(!showGreen());
          break;
        case "s":
          setShowRed(!showRed());
          break;
        case "d":
          setShowLineLength(!showLineLength());
          break;
        case "f":
          setShowFactorisation(!showFactorisation());
          break;
        default:
          break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  const [showGreen, setShowGreen] = createSignal(true);
  const [showRed, setShowRed] = createSignal(true);
  const [showLineLength, setShowLineLength] = createSignal(false);
  const [showFactorisation, setShowFactorisation] = createSignal(false);

  return (
    <>
      <div style="margin-bottom: 10px; flex-wrap: wrap; display: flex; gap: 10px;">
        <button onClick={() => setShowGreen(!showGreen())}>
          {showGreen() ? "Hide Green Lines(A)" : "Show Green Lines(A)"}
        </button>
        <button onClick={() => setShowRed(!showRed())}>
          {showRed() ? "Hide Red Lines(S)" : "Show Red Lines(S)"}
        </button>
        <button onClick={() => setShowLineLength(!showLineLength())}>
          {showLineLength() ? "Hide Line Length(D)" : "Show Line Length(D)"}
        </button>
        <button onClick={() => setShowFactorisation(!showFactorisation())}>
          {showFactorisation()
            ? "Hide Factorisation (F)"
            : "Show Factorisation (F)"}
        </button>
        <button onClick={() => setStore({ ...store, mirrors: {} })}>
          Clear Mirrors
        </button>
        {store.allGreens && (
          <button class={"flash-animation"} onClick={handleCheckResult}>
            Check Result
          </button>
        )}
      </div>

      <div>
        {Object.entries(factorisation).map(([key, value]) => (
          <span key={key}>
            {key} = {value} |{" "}
          </span>
        ))}
      </div>

      {/* Display missing numbers and the calculation if available */}
      {missingNumbers() && (
        <div class="missing-numbers" style="margin-top: 10px;">
          <div>Missing numbers left: {missingNumbers().left.join(", ")}</div>
          <div>Missing numbers top: {missingNumbers().top.join(", ")}</div>
          <div>Missing numbers right: {missingNumbers().right.join(", ")}</div>
          <div>
            Missing numbers bottom: {missingNumbers().bottom.join(", ")}
          </div>
          <div>
            Calculation: ({missingNumbers().left.join(" + ")}) * (
            {missingNumbers().top.join(" + ")}) * (
            {missingNumbers().right.join(" + ")}) * (
            {missingNumbers().bottom.join(" + ")}) ={" "}
            {missingNumbers().calculation}
          </div>
        </div>
      )}

      <div class="grid-container">
        {Array.from({ length: totalSize }).map((_, row) =>
          Array.from({ length: totalSize }).map((_, col) => {
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
                  {fixedNum !== undefined && showFactorisation()
                    ? factorisation[fixedNum]
                    : fixedNum}
                  {laserOut && (
                    <span style={{ color: laserOut.color }}>
                      {" "}
                      ({laserOut.product})
                    </span>
                  )}
                </div>
              );
            }

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
              const length =
                (x1 === x2 ? Math.abs(y2 - y1) : Math.abs(x2 - x1)) / cellSize;
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
