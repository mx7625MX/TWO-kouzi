/**
 * 国际化（多语言）管理上下文
 * 支持中文/英文切换
 */

import React, { createContext, useContext, useState, useEffect } from 'react'

export type LanguageType = 'zh-CN' | 'en-US'

interface I18nContextType {
  language: LanguageType
  setLanguage: (language: LanguageType) => void
  t: (key: string, params?: Record<string, any>) => string
}

const I18nContext = createContext<I18nContextType | undefined>(undefined)

/**
 * 翻译字典
 */
const translations: Record<LanguageType, Record<string, string>> = {
  'zh-CN': {
    // 通用
    'app.title': 'Meme Master Pro',
    'app.subtitle': '一站式Meme代币管理平台',
    'common.loading': '加载中...',
    'common.success': '成功',
    'common.error': '错误',
    'common.cancel': '取消',
    'common.confirm': '确认',
    'common.save': '保存',
    'common.delete': '删除',
    'common.edit': '编辑',
    'common.view': '查看',
    'common.search': '搜索',
    'common.filter': '筛选',
    'common.export': '导出',
    'common.import': '导入',
    'common.refresh': '刷新',
    'common.close': '关闭',
    
    // 导航
    'nav.dashboard': '首页',
    'nav.wallets': '钱包管理',
    'nav.launch': '发币',
    'nav.tasks': '发币任务',
    'nav.market': '市值管理',
    'nav.flashsell': '闪卖',
    'nav.profit': '收益统计',
    'nav.hotspot': '热点监控',
    
    // 主题
    'theme.light': '浅色主题',
    'theme.dark': '深色主题',
    'theme.auto': '自动主题',
    'theme.toggle': '切换主题',
    
    // 语言
    'language.zh-CN': '中文',
    'language.en-US': 'English',
    
    // 系统状态
    'status.online': '运行中',
    'status.offline': '离线',
    'status.error': '异常',
    'status.pending': '等待中',
    'status.running': '运行中',
    'status.completed': '已完成',
    'status.failed': '失败',
    
    // 钱包管理
    'wallet.title': '钱包管理',
    'wallet.create': '创建钱包',
    'wallet.import': '导入钱包',
    'wallet.export': '导出钱包',
    'wallet.delete': '删除钱包',
    'wallet.balance': '余额',
    'wallet.address': '地址',
    'wallet.privateKey': '私钥',
    'wallet.network': '网络',
    
    // 发币
    'launch.title': '发币',
    'launch.bsc': 'BSC发币',
    'launch.solana': 'Solana发币',
    'launch.bundle': '捆绑买入',
    'launch.name': '代币名称',
    'launch.symbol': '代币符号',
    'launch.supply': '供应量',
    'launch.liquidity': '流动性',
    'launch.price': '价格',
    
    // 市值管理
    'market.title': '市值管理',
    'market.liquidity': '流动性',
    'market.price': '价格',
    'market.volume': '交易量',
    'market.holders': '持币人数',
    
    // 闪卖
    'flashsell.title': '闪卖',
    'flashsell.amount': '数量',
    'flashsell.slippage': '滑点',
    
    // 收益统计
    'profit.title': '收益统计',
    'profit.total': '总收益',
    'profit.today': '今日收益',
    'profit.history': '历史收益',
    'profit.transactions': '交易次数',
    
    // 热点监控
    'hotspot.title': '热点监控',
    'hotspot.start': '开始监控',
    'hotspot.stop': '停止监控',
    'hotspot.status': '监控状态',
    'hotspot.hotspots': '热点',
    'hotspot.alerts': '警报',
    'hotspot.trending': '热门',
    'hotspot.critical': '紧急',
    'hotspot.high': '高',
    'hotspot.medium': '中',
    'hotspot.low': '低',
    'hotspot.twitter': 'Twitter',
    'hotspot.telegram': 'Telegram',
    'hotspot.discord': 'Discord',
    'hotspot.bsc': 'BSC',
    'hotspot.solana': 'Solana',
    'hotspot.dex': 'DEX',
    
    // 热点来源
    'hotspot.source.social': '社交媒体',
    'hotspot.source.onchain': '链上数据',
    'hotspot.source.dex': 'DEX',
    
    // 热点评分
    'hotspot.score.social': '社媒热度',
    'hotspot.score.onchain': '链上活跃',
    'hotspot.score.volume': '交易量',
    'hotspot.score.influencer': 'KOL参与',
    'hotspot.score.total': '综合评分',
    
    // 警报
    'alert.acknowledge': '确认',
    'alert.clear': '清除已确认',
    'alert.new': '新警报',
    
    // 设置
    'settings.title': '设置',
    'settings.theme': '主题设置',
    'settings.language': '语言设置',
    'settings.notifications': '通知设置',
    'settings.security': '安全设置',
    'settings.advanced': '高级设置',
    
    // 帮助
    'help.title': '帮助',
    'help.documentation': '文档',
    'help.tutorials': '教程',
    'help.faq': '常见问题',
    'help.contact': '联系我们',
    'help.feedback': '反馈',
    
    // API集成
    'api.twitter.title': 'Twitter API',
    'api.twitter.description': '集成Twitter API进行社交媒体监控',
    'api.twitter.apiKey': 'API密钥',
    'api.twitter.apiSecret': 'API密钥',
    'api.twitter.accessToken': '访问令牌',
    'api.twitter.accessSecret': '访问密钥',
    'api.twitter.bearerToken': 'Bearer Token',
    
    'api.telegram.title': 'Telegram API',
    'api.telegram.description': '集成Telegram Bot API进行频道监控',
    'api.telegram.botToken': 'Bot Token',
    'api.telegram.channels': '监控频道',
    
    'api.discord.title': 'Discord API',
    'api.discord.description': '集成Discord Webhook进行社区监控',
    'api.discord.webhookUrl': 'Webhook URL',
    'api.discord.servers': '服务器',
    'api.discord.channels': '频道',
    
    'api.bsc.title': 'BSC RPC',
    'api.bsc.description': '配置BSC RPC节点进行链上数据监控',
    'api.bsc.rpcUrl': 'RPC URL',
    'api.bsc.wsUrl': 'WebSocket URL',
    
    'api.solana.title': 'Solana RPC',
    'api.solana.description': '配置Solana RPC节点进行链上数据监控',
    'api.solana.rpcUrl': 'RPC URL',
    'api.solana.wsUrl': 'WebSocket URL',
    
    'api.dex.title': 'DEX API',
    'api.dex.description': '配置DEX API进行交易数据监控',
    'api.dex.pancakeSwap': 'PancakeSwap API',
    'api.dex.raydium': 'Raydium API',
    'api.dex.orca': 'Orca API',
    'api.dex.jupiter': 'Jupiter API',
  },
  
  'en-US': {
    // Common
    'app.title': 'Meme Master Pro',
    'app.subtitle': 'All-in-One Meme Token Management Platform',
    'common.loading': 'Loading...',
    'common.success': 'Success',
    'common.error': 'Error',
    'common.cancel': 'Cancel',
    'common.confirm': 'Confirm',
    'common.save': 'Save',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.view': 'View',
    'common.search': 'Search',
    'common.filter': 'Filter',
    'common.export': 'Export',
    'common.import': 'Import',
    'common.refresh': 'Refresh',
    'common.close': 'Close',
    
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.wallets': 'Wallets',
    'nav.launch': 'Launch',
    'nav.tasks': 'Tasks',
    'nav.market': 'Market Cap',
    'nav.flashsell': 'Flash Sell',
    'nav.profit': 'Profit',
    'nav.hotspot': 'Hotspot Monitor',
    
    // Theme
    'theme.light': 'Light Theme',
    'theme.dark': 'Dark Theme',
    'theme.auto': 'Auto Theme',
    'theme.toggle': 'Toggle Theme',
    
    // Language
    'language.zh-CN': '中文',
    'language.en-US': 'English',
    
    // System Status
    'status.online': 'Online',
    'status.offline': 'Offline',
    'status.error': 'Error',
    'status.pending': 'Pending',
    'status.running': 'Running',
    'status.completed': 'Completed',
    'status.failed': 'Failed',
    
    // Wallet Management
    'wallet.title': 'Wallet Management',
    'wallet.create': 'Create Wallet',
    'wallet.import': 'Import Wallet',
    'wallet.export': 'Export Wallet',
    'wallet.delete': 'Delete Wallet',
    'wallet.balance': 'Balance',
    'wallet.address': 'Address',
    'wallet.privateKey': 'Private Key',
    'wallet.network': 'Network',
    
    // Launch
    'launch.title': 'Launch Token',
    'launch.bsc': 'BSC Launch',
    'launch.solana': 'Solana Launch',
    'launch.bundle': 'Bundle Buy',
    'launch.name': 'Token Name',
    'launch.symbol': 'Token Symbol',
    'launch.supply': 'Total Supply',
    'launch.liquidity': 'Liquidity',
    'launch.price': 'Price',
    
    // Market Cap
    'market.title': 'Market Cap Management',
    'market.liquidity': 'Liquidity',
    'market.price': 'Price',
    'market.volume': 'Volume',
    'market.holders': 'Holders',
    
    // Flash Sell
    'flashsell.title': 'Flash Sell',
    'flashsell.amount': 'Amount',
    'flashsell.slippage': 'Slippage',
    
    // Profit
    'profit.title': 'Profit Statistics',
    'profit.total': 'Total Profit',
    'profit.today': 'Today Profit',
    'profit.history': 'History Profit',
    'profit.transactions': 'Transactions',
    
    // Hotspot Monitor
    'hotspot.title': 'Hotspot Monitor',
    'hotspot.start': 'Start Monitoring',
    'hotspot.stop': 'Stop Monitoring',
    'hotspot.status': 'Monitoring Status',
    'hotspot.hotspots': 'Hotspots',
    'hotspot.alerts': 'Alerts',
    'hotspot.trending': 'Trending',
    'hotspot.critical': 'Critical',
    'hotspot.high': 'High',
    'hotspot.medium': 'Medium',
    'hotspot.low': 'Low',
    'hotspot.twitter': 'Twitter',
    'hotspot.telegram': 'Telegram',
    'hotspot.discord': 'Discord',
    'hotspot.bsc': 'BSC',
    'hotspot.solana': 'Solana',
    'hotspot.dex': 'DEX',
    
    // Hotspot Source
    'hotspot.source.social': 'Social Media',
    'hotspot.source.onchain': 'Onchain Data',
    'hotspot.source.dex': 'DEX',
    
    // Hotspot Score
    'hotspot.score.social': 'Social',
    'hotspot.score.onchain': 'Onchain',
    'hotspot.score.volume': 'Volume',
    'hotspot.score.influencer': 'Influencer',
    'hotspot.score.total': 'Total Score',
    
    // Alerts
    'alert.acknowledge': 'Acknowledge',
    'alert.clear': 'Clear Acknowledged',
    'alert.new': 'New Alert',
    
    // Settings
    'settings.title': 'Settings',
    'settings.theme': 'Theme Settings',
    'settings.language': 'Language Settings',
    'settings.notifications': 'Notification Settings',
    'settings.security': 'Security Settings',
    'settings.advanced': 'Advanced Settings',
    
    // Help
    'help.title': 'Help',
    'help.documentation': 'Documentation',
    'help.tutorials': 'Tutorials',
    'help.faq': 'FAQ',
    'help.contact': 'Contact Us',
    'help.feedback': 'Feedback',
    
    // API Integration
    'api.twitter.title': 'Twitter API',
    'api.twitter.description': 'Integrate Twitter API for social media monitoring',
    'api.twitter.apiKey': 'API Key',
    'api.twitter.apiSecret': 'API Secret',
    'api.twitter.accessToken': 'Access Token',
    'api.twitter.accessSecret': 'Access Secret',
    'api.twitter.bearerToken': 'Bearer Token',
    
    'api.telegram.title': 'Telegram API',
    'api.telegram.description': 'Integrate Telegram Bot API for channel monitoring',
    'api.telegram.botToken': 'Bot Token',
    'api.telegram.channels': 'Monitored Channels',
    
    'api.discord.title': 'Discord API',
    'api.discord.description': 'Integrate Discord Webhook for community monitoring',
    'api.discord.webhookUrl': 'Webhook URL',
    'api.discord.servers': 'Servers',
    'api.discord.channels': 'Channels',
    
    'api.bsc.title': 'BSC RPC',
    'api.bsc.description': 'Configure BSC RPC nodes for onchain data monitoring',
    'api.bsc.rpcUrl': 'RPC URL',
    'api.bsc.wsUrl': 'WebSocket URL',
    
    'api.solana.title': 'Solana RPC',
    'api.solana.description': 'Configure Solana RPC nodes for onchain data monitoring',
    'api.solana.rpcUrl': 'RPC URL',
    'api.solana.wsUrl': 'WebSocket URL',
    
    'api.dex.title': 'DEX API',
    'api.dex.description': 'Configure DEX APIs for trading data monitoring',
    'api.dex.pancakeSwap': 'PancakeSwap API',
    'api.dex.raydium': 'Raydium API',
    'api.dex.orca': 'Orca API',
    'api.dex.jupiter': 'Jupiter API',
  }
}

/**
 * 国际化提供者组件
 */
export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<LanguageType>(() => {
    const saved = localStorage.getItem('language') as LanguageType
    return saved || 'zh-CN'
  })

  useEffect(() => {
    localStorage.setItem('language', language)
    document.documentElement.lang = language
  }, [language])

  const t = (key: string, params?: Record<string, any>): string => {
    let translation = translations[language][key]
    
    if (!translation) {
      console.warn(`Translation key "${key}" not found for language "${language}"`)
      return key
    }
    
    // 参数替换
    if (params) {
      Object.keys(params).forEach(param => {
        translation = translation.replace(`{${param}}`, params[param])
      })
    }
    
    return translation
  }

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  )
}

/**
 * 使用国际化的 Hook
 */
export const useI18n = (): I18nContextType => {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider')
  }
  return context
}
