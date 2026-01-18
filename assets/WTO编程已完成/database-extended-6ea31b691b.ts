/**
 * 数据库扩展 - 发币和交易功能
 * 扩展现有数据库，添加发币任务和交易记录表
 */

import Database from 'better-sqlite3'
import path from 'path'

/**
 * 扩展的数据库类
 */
export class ExtendedDatabase {
  private db: Database.Database

  constructor(dbPath: string) {
    this.db = new Database(dbPath)
    this.initializeTables()
  }

  /**
   * 初始化新表结构
   */
  private initializeTables(): void {
    // 创建发币任务表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS launch_tasks (
        id TEXT PRIMARY KEY,
        network TEXT NOT NULL,
        token_name TEXT NOT NULL,
        token_symbol TEXT NOT NULL,
        total_supply TEXT NOT NULL,
        token_address TEXT,
        status TEXT NOT NULL,
        result TEXT,
        error TEXT,
        created_at INTEGER NOT NULL,
        completed_at INTEGER
      )
    `)

    // 创建交易记录表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        network TEXT NOT NULL,
        token_address TEXT NOT NULL,
        wallet_id TEXT,
        amount TEXT NOT NULL,
        tx_hash TEXT,
        status TEXT NOT NULL,
        gas_used TEXT,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (wallet_id) REFERENCES wallets(id)
      )
    `)

    // 创建索引
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_launch_tasks_status ON launch_tasks(status);
      CREATE INDEX IF NOT EXISTS idx_launch_tasks_network ON launch_tasks(network);
      CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
      CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
      CREATE INDEX IF NOT EXISTS idx_transactions_token_address ON transactions(token_address);
    `)
  }

  // ============== 发币任务相关操作 ==============

  /**
   * 插入发币任务
   */
  insertLaunchTask(task: {
    id: string
    network: string
    token_name: string
    token_symbol: string
    total_supply: string
    status: string
    created_at: number
  }): string {
    const stmt = this.db.prepare(`
      INSERT INTO launch_tasks (id, network, token_name, token_symbol, total_supply, status, created_at)
      VALUES (@id, @network, @token_name, @token_symbol, @total_supply, @status, @created_at)
    `)
    stmt.run(task)
    return task.id
  }

  /**
   * 更新发币任务
   */
  updateLaunchTask(
    taskId: string,
    updates: {
      token_address?: string
      status?: string
      result?: string
      error?: string
      completed_at?: number
    }
  ): boolean {
    const fields: string[] = []
    const params: any[] = []

    if (updates.token_address !== undefined) {
      fields.push('token_address = ?')
      params.push(updates.token_address)
    }
    if (updates.status !== undefined) {
      fields.push('status = ?')
      params.push(updates.status)
    }
    if (updates.result !== undefined) {
      fields.push('result = ?')
      params.push(updates.result)
    }
    if (updates.error !== undefined) {
      fields.push('error = ?')
      params.push(updates.error)
    }
    if (updates.completed_at !== undefined) {
      fields.push('completed_at = ?')
      params.push(updates.completed_at)
    }

    if (fields.length === 0) return false

    params.push(taskId)
    const stmt = this.db.prepare(`
      UPDATE launch_tasks SET ${fields.join(', ')} WHERE id = ?
    `)
    const result = stmt.run(...params)
    return result.changes > 0
  }

  /**
   * 获取发币任务
   */
  getLaunchTaskById(taskId: string): any | null {
    const stmt = this.db.prepare('SELECT * FROM launch_tasks WHERE id = ?')
    return stmt.get(taskId) || null
  }

  /**
   * 获取所有发币任务
   */
  getAllLaunchTasks(): any[] {
    const stmt = this.db.prepare(`
      SELECT * FROM launch_tasks ORDER BY created_at DESC
    `)
    return stmt.all()
  }

  /**
   * 根据状态获取发币任务
   */
  getLaunchTasksByStatus(status: string): any[] {
    const stmt = this.db.prepare(`
      SELECT * FROM launch_tasks WHERE status = ? ORDER BY created_at DESC
    `)
    return stmt.all(status)
  }

  /**
   * 删除发币任务
   */
  deleteLaunchTask(taskId: string): boolean {
    const stmt = this.db.prepare('DELETE FROM launch_tasks WHERE id = ?')
    const result = stmt.run(taskId)
    return result.changes > 0
  }

  // ============== 交易记录相关操作 ==============

  /**
   * 插入交易记录
   */
  insertTransaction(transaction: {
    id: string
    type: string
    network: string
    token_address: string
    wallet_id?: string
    amount: string
    tx_hash?: string
    status: string
    gas_used?: string
    created_at: number
  }): string {
    const stmt = this.db.prepare(`
      INSERT INTO transactions (id, type, network, token_address, wallet_id, amount, tx_hash, status, gas_used, created_at)
      VALUES (@id, @type, @network, @token_address, @wallet_id, @amount, @tx_hash, @status, @gas_used, @created_at)
    `)
    stmt.run(transaction)
    return transaction.id
  }

  /**
   * 更新交易记录
   */
  updateTransaction(
    txId: string,
    updates: {
      tx_hash?: string
      status?: string
      gas_used?: string
    }
  ): boolean {
    const fields: string[] = []
    const params: any[] = []

    if (updates.tx_hash !== undefined) {
      fields.push('tx_hash = ?')
      params.push(updates.tx_hash)
    }
    if (updates.status !== undefined) {
      fields.push('status = ?')
      params.push(updates.status)
    }
    if (updates.gas_used !== undefined) {
      fields.push('gas_used = ?')
      params.push(updates.gas_used)
    }

    if (fields.length === 0) return false

    params.push(txId)
    const stmt = this.db.prepare(`
      UPDATE transactions SET ${fields.join(', ')} WHERE id = ?
    `)
    const result = stmt.run(...params)
    return result.changes > 0
  }

  /**
   * 获取交易记录
   */
  getTransactionById(txId: string): any | null {
    const stmt = this.db.prepare('SELECT * FROM transactions WHERE id = ?')
    return stmt.get(txId) || null
  }

  /**
   * 获取所有交易记录
   */
  getAllTransactions(): any[] {
    const stmt = this.db.prepare(`
      SELECT * FROM transactions ORDER BY created_at DESC
    `)
    return stmt.all()
  }

  /**
   * 根据代币地址获取交易记录
   */
  getTransactionsByTokenAddress(tokenAddress: string): any[] {
    const stmt = this.db.prepare(`
      SELECT * FROM transactions WHERE token_address = ? ORDER BY created_at DESC
    `)
    return stmt.all(tokenAddress)
  }

  /**
   * 根据类型获取交易记录
   */
  getTransactionsByType(type: string): any[] {
    const stmt = this.db.prepare(`
      SELECT * FROM transactions WHERE type = ? ORDER BY created_at DESC
    `)
    return stmt.all(type)
  }

  /**
   * 删除交易记录
   */
  deleteTransaction(txId: string): boolean {
    const stmt = this.db.prepare('DELETE FROM transactions WHERE id = ?')
    const result = stmt.run(txId)
    return result.changes > 0
  }

  /**
   * 关闭数据库连接
   */
  close(): void {
    this.db.close()
  }
}

/**
 * 创建扩展数据库实例
 */
export const extendedDB = new ExtendedDatabase(
  path.join(process.cwd(), 'meme-master.db')
)
