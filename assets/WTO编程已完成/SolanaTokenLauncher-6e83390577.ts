/**
 * Solana代币部署器
 * 负责在Solana网络上创建和部署SPL代币
 */

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction
} from '@solana/web3.js'
import {
  createInitializeMintInstruction,
  createMint,
  MINT_SIZE,
  getMinimumBalanceForRentExemptMint,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
  createMintToInstruction,
  TOKEN_PROGRAM_ID
} from '@solana/spl-token'
import { ExtendedDatabase } from '../database-extended'
import * as cryptoUtils from '../cryptoUtils'

/**
 * Solana代币部署参数
 */
export interface SolanaTokenLaunchParams {
  name: string
  symbol: string
  totalSupply: string
  decimals?: number
  privateKey: string
  rpcUrl: string
  mintAuthority?: string
  freezeAuthority?: string
}

/**
 * 部署结果
 */
export interface SolanaTokenLaunchResult {
  mintAddress: string
  tokenAccount: string
  signature: string
  slot: number
  fees: number
}

/**
 * 部署状态
 */
export interface SolanaTokenLaunchStatus {
  taskId: string
  status: 'pending' | 'creating_mint' | 'creating_token_account' | 'minting' | 'confirming' | 'completed' | 'failed'
  result?: SolanaTokenLaunchResult
  error?: string
  currentStep: string
}

/**
 * Solana代币部署器类
 */
export class SolanaTokenLauncher {
  private db: ExtendedDatabase
  private activeDeployments: Map<string, SolanaTokenLaunchStatus> = new Map()

  constructor(db: ExtendedDatabase) {
    this.db = db
  }

  /**
   * 部署SPL代币
   */
  async launchToken(params: SolanaTokenLaunchParams): Promise<SolanaTokenLaunchResult> {
    const taskId = `solana_launch_${Date.now()}`

    // 初始化部署状态
    const status: SolanaTokenLaunchStatus = {
      taskId,
      status: 'pending',
      currentStep: 'Initializing'
    }
    this.activeDeployments.set(taskId, status)

    try {
      // 记录任务到数据库
      this.db.insertLaunchTask({
        id: taskId,
        network: 'Solana',
        token_name: params.name,
        token_symbol: params.symbol,
        total_supply: params.totalSupply,
        status: 'pending',
        created_at: Date.now()
      })

      // 创建连接
      status.currentStep = 'Connecting to Solana network'
      status.status = 'creating_mint'
      this.updateDeploymentStatus(taskId, status)

      const connection = new Connection(params.rpcUrl, 'confirmed')

      // 从私钥创建Keypair
      const keypair = cryptoUtils.deriveSolanaKeypairFromSeed(
        params.privateKey,
        0
      )

      // 计算供应量（考虑小数位）
      const decimals = params.decimals || 9
      const totalSupply = BigInt(
        Math.floor(parseFloat(params.totalSupply) * Math.pow(10, decimals))
      )

      // 创建Mint账户
      status.currentStep = 'Creating mint account'
      this.updateDeploymentStatus(taskId, status)

      const mintKeypair = Keypair.generate()
      const lamports = await getMinimumBalanceForRentExemptMint(connection)

      // 创建Mint指令
      const createMintInstruction = SystemProgram.createAccount({
        fromPubkey: keypair.publicKey,
        newAccountPubkey: mintKeypair.publicKey,
        space: MINT_SIZE,
        lamports,
        programId: TOKEN_PROGRAM_ID
      })

      const initializeMintInstruction = createInitializeMintInstruction(
        mintKeypair.publicKey,
        decimals,
        keypair.publicKey, // mint authority
        params.freezeAuthority ? new PublicKey(params.freezeAuthority) : null, // freeze authority
        TOKEN_PROGRAM_ID
      )

      // 创建关联代币账户
      status.currentStep = 'Creating token account'
      status.status = 'creating_token_account'
      this.updateDeploymentStatus(taskId, status)

      const tokenAccount = await getAssociatedTokenAddress(
        mintKeypair.publicKey,
        keypair.publicKey,
        false,
        TOKEN_PROGRAM_ID
      )

      const createTokenAccountInstruction = createAssociatedTokenAccountInstruction(
        keypair.publicKey,
        tokenAccount,
        keypair.publicKey,
        mintKeypair.publicKey,
        TOKEN_PROGRAM_ID
      )

      // Mint代币
      status.currentStep = 'Minting tokens'
      status.status = 'minting'
      this.updateDeploymentStatus(taskId, status)

      const mintToInstruction = createMintToInstruction(
        mintKeypair.publicKey,
        tokenAccount,
        keypair.publicKey,
        totalSupply,
        [],
        TOKEN_PROGRAM_ID
      )

      // 创建并发送交易
      const transaction = new Transaction().add(
        createMintInstruction,
        initializeMintInstruction,
        createTokenAccountInstruction,
        mintToInstruction
      )

      // 获取最新区块哈希
      const { blockhash } = await connection.getLatestBlockhash()

      transaction.recentBlockhash = blockhash
      transaction.feePayer = keypair.publicKey

      // 签名交易
      transaction.sign(keypair, mintKeypair)

      // 发送交易
      status.currentStep = 'Sending transaction'
      status.status = 'confirming'
      this.updateDeploymentStatus(taskId, status)

      const signature = await sendAndConfirmTransaction(
        connection,
        transaction,
        [keypair, mintKeypair],
        {
          commitment: 'confirmed',
          preflightCommitment: 'confirmed'
        }
      )

      // 获取交易详情
      const transactionDetail = await connection.getTransaction(signature, {
        commitment: 'confirmed'
      })

      const result: SolanaTokenLaunchResult = {
        mintAddress: mintKeypair.publicKey.toString(),
        tokenAccount: tokenAccount.toString(),
        signature,
        slot: transactionDetail?.slot || 0,
        fees: (transactionDetail?.meta?.fee || 0) / LAMPORTS_PER_SOL
      }

      // 更新数据库
      this.db.updateLaunchTask(taskId, {
        token_address: result.mintAddress,
        status: 'completed',
        result: JSON.stringify(result),
        completed_at: Date.now()
      })

      status.status = 'completed'
      status.result = result
      status.currentStep = 'Token launch completed'
      this.updateDeploymentStatus(taskId, status)

      console.log(`Solana token launched: ${result.mintAddress}`)
      console.log(`Signature: ${result.signature}`)

      return result

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      // 更新数据库
      this.db.updateLaunchTask(taskId, {
        status: 'failed',
        error: errorMessage,
        completed_at: Date.now()
      })

      status.status = 'failed'
      status.error = errorMessage
      this.updateDeploymentStatus(taskId, status)

      throw error
    }
  }

  /**
   * 更新部署状态
   */
  private updateDeploymentStatus(
    taskId: string,
    status: SolanaTokenLaunchStatus
  ): void {
    this.activeDeployments.set(taskId, status)
  }

  /**
   * 获取部署状态
   */
  getDeploymentStatus(taskId: string): SolanaTokenLaunchStatus | null {
    return this.activeDeployments.get(taskId) || null
  }

  /**
   * 取消部署
   */
  cancelDeployment(taskId: string): boolean {
    const status = this.activeDeployments.get(taskId)
    if (status && status.status !== 'completed' && status.status !== 'failed') {
      status.status = 'failed'
      status.error = 'Deployment cancelled by user'
      status.currentStep = 'Cancelled'
      this.updateDeploymentStatus(taskId, status)

      this.db.updateLaunchTask(taskId, {
        status: 'failed',
        error: 'Deployment cancelled by user',
        completed_at: Date.now()
      })

      return true
    }
    return false
  }

  /**
   * 获取代币信息
   */
  async getTokenInfo(
    mintAddress: string,
    rpcUrl: string
  ): Promise<{
    address: string
    decimals: number
    supply: string
    mintAuthority: string | null
    freezeAuthority: string | null
  }> {
    try {
      const connection = new Connection(rpcUrl, 'confirmed')
      const mintPublicKey = new PublicKey(mintAddress)

      const mintInfo = await connection.getParsedAccountInfo(mintPublicKey)

      if (!mintInfo || !mintInfo.value || mintInfo.value.data.parsed.type !== 'mint') {
        throw new Error('Invalid mint account')
      }

      const parsed = mintInfo.value.data.parsed.info

      return {
        address: mintAddress,
        decimals: parsed.decimals,
        supply: parsed.supply,
        mintAuthority: parsed.mintAuthority,
        freezeAuthority: parsed.freezeAuthority
      }
    } catch (error) {
      throw new Error(`Failed to get token info: ${error}`)
    }
  }

  /**
   * 预估交易费用
   */
  async estimateLaunchCost(
    rpcUrl: string
  ): Promise<{ estimatedFees: number; rentExempt: number; total: number }> {
    try {
      const connection = new Connection(rpcUrl, 'confirmed')

      // 获取Mint账户租金
      const rentExempt = await getMinimumBalanceForRentExemptMint(connection)

      // 估算交易费用（保守估计）
      const estimatedFees = 0.0005 // 5000 lamports

      const total = (rentExempt + estimatedFees) / LAMPORTS_PER_SOL

      return {
        estimatedFees,
        rentExempt: rentExempt / LAMPORTS_PER_SOL,
        total
      }
    } catch (error) {
      return {
        estimatedFees: 0.000005,
        rentExempt: 0.00089088,
        total: 0.00089588
      }
    }
  }

  /**
   * 验证代币
   */
  async verifyToken(
    mintAddress: string,
    rpcUrl: string
  ): Promise<boolean> {
    try {
      const connection = new Connection(rpcUrl, 'confirmed')
      const mintPublicKey = new PublicKey(mintAddress)

      const accountInfo = await connection.getAccountInfo(mintPublicKey)

      if (!accountInfo) {
        console.error('Mint account not found')
        return false
      }

      if (!accountInfo.owner.equals(TOKEN_PROGRAM_ID)) {
        console.error('Invalid mint owner')
        return false
      }

      const tokenInfo = await this.getTokenInfo(mintAddress, rpcUrl)
      console.log(`Token verified: ${tokenInfo.address}`)
      console.log(`Decimals: ${tokenInfo.decimals}`)
      console.log(`Supply: ${tokenInfo.supply}`)

      return true
    } catch (error) {
      console.error('Token verification failed:', error)
      return false
    }
  }
}

/**
 * 创建Solana代币部署器实例
 */
export const solanaTokenLauncher = new SolanaTokenLauncher(
  new ExtendedDatabase('meme-master.db')
)

/**
 * 计算代币数量
 */
export function calculateTokenAmount(
  amount: string,
  decimals: number
): bigint {
  return BigInt(Math.floor(parseFloat(amount) * Math.pow(10, decimals)))
}

/**
 * 格式化代币数量
 */
export function formatTokenAmount(
  amount: bigint,
  decimals: number
): string {
  const divisor = BigInt(Math.pow(10, decimals))
  const whole = amount / divisor
  const fraction = amount % divisor

  if (fraction === 0n) {
    return whole.toString()
  }

  // 格式化小数部分
  const fractionStr = fraction.toString().padStart(decimals, '0')
  const trimmedFraction = fractionStr.replace(/0+$/, '')

  return `${whole}.${trimmedFraction}`
}

/**
 * 验证Solana地址
 */
export function isValidSolanaAddress(address: string): boolean {
  try {
    new PublicKey(address)
    return true
  } catch (error) {
    return false
  }
}
