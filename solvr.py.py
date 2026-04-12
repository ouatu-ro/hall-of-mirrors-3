import copy
import sys

sys.setrecursionlimit(10000)

# Grid size and clues
N = 10
fixedNumbers = {
    "top": {2: 112, 4: 48, 5: 3087, 6: 9, 9: 1},
    "left": {3: 27, 7: 12, 8: 225},
    "right": {1: 4, 2: 27, 6: 16},
    "bottom": {0: 2025, 3: 12, 4: 64, 5: 5, 7: 405},
}

###############################################################################
# The DFS solver for individual clues (from our previous code)
###############################################################################


def in_bounds(r, c):
    return 0 <= r < N and 0 <= c < N


def steps_to_exit(r, c, dr, dc):
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
    if not in_bounds(r, c) or grid[r][c] != "0":
        return False
    for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
        nr, nc = r + dr, c + dc
        if in_bounds(nr, nc) and grid[nr][nc] in ["/", "\\"]:
            return False
    return True


# Global list to collect solutions for the current clue.
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
            if new_prod == clue:
                solutions_global.append(copy.deepcopy(grid))
        else:
            if not allowed_mirror(new_r, new_c, grid):
                for rr, cc, old in path_changes:
                    grid[rr][cc] = old
                continue
            for mirror in ["/", "\\"]:
                old_val = grid[new_r][new_c]  # should be '0'
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
# Now, combine the candidate solutions for each clue.
###############################################################################


def combine_cell(x, y):
    # If one cell is empty, the other value is taken.
    if x == "0":
        return y
    if y == "0":
        return x
    # If both are the same (both 'l' or same mirror), that’s fine.
    if x == y:
        return x
    # Otherwise, conflict: for example, one is 'l' and the other is a mirror,
    # or the mirrors differ.
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
    candidate_solutions: a dictionary mapping (side,index) -> list of grid solutions.
    Order the clues from fewest to most solutions.
    Then backtrack, combining grids; if there is any conflict in a cell,
    that branch is pruned.
    """
    # keys: tuples (side, index)
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

    # Start with an empty grid.
    empty_grid = [["0" for _ in range(N)] for _ in range(N)]
    backtrack(0, empty_grid)
    return combined_results


###############################################################################
# Main: Solve individual clues then combine.
###############################################################################

if __name__ == "__main__":
    candidate_solutions = {}
    # Compute candidate solutions for each clue.
    for side in fixedNumbers:
        for index, clue in fixedNumbers[side].items():
            sols = solve_clue(side, index, clue)
            print(f"Clue {side} {index} (product {clue}) has {len(sols)} solution(s).")
            # Uncomment to see individual solutions:
            # for sol in sols:
            #     print_grid(sol)
            candidate_solutions[(side, index)] = sols

    # Combine solutions from different clues.
    combined = combine_all_solutions(candidate_solutions)
    print(f"\nTotal combined solutions: {len(combined)}")
    for sol in combined:
        print_grid(sol)
