"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mainWindow = void 0;
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const ipc_1 = require("../ipc");
const database_1 = require("../data/database");
const logger_1 = require("../utils/logger");
const errorHandler_1 = require("../utils/errorHandler");
let mainWindow = null;
exports.mainWindow = mainWindow;
function createWindow() {
    exports.mainWindow = mainWindow = new electron_1.BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1200,
        minHeight: 800,
        webPreferences: {
            preload: path_1.default.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        },
        icon: path_1.default.join(__dirname, '../../assets/icon.png'),
    });
    if (process.env.NODE_ENV === 'development') {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    }
    else {
        mainWindow.loadFile(path_1.default.join(__dirname, '../dist/index.html'));
    }
    mainWindow.on('closed', () => {
        exports.mainWindow = mainWindow = null;
    });
}
electron_1.app.whenReady().then(async () => {
    try {
        // 设置全局错误处理
        (0, errorHandler_1.setupGlobalErrorHandling)(logger_1.logger, errorHandler_1.errorHandler);
        logger_1.logger.info('App', 'Meme Master Pro v2.0 启动');
        // 初始化数据库
        await (0, database_1.initializeDatabase)();
        logger_1.logger.info('Database', '数据库初始化完成');
        // 注册所有IPC处理器
        (0, ipc_1.registerAllIpcHandlers)();
        logger_1.logger.info('IPC', '所有IPC处理器已注册');
        // 创建窗口
        createWindow();
        electron_1.app.on('activate', () => {
            if (electron_1.BrowserWindow.getAllWindows().length === 0) {
                createWindow();
            }
        });
    }
    catch (error) {
        logger_1.logger.fatal('App', '应用启动失败', error);
        errorHandler_1.errorHandler.handleError(error, require('../utils/errorHandler').ErrorCategory.UNKNOWN, 'App Startup');
        throw error;
    }
});
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
electron_1.app.on('before-quit', () => {
    try {
        logger_1.logger.info('App', '应用正在退出，正在清理资源...');
        // 清理所有IPC处理器
        (0, ipc_1.unregisterAllIpcHandlers)();
        logger_1.logger.info('IPC', '所有IPC处理器已注销');
        // 清理日志系统
        logger_1.logger.cleanup();
        logger_1.logger.info('App', '资源清理完成');
    }
    catch (error) {
        logger_1.logger.fatal('App', '清理资源时出错', error);
    }
});
