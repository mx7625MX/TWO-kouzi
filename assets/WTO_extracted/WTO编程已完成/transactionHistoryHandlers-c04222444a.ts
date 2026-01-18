/**
 * 交易历史 IPC 处理器
 * 处理交易历史查询、筛选、导出等操作
 */

import { ipcMain } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { app } from 'electron'
import { ExtendedDatabase } from '../database-extended'

/**
 * 交易历史查询参数
 */
export interface TransactionHistoryQuery {
  startDate?: number      // 开始时间（时间戳）
  endDate?: number        // 结束时间（时间戳）
  type?: string          // 交易类型
  network?: string       // 网络（BSC/Solana）
  tokenAddress?: string  // 代币地址
  walletId?: string      // 钱包ID
  status?: string        // 交易状态
  limit?: number         // 限制数量
  offset?: number        // 偏移量
}

/**
 * 交易历史统计
 */
export interface TransactionHistoryStats {
  totalTransactions: number      // 总交易数
  totalAmount: string            // 总金额
  successfulTransactions: number // 成功交易数
  failedTransactions: number     // 失败交易数
  pendingTransactions: number    // 待处理交易数
  averageAmount: string          // 平均金额
}

/**
 * 注册交易历史处理器
 */
export function registerTransactionHistoryHandlers(): void {
  const userDataPath = app.getPath('userData')
  const dbPath = path.join(userDataPath, 'wallets.db')
  const db = new ExtendedDatabase(dbPath)

  // 获取交易历史
  ipcMain.handle('transactions:get-history', async (_event, query: TransactionHistoryQuery) => {
    try {
      const transactions = await getTransactionHistory(db, query)
      return { success: true, data: transactions }
    } catch (error: any) {
      console.error('获取交易历史失败:', error)
      return { success: false, error: error.message }
    }
  })

  // 获取交易统计
  ipcMain.handle('transactions:get-stats', async (_event, query?: TransactionHistoryQuery) => {
    try {
      const stats = await getTransactionStats(db, query)
      return { success: true, data: stats }
    } catch (error: any) {
      console.error('获取交易统计失败:', error)
      return { success: false, error: error.message }
    }
  })

  // 导出交易历史
  ipcMain.handle('transactions:export', async (_event, options: {
    query: TransactionHistoryQuery
    format: 'csv' | 'json' | 'excel'
    savePath: string
  }) => {
    try {
      const transactions = await getTransactionHistory(db, options.query)
      const filePath = await exportTransactionHistory(
        transactions,
        options.format,
        options.savePath
      )
      return { success: true, filePath }
    } catch (error: any) {
      console.error('导出交易历史失败:', error)
      return { success: false, error: error.message }
    }
  })

  // 删除交易记录
  ipcMain.handle('transactions:delete', async (_event, transactionId: string) => {
    try {
      const result = deleteTransaction(db, transactionId)
      return { success: true, deleted: result }
    } catch (error: any) {
      console.error('删除交易记录失败:', error)
      return { success: false, error: error.message }
    }
  })

  // 批量删除交易记录
  ipcMain.handle('transactions:delete-batch', async (_event, transactionIds: string[]) => {
    try {
      const result = deleteTransactionsBatch(db, transactionIds)
      return { success: true, deleted: result }
    } catch (error: any) {
      console.error('批量删除交易记录失败:', error)
      return { success: false, error: error.message }
    }
  })

  console.log('交易历史处理器注册成功')
}

/**
 * 注销交易历史处理器
 */
export function unregisterTransactionHistoryHandlers(): void {
  const channels = [
    'transactions:get-history',
    'transactions:get-stats',
    'transactions:export',
    'transactions:delete',
    'transactions:delete-batch'
  ]

  channels.forEach(channel => {
    ipcMain.removeAllListeners(channel)
  })

  console.log('交易历史处理器注销成功')
}

/**
 * 获取交易历史
 */
async function getTransactionHistory(
  db: ExtendedDatabase,
  query: TransactionHistoryQuery
): Promise<any[]> {
  const conditions: string[] = []
  const params: any[] = []

  // 构建查询条件
  if (query.startDate) {
    conditions.push('created_at >= ?')
    params.push(query.startDate)
  }
  if (query.endDate) {
    conditions.push('created_at <= ?')
    params.push(query.endDate)
  }
  if (query.type) {
    conditions.push('type = ?')
    params.push(query.type)
  }
  if (query.network) {
    conditions.push('network = ?')
    params.push(query.network)
  }
  if (query.tokenAddress) {
    conditions.push('token_address = ?')
    params.push(query.tokenAddress)
  }
  if (query.walletId) {
    conditions.push('wallet_id = ?')
    params.push(query.walletId)
  }
  if (query.status) {
    conditions.push('status = ?')
    params.push(query.status)
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  // 获取交易记录
  const sql = `
    SELECT * FROM transactions
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `

  const limit = query.limit || 100
  const offset = query.offset || 0

  // 注意：这里需要直接访问 db 对象的私有属性，或者修改 ExtendedDatabase 类提供访问方法
  // 为了简化，我们假设 ExtendedDatabase 提供了 executeQuery 方法
  const stmt = (db as any).db?.prepare(sql)
  if (!stmt) {
    throw new Error('数据库访问失败')
  }

  const transactions = stmt.all(...params, limit, offset)
  return transactions
}

/**
 * 获取交易统计
 */
async function getTransactionStats(
  db: ExtendedDatabase,
  query?: TransactionHistoryQuery
): Promise<TransactionHistoryStats> {
  const conditions: string[] = []
  const params: any[] = []

  // 构建查询条件
  if (query) {
    if (query.startDate) {
      conditions.push('created_at >= ?')
      params.push(query.startDate)
    }
    if (query.endDate) {
      conditions.push('created_at <= ?')
      params.push(query.endDate)
    }
    if (query.type) {
      conditions.push('type = ?')
      params.push(query.type)
    }
    if (query.network) {
      conditions.push('network = ?')
      params.push(query.network)
    }
    if (query.tokenAddress) {
      conditions.push('token_address = ?')
      params.push(query.tokenAddress)
    }
    if (query.walletId) {
      conditions.push('wallet_id = ?')
      params.push(query.walletId)
    }
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  // 获取统计数据
  const dbClient = (db as any).db
  if (!dbClient) {
    throw new Error('数据库访问失败')
  }

  // 总交易数
  const totalStmt = dbClient.prepare(`SELECT COUNT(*) as count FROM transactions ${whereClause}`)
  const totalResult = totalStmt.get(...params) as { count: number }
  const totalTransactions = totalResult.count

  // 总金额
  const amountStmt = dbClient.prepare(`SELECT SUM(amount) as total FROM transactions ${whereClause}`)
  const amountResult = amountStmt.get(...params) as { total: string | null }
  const totalAmount = amountResult.total || '0'

  // 成功交易数
  const successConditions = [...conditions, 'status = ?']
  const successParams = [...params, 'success']
  const successWhereClause = successConditions.length > 0 ? `WHERE ${successConditions.join(' AND ')}` : ''
  const successStmt = dbClient.prepare(`SELECT COUNT(*) as count FROM transactions ${successWhereClause}`)
  const successResult = successStmt.get(...successParams) as { count: number }
  const successfulTransactions = successResult.count

  // 失败交易数
  const failedConditions = [...conditions, 'status = ?']
  const failedParams = [...params, 'failed']
  const failedWhereClause = failedConditions.length > 0 ? `WHERE ${failedConditions.join(' AND ')}` : ''
  const failedStmt = dbClient.prepare(`SELECT COUNT(*) as count FROM transactions ${failedWhereClause}`)
  const failedResult = failedStmt.get(...failedParams) as { count: number }
  const failedTransactions = failedResult.count

  // 待处理交易数
  const pendingConditions = [...conditions, 'status = ?']
  const pendingParams = [...params, 'pending']
  const pendingWhereClause = pendingConditions.length > 0 ? `WHERE ${pendingConditions.join(' AND ')}` : ''
  const pendingStmt = dbClient.prepare(`SELECT COUNT(*) as count FROM transactions ${pendingWhereClause}`)
  const pendingResult = pendingStmt.get(...pendingParams) as { count: number }
  const pendingTransactions = pendingResult.count

  // 平均金额
  const avgAmount = totalTransactions > 0
    ? (parseFloat(totalAmount) / totalTransactions).toFixed(6)
    : '0'

  return {
    totalTransactions,
    totalAmount,
    successfulTransactions,
    failedTransactions,
    pendingTransactions,
    averageAmount: avgAmount
  }
}

/**
 * 导出交易历史
 */
async function exportTransactionHistory(
  transactions: any[],
  format: 'csv' | 'json' | 'excel',
  savePath: string
): Promise<string> {
  let content: string
  let fileName: string

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')

  if (format === 'json') {
    fileName = `transactions-${timestamp}.json`
    content = JSON.stringify(transactions, null, 2)
  } else if (format === 'csv') {
    fileName = `transactions-${timestamp}.csv`
    content = convertToCSV(transactions)
  } else if (format === 'excel') {
    // 对于 Excel，我们暂时导出为 CSV 格式，实际项目中可以使用 exceljs 库
    fileName = `transactions-${timestamp}.csv`
    content = convertToCSV(transactions)
  } else {
    throw new Error('不支持的导出格式')
  }

  const filePath = path.join(savePath, fileName)
  fs.writeFileSync(filePath, content, 'utf-8')

  return filePath
}

/**
 * 转换为 CSV 格式
 */
function convertToCSV(transactions: any[]): string {
  if (transactions.length === 0) {
    return ''
  }

  const headers = Object.keys(transactions[0])
  const csvRows = [headers.join(',')]

  for (const transaction of transactions) {
    const values = headers.map(header => {
      let value = transaction[header]

      // 处理时间戳
      if (header === 'created_at' && value) {
        value = new Date(value).toLocaleString()
      }

      // 转义包含逗号的值
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        value = `"${value.replace(/"/g, '""')}"`
      }

      return value || ''
    })

    csvRows.push(values.join(','))
  }

  return csvRows.join('\n')
}

/**
 * 删除交易记录
 */
function deleteTransaction(db: ExtendedDatabase, transactionId: string): boolean {
  const dbClient = (db as any).db
  if (!dbClient) {
    throw new Error('数据库访问失败')
  }

  const stmt = dbClient.prepare('DELETE FROM transactions WHERE id = ?')
  const result = stmt.run(transactionId)
  return result.changes > 0
}

/**
 * 批量删除交易记录
 */
function deleteTransactionsBatch(db: ExtendedDatabase, transactionIds: string[]): number {
  const dbClient = (db as any).db
  if (!dbClient) {
    throw new Error('数据库访问失败')
  }

  const stmt = dbClient.prepare('DELETE FROM transactions WHERE id = ?')
  let deletedCount = 0

  for (const id of transactionIds) {
    const result = stmt.run(id)
    if (result.changes > 0) {
      deletedCount++
    }
  }

  return deletedCount
}
