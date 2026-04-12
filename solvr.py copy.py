import copy
import sys

sys.setrecursionlimit(10000)

# Grid size and fixed clues (only some perimeter positions have given clues)
N = 10
fixedNumbers = {
    "top": {2: 112, 4: 48, 5: 3087, 6: 9, 9: 1},
    "left": {3: 27, 7: 12, 8: 225},
    "right": {1: 4, 2: 27, 6: 16},
    "bottom": {0: 2025, 3: 12, 4: 64, 5: 5, 7: 405},
}

###############################################################################
# PART 1: Individual Clue Solver (DFS with jump‐along path)
###############################################################################


def in_bounds(r, c):
    return 0 <= r < N and 0 <= c < N


def steps_to_exit(r, c, dr, dc):
    """
    Count how many steps the beam takes inside the grid (starting from position (r, c) which may be outside),
    plus one final step that takes it out.
    """
    steps = 0
    nr, nc = r + dr, c + dc
    if not in_bounds(nr, nc):
        return 1
    while in_bounds(nr, nc):
        steps += 1
        r, c = nr, nc
        nr, nc = r + dr, c + dc
    return steps + 1


def mark_path(r, c, seg, dr, dc, grid):
    """
    Mark intermediate cells along the beam's path (from (r, c) exclusive up to the cell just before the mirror or exit)
    with 'l' if they are empty.
    Returns a list of changes to allow backtracking.
    """
    changes = []
    for i in range(1, seg):
        rr, cc = r + i * dr, c + i * dc
        if in_bounds(rr, cc) and grid[rr][cc] == "0":
            grid[rr][cc] = "l"
            changes.append((rr, cc, "0"))
    return changes


def reflect(direction, mirror):
    dr, dc = direction
    if mirror == "/":
        if (dr, dc) == (-1, 0):
            return (0, 1)
        elif (dr, dc) == (0, 1):
            return (-1, 0)
        elif (dr, dc) == (1, 0):
            return (0, -1)
        elif (dr, dc) == (0, -1):
            return (1, 0)
    elif mirror == "\\":
        if (dr, dc) == (-1, 0):
            return (0, -1)
        elif (dr, dc) == (0, -1):
            return (-1, 0)
        elif (dr, dc) == (0, 1):
            return (1, 0)
        elif (dr, dc) == (1, 0):
            return (0, 1)
    return (dr, dc)


def allowed_mirror(r, c, grid):
    """
    A mirror can only be placed if the cell is empty and none of its four orthogonal neighbors
    already holds a mirror.
    """
    if not in_bounds(r, c) or grid[r][c] != "0":
        return False
    for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
        nr, nc = r + dr, c + dc
        if in_bounds(nr, nc) and grid[nr][nc] in ["/", "\\"]:
            return False
    return True


# Global list to store solutions for the current clue.
solutions_global = []


def dfs(r, c, dr, dc, prod, grid, clue):
    max_seg = steps_to_exit(r, c, dr, dc)
    for seg in range(1, max_seg + 1):
        new_prod = prod * seg
        if new_prod > clue:
            break
        if clue % new_prod != 0:
            continue
        new_r, new_c = r + seg * dr, c + seg * dc
        path_changes = mark_path(r, c, seg, dr, dc, grid)
        if seg == max_seg:
            # Beam exits the grid.
            if new_prod == clue:
                solutions_global.append(copy.deepcopy(grid))
        else:
            # Beam is still inside; attempt to place a mirror.
            if not allowed_mirror(new_r, new_c, grid):
                for rr, cc, old in path_changes:
                    grid[rr][cc] = old
                continue
            for mirror in ["/", "\\"]:
                old_val = grid[new_r][new_c]  # Must be '0'
                grid[new_r][new_c] = mirror
                new_dir = reflect((dr, dc), mirror)
                dfs(new_r, new_c, new_dir[0], new_dir[1], new_prod, grid, clue)
                grid[new_r][new_c] = old_val
        for rr, cc, old in path_changes:
            grid[rr][cc] = old


def solve_clue(side, index, clue):
    grid = [["0" for _ in range(N)] for _ in range(N)]
    if side == "top":
        start_r, start_c = -1, index
        direction = (1, 0)
    elif side == "bottom":
        start_r, start_c = N, index
        direction = (-1, 0)
    elif side == "left":
        start_r, start_c = index, -1
        direction = (0, 1)
    elif side == "right":
        start_r, start_c = index, N
        direction = (0, -1)
    else:
        raise ValueError("Invalid side provided.")
    dfs(start_r, start_c, direction[0], direction[1], 1, grid, clue)
    sols = solutions_global.copy()
    solutions_global.clear()
    return sols


def print_grid(grid):
    for row in grid:
        print(" ".join(row))
    print()


###############################################################################
# PART 2: Combine Individual Clue Solutions
###############################################################################


def combine_cell(x, y):
    # If one cell is empty, take the other.
    if x == "0":
        return y
    if y == "0":
        return x
    # If both are the same, that's acceptable.
    if x == y:
        return x
    # Otherwise, conflict (e.g. one mirror vs. a laser path, or differing mirrors).
    return None


def combine_grids(grid1, grid2):
    new_grid = [["0" for _ in range(N)] for _ in range(N)]
    for r in range(N):
        for c in range(N):
            combined = combine_cell(grid1[r][c], grid2[r][c])
            if combined is None:
                return None
            new_grid[r][c] = combined
    return new_grid


def combine_all_solutions(candidate_solutions):
    """
    candidate_solutions: dict mapping (side, index) -> list of candidate grids.
    Order the clues from fewest to most candidates, then backtrack to combine cell‐wise.
    """
    keys = list(candidate_solutions.keys())
    keys.sort(key=lambda k: len(candidate_solutions[k]))
    combined_results = []

    def backtrack(i, current_grid):
        if i == len(keys):
            combined_results.append(copy.deepcopy(current_grid))
            return
        key = keys[i]
        for candidate in candidate_solutions[key]:
            new_grid = combine_grids(current_grid, candidate)
            if new_grid is not None:
                backtrack(i + 1, new_grid)

    empty_grid = [["0" for _ in range(N)] for _ in range(N)]
    backtrack(0, empty_grid)
    return combined_results


###############################################################################
# PART 3: Simulate Laser Paths for Missing Clues and Compute Final Answer
###############################################################################


def simulate_laser(board, side, index):
    """
    Given a final board (with mirror placements), simulate the laser
    starting from the outside at the given side/index.
    The simulation accumulates segment lengths (each segment is at least 1)
    and returns the product.

    For simulation, any cell not containing "/" or "\" is treated as empty.
    """
    if side == "top":
        pos = (-1, index)
        direction = (1, 0)
    elif side == "bottom":
        pos = (N, index)
        direction = (-1, 0)
    elif side == "left":
        pos = (index, -1)
        direction = (0, 1)
    elif side == "right":
        pos = (index, N)
        direction = (0, -1)
    else:
        raise ValueError("Invalid side.")

    prod = 1
    seg = 0
    r, c = pos
    dr, dc = direction
    while True:
        r, c = r + dr, c + dc
        seg += 1
        # If outside the grid, finish:
        if not in_bounds(r, c):
            prod *= seg
            break
        # If a mirror is present, count the segment and reflect.
        cell = board[r][c]
        if cell in ["/", "\\"]:
            prod *= seg
            seg = 0
            dr, dc = reflect((dr, dc), cell)
        # Otherwise, continue along the path.
    return prod


def missing_clues_and_sums(board):
    """
    For each side of the board, determine the missing clue numbers.
    The missing positions are those not present in fixedNumbers.
    Then compute the sum of the missing clue numbers per side.
    Return dictionaries for missing clues and a dictionary for the sums.
    """
    # All indices 0..9 per side.
    all_indices = set(range(N))
    missing = {"top": {}, "left": {}, "right": {}, "bottom": {}}
    sums = {"top": 0, "left": 0, "right": 0, "bottom": 0}

    # For each side, the fixed ones are given.
    for side in ["top", "left", "right", "bottom"]:
        fixed = set(fixedNumbers.get(side, {}).keys())
        for idx in all_indices - fixed:
            clue_value = simulate_laser(board, side, idx)
            missing[side][idx] = clue_value
            sums[side] += clue_value
    return missing, sums


###############################################################################
# MAIN: Solve, Combine, and Process Missing Clues
###############################################################################

if __name__ == "__main__":
    candidate_solutions = {}
    # Solve individual clues.
    for side in fixedNumbers:
        for index, clue in fixedNumbers[side].items():
            sols = solve_clue(side, index, clue)
            print(f"Clue {side} {index} (product {clue}) has {len(sols)} solution(s).")
            candidate_solutions[(side, index)] = sols

    # Combine solutions across clues.
    combined = combine_all_solutions(candidate_solutions)
    print(f"\nTotal combined overall board solutions: {len(combined)}")
    for sol in combined:
        print_grid(sol)

    # For demonstration, take the first overall board solution.
    if combined:
        final_board = combined[0]
        print("Final combined board (first solution):")
        print_grid(final_board)

        # Compute missing clues and sums for each side.
        missing, side_sums = missing_clues_and_sums(final_board)
        print("Missing Clue Numbers:")
        for side in ["top", "left", "right", "bottom"]:
            for idx in sorted(missing[side].keys()):
                print(f"{side} {idx}: {missing[side][idx]}")
        print("\nSum of missing clues per side:")
        for side in ["top", "left", "right", "bottom"]:
            print(f"{side}: {side_sums[side]}")

        # The final answer is the product of these four sums.
        final_product = (
            side_sums["top"]
            * side_sums["left"]
            * side_sums["right"]
            * side_sums["bottom"]
        )
        print("\nFinal answer (product of the four sums):", final_product)
    else:
        print("No overall board solution found.")
