/**
 * @file igoAlgorithm.ts
 * @description ミニ5路 囲碁対局ページ（AI思考アルゴリズム：生きる可能性ゼロの自殺手・無駄な死にに行く手の完全回避・投了判定）
 */

export type BoardState = number[][]; // 0: 空, 1: 黒（プレイヤー）, 2: 白（AI）

/**
 * 指定した色の石の連結グループおよびその呼吸点（ダメ）を探索する
 */
function findGroupsAndLiberties(board: BoardState, color: number) {
  const SIZE = board.length;
  const visited: boolean[][] = Array(SIZE).fill(false).map(() => Array(SIZE).fill(false));
  const groups: { stones: { r: number; c: number }[]; liberties: Set<string> }[] = [];
  
  const directions = [
    { dr: -1, dc: 0 },
    { dr: 1, dc: 0 },
    { dr: 0, dc: -1 },
    { dr: 0, dc: 1 },
  ];

  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c] === color && !visited[r][c]) {
        const stones: { r: number; c: number }[] = [];
        const liberties = new Set<string>();
        const queue: { r: number; c: number }[] = [{ r, c }];
        visited[r][c] = true;

        while (queue.length > 0) {
          const current = queue.shift()!;
          stones.push(current);

          for (const { dr, dc } of directions) {
            const nR = current.r + dr;
            const nC = current.c + dc;
            if (nR >= 0 && nR < SIZE && nC >= 0 && nC < SIZE) {
              if (board[nR][nC] === 0) {
                liberties.add(`${nR},${nC}`);
              } else if (board[nR][nC] === color && !visited[nR][nC]) {
                visited[nR][nC] = true;
                queue.push({ r: nR, c: nC });
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
 * 現在の盤面を見て、AIが二眼を作れず詰み（投了すべき状態）かどうかを判定する
 */
export function shouldAiResign(board: BoardState, aiColor: number = 2): boolean {
  const opponentColor = aiColor === 2 ? 1 : 2;

  const aiStonesCount = board.flat().filter(cell => cell === aiColor).length;
  const opponentStonesCount = board.flat().filter(cell => cell === opponentColor).length;
  const emptySpotsCount = board.flat().filter(cell => cell === 0).length;

  if (opponentStonesCount < 5) {
    return false;
  }

  const aiGroups = findGroupsAndLiberties(board, aiColor);

  if (aiGroups.length > 0) {
    const totalLiberties = new Set<string>();
    aiGroups.forEach(g => g.liberties.forEach(lib => totalLiberties.add(lib)));

    const isUnderHeavyAttack = aiGroups.every(g => g.liberties.size <= 1);

    if (opponentStonesCount >= 6 && aiStonesCount <= 2 && totalLiberties.size <= 1) {
      return true;
    }

    if (emptySpotsCount <= 4 && totalLiberties.size <= 2 && isUnderHeavyAttack) {
      return true;
    }
  }

  if (opponentStonesCount >= 7 && aiStonesCount <= 1 && emptySpotsCount <= 6) {
    return true;
  }

  return false;
}

/**
 * AIの次の一手を算出する（生きる道がゼロの無駄な場所・自殺手への飛び込みを完全に回避）
 */
export function calculateAiMove(board: BoardState, aiColor: number = 2): [number, number] | null {
  const SIZE = board.length;
  const opponentColor = aiColor === 2 ? 1 : 2;

  // 1. 相手の石がアタリなら取る（最優先：確実に石を取る）
  const opponentGroups = findGroupsAndLiberties(board, opponentColor);
  for (const group of opponentGroups) {
    if (group.liberties.size === 1) {
      const [firstLiberty] = group.liberties;
      if (firstLiberty) {
        const coords = firstLiberty.split(',').map(Number);
        const r = coords.at(0)!;
        const c = coords.at(1)!;
        if (board[r][c] === 0) {
          return [r, c];
        }
      }
    }
  }

  // 2. 自分の石がアタリなら逃げる（ただし、生きる可能性ゼロの無駄な延命は絶対にしない）
  const aiGroups = findGroupsAndLiberties(board, aiColor);
  for (const group of aiGroups) {
    if (group.liberties.size === 1) {
      const isHopelessDeadStone = group.stones.length <= 3;
      
      if (!isHopelessDeadStone) {
        const [firstLiberty] = group.liberties;
        if (firstLiberty) {
          const coords = firstLiberty.split(',').map(Number);
          const r = coords.at(0)!;
          const c = coords.at(1)!;
          if (board[r][c] === 0) {
            return [r, c];
          }
        }
      }
    }
  }

  // 3. 安全な空きマスを収集（💡 ここで「生きる道がゼロの場所・自ら死にに行く手」を厳しくフィルタリング）
  const safeSpots: [number, number][] = [];
  const allEmptySpots: [number, number][] = [];

  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c] === 0) {
        allEmptySpots.push([r, c]);

        // シミュレーション：ここにAIが石を置いたと仮定する
        const simBoard = board.map(row => [...row]);
        simBoard[r][c] = aiColor;
        
        // 置いた後の自分のグループの状態をチェック
        const simGroups = findGroupsAndLiberties(simBoard, aiColor);
        const placedGroup = simGroups.find(g => g.stones.some(s => s.r === r && s.c === c));
        
        // 呼吸点が0（自殺手）はもちろん除外、
        // さらに「呼吸点が1つしかなく、かつ石数が少ない（＝打った瞬間にアタリになり、周囲に脱出路がない死にに行く手）」も除外する
        const isSuicide = placedGroup ? placedGroup.liberties.size === 0 : true;
        const isHopelessPlacement = placedGroup ? placedGroup.liberties.size === 1 && placedGroup.stones.length <= 2 : false;

        if (!isSuicide && !isHopelessPlacement) {
          safeSpots.push([r, c]);
        }
      }
    }
  }

  // もし安全な場所がすべて埋まってしまっている場合の保険
  const candidateSpots = safeSpots.length > 0 ? safeSpots : allEmptySpots;
  if (candidateSpots.length === 0) return null;

  // 4. 端や角を避け、安全な候補地の中から内側や中央（三四などを含む大場）を優先する
  const innerSpots = candidateSpots.filter(([r, c]) => r > 0 && r < SIZE - 1 && c > 0 && c < SIZE - 1);
  if (innerSpots.length > 0) {
    const centerR = 2;
    const centerC = 2;
    if (board[centerR][centerC] === 0 && innerSpots.some(([r, c]) => r === centerR && c === centerC) && Math.random() < 0.6) {
      return [centerR, centerC];
    }
    const randomIndex = Math.floor(Math.random() * innerSpots.length);
    return innerSpots[randomIndex];
  }

  const randomIndex = Math.floor(Math.random() * candidateSpots.length);
  return candidateSpots[randomIndex];
}