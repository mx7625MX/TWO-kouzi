"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerAllIpcHandlers = registerAllIpcHandlers;
exports.unregisterAllIpcHandlers = unregisterAllIpcHandlers;
const logger_1 = require("../utils/logger");
// 导入各个模块的IPC处理器注册/注销函数
const walletHandlers_1 = require("./walletHandlers");
const launchHandlers = __importStar(require("./launchHandlers"));
const mevProtectionHandlers = __importStar(require("./mevProtectionHandlers"));
const aiSentimentHandlers = __importStar(require("./aiSentimentHandlers"));
const autoTradeHandlers = __importStar(require("./autoTradeHandlers"));
const riskAlertHandlers = __importStar(require("./riskAlertHandlers"));
const marketHandlers = __importStar(require("./marketHandlers"));
const hotspotHandlers = __importStar(require("./hotspotHandlers"));
const profitHandlers = __importStar(require("./profitHandlers"));
const flashSellHandlers = __importStar(require("./flashSellHandlers"));
const historyHandlers = __importStar(require("./historyHandlers"));
const dataExportHandlers = __importStar(require("./dataExportHandlers"));
const settingsHandlers = __importStar(require("./settingsHandlers"));
/**
 * 注册所有IPC处理器
 */
function registerAllIpcHandlers() {
    logger_1.logger.info('IPC', '开始注册所有IPC处理器...');
    // 钱包管理（使用新的加密钱包管理器）
    (0, walletHandlers_1.registerWalletHandlers)();
    // 代币发行
    if (launchHandlers.registerLaunchHandlers) {
        launchHandlers.registerLaunchHandlers();
    }
    // MEV防护
    if (mevProtectionHandlers.registerMEVHandlers) {
        mevProtectionHandlers.registerMEVHandlers();
    }
    // AI情绪分析
    if (aiSentimentHandlers.registerAISentimentHandlers) {
        aiSentimentHandlers.registerAISentimentHandlers();
    }
    // 自动交易
    if (autoTradeHandlers.registerAutoTradeHandlers) {
        autoTradeHandlers.registerAutoTradeHandlers();
    }
    // 风险预警
    if (riskAlertHandlers.registerRiskAlertHandlers) {
        riskAlertHandlers.registerRiskAlertHandlers();
    }
    // 市场监控
    if (marketHandlers.registerMarketHandlers) {
        marketHandlers.registerMarketHandlers();
    }
    // 热点监控
    if (hotspotHandlers.registerHotspotHandlers) {
        hotspotHandlers.registerHotspotHandlers();
    }
    // 盈利分析
    if (profitHandlers.registerProfitHandlers) {
        profitHandlers.registerProfitHandlers();
    }
    // 快速卖出
    if (flashSellHandlers.registerFlashSellHandlers) {
        flashSellHandlers.registerFlashSellHandlers();
    }
    // 交易历史
    if (historyHandlers.registerHistoryHandlers) {
        historyHandlers.registerHistoryHandlers();
    }
    // 数据管理
    if (dataExportHandlers.registerDataExportHandlers) {
        dataExportHandlers.registerDataExportHandlers();
    }
    // 设置
    if (settingsHandlers.registerSettingsHandlers) {
        settingsHandlers.registerSettingsHandlers();
    }
    logger_1.logger.info('IPC', '所有IPC处理器已注册');
}
/**
 * 注销所有IPC处理器
 */
function unregisterAllIpcHandlers() {
    logger_1.logger.info('IPC', '开始注销所有IPC处理器...');
    // 钱包管理
    (0, walletHandlers_1.unregisterWalletHandlers)();
    // 其他模块的注销
    // TODO: 为其他模块添加注销函数
    logger_1.logger.info('IPC', '所有IPC处理器已注销');
}
