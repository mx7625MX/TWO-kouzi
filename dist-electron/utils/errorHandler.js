"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = exports.ErrorCategory = void 0;
exports.setupGlobalErrorHandling = setupGlobalErrorHandling;
const electron_1 = require("electron");
const logger_1 = require("./logger");
// ============== 类型定义 ==============
var ErrorCategory;
(function (ErrorCategory) {
    ErrorCategory["NETWORK"] = "network";
    ErrorCategory["WALLET"] = "wallet";
    ErrorCategory["TRANSACTION"] = "transaction";
    ErrorCategory["DATABASE"] = "database";
    ErrorCategory["CONFIGURATION"] = "configuration";
    ErrorCategory["UNKNOWN"] = "unknown";
})(ErrorCategory || (exports.ErrorCategory = ErrorCategory = {}));
// ============== 错误处理器 ==============
class ErrorHandler {
    constructor() {
        this.errorReports = [];
        this.maxReports = 100;
    }
    /**
     * 处理错误
     */
    handleError(error, category = ErrorCategory.UNKNOWN, userAction, context) {
        const errorReport = {
            timestamp: Date.now(),
            errorId: this.generateErrorId(),
            category,
            severity: this.determineSeverity(error),
            message: error.message,
            details: this.extractErrorDetails(error),
            stack: error.stack,
            userAction,
            context
        };
        // 记录到日志
        this.logError(errorReport);
        // 保存错误报告
        this.saveErrorReport(errorReport);
        // 如果是致命错误，显示对话框
        if (errorReport.severity === logger_1.LogLevel.FATAL) {
            this.showErrorDialog(errorReport);
        }
        return errorReport;
    }
    /**
     * 生成错误ID
     */
    generateErrorId() {
        return `ERR-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    }
    /**
     * 确定错误严重程度
     */
    determineSeverity(error) {
        // 根据错误类型和消息确定严重程度
        const message = error.message.toLowerCase();
        if (message.includes('fatal') || message.includes('critical')) {
            return logger_1.LogLevel.FATAL;
        }
        if (message.includes('failed') || message.includes('error')) {
            return logger_1.LogLevel.ERROR;
        }
        if (message.includes('warning') || message.includes('deprecated')) {
            return logger_1.LogLevel.WARN;
        }
        return logger_1.LogLevel.ERROR;
    }
    /**
     * 提取错误详情
     */
    extractErrorDetails(error) {
        const details = {
            name: error.name,
            message: error.message
        };
        // 提取自定义属性
        if (error.code) {
            details.code = error.code;
        }
        if (error.errno) {
            details.errno = error.errno;
        }
        if (error.syscall) {
            details.syscall = error.syscall;
        }
        return details;
    }
    /**
     * 记录错误到日志
     */
    logError(report) {
        const message = `[${report.errorId}] ${report.message}`;
        const category = `Error-${report.category}`;
        if (report.severity === logger_1.LogLevel.FATAL) {
            logger_1.logger.fatal(category, message, report.details, report.stack);
        }
        else if (report.severity === logger_1.LogLevel.ERROR) {
            logger_1.logger.error(category, message, report.details, report.stack);
        }
        else {
            logger_1.logger.warn(category, message, report.details);
        }
    }
    /**
     * 保存错误报告
     */
    saveErrorReport(report) {
        this.errorReports.push(report);
        // 限制报告数量
        if (this.errorReports.length > this.maxReports) {
            this.errorReports.shift();
        }
    }
    /**
     * 显示错误对话框
     */
    showErrorDialog(report) {
        electron_1.dialog.showErrorBox('严重错误', `发生严重错误：\n\n${report.message}\n\n错误ID: ${report.errorId}\n\n请查看日志文件获取更多信息。`);
    }
    /**
     * 获取所有错误报告
     */
    getErrorReports() {
        return [...this.errorReports];
    }
    /**
     * 清除错误报告
     */
    clearErrorReports() {
        this.errorReports = [];
    }
    /**
     * 获取错误统计
     */
    getErrorStats() {
        const stats = {
            total: this.errorReports.length,
            byCategory: {},
            bySeverity: {}
        };
        // 初始化计数器
        Object.values(ErrorCategory).forEach(category => {
            stats.byCategory[category] = 0;
        });
        Object.values(logger_1.LogLevel).forEach(level => {
            if (typeof level === 'number') {
                stats.bySeverity[level] = 0;
            }
        });
        // 统计错误
        this.errorReports.forEach(report => {
            stats.byCategory[report.category]++;
            stats.bySeverity[report.severity]++;
        });
        return stats;
    }
}
// 导出单例
exports.errorHandler = new ErrorHandler();
/**
 * 设置全局错误处理
 */
function setupGlobalErrorHandling(loggerInstance, errorHandlerInstance) {
    // 捕获未处理的Promise拒绝
    process.on('unhandledRejection', (reason) => {
        const error = reason instanceof Error ? reason : new Error(String(reason));
        errorHandlerInstance.handleError(error, ErrorCategory.UNKNOWN, 'Unhandled Promise Rejection');
    });
    // 捕获未捕获的异常
    process.on('uncaughtException', (error) => {
        errorHandlerInstance.handleError(error, ErrorCategory.UNKNOWN, 'Uncaught Exception');
        // 给日志系统时间刷新
        setTimeout(() => {
            loggerInstance.cleanup();
            process.exit(1);
        }, 1000);
    });
    // 监听渲染进程崩溃
    electron_1.app.on('render-process-gone', (event, webContents, details) => {
        const error = new Error(`Render process gone: ${details.reason}`);
        errorHandlerInstance.handleError(error, ErrorCategory.UNKNOWN, 'Render Process Crashed', details);
    });
    // 监听子进程退出
    electron_1.app.on('child-process-gone', (event, details) => {
        const error = new Error(`Child process gone: ${details.type}`);
        errorHandlerInstance.handleError(error, ErrorCategory.UNKNOWN, 'Child Process Exited', details);
    });
    loggerInstance.info('App', '全局错误处理已设置');
}
