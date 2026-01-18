/**
 * IPC通信处理 - 发币功能扩展
 * 处理发币和交易相关的IPC通信
 */

import { ipcMain } from 'electron'
import { LaunchManager, launchManager } from '../launch/LaunchManager'
import { bscTokenLauncher, estimateDeploymentGas } from '../launch/BSCTokenLauncher'
import { solanaTokenLauncher } from '../launch/SolanaTokenLauncher'
import { bscBundleBuyer, validateBundleBuyParams } from '../launch/BSCBundleBuyer'
import { solanaBundleBuyer, validateSolanaBundleBuyParams } from '../launch/SolanaBundleBuyer'
import { ExtendedDatabase } from '../database-extended'

// 创建数据库实例
const db = new ExtendedDatabase('meme-master.db')

/**
 * 注册发币相关IPC处理器
 */
export function registerLaunchHandlers(): void {
  console.log('Registering launch IPC handlers...')

  // ============== 发币任务管理 ==============

  /**
   * 创建发币任务
   */
  ipcMain.handle('launch:createTask', async (event, params: any) => {
    try {
      const taskId = await launchManager.createLaunchTask(params)
      return { success: true, data: { taskId } }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create launch task'
      }
    }
  })

  /**
   * 获取发币任务
   */
  ipcMain.handle('launch:getTask', async (event, taskId: string) => {
    try {
      const task = launchManager.getTask(taskId)
      return { success: true, data: task }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get task'
      }
    }
  })

  /**
   * 获取所有发币任务
   */
  ipcMain.handle('launch:getAllTasks', async () => {
    try {
      const tasks = launchManager.getAllTasks()
      return { success: true, data: tasks }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get tasks'
      }
    }
  })

  /**
   * 根据状态获取发币任务
   */
  ipcMain.handle('launch:getTasksByStatus', async (event, status: string) => {
    try {
      const tasks = launchManager.getTasksByStatus(status as any)
      return { success: true, data: tasks }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get tasks by status'
      }
    }
  })

  /**
   * 取消发币任务
   */
  ipcMain.handle('launch:cancelTask', async (event, taskId: string) => {
    try {
      const cancelled = launchManager.cancelTask(taskId)
      return { success: true, data: { cancelled } }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel task'
      }
    }
  })

  /**
   * 重试失败的任务
   */
  ipcMain.handle('launch:retryTask', async (event, taskId: string) => {
    try {
      const retried = await launchManager.retryFailedTask(taskId)
      return { success: true, data: { retried } }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retry task'
      }
    }
  })

  /**
   * 获取任务统计
   */
  ipcMain.handle('launch:getStatistics', async () => {
    try {
      const stats = launchManager.getStatistics()
      return { success: true, data: stats }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get statistics'
      }
    }
  })

  /**
   * 清理已完成的任务
   */
  ipcMain.handle('launch:clearCompleted', async () => {
    try {
      launchManager.clearCompletedTasks()
      return { success: true, data: { message: 'Completed tasks cleared' } }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to clear tasks'
      }
    }
  })

  // ============== BSC发币功能 ==============

  /**
   * BSC预估部署费用
   */
  ipcMain.handle('launch:estimateBSCGas', async (event, params: {
    rpcUrl: string
    totalSupply: string
    decimals?: number
  }) => {
    try {
      const estimate = await estimateDeploymentGas(params.rpcUrl, params.totalSupply, params.decimals)
      return { success: true, data: estimate }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to estimate gas'
      }
    }
  })

  /**
   * BSC获取代币信息
   */
  ipcMain.handle('launch:getBSCTokenInfo', async (event, params: {
    contractAddress: string
    rpcUrl: string
  }) => {
    try {
      const info = await bscTokenLauncher.getTokenInfo(params.contractAddress, params.rpcUrl)
      return { success: true, data: info }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get token info'
      }
    }
  })

  /**
   * BSC验证合约
   */
  ipcMain.handle('launch:verifyBSCContract', async (event, params: {
    contractAddress: string
    rpcUrl: string
  }) => {
    try {
      const verified = await bscTokenLauncher.verifyContract(params.contractAddress, params.rpcUrl)
      return { success: true, data: { verified } }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to verify contract'
      }
    }
  })

  // ============== Solana发币功能 ==============

  /**
   * Solana预估部署费用
   */
  ipcMain.handle('launch:estimateSolanaCost', async (event, rpcUrl: string) => {
    try {
      const estimate = await solanaTokenLauncher.estimateLaunchCost(rpcUrl)
      return { success: true, data: estimate }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to estimate cost'
      }
    }
  })

  /**
   * Solana获取代币信息
   */
  ipcMain.handle('launch:getSolanaTokenInfo', async (event, params: {
    mintAddress: string
    rpcUrl: string
  }) => {
    try {
      const info = await solanaTokenLauncher.getTokenInfo(params.mintAddress, params.rpcUrl)
      return { success: true, data: info }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get token info'
      }
    }
  })

  /**
   * Solana验证代币
   */
  ipcMain.handle('launch:verifySolanaToken', async (event, params: {
    mintAddress: string
    rpcUrl: string
  }) => {
    try {
      const verified = await solanaTokenLauncher.verifyToken(params.mintAddress, params.rpcUrl)
      return { success: true, data: { verified } }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to verify token'
      }
    }
  })

  // ============== BSC捆绑买入 ==============

  /**
   * BSC验证捆绑买入参数
   */
  ipcMain.handle('launch:validateBSCBundleParams', async (event, params: any) => {
    try {
      const validation = validateBundleBuyParams(params)
      return { success: true, data: validation }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to validate params'
      }
    }
  })

  /**
   * BSC预估捆绑买入Gas费用
   */
  ipcMain.handle('launch:estimateBSCBundleGas', async (event, params: any) => {
    try {
      const estimate = await bscBundleBuyer.estimateGasCost(params)
      return { success: true, data: estimate }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to estimate gas'
      }
    }
  })

  /**
   * BSC执行捆绑买入
   */
  ipcMain.handle('launch:executeBSCBundleBuy', async (event, params: any) => {
    try {
      const batchId = `bsc_bundle_${Date.now()}`
      // 异步执行，不阻塞
      bscBundleBuyer.executeBundleBuy(params)
        .then(result => {
          console.log('BSC bundle buy completed:', result)
        })
        .catch(error => {
          console.error('BSC bundle buy failed:', error)
        })

      return { success: true, data: { batchId, status: 'started' } }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to execute bundle buy'
      }
    }
  })

  /**
   * 获取BSC捆绑状态
   */
  ipcMain.handle('launch:getBSCBundleStatus', async (event, batchId: string) => {
    try {
      const status = bscBundleBuyer.getBundleStatus(batchId)
      return { success: true, data: status }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get bundle status'
      }
    }
  })

  /**
   * 取消BSC捆绑
   */
  ipcMain.handle('launch:cancelBSCBundle', async (event, batchId: string) => {
    try {
      const cancelled = bscBundleBuyer.cancelBundle(batchId)
      return { success: true, data: { cancelled } }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel bundle'
      }
    }
  })

  // ============== Solana捆绑买入 ==============

  /**
   * Solana验证捆绑买入参数
   */
  ipcMain.handle('launch:validateSolanaBundleParams', async (event, params: any) => {
    try {
      const validation = validateSolanaBundleBuyParams(params)
      return { success: true, data: validation }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to validate params'
      }
    }
  })

  /**
   * Solana预估捆绑买入费用
   */
  ipcMain.handle('launch:estimateSolanaBundleCost', async (event, params: any) => {
    try {
      const estimate = await solanaBundleBuyer.estimateBundleCost(params)
      return { success: true, data: estimate }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to estimate cost'
      }
    }
  })

  /**
   * Solana执行捆绑买入
   */
  ipcMain.handle('launch:executeSolanaBundleBuy', async (event, params: any) => {
    try {
      const batchId = `solana_bundle_${Date.now()}`
      // 异步执行，不阻塞
      solanaBundleBuyer.executeBundleBuy(params)
        .then(result => {
          console.log('Solana bundle buy completed:', result)
        })
        .catch(error => {
          console.error('Solana bundle buy failed:', error)
        })

      return { success: true, data: { batchId, status: 'started' } }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to execute bundle buy'
      }
    }
  })

  /**
   * 获取Solana捆绑状态
   */
  ipcMain.handle('launch:getSolanaBundleStatus', async (event, batchId: string) => {
    try {
      const status = solanaBundleBuyer.getBundleStatus(batchId)
      return { success: true, data: status }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get bundle status'
      }
    }
  })

  /**
   * 取消Solana捆绑
   */
  ipcMain.handle('launch:cancelSolanaBundle', async (event, batchId: string) => {
    try {
      const cancelled = solanaBundleBuyer.cancelBundle(batchId)
      return { success: true, data: { cancelled } }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel bundle'
      }
    }
  })

  // ============== 交易记录 ==============

  /**
   * 获取交易记录
   */
  ipcMain.handle('launch:getTransactions', async (event, options?: {
    type?: string
    tokenAddress?: string
    limit?: number
    offset?: number
  }) => {
    try {
      let transactions = db.getAllTransactions()

      // 过滤
      if (options?.type) {
        transactions = transactions.filter(tx => tx.type === options.type)
      }
      if (options?.tokenAddress) {
        transactions = transactions.filter(tx => tx.token_address === options.tokenAddress)
      }

      // 分页
      const limit = options?.limit || 50
      const offset = options?.offset || 0
      const paginated = transactions.slice(offset, offset + limit)

      return {
        success: true,
        data: {
          transactions: paginated,
          total: transactions.length,
          limit,
          offset
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get transactions'
      }
    }
  })

  /**
   * 根据代币地址获取交易记录
   */
  ipcMain.handle('launch:getTransactionsByToken', async (event, tokenAddress: string) => {
    try {
      const transactions = db.getTransactionsByTokenAddress(tokenAddress)
      return { success: true, data: transactions }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get transactions'
      }
    }
  })

  /**
   * 根据类型获取交易记录
   */
  ipcMain.handle('launch:getTransactionsByType', async (event, type: string) => {
    try {
      const transactions = db.getTransactionsByType(type)
      return { success: true, data: transactions }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get transactions'
      }
    }
  })

  console.log('Launch IPC handlers registered successfully')
}

/**
 * 发送任务更新到渲染进程
 */
export function sendTaskUpdateToRenderer(webContents: Electron.WebContents, task: any): void {
  webContents.send('launch:taskUpdate', task)
}

/**
 * 发送捆绑买入更新到渲染进程
 */
export function sendBundleUpdateToRenderer(
  webContents: Electron.WebContents,
  network: 'BSC' | 'Solana',
  batchId: string,
  update: any
): void {
  webContents.send('launch:bundleUpdate', { network, batchId, update })
}

// 导出初始化函数
export async function initializeLaunchIpcHandlers(): Promise<void> {
  registerLaunchHandlers()
  console.log('Launch IPC handlers initialized')
}
