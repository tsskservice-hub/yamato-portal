/**
 * @file igoAlgorithm.ts
 * @description ミニ5路囲碁（5x5）のAI思考アルゴリズム（相手のアタリを確実に取る機能付き）
 */

type BoardState = number[][]; // 0: 空, 1: 黒（プレイヤー）, 2: 白（AI）

/**
 * 指定した色の石のグループ（連）と、その呼吸点（リバティ）を計算する関数
 */
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

/**
 * AIの次の手（座標）を計算する関数
 * @param board 現在の盤面の2次元配列
 * @param aiColor AIの石の色（通常は 2: 白）
 * @returns [row, col] の座標、置ける場所がない場合は null
 */
export function calculateAiMove(board: BoardState, aiColor: number = 2): [number, number] | null {
  const SIZE = board.length;
  const opponentColor = aiColor === 2 ? 1 : 2;

  // 1. 【最優先】相手の石が「アタリ（リバティが残り1つ）」になっているか探索
  const opponentGroups = findGroupsAndLiberties(board, opponentColor);
  for (const group of opponentGroups) {
    if (group.liberties.size === 1) {
      // 残り1つのリバティ（空きマス）の座標を取得してそこへ打ち、石を取る
      const libertyStr = Array.from(group.liberties)[0];
      const [r, c] = libertyStr.split(',').map(Number);
      if (board[r][c] === 0) {
        return [r, c];
      }
    }
  }

  // 2. 空いているマス（合法手候補）を収集
  const emptySpots: [number, number][] = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c] === 0) {
        emptySpots.push([r, c]);
      }
    }
  }

  if (emptySpots.length === 0) return null;

  // 3. 囲碁の戦術的優先順位（中央や星付近を好む）
  const center: [number, number] = [2, 2];
  if (board[center[0]][center[1]] === 0 && Math.random() < 0.75) {
    return center;
  }

  const strategicSpots: [number, number][] = [
    [1, 2], [2, 1], [2, 3], [3, 2],
    [1, 1], [1, 3], [3, 1], [3, 3]
  ];

  const availableStrategicSpots = strategicSpots.filter(
    ([r, c]) => r < SIZE && c < SIZE && board[r][c] === 0
  );

  if (availableStrategicSpots.length > 0 && Math.random() < 0.6) {
    const randomIndex = Math.floor(Math.random() * availableStrategicSpots.length);
    return availableStrategicSpots[randomIndex];
  }

  // 4. それ以外の場合は残りの空きマスからランダムに選択
  const randomIndex = Math.floor(Math.random() * emptySpots.length);
  return emptySpots[randomIndex];
}