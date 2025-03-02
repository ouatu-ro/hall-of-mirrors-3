import { createStore } from "solid-js/store";

type FixedNumbers = {
  top: { [key: number]: number };
  left: { [key: number]: number };
  right: { [key: number]: number };
  bottom: { [key: number]: number };
};

export const [store, setStore] = createStore<{
  fixedNumbers: FixedNumbers;
  grid: string[][];
}>({
  fixedNumbers: {
    top: { 3: 9 },
    left: { 4: 16 },
    right: { 2: 75 },
    bottom: { 3: 36 },
  }, // Fixed positions
  grid: Array.from({ length: 5 }, () => Array(5).fill("")), // 5x5 grid values
});

const App = () => {
  return (
    <div class="grid-container">
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
    </div>
  );
};

export default App;
