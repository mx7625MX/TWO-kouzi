"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.LogLevel = void 0;
const electron_1 = require("electron");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// ============== 类型定义 ==============
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["DEBUG"] = 0] = "DEBUG";
    LogLevel[LogLevel["INFO"] = 1] = "INFO";
    LogLevel[LogLevel["WARN"] = 2] = "WARN";
    LogLevel[LogLevel["ERROR"] = 3] = "ERROR";
    LogLevel[LogLevel["FATAL"] = 4] = "FATAL";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
// ============== 日志管理器 ==============
class Logger {
    constructor() {
        this.maxFileSize = 10 * 1024 * 1024; // 10MB
        this.maxFiles = 5;
        this.currentLogLevel = LogLevel.INFO;
        this.logBuffer = [];
        this.bufferFlushInterval = 5000; // 5秒
        this.isCleaningUp = false;
        const userDataPath = electron_1.app.getPath('userData');
        const logsDir = path_1.default.join(userDataPath, 'logs');
        // 确保日志目录存在
        if (!fs_1.default.existsSync(logsDir)) {
            fs_1.default.mkdirSync(logsDir, { recursive: true });
        }
        this.logPath = path_1.default.join(logsDir, `app-${this.getDateString()}.log`);
        // 启动缓冲区定时刷新
        this.startBufferFlush();
    }
    /**
     * 获取日期字符串
     */
    getDateString() {
        const now = new Date();
        return now.toISOString().split('T')[0];
    }
    /**
     * 启动缓冲区刷新
     */
    startBufferFlush() {
        this.bufferTimer = setInterval(() => {
            this.flushBuffer();
        }, this.bufferFlushInterval);
    }
    /**
     * 刷新缓冲区
     */
    flushBuffer() {
        if (this.logBuffer.length === 0 || this.isCleaningUp)
            return;
        try {
            const logContent = this.logBuffer
                .map(entry => this.formatLogEntry(entry))
                .join('\n') + '\n';
            fs_1.default.appendFileSync(this.logPath, logContent);
            this.logBuffer = [];
        }
        catch (error) {
            console.error('写入日志失败:', error);
        }
    }
    /**
     * 格式化日志条目
     */
    formatLogEntry(entry) {
        const timestamp = new Date(entry.timestamp).toISOString();
        const level = LogLevel[entry.level].padEnd(5);
        const category = entry.category.padEnd(15);
        let logLine = `[${timestamp}] [${level}] [${category}] ${entry.message}`;
        if (entry.data) {
            logLine += `\n  Data: ${JSON.stringify(entry.data, null, 2)}`;
        }
        if (entry.stack) {
            logLine += `\n  Stack: ${entry.stack}`;
        }
        return logLine;
    }
    /**
     * 写入日志
     */
    writeLog(level, category, message, data, stack) {
        const entry = {
            timestamp: Date.now(),
            level,
            category,
            message,
            data,
            stack
        };
        // 添加到缓冲区
        this.logBuffer.push(entry);
        // 如果是错误级别，立即刷新
        if (level >= LogLevel.ERROR) {
            this.flushBuffer();
        }
        // 控制台输出
        if (level >= this.currentLogLevel) {
            const timestamp = new Date(entry.timestamp).toLocaleTimeString();
            const levelStr = LogLevel[entry.level];
            console.log(`[${timestamp}] [${levelStr}] [${category}] ${message}`);
            if (data) {
                console.log('Data:', data);
            }
            if (stack) {
                console.error(stack);
            }
        }
        // 检查日志文件大小
        this.checkLogFileSize();
    }
    /**
     * 检查日志文件大小
     */
    checkLogFileSize() {
        try {
            if (fs_1.default.existsSync(this.logPath)) {
                const stats = fs_1.default.statSync(this.logPath);
                if (stats.size > this.maxFileSize) {
                    this.rotateLogs();
                }
            }
        }
        catch (error) {
            console.error('检查日志文件大小失败:', error);
        }
    }
    /**
     * 轮转日志文件
     */
    rotateLogs() {
        try {
            const logsDir = path_1.default.dirname(this.logPath);
            const files = fs_1.default.readdirSync(logsDir)
                .filter(f => f.startsWith('app-') && f.endsWith('.log'))
                .sort();
            // 删除最旧的日志文件
            while (files.length >= this.maxFiles) {
                const oldFile = files.shift();
                if (oldFile) {
                    fs_1.default.unlinkSync(path_1.default.join(logsDir, oldFile));
                }
            }
            // 创建新的日志文件
            const newLogPath = path_1.default.join(logsDir, `app-${this.getDateString()}.log`);
            if (newLogPath !== this.logPath) {
                this.logPath = newLogPath;
            }
        }
        catch (error) {
            console.error('轮转日志文件失败:', error);
        }
    }
    /**
     * 设置日志级别
     */
    setLogLevel(level) {
        this.currentLogLevel = level;
    }
    /**
     * 获取日志级别
     */
    getLogLevel() {
        return this.currentLogLevel;
    }
    /**
     * DEBUG级别日志
     */
    debug(category, message, data) {
        this.writeLog(LogLevel.DEBUG, category, message, data);
    }
    /**
     * INFO级别日志
     */
    info(category, message, data) {
        this.writeLog(LogLevel.INFO, category, message, data);
    }
    /**
     * WARN级别日志
     */
    warn(category, message, data) {
        this.writeLog(LogLevel.WARN, category, message, data);
    }
    /**
     * ERROR级别日志
     */
    error(category, message, data, stack) {
        this.writeLog(LogLevel.ERROR, category, message, data, stack);
    }
    /**
     * FATAL级别日志
     */
    fatal(category, message, data, stack) {
        this.writeLog(LogLevel.FATAL, category, message, data, stack);
    }
    /**
     * 清理资源
     */
    cleanup() {
        this.isCleaningUp = true;
        if (this.bufferTimer) {
            clearInterval(this.bufferTimer);
            this.bufferTimer = undefined;
        }
        // 刷新缓冲区
        this.flushBuffer();
    }
    /**
     * 获取日志文件路径
     */
    getLogPath() {
        return this.logPath;
    }
}
// 导出单例
exports.logger = new Logger();
