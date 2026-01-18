import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { registerAllIpcHandlers, unregisterAllIpcHandlers } from '../ipc';
import { initializeDatabase } from '../data/database';
import { logger } from '../utils/logger';
import { errorHandler, setupGlobalErrorHandling } from '../utils/errorHandler';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: path.join(__dirname, '../../assets/icon.png'),
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  try {
    // 设置全局错误处理
    setupGlobalErrorHandling(logger, errorHandler);
    logger.info('App', 'Meme Master Pro v2.0 启动');

    // 初始化数据库
    await initializeDatabase();
    logger.info('Database', '数据库初始化完成');

    // 注册所有IPC处理器
    registerAllIpcHandlers();
    logger.info('IPC', '所有IPC处理器已注册');

    // 创建窗口
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  } catch (error: any) {
    logger.fatal('App', '应用启动失败', error);
    errorHandler.handleError(error, require('../utils/errorHandler').ErrorCategory.UNKNOWN, 'App Startup');
    throw error;
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  try {
    logger.info('App', '应用正在退出，正在清理资源...');

    // 清理所有IPC处理器
    unregisterAllIpcHandlers();
    logger.info('IPC', '所有IPC处理器已注销');

    // 清理日志系统
    logger.cleanup();
    logger.info('App', '资源清理完成');
  } catch (error: any) {
    logger.fatal('App', '清理资源时出错', error);
  }
});

export { mainWindow };
