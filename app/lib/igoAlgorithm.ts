/**
 * @file igoAlgorithm.ts
 * @description ミニ5路囲碁（5x5）のAI思考アルゴリズム（頭脳）
 */

type BoardState = number[][]; // 0: 空, 1: 黒（プレイヤー）, 2: 白（AI）

/**
 * AIの次の手（座標）を計算する関数
 * @param board 現在の盤面の2次元配列
 * @param aiColor AIの石の色（通常は 2: 白）
 * @returns [row, col] の座標、置ける場所がない場合は null
 */
export function calculateAiMove(board: BoardState, aiColor: number = 2): [number, number] | null {
  const SIZE = board.length;
  const emptySpots: [number, number][] = [];

  // 1. 盤面上の空いているマス（合法手候補）をすべて収集
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c] === 0) {
        emptySpots.push([r, c]);
      }
    }
  }

  // 置ける場所がない場合は null を返す
  if (emptySpots.length === 0) return null;

  // 2. 囲碁の戦術的優先順位（ヒューリスティック）
  // 5x5盤面の中央（天元: [2, 2]）は非常に価値が高いため、空いていれば高い確率で選択する
  const center: [number, number] = [2, 2];
  if (board[center[0]][center[1]] === 0 && Math.random() < 0.75) {
    return center;
  }

  // 3. 中央の周りの十字方向（星やその近辺）を次に優先する
  const strategicSpots: [number, number][] = [
    [1, 2], [2, 1], [2, 3], [3, 2], // 上下左右
    [1, 1], [1, 3], [3, 1], [3, 3]  // 四隅の星付近
  ];

  const availableStrategicSpots = strategicSpots.filter(
    ([r, c]) => r < SIZE && c < SIZE && board[r][c] === 0
  );

  if (availableStrategicSpots.length > 0 && Math.random() < 0.6) {
    const randomIndex = Math.floor(Math.random() * availableStrategicSpots.length);
    return availableStrategicSpots[randomIndex];
  }

  // 4. それ以外の場合は、残りの空きマスからランダムに選択
  const randomIndex = Math.floor(Math.random() * emptySpots.length);
  return emptySpots[randomIndex];
}