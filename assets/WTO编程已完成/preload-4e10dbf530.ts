import { contextBridge, ipcRenderer } from 'electron'
import type { CreateWalletInput, ImportWalletInput, ImportWalletResult, GetBalanceParams, IPCResponse, Wallet, WalletBalance } from '../shared/types'

// IPC通信频道常量
const IPC_CHANNELS = {
  WALLET_CREATE: 'wallet:create',
  WALLET_IMPORT: 'wallet:import',
  WALLET_LIST: 'wallet:list',
  WALLET_BALANCE: 'wallet:balance',
  WALLET_GET_BY_ID: 'wallet:getById',
  WALLET_UPDATE_NAME: 'wallet:updateName',
  WALLET_DELETE: 'wallet:delete',
} as const

// 暴露受保护的方法到渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 钱包操作API
  wallet: {
    /**
     * 创建新钱包
     */
    create: (input: CreateWalletInput): Promise<IPCResponse<string>> => {
      return ipcRenderer.invoke(IPC_CHANNELS.WALLET_CREATE, input)
    },

    /**
     * 导入钱包
     */
    import: (input: ImportWalletInput): Promise<IPCResponse<ImportWalletResult>> => {
      return ipcRenderer.invoke(IPC_CHANNELS.WALLET_IMPORT, input)
    },

    /**
     * 获取所有钱包列表
     */
    list: (): Promise<IPCResponse<Wallet[]>> => {
      return ipcRenderer.invoke(IPC_CHANNELS.WALLET_LIST)
    },

    /**
     * 获取钱包余额
     */
    getBalance: (params: GetBalanceParams): Promise<IPCResponse<WalletBalance>> => {
      return ipcRenderer.invoke(IPC_CHANNELS.WALLET_BALANCE, params)
    },

    /**
     * 根据ID获取钱包
     */
    getById: (id: string): Promise<IPCResponse<Wallet | null>> => {
      return ipcRenderer.invoke(IPC_CHANNELS.WALLET_GET_BY_ID, id)
    },

    /**
     * 更新钱包名称
     */
    updateName: (id: string, name: string): Promise<IPCResponse<boolean>> => {
      return ipcRenderer.invoke(IPC_CHANNELS.WALLET_UPDATE_NAME, id, name)
    },

    /**
     * 删除钱包
     */
    delete: (id: string): Promise<IPCResponse<boolean>> => {
      return ipcRenderer.invoke(IPC_CHANNELS.WALLET_DELETE, id)
    },
  },

  // 获取应用版本等信息
  getVersion: (): NodeJS.ProcessVersions => {
    return process.versions
  },
})
