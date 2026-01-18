/**
 * 系统配置管理模块
 * 管理应用的全局配置、环境变量和用户设置
 */

import { app } from 'electron'
import path from 'path'
import fs from 'fs'
import os from 'os'

// ============== 类型定义 ==============

export interface AppConfig {
  // RPC配置
  rpc: {
    bsc: {
      mainnet: string
      testnet: string
      flashbots: string
    }
    solana: {
      mainnet: string
      testnet: string
      jito: string
    }
  }
  
  // DEX配置
  dex: {
    bsc: {
      pancakeSwap: {
        router: string
        factory: string
      }
      fourMeme: {
        factory: string
      }
    }
    solana: {
      raydium: {
        poolId: string
      }
      pumpFun: {
        programId: string
      }
      jupiter: {
        programId: string
      }
    }
  }
  
  // Gas配置
  gas: {
    bsc: {
      defaultGasPrice: string
      maxGasPrice: string
      gasLimit: number
    }
    solana: {
      defaultPriorityFee: string
      maxPriorityFee: string
      computeUnitLimit: number
    }
  }
  
  // 安全配置
  security: {
    encryption: {
      algorithm: string
      keyDerivationIterations: number
    }
    password: {
      minLength: number
      requireUppercase: boolean
      requireLowercase: boolean
      requireNumbers: boolean
      requireSpecialChars: boolean
    }
  }
  
  // 性能配置
  performance: {
    maxConcurrentTasks: number
    taskQueueSize: number
    priceUpdateInterval: number
    retryAttempts: number
    retryDelay: number
  }
  
  // UI配置
  ui: {
    theme: 'light' | 'dark' | 'auto'
    language: string
    autoRefreshInterval: number
    notificationEnabled: boolean
  }
  
  // 日志配置
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error'
    maxFileSize: number
    maxFiles: number
    directory: string
  }
}

export interface UserSettings {
  // 默认网络
  defaultNetwork: 'bsc' | 'solana'
  
  // 默认钱包
  defaultWalletId?: string
  
  // 交易默认值
  tradingDefaults: {
    slippageTolerance: number
    maxTradeAmount: string
    gasPriceMultiplier: number
  }
  
  // 通知设置
  notifications: {
    enabled: boolean
    types: {
      taskCompleted: boolean
      taskFailed: boolean
      priceAlert: boolean
      profitAlert: boolean
      errorAlert: boolean
    }
  }
  
  // 自动化设置
  automation: {
    autoTakeProfitEnabled: boolean
    autoStopLossEnabled: boolean
    emergencyStopEnabled: boolean
  }
  
  // 显示设置
  display: {
    showAdvancedOptions: boolean
    showGasDetails: boolean
    showTransactionDetails: boolean
    showProfitPercentage: boolean
  }
}

// ============== 配置管理类 ==============

class ConfigManager {
  private configPath: string
  private settingsPath: string
  private config: AppConfig
  private settings: UserSettings

  constructor() {
    // 配置文件路径
    const userDataPath = app.getPath('userData')
    this.configPath = path.join(userDataPath, 'config.json')
    this.settingsPath = path.join(userDataPath, 'settings.json')

    // 加载配置
    this.config = this.loadConfig()
    this.settings = this.loadSettings()
  }

  /**
   * 加载应用配置
   */
  private loadConfig(): AppConfig {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = fs.readFileSync(this.configPath, 'utf-8')
        return JSON.parse(data)
      }
    } catch (error) {
      console.error('加载配置文件失败:', error)
    }

    // 返回默认配置
    return this.getDefaultConfig()
  }

  /**
   * 加载用户设置
   */
  private loadSettings(): UserSettings {
    try {
      if (fs.existsSync(this.settingsPath)) {
        const data = fs.readFileSync(this.settingsPath, 'utf-8')
        return JSON.parse(data)
      }
    } catch (error) {
      console.error('加载设置文件失败:', error)
    }

    // 返回默认设置
    return this.getDefaultSettings()
  }

  /**
   * 获取默认配置
   */
  private getDefaultConfig(): AppConfig {
    return {
      rpc: {
        bsc: {
          mainnet: 'https://bsc-dataseed.binance.org/',
          testnet: 'https://data-seed-prebsc-1-s1.binance.org:8545/',
          flashbots: 'https://relay.flashbots.net'
        },
        solana: {
          mainnet: 'https://api.mainnet-beta.solana.com',
          testnet: 'https://api.devnet.solana.com',
          jito: 'https://mainnet.block-engine.jito.wtf/api/v1/transactions'
        }
      },
      dex: {
        bsc: {
          pancakeSwap: {
            router: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
            factory: '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73'
          },
          fourMeme: {
            factory: '0x0a6B8e3b6F3687f6b0c0eF6f2b0eA7C6f1d2e3f4'
          }
        },
        solana: {
          raydium: {
            poolId: '58oQChx4yWmvKdwLLZzBi4ChoCc2fqCU2kwizw2fD5Mj'
          },
          pumpFun: {
            programId: '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P'
          },
          jupiter: {
            programId: 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4'
          }
        }
      },
      gas: {
        bsc: {
          defaultGasPrice: '5000000000', // 5 Gwei
          maxGasPrice: '20000000000', // 20 Gwei
          gasLimit: 300000
        },
        solana: {
          defaultPriorityFee: '0.000001', // 0.000001 SOL
          maxPriorityFee: '0.00001', // 0.00001 SOL
          computeUnitLimit: 200000
        }
      },
      security: {
        encryption: {
          algorithm: 'aes-256-gcm',
          keyDerivationIterations: 100000
        },
        password: {
          minLength: 8,
          requireUppercase: true,
          requireLowercase: true,
          requireNumbers: true,
          requireSpecialChars: false
        }
      },
      performance: {
        maxConcurrentTasks: 5,
        taskQueueSize: 100,
        priceUpdateInterval: 5000,
        retryAttempts: 3,
        retryDelay: 2000
      },
      ui: {
        theme: 'auto',
        language: 'zh-CN',
        autoRefreshInterval: 5000,
        notificationEnabled: true
      },
      logging: {
        level: 'info',
        maxFileSize: 10485760, // 10MB
        maxFiles: 5,
        directory: path.join(app.getPath('userData'), 'logs')
      }
    }
  }

  /**
   * 获取默认用户设置
   */
  private getDefaultSettings(): UserSettings {
    return {
      defaultNetwork: 'bsc',
      tradingDefaults: {
        slippageTolerance: 5, // 5%
        maxTradeAmount: '1', // 1 BNB/SOL
        gasPriceMultiplier: 1.2
      },
      notifications: {
        enabled: true,
        types: {
          taskCompleted: true,
          taskFailed: true,
          priceAlert: true,
          profitAlert: true,
          errorAlert: true
        }
      },
      automation: {
        autoTakeProfitEnabled: false,
        autoStopLossEnabled: false,
        emergencyStopEnabled: true
      },
      display: {
        showAdvancedOptions: false,
        showGasDetails: true,
        showTransactionDetails: true,
        showProfitPercentage: true
      }
    }
  }

  /**
   * 保存配置
   */
  saveConfig(): void {
    try {
      // 确保目录存在
      const configDir = path.dirname(this.configPath)
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true })
      }

      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2))
      console.log('配置已保存到:', this.configPath)
    } catch (error) {
      console.error('保存配置失败:', error)
      throw error
    }
  }

  /**
   * 保存用户设置
   */
  saveSettings(): void {
    try {
      // 确保目录存在
      const settingsDir = path.dirname(this.settingsPath)
      if (!fs.existsSync(settingsDir)) {
        fs.mkdirSync(settingsDir, { recursive: true })
      }

      fs.writeFileSync(this.settingsPath, JSON.stringify(this.settings, null, 2))
      console.log('设置已保存到:', this.settingsPath)
    } catch (error) {
      console.error('保存设置失败:', error)
      throw error
    }
  }

  // ============== 应用配置方法 ==============

  /**
   * 获取应用配置
   */
  getConfig(): AppConfig {
    return { ...this.config }
  }

  /**
   * 更新应用配置
   */
  updateConfig(config: Partial<AppConfig>): void {
    this.config = { ...this.config, ...config }
    this.saveConfig()
  }

  /**
   * 获取RPC地址
   */
  getRPC(network: 'bsc' | 'solana', chain: 'mainnet' | 'testnet' = 'mainnet'): string {
    return this.config.rpc[network][chain]
  }

  /**
   * 获取DEX地址
   */
  getDEXAddress(network: 'bsc' | 'solana', dex: string, key: string): string {
    return this.config.dex[network][dex][key]
  }

  /**
   * 获取Gas配置
   */
  getGasConfig(network: 'bsc' | 'solana') {
    return this.config.gas[network]
  }

  // ============== 用户设置方法 ==============

  /**
   * 获取用户设置
   */
  getSettings(): UserSettings {
    return { ...this.settings }
  }

  /**
   * 更新用户设置
   */
  updateSettings(settings: Partial<UserSettings>): void {
    this.settings = { ...this.settings, ...settings }
    this.saveSettings()
  }

  /**
   * 获取默认网络
   */
  getDefaultNetwork(): 'bsc' | 'solana' {
    return this.settings.defaultNetwork
  }

  /**
   * 设置默认网络
   */
  setDefaultNetwork(network: 'bsc' | 'solana'): void {
    this.settings.defaultNetwork = network
    this.saveSettings()
  }

  /**
   * 获取默认钱包
   */
  getDefaultWalletId(): string | undefined {
    return this.settings.defaultWalletId
  }

  /**
   * 设置默认钱包
   */
  setDefaultWalletId(walletId: string): void {
    this.settings.defaultWalletId = walletId
    this.saveSettings()
  }

  /**
   * 获取交易默认值
   */
  getTradingDefaults() {
    return this.settings.tradingDefaults
  }

  /**
   * 更新交易默认值
   */
  updateTradingDefaults(defaults: Partial<UserSettings['tradingDefaults']>): void {
    this.settings.tradingDefaults = { ...this.settings.tradingDefaults, ...defaults }
    this.saveSettings()
  }

  // ============== 重置方法 ==============

  /**
   * 重置为默认配置
   */
  resetConfig(): void {
    this.config = this.getDefaultConfig()
    this.saveConfig()
  }

  /**
   * 重置为默认设置
   */
  resetSettings(): void {
    this.settings = this.getDefaultSettings()
    this.saveSettings()
  }

  /**
   * 重置所有配置
   */
  resetAll(): void {
    this.resetConfig()
    this.resetSettings()
  }
}

// ============== 导出单例 ==============

export const configManager = new ConfigManager()
