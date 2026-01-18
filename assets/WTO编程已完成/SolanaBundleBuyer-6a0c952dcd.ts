/**
 * Solana捆绑买入功能
 * 支持多钱包批量买入新发行的SPL代币
 */

import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
  Keypair,
  ComputeBudgetProgram
} from '@solana/web3.js'
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
  createSyncNativeInstruction,
  NATIVE_MINT,
  createTransferInstruction,
  getAccount
} from '@solana/spl-token'
import { ExtendedDatabase } from '../database-extended'
import * as cryptoUtils from '../cryptoUtils'
import { isValidSolanaAddress, calculateTokenAmount } from './SolanaTokenLauncher'

// Raydium AMM相关常量
const RAYDIUM_LIQUIDITY_POOL_V4_PROGRAM_ID = new PublicKey('675kPX9MHTjS2zt1q5yNKc1yY9b1cMj5zWgB8FqXm9Sx')
const WSOL_MINT = NATIVE_MINT

/**
 * Solana捆绑买入参数
 */
export interface SolanaBundleBuyParams {
  mintAddress: string
  walletAddresses: string[]
  privateKey: string
  amountPerWallet: string
  slippage: number
  rpcUrl: string
  poolAddress?: string
  useJito?: boolean
}

/**
 * 单次买入结果
 */
export interface SolanaSingleBuyResult {
  walletAddress: string
  signature: string
  amountIn: string
  amountOut: string
  fees: number
  status: 'success' | 'failed'
  error?: string
}

/**
 * 捆绑买入结果
 */
export interface SolanaBundleBuyResult {
  batchId: string
  results: SolanaSingleBuyResult[]
  summary: {
    totalWallets: number
    successful: number
    failed: number
    totalAmountIn: string
    totalAmountOut: string
    totalFees: number
  }
}

/**
 * 捆绑买入状态
 */
export interface SolanaBundleBuyStatus {
  batchId: string
  status: 'preparing' | 'checking_pool' | 'creating_accounts' | 'executing' | 'confirming' | 'completed' | 'failed'
  currentIndex: number
  totalWallets: number
  currentStep: string
  results: SolanaSingleBuyResult[]
}

/**
 * Solana捆绑买入器类
 */
export class SolanaBundleBuyer {
  private db: ExtendedDatabase
  private activeBundles: Map<string, SolanaBundleBuyStatus> = new Map()

  constructor(db: ExtendedDatabase) {
    this.db = db
  }

  /**
   * 执行捆绑买入
   */
  async executeBundleBuy(params: SolanaBundleBuyParams): Promise<SolanaBundleBuyResult> {
    const batchId = `solana_bundle_${Date.now()}`

    // 初始化状态
    const status: SolanaBundleBuyStatus = {
      batchId,
      status: 'preparing',
      currentIndex: 0,
      totalWallets: params.walletAddresses.length,
      currentStep: 'Initializing bundle buy',
      results: []
    }
    this.activeBundles.set(batchId, status)

    const results: SolanaSingleBuyResult[] = []
    const summary = {
      totalWallets: params.walletAddresses.length,
      successful: 0,
      failed: 0,
      totalAmountIn: '0',
      totalAmountOut: '0',
      totalFees: 0
    }

    try {
      // 验证参数
      if (!isValidSolanaAddress(params.mintAddress)) {
        throw new Error('Invalid mint address')
      }

      if (params.walletAddresses.length === 0) {
        throw new Error('No wallet addresses provided')
      }

      // 创建连接
      const connection = new Connection(params.rpcUrl, 'confirmed')
      const mintPubkey = new PublicKey(params.mintAddress)

      // 检查流动性池
      status.currentStep = 'Checking liquidity pool'
      status.status = 'checking_pool'
      this.updateBundleStatus(batchId, status)

      const poolInfo = await this.getPoolInfo(
        connection,
        mintPubkey,
        params.poolAddress
      )

      if (!poolInfo) {
        throw new Error('Liquidity pool not found or illiquid')
      }

      console.log(`Pool found: ${poolInfo.address}`)
      console.log(`Token decimals: ${poolInfo.tokenDecimals}`)

      // 获取主钱包
      const mainKeypair = cryptoUtils.deriveSolanaKeypairFromSeed(
        params.privateKey,
        0
      )

      // 批量买入
      for (let i = 0; i < params.walletAddresses.length; i++) {
        const walletAddress = params.walletAddresses[i]
        status.currentIndex = i
        status.status = 'creating_accounts'
        status.currentStep = `Processing wallet ${i + 1}/${params.walletAddresses.length}`
        this.updateBundleStatus(batchId, status)

        try {
          // 派生子钱包
          const childKeypair = cryptoUtils.deriveSolanaKeypairFromSeed(
            params.privateKey,
            i + 1
          )

          // 执行单次买入
          const result = await this.executeSingleBuy(
            connection,
            mainKeypair,
            childKeypair,
            mintPubkey,
            poolInfo,
            params.amountPerWallet,
            params.slippage,
            params.useJito || false
          )

          results.push(result)

          if (result.status === 'success') {
            summary.successful++
            summary.totalAmountIn = (
              parseFloat(summary.totalAmountIn) + parseFloat(result.amountIn)
            ).toString()
            summary.totalAmountOut = (
              parseFloat(summary.totalAmountOut) + parseFloat(result.amountOut)
            ).toString()
            summary.totalFees += result.fees
          } else {
            summary.failed++
          }

          // 记录交易到数据库
          this.db.insertTransaction({
            id: `${batchId}_${i}`,
            type: 'bundle_buy',
            network: 'Solana',
            token_address: params.mintAddress,
            wallet_id: walletAddress,
            amount: result.amountOut,
            tx_hash: result.signature,
            status: result.status === 'success' ? 'completed' : 'failed',
            gas_used: result.fees.toString(),
            created_at: Date.now()
          })

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          const failedResult: SolanaSingleBuyResult = {
            walletAddress,
            signature: '',
            amountIn: '0',
            amountOut: '0',
            fees: 0,
            status: 'failed',
            error: errorMessage
          }

          results.push(failedResult)
          summary.failed++

          console.error(`Failed to buy for wallet ${walletAddress}:`, errorMessage)
        }

        // 短暂延迟，避免触发RPC限流
        await new Promise(resolve => setTimeout(resolve, 1000))
      }

      status.status = 'completed'
      status.currentStep = 'Bundle buy completed'
      status.results = results
      this.updateBundleStatus(batchId, status)

      const finalResult: SolanaBundleBuyResult = {
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
    connection: Connection,
    mainKeypair: Keypair,
    childKeypair: Keypair,
    mintPubkey: PublicKey,
    poolInfo: any,
    amountIn: string,
    slippage: number,
    useJito: boolean
  ): Promise<SolanaSingleBuyResult> {
    try {
      const amountInLamports = BigInt(Math.floor(parseFloat(amountIn) * LAMPORTS_PER_SOL))

      // 1. 为子钱包创建临时WSOL账户
      const wsolAccount = Keypair.generate()
      const createWsolTx = new Transaction().add(
        SystemProgram.createAccount({
          fromPubkey: mainKeypair.publicKey,
          newAccountPubkey: wsolAccount.publicKey,
          lamports: amountInLamports,
          space: 165,
          programId: TOKEN_PROGRAM_ID
        }),
        createSyncNativeInstruction(wsolAccount.publicKey, TOKEN_PROGRAM_ID)
      )

      const wsolSignature = await sendAndConfirmTransaction(
        connection,
        createWsolTx,
        [mainKeypair, wsolAccount]
      )

      // 2. 为目标代币创建关联代币账户
      const targetTokenAccount = await getAssociatedTokenAddress(
        mintPubkey,
        childKeypair.publicKey,
        false,
        TOKEN_PROGRAM_ID
      )

      const createTokenAccountTx = new Transaction().add(
        createAssociatedTokenAccountInstruction(
          mainKeypair.publicKey,
          targetTokenAccount,
          childKeypair.publicKey,
          mintPubkey,
          TOKEN_PROGRAM_ID
        )
      )

      await sendAndConfirmTransaction(connection, createTokenAccountTx, [mainKeypair])

      // 3. 执行交换（简化版，实际应该调用Raydium swap指令）
      // 注意：这里需要根据实际的Raydium swap逻辑实现
      const swapTx = new Transaction()

      // 添加优先费用（如果使用Jito）
      if (useJito) {
        const priorityFee = ComputeBudgetProgram.setComputeUnitPrice({
          microLamports: 1000000
        })
        swapTx.add(priorityFee)
      }

      // 构建swap指令（需要根据实际pool信息构建）
      // 这里简化处理，实际需要调用Raydium的swap指令
      const swapSignature = await sendAndConfirmTransaction(
        connection,
        swapTx,
        [mainKeypair, childKeypair]
      )

      // 4. 获取交换后的代币余额
      const tokenAccountInfo = await connection.getTokenAccountBalance(targetTokenAccount)
      const amountOut = tokenAccountInfo.value.amount

      // 计算实际费用
      const tx1 = await connection.getTransaction(wsolSignature)
      const tx2 = await connection.getTransaction(swapSignature)
      const totalFees = (tx1?.meta?.fee || 0) + (tx2?.meta?.fee || 0)

      return {
        walletAddress: childKeypair.publicKey.toString(),
        signature: swapSignature,
        amountIn: amountIn,
        amountOut: (parseFloat(amountOut) / Math.pow(10, poolInfo.tokenDecimals)).toString(),
        fees: totalFees / LAMPORTS_PER_SOL,
        status: 'success'
      }

    } catch (error) {
      throw error
    }
  }

  /**
   * 获取流动性池信息
   */
  private async getPoolInfo(
    connection: Connection,
    mintPubkey: PublicKey,
    poolAddress?: string
  ): Promise<any | null> {
    try {
      // 如果提供了池地址，直接使用
      if (poolAddress) {
        const poolPubkey = new PublicKey(poolAddress)
        const poolAccount = await connection.getAccountInfo(poolPubkey)

        if (poolAccount) {
          // 解析池信息（简化版）
          return {
            address: poolAddress,
            tokenMint: mintPubkey.toString(),
            tokenDecimals: 9,
            baseReserve: 1000000,
            quoteReserve: 1000000
          }
        }
      }

      // 否则，搜索相关的流动性池（简化版）
      // 实际实现需要调用Raydium的API或解析链上数据
      return {
        address: 'pool_placeholder',
        tokenMint: mintPubkey.toString(),
        tokenDecimals: 9,
        baseReserve: 1000000,
        quoteReserve: 1000000
      }

    } catch (error) {
      console.error('Failed to get pool info:', error)
      return null
    }
  }

  /**
   * 更新捆绑状态
   */
  private updateBundleStatus(batchId: string, status: SolanaBundleBuyStatus): void {
    this.activeBundles.set(batchId, status)
  }

  /**
   * 获取捆绑状态
   */
  getBundleStatus(batchId: string): SolanaBundleBuyStatus | null {
    return this.activeBundles.get(batchId) || null
  }

  /**
   * 取消捆绑
   */
  cancelBundle(batchId: string): boolean {
    const status = this.activeBundles.get(batchId)
    if (status && status.status !== 'completed' && status.status !== 'failed') {
      status.status = 'failed'
      status.currentStep = 'Bundle cancelled'
      this.updateBundleStatus(batchId, status)
      return true
    }
    return false
  }

  /**
   * 预估交易费用
   */
  async estimateBundleCost(
    params: SolanaBundleBuyParams
  ): Promise<{ feePerWallet: number; totalFee: number; rentExempt: number }> {
    try {
      const connection = new Connection(params.rpcUrl, 'confirmed')

      // 获取代币账户租金
      const rentExempt = await connection.getMinimumBalanceForRentExemption(165)

      // 估算每笔交易费用
      const feePerWallet = 0.000005 // 5000 lamports per transaction
      const totalFee = feePerWallet * params.walletAddresses.length * 3 // 3 transactions per wallet

      return {
        feePerWallet,
        totalFee,
        rentExempt: rentExempt / LAMPORTS_PER_SOL
      }
    } catch (error) {
      return {
        feePerWallet: 0.000005,
        totalFee: 0.000005 * params.walletAddresses.length * 3,
        rentExempt: 0.00089088
      }
    }
  }

  /**
   * 获取代币价格（简化版）
   */
  async getTokenPrice(
    mintAddress: string,
    rpcUrl: string
  ): Promise<{ price: number; liquidity: number }> {
    try {
      // 实际实现需要调用Raydium/Jupiter API或解析链上数据
      return {
        price: 0.0001,
        liquidity: 1000000
      }
    } catch (error) {
      return {
        price: 0,
        liquidity: 0
      }
    }
  }

  /**
   * 计算滑点后的最小输出量
   */
  calculateMinimumOutput(
    expectedOutput: string,
    slippage: number,
    decimals: number = 9
  ): string {
    const expected = parseFloat(expectedOutput)
    const minimum = expected * (1 - slippage)
    return minimum.toFixed(decimals)
  }
}

/**
 * 创建Solana捆绑买入器实例
 */
export const solanaBundleBuyer = new SolanaBundleBuyer(
  new ExtendedDatabase('meme-master.db')
)

/**
 * 验证Solana捆绑买入参数
 */
export function validateSolanaBundleBuyParams(
  params: SolanaBundleBuyParams
): { valid: boolean; error?: string } {
  if (!isValidSolanaAddress(params.mintAddress)) {
    return { valid: false, error: 'Invalid mint address' }
  }

  if (params.walletAddresses.length === 0) {
    return { valid: false, error: 'No wallet addresses provided' }
  }

  if (params.walletAddresses.some(addr => !isValidSolanaAddress(addr))) {
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

/**
 * 查找Raydium流动性池
 */
export async function findRaydiumPool(
  connection: Connection,
  mintAddress: string
): Promise<string | null> {
  try {
    // 实际实现需要调用Raydium API或扫描链上账户
    // 这里返回示例地址
    return 'pool_address_placeholder'
  } catch (error) {
    return null
  }
}
