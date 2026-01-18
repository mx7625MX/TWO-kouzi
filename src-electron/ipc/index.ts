import { registerIpcHandler } from '../utils/ipc-cleanup';

// 导入各个模块的IPC处理器
import * as walletHandlers from './walletHandlers';
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
  console.log('Registering all IPC handlers...');

  // 钱包管理
  registerIpcHandler('wallet:create', walletHandlers.createWallet);
  registerIpcHandler('wallet:import', walletHandlers.importWallet);
  registerIpcHandler('wallet:getAll', walletHandlers.getWallets);
  registerIpcHandler('wallet:getBalance', walletHandlers.getBalance);
  registerIpcHandler('wallet:sign', walletHandlers.signTransaction);
  registerIpcHandler('wallet:delete', walletHandlers.deleteWallet);

  // 代币发行
  registerIpcHandler('launch:token', launchHandlers.launchToken);
  registerIpcHandler('launch:bundleBuy', launchHandlers.bundleBuy);
  registerIpcHandler('launch:getTasks', launchHandlers.getLaunchTasks);
  registerIpcHandler('launch:cancelTask', launchHandlers.cancelTask);

  // MEV防护
  registerIpcHandler('mev:enable', mevProtectionHandlers.enableProtection);
  registerIpcHandler('mev:getStatus', mevProtectionHandlers.getProtectionStatus);
  registerIpcHandler('mev:getStats', mevProtectionHandlers.getAttackStats);

  // AI情绪分析
  registerIpcHandler('ai:analyze', aiSentimentHandlers.analyzeSentiment);
  registerIpcHandler('ai:getSentimentData', aiSentimentHandlers.getSentimentData);

  // 自动交易
  registerIpcHandler('trade:enable', autoTradeHandlers.enableTrading);
  registerIpcHandler('trade:setStrategy', autoTradeHandlers.setStrategy);
  registerIpcHandler('trade:getStatus', autoTradeHandlers.getTradingStatus);

  // 风险预警
  registerIpcHandler('risk:getAlerts', riskAlertHandlers.getAlerts);
  registerIpcHandler('risk:setRule', riskAlertHandlers.setAlertRule);
  registerIpcHandler('risk:clearAlert', riskAlertHandlers.clearAlert);

  // 市场监控
  registerIpcHandler('market:getData', marketHandlers.getMarketData);
  registerIpcHandler('market:getWatchlist', marketHandlers.getWatchlist);
  registerIpcHandler('market:addToWatchlist', marketHandlers.addToWatchlist);

  // 热点监控
  registerIpcHandler('hotspot:getHotTokens', hotspotHandlers.getHotTokens);
  registerIpcHandler('hotspot:getTrending', hotspotHandlers.getTrendingData);

  // 盈利分析
  registerIpcHandler('profit:getReport', profitHandlers.getProfitReport);
  registerIpcHandler('profit:getROI', profitHandlers.getROIStats);

  // 快速卖出
  registerIpcHandler('flashSell:execute', flashSellHandlers.executeQuickSell);
  registerIpcHandler('flashSell:getSettings', flashSellHandlers.getSellSettings);

  // 交易历史
  registerIpcHandler('history:getTransactions', historyHandlers.getTransactions);
  registerIpcHandler('history:export', historyHandlers.exportTransactions);

  // 数据管理
  registerIpcHandler('data:export', dataExportHandlers.exportData);
  registerIpcHandler('data:import', dataExportHandlers.importData);
  registerIpcHandler('data:clear', dataExportHandlers.clearData);

  // 设置
  registerIpcHandler('settings:get', settingsHandlers.getSettings);
  registerIpcHandler('settings:update', settingsHandlers.updateSettings);
  registerIpcHandler('settings:reset', settingsHandlers.resetSettings);

  console.log('All IPC handlers registered successfully');
}
