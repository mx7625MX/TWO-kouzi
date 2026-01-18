import { ethers } from 'ethers'
import { RPC_ENDPOINTS } from './constants'

/**
 * BSC网络提供者缓存
 */
let cachedProvider: ethers.JsonRpcProvider | null = null
let currentProviderIndex = 0

/**
 * 获取可用的BSC网络提供者（带故障切换）
 * @returns Promise<ethers.JsonRpcProvider> 可用的提供者实例
 * @throws Error 当所有RPC节点均不可用时抛出错误
 */
async function getProvider(): Promise<ethers.JsonRpcProvider> {
  // 如果有缓存的提供者，尝试使用
  if (cachedProvider) {
    try {
      // 测试连接
      await cachedProvider.getBlockNumber()
      return cachedProvider
    } catch (error) {
      console.warn('缓存的BSC提供者不可用，尝试切换节点')
      cachedProvider = null
    }
  }

  // 尝试所有RPC节点
  const startIndex = currentProviderIndex
  const endpoints = RPC_ENDPOINTS.BSC

  for (let i = 0; i < endpoints.length; i++) {
    const index = (startIndex + i) % endpoints.length
    const url = endpoints[index]

    try {
      console.log(`尝试连接BSC节点 ${index + 1}/${endpoints.length}:`, url)
      
      const provider = new ethers.JsonRpcProvider(url)
      
      // 测试连接
      await Promise.race([
        provider.getBlockNumber(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('连接超时')), 10000)
        )
      ])

      // 连接成功
      console.log(`BSC节点 ${index + 1} 连接成功`)
      cachedProvider = provider
      currentProviderIndex = index
      return provider
    } catch (error: any) {
      console.error(`BSC节点 ${url} 不可用:`, error.message)
    }
  }

  // 所有节点均失败
  throw new Error('所有BSC RPC节点均不可用，请检查网络连接')
}

/**
 * 查询BSC钱包余额
 * @param address 钱包地址
 * @returns Promise<string> 返回BNB余额（以BNB为单位）
 * @throws Error 当地址无效或查询失败时抛出错误
 */
export async function getBSCBalance(address: string): Promise<string> {
  try {
    // 验证地址格式
    if (!address || typeof address !== 'string') {
      throw new Error('钱包地址不能为空')
    }

    // 验证是否为有效的以太坊地址
    if (!ethers.isAddress(address)) {
      throw new Error('无效的钱包地址格式')
    }

    // 获取可用的提供者
    const provider = await getProvider()

    // 查询余额（返回值为Wei单位）
    const balanceWei = await provider.getBalance(address)

    // 将Wei转换为BNB
    const balanceBNB = ethers.formatEther(balanceWei)

    return balanceBNB
  } catch (error: any) {
    // 地址验证错误
    if (error.message?.includes('无效的钱包地址') || error.message?.includes('不能为空')) {
      throw error
    }

    // RPC节点故障错误
    if (error.message?.includes('所有BSC RPC节点均不可用')) {
      throw error
    }

    // 网络错误
    if (error.code === 'NETWORK_ERROR' || error.code === 'TIMEOUT' || error.message?.includes('连接超时')) {
      // 清除缓存，下次尝试新的节点
      cachedProvider = null
      throw new Error('网络连接失败，请检查网络设置')
    }

    // RPC错误
    if (error.code === 'SERVER_ERROR') {
      // 清除缓存，下次尝试新的节点
      cachedProvider = null
      throw new Error('BSC节点服务异常，请稍后重试')
    }

    // 其他未知错误
    throw new Error(`查询余额失败: ${error.message || '未知错误'}`)
  }
}

/**
 * 批量查询多个BSC钱包余额
 * @param addresses 钱包地址数组
 * @returns Promise<Map<string, string>> 返回地址到余额的映射
 */
export async function getBSCBalanceBatch(
  addresses: string[]
): Promise<Map<string, string>> {
  const results = new Map<string, string>()

  // 并发查询所有地址
  const promises = addresses.map(async (address) => {
    try {
      const balance = await getBSCBalance(address)
      results.set(address, balance)
    } catch (error: any) {
      console.error(`查询地址 ${address} 失败:`, error.message)
      results.set(address, '0')
    }
  })

  await Promise.all(promises)
  return results
}

/**
 * 格式化余额显示
 * @param balance 余额字符串
 * @param decimals 保留小数位数，默认4位
 * @returns 格式化后的余额字符串
 */
export function formatBalance(balance: string, decimals: number = 4): string {
  try {
    const num = parseFloat(balance)
    return num.toFixed(decimals)
  } catch {
    return '0.0000'
  }
}
