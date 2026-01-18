import { app, dialog } from 'electron'
import { logger, LogLevel } from './logger'

// ============== 类型定义 ==============

export enum ErrorCategory {
  NETWORK = 'network',
  WALLET = 'wallet',
  TRANSACTION = 'transaction',
  DATABASE = 'database',
  CONFIGURATION = 'configuration',
  UNKNOWN = 'unknown'
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

// ============== 错误处理器 ==============

class ErrorHandler {
  private errorReports: ErrorReport[] = []
  private maxReports: number = 100

  /**
   * 处理错误
   */
  public handleError(
    error: Error,
    category: ErrorCategory = ErrorCategory.UNKNOWN,
    userAction?: string,
    context?: any
  ): ErrorReport {
    const errorReport: ErrorReport = {
      timestamp: Date.now(),
      errorId: this.generateErrorId(),
      category,
      severity: this.determineSeverity(error),
      message: error.message,
      details: this.extractErrorDetails(error),
      stack: error.stack,
      userAction,
      context
    }

    // 记录到日志
    this.logError(errorReport)

    // 保存错误报告
    this.saveErrorReport(errorReport)

    // 如果是致命错误，显示对话框
    if (errorReport.severity === LogLevel.FATAL) {
      this.showErrorDialog(errorReport)
    }

    return errorReport
  }

  /**
   * 生成错误ID
   */
  private generateErrorId(): string {
    return `ERR-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
  }

  /**
   * 确定错误严重程度
   */
  private determineSeverity(error: Error): LogLevel {
    // 根据错误类型和消息确定严重程度
    const message = error.message.toLowerCase()
    
    if (message.includes('fatal') || message.includes('critical')) {
      return LogLevel.FATAL
    }
    
    if (message.includes('failed') || message.includes('error')) {
      return LogLevel.ERROR
    }
    
    if (message.includes('warning') || message.includes('deprecated')) {
      return LogLevel.WARN
    }
    
    return LogLevel.ERROR
  }

  /**
   * 提取错误详情
   */
  private extractErrorDetails(error: Error): any {
    const details: any = {
      name: error.name,
      message: error.message
    }

    // 提取自定义属性
    if ((error as any).code) {
      details.code = (error as any).code
    }

    if ((error as any).errno) {
      details.errno = (error as any).errno
    }

    if ((error as any).syscall) {
      details.syscall = (error as any).syscall
    }

    return details
  }

  /**
   * 记录错误到日志
   */
  private logError(report: ErrorReport): void {
    const message = `[${report.errorId}] ${report.message}`
    const category = `Error-${report.category}`

    if (report.severity === LogLevel.FATAL) {
      logger.fatal(category, message, report.details, report.stack)
    } else if (report.severity === LogLevel.ERROR) {
      logger.error(category, message, report.details, report.stack)
    } else {
      logger.warn(category, message, report.details)
    }
  }

  /**
   * 保存错误报告
   */
  private saveErrorReport(report: ErrorReport): void {
    this.errorReports.push(report)

    // 限制报告数量
    if (this.errorReports.length > this.maxReports) {
      this.errorReports.shift()
    }
  }

  /**
   * 显示错误对话框
   */
  private showErrorDialog(report: ErrorReport): void {
    dialog.showErrorBox(
      '严重错误',
      `发生严重错误：\n\n${report.message}\n\n错误ID: ${report.errorId}\n\n请查看日志文件获取更多信息。`
    )
  }

  /**
   * 获取所有错误报告
   */
  public getErrorReports(): ErrorReport[] {
    return [...this.errorReports]
  }

  /**
   * 清除错误报告
   */
  public clearErrorReports(): void {
    this.errorReports = []
  }

  /**
   * 获取错误统计
   */
  public getErrorStats(): {
    total: number
    byCategory: Record<ErrorCategory, number>
    bySeverity: Record<LogLevel, number>
  } {
    const stats = {
      total: this.errorReports.length,
      byCategory: {} as Record<ErrorCategory, number>,
      bySeverity: {} as Record<LogLevel, number>
    }

    // 初始化计数器
    Object.values(ErrorCategory).forEach(category => {
      stats.byCategory[category] = 0
    })

    Object.values(LogLevel).forEach(level => {
      if (typeof level === 'number') {
        stats.bySeverity[level] = 0
      }
    })

    // 统计错误
    this.errorReports.forEach(report => {
      stats.byCategory[report.category]++
      stats.bySeverity[report.severity]++
    })

    return stats
  }
}

// 导出单例
export const errorHandler = new ErrorHandler()

/**
 * 设置全局错误处理
 */
export function setupGlobalErrorHandling(loggerInstance: any, errorHandlerInstance: any): void {
  // 捕获未处理的Promise拒绝
  process.on('unhandledRejection', (reason: any) => {
    const error = reason instanceof Error ? reason : new Error(String(reason))
    errorHandlerInstance.handleError(error, ErrorCategory.UNKNOWN, 'Unhandled Promise Rejection')
  })

  // 捕获未捕获的异常
  process.on('uncaughtException', (error: Error) => {
    errorHandlerInstance.handleError(error, ErrorCategory.UNKNOWN, 'Uncaught Exception')
    
    // 给日志系统时间刷新
    setTimeout(() => {
      loggerInstance.cleanup()
      process.exit(1)
    }, 1000)
  })

  // 监听渲染进程崩溃
  app.on('render-process-gone', (event, webContents, details) => {
    const error = new Error(`Render process gone: ${details.reason}`)
    errorHandlerInstance.handleError(error, ErrorCategory.UNKNOWN, 'Render Process Crashed', details)
  })

  // 监听子进程退出
  app.on('child-process-gone', (event, details) => {
    const error = new Error(`Child process gone: ${details.type}`)
    errorHandlerInstance.handleError(error, ErrorCategory.UNKNOWN, 'Child Process Exited', details)
  })

  loggerInstance.info('App', '全局错误处理已设置')
}
