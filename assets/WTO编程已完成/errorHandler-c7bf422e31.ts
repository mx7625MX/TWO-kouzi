/**
 * 全局错误处理和日志系统
 * 统一管理应用错误、日志记录和错误报告
 */

import { app, dialog } from 'electron'
import fs from 'fs'
import path from 'path'

// ============== 类型定义 ==============

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4
}

export enum ErrorCategory {
  NETWORK = 'network',
  WALLET = 'wallet',
  TRANSACTION = 'transaction',
  DATABASE = 'database',
  CONFIGURATION = 'configuration',
  UNKNOWN = 'unknown'
}

export interface LogEntry {
  timestamp: number
  level: LogLevel
  category: string
  message: string
  data?: any
  stack?: string
}

export interface ErrorReport {
  timestamp: number
  errorId: string
  category: ErrorCategory
  severity: LogLevel
  message: string
  details?: any
  stack?: string
  userAction?: string
  context?: any
}

// ============== 日志管理器 ==============

class Logger {
  private logPath: string
  private maxFileSize: number = 10 * 1024 * 1024 // 10MB
  private maxFiles: number = 5
  private currentLogLevel: LogLevel = LogLevel.INFO
  private logBuffer: LogEntry[] = []
  private bufferFlushInterval: number = 5000 // 5秒
  private bufferTimer?: NodeJS.Timeout

  constructor() {
    const userDataPath = app.getPath('userData')
    const logsDir = path.join(userDataPath, 'logs')
    
    // 确保日志目录存在
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true })
    }

    this.logPath = path.join(logsDir, `app-${this.getDateString()}.log`)
    
    // 启动缓冲区定时刷新
    this.startBufferFlush()
  }

  /**
   * 获取日期字符串
   */
  private getDateString(): string {
    const now = new Date()
    return now.toISOString().split('T')[0]
  }

  /**
   * 启动缓冲区刷新
   */
  private startBufferFlush(): void {
    this.bufferTimer = setInterval(() => {
      this.flushBuffer()
    }, this.bufferFlushInterval)
  }

  /**
   * 刷新缓冲区
   */
  private flushBuffer(): void {
    if (this.logBuffer.length === 0) return

    try {
      const logContent = this.logBuffer
        .map(entry => this.formatLogEntry(entry))
        .join('\n') + '\n'

      fs.appendFileSync(this.logPath, logContent)
      this.logBuffer = []
    } catch (error) {
      console.error('写入日志失败:', error)
    }
  }

  /**
   * 格式化日志条目
   */
  private formatLogEntry(entry: LogEntry): string {
    const timestamp = new Date(entry.timestamp).toISOString()
    const level = LogLevel[entry.level].padEnd(5)
    const category = entry.category.padEnd(15)
    
    let logLine = `[${timestamp}] [${level}] [${category}] ${entry.message}`
    
    if (entry.data) {
      logLine += `\n  Data: ${JSON.stringify(entry.data, null, 2)}`
    }
    
    if (entry.stack) {
      logLine += `\n  Stack: ${entry.stack}`
    }
    
    return logLine
  }

  /**
   * 写入日志
   */
  private writeLog(
    level: LogLevel,
    category: string,
    message: string,
    data?: any,
    stack?: string
  ): void {
    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      category,
      message,
      data,
      stack
    }

    // 添加到缓冲区
    this.logBuffer.push(entry)

    // 如果是错误级别，立即刷新
    if (level >= LogLevel.ERROR) {
      this.flushBuffer()
    }

    // 控制台输出
    if (level >= this.currentLogLevel) {
      const timestamp = new Date(entry.timestamp).toLocaleTimeString()
      const levelStr = LogLevel[entry.level]
      console.log(`[${timestamp}] [${levelStr}] [${category}] ${message}`)
      
      if (data) {
        console.log('Data:', data)
      }
      
      if (stack) {
        console.error(stack)
      }
    }

    // 检查日志文件大小
    this.checkLogFileSize()
  }

  /**
   * 检查日志文件大小
   */
  private checkLogFileSize(): void {
    try {
      if (fs.existsSync(this.logPath)) {
        const stats = fs.statSync(this.logPath)
        if (stats.size > this.maxFileSize) {
          this.rotateLogs()
        }
      }
    } catch (error) {
      console.error('检查日志文件大小失败:', error)
    }
  }

  /**
   * 轮转日志文件
   */
  private rotateLogs(): void {
    try {
      const logsDir = path.dirname(this.logPath)
      const files = fs.readdirSync(logsDir)
        .filter(file => file.startsWith('app-') && file.endsWith('.log'))
        .sort()
        .reverse()

      // 删除旧日志
      while (files.length >= this.maxFiles) {
        const oldFile = files.pop()
        if (oldFile) {
          fs.unlinkSync(path.join(logsDir, oldFile))
        }
      }

      // 创建新日志文件
      this.logPath = path.join(logsDir, `app-${this.getDateString()}.log`)
    } catch (error) {
      console.error('轮转日志文件失败:', error)
    }
  }

  /**
   * 设置日志级别
   */
  setLevel(level: LogLevel): void {
    this.currentLogLevel = level
  }

  /**
   * Debug日志
   */
  debug(category: string, message: string, data?: any): void {
    this.writeLog(LogLevel.DEBUG, category, message, data)
  }

  /**
   * Info日志
   */
  info(category: string, message: string, data?: any): void {
    this.writeLog(LogLevel.INFO, category, message, data)
  }

  /**
   * Warn日志
   */
  warn(category: string, message: string, data?: any): void {
    this.writeLog(LogLevel.WARN, category, message, data)
  }

  /**
   * Error日志
   */
  error(category: string, message: string, error?: Error | any, data?: any): void {
    const stack = error instanceof Error ? error.stack : undefined
    const errorMessage = error instanceof Error ? error.message : String(error)
    
    this.writeLog(
      LogLevel.ERROR,
      category,
      message,
      data,
      stack
    )
  }

  /**
   * Fatal日志
   */
  fatal(category: string, message: string, error?: Error | any, data?: any): void {
    const stack = error instanceof Error ? error.stack : undefined
    const errorMessage = error instanceof Error ? error.message : String(error)
    
    this.writeLog(
      LogLevel.FATAL,
      category,
      message,
      data,
      stack
    )
  }

  /**
   * 获取最近的日志
   */
  getRecentLogs(count: number = 100): LogEntry[] {
    try {
      if (fs.existsSync(this.logPath)) {
        const content = fs.readFileSync(this.logPath, 'utf-8')
        const lines = content.split('\n').filter(line => line.trim())
        
        return lines
          .slice(-count)
          .map(line => {
            try {
              // 简化日志解析（实际项目应该使用更严谨的解析器）
              const match = line.match(/\[(.*?)\] \[(.*?)\] \[(.*?)\] (.*)/)
              if (match) {
                return {
                  timestamp: new Date(match[1]).getTime(),
                  level: this.parseLevel(match[2]),
                  category: match[3],
                  message: match[4]
                }
              }
            } catch (e) {
              // 忽略解析错误
            }
            return null
          })
          .filter((log): log is LogEntry => log !== null)
      }
    } catch (error) {
      console.error('读取日志失败:', error)
    }
    
    return []
  }

  /**
   * 解析日志级别
   */
  private parseLevel(levelStr: string): LogLevel {
    const levelMap: { [key: string]: LogLevel } = {
      'DEBUG': LogLevel.DEBUG,
      'INFO': LogLevel.INFO,
      'WARN': LogLevel.WARN,
      'ERROR': LogLevel.ERROR,
      'FATAL': LogLevel.FATAL
    }
    
    return levelMap[levelStr] || LogLevel.INFO
  }

  /**
   * 清理日志
   */
  cleanup(): void {
    if (this.bufferTimer) {
      clearInterval(this.bufferTimer)
    }
    this.flushBuffer()
  }
}

// ============== 错误处理器 ==============

class ErrorHandler {
  private errorReports: ErrorReport[] = []
  private maxReports: number = 100
  private errorReportsPath: string

  constructor(private logger: Logger) {
    const userDataPath = app.getPath('userData')
    this.errorReportsPath = path.join(userDataPath, 'error-reports.json')
    this.loadErrorReports()
  }

  /**
   * 加载错误报告
   */
  private loadErrorReports(): void {
    try {
      if (fs.existsSync(this.errorReportsPath)) {
        const content = fs.readFileSync(this.errorReportsPath, 'utf-8')
        this.errorReports = JSON.parse(content)
      }
    } catch (error) {
      this.logger.error('ErrorHandler', '加载错误报告失败', error)
    }
  }

  /**
   * 保存错误报告
   */
  private saveErrorReports(): void {
    try {
      // 只保留最近的N个错误报告
      const reportsToSave = this.errorReports.slice(-this.maxReports)
      fs.writeFileSync(
        this.errorReportsPath,
        JSON.stringify(reportsToSave, null, 2)
      )
    } catch (error) {
      this.logger.error('ErrorHandler', '保存错误报告失败', error)
    }
  }

  /**
   * 处理错误
   */
  handleError(
    error: Error | string,
    category: ErrorCategory = ErrorCategory.UNKNOWN,
    context?: any,
    severity: LogLevel = LogLevel.ERROR
  ): string {
    const errorMessage = error instanceof Error ? error.message : error
    const errorStack = error instanceof Error ? error.stack : undefined
    
    const errorId = this.generateErrorId()
    
    const report: ErrorReport = {
      timestamp: Date.now(),
      errorId,
      category,
      severity,
      message: errorMessage,
      details: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: errorStack
      } : { message: error },
      stack: errorStack,
      context
    }

    this.errorReports.push(report)
    this.saveErrorReports()

    // 记录日志
    const logCategory = category.toUpperCase()
    const logMessage = `Error [${errorId}]: ${errorMessage}`
    
    if (severity >= LogLevel.FATAL) {
      this.logger.fatal(logCategory, logMessage, error, context)
    } else {
      this.logger.error(logCategory, logMessage, error, context)
    }

    return errorId
  }

  /**
   * 生成错误ID
   */
  private generateErrorId(): string {
    return `ERR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * 获取错误报告
   */
  getErrorReports(category?: ErrorCategory): ErrorReport[] {
    if (category) {
      return this.errorReports.filter(report => report.category === category)
    }
    return [...this.errorReports]
  }

  /**
   * 获取最近的错误
   */
  getRecentErrors(count: number = 10): ErrorReport[] {
    return this.errorReports.slice(-count).reverse()
  }

  /**
   * 清除错误报告
   */
  clearErrorReports(): void {
    this.errorReports = []
    this.saveErrorReports()
    this.logger.info('ErrorHandler', '已清除所有错误报告')
  }

  /**
   * 显示错误对话框
   */
  showErrorDialog(
    title: string,
    message: string,
    error?: Error | string
  ): void {
    let detail = message
    if (error) {
      const errorMessage = error instanceof Error ? error.message : error
      const errorStack = error instanceof Error ? error.stack : ''
      detail += `\n\n错误信息: ${errorMessage}`
      if (errorStack) {
        detail += `\n\n堆栈:\n${errorStack}`
      }
    }

    dialog.showErrorBox(title, detail)
  }
}

// ============== 全局错误处理 ==============

export function setupGlobalErrorHandling(logger: Logger, errorHandler: ErrorHandler): void {
  // 处理未捕获的异常
  process.on('uncaughtException', (error) => {
    const errorId = errorHandler.handleError(error, ErrorCategory.UNKNOWN, {
      type: 'uncaughtException'
    }, LogLevel.FATAL)
    
    logger.fatal('Global', `未捕获的异常 [${errorId}]`, error)
    
    // 显示错误对话框
    errorHandler.showErrorDialog(
      '未捕获的异常',
      '应用程序遇到严重错误，即将退出。',
      error
    )
    
    // 优雅退出
    setTimeout(() => {
      app.exit(1)
    }, 1000)
  })

  // 处理未处理的Promise拒绝
  process.on('unhandledRejection', (reason, promise) => {
    const errorId = errorHandler.handleError(
      reason instanceof Error ? reason : String(reason),
      ErrorCategory.UNKNOWN,
      {
        type: 'unhandledRejection',
        promise: String(promise)
      },
      LogLevel.ERROR
    )
    
    logger.error('Global', `未处理的Promise拒绝 [${errorId}]`, reason)
  })

  // 处理Electron渲染进程错误
  if (app.on) {
    app.on('render-process-gone', (_event, details) => {
      logger.error('Global', `渲染进程崩溃`, {
        reason: details.reason,
        exitCode: details.exitCode
      })
    })
  }
}

// ============== 导出单例 ==============

export const logger = new Logger()
export const errorHandler = new ErrorHandler(logger)
