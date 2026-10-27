/**
 * @file igoAlgorithm.ts
 * @description ミニ5路 囲碁対局ページ（AI思考アルゴリズム：自殺手・眼をつぶす悪手の完全回避、陣地拡大・制限の原則）
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
 * AIの次の一手を算出する（自分から眼をつぶす悪手の回避 ＆ 陣地拡大・制限の原則）
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

  // 3. 安全な空きマスを収集
  // 💡 ルール：自分から自分の眼をふさぐ、あるいは打った瞬間に呼吸点が1つに落ちて自ら死にに行くような手（2三などの悪手）は絶対に排除する
  const safeSpots: [number, number][] = [];
  const allEmptySpots: [number, number][] = [];

  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c] === 0) {
        allEmptySpots.push([r, c]);

        // シミュレーション：ここにAIが石を置いたと仮定
        const simBoard = board.map(row => [...row]);
        simBoard[r][c] = aiColor;
        
        const simGroups = findGroupsAndLiberties(simBoard, aiColor);
        const placedGroup = simGroups.find(g => g.stones.some(s => s.r === r && s.c === c));
        
        // 自殺手（呼吸点0）は当然除外
        const isSuicide = placedGroup ? placedGroup.liberties.size === 0 : true;
        
        // 打った瞬間に呼吸点が1つになってしまう（自ら眼をつぶす、死にに行く）手も除外
        const isSelfAtariOrEyeClosure = placedGroup ? placedGroup.liberties.size <= 1 : true;

        if (!isSuicide && !isSelfAtariOrEyeClosure) {
          safeSpots.push([r, c]);
        }
      }
    }
  }

  const candidateSpots = safeSpots.length > 0 ? safeSpots : allEmptySpots;
  if (candidateSpots.length === 0) return null;

  // 4. 「自分の陣地を広げる一方で相手の陣地を狭める」という基本原則に基づくスコアリング評価
  let bestSpot = candidateSpots[0];
  let maxScore = -999;

  for (const [r, c] of candidateSpots) {
    let score = 0;

    // 原則A：自分の陣地を広げる（中央やバランスの良い空間を好む）
    const distToCenter = Math.abs(r - 2) + Math.abs(c - 2);
    score += (4 - distToCenter); // 中央に近いほど高い評価

    // 原則B：相手の陣地を狭める（相手の石に適切なプレッシャーをかける位置を選ぶ）
    let minOpponentDist = 999;
    for (let pr = 0; pr < SIZE; pr++) {
      for (let pc = 0; pc < SIZE; pc++) {
        if (board[pr][pc] === opponentColor) {
          const dist = Math.abs(r - pr) + Math.abs(c - pc);
          if (dist < minOpponentDist) {
            minOpponentDist = dist;
          }
        }
      }
    }
    
    // 相手の石の周囲（距離1〜2のスペース）に陣取って相手の拡大を制限する手にボーナス
    if (minOpponentDist === 1) {
      score += 3; // 相手に迫り、陣地を狭める
    } else if (minOpponentDist === 2) {
      score += 2;
    }

    // 微小なランダム性を加えて単調な動きを防ぐ
    score += Math.random() * 0.5;

    if (score > maxScore) {
      maxScore = score;
      bestSpot = [r, c];
    }
  }

  return bestSpot;
}