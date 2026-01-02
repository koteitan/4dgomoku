/**
 * Random AI - ランダムに手を選ぶAI
 * テスト用・比較用
 */
class RandomAI extends AIStrategy {
  getName() {
    return 'random';
  }

  getDescription() {
    return 'ランダムに空きマスを選択';
  }

  getBestMove(game) {
    const validMoves = game.getValidMoves();
    if (validMoves.length === 0) return null;

    const randomIndex = Math.floor(Math.random() * validMoves.length);
    return validMoves[randomIndex];
  }
}

// AIレジストリに登録
AIRegistry.register('random', new RandomAI());
