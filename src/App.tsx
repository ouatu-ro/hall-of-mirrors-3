import { createSignal, createEffect, onMount, Show } from "solid-js";
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

// Add theme variables for light and dark modes
const themeColors = {
  dark: {
    background: "#121212",
    text: "#e0e0e0",
    buttonBg: "#2a2a2a",
    buttonHover: "#3a3a3a",
    headerBg: "#232323",
    gridCellBg: "#2a2a2a",
    gridBorder: "#666",
    mirrorColor: "#00ffff",
  },
  light: {
    background: "#f5f5f5",
    text: "#121212",
    buttonBg: "#e0e0e0",
    buttonHover: "#d0d0d0",
    headerBg: "#ffffff",
    gridCellBg: "#ffffff",
    gridBorder: "#aaa",
    mirrorColor: "#0088ff",
  },
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
      setStore("mirrors", key as any, undefined as any);
    } else {
      setStore("mirrors", key, "/");
    }
  } else if (event.button === 2) {
    if (current === "\\") {
      setStore("mirrors", key as any, undefined as any);
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
    setStore("mirrors", key as any, undefined as any);
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

const factorisation: { [key: string]: string } = {
  "1": "1¹",
  "4": "2²",
  "5": "5¹",
  "9": "3²",
  "12": "2² × 3",
  "16": "2⁴",
  "27": "3³",
  "48": "2⁴ × 3",
  "64": "2⁶",
  "112": "2⁴ × 7",
  "225": "3² × 5²",
  "405": "3⁴ × 5",
  "2025": "3⁴ × 5²",
  "3087": "3² × 7³",
};

// Add color variables for the lasers
const laserColors = {
  dark: {
    green: "#4CAF50",
    red: "#F44336",
  },
  light: {
    green: "#2E7D32",
    red: "#C62828",
  },
};

function App() {
  const [showGreen, setShowGreen] = createSignal(true);
  const [showRed, setShowRed] = createSignal(true);
  const [showLineLength, setShowLineLength] = createSignal(false);
  const [showFactorisation, setShowFactorisation] = createSignal(false);
  const [gridSize, setGridSize] = createSignal({ width: 700, cellSize: 50 });
  // Add theme state
  const [isDarkTheme, setIsDarkTheme] = createSignal(true);

  // Navigation signals
  const [navActive, setNavActive] = createSignal(false);

  // Toggle theme function
  const toggleTheme = () => {
    setIsDarkTheme(!isDarkTheme());
    // Apply CSS variables based on theme
    const root = document.documentElement;
    const theme = !isDarkTheme() ? themeColors.light : themeColors.dark;

    root.style.setProperty("--background-color", theme.background);
    root.style.setProperty("--text-color", theme.text);
    root.style.setProperty("--button-bg", theme.buttonBg);
    root.style.setProperty("--button-hover", theme.buttonHover);
    root.style.setProperty("--header-bg", theme.headerBg);
    root.style.setProperty("--grid-cell-bg", theme.gridCellBg);
    root.style.setProperty("--grid-border", theme.gridBorder);
    root.style.setProperty("--mirror-color", theme.mirrorColor);

    // Store theme preference
    localStorage.setItem("theme", !isDarkTheme() ? "light" : "dark");
  };

  // Detect grid size changes
  createEffect(() => {
    const updateGridSize = () => {
      const container = document.querySelector(".grid-container");
      if (container) {
        const width = container.clientWidth;
        const cellSize = width / totalSize;
        setGridSize({ width, cellSize });
      }
    };

    // Initial update
    updateGridSize();

    // Update on resize
    window.addEventListener("resize", updateGridSize);
    return () => window.removeEventListener("resize", updateGridSize);
  });

  // Handle key presses
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
        case "t": // Add keyboard shortcut for theme toggle
          toggleTheme();
          break;
        default:
          break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  // Handle section navigation with Ctrl+Click support
  const handleNavLinkClick = (e: MouseEvent, section: string) => {
    // If Ctrl key is pressed, browser will handle opening in new tab
    if (!e.ctrlKey) {
      e.preventDefault();
      // Navigate to the actual URL
      window.location.href = `https://ouatu.ro/#${section}`;
      setNavActive(false); // Close mobile menu when clicking a link
    }
  };

  // Handle home link with Ctrl+Click support
  const handleHomeClick = (e: MouseEvent) => {
    // Only prevent default if Ctrl key is not pressed
    if (!e.ctrlKey) {
      e.preventDefault();
      window.location.href = "https://ouatu.ro/";
      setNavActive(false); // Close mobile menu
    }
    // If Ctrl is pressed, let the default behavior happen (open in new tab)
  };

  // Toggle burger menu
  const toggleNavMenu = () => {
    setNavActive(!navActive());
  };

  // Check for hash in URL on mount and initialize theme
  onMount(() => {
    // Apply initial theme
    const theme = isDarkTheme() ? themeColors.dark : themeColors.light;
    const root = document.documentElement;

    root.style.setProperty("--background-color", theme.background);
    root.style.setProperty("--text-color", theme.text);
    root.style.setProperty("--button-bg", theme.buttonBg);
    root.style.setProperty("--button-hover", theme.buttonHover);
    root.style.setProperty("--header-bg", theme.headerBg);
    root.style.setProperty("--grid-cell-bg", theme.gridCellBg);
    root.style.setProperty("--grid-border", theme.gridBorder);
    root.style.setProperty("--mirror-color", theme.mirrorColor);

    // Check for stored theme preference
    const storedTheme = localStorage.getItem("theme");
    if (storedTheme === "light") {
      setIsDarkTheme(false);
      toggleTheme();
    }

    // Check for stored mirrors
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

  return (
    <div class={isDarkTheme() ? "app dark-theme" : "app light-theme"}>
      {/* Header */}
      <header>
        <nav>
          <div class="nav-brand">
            <a
              href="https://ouatu.ro/"
              class="home-link"
              onClick={handleHomeClick}
            >
              Bogdan Develops
            </a>
            <button
              class="burger-menu"
              aria-label="Toggle navigation menu"
              onClick={toggleNavMenu}
            >
              <span
                style={{
                  transform: navActive()
                    ? "rotate(45deg) translate(6px, 6px)"
                    : "none",
                }}
              ></span>
              <span
                style={{
                  opacity: navActive() ? "0" : "1",
                }}
              ></span>
              <span
                style={{
                  transform: navActive()
                    ? "rotate(-45deg) translate(6px, -6px)"
                    : "none",
                }}
              ></span>
            </button>
          </div>
          <div class={`nav-links ${navActive() ? "active" : ""}`}>
            <a href="https://ouatu.ro/blog">Blog</a>
            <a
              href="https://ouatu.ro/#about"
              class="nav-link"
              data-section="about"
              onClick={(e) => handleNavLinkClick(e, "about")}
            >
              About me
            </a>
            <a
              href="https://ouatu.ro/#projects"
              class="nav-link"
              data-section="projects"
              onClick={(e) => handleNavLinkClick(e, "projects")}
            >
              Projects
            </a>
            <a
              href="https://ouatu.ro/#contact"
              class="nav-link"
              data-section="contact"
              onClick={(e) => handleNavLinkClick(e, "contact")}
            >
              Contact
            </a>
          </div>
        </nav>
      </header>

      <div class="container">
        <div class="button-container">
          <button onClick={toggleTheme} class="theme-toggle">
            {isDarkTheme() ? (
              <>
                <span>Light Mode</span>
                <span style={{ "font-size": "18px" }}>💡</span>
              </>
            ) : (
              <>
                <span>Dark Mode</span>
                <span style={{ "font-size": "18px" }}>🌙</span>
              </>
            )}
          </button>
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
            <button class="flash-animation" onClick={handleCheckResult}>
              Check Result
            </button>
          )}
        </div>

        <div class="factorisation">
          {Object.entries(factorisation).map(([key, value], index) => (
            <span>
              {key} = {value} |{" "}
            </span>
          ))}
        </div>

        {/* Display missing numbers and the calculation if available */}
        {missingNumbers() && (
          <div class="missing-numbers">
            <div>Missing numbers left: {missingNumbers()!.left.join(", ")}</div>
            <div>Missing numbers top: {missingNumbers()!.top.join(", ")}</div>
            <div>
              Missing numbers right: {missingNumbers()!.right.join(", ")}
            </div>
            <div>
              Missing numbers bottom: {missingNumbers()!.bottom.join(", ")}
            </div>
            <div>
              Calculation: ({missingNumbers()!.left.join(" + ")}) * (
              {missingNumbers()!.top.join(" + ")}) * (
              {missingNumbers()!.right.join(" + ")}) * (
              {missingNumbers()!.bottom.join(" + ")}) ={" "}
              {missingNumbers()!.calculation}
            </div>
          </div>
        )}

        <div
          class="grid-container"
          style={{
            overflow: "visible",
          }}
        >
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
                      ? factorisation[fixedNum.toString()]
                      : fixedNum}
                    {laserOut && (
                      <span
                        style={{
                          color:
                            laserOut.color === "green"
                              ? isDarkTheme()
                                ? laserColors.dark.green
                                : laserColors.light.green
                              : isDarkTheme()
                              ? laserColors.dark.red
                              : laserColors.light.red,
                        }}
                      >
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
                        x1="10%"
                        y1="10%"
                        x2="90%"
                        y2="90%"
                        stroke="var(--mirror-color)"
                        stroke-width="2.5"
                      />
                    )}
                    {store.mirrors[`${row - 2},${col - 2}`] === "\\" && (
                      <line
                        x1="10%"
                        y1="90%"
                        x2="90%"
                        y2="10%"
                        stroke="var(--mirror-color)"
                        stroke-width="2.5"
                      />
                    )}
                  </svg>
                </div>
              );
            })
          )}

          <svg class="line-overlay" style={{ overflow: "visible" }}>
            {store.lines.map(({ start, end, color }, i) => {
              const cellSize = gridSize().cellSize;
              const offset = cellSize / 2;
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
                  stroke={color || "black"}
                  stroke-width="2.5"
                />
              );
            })}
          </svg>

          <svg class="line-overlay" style={{ overflow: "visible" }}>
            {laserLines()
              .filter(
                (line) =>
                  (line.color === "green" && showGreen()) ||
                  (line.color === "red" && showRed())
              )
              .map(({ start, end, color }, i) => {
                const cellSize = gridSize().cellSize;
                const offset = cellSize / 2;
                const x1 = start[1] * cellSize + offset;
                const y1 = start[0] * cellSize + offset;
                const x2 = end[1] * cellSize + offset;
                const y2 = end[0] * cellSize + offset;

                // Calculate length based on the original scale to keep numbering consistent
                const length = Math.round(
                  (x1 === x2 ? Math.abs(y2 - y1) : Math.abs(x2 - x1)) / cellSize
                );

                // Calculate if line is horizontal or vertical
                const isHorizontal = y1 === y2;

                // Offset the position of the text (smaller offset for the responsive layout)
                const textOffsetY = -5;
                const textOffsetX = 5;

                const midX = (x1 + x2) / 2 + textOffsetX;
                const midY = (y1 + y2) / 2 + textOffsetY;

                return (
                  <g>
                    <line
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke={
                        color === "green"
                          ? isDarkTheme()
                            ? laserColors.dark.green
                            : laserColors.light.green
                          : isDarkTheme()
                          ? laserColors.dark.red
                          : laserColors.light.red
                      }
                      stroke-width="2.5"
                    />
                    {showLineLength() && (
                      <text
                        x={midX}
                        y={midY}
                        fill={"var(--text-color)"}
                        font-size="14"
                        font-weight="bold"
                        text-anchor="middle"
                        alignment-baseline="middle"
                        stroke={isDarkTheme() ? "#121212" : "#f5f5f5"}
                        stroke-width="0.5"
                        paint-order="stroke"
                      >
                        {length}
                      </text>
                    )}
                  </g>
                );
              })}
          </svg>
        </div>
      </div>
    </div>
  );
}

export default App;
