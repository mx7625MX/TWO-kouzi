import { app, BrowserWindow } from 'electron'
import path from 'path'
import { walletDB } from './database'
import { registerIPCHandlers, removeIPCHandlers } from './ipcHandlers'
import { registerMarketHandlers, unregisterMarketHandlers } from './ipc/marketHandlers'
import { registerExtendedHandlers, unregisterExtendedHandlers } from './ipc/extendedHandlers'
import { registerHotspotHandlers, unregisterHotspotHandlers } from './ipc/hotspotHandlers'
import { registerSettingsHandlers, unregisterSettingsHandlers } from './ipc/settingsHandlers'
import { registerTransactionHistoryHandlers, unregisterTransactionHistoryHandlers } from './ipc/transactionHistoryHandlers'
import { registerDataExportHandlers, unregisterDataExportHandlers } from './ipc/dataExportHandlers'
import { setupAutoTradeEventListeners } from './ipc/autoTradeHandlers'
import { initMEVProtectionHandlers } from './ipc/mevProtectionHandlers'
import { initAISentimentHandlers } from './ipc/aiSentimentHandlers'
import { initRiskAlertHandlers } from './ipc/riskAlertHandlers'
import { logger, errorHandler, setupGlobalErrorHandling } from './utils/errorHandler'
import { apiManager } from './utils/apiIntegrations'

// 定义全局窗口变量
let mainWindow: BrowserWindow | null = null

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  // 开发环境加载Vite开发服务器
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    // 打开开发者工具
    mainWindow.webContents.openDevTools()
  } else {
    // 生产环境加载打包后的文件
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// 当Electron完成初始化时创建窗口
app.whenReady().then(() => {
  // 初始化数据库
  try {
    walletDB.initialize()
    logger.info('Database', '数据库初始化完成')
  } catch (error) {
    logger.fatal('Database', '数据库初始化失败', error)
    throw error
  }

  // 设置全局错误处理
  setupGlobalErrorHandling(logger, errorHandler)
  logger.info('App', 'Meme Master Pro v2.0 启动')

  // 注册IPC处理器
  registerIPCHandlers()
  registerMarketHandlers()
  registerExtendedHandlers()
  registerHotspotHandlers()
  registerSettingsHandlers()
  registerTransactionHistoryHandlers()
  registerDataExportHandlers()

  // 设置自动交易事件监听器
  setupAutoTradeEventListeners()

  // 注册新功能模块IPC处理器
  initMEVProtectionHandlers()
  initAISentimentHandlers()
  initRiskAlertHandlers()

  logger.info('IPC', '所有IPC处理器已注册')

  // 初始化 DEX API
  apiManager.initDEX()
  logger.info('API', 'DEX API 已初始化')

  createWindow()

  app.on('activate', () => {
    // 在macOS上，当点击dock图标并且没有其他窗口打开时，
    // 通常会在应用程序中重新创建一个窗口。
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

// 当所有窗口关闭时退出应用（除了macOS）
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// 应用退出前清理
app.on('before-quit', () => {
  try {
    logger.info('App', '应用正在退出，正在清理资源...')
    
    // 移除IPC处理器
    removeIPCHandlers()
    unregisterMarketHandlers()
    unregisterExtendedHandlers()
    unregisterHotspotHandlers()
    unregisterSettingsHandlers()
    unregisterTransactionHistoryHandlers()
    unregisterDataExportHandlers()
    logger.info('IPC', '所有IPC处理器已注销')
    
    // 清理 API 客户端
    apiManager.cleanup()
    logger.info('API', '所有 API 客户端已清理')
    
    // 关闭数据库连接
    walletDB.close()
    logger.info('Database', '数据库连接已关闭')
    
    // 清理日志系统
    logger.cleanup()
    logger.info('App', '资源清理完成')
  } catch (error) {
    logger.fatal('App', '清理资源时出错', error)
  }
})
