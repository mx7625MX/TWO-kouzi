import { app } from 'electron'
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

export interface LogEntry {
  timestamp: number
  level: LogLevel
  category: string
  message: string
  data?: any
  stack?: string
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
  private isCleaningUp: boolean = false

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
    if (this.logBuffer.length === 0 || this.isCleaningUp) return

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
        .filter(f => f.startsWith('app-') && f.endsWith('.log'))
        .sort()
      
      // 删除最旧的日志文件
      while (files.length >= this.maxFiles) {
        const oldFile = files.shift()
        if (oldFile) {
          fs.unlinkSync(path.join(logsDir, oldFile))
        }
      }

      // 创建新的日志文件
      const newLogPath = path.join(logsDir, `app-${this.getDateString()}.log`)
      if (newLogPath !== this.logPath) {
        this.logPath = newLogPath
      }
    } catch (error) {
      console.error('轮转日志文件失败:', error)
    }
  }

  /**
   * 设置日志级别
   */
  public setLogLevel(level: LogLevel): void {
    this.currentLogLevel = level
  }

  /**
   * 获取日志级别
   */
  public getLogLevel(): LogLevel {
    return this.currentLogLevel
  }

  /**
   * DEBUG级别日志
   */
  public debug(category: string, message: string, data?: any): void {
    this.writeLog(LogLevel.DEBUG, category, message, data)
  }

  /**
   * INFO级别日志
   */
  public info(category: string, message: string, data?: any): void {
    this.writeLog(LogLevel.INFO, category, message, data)
  }

  /**
   * WARN级别日志
   */
  public warn(category: string, message: string, data?: any): void {
    this.writeLog(LogLevel.WARN, category, message, data)
  }

  /**
   * ERROR级别日志
   */
  public error(category: string, message: string, data?: any, stack?: string): void {
    this.writeLog(LogLevel.ERROR, category, message, data, stack)
  }

  /**
   * FATAL级别日志
   */
  public fatal(category: string, message: string, data?: any, stack?: string): void {
    this.writeLog(LogLevel.FATAL, category, message, data, stack)
  }

  /**
   * 清理资源
   */
  public cleanup(): void {
    this.isCleaningUp = true
    
    if (this.bufferTimer) {
      clearInterval(this.bufferTimer)
      this.bufferTimer = undefined
    }
    
    // 刷新缓冲区
    this.flushBuffer()
  }

  /**
   * 获取日志文件路径
   */
  public getLogPath(): string {
    return this.logPath
  }
}

// 导出单例
export const logger = new Logger()
