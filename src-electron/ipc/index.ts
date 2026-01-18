import { logger } from '../utils/logger';

// 导入各个模块的IPC处理器注册/注销函数
import { registerWalletHandlers, unregisterWalletHandlers } from './walletHandlers';
import * as launchHandlers from './launchHandlers';
import * as mevProtectionHandlers from './mevProtectionHandlers';
import * as aiSentimentHandlers from './aiSentimentHandlers';
import * as autoTradeHandlers from './autoTradeHandlers';
import * as riskAlertHandlers from './riskAlertHandlers';
import * as marketHandlers from './marketHandlers';
import * as hotspotHandlers from './hotspotHandlers';
import * as profitHandlers from './profitHandlers';
import * as flashSellHandlers from './flashSellHandlers';
import * as historyHandlers from './historyHandlers';
import * as dataExportHandlers from './dataExportHandlers';
import * as settingsHandlers from './settingsHandlers';

/**
 * 注册所有IPC处理器
 */
export function registerAllIpcHandlers() {
  logger.info('IPC', '开始注册所有IPC处理器...');

  // 钱包管理（使用新的加密钱包管理器）
  registerWalletHandlers();

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

  logger.info('IPC', '所有IPC处理器已注册');
}

/**
 * 注销所有IPC处理器
 */
export function unregisterAllIpcHandlers() {
  logger.info('IPC', '开始注销所有IPC处理器...');

  // 钱包管理
  unregisterWalletHandlers();

  // 其他模块的注销
  // TODO: 为其他模块添加注销函数

  logger.info('IPC', '所有IPC处理器已注销');
}
