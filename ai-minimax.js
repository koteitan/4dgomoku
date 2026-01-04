/**
 * Minimax AI with Alpha-Beta Pruning
 * 4D五目並べ用の強力なAI
 */
class MinimaxAI extends AIStrategy {
  constructor(depth = 3) {
    super();
    this.depth = depth;
    this.nodesEvaluated = 0;

    // スコア定数
    this.SCORE_WIN = 1000000;
    this.SCORE_FOUR_OPEN = 10000;
    this.SCORE_FOUR_HALF = 1000;
    this.SCORE_THREE_OPEN = 100;
    this.SCORE_THREE_HALF = 10;
    this.SCORE_TWO_OPEN = 5;
    this.SCORE_TWO_HALF = 1;
  }

  getName() {
    return `minimax ${this.depth}`;
  }

  getDescription() {
    return `Alpha-Beta枝刈り付きMinimax探索 (深度${this.depth})`;
  }

  getBestMove(game) {
    this.nodesEvaluated = 0;
    const startTime = performance.now();

    // 最初の手は中央付近
    if (game.moveCount === 0) {
      return {
        x: Math.floor(game.size.x / 2),
        y: Math.floor(game.size.y / 2),
        z: Math.floor(game.size.z / 2),
        w: Math.floor(game.size.w / 2)
      };
    }

    // 即勝ち・即負け防御をチェック
    const immediateMove = this.findImmediateMove(game);
    if (immediateMove) {
      console.log(`Immediate move found: (${immediateMove.x},${immediateMove.y},${immediateMove.z},${immediateMove.w})`);
      return immediateMove;
    }

    // 候補手を取得（既存の石の近くのみ）
    const candidates = this.getCandidateMoves(game);
    if (candidates.length === 0) {
      return game.getValidMoves()[0];
    }

    let bestMove = candidates[0];
    let bestScore = -Infinity;
    const alpha = -Infinity;
    const beta = Infinity;

    for (const move of candidates) {
      const newGame = game.clone();
      newGame.placeStone(move.x, move.y, move.z, move.w);

      const score = this.minimax(newGame, this.depth - 1, alpha, beta, false);

      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }

    const endTime = performance.now();
    console.log(`AI思考完了: ${this.nodesEvaluated}ノード評価, ${(endTime - startTime).toFixed(0)}ms`);
    console.log(`最善手: (${bestMove.x},${bestMove.y},${bestMove.z},${bestMove.w}) スコア: ${bestScore}`);

    return bestMove;
  }

  minimax(game, depth, alpha, beta, isMaximizing) {
    this.nodesEvaluated++;

    // 終了条件
    if (game.winner !== null) {
      return isMaximizing ? -this.SCORE_WIN : this.SCORE_WIN;
    }
    if (depth === 0) {
      return this.evaluate(game);
    }

    const candidates = this.getCandidateMoves(game);
    if (candidates.length === 0) {
      return 0; // 引き分け
    }

    if (isMaximizing) {
      let maxScore = -Infinity;
      for (const move of candidates) {
        const newGame = game.clone();
        newGame.placeStone(move.x, move.y, move.z, move.w);
        const score = this.minimax(newGame, depth - 1, alpha, beta, false);
        maxScore = Math.max(maxScore, score);
        alpha = Math.max(alpha, score);
        if (beta <= alpha) break;
      }
      return maxScore;
    } else {
      let minScore = Infinity;
      for (const move of candidates) {
        const newGame = game.clone();
        newGame.placeStone(move.x, move.y, move.z, move.w);
        const score = this.minimax(newGame, depth - 1, alpha, beta, true);
        minScore = Math.min(minScore, score);
        beta = Math.min(beta, score);
        if (beta <= alpha) break;
      }
      return minScore;
    }
  }

  /**
   * 即座の勝利手または防御手を探す
   */
  findImmediateMove(game) {
    const aiPlayer = game.currentPlayer;
    const humanPlayer = aiPlayer === 1 ? 2 : 1;
    const candidates = this.getCandidateMoves(game);

    // 勝利手を探す
    for (const move of candidates) {
      const newGame = game.clone();
      newGame.placeStone(move.x, move.y, move.z, move.w);
      if (newGame.winner === aiPlayer) {
        return move;
      }
    }

    // 相手の勝利を防ぐ
    const tempGame = game.clone();
    tempGame.currentPlayer = humanPlayer;
    for (const move of candidates) {
      const newGame = tempGame.clone();
      newGame.placeStone(move.x, move.y, move.z, move.w);
      if (newGame.winner === humanPlayer) {
        return move;
      }
    }

    return null;
  }

  /**
   * 候補手を取得（既存の石の周辺のみ、優先順位付き）
   */
  getCandidateMoves(game, radius = 2) {
    const candidates = new Set();
    const SIZE = game.size;

    // stickyモードの場合はNeumann近傍のみ
    if (game.stickyMode && game.moveCount > 0) {
      const neumannDirs = [
        [1, 0, 0, 0], [-1, 0, 0, 0],
        [0, 1, 0, 0], [0, -1, 0, 0],
        [0, 0, 1, 0], [0, 0, -1, 0],
        [0, 0, 0, 1], [0, 0, 0, -1]
      ];

      for (let x = 0; x < SIZE.x; x++) {
        for (let y = 0; y < SIZE.y; y++) {
          for (let z = 0; z < SIZE.z; z++) {
            for (let w = 0; w < SIZE.w; w++) {
              if (game.board[x][y][z][w] !== 0) {
                // Neumann近傍のみをチェック
                for (const dir of neumannDirs) {
                  const nx = x + dir[0];
                  const ny = y + dir[1];
                  const nz = z + dir[2];
                  const nw = w + dir[3];
                  if (
                    nx >= 0 && nx < SIZE.x &&
                    ny >= 0 && ny < SIZE.y &&
                    nz >= 0 && nz < SIZE.z &&
                    nw >= 0 && nw < SIZE.w &&
                    game.board[nx][ny][nz][nw] === 0
                  ) {
                    candidates.add(`${nx},${ny},${nz},${nw}`);
                  }
                }
              }
            }
          }
        }
      }
    } else {
      // 通常モード: 既存の石の周辺をチェック
      for (let x = 0; x < SIZE.x; x++) {
        for (let y = 0; y < SIZE.y; y++) {
          for (let z = 0; z < SIZE.z; z++) {
            for (let w = 0; w < SIZE.w; w++) {
              if (game.board[x][y][z][w] !== 0) {
                // この石の周辺をチェック
                for (let dx = -radius; dx <= radius; dx++) {
                  for (let dy = -radius; dy <= radius; dy++) {
                    for (let dz = -radius; dz <= radius; dz++) {
                      for (let dw = -radius; dw <= radius; dw++) {
                        const nx = x + dx;
                        const ny = y + dy;
                        const nz = z + dz;
                        const nw = w + dw;
                        if (
                          nx >= 0 && nx < SIZE.x &&
                          ny >= 0 && ny < SIZE.y &&
                          nz >= 0 && nz < SIZE.z &&
                          nw >= 0 && nw < SIZE.w &&
                          game.board[nx][ny][nz][nw] === 0
                        ) {
                          candidates.add(`${nx},${ny},${nz},${nw}`);
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    // Set から配列に変換し、評価順にソート
    let moves = Array.from(candidates).map(str => {
      const [x, y, z, w] = str.split(',').map(Number);
      return { x, y, z, w };
    });

    // stickyモード: Neumann近傍チェック（安全のため二重チェック）
    if (game.stickyMode && game.moveCount > 0) {
      moves = moves.filter(move => game.hasNeumannNeighbor(move.x, move.y, move.z, move.w));
    }

    // 三三禁止ルール：先手（プレイヤー1）の場合、禁止手を除外
    if (game.currentPlayer === 1) {
      moves = moves.filter(move => !game.isProhibitedMove(move.x, move.y, move.z, move.w));
    }

    // スコア順にソート（より良い手を先に探索）
    return this.orderMoves(game, moves);
  }

  /**
   * 手を評価順にソート
   */
  orderMoves(game, moves) {
    return moves.map(move => {
      const score = this.evaluateMove(game, move);
      return { ...move, score };
    }).sort((a, b) => b.score - a.score).slice(0, 30); // 上位30手に制限
  }

  /**
   * 単一の手を簡易評価
   */
  evaluateMove(game, move) {
    let score = 0;
    const player = game.currentPlayer;
    const opponent = player === 1 ? 2 : 1;

    for (const dir of game.directions) {
      const lineInfo = this.getLineInfo(game, move.x, move.y, move.z, move.w, dir, player);
      score += this.scoreLineInfo(lineInfo);

      const oppLineInfo = this.getLineInfo(game, move.x, move.y, move.z, move.w, dir, opponent);
      score += this.scoreLineInfo(oppLineInfo) * 0.9; // 防御も重要
    }

    // 中央に近いほどボーナス
    const centerX = (game.size.x - 1) / 2;
    const centerY = (game.size.y - 1) / 2;
    const centerZ = (game.size.z - 1) / 2;
    const centerW = (game.size.w - 1) / 2;
    const distFromCenter = Math.abs(move.x - centerX) + Math.abs(move.y - centerY) +
                          Math.abs(move.z - centerZ) + Math.abs(move.w - centerW);
    score += (16 - distFromCenter) * 0.1;

    return score;
  }

  /**
   * 盤面全体を評価
   */
  evaluate(game) {
    const aiPlayer = game.currentPlayer === 1 ? 2 : 1; // 前の手番がAI
    const humanPlayer = game.currentPlayer;

    let aiScore = 0;
    let humanScore = 0;

    // 全方向のラインをチェック
    const checked = new Set();

    for (let x = 0; x < game.size.x; x++) {
      for (let y = 0; y < game.size.y; y++) {
        for (let z = 0; z < game.size.z; z++) {
          for (let w = 0; w < game.size.w; w++) {
            if (game.board[x][y][z][w] !== 0) {
              for (const dir of game.directions) {
                const key = this.getLineKey(x, y, z, w, dir);
                if (!checked.has(key)) {
                  checked.add(key);

                  const aiLineInfo = this.getLineInfoAt(game, x, y, z, w, dir, aiPlayer);
                  aiScore += this.scoreLineInfo(aiLineInfo);

                  const humanLineInfo = this.getLineInfoAt(game, x, y, z, w, dir, humanPlayer);
                  humanScore += this.scoreLineInfo(humanLineInfo);
                }
              }
            }
          }
        }
      }
    }

    return aiScore - humanScore;
  }

  /**
   * ライン情報を取得（仮想的にその位置に石を置いた場合）
   */
  getLineInfo(game, x, y, z, w, dir, player) {
    const SIZE = game.size;
    let count = 1; // この位置
    let openEnds = 0;

    // 正方向をチェック
    let blocked = false;
    for (let i = 1; i < 5; i++) {
      const nx = x + dir[0] * i;
      const ny = y + dir[1] * i;
      const nz = z + dir[2] * i;
      const nw = w + dir[3] * i;

      if (nx < 0 || nx >= SIZE.x || ny < 0 || ny >= SIZE.y ||
          nz < 0 || nz >= SIZE.z || nw < 0 || nw >= SIZE.w) {
        blocked = true;
        break;
      }

      const cell = game.board[nx][ny][nz][nw];
      if (cell === player) {
        count++;
      } else if (cell === 0) {
        openEnds++;
        break;
      } else {
        blocked = true;
        break;
      }
    }
    if (!blocked && openEnds === 0) openEnds++;

    // 負方向をチェック
    blocked = false;
    for (let i = 1; i < 5; i++) {
      const nx = x - dir[0] * i;
      const ny = y - dir[1] * i;
      const nz = z - dir[2] * i;
      const nw = w - dir[3] * i;

      if (nx < 0 || nx >= SIZE.x || ny < 0 || ny >= SIZE.y ||
          nz < 0 || nz >= SIZE.z || nw < 0 || nw >= SIZE.w) {
        blocked = true;
        break;
      }

      const cell = game.board[nx][ny][nz][nw];
      if (cell === player) {
        count++;
      } else if (cell === 0) {
        openEnds++;
        break;
      } else {
        blocked = true;
        break;
      }
    }
    if (!blocked && openEnds < 2) openEnds++;

    return { count, openEnds };
  }

  /**
   * 既存の石からのライン情報を取得
   */
  getLineInfoAt(game, x, y, z, w, dir, player) {
    if (game.board[x][y][z][w] !== player) {
      return { count: 0, openEnds: 0 };
    }

    const SIZE = game.size;
    let count = 1;
    let openEnds = 0;

    // 正方向
    let blocked = false;
    for (let i = 1; i < 5; i++) {
      const nx = x + dir[0] * i;
      const ny = y + dir[1] * i;
      const nz = z + dir[2] * i;
      const nw = w + dir[3] * i;

      if (nx < 0 || nx >= SIZE.x || ny < 0 || ny >= SIZE.y ||
          nz < 0 || nz >= SIZE.z || nw < 0 || nw >= SIZE.w) {
        blocked = true;
        break;
      }

      const cell = game.board[nx][ny][nz][nw];
      if (cell === player) {
        count++;
      } else if (cell === 0) {
        openEnds++;
        break;
      } else {
        blocked = true;
        break;
      }
    }

    // 負方向
    for (let i = 1; i < 5; i++) {
      const nx = x - dir[0] * i;
      const ny = y - dir[1] * i;
      const nz = z - dir[2] * i;
      const nw = w - dir[3] * i;

      if (nx < 0 || nx >= SIZE.x || ny < 0 || ny >= SIZE.y ||
          nz < 0 || nz >= SIZE.z || nw < 0 || nw >= SIZE.w) {
        break;
      }

      const cell = game.board[nx][ny][nz][nw];
      if (cell === player) {
        count++;
      } else if (cell === 0) {
        openEnds++;
        break;
      } else {
        break;
      }
    }

    return { count, openEnds };
  }

  /**
   * ライン情報をスコアに変換
   */
  scoreLineInfo(info) {
    const { count, openEnds } = info;

    if (count >= 5) return this.SCORE_WIN;
    if (openEnds === 0) return 0;

    if (count === 4) {
      return openEnds === 2 ? this.SCORE_FOUR_OPEN : this.SCORE_FOUR_HALF;
    }
    if (count === 3) {
      return openEnds === 2 ? this.SCORE_THREE_OPEN : this.SCORE_THREE_HALF;
    }
    if (count === 2) {
      return openEnds === 2 ? this.SCORE_TWO_OPEN : this.SCORE_TWO_HALF;
    }

    return 0;
  }

  /**
   * ラインの一意キーを生成（重複チェック用）
   */
  getLineKey(x, y, z, w, dir) {
    // 方向を正規化（正方向のみ使用）
    return `${x},${y},${z},${w}:${dir.join(',')}`;
  }
}

// 異なる深度のAIを登録
AIRegistry.register('minimax-easy', new MinimaxAI(1));    // 簡単
AIRegistry.register('minimax-medium', new MinimaxAI(2));  // 普通
AIRegistry.register('minimax-hard', new MinimaxAI(3));    // 難しい
