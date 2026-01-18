/**
 * 数据导出/导入 IPC 处理器
 * 处理数据的导出、导入、备份、恢复等操作
 */

import { ipcMain, dialog } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { app } from 'electron'
import { promisify } from 'util'

const writeFile = promisify(fs.writeFile)
const readFile = promisify(fs.readFile)
const copyFile = promisify(fs.copyFile)

/**
 * 导出格式
 */
export type ExportFormat = 'json' | 'csv'

/**
 * 导出数据类型
 */
export type ExportDataType =
  | 'wallets'
  | 'transactions'
  | 'launch-tasks'
  | 'all'

/**
 * 备份配置
 */
interface BackupConfig {
  includeWallets: boolean
  includeTransactions: boolean
  includeTasks: boolean
  includeSettings: boolean
  encrypt?: boolean
}

/**
 * 注册数据导出/导入处理器
 */
export function registerDataExportHandlers(): void {
  const userDataPath = app.getPath('userData')

  // 导出数据
  ipcMain.handle('data:export', async (_event, options: {
    dataType: ExportDataType
    format: ExportFormat
    savePath?: string
  }) => {
    try {
      let filePath: string
      let data: any

      if (options.savePath) {
        filePath = options.savePath
      } else {
        const result = await dialog.showSaveDialog({
          title: '导出数据',
          defaultPath: `${options.dataType}-export-${Date.now()}.${options.format}`,
          filters: [
            { name: 'JSON 文件', extensions: ['json'] },
            { name: 'CSV 文件', extensions: ['csv'] }
          ]
        })

        if (result.canceled || !result.filePath) {
          return { success: false, canceled: true }
        }

        filePath = result.filePath
      }

      // 根据类型获取数据
      switch (options.dataType) {
        case 'wallets':
          data = await exportWallets()
          break
        case 'transactions':
          data = await exportTransactions()
          break
        case 'launch-tasks':
          data = await exportLaunchTasks()
          break
        case 'all':
          data = await exportAllData()
          break
        default:
          throw new Error(`不支持的导出类型: ${options.dataType}`)
      }

      // 格式化并保存
      if (options.format === 'json') {
        await writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8')
      } else if (options.format === 'csv') {
        const csvContent = convertToCSV(data)
        await writeFile(filePath, csvContent, 'utf-8')
      }

      return { success: true, filePath, dataType: options.dataType }
    } catch (error: any) {
      console.error('导出数据失败:', error)
      return { success: false, error: error.message }
    }
  })

  // 导入数据
  ipcMain.handle('data:import', async (_event, filePath: string) => {
    try {
      const content = await readFile(filePath, 'utf-8')
      const ext = path.extname(filePath).toLowerCase()

      if (ext === '.json') {
        const data = JSON.parse(content)
        const result = await importJSONData(data)
        return { success: true, result }
      } else if (ext === '.csv') {
        const result = await importCSVData(content)
        return { success: true, result }
      } else {
        throw new Error('不支持的文件格式')
      }
    } catch (error: any) {
      console.error('导入数据失败:', error)
      return { success: false, error: error.message }
    }
  })

  // 备份数据
  ipcMain.handle('data:backup', async (_event, config?: BackupConfig) => {
    try {
      const backupConfig: BackupConfig = config || {
        includeWallets: true,
        includeTransactions: true,
        includeTasks: true,
        includeSettings: true,
        encrypt: false
      }

      const result = await dialog.showSaveDialog({
        title: '备份数据',
        defaultPath: `meme-master-pro-backup-${Date.now()}.json`,
        filters: [
          { name: '备份文件', extensions: ['json'] }
        ]
      })

      if (result.canceled || !result.filePath) {
        return { success: false, canceled: true }
      }

      const backupData = await createBackup(backupConfig)
      await writeFile(result.filePath, JSON.stringify(backupData, null, 2), 'utf-8')

      return { success: true, filePath: result.filePath }
    } catch (error: any) {
      console.error('备份数据失败:', error)
      return { success: false, error: error.message }
    }
  })

  // 恢复数据
  ipcMain.handle('data:restore', async (_event, filePath: string) => {
    try {
      const content = await readFile(filePath, 'utf-8')
      const backupData = JSON.parse(content)

      // 验证备份格式
      if (!backupData.version || !backupData.backupDate) {
        throw new Error('无效的备份文件格式')
      }

      const result = await restoreBackup(backupData)
      return { success: true, result }
    } catch (error: any) {
      console.error('恢复数据失败:', error)
      return { success: false, error: error.message }
    }
  })

  // 选择文件
  ipcMain.handle('dialog:open-file', async (_event, options?: {
    filters?: Array<{ name: string; extensions: string[] }>
    title?: string
  }) => {
    try {
      const result = await dialog.showOpenDialog({
        title: options?.title || '选择文件',
        filters: options?.filters || [
          { name: '所有文件', extensions: ['*'] }
        ],
        properties: ['openFile']
      })

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, canceled: true }
      }

      return { success: true, filePath: result.filePaths[0] }
    } catch (error: any) {
      console.error('选择文件失败:', error)
      return { success: false, error: error.message }
    }
  })

  // 保存文件
  ipcMain.handle('dialog:save-file', async (_event, options?: {
    filters?: Array<{ name: string; extensions: string[] }>
    title?: string
    defaultPath?: string
  }) => {
    try {
      const result = await dialog.showSaveDialog({
        title: options?.title || '保存文件',
        defaultPath: options?.defaultPath,
        filters: options?.filters || [
          { name: '所有文件', extensions: ['*'] }
        ]
      })

      if (result.canceled || !result.filePath) {
        return { success: false, canceled: true }
      }

      return { success: true, filePath: result.filePath }
    } catch (error: any) {
      console.error('保存文件失败:', error)
      return { success: false, error: error.message }
    }
  })

  console.log('数据导出/导入处理器注册成功')
}

/**
 * 注销数据导出/导入处理器
 */
export function unregisterDataExportHandlers(): void {
  const channels = [
    'data:export',
    'data:import',
    'data:backup',
    'data:restore',
    'dialog:open-file',
    'dialog:save-file'
  ]

  channels.forEach(channel => {
    ipcMain.removeAllListeners(channel)
  })

  console.log('数据导出/导入处理器注销成功')
}

/**
 * 导出钱包数据
 */
async function exportWallets(): Promise<any[]> {
  // 这里需要从数据库获取钱包数据
  // 暂时返回空数组
  return []
}

/**
 * 导出交易数据
 */
async function exportTransactions(): Promise<any[]> {
  // 这里需要从数据库获取交易数据
  // 暂时返回空数组
  return []
}

/**
 * 导出发币任务数据
 */
async function exportLaunchTasks(): Promise<any[]> {
  // 这里需要从数据库获取发币任务数据
  // 暂时返回空数组
  return []
}

/**
 * 导出所有数据
 */
async function exportAllData(): Promise<any> {
  return {
    wallets: await exportWallets(),
    transactions: await exportTransactions(),
    launchTasks: await exportLaunchTasks(),
    exportDate: new Date().toISOString()
  }
}

/**
 * 导入 JSON 数据
 */
async function importJSONData(data: any): Promise<any> {
  const result = {
    wallets: 0,
    transactions: 0,
    launchTasks: 0
  }

  // 导入钱包
  if (data.wallets && Array.isArray(data.wallets)) {
    // 这里需要将钱包数据插入数据库
    result.wallets = data.wallets.length
  }

  // 导入交易
  if (data.transactions && Array.isArray(data.transactions)) {
    // 这里需要将交易数据插入数据库
    result.transactions = data.transactions.length
  }

  // 导入任务
  if (data.launchTasks && Array.isArray(data.launchTasks)) {
    // 这里需要将任务数据插入数据库
    result.launchTasks = data.launchTasks.length
  }

  return result
}

/**
 * 导入 CSV 数据
 */
async function importCSVData(content: string): Promise<any> {
  const lines = content.split('\n').filter(line => line.trim())
  if (lines.length === 0) {
    return { imported: 0 }
  }

  const headers = lines[0].split(',')
  const data = []

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',')
    const row: any = {}

    headers.forEach((header, index) => {
      let value = values[index] || ''
      // 去除引号
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1)
      }
      row[header.trim()] = value.trim()
    })

    data.push(row)
  }

  return await importJSONData(data)
}

/**
 * 转换为 CSV 格式
 */
function convertToCSV(data: any[]): string {
  if (!Array.isArray(data) || data.length === 0) {
    return ''
  }

  const headers = Object.keys(data[0])
  const csvRows = [headers.join(',')]

  for (const row of data) {
    const values = headers.map(header => {
      let value = row[header]

      // 处理时间戳
      if (header === 'created_at' || header === 'updated_at') {
        if (value && typeof value === 'number') {
          value = new Date(value).toISOString()
        }
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
 * 创建备份
 */
async function createBackup(config: BackupConfig): Promise<any> {
  const backupData: any = {
    version: '2.2.0',
    backupDate: new Date().toISOString(),
    data: {}
  }

  if (config.includeWallets) {
    backupData.data.wallets = await exportWallets()
  }

  if (config.includeTransactions) {
    backupData.data.transactions = await exportTransactions()
  }

  if (config.includeTasks) {
    backupData.data.launchTasks = await exportLaunchTasks()
  }

  if (config.includeSettings) {
    // 这里需要导出设置
    backupData.data.settings = {}
  }

  return backupData
}

/**
 * 恢复备份
 */
async function restoreBackup(backupData: any): Promise<any> {
  const result = {
    wallets: 0,
    transactions: 0,
    launchTasks: 0,
    settings: 0
  }

  if (!backupData.data) {
    return result
  }

  // 恢复钱包
  if (backupData.data.wallets) {
    const walletResult = await importJSONData({ wallets: backupData.data.wallets })
    result.wallets = walletResult.wallets
  }

  // 恢复交易
  if (backupData.data.transactions) {
    const transactionResult = await importJSONData({ transactions: backupData.data.transactions })
    result.transactions = transactionResult.transactions
  }

  // 恢复任务
  if (backupData.data.launchTasks) {
    const taskResult = await importJSONData({ launchTasks: backupData.data.launchTasks })
    result.launchTasks = taskResult.launchTasks
  }

  // 恢复设置
  if (backupData.data.settings) {
    // 这里需要恢复设置
    result.settings = Object.keys(backupData.data.settings).length
  }

  return result
}
