/**
 * @file igoAlgorithm.ts
 * @description ミニ5路囲碁（5x5）のAI思考アルゴリズム（アタリの回避・取得、端・角を避ける機能付き）
 */

type BoardState = number[][]; // 0: 空, 1: 黒（プレイヤー）, 2: 白（AI）

function findGroupsAndLiberties(board: BoardState, color: number) {
  const SIZE = board.length;
  const visited: boolean[][] = Array(SIZE).fill(false).map(() => Array(SIZE).fill(false));
  const groups: { stones: [number, number][]; liberties: Set<string> }[] = [];

  const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c] === color && !visited[r][c]) {
        const stones: [number, number][] = [];
        const liberties = new Set<string>();
        const queue: [number, number][] = [[r, c]];
        visited[r][c] = true;

        while (queue.length > 0) {
          const [currR, currC] = queue.shift()!;
          stones.push([currR, currC]);

          for (const [dr, dc] of directions) {
            const nR = currR + dr;
            const nC = currC + dc;
            if (nR >= 0 && nR < SIZE && nC >= 0 && nC < SIZE) {
              if (board[nR][nC] === 0) {
                liberties.add(`${nR},${nC}`);
              } else if (board[nR][nC] === color && !visited[nR][nC]) {
                visited[nR][nC] = true;
                queue.push([nR, nC]);
              }
            }
          }
        }
        groups.push({ stones, liberties });
      }
    }
  }
  return groups;
}

export function calculateAiMove(board: BoardState, aiColor: number = 2): [number, number] | null {
  const SIZE = board.length;
  const opponentColor = aiColor === 2 ? 1 : 2;

  // 1. 相手の石がアタリなら取る
  const opponentGroups = findGroupsAndLiberties(board, opponentColor);
  for (const group of opponentGroups) {
    if (group.liberties.size === 1) {
      const libertyStr = Array.from(group.liberties)[0];
      const [r, c] = libertyStr.split(',').map(Number);
      if (board[r][c] === 0) {
        return [r, c];
      }
    }
  }

  // 2. 自分の石がアタリなら逃げる
  const aiGroups = findGroupsAndLiberties(board, aiColor);
  for (const group of aiGroups) {
    if (group.liberties.size === 1) {
      const libertyStr = Array.from(group.liberties)[0];
      const [r, c] = libertyStr.split(',').map(Number);
      if (board[r][c] === 0) {
        return [r, c];
      }
    }
  }

  // 3. 空いているマスを収集
  const emptySpots: [number, number][] = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c] === 0) {
        emptySpots.push([r, c]);
      }
    }
  }

  if (emptySpots.length === 0) return null;

  // 4. 端や角を避け、内側を優先する
  const innerSpots = emptySpots.filter(([r, c]) => r > 0 && r < SIZE - 1 && c > 0 && c < SIZE - 1);

  if (innerSpots.length > 0) {
    const center: [number, number] = [2, 2];
    if (board[center[0]][center[1]] === 0 && Math.random() < 0.6) {
      return center;
    }
    const randomIndex = Math.floor(Math.random() * innerSpots.length);
    return innerSpots[randomIndex];
  }

  const randomIndex = Math.floor(Math.random() * emptySpots.length);
  return emptySpots[randomIndex];
}