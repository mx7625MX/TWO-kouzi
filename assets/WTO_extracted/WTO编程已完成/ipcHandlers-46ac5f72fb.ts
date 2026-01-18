import { ipcMain } from 'electron'
import { walletDB } from './database'
import { getBSCBalance } from '../shared/bscUtils'
import { getSolanaBalance } from '../shared/solanaUtils'
import { WalletManager } from './WalletManager'
import { setupAutoTradeEventListeners } from './autoTradeHandlers'
import type { 
  CreateWalletInput,
  ImportWalletInput,
  ImportWalletResult,
  GetBalanceParams, 
  IPCResponse, 
  Wallet, 
  WalletBalance 
} from '../shared/types'

/**
 * IPC通信频道常量
 */
export const IPC_CHANNELS = {
  WALLET_CREATE: 'wallet:create',
  WALLET_IMPORT: 'wallet:import',
  WALLET_LIST: 'wallet:list',
  WALLET_BALANCE: 'wallet:balance',
  WALLET_GET_BY_ID: 'wallet:getById',
  WALLET_UPDATE_NAME: 'wallet:updateName',
  WALLET_DELETE: 'wallet:delete',
} as const

/**
 * 注册所有IPC处理器
 */
export function registerIPCHandlers(): void {
  // 创建钱包
  ipcMain.handle(
    IPC_CHANNELS.WALLET_CREATE,
    async (_event, input: CreateWalletInput): Promise<IPCResponse<string>> => {
      try {
        console.log('IPC: 创建钱包请求', input)

        // 验证输入
        if (!input.name || !input.address || !input.network) {
          return {
            success: false,
            error: '缺少必填字段',
          }
        }

        // 检查地址是否已存在
        const existingWallet = walletDB.getWalletByAddress(input.address)
        if (existingWallet) {
          return {
            success: false,
            error: '该钱包地址已存在',
          }
        }

        // 插入钱包
        const walletId = walletDB.insertWallet(input)

        console.log('IPC: 钱包创建成功', walletId)
        return {
          success: true,
          data: walletId,
        }
      } catch (error: any) {
        console.error('IPC: 创建钱包失败', error)
        return {
          success: false,
          error: error.message || '创建钱包失败',
        }
      }
    }
  )

  // 导入钱包
  ipcMain.handle(
    IPC_CHANNELS.WALLET_IMPORT,
    async (_event, input: ImportWalletInput): Promise<IPCResponse<ImportWalletResult>> => {
      try {
        console.log('IPC: 导入钱包请求', { name: input.name, network: input.network, importType: input.importType })

        // 验证输入
        if (!input.name || !input.network || !input.password) {
          return {
            success: false,
            error: '缺少必填字段',
          }
        }

        if (input.importType === 'privateKey' && !input.privateKey) {
          return {
            success: false,
            error: '请输入私钥',
          }
        }

        if (input.importType === 'mnemonic' && !input.mnemonic) {
          return {
            success: false,
            error: '请输入助记词',
          }
        }

        // 创建WalletManager实例，使用用户提供的密码
        const walletManager = new WalletManager(input.password)

        // 准备导入数据
        const importData = input.importType === 'privateKey' ? input.privateKey! : input.mnemonic!

        // 导入钱包
        const wallet = await walletManager.importWallet(
          input.name,
          input.network,
          importData,
          input.importType,
          input.derivationPath
        )

        // 将钱包保存到数据库
        const walletInput: CreateWalletInput = {
          name: wallet.name,
          address: wallet.address,
          network: wallet.network,
          encrypted_key: wallet.encrypted_key,
        }
        const walletId = walletDB.insertWallet(walletInput)

        console.log('IPC: 钱包导入成功', walletId)
        return {
          success: true,
          data: {
            id: walletId,
            address: wallet.address,
          },
        }
      } catch (error: any) {
        console.error('IPC: 导入钱包失败', error)
        return {
          success: false,
          error: error.message || '导入钱包失败',
        }
      }
    }
  )

  // 获取钱包列表
  ipcMain.handle(
    IPC_CHANNELS.WALLET_LIST,
    async (_event): Promise<IPCResponse<Wallet[]>> => {
      try {
        console.log('IPC: 获取钱包列表请求')

        const wallets = walletDB.getAllWallets()

        console.log('IPC: 查询到钱包数量', wallets.length)
        return {
          success: true,
          data: wallets,
        }
      } catch (error: any) {
        console.error('IPC: 获取钱包列表失败', error)
        return {
          success: false,
          error: error.message || '获取钱包列表失败',
        }
      }
    }
  )

  // 获取钱包余额
  ipcMain.handle(
    IPC_CHANNELS.WALLET_BALANCE,
    async (_event, params: GetBalanceParams): Promise<IPCResponse<WalletBalance>> => {
      try {
        console.log('IPC: 获取余额请求', params)

        if (!params.address || !params.network) {
          return {
            success: false,
            error: '缺少地址或网络参数',
          }
        }

        let balance: string

        // 根据网络类型查询余额
        if (params.network === 'BSC') {
          balance = await getBSCBalance(params.address)
        } else if (params.network === 'Solana') {
          balance = await getSolanaBalance(params.address)
        } else {
          return {
            success: false,
            error: '不支持的网络类型',
          }
        }

        const result: WalletBalance = {
          address: params.address,
          balance: balance,
          network: params.network,
        }

        console.log('IPC: 余额查询成功', result)
        return {
          success: true,
          data: result,
        }
      } catch (error: any) {
        console.error('IPC: 获取余额失败', error)
        return {
          success: false,
          error: error.message || '获取余额失败',
        }
      }
    }
  )

  // 根据ID获取钱包
  ipcMain.handle(
    IPC_CHANNELS.WALLET_GET_BY_ID,
    async (_event, id: string): Promise<IPCResponse<Wallet | null>> => {
      try {
        console.log('IPC: 获取钱包详情请求', id)

        if (!id) {
          return {
            success: false,
            error: '缺少钱包ID',
          }
        }

        const wallet = walletDB.getWalletById(id)

        console.log('IPC: 查询钱包结果', wallet ? '找到' : '未找到')
        return {
          success: true,
          data: wallet,
        }
      } catch (error: any) {
        console.error('IPC: 获取钱包详情失败', error)
        return {
          success: false,
          error: error.message || '获取钱包详情失败',
        }
      }
    }
  )

  // 更新钱包名称
  ipcMain.handle(
    IPC_CHANNELS.WALLET_UPDATE_NAME,
    async (_event, id: string, name: string): Promise<IPCResponse<boolean>> => {
      try {
        console.log('IPC: 更新钱包名称请求', { id, name })

        if (!id || !name) {
          return {
            success: false,
            error: '缺少钱包ID或名称',
          }
        }

        const result = walletDB.updateWalletName(id, name)

        console.log('IPC: 更新钱包名称', result ? '成功' : '失败')
        return {
          success: result,
          data: result,
          error: result ? undefined : '钱包不存在或更新失败',
        }
      } catch (error: any) {
        console.error('IPC: 更新钱包名称失败', error)
        return {
          success: false,
          error: error.message || '更新钱包名称失败',
        }
      }
    }
  )

  // 删除钱包
  ipcMain.handle(
    IPC_CHANNELS.WALLET_DELETE,
    async (_event, id: string): Promise<IPCResponse<boolean>> => {
      try {
        console.log('IPC: 删除钱包请求', id)

        if (!id) {
          return {
            success: false,
            error: '缺少钱包ID',
          }
        }

        const result = walletDB.deleteWallet(id)

        console.log('IPC: 删除钱包', result ? '成功' : '失败')
        return {
          success: result,
          data: result,
          error: result ? undefined : '钱包不存在或删除失败',
        }
      } catch (error: any) {
        console.error('IPC: 删除钱包失败', error)
        return {
          success: false,
          error: error.message || '删除钱包失败',
        }
      }
    }
  )

  console.log('IPC处理器注册完成')
}

/**
 * 移除所有IPC处理器
 */
export function removeIPCHandlers(): void {
  Object.values(IPC_CHANNELS).forEach((channel) => {
    ipcMain.removeHandler(channel)
  })
  console.log('IPC处理器已移除')
}
