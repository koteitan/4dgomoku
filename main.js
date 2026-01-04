/**
 * 4D Gomoku - Main Game Logic
 */

// 定数
let SIZE = { x: 9, y: 9, z: 9, w: 9 };
const WIN_LENGTH = 5;

// 最大サイズを取得
function getMaxSize() {
  return Math.max(SIZE.x, SIZE.y, SIZE.z, SIZE.w);
}

// 範囲内かチェック
function inBounds(x, y, z, w) {
  return x >= 0 && x < SIZE.x && y >= 0 && y < SIZE.y &&
         z >= 0 && z < SIZE.z && w >= 0 && w < SIZE.w;
}

/**
 * 4次元空間のすべての方向ベクトルを生成
 * 計76方向（正負を含む）、38ペア
 */
function generateDirections() {
  const directions = [];

  // すべての可能な方向を生成
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dz = -1; dz <= 1; dz++) {
        for (let dw = -1; dw <= 1; dw++) {
          // 少なくとも1つは非ゼロ
          if (dx === 0 && dy === 0 && dz === 0 && dw === 0) continue;

          // 正規化: 最初の非ゼロ成分が正になるように
          const dir = [dx, dy, dz, dw];
          let firstNonZero = 0;
          for (let i = 0; i < 4; i++) {
            if (dir[i] !== 0) {
              firstNonZero = dir[i];
              break;
            }
          }
          if (firstNonZero > 0) {
            directions.push(dir);
          }
        }
      }
    }
  }

  return directions;
}

/**
 * Game4D - 4次元五目並べのゲーム状態を管理
 */
class Game4D {
  constructor(stickyMode = false) {
    this.size = SIZE;
    this.winLength = WIN_LENGTH;
    this.directions = generateDirections();
    this.stickyMode = stickyMode;
    this.reset();
  }

  reset() {
    // 4次元配列を初期化 (0: 空, 1: 黒, 2: 白)
    this.board = new Array(SIZE.x);
    for (let x = 0; x < SIZE.x; x++) {
      this.board[x] = new Array(SIZE.y);
      for (let y = 0; y < SIZE.y; y++) {
        this.board[x][y] = new Array(SIZE.z);
        for (let z = 0; z < SIZE.z; z++) {
          this.board[x][y][z] = new Array(SIZE.w).fill(0);
        }
      }
    }

    this.currentPlayer = 1; // 1: 黒(先手), 2: 白(後手)
    this.winner = null;
    this.winningLine = null;
    this.moveCount = 0;
    this.lastMove = null;
    this.history = [];
  }

  /**
   * 石を置く
   * @returns {boolean} 成功したかどうか
   */
  placeStone(x, y, z, w, skipDoubleThreeCheck = false) {
    if (this.winner !== null) return false;
    if (!inBounds(x, y, z, w)) return false;
    if (this.board[x][y][z][w] !== 0) return false;

    // 三三禁止チェック（先手のみ、勝ちになる手は除く）
    if (!skipDoubleThreeCheck && this.currentPlayer === 1) {
      if (this.isDoubleThree(x, y, z, w) && !this.wouldWin(x, y, z, w)) {
        return false;
      }
    }

    this.board[x][y][z][w] = this.currentPlayer;
    this.lastMove = { x, y, z, w, player: this.currentPlayer };
    this.history.push({ x, y, z, w, player: this.currentPlayer });
    this.moveCount++;

    // 勝利判定
    if (this.checkWin(x, y, z, w)) {
      this.winner = this.currentPlayer;
    } else {
      this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
    }

    return true;
  }

  /**
   * その手で勝ちになるかチェック
   */
  wouldWin(x, y, z, w) {
    const player = this.currentPlayer;
    this.board[x][y][z][w] = player;
    let wins = false;

    for (const dir of this.directions) {
      const line = this.countLine(x, y, z, w, dir, player);
      if (line.count >= WIN_LENGTH) {
        wins = true;
        break;
      }
    }

    this.board[x][y][z][w] = 0;
    return wins;
  }

  /**
   * 三三禁止チェック（2つ以上の活三ができるか）
   */
  isDoubleThree(x, y, z, w) {
    const player = this.currentPlayer;
    this.board[x][y][z][w] = player;

    let openThreeCount = 0;

    for (const dir of this.directions) {
      if (this.isOpenThree(x, y, z, w, dir, player)) {
        openThreeCount++;
        if (openThreeCount >= 2) {
          this.board[x][y][z][w] = 0;
          return true;
        }
      }
    }

    this.board[x][y][z][w] = 0;
    return false;
  }

  /**
   * 活三（両端が空いている三）かどうかチェック
   */
  isOpenThree(x, y, z, w, dir, player) {
    // その方向の連続する石の数と両端の状態を調べる
    let count = 1;
    let openEnds = 0;
    let hasGap = false;

    // 正方向をチェック
    let posEnd = this.checkDirection(x, y, z, w, dir, 1, player);
    // 負方向をチェック
    let negEnd = this.checkDirection(x, y, z, w, dir, -1, player);

    count = 1 + posEnd.stones + negEnd.stones;

    // 活三の条件: ちょうど3連で両端が空いている
    if (count === 3 && posEnd.open && negEnd.open) {
      // さらに、両端の先にも空きがあることを確認（5連になれる）
      return true;
    }

    return false;
  }

  /**
   * 指定方向の石の数と端の状態をチェック
   */
  checkDirection(x, y, z, w, dir, sign, player) {
    let stones = 0;
    let open = false;

    for (let i = 1; i < getMaxSize(); i++) {
      const nx = x + dir[0] * i * sign;
      const ny = y + dir[1] * i * sign;
      const nz = z + dir[2] * i * sign;
      const nw = w + dir[3] * i * sign;

      if (!inBounds(nx, ny, nz, nw)) {
        open = false;
        break;
      }

      const cell = this.board[nx][ny][nz][nw];
      if (cell === player) {
        stones++;
      } else if (cell === 0) {
        open = true;
        break;
      } else {
        open = false;
        break;
      }
    }

    return { stones, open };
  }

  /**
   * 勝利判定
   */
  checkWin(x, y, z, w) {
    const player = this.board[x][y][z][w];
    if (player === 0) return false;

    for (const dir of this.directions) {
      const line = this.countLine(x, y, z, w, dir, player);
      if (line.count >= WIN_LENGTH) {
        this.winningLine = line.positions;
        return true;
      }
    }

    return false;
  }

  /**
   * 指定方向のラインをカウント
   */
  countLine(x, y, z, w, dir, player) {
    const positions = [{ x, y, z, w }];
    let count = 1;

    // 正方向
    for (let i = 1; i < getMaxSize(); i++) {
      const nx = x + dir[0] * i;
      const ny = y + dir[1] * i;
      const nz = z + dir[2] * i;
      const nw = w + dir[3] * i;

      if (!inBounds(nx, ny, nz, nw)) break;
      if (this.board[nx][ny][nz][nw] !== player) break;

      count++;
      positions.push({ x: nx, y: ny, z: nz, w: nw });
    }

    // 負方向
    for (let i = 1; i < getMaxSize(); i++) {
      const nx = x - dir[0] * i;
      const ny = y - dir[1] * i;
      const nz = z - dir[2] * i;
      const nw = w - dir[3] * i;

      if (!inBounds(nx, ny, nz, nw)) break;
      if (this.board[nx][ny][nz][nw] !== player) break;

      count++;
      positions.unshift({ x: nx, y: ny, z: nz, w: nw });
    }

    return { count, positions };
  }

  /**
   * 有効な手の一覧を取得
   */
  getValidMoves(includeProhibited = false) {
    const moves = [];
    for (let x = 0; x < SIZE.x; x++) {
      for (let y = 0; y < SIZE.y; y++) {
        for (let z = 0; z < SIZE.z; z++) {
          for (let w = 0; w < SIZE.w; w++) {
            if (this.board[x][y][z][w] === 0) {
              // 三三禁止チェック（先手のみ）
              if (!includeProhibited && this.currentPlayer === 1) {
                if (this.isDoubleThree(x, y, z, w) && !this.wouldWin(x, y, z, w)) {
                  continue;
                }
              }
              moves.push({ x, y, z, w });
            }
          }
        }
      }
    }
    return moves;
  }

  /**
   * 指定の手が禁じ手かどうか
   */
  isProhibitedMove(x, y, z, w) {
    if (this.currentPlayer !== 1) return false;
    if (this.board[x][y][z][w] !== 0) return false;
    return this.isDoubleThree(x, y, z, w) && !this.wouldWin(x, y, z, w);
  }

  /**
   * 履歴をダンプ（デバッグ用）
   */
  dumphist() {
    let output = '';
    this.history.forEach((move, index) => {
      const playerName = move.player === 1 ? 'you' : 'com';
      output += `${index + 1}:${playerName}:(${move.x},${move.y},${move.z},${move.w})\n`;
    });
    console.log(output);
  }

  /**
   * Neumann近傍（直交方向）に石があるかチェック
   */
  hasNeumannNeighbor(x, y, z, w) {
    const neumannDirs = [
      [1, 0, 0, 0], [-1, 0, 0, 0],
      [0, 1, 0, 0], [0, -1, 0, 0],
      [0, 0, 1, 0], [0, 0, -1, 0],
      [0, 0, 0, 1], [0, 0, 0, -1]
    ];

    for (const dir of neumannDirs) {
      const nx = x + dir[0];
      const ny = y + dir[1];
      const nz = z + dir[2];
      const nw = w + dir[3];

      if (inBounds(nx, ny, nz, nw) && this.board[nx][ny][nz][nw] !== 0) {
        return true;
      }
    }
    return false;
  }

  /**
   * ゲーム状態をクローン
   */
  clone() {
    const newGame = new Game4D(this.stickyMode);
    newGame.currentPlayer = this.currentPlayer;
    newGame.winner = this.winner;
    newGame.moveCount = this.moveCount;
    newGame.lastMove = this.lastMove ? { ...this.lastMove } : null;

    // 盤面をコピー
    for (let x = 0; x < SIZE.x; x++) {
      for (let y = 0; y < SIZE.y; y++) {
        for (let z = 0; z < SIZE.z; z++) {
          for (let w = 0; w < SIZE.w; w++) {
            newGame.board[x][y][z][w] = this.board[x][y][z][w];
          }
        }
      }
    }

    return newGame;
  }
}

/**
 * GameUI - ゲームのUI管理
 */
class GameUI {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    // ゲーム状態
    this.stickyMode = false;      // stickyモード
    this.game = new Game4D(this.stickyMode);
    this.ai = null;
    this.playerColor = 1; // 1: 黒(先手), 2: 白(後手)
    this.isThinking = false;
    this.hoveredCell = null;      // ホバー中の空セル
    this.hoveredStone = null;     // ホバー中の石

    // サイズ計算
    this.calculateSize();

    // イベントリスナー
    canvas.addEventListener('click', this.handleClick.bind(this));
    canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    canvas.addEventListener('mouseleave', () => {
      this.hoveredCell = null;
      this.hoveredStone = null;
      this.draw();
    });

    window.addEventListener('resize', () => {
      this.calculateSize();
      this.draw();
    });

    this.draw();
  }

  /**
   * ボードサイズを計算（ウィンドウに合わせる）
   */
  calculateSize() {
    this.boardGap = 4;
    this.boardPadding = 1;
    this.labelSpace = 0;

    // ウィンドウサイズから利用可能な領域を計算
    const padding = 40;
    const availableWidth = window.innerWidth - padding;
    const availableHeight = window.innerHeight - 150;

    // totalWidth = (cellSize * SIZE.x + boardPadding * 2) * SIZE.z + boardGap * (SIZE.z - 1)
    // -> cellSize = (availableWidth - boardPadding * 2 * SIZE.z - boardGap * (SIZE.z - 1)) / (SIZE.x * SIZE.z)
    const cellSizeFromWidth = (availableWidth - this.boardPadding * 2 * SIZE.z - this.boardGap * (SIZE.z - 1)) / (SIZE.x * SIZE.z);
    const cellSizeFromHeight = (availableHeight - this.boardPadding * 2 * SIZE.w - this.boardGap * (SIZE.w - 1)) / (SIZE.y * SIZE.w);
    this.cellSize = Math.floor(Math.min(cellSizeFromWidth, cellSizeFromHeight));
    this.cellSize = Math.max(3, this.cellSize);

    this.boardSizeX = this.cellSize * SIZE.x + this.boardPadding * 2;
    this.boardSizeY = this.cellSize * SIZE.y + this.boardPadding * 2;
    this.totalWidth = (this.boardSizeX + this.boardGap) * SIZE.z - this.boardGap;
    this.totalHeight = (this.boardSizeY + this.boardGap) * SIZE.w - this.boardGap;

    this.canvas.width = this.totalWidth;
    this.canvas.height = this.totalHeight;
  }

  setAI(ai) {
    this.ai = ai;
  }

  setPlayerColor(color) {
    this.playerColor = color;
  }

  setStickyMode(sticky) {
    this.stickyMode = sticky;
    this.game.stickyMode = sticky;
  }

  setBoardSize(x, y, z, w) {
    SIZE = { x, y, z, w };
    this.game = new Game4D(this.stickyMode);
    this.calculateSize();
    this.newGame();
    // サブタイトル更新
    const subtitle = document.querySelector('.subtitle');
    if (subtitle) {
      subtitle.textContent = `四次元五目並べ (${x}x${y}x${z}x${w})`;
    }
  }

  newGame() {
    this.game.reset();
    this.isThinking = false;
    this.hoveredCell = null;
    this.hoveredStone = null;
    this.draw();
    this.updateStatus();

    // プレイヤーが後手（白）の場合、AIが先に打つ
    if (this.playerColor === 2 && this.ai) {
      this.makeAIMove();
    }
  }

  /**
   * クリックイベント処理
   */
  handleClick(event) {
    if (this.isThinking || this.game.winner !== null) return;
    // AIがある場合のみ、プレイヤーのターンかチェック
    if (this.ai && this.game.currentPlayer !== this.playerColor) return;

    const coords = this.getCoordinatesFromEvent(event);
    if (!coords) return;

    const { x, y, z, w } = coords;

    // stickyモード: 最初の手以外はNeumann近傍のみ
    if (this.stickyMode && this.game.moveCount > 0) {
      if (!this.game.hasNeumannNeighbor(x, y, z, w)) {
        return;
      }
    }

    if (this.game.placeStone(x, y, z, w)) {
      this.draw();
      this.updateStatus();

      if (this.game.winner === null && this.ai) {
        this.makeAIMove();
      }
    }
  }

  /**
   * マウス移動イベント処理
   */
  handleMouseMove(event) {
    const coords = this.getCoordinatesFromEvent(event);
    const prevHoveredCell = this.hoveredCell;
    const prevHoveredStone = this.hoveredStone;

    if (coords) {
      const cellValue = this.game.board[coords.x][coords.y][coords.z][coords.w];
      if (cellValue === 0) {
        this.hoveredCell = coords;
        this.hoveredStone = null;
      } else {
        this.hoveredCell = null;
        this.hoveredStone = { ...coords, player: cellValue };
      }
    } else {
      this.hoveredCell = null;
      this.hoveredStone = null;
    }

    // 変更があった場合のみ再描画
    if (JSON.stringify(prevHoveredCell) !== JSON.stringify(this.hoveredCell) ||
        JSON.stringify(prevHoveredStone) !== JSON.stringify(this.hoveredStone)) {
      this.draw();
      this.updateCoordInfo(coords);
    }
  }

  /**
   * イベントから4D座標を取得
   */
  getCoordinatesFromEvent(event) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const canvasX = (event.clientX - rect.left) * scaleX - this.labelSpace;
    const canvasY = (event.clientY - rect.top) * scaleY - this.labelSpace;

    // どのボードか特定 (z, w)
    const boardW = Math.floor(canvasY / (this.boardSizeY + this.boardGap));
    const boardZ = Math.floor(canvasX / (this.boardSizeX + this.boardGap));

    if (boardZ < 0 || boardZ >= SIZE.z || boardW < 0 || boardW >= SIZE.w) return null;

    // ボード内の位置 (x, y)
    const localX = canvasX - boardZ * (this.boardSizeX + this.boardGap) - this.boardPadding;
    const localY = canvasY - boardW * (this.boardSizeY + this.boardGap) - this.boardPadding;

    const x = Math.floor(localX / this.cellSize);
    const y = Math.floor(localY / this.cellSize);

    if (x < 0 || x >= SIZE.x || y < 0 || y >= SIZE.y) return null;

    return { x, y, z: boardZ, w: boardW };
  }

  /**
   * AIの手を実行（Web Workerで非同期処理）
   */
  async makeAIMove() {
    if (!this.ai || this.game.winner !== null) return;

    this.isThinking = true;
    this.updateStatus();

    try {
      // Web Workerで計算を実行
      const move = await this.computeAIMoveAsync();
      if (move) {
        this.game.placeStone(move.x, move.y, move.z, move.w);
        this.draw();
      }
    } finally {
      this.isThinking = false;
      this.updateStatus();
    }
  }

  /**
   * Web Workerを使ってAI計算を非同期で実行
   */
  computeAIMoveAsync() {
    return new Promise((resolve) => {
      // Worker用のコードを文字列として作成
      const workerCode = `
        ${Game4D.toString()}
        ${generateDirections.toString()}
        ${AIStrategy.toString()}
        ${MinimaxAI.toString()}

        const SIZE = ${JSON.stringify(SIZE)};
        const WIN_LENGTH = ${WIN_LENGTH};

        function getMaxSize() {
          return Math.max(SIZE.x, SIZE.y, SIZE.z, SIZE.w);
        }

        function inBounds(x, y, z, w) {
          return x >= 0 && x < SIZE.x && y >= 0 && y < SIZE.y &&
                 z >= 0 && z < SIZE.z && w >= 0 && w < SIZE.w;
        }

        self.onmessage = function(e) {
          const { board, currentPlayer, moveCount, depth, stickyMode } = e.data;

          // ゲーム状態を復元
          const game = new Game4D(stickyMode);
          game.board = board;
          game.currentPlayer = currentPlayer;
          game.moveCount = moveCount;

          // AIで最善手を計算
          const ai = new MinimaxAI(depth);
          const move = ai.getBestMove(game);

          self.postMessage(move);
        };
      `;

      const blob = new Blob([workerCode], { type: 'application/javascript' });
      const worker = new Worker(URL.createObjectURL(blob));

      worker.onmessage = (e) => {
        worker.terminate();
        resolve(e.data);
      };

      worker.onerror = (e) => {
        console.error('Worker error:', e);
        worker.terminate();
        // フォールバック：メインスレッドで計算
        resolve(this.ai.getBestMove(this.game));
      };

      // ゲーム状態をWorkerに送信
      worker.postMessage({
        board: this.game.board,
        currentPlayer: this.game.currentPlayer,
        moveCount: this.game.moveCount,
        stickyMode: this.stickyMode,
        depth: this.ai.depth || 3
      });
    });
  }

  /**
   * ステータス表示を更新
   */
  updateStatus() {
    const status = document.getElementById('status');
    const isHumanMode = this.ai === null;

    if (this.game.winner !== null) {
      if (isHumanMode) {
        status.textContent = this.game.winner === 1 ? 'Green Win!' : 'Red Win!';
      } else {
        const isPlayerWin = this.game.winner === this.playerColor;
        status.textContent = isPlayerWin ? 'You Win!' : 'COM Win!';
      }
      status.className = 'winner';
    } else if (this.isThinking) {
      status.textContent = 'COM';
      status.className = 'thinking';
    } else {
      if (isHumanMode) {
        status.textContent = this.game.currentPlayer === 1 ? 'Green' : 'Red';
      } else {
        const isPlayerTurn = this.game.currentPlayer === this.playerColor;
        status.textContent = isPlayerTurn ? 'You' : 'COM';
      }
      status.className = this.game.currentPlayer === 1 ? 'black-turn' : 'white-turn';
    }
  }

  /**
   * 座標情報を更新
   */
  updateCoordInfo(coords) {
    const info = document.getElementById('coordInfo');
    if (coords) {
      info.textContent = `(x=${coords.x}, y=${coords.y}, z=${coords.z}, w=${coords.w})`;
    }
    // coordsがnullでも前の値を維持（ちらつき防止）
  }

  /**
   * 描画
   */
  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // 各ボードを描画
    for (let bz = 0; bz < SIZE.z; bz++) {
      for (let bw = 0; bw < SIZE.w; bw++) {
        this.drawBoard(bz, bw);
      }
    }

    // 勝利ラインを描画
    if (this.game.winningLine) {
      this.drawWinningLine();
    }
  }

  /**
   * 個別のボードを描画
   */
  drawBoard(bz, bw) {
    const ctx = this.ctx;
    const offsetX = this.labelSpace + bz * (this.boardSizeX + this.boardGap);
    const offsetY = this.labelSpace + bw * (this.boardSizeY + this.boardGap);

    // ボード背景
    ctx.fillStyle = '#111';
    ctx.fillRect(offsetX, offsetY, this.boardSizeX, this.boardSizeY);

    // グリッド線
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 0.5;

    for (let i = 0; i <= SIZE.x; i++) {
      // 縦線
      ctx.beginPath();
      ctx.moveTo(offsetX + this.boardPadding + i * this.cellSize, offsetY + this.boardPadding);
      ctx.lineTo(offsetX + this.boardPadding + i * this.cellSize, offsetY + this.boardSizeY - this.boardPadding);
      ctx.stroke();
    }

    for (let i = 0; i <= SIZE.y; i++) {
      // 横線
      ctx.beginPath();
      ctx.moveTo(offsetX + this.boardPadding, offsetY + this.boardPadding + i * this.cellSize);
      ctx.lineTo(offsetX + this.boardSizeX - this.boardPadding, offsetY + this.boardPadding + i * this.cellSize);
      ctx.stroke();
    }

    // 石を描画
    for (let x = 0; x < SIZE.x; x++) {
      for (let y = 0; y < SIZE.y; y++) {
        const stone = this.game.board[x][y][bz][bw];
        if (stone !== 0) {
          const isLastMove = this.game.lastMove &&
                             this.game.lastMove.x === x &&
                             this.game.lastMove.y === y &&
                             this.game.lastMove.z === bz &&
                             this.game.lastMove.w === bw;
          this.drawStone(offsetX, offsetY, x, y, stone, isLastMove);
        }
      }
    }

    // ルーラー表示（同じ行・列・3D行・4D列）
    const hovered = this.hoveredCell || this.hoveredStone;
    if (hovered) {
      const hx = hovered.x;
      const hy = hovered.y;
      const hz = hovered.z;
      const hw = hovered.w;

      for (let x = 0; x < SIZE.x; x++) {
        for (let y = 0; y < SIZE.y; y++) {
          // このセルが空かチェック
          if (this.game.board[x][y][bz][bw] !== 0) continue;

          // 完全一致（メインホバー）- 空セルの場合のみ
          const isMain = this.hoveredCell && (x === hx && y === hy && bz === hz && bw === hw);
          // 同じ行 (same y, z, w)
          const isSameRow = (y === hy && bz === hz && bw === hw);
          // 同じ列 (same x, z, w)
          const isSameCol = (x === hx && bz === hz && bw === hw);
          // 同じ3D行 (same x, y, w) - z方向
          const isSame3DRow = (x === hx && y === hy && bw === hw);
          // 同じ4D列 (same x, y, z) - w方向
          const isSame4DCol = (x === hx && y === hy && bz === hz);

          if (isMain) {
            const isProhibited = this.game.isProhibitedMove(x, y, bz, bw);
            this.drawRuler(offsetX, offsetY, x, y, 1.0, isProhibited);
          } else if (isSameRow || isSameCol || isSame3DRow || isSame4DCol) {
            this.drawRuler(offsetX, offsetY, x, y, 0.3, false);
          }
        }
      }
    }

    // 連続ガイド表示（石の上にホバー時）
    if (this.hoveredStone) {
      const guides = this.getContinuousGuides(this.hoveredStone);
      for (const guide of guides) {
        if (guide.z === bz && guide.w === bw) {
          this.drawContinuousGuide(offsetX, offsetY, guide.x, guide.y, this.hoveredStone.player);
        }
      }
    }
  }

  /**
   * 石を描画（フルサイズの四角形）
   */
  drawStone(offsetX, offsetY, x, y, player, isLastMove = false) {
    const ctx = this.ctx;
    const sx = offsetX + this.boardPadding + x * this.cellSize;
    const sy = offsetY + this.boardPadding + y * this.cellSize;

    if (player === 1) {
      // Green石 (先手) - 最後の手は明るい色
      ctx.fillStyle = isLastMove ? '#90EE90' : '#228B22';
    } else {
      // Red石 (後手) - 最後の手は明るい色
      ctx.fillStyle = isLastMove ? '#FF6B6B' : '#8B0000';
    }

    ctx.fillRect(sx, sy, this.cellSize, this.cellSize);
  }

  /**
   * ルーラーを描画（フルサイズの四角形）
   */
  drawRuler(offsetX, offsetY, x, y, alpha = 1.0, isProhibited = false) {
    const ctx = this.ctx;
    const sx = offsetX + this.boardPadding + x * this.cellSize;
    const sy = offsetY + this.boardPadding + y * this.cellSize;

    if (isProhibited) {
      // 禁止手は灰色で表示
      ctx.fillStyle = `rgba(128,128,128,${alpha * 0.6})`;
    } else {
      // AIモードではプレイヤーの色、対人モードでは現在のプレイヤーの色
      const rulerPlayer = this.ai ? this.playerColor : this.game.currentPlayer;
      if (rulerPlayer === 1) {
        ctx.fillStyle = `rgba(34,139,34,${alpha * 0.6})`;
      } else {
        ctx.fillStyle = `rgba(180,0,0,${alpha * 0.6})`;
      }
    }
    ctx.fillRect(sx, sy, this.cellSize, this.cellSize);
  }

  /**
   * 連続ガイドを取得（ホバーした石から隣接石がある方向の最初の空きセル）
   */
  getContinuousGuides(stone) {
    const guides = [];
    const { x, y, z, w, player } = stone;

    for (const dir of this.game.directions) {
      // 正方向と逆方向の両方をチェック
      for (const sign of [1, -1]) {
        // 隣接セル（Moore近傍）をチェック
        const nx = x + dir[0] * sign;
        const ny = y + dir[1] * sign;
        const nz = z + dir[2] * sign;
        const nw = w + dir[3] * sign;

        // 範囲外チェック
        if (!inBounds(nx, ny, nz, nw)) continue;

        // 隣接に同じプレイヤーの石があるか
        if (this.game.board[nx][ny][nz][nw] !== player) continue;

        // その方向の最初の空きセルを探す
        for (let i = 1; i < getMaxSize(); i++) {
          const ex = x + dir[0] * i * sign;
          const ey = y + dir[1] * i * sign;
          const ez = z + dir[2] * i * sign;
          const ew = w + dir[3] * i * sign;

          if (!inBounds(ex, ey, ez, ew)) break;

          const cell = this.game.board[ex][ey][ez][ew];
          if (cell === 0) {
            guides.push({ x: ex, y: ey, z: ez, w: ew });
            break;
          } else if (cell !== player) {
            break;
          }
        }

        // 逆方向も探す（この方向の反対側）
        for (let i = 1; i < getMaxSize(); i++) {
          const ex = x - dir[0] * i * sign;
          const ey = y - dir[1] * i * sign;
          const ez = z - dir[2] * i * sign;
          const ew = w - dir[3] * i * sign;

          if (!inBounds(ex, ey, ez, ew)) break;

          const cell = this.game.board[ex][ey][ez][ew];
          if (cell === 0) {
            guides.push({ x: ex, y: ey, z: ez, w: ew });
            break;
          } else if (cell !== player) {
            break;
          }
        }
      }
    }

    return guides;
  }

  /**
   * 連続ガイドを描画（枠線のみ）
   */
  drawContinuousGuide(offsetX, offsetY, x, y, player) {
    const ctx = this.ctx;
    const sx = offsetX + this.boardPadding + x * this.cellSize;
    const sy = offsetY + this.boardPadding + y * this.cellSize;

    ctx.strokeStyle = player === 1 ? '#228B22' : '#8B0000';
    ctx.lineWidth = 1;
    ctx.strokeRect(sx + 0.5, sy + 0.5, this.cellSize - 1, this.cellSize - 1);
  }

  /**
   * 勝利ラインを描画（四角の枠線）
   */
  drawWinningLine() {
    const ctx = this.ctx;

    for (const pos of this.game.winningLine) {
      const offsetX = this.labelSpace + pos.z * (this.boardSizeX + this.boardGap);
      const offsetY = this.labelSpace + pos.w * (this.boardSizeY + this.boardGap);
      const sx = offsetX + this.boardPadding + pos.x * this.cellSize;
      const sy = offsetY + this.boardPadding + pos.y * this.cellSize;

      ctx.strokeStyle = '#ff0';
      ctx.lineWidth = 1;
      ctx.strokeRect(sx, sy, this.cellSize, this.cellSize);
    }
  }
}

// メイン初期化
document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('gameCanvas');
  const ui = new GameUI(canvas);

  // AI選択肢を設定
  const aiSelect = document.getElementById('aiSelect');

  // humanオプションを最初に追加
  const humanOption = document.createElement('option');
  humanOption.value = 'human';
  humanOption.textContent = 'human';
  humanOption.title = '2人対戦';
  aiSelect.appendChild(humanOption);

  const ais = AIRegistry.getAll();
  ais.forEach(ai => {
    const option = document.createElement('option');
    option.value = ai.id;
    option.textContent = `${ai.name}`;
    option.title = ai.description;
    aiSelect.appendChild(option);
  });

  // デフォルトでMinimax Hardを選択
  aiSelect.value = 'minimax-hard';
  ui.setAI(AIRegistry.get('minimax-hard'));

  // イベントリスナー
  aiSelect.addEventListener('change', () => {
    const value = aiSelect.value;
    ui.setAI(value === 'human' ? null : AIRegistry.get(value));
  });

  // サイズ変更時にゲームをリセット
  const updateBoardSize = () => {
    const x = parseInt(document.getElementById('sizeX').value) || 9;
    const y = parseInt(document.getElementById('sizeY').value) || 9;
    const z = parseInt(document.getElementById('sizeZ').value) || 9;
    const w = parseInt(document.getElementById('sizeW').value) || 9;
    ui.setBoardSize(
      Math.max(1, Math.min(15, x)),
      Math.max(1, Math.min(15, y)),
      Math.max(1, Math.min(15, z)),
      Math.max(1, Math.min(15, w))
    );
  };

  document.getElementById('sizeX').addEventListener('change', updateBoardSize);
  document.getElementById('sizeY').addEventListener('change', updateBoardSize);
  document.getElementById('sizeZ').addEventListener('change', updateBoardSize);
  document.getElementById('sizeW').addEventListener('change', updateBoardSize);

  document.getElementById('playerColor').addEventListener('change', (e) => {
    ui.setPlayerColor(e.target.value === 'black' ? 1 : 2);
  });

  document.getElementById('stickyMode').addEventListener('change', (e) => {
    ui.setStickyMode(e.target.value === 'sticky');
  });

  document.getElementById('newGameBtn').addEventListener('click', () => {
    ui.newGame();
  });

  // 初期表示
  ui.updateStatus();

  // デバッグ用グローバルアクセス
  window.gameUI = ui;
  window.dumphist = () => ui.game.dumphist();
});
