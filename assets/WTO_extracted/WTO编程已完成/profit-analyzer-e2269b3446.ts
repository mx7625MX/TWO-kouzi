/**
 * 收益分析管理器
 * - 计算交易收益
 * - 收益统计与分析
 * - 收益排行榜
 * - 收益趋势预测
 */

import Database from 'better-sqlite3'
import path from 'path'

// 收益记录类型定义
export interface ProfitRecord {
  id: string
  tokenAddress: string
  network: 'bsc' | 'solana'
  walletId?: string

  // 交易数据
  buyPrice: string
  sellPrice: string
  amount: string

  // 收益数据
  profit: string
  profitPercentage: string

  // 交易信息
  buyTxHash?: string
  sellTxHash?: string
  buyTime: number
  sellTime: number
  holdDuration: number // 持有时长（秒）

  // 标记
  status: 'completed' | 'failed' | 'pending'
  createdAt: number
}

// 收益汇总类型定义
export interface ProfitSummary {
  // 总体统计
  totalInvested: string
  totalReturn: string
  totalProfit: string
  totalProfitPercentage: string

  // 交易统计
  tradeCount: number
  winCount: number
  loseCount: number
  winRate: string

  // 最佳/最差
  bestProfit: string
  bestProfitPercentage: string
  worstLoss: string
  worstLossPercentage: string

  // 平均值
  avgProfit: string
  avgProfitPercentage: string
  avgHoldDuration: number

  // 时间范围
  startDate: number
  endDate: number
  updatedAt: number
}

// 收益趋势数据
export interface ProfitTrend {
  date: string
  profit: string
  profitPercentage: string
  tradeCount: number
}

// 排行榜条目
export interface RankingItem {
  tokenAddress: string
  tokenSymbol?: string
  network: string
  profit: string
  profitPercentage: string
  tradeCount: number
  winRate: string
}

/**
 * 收益分析管理器
 */
export class ProfitAnalyzer {
  private db: Database.Database

  constructor(dbPath?: string) {
    this.db = new Database(
      dbPath || path.join(process.cwd(), 'meme-master.db')
    )
    this.initializeTables()
  }

  /**
   * 初始化表结构
   */
  private initializeTables(): void {
    // 创建收益记录表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS profit_records (
        id TEXT PRIMARY KEY,
        token_address TEXT NOT NULL,
        network TEXT NOT NULL,
        wallet_id TEXT,

        buy_price TEXT NOT NULL,
        sell_price TEXT NOT NULL,
        amount TEXT NOT NULL,

        profit TEXT NOT NULL,
        profit_percentage TEXT NOT NULL,

        buy_tx_hash TEXT,
        sell_tx_hash TEXT,
        buy_time INTEGER NOT NULL,
        sell_time INTEGER NOT NULL,
        hold_duration INTEGER,

        status TEXT NOT NULL,
        created_at INTEGER NOT NULL
      )
    `)

    // 创建收益汇总表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS profit_summary (
        id TEXT PRIMARY KEY,
        token_address TEXT NOT NULL,
        network TEXT NOT NULL,

        total_invested TEXT NOT NULL,
        total_return TEXT NOT NULL,
        total_profit TEXT NOT NULL,
        total_profit_percentage TEXT NOT NULL,

        trade_count INTEGER NOT NULL,
        win_count INTEGER NOT NULL,
        lose_count INTEGER NOT NULL,
        win_rate TEXT NOT NULL,

        best_profit TEXT,
        best_profit_percentage TEXT,
        worst_loss TEXT,
        worst_loss_percentage TEXT,

        avg_profit TEXT,
        avg_profit_percentage TEXT,
        avg_hold_duration INTEGER,

        start_date INTEGER NOT NULL,
        end_date INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `)

    // 创建索引
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_profit_records_token ON profit_records(token_address);
      CREATE INDEX IF NOT EXISTS idx_profit_records_network ON profit_records(network);
      CREATE INDEX IF NOT EXISTS idx_profit_records_wallet ON profit_records(wallet_id);
      CREATE INDEX IF NOT EXISTS idx_profit_records_status ON profit_records(status);
      CREATE INDEX IF NOT EXISTS idx_profit_records_buy_time ON profit_records(buy_time);
      CREATE INDEX IF NOT EXISTS idx_profit_records_sell_time ON profit_records(sell_time);
    `)
  }

  // ==================== 收益计算 ====================

  /**
   * 计算收益
   */
  calculateProfit(params: {
    buyPrice: string
    sellPrice: string
    amount: string
  }): {
    profit: string
    profitPercentage: string
    invested: string
    returned: string
  } {
    const buyPrice = parseFloat(params.buyPrice)
    const sellPrice = parseFloat(params.sellPrice)
    const amount = parseFloat(params.amount)

    // 计算投资金额和回报金额
    const invested = buyPrice * amount
    const returned = sellPrice * amount

    // 计算绝对收益
    const profit = returned - invested

    // 计算收益率
    const profitPercentage = invested > 0 ? (profit / invested) * 100 : 0

    return {
      profit: profit.toFixed(18),
      profitPercentage: profitPercentage.toFixed(2),
      invested: invested.toFixed(18),
      returned: returned.toFixed(18)
    }
  }

  /**
   * 创建收益记录
   */
  createProfitRecord(params: {
    tokenAddress: string
    network: 'bsc' | 'solana'
    walletId?: string
    buyPrice: string
    sellPrice: string
    amount: string
    buyTxHash?: string
    sellTxHash?: string
    buyTime: number
    sellTime: number
    status?: string
  }): { success: boolean; recordId?: string; error?: string } {
    try {
      // 计算收益
      const profitResult = this.calculateProfit(params)

      // 计算持有时长
      const holdDuration = params.sellTime - params.buyTime

      const recordId = `profit-${params.network}-${params.tokenAddress.slice(0, 8)}-${Date.now()}`

      const record: ProfitRecord = {
        id: recordId,
        tokenAddress: params.tokenAddress,
        network: params.network,
        walletId: params.walletId,

        buyPrice: params.buyPrice,
        sellPrice: params.sellPrice,
        amount: params.amount,

        profit: profitResult.profit,
        profitPercentage: profitResult.profitPercentage,

        buyTxHash: params.buyTxHash,
        sellTxHash: params.sellTxHash,
        buyTime: params.buyTime,
        sellTime: params.sellTime,
        holdDuration,

        status: params.status || 'completed',
        createdAt: Date.now()
      }

      // 插入数据库
      const stmt = this.db.prepare(`
        INSERT INTO profit_records (
          id, token_address, network, wallet_id,
          buy_price, sell_price, amount,
          profit, profit_percentage,
          buy_tx_hash, sell_tx_hash, buy_time, sell_time, hold_duration,
          status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)

      stmt.run(
        record.id,
        record.tokenAddress,
        record.network,
        record.walletId,
        record.buyPrice,
        record.sellPrice,
        record.amount,
        record.profit,
        record.profitPercentage,
        record.buyTxHash,
        record.sellTxHash,
        record.buyTime,
        record.sellTime,
        record.holdDuration,
        record.status,
        record.createdAt
      )

      console.log(`收益记录已创建: ${recordId}`)

      return { success: true, recordId }
    } catch (error: any) {
      console.error('创建收益记录失败:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 获取收益记录
   */
  getProfitRecords(params?: {
    tokenAddress?: string
    network?: 'bsc' | 'solana'
    walletId?: string
    status?: string
    timeRange?: { start: number; end: number }
    limit?: number
    offset?: number
  }): { success: boolean; records?: ProfitRecord[]; error?: string } {
    try {
      let query = 'SELECT * FROM profit_records WHERE 1=1'
      const paramsList: any[] = []

      if (params?.tokenAddress) {
        query += ' AND token_address = ?'
        paramsList.push(params.tokenAddress)
      }

      if (params?.network) {
        query += ' AND network = ?'
        paramsList.push(params.network)
      }

      if (params?.walletId) {
        query += ' AND wallet_id = ?'
        paramsList.push(params.walletId)
      }

      if (params?.status) {
        query += ' AND status = ?'
        paramsList.push(params.status)
      }

      if (params?.timeRange) {
        query += ' AND sell_time >= ? AND sell_time <= ?'
        paramsList.push(params.timeRange.start, params.timeRange.end)
      }

      query += ' ORDER BY sell_time DESC'

      if (params?.limit) {
        query += ' LIMIT ?'
        paramsList.push(params.limit)

        if (params?.offset) {
          query += ' OFFSET ?'
          paramsList.push(params.offset)
        }
      }

      const stmt = this.db.prepare(query)
      const records = stmt.all(...paramsList)

      return { success: true, records: records as ProfitRecord[] }
    } catch (error: any) {
      console.error('获取收益记录失败:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 获取收益汇总
   */
  getProfitSummary(params?: {
    tokenAddress?: string
    network?: 'bsc' | 'solana'
    walletId?: string
    timeRange?: { start: number; end: number }
  }): { success: boolean; summary?: ProfitSummary; error?: string } {
    try {
      let query = `
        SELECT
          COUNT(*) as trade_count,
          SUM(CAST(buy_price AS REAL) * CAST(amount AS REAL)) as total_invested,
          SUM(CAST(sell_price AS REAL) * CAST(amount AS REAL)) as total_return,
          SUM(CAST(profit AS REAL)) as total_profit,
          AVG(CAST(profit AS REAL)) as avg_profit,
          AVG(CAST(hold_duration AS INTEGER)) as avg_hold_duration,
          MIN(CAST(buy_time AS INTEGER)) as start_date,
          MAX(CAST(sell_time AS INTEGER)) as end_date
        FROM profit_records
        WHERE status = 'completed'
      `

      const paramsList: any[] = []

      if (params?.tokenAddress) {
        query += ' AND token_address = ?'
        paramsList.push(params.tokenAddress)
      }

      if (params?.network) {
        query += ' AND network = ?'
        paramsList.push(params.network)
      }

      if (params?.walletId) {
        query += ' AND wallet_id = ?'
        paramsList.push(params.walletId)
      }

      if (params?.timeRange) {
        query += ' AND sell_time >= ? AND sell_time <= ?'
        paramsList.push(params.timeRange.start, params.timeRange.end)
      }

      const stmt = this.db.prepare(query)
      const result = stmt.get(...paramsList) as any

      if (!result) {
        throw new Error('未找到收益数据')
      }

      // 获取胜/负交易数
      let winQuery = `
        SELECT
          SUM(CASE WHEN CAST(profit AS REAL) > 0 THEN 1 ELSE 0 END) as win_count,
          SUM(CASE WHEN CAST(profit AS REAL) < 0 THEN 1 ELSE 0 END) as lose_count,
          MAX(CASE WHEN CAST(profit AS REAL) > 0 THEN CAST(profit AS REAL) ELSE NULL END) as best_profit,
          MIN(CASE WHEN CAST(profit AS REAL) < 0 THEN CAST(profit AS REAL) ELSE NULL END) as worst_loss
        FROM profit_records
        WHERE status = 'completed'
      `

      const winParamsList: any[] = []

      if (params?.tokenAddress) {
        winQuery += ' AND token_address = ?'
        winParamsList.push(params.tokenAddress)
      }

      if (params?.network) {
        winQuery += ' AND network = ?'
        winParamsList.push(params.network)
      }

      if (params?.walletId) {
        winQuery += ' AND wallet_id = ?'
        winParamsList.push(params.walletId)
      }

      if (params?.timeRange) {
        winQuery += ' AND sell_time >= ? AND sell_time <= ?'
        winParamsList.push(params.timeRange.start, params.timeRange.end)
      }

      const winStmt = this.db.prepare(winQuery)
      const winResult = winStmt.get(...winParamsList) as any

      // 计算统计数据
      const totalInvested = parseFloat(result.total_invested) || 0
      const totalReturn = parseFloat(result.total_return) || 0
      const totalProfit = parseFloat(result.total_profit) || 0
      const totalProfitPercentage = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0

      const tradeCount = result.trade_count || 0
      const winCount = winResult.win_count || 0
      const loseCount = winResult.lose_count || 0
      const winRate = tradeCount > 0 ? (winCount / tradeCount) * 100 : 0

      const bestProfit = winResult.best_profit || 0
      const worstLoss = winResult.worst_loss || 0
      const bestProfitPercentage = totalInvested > 0 ? (bestProfit / totalInvested) * 100 : 0
      const worstLossPercentage = totalInvested > 0 ? (worstLoss / totalInvested) * 100 : 0

      const avgProfit = parseFloat(result.avg_profit) || 0
      const avgProfitPercentage = totalInvested > 0 ? (avgProfit / totalInvested) * 100 : 0
      const avgHoldDuration = result.avg_hold_duration || 0

      const summary: ProfitSummary = {
        totalInvested: totalInvested.toFixed(18),
        totalReturn: totalReturn.toFixed(18),
        totalProfit: totalProfit.toFixed(18),
        totalProfitPercentage: totalProfitPercentage.toFixed(2),

        tradeCount,
        winCount,
        loseCount,
        winRate: winRate.toFixed(2),

        bestProfit: bestProfit.toFixed(18),
        bestProfitPercentage: bestProfitPercentage.toFixed(2),
        worstLoss: worstLoss.toFixed(18),
        worstLossPercentage: worstLossPercentage.toFixed(2),

        avgProfit: avgProfit.toFixed(18),
        avgProfitPercentage: avgProfitPercentage.toFixed(2),
        avgHoldDuration,

        startDate: result.start_date,
        endDate: result.end_date,
        updatedAt: Date.now()
      }

      return { success: true, summary }
    } catch (error: any) {
      console.error('获取收益汇总失败:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 获取收益趋势
   */
  getProfitTrends(params: {
    tokenAddress?: string
    network?: 'bsc' | 'solana'
    timeRange: { start: number; end: number }
    groupBy?: 'day' | 'week' | 'month'
  }): { success: boolean; trends?: ProfitTrend[]; error?: string } {
    try {
      const groupBy = params.groupBy || 'day'
      let dateFormat = ''

      switch (groupBy) {
        case 'day':
          dateFormat = '%Y-%m-%d'
          break
        case 'week':
          dateFormat = '%Y-%W'
          break
        case 'month':
          dateFormat = '%Y-%m'
          break
      }

      let query = `
        SELECT
          strftime('${dateFormat}', datetime(sell_time / 1000, 'unixepoch')) as date,
          SUM(CAST(profit AS REAL)) as profit,
          AVG(CAST(profit_percentage AS REAL)) as profit_percentage,
          COUNT(*) as trade_count
        FROM profit_records
        WHERE status = 'completed'
          AND sell_time >= ?
          AND sell_time <= ?
      `

      const paramsList: any[] = [params.timeRange.start, params.timeRange.end]

      if (params.tokenAddress) {
        query += ' AND token_address = ?'
        paramsList.push(params.tokenAddress)
      }

      if (params.network) {
        query += ' AND network = ?'
        paramsList.push(params.network)
      }

      query += ` GROUP BY date ORDER BY date ASC`

      const stmt = this.db.prepare(query)
      const results = stmt.all(...paramsList) as any[]

      const trends: ProfitTrend[] = results.map(result => ({
        date: result.date,
        profit: result.profit?.toFixed(18) || '0',
        profitPercentage: result.profit_percentage?.toFixed(2) || '0',
        tradeCount: result.trade_count || 0
      }))

      return { success: true, trends }
    } catch (error: any) {
      console.error('获取收益趋势失败:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 获取收益排行榜
   */
  getRankings(params: {
    type: 'token' | 'wallet'
    limit?: number
    orderBy?: 'profit' | 'profitPercentage' | 'tradeCount' | 'winRate'
    order?: 'ASC' | 'DESC'
    timeRange?: { start: number; end: number }
  }): { success: boolean; rankings?: RankingItem[]; error?: string } {
    try {
      const limit = params.limit || 20
      const orderBy = params.orderBy || 'profit'
      const order = params.order || 'DESC'

      let query = ''

      if (params.type === 'token') {
        query = `
          SELECT
            token_address,
            network,
            SUM(CAST(profit AS REAL)) as profit,
            AVG(CAST(profit_percentage AS REAL)) as profit_percentage,
            COUNT(*) as trade_count,
            SUM(CASE WHEN CAST(profit AS REAL) > 0 THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as win_rate
          FROM profit_records
          WHERE status = 'completed'
        `

        const paramsList: any[] = []

        if (params.timeRange) {
          query += ' AND sell_time >= ? AND sell_time <= ?'
          paramsList.push(params.timeRange.start, params.timeRange.end)
        }

        query += `
          GROUP BY token_address, network
          ORDER BY ${orderBy} ${order}
          LIMIT ?
        `

        paramsList.push(limit)

        const stmt = this.db.prepare(query)
        const results = stmt.all(...paramsList) as any[]

        const rankings: RankingItem[] = results.map(result => ({
          tokenAddress: result.token_address,
          tokenSymbol: undefined, // 需要从代币合约获取
          network: result.network,
          profit: result.profit?.toFixed(18) || '0',
          profitPercentage: result.profit_percentage?.toFixed(2) || '0',
          tradeCount: result.trade_count || 0,
          winRate: result.win_rate?.toFixed(2) || '0'
        }))

        return { success: true, rankings }
      } else if (params.type === 'wallet') {
        query = `
          SELECT
            wallet_id as token_address,
            network,
            SUM(CAST(profit AS REAL)) as profit,
            AVG(CAST(profit_percentage AS REAL)) as profit_percentage,
            COUNT(*) as trade_count,
            SUM(CASE WHEN CAST(profit AS REAL) > 0 THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as win_rate
          FROM profit_records
          WHERE status = 'completed' AND wallet_id IS NOT NULL
        `

        const paramsList: any[] = []

        if (params.timeRange) {
          query += ' AND sell_time >= ? AND sell_time <= ?'
          paramsList.push(params.timeRange.start, params.timeRange.end)
        }

        query += `
          GROUP BY wallet_id, network
          ORDER BY ${orderBy} ${order}
          LIMIT ?
        `

        paramsList.push(limit)

        const stmt = this.db.prepare(query)
        const results = stmt.all(...paramsList) as any[]

        const rankings: RankingItem[] = results.map(result => ({
          tokenAddress: result.wallet_id,
          tokenSymbol: result.wallet_id?.slice(0, 8),
          network: result.network,
          profit: result.profit?.toFixed(18) || '0',
          profitPercentage: result.profit_percentage?.toFixed(2) || '0',
          tradeCount: result.trade_count || 0,
          winRate: result.win_rate?.toFixed(2) || '0'
        }))

        return { success: true, rankings }
      } else {
        throw new Error('不支持的排行榜类型')
      }
    } catch (error: any) {
      console.error('获取排行榜失败:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 删除收益记录
   */
  deleteProfitRecord(recordId: string): { success: boolean; error?: string } {
    try {
      const stmt = this.db.prepare('DELETE FROM profit_records WHERE id = ?')
      const result = stmt.run(recordId)

      if (result.changes === 0) {
        throw new Error('收益记录不存在')
      }

      console.log(`收益记录已删除: ${recordId}`)

      return { success: true }
    } catch (error: any) {
      console.error('删除收益记录失败:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 清理旧数据
   */
  cleanupOldData(daysToKeep: number = 90): { success: boolean; deletedCount?: number; error?: string } {
    try {
      const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000)

      const stmt = this.db.prepare('DELETE FROM profit_records WHERE created_at < ?')
      const result = stmt.run(cutoffTime)

      console.log(`已清理 ${result.changes} 条旧收益记录`)

      return { success: true, deletedCount: result.changes }
    } catch (error: any) {
      console.error('清理旧数据失败:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 关闭数据库连接
   */
  close(): void {
    this.db.close()
  }
}

// 单例导出
export const profitAnalyzer = new ProfitAnalyzer()
