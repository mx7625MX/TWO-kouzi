import Database from 'better-sqlite3'
import path from 'path'
import { app } from 'electron'
import type { Wallet, CreateWalletInput } from '../shared/types'

/**
 * 钱包数据库管理类
 */
class WalletDatabase {
  private db: Database.Database | null = null
  private dbPath: string

  constructor() {
    // 数据库文件路径：存储在用户数据目录
    const userDataPath = app.getPath('userData')
    this.dbPath = path.join(userDataPath, 'wallets.db')
  }

  /**
   * 初始化数据库连接
   */
  initialize(): void {
    try {
      this.db = new Database(this.dbPath)
      this.db.pragma('journal_mode = WAL') // 使用WAL模式提高性能
      this.createTables()
      console.log('数据库初始化成功:', this.dbPath)
    } catch (error) {
      console.error('数据库初始化失败:', error)
      throw error
    }
  }

  /**
   * 创建钱包表
   */
  private createTables(): void {
    if (!this.db) throw new Error('数据库未初始化')

    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS wallets (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        address TEXT NOT NULL,
        network TEXT NOT NULL,
        encrypted_key TEXT NOT NULL,
        created_at INTEGER NOT NULL
      )
    `

    try {
      this.db.exec(createTableSQL)
      
      // 创建索引以提高查询性能
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_network ON wallets(network)')
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_address ON wallets(address)')
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_created_at ON wallets(created_at)')
      
      console.log('钱包表创建成功')
    } catch (error) {
      console.error('创建表失败:', error)
      throw error
    }
  }

  /**
   * 插入新钱包
   * @param wallet 钱包数据
   * @returns 插入的钱包ID
   */
  insertWallet(wallet: CreateWalletInput): string {
    if (!this.db) throw new Error('数据库未初始化')

    const id = `wallet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const created_at = Date.now()

    const insertSQL = `
      INSERT INTO wallets (id, name, address, network, encrypted_key, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `

    try {
      const stmt = this.db.prepare(insertSQL)
      stmt.run(id, wallet.name, wallet.address, wallet.network, wallet.encrypted_key, created_at)
      console.log('钱包插入成功:', id)
      return id
    } catch (error: any) {
      if (error.message?.includes('UNIQUE constraint failed')) {
        throw new Error('钱包地址已存在')
      }
      console.error('插入钱包失败:', error)
      throw new Error(`插入钱包失败: ${error.message}`)
    }
  }

  /**
   * 查询所有钱包
   * @returns 钱包列表
   */
  getAllWallets(): Wallet[] {
    if (!this.db) throw new Error('数据库未初始化')

    const selectSQL = 'SELECT * FROM wallets ORDER BY created_at DESC'

    try {
      const stmt = this.db.prepare(selectSQL)
      const wallets = stmt.all() as Wallet[]
      return wallets
    } catch (error) {
      console.error('查询钱包列表失败:', error)
      throw new Error('查询钱包列表失败')
    }
  }

  /**
   * 根据ID查询钱包
   * @param id 钱包ID
   * @returns 钱包数据或null
   */
  getWalletById(id: string): Wallet | null {
    if (!this.db) throw new Error('数据库未初始化')

    const selectSQL = 'SELECT * FROM wallets WHERE id = ?'

    try {
      const stmt = this.db.prepare(selectSQL)
      const wallet = stmt.get(id) as Wallet | undefined
      return wallet || null
    } catch (error) {
      console.error('查询钱包失败:', error)
      throw new Error('查询钱包失败')
    }
  }

  /**
   * 根据地址查询钱包
   * @param address 钱包地址
   * @returns 钱包数据或null
   */
  getWalletByAddress(address: string): Wallet | null {
    if (!this.db) throw new Error('数据库未初始化')

    const selectSQL = 'SELECT * FROM wallets WHERE address = ?'

    try {
      const stmt = this.db.prepare(selectSQL)
      const wallet = stmt.get(address) as Wallet | undefined
      return wallet || null
    } catch (error) {
      console.error('查询钱包失败:', error)
      throw new Error('查询钱包失败')
    }
  }

  /**
   * 根据网络查询钱包
   * @param network 网络类型
   * @returns 钱包列表
   */
  getWalletsByNetwork(network: 'BSC' | 'Solana'): Wallet[] {
    if (!this.db) throw new Error('数据库未初始化')

    const selectSQL = 'SELECT * FROM wallets WHERE network = ? ORDER BY created_at DESC'

    try {
      const stmt = this.db.prepare(selectSQL)
      const wallets = stmt.all(network) as Wallet[]
      return wallets
    } catch (error) {
      console.error('查询钱包列表失败:', error)
      throw new Error('查询钱包列表失败')
    }
  }

  /**
   * 更新钱包名称
   * @param id 钱包ID
   * @param name 新名称
   * @returns 是否更新成功
   */
  updateWalletName(id: string, name: string): boolean {
    if (!this.db) throw new Error('数据库未初始化')

    const updateSQL = 'UPDATE wallets SET name = ? WHERE id = ?'

    try {
      const stmt = this.db.prepare(updateSQL)
      const result = stmt.run(name, id)
      return result.changes > 0
    } catch (error) {
      console.error('更新钱包名称失败:', error)
      throw new Error('更新钱包名称失败')
    }
  }

  /**
   * 删除钱包
   * @param id 钱包ID
   * @returns 是否删除成功
   */
  deleteWallet(id: string): boolean {
    if (!this.db) throw new Error('数据库未初始化')

    const deleteSQL = 'DELETE FROM wallets WHERE id = ?'

    try {
      const stmt = this.db.prepare(deleteSQL)
      const result = stmt.run(id)
      return result.changes > 0
    } catch (error) {
      console.error('删除钱包失败:', error)
      throw new Error('删除钱包失败')
    }
  }

  /**
   * 获取钱包总数
   * @returns 钱包总数
   */
  getWalletCount(): number {
    if (!this.db) throw new Error('数据库未初始化')

    const countSQL = 'SELECT COUNT(*) as count FROM wallets'

    try {
      const stmt = this.db.prepare(countSQL)
      const result = stmt.get() as { count: number }
      return result.count
    } catch (error) {
      console.error('获取钱包总数失败:', error)
      throw new Error('获取钱包总数失败')
    }
  }

  /**
   * 清空所有钱包数据
   * @returns 是否清空成功
   */
  clearAllWallets(): boolean {
    if (!this.db) throw new Error('数据库未初始化')

    const deleteSQL = 'DELETE FROM wallets'

    try {
      const stmt = this.db.prepare(deleteSQL)
      stmt.run()
      return true
    } catch (error) {
      console.error('清空钱包数据失败:', error)
      throw new Error('清空钱包数据失败')
    }
  }

  /**
   * 关闭数据库连接
   */
  close(): void {
    if (this.db) {
      this.db.close()
      this.db = null
      console.log('数据库连接已关闭')
    }
  }
}

// 导出单例实例
export const walletDB = new WalletDatabase()
