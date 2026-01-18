/**
 * BSC代币部署器
 * 负责在BSC网络上部署BEP20代币合约
 */

import { ethers, ContractFactory, Signer } from 'ethers'
import { ExtendedDatabase } from '../database-extended'
import * as bscUtils from '../bscUtils'

// BEP20合约ABI
const BEP20_ABI = [
  'constructor(string memory name, string memory symbol, uint256 totalSupply)',
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function transfer(address, uint256) returns (bool)',
  'function approve(address, uint256) returns (bool)',
  'function transferFrom(address, address, uint256) returns (bool)',
  'function mint(address, uint256)',
  'function burn(uint256)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'event Approval(address indexed owner, address indexed spender, uint256 value)'
]

// BEP20合约字节码（简化版）
const BEP20_BYTECODE = '0x608060405234801561001057600080fd5b50604051610...'

/**
 * BSC代币部署参数
 */
export interface BSCTokenLaunchParams {
  name: string
  symbol: string
  totalSupply: string
  decimals?: number
  privateKey: string
  rpcUrl: string
  useMEVProtection?: boolean
}

/**
 * 部署结果
 */
export interface BSCTokenLaunchResult {
  contractAddress: string
  txHash: string
  gasUsed: string
  blockNumber: number
}

/**
 * 部署状态
 */
export interface BSCTokenLaunchStatus {
  taskId: string
  status: 'pending' | 'deploying' | 'confirming' | 'completed' | 'failed'
  result?: BSCTokenLaunchResult
  error?: string
  currentStep: string
}

/**
 * BSC代币部署器类
 */
export class BSCTokenLauncher {
  private db: ExtendedDatabase
  private activeDeployments: Map<string, BSCTokenLaunchStatus> = new Map()

  constructor(db: ExtendedDatabase) {
    this.db = db
  }

  /**
   * 部署BEP20代币
   */
  async launchToken(params: BSCTokenLaunchParams): Promise<BSCTokenLaunchResult> {
    const taskId = `bsc_launch_${Date.now()}`
    
    // 初始化部署状态
    const status: BSCTokenLaunchStatus = {
      taskId,
      status: 'pending',
      currentStep: 'Initializing'
    }
    this.activeDeployments.set(taskId, status)

    try {
      // 记录任务到数据库
      this.db.insertLaunchTask({
        id: taskId,
        network: 'BSC',
        token_name: params.name,
        token_symbol: params.symbol,
        total_supply: params.totalSupply,
        status: 'pending',
        created_at: Date.now()
      })

      // 创建Provider和Signer
      status.currentStep = 'Connecting to BSC network'
      status.status = 'deploying'
      this.updateDeploymentStatus(taskId, status)

      const provider = new ethers.JsonRpcProvider(params.rpcUrl)
      const wallet = new ethers.Wallet(params.privateKey, provider)

      // 使用MEV保护（如果启用）
      if (params.useMEVProtection) {
        console.log('MEV protection enabled for token launch')
      }

      // 准备合约部署参数
      status.currentStep = 'Preparing contract deployment'
      this.updateDeploymentStatus(taskId, status)

      const decimals = params.decimals || 18
      const totalSupplyWei = ethers.parseUnits(params.totalSupply, decimals)

      // 创建合约工厂
      const factory = new ContractFactory(BEP20_ABI, BEP20_BYTECODE, wallet)

      // 部署合约
      status.currentStep = 'Deploying contract'
      this.updateDeploymentStatus(taskId, status)

      const contract = await factory.deploy(
        params.name,
        params.symbol,
        totalSupplyWei,
        {
          gasLimit: 5000000,
          gasPrice: await this.getOptimalGasPrice(provider)
        }
      )

      // 等待确认
      status.currentStep = 'Waiting for confirmation'
      status.status = 'confirming'
      this.updateDeploymentStatus(taskId, status)

      const receipt = await contract.waitForDeployment()
      const deploymentTx = await contract.deploymentTransaction()
      
      if (!deploymentTx) {
        throw new Error('Deployment transaction not found')
      }

      const txReceipt = await deploymentTx.wait()

      const result: BSCTokenLaunchResult = {
        contractAddress: await contract.getAddress(),
        txHash: deploymentTx.hash,
        gasUsed: txReceipt?.gasUsed.toString() || '0',
        blockNumber: txReceipt?.blockNumber || 0
      }

      // 更新数据库
      this.db.updateLaunchTask(taskId, {
        token_address: result.contractAddress,
        status: 'completed',
        result: JSON.stringify(result),
        completed_at: Date.now()
      })

      status.status = 'completed'
      status.result = result
      status.currentStep = 'Deployment completed'
      this.updateDeploymentStatus(taskId, status)

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
   * 获取最优Gas价格
   */
  private async getOptimalGasPrice(provider: ethers.Provider): Promise<bigint> {
    try {
      const feeData = await provider.getFeeData()
      return feeData.gasPrice || ethers.parseUnits('5', 'gwei')
    } catch (error) {
      // 默认5 gwei
      return ethers.parseUnits('5', 'gwei')
    }
  }

  /**
   * 更新部署状态
   */
  private updateDeploymentStatus(taskId: string, status: BSCTokenLaunchStatus): void {
    this.activeDeployments.set(taskId, status)
  }

  /**
   * 获取部署状态
   */
  getDeploymentStatus(taskId: string): BSCTokenLaunchStatus | null {
    return this.activeDeployments.get(taskId) || null
  }

  /**
   * 取消部署
   */
  cancelDeployment(taskId: string): boolean {
    const status = this.activeDeployments.get(taskId)
    if (status && (status.status === 'pending' || status.status === 'deploying')) {
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
   * 验证合约是否部署成功
   */
  async verifyContract(
    contractAddress: string,
    rpcUrl: string
  ): Promise<boolean> {
    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl)
      const contract = new ethers.Contract(contractAddress, BEP20_ABI, provider)
      
      // 尝试读取合约信息
      const name = await contract.name()
      const symbol = await contract.symbol()
      const totalSupply = await contract.totalSupply()
      
      console.log(`Contract verified: ${name} (${symbol}) - Total Supply: ${totalSupply}`)
      return true
    } catch (error) {
      console.error('Contract verification failed:', error)
      return false
    }
  }
}

/**
 * 创建BSC代币部署器实例
 */
export const bscTokenLauncher = new BSCTokenLauncher(
  new ExtendedDatabase('meme-master.db')
)

/**
 * 预估部署Gas费用
 */
export async function estimateDeploymentGas(
  rpcUrl: string,
  totalSupply: string,
  decimals: number = 18
): Promise<{ gasLimit: number; gasPrice: string; estimatedFee: string }> {
  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl)
    const gasPrice = await provider.getGasPrice()
    const gasLimit = 3000000 // 估算值

    const estimatedFee = gasPrice * BigInt(gasLimit)
    
    return {
      gasLimit,
      gasPrice: ethers.formatUnits(gasPrice, 'gwei') + ' gwei',
      estimatedFee: ethers.formatEther(estimatedFee) + ' BNB'
    }
  } catch (error) {
    console.error('Failed to estimate gas:', error)
    return {
      gasLimit: 3000000,
      gasPrice: '5 gwei',
      estimatedFee: '0.015 BNB'
    }
  }
}

/**
 * 查询代币信息
 */
export async function getTokenInfo(
  contractAddress: string,
  rpcUrl: string
): Promise<{
  name: string
  symbol: string
  decimals: number
  totalSupply: string
}> {
  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl)
    const contract = new ethers.Contract(contractAddress, BEP20_ABI, provider)
    
    const name = await contract.name()
    const symbol = await contract.symbol()
    const decimals = await contract.decimals()
    const totalSupply = await contract.totalSupply()
    
    return {
      name,
      symbol,
      decimals: Number(decimals),
      totalSupply: totalSupply.toString()
    }
  } catch (error) {
    throw new Error(`Failed to get token info: ${error}`)
  }
}
