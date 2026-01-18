import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { RPC_ENDPOINTS } from './constants'

/**
 * Solana网络提供者缓存
 */
let cachedConnection: Connection | null = null
let currentEndpointIndex = 0

/**
 * 获取可用的Solana网络连接（带故障切换）
 * @returns Promise<Connection> 可用的连接实例
 * @throws Error 当所有RPC节点均不可用时抛出错误
 */
async function getConnection(): Promise<Connection> {
  // 如果有缓存的连接，尝试使用
  if (cachedConnection) {
    try {
      // 测试连接
      await Promise.race([
        cachedConnection.getLatestBlockhash(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('连接超时')), 10000)
        )
      ])
      return cachedConnection
    } catch (error) {
      console.warn('缓存的Solana连接不可用，尝试切换节点')
      cachedConnection = null
    }
  }

  // 尝试所有RPC节点
  const startIndex = currentEndpointIndex
  const endpoints = RPC_ENDPOINTS.Solana

  for (let i = 0; i < endpoints.length; i++) {
    const index = (startIndex + i) % endpoints.length
    const url = endpoints[index]

    try {
      console.log(`尝试连接Solana节点 ${index + 1}/${endpoints.length}:`, url)
      
      const connection = new Connection(url, 'confirmed')
      
      // 测试连接
      await Promise.race([
        connection.getLatestBlockhash(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('连接超时')), 10000)
        )
      ])

      // 连接成功
      console.log(`Solana节点 ${index + 1} 连接成功`)
      cachedConnection = connection
      currentEndpointIndex = index
      return connection
    } catch (error: any) {
      console.error(`Solana节点 ${url} 不可用:`, error.message)
    }
  }

  // 所有节点均失败
  throw new Error('所有Solana RPC节点均不可用，请检查网络连接')
}

/**
 * 查询Solana钱包余额
 * @param address 钱包地址
 * @returns Promise<string> 返回SOL余额（以SOL为单位）
 * @throws Error 当地址无效或查询失败时抛出错误
 */
export async function getSolanaBalance(address: string): Promise<string> {
  try {
    // 验证地址格式
    if (!address || typeof address !== 'string') {
      throw new Error('钱包地址不能为空')
    }

    // 验证地址长度和格式
    if (address.length < 32 || address.length > 44) {
      throw new Error('无效的Solana钱包地址格式')
    }

    // 尝试创建公钥对象（会验证地址有效性）
    let publicKey: PublicKey
    try {
      publicKey = new PublicKey(address)
    } catch (error) {
      throw new Error('无效的Solana钱包地址格式')
    }

    // 获取可用的连接
    const connection = await getConnection()

    // 查询余额（返回值为lamports单位）
    const balanceLamports = await connection.getBalance(publicKey)

    // 将lamports转换为SOL (1 SOL = 1,000,000,000 lamports)
    const balanceSOL = balanceLamports / LAMPORTS_PER_SOL

    // 返回字符串格式的余额
    return balanceSOL.toString()
  } catch (error: any) {
    // 地址验证错误
    if (error.message?.includes('无效的Solana钱包地址') || error.message?.includes('不能为空')) {
      throw error
    }

    // RPC节点故障错误
    if (error.message?.includes('所有Solana RPC节点均不可用')) {
      throw error
    }

    // 网络连接错误
    if (error.message?.includes('fetch') || error.message?.includes('network') || error.message?.includes('连接超时')) {
      // 清除缓存，下次尝试新的节点
      cachedConnection = null
      throw new Error('网络连接失败，请检查网络设置')
    }

    // RPC错误
    if (error.message?.includes('429')) {
      // 清除缓存，下次尝试新的节点
      cachedConnection = null
      throw new Error('请求过于频繁，请稍后重试')
    }

    if (error.message?.includes('500') || error.message?.includes('503')) {
      // 清除缓存，下次尝试新的节点
      cachedConnection = null
      throw new Error('Solana节点服务异常，请稍后重试')
    }

    // 其他未知错误
    throw new Error(`查询余额失败: ${error.message || '未知错误'}`)
  }
}

/**
 * 批量查询多个Solana钱包余额
 * @param addresses 钱包地址数组
 * @returns Promise<Map<string, string>> 返回地址到余额的映射
 */
export async function getSolanaBalanceBatch(
  addresses: string[]
): Promise<Map<string, string>> {
  const results = new Map<string, string>()

  if (!addresses || addresses.length === 0) {
    return results
  }

  // 获取连接
  const connection = await getConnection()

  // 验证并转换所有地址为PublicKey
  const validAddresses: Array<{ address: string; publicKey: PublicKey }> = []

  for (const address of addresses) {
    try {
      const publicKey = new PublicKey(address)
      validAddresses.push({ address, publicKey })
    } catch (error) {
      console.error(`无效地址 ${address}:`, error)
      results.set(address, '0')
    }
  }

  // 批量查询余额
  try {
    const publicKeys = validAddresses.map((item) => item.publicKey)
    const balances = await connection.getMultipleAccountsInfo(publicKeys)

    balances.forEach((accountInfo, index) => {
      const { address } = validAddresses[index]
      if (accountInfo) {
        const balanceSOL = accountInfo.lamports / LAMPORTS_PER_SOL
        results.set(address, balanceSOL.toString())
      } else {
        results.set(address, '0')
      }
    })
  } catch (error: any) {
    console.error('批量查询失败:', error.message)
    // 如果批量查询失败，逐个查询
    for (const { address } of validAddresses) {
      try {
        const balance = await getSolanaBalance(address)
        results.set(address, balance)
      } catch (error) {
        results.set(address, '0')
      }
    }
  }

  return results
}

/**
 * 格式化余额显示
 * @param balance 余额字符串
 * @param decimals 保留小数位数，默认4位
 * @returns 格式化后的余额字符串
 */
export function formatSolanaBalance(balance: string, decimals: number = 4): string {
  try {
    const num = parseFloat(balance)
    return num.toFixed(decimals)
  } catch {
    return '0.0000'
  }
}

/**
 * 验证Solana地址格式
 * @param address 钱包地址
 * @returns boolean 地址是否有效
 */
export function isValidSolanaAddress(address: string): boolean {
  try {
    new PublicKey(address)
    return true
  } catch {
    return false
  }
}
