/**
 * 环境变量管理模块
 * 用于安全地存储和访问环境变量和敏感配置
 */

import { app } from 'electron'
import path from 'path'
import fs from 'fs'
import { decrypt, encrypt } from '../shared/cryptoUtils'

/**
 * 环境变量接口
 */
interface EnvironmentConfig {
  // API Keys
  OPENAI_API_KEY?: string
  TWITTER_API_KEY?: string
  TWITTER_API_SECRET?: string
  TELEGRAM_BOT_TOKEN?: string
  REDDIT_CLIENT_ID?: string
  REDDIT_CLIENT_SECRET?: string

  // RPC Endpoints
  BSC_RPC_URL?: string
  SOLANA_RPC_URL?: string

  // Flashbots
  FLASHBOTS_ENDPOINT?: string

  // Jito
  JITO_ENDPOINT?: string

  // Database
  DB_PATH?: string
}

/**
 * 环境变量管理器类
 */
class EnvironmentManager {
  private configPath: string
  private encryptedConfig: string = ''
  private masterPassword: string = ''
  private cache: EnvironmentConfig = {}

  constructor() {
    // 将环境配置存储在用户数据目录
    const userDataPath = app.getPath('userData')
    this.configPath = path.join(userDataPath, '.env.encrypted')

    // 确保目录存在
    const dir = path.dirname(this.configPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    // 尝试从文件加载加密配置
    this.loadEncryptedConfig()
  }

  /**
   * 初始化环境管理器
   * @param masterPassword 主密码，用于加密/解密环境配置
   */
  initialize(masterPassword: string): void {
    this.masterPassword = masterPassword

    if (this.encryptedConfig) {
      try {
        this.cache = this.decryptConfig(this.encryptedConfig, masterPassword)
      } catch (error) {
        console.error('解密环境配置失败，可能密码不正确')
        this.cache = {}
      }
    }
  }

  /**
   * 加载加密的配置文件
   */
  private loadEncryptedConfig(): void {
    try {
      if (fs.existsSync(this.configPath)) {
        this.encryptedConfig = fs.readFileSync(this.configPath, 'utf-8')
      }
    } catch (error) {
      console.error('加载环境配置失败:', error)
    }
  }

  /**
   * 保存加密的配置文件
   */
  private saveEncryptedConfig(): void {
    try {
      if (this.masterPassword) {
        const encrypted = this.encryptConfig(this.cache, this.masterPassword)
        fs.writeFileSync(this.configPath, encrypted, 'utf-8')
      }
    } catch (error) {
      console.error('保存环境配置失败:', error)
      throw new Error('保存环境配置失败')
    }
  }

  /**
   * 加密配置
   */
  private encryptConfig(config: EnvironmentConfig, password: string): string {
    return encrypt(JSON.stringify(config), password)
  }

  /**
   * 解密配置
   */
  private decryptConfig(encrypted: string, password: string): EnvironmentConfig {
    try {
      const json = decrypt(encrypted, password)
      return JSON.parse(json)
    } catch (error) {
      throw new Error('解密失败')
    }
  }

  /**
   * 获取环境变量
   * @param key 键名
   * @param defaultValue 默认值
   */
  get(key: keyof EnvironmentConfig, defaultValue?: string): string | undefined {
    // 优先从缓存获取
    if (this.cache[key]) {
      return this.cache[key]
    }

    // 其次从进程环境变量获取
    const envValue = process.env[key]
    if (envValue) {
      return envValue
    }

    // 返回默认值
    return defaultValue
  }

  /**
   * 设置环境变量
   * @param key 键名
   * @param value 值
   */
  set(key: keyof EnvironmentConfig, value: string): void {
    this.cache[key] = value
    this.saveEncryptedConfig()
  }

  /**
   * 批量设置环境变量
   * @param config 配置对象
   */
  setAll(config: Partial<EnvironmentConfig>): void {
    this.cache = { ...this.cache, ...config }
    this.saveEncryptedConfig()
  }

  /**
   * 获取所有环境变量
   */
  getAll(): EnvironmentConfig {
    return { ...this.cache }
  }

  /**
   * 删除环境变量
   * @param key 键名
   */
  delete(key: keyof EnvironmentConfig): void {
    delete this.cache[key]
    this.saveEncryptedConfig()
  }

  /**
   * 清除所有环境变量
   */
  clear(): void {
    this.cache = {}
    this.saveEncryptedConfig()
  }

  /**
   * 检查配置是否存在
   */
  exists(): boolean {
    return fs.existsSync(this.configPath)
  }

  /**
   * 验证密码是否正确
   * @param password 密码
   */
  verifyPassword(password: string): boolean {
    if (!this.encryptedConfig) {
      return true // 如果没有加密配置，任何密码都有效
    }

    try {
      this.decryptConfig(this.encryptedConfig, password)
      return true
    } catch (error) {
      return false
    }
  }

  /**
   * 更改主密码
   * @param oldPassword 旧密码
   * @param newPassword 新密码
   */
  changePassword(oldPassword: string, newPassword: string): void {
    try {
      // 验证旧密码
      if (this.encryptedConfig) {
        const decrypted = this.decryptConfig(this.encryptedConfig, oldPassword)
        this.cache = decrypted
      }

      // 更新密码
      this.masterPassword = newPassword

      // 使用新密码保存
      this.saveEncryptedConfig()
    } catch (error) {
      throw new Error('旧密码不正确')
    }
  }
}

// 导出单例实例
export const envManager = new EnvironmentManager()

/**
 * 辅助函数：从环境变量或配置管理器获取值
 */
export function getEnv(key: keyof EnvironmentConfig, defaultValue?: string): string | undefined {
  return envManager.get(key, defaultValue)
}

/**
 * 辅助函数：设置环境变量
 */
export function setEnv(key: keyof EnvironmentConfig, value: string): void {
  envManager.set(key, value)
}
