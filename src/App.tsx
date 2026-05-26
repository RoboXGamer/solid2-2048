import {
  createEffect,
  createStore,
  For,
  onSettled,
  snapshot,
  createMemo,
  flush,
  untrack,
} from "solid-js";
import "./App.css";
import UndoIcon from "./components/UndoIcon";

type State = {
  history: number[][][];
  score: number;
  board: number[][];
};

type Direction = "up" | "down" | "left" | "right";

const createEmptyBoard = () => [
  [0, 0, 0, 0],
  [0, 0, 0, 0],
  [0, 0, 0, 0],
  [0, 0, 0, 0],
];

const initialState: State = {
  history: [],
  score: 0,
  board: createEmptyBoard(),
};

function App() {
  const [state, setState] = createStore(initialState);
  let touchStartPoint: { x: number; y: number } | null = null;
  const emptyCells = createMemo(() => {
    const cells: Array<[number, number]> = [];

    state.board.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (cell === 0) cells.push([x, y]);
      });
    });

    return cells;
  });
  const hasAvailableMove = (board: number[][]) => {
    if (board.length === 0) return false;

    for (let y = 0; y < board.length; y++) {
      for (let x = 0; x < board[y].length; x++) {
        const current = board[y][x];

        if (current === 0) return true;
        if (x + 1 < board[y].length && current === board[y][x + 1]) return true;
        if (y + 1 < board.length && current === board[y + 1][x]) return true;
      }
    }

    return false;
  };
  const gameOver = createMemo(() => !hasAvailableMove(state.board));
  const vmap = (cell: number) => {
    if (cell === 0) return " ";
    return cell.toString();
  };

  const kMap = {
    ArrowUp: "up",
    ArrowDown: "down",
    ArrowLeft: "left",
    ArrowRight: "right",
    w: "up",
    a: "left",
    s: "down",
    d: "right",
    u: "undo",
    U: "undo",
    r: "restart",
    R: "restart",
  } as const;

  const randomFromArray = <T,>(arr: T[]) => {
    const index = Math.floor(Math.random() * arr.length);
    return arr[index];
  };

  const transpose = (arr: number[][]) => {
    return arr[0].map((_, i) => arr.map((row) => row[i]));
  };

  const padRow = (row: number[], side: "left" | "right", width: number) => {
    const zeros = new Array(width - row.length).fill(0);
    return side === "left" ? row.concat(zeros) : zeros.concat(row);
  };

  const compactRows = (board: number[][]) =>
    board.map((row) => row.filter((cell) => cell !== 0));

  const boardsEqual = (a: number[][], b: number[][]) =>
    a.length === b.length &&
    a.every(
      (row, y) =>
        row.length === b[y].length && row.every((cell, x) => cell === b[y][x]),
    );

  const mergeRow = (row: number[]) => {
    const merged: number[] = [];

    for (let i = 0; i < row.length; i++) {
      if (i + 1 < row.length && row[i] === row[i + 1]) {
        merged.push(row[i] * 2);
        i++;
      } else {
        merged.push(row[i]);
      }
    }

    return merged;
  };

  const spawn = () => {
    const cells = untrack(emptyCells);
    if (cells.length === 0) return;
    const [x, y] = randomFromArray(cells);
    // 90% 2, 10% 4
    const nextValue = Math.random() < 0.9 ? 2 : 4;
    setState((s) => {
      s.board[y][x] = nextValue;
      return s;
    });
  };

  const undo = () => {
    if (state.history.length === 0) return;

    setState((s) => {
      const previousBoard = s.history.pop();

      if (!previousBoard) return s;

      s.board = snapshot(previousBoard);
      return s;
    });
  };

  const newGame = () => {
    setState((s) => {
      s.history = [];
      s.score = 0;
      s.board = createEmptyBoard();
      return s;
    });

    flush();
    spawn();
  };

  const handleMoveAction = (action: Direction) => {
    const previousBoard = move(action);
    if (!previousBoard) return;
    setState((s) => {
      s.history.push(previousBoard);
      return s;
    });
    flush();
    spawn();
  };

  const move = (dir: Direction) => {
    const width = state.board[0].length;
    const board = snapshot(state.board);
    let next = board;

    switch (dir) {
      case "left":
        next = compactRows(board)
          .map(mergeRow)
          .map((row) => padRow(row, "left", width));
        break;
      case "right":
        next = compactRows(board)
          .map(mergeRow)
          .map((row) => padRow(row, "right", width));
        break;
      case "up":
        next = transpose(board);
        next = compactRows(next)
          .map(mergeRow)
          .map((row) => padRow(row, "left", width));
        next = transpose(next);
        break;
      case "down":
        next = transpose(board);
        next = compactRows(next)
          .map(mergeRow)
          .map((row) => padRow(row, "right", width));
        next = transpose(next);
        break;
    }

    if (boardsEqual(board, next)) return false;

    setState((s) => {
      s.board = next;
      return s;
    });

    return board;
  };

  const handleLogic = (e: KeyboardEvent) => {
    const pressedKey = e.key;
    if (!Object.keys(kMap).includes(pressedKey)) return;
    const action = kMap[pressedKey as keyof typeof kMap];

    if (action === "undo") {
      undo();
      return;
    }

    if (action === "restart") {
      newGame();
      return;
    }

    handleMoveAction(action);
  };

  const handleTouchStart = (e: TouchEvent) => {
    const touch = e.changedTouches[0];
    if (!touch) return;
    touchStartPoint = {
      x: touch.clientX,
      y: touch.clientY,
    };
  };

  const handleTouchEnd = (e: TouchEvent) => {
    if (!touchStartPoint) return;

    const touch = e.changedTouches[0];
    if (!touch) {
      touchStartPoint = null;
      return;
    }

    const deltaX = touch.clientX - touchStartPoint.x;
    const deltaY = touch.clientY - touchStartPoint.y;
    const threshold = 30;

    touchStartPoint = null;

    if (Math.abs(deltaX) < threshold && Math.abs(deltaY) < threshold) return;

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      handleMoveAction(deltaX > 0 ? "right" : "left");
      return;
    }

    handleMoveAction(deltaY > 0 ? "down" : "up");
  };
  createEffect(
    () => {},
    () => {
      spawn();
    },
  );
  onSettled(() => {
    document.addEventListener("keydown", handleLogic);
    return () => {
      document.removeEventListener("keydown", handleLogic);
    };
  });
  return (
    <>
      <div class="title-row">
        <h2>2048</h2>
        <div class="title-actions">
          <div class="control-stack">
            <button
              class="control-button"
              type="button"
              onClick={undo}
              aria-label="Undo move"
              disabled={state.history.length === 0}
            >
              <UndoIcon />
            </button>
            <span class="control-hint">U for undo</span>
          </div>
          <div class="control-stack">
            <button
              class="control-button"
              type="button"
              onClick={newGame}
              aria-label="Restart game"
            >
              R
            </button>
            <span class="control-hint">R for restart</span>
          </div>
        </div>
      </div>
      <div
        class="game-container"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <For each={state.board}>
          {(row, i) => (
            <For each={row}>
              {(cell, j) => (
                <div class="cell" data-y={i()} data-x={j()}>
                  <div
                    class="inner"
                    data-value={cell}
                    style={{
                      "--tile": cell === 0 ? 0 : Math.log2(cell),
                      "--digits": cell === 0 ? 1 : String(cell).length,
                    }}
                  >
                    {vmap(cell)}
                  </div>
                </div>
              )}
            </For>
          )}
        </For>
        {gameOver() && (
          <div class="game-over-overlay">
            <div class="game-over-card">
              <h3>Game Over</h3>
              <p>Press R to restart</p>
              <button
                class="control-button"
                type="button"
                onClick={newGame}
                aria-label="Restart game"
              >
                R
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default App;
