/**
 * BSC捆绑买入功能
 * 支持多钱包批量买入新发行的代币
 */

import { ethers, Contract, Signer, parseUnits, formatUnits } from 'ethers'
import { ExtendedDatabase } from '../database-extended'
import * as bscUtils from '../bscUtils'

// PancakeSwap Router ABI (简化版)
const PANCAKESWAP_ROUTER_ABI = [
  'function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)',
  'function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)',
  'function WETH() external pure returns (address)'
]

// BEP20 ABI (转账相关)
const BEP20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)',
  'function transfer(address recipient, uint256 amount) external returns (bool)',
  'event Transfer(address indexed from, address indexed to, uint256 value)'
]

/**
 * 捆绑买入参数
 */
export interface BSCBundleBuyParams {
  tokenAddress: string
  walletAddresses: string[]
  privateKey: string
  amountPerWallet: string
  slippage: number
  routerAddress: string
  rpcUrl: string
  useMEVProtection?: boolean
}

/**
 * 单次买入结果
 */
export interface SingleBuyResult {
  walletAddress: string
  txHash: string
  amountIn: string
  amountOut: string
  gasUsed: string
  status: 'success' | 'failed'
  error?: string
}

/**
 * 捆绑买入结果
 */
export interface BundleBuyResult {
  batchId: string
  results: SingleBuyResult[]
  summary: {
    totalWallets: number
    successful: number
    failed: number
    totalAmountIn: string
    totalAmountOut: string
    totalGasUsed: string
  }
}

/**
 * 捆绑买入状态
 */
export interface BundleBuyStatus {
  batchId: string
  status: 'preparing' | 'approving' | 'executing' | 'confirming' | 'completed' | 'failed'
  currentIndex: number
  totalWallets: number
  currentStep: string
  results: SingleBuyResult[]
}

/**
 * BSC捆绑买入器类
 */
export class BSCBundleBuyer {
  private db: ExtendedDatabase
  private activeBundles: Map<string, BundleBuyStatus> = new Map()
  
  // PancakeSwap Router地址 (BSC主网)
  private readonly PANCAKESWAP_ROUTER = '0x10ED43C718714eb63d5aA57B78B54704E256024E'
  // WBNB地址
  private readonly WBNB_ADDRESS = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c'

  constructor(db: ExtendedDatabase) {
    this.db = db
  }

  /**
   * 执行捆绑买入
   */
  async executeBundleBuy(params: BSCBundleBuyParams): Promise<BundleBuyResult> {
    const batchId = `bundle_buy_${Date.now()}`

    // 初始化状态
    const status: BundleBuyStatus = {
      batchId,
      status: 'preparing',
      currentIndex: 0,
      totalWallets: params.walletAddresses.length,
      currentStep: 'Initializing bundle buy',
      results: []
    }
    this.activeBundles.set(batchId, status)

    const results: SingleBuyResult[] = []
    const summary = {
      totalWallets: params.walletAddresses.length,
      successful: 0,
      failed: 0,
      totalAmountIn: '0',
      totalAmountOut: '0',
      totalGasUsed: '0'
    }

    try {
      // 创建Provider
      const provider = new ethers.JsonRpcProvider(params.rpcUrl)
      const wallet = new ethers.Wallet(params.privateKey, provider)

      // 准备Router合约
      const routerContract = new ethers.Contract(
        params.routerAddress || this.PANCAKESWAP_ROUTER,
        PANCAKESWAP_ROUTER_ABI,
        wallet
      )

      // 准备Token合约
      const tokenContract = new ethers.Contract(
        params.tokenAddress,
        BEP20_ABI,
        provider
      )

      // 获取Token信息
      const tokenDecimals = await tokenContract.decimals()

      status.currentStep = 'Checking token information'
      this.updateBundleStatus(batchId, status)

      console.log(`Starting bundle buy for token: ${params.tokenAddress}`)
      console.log(`Total wallets: ${params.walletAddresses.length}`)
      console.log(`Amount per wallet: ${params.amountPerWallet} BNB`)

      // 批量买入
      for (let i = 0; i < params.walletAddresses.length; i++) {
        const walletAddress = params.walletAddresses[i]
        status.currentIndex = i
        status.status = 'executing'
        status.currentStep = `Processing wallet ${i + 1}/${params.walletAddresses.length}`
        this.updateBundleStatus(batchId, status)

        try {
          // 执行单次买入
          const result = await this.executeSingleBuy(
            routerContract,
            tokenContract,
            wallet,
            walletAddress,
            params.amountPerWallet,
            params.slippage,
            params.useMEVProtection || false,
            tokenDecimals
          )

          results.push(result)

          if (result.status === 'success') {
            summary.successful++
            summary.totalAmountIn = (parseFloat(summary.totalAmountIn) + parseFloat(result.amountIn)).toString()
            summary.totalAmountOut = (parseFloat(summary.totalAmountOut) + parseFloat(result.amountOut)).toString()
            summary.totalGasUsed = (parseFloat(summary.totalGasUsed) + parseFloat(result.gasUsed)).toString()
          } else {
            summary.failed++
          }

          // 记录交易到数据库
          this.db.insertTransaction({
            id: `${batchId}_${i}`,
            type: 'bundle_buy',
            network: 'BSC',
            token_address: params.tokenAddress,
            wallet_id: walletAddress,
            amount: result.amountOut,
            tx_hash: result.txHash,
            status: result.status === 'success' ? 'completed' : 'failed',
            gas_used: result.gasUsed,
            created_at: Date.now()
          })

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          const failedResult: SingleBuyResult = {
            walletAddress,
            txHash: '',
            amountIn: '0',
            amountOut: '0',
            gasUsed: '0',
            status: 'failed',
            error: errorMessage
          }

          results.push(failedResult)
          summary.failed++

          console.error(`Failed to buy for wallet ${walletAddress}:`, errorMessage)
        }

        // 短暂延迟,避免触发RPC限流
        await new Promise(resolve => setTimeout(resolve, 1000))
      }

      status.status = 'completed'
      status.currentStep = 'Bundle buy completed'
      status.results = results
      this.updateBundleStatus(batchId, status)

      const finalResult: BundleBuyResult = {
        batchId,
        results,
        summary
      }

      console.log('Bundle buy summary:', summary)
      return finalResult

    } catch (error) {
      status.status = 'failed'
      status.currentStep = 'Bundle buy failed'
      this.updateBundleStatus(batchId, status)
      throw error
    }
  }

  /**
   * 执行单次买入
   */
  private async executeSingleBuy(
    routerContract: Contract,
    tokenContract: Contract,
    wallet: Signer,
    toAddress: string,
    amountIn: string,
    slippage: number,
    useMEVProtection: boolean,
    tokenDecimals: number
  ): Promise<SingleBuyResult> {
    try {
      // 转换金额
      const amountInWei = parseUnits(amountIn, 18)
      
      // 计算最小输出量 (考虑滑点)
      const amountsOut = await routerContract.getAmountsOut(amountInWei, [
        this.WBNB_ADDRESS,
        await routerContract.WETH()
      ])
      const expectedOut = amountsOut[1]
      const amountOutMin = (expectedOut * BigInt(Math.floor((1 - slippage) * 10000))) / BigInt(10000)

      // 构建交易路径: WBNB -> Token
      const path = [this.WBNB_ADDRESS, await routerContract.target]

      // 设置截止时间 (当前时间 + 20分钟)
      const deadline = Math.floor(Date.now() / 1000) + 1200

      // 执行交换
      const tx = await routerContract.swapExactETHForTokens(
        amountOutMin,
        path,
        toAddress,
        deadline,
        {
          value: amountInWei,
          gasLimit: 300000,
          gasPrice: useMEVProtection 
            ? parseUnits('5', 'gwei') // MEV保护时使用固定gas价格
            : await this.getOptimalGasPrice(routerContract.runner)
        }
      )

      // 等待确认
      const receipt = await tx.wait()

      // 计算实际获得的代币数量
      const tokenBalance = await tokenContract.balanceOf(toAddress)
      const amountOut = formatUnits(tokenBalance, tokenDecimals)

      return {
        walletAddress: toAddress,
        txHash: tx.hash,
        amountIn: amountIn,
        amountOut: amountOut,
        gasUsed: receipt.gasUsed.toString(),
        status: 'success'
      }

    } catch (error) {
      throw error
    }
  }

  /**
   * 获取最优Gas价格
   */
  private async getOptimalGasPrice(signer: Signer | null): Promise<bigint> {
    try {
      if (!signer || !signer.provider) {
        return parseUnits('5', 'gwei')
      }

      const feeData = await signer.provider.getFeeData()
      return feeData.gasPrice || parseUnits('5', 'gwei')
    } catch (error) {
      return parseUnits('5', 'gwei')
    }
  }

  /**
   * 更新捆绑状态
   */
  private updateBundleStatus(batchId: string, status: BundleBuyStatus): void {
    this.activeBundles.set(batchId, status)
  }

  /**
   * 获取捆绑状态
   */
  getBundleStatus(batchId: string): BundleBuyStatus | null {
    return this.activeBundles.get(batchId) || null
  }

  /**
   * 取消捆绑
   */
  cancelBundle(batchId: string): boolean {
    const status = this.activeBundles.get(batchId)
    if (status && (status.status === 'preparing' || status.status === 'executing')) {
      status.status = 'failed'
      status.currentStep = 'Bundle cancelled'
      this.updateBundleStatus(batchId, status)
      return true
    }
    return false
  }

  /**
   * 预估Gas费用
   */
  async estimateGasCost(
    params: BSCBundleBuyParams
  ): Promise<{ gasPrice: string; estimatedCostPerWallet: string; totalEstimatedCost: string }> {
    try {
      const provider = new ethers.JsonRpcProvider(params.rpcUrl)
      const gasPrice = await provider.getGasPrice()
      const gasLimit = 300000 // 单次买入的估算Gas限制

      const costPerWallet = gasPrice * BigInt(gasLimit)
      const totalCost = costPerWallet * BigInt(params.walletAddresses.length)

      return {
        gasPrice: formatUnits(gasPrice, 'gwei') + ' gwei',
        estimatedCostPerWallet: formatUnits(costPerWallet, 18) + ' BNB',
        totalEstimatedCost: formatUnits(totalCost, 18) + ' BNB'
      }
    } catch (error) {
      return {
        gasPrice: '5 gwei',
        estimatedCostPerWallet: '0.0015 BNB',
        totalEstimatedCost: (0.0015 * params.walletAddresses.length).toFixed(6) + ' BNB'
      }
    }
  }
}

/**
 * 创建BSC捆绑买入器实例
 */
export const bscBundleBuyer = new BSCBundleBuyer(
  new ExtendedDatabase('meme-master.db')
)

/**
 * 计算滑点容忍度
 */
export function calculateSlippageTolerance(
  expectedAmount: string,
  slippagePercent: number,
  decimals: number = 18
): string {
  const expected = parseUnits(expectedAmount, decimals)
  const tolerance = (expected * BigInt(Math.floor(slippagePercent * 10000))) / BigInt(10000)
  const minimumAmount = expected - tolerance
  return formatUnits(minimumAmount, decimals)
}

/**
 * 验证买入参数
 */
export function validateBundleBuyParams(params: BSCBundleBuyParams): { valid: boolean; error?: string } {
  if (!params.tokenAddress || !ethers.isAddress(params.tokenAddress)) {
    return { valid: false, error: 'Invalid token address' }
  }

  if (params.walletAddresses.length === 0) {
    return { valid: false, error: 'No wallet addresses provided' }
  }

  if (params.walletAddresses.some(addr => !ethers.isAddress(addr))) {
    return { valid: false, error: 'One or more invalid wallet addresses' }
  }

  if (parseFloat(params.amountPerWallet) <= 0) {
    return { valid: false, error: 'Amount per wallet must be greater than 0' }
  }

  if (params.slippage < 0 || params.slippage > 1) {
    return { valid: false, error: 'Slippage must be between 0 and 1 (0-100%)' }
  }

  return { valid: true }
}
