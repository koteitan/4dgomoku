/**
 * AI Strategy Base Class
 * すべてのAIアルゴリズムが継承する基底クラス
 */
class AIStrategy {
  /**
   * AIの名前を返す
   * @returns {string} AI名
   */
  getName() {
    return 'Base AI';
  }

  /**
   * AIの説明を返す
   * @returns {string} 説明
   */
  getDescription() {
    return 'Base AI class';
  }

  /**
   * 最善手を計算して返す
   * @param {Game4D} game - 現在のゲーム状態
   * @returns {{x: number, y: number, z: number, w: number}} 次の手
   */
  getBestMove(game) {
    throw new Error('getBestMove must be implemented by subclass');
  }
}

// AIレジストリ: 利用可能なAIを登録
const AIRegistry = {
  _strategies: {},

  /**
   * AIを登録
   * @param {string} id - AI識別子
   * @param {AIStrategy} strategy - AIインスタンス
   */
  register(id, strategy) {
    this._strategies[id] = strategy;
  },

  /**
   * AIを取得
   * @param {string} id - AI識別子
   * @returns {AIStrategy} AIインスタンス
   */
  get(id) {
    return this._strategies[id];
  },

  /**
   * 登録済みAI一覧を取得
   * @returns {Array<{id: string, name: string, description: string}>}
   */
  getAll() {
    return Object.entries(this._strategies).map(([id, strategy]) => ({
      id,
      name: strategy.getName(),
      description: strategy.getDescription()
    }));
  }
};
