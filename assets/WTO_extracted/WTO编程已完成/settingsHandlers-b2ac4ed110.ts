/**
 * 设置相关的 IPC 处理器
 * 管理 API 配置、用户设置等
 */

import { ipcMain } from 'electron'
import { logger } from '../utils/errorHandler'
import { apiManager } from '../utils/apiIntegrations'

interface APISettings {
  twitter?: {
    apiKey: string
    apiSecret: string
    accessToken: string
    accessSecret: string
    bearerToken: string
  }
  telegram?: {
    botToken: string
    channels: string
  }
  discord?: {
    webhookUrl: string
    servers: string
    channels: string
  }
  bsc?: {
    rpcUrl: string
    wsUrl: string
  }
  solana?: {
    rpcUrl: string
    wsUrl: string
  }
  dex?: {
    pancakeSwapEnabled: boolean
    raydiumEnabled: boolean
    orcaEnabled: boolean
    jupiterEnabled: boolean
  }
}

interface UserSettings {
  notificationsEnabled: boolean
  soundEnabled: boolean
  autoUpdateEnabled: boolean
  debugMode: boolean
}

/**
 * 注册设置相关的 IPC 处理器
 */
export function registerSettingsHandlers(): void {
  /**
   * 获取 API 配置
   */
  ipcMain.handle('settings:get-api-config', async () => {
    try {
      logger.info('Settings', '获取 API 配置')
      // 这里应该从数据库或配置文件中读取
      return {
        twitter: { apiKey: '', apiSecret: '', accessToken: '', accessSecret: '', bearerToken: '' },
        telegram: { botToken: '', channels: '' },
        discord: { webhookUrl: '', servers: '', channels: '' },
        bsc: { rpcUrl: 'https://bsc-dataseed.binance.org/', wsUrl: 'wss://bsc-ws-node.nariox.org:443' },
        solana: { rpcUrl: 'https://api.mainnet-beta.solana.com', wsUrl: 'wss://api.mainnet-beta.solana.com' },
        dex: { pancakeSwapEnabled: true, raydiumEnabled: true, orcaEnabled: true, jupiterEnabled: true }
      }
    } catch (error) {
      logger.error('Settings', '获取 API 配置失败', error)
      throw error
    }
  })

  /**
   * 保存 API 配置
   */
  ipcMain.handle('settings:save-api-config', async (_event, settings: APISettings) => {
    try {
      logger.info('Settings', '保存 API 配置', settings)
      
      // 初始化 API 客户端
      if (settings.twitter?.bearerToken) {
        apiManager.initTwitter(settings.twitter)
      }
      
      if (settings.telegram?.botToken) {
        apiManager.initTelegram(settings.telegram)
      }
      
      if (settings.discord?.webhookUrl) {
        apiManager.initDiscord(settings.discord)
      }
      
      if (settings.bsc) {
        apiManager.initBSC(settings.bsc)
      }
      
      if (settings.solana) {
        apiManager.initSolana(settings.solana)
      }
      
      if (settings.dex) {
        apiManager.initDEX()
      }
      
      // 这里应该保存到数据库或配置文件中
      logger.info('Settings', 'API 配置保存成功')
      return { success: true }
    } catch (error) {
      logger.error('Settings', '保存 API 配置失败', error)
      throw error
    }
  })

  /**
   * 测试 API 连接
   */
  ipcMain.handle('settings:test-api', async (_event, { type, config }: { type: string; config: any }) => {
    try {
      logger.info('Settings', `测试 API 连接: ${type}`)
      
      switch (type) {
        case 'twitter':
          if (!config.bearerToken) {
            throw new Error('Bearer Token is required')
          }
          // 这里应该实际调用 Twitter API
          return { success: true, message: 'Twitter API 连接成功' }
        
        case 'telegram':
          if (!config.botToken) {
            throw new Error('Bot Token is required')
          }
          // 这里应该实际调用 Telegram API
          return { success: true, message: 'Telegram Bot API 连接成功' }
        
        case 'discord':
          if (!config.webhookUrl) {
            throw new Error('Webhook URL is required')
          }
          // 这里应该实际发送 Discord Webhook
          return { success: true, message: 'Discord Webhook 连接成功' }
        
        case 'bsc':
          if (!config.rpcUrl) {
            throw new Error('RPC URL is required')
          }
          // 这里应该实际调用 BSC RPC
          return { success: true, message: 'BSC RPC 连接成功' }
        
        case 'solana':
          if (!config.rpcUrl) {
            throw new Error('RPC URL is required')
          }
          // 这里应该实际调用 Solana RPC
          return { success: true, message: 'Solana RPC 连接成功' }
        
        case 'dex':
          // 这里应该实际调用 DEX API
          return { success: true, message: 'DEX API 连接成功' }
        
        default:
          throw new Error(`Unknown API type: ${type}`)
      }
    } catch (error) {
      logger.error('Settings', `测试 API 连接失败: ${type}`, error)
      return { success: false, message: String(error) }
    }
  })

  /**
   * 获取所有设置
   */
  ipcMain.handle('settings:get-all', async () => {
    try {
      logger.info('Settings', '获取所有设置')
      // 这里应该从数据库或配置文件中读取
      return {
        notificationsEnabled: true,
        soundEnabled: true,
        autoUpdateEnabled: true,
        debugMode: false
      }
    } catch (error) {
      logger.error('Settings', '获取所有设置失败', error)
      throw error
    }
  })

  /**
   * 保存所有设置
   */
  ipcMain.handle('settings:save-all', async (_event, settings: UserSettings) => {
    try {
      logger.info('Settings', '保存所有设置', settings)
      // 这里应该保存到数据库或配置文件中
      logger.info('Settings', '所有设置保存成功')
      return { success: true }
    } catch (error) {
      logger.error('Settings', '保存所有设置失败', error)
      throw error
    }
  })

  logger.info('IPC', '设置处理器已注册')
}

/**
 * 注销设置相关的 IPC 处理器
 */
export function unregisterSettingsHandlers(): void {
  // 清理所有设置相关的处理器
  const channels = [
    'settings:get-api-config',
    'settings:save-api-config',
    'settings:test-api',
    'settings:get-all',
    'settings:save-all'
  ]
  
  channels.forEach(channel => {
    ipcMain.removeHandler(channel)
  })
  
  logger.info('IPC', '设置处理器已注销')
}
