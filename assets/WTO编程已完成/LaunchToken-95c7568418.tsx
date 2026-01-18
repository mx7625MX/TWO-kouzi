/**
 * 代币发行界面
 * 提供BSC和Solana网络的代币发行参数配置界面
 */

import React, { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  Alert,
  AlertDescription,
  AlertTitle
} from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, CheckCircle, Loader2, Send } from 'lucide-react'

// 类型定义
interface LaunchFormData {
  network: 'BSC' | 'Solana'
  name: string
  symbol: string
  totalSupply: string
  decimals: string
  walletId: string
  useMEVProtection: boolean
}

interface Wallet {
  id: string
  name: string
  network: string
  address: string
}

interface GasEstimate {
  gasLimit: number
  gasPrice: string
  estimatedFee: string
}

interface SolanaCostEstimate {
  estimatedFees: number
  rentExempt: number
  total: number
}

export const LaunchToken: React.FC = () => {
  // 表单状态
  const [formData, setFormData] = useState<LaunchFormData>({
    network: 'BSC',
    name: '',
    symbol: '',
    totalSupply: '',
    decimals: '18',
    walletId: '',
    useMEVProtection: false
  })

  // 钱包列表
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [loadingWallets, setLoadingWallets] = useState(false)

  // 部署状态
  const [isDeploying, setIsDeploying] = useState(false)
  const [deployStatus, setDeployStatus] = useState<{
    status: 'idle' | 'deploying' | 'completed' | 'failed'
    taskId?: string
    message: string
    result?: any
    error?: string
    progress: number
  }>({
    status: 'idle',
    message: '',
    progress: 0
  })

  // Gas估算
  const [gasEstimate, setGasEstimate] = useState<GasEstimate | null>(null)
  const [solanaEstimate, setSolanaEstimate] = useState<SolanaCostEstimate | null>(null)
  const [estimatingGas, setEstimatingGas] = useState(false)

  // 表单验证
  const [errors, setErrors] = useState<Partial<Record<keyof LaunchFormData, string>>>({})

  // 加载钱包列表
  useEffect(() => {
    loadWallets()
  }, [])

  // 网络变化时重新估算费用
  useEffect(() => {
    if (formData.network) {
      estimateDeploymentCost()
    }
  }, [formData.network])

  // 加载钱包列表
  const loadWallets = async () => {
    setLoadingWallets(true)
    try {
      const response = await window.electronAPI.wallet.list()
      if (response.success && response.data) {
        const networkWallets = response.data.filter(
          w => w.network === formData.network
        )
        setWallets(networkWallets)
      }
    } catch (error) {
      console.error('Failed to load wallets:', error)
    } finally {
      setLoadingWallets(false)
    }
  }

  // 估算部署费用
  const estimateDeploymentCost = async () => {
    if (!formData.totalSupply || !formData.decimals) return

    setEstimatingGas(true)
    try {
      if (formData.network === 'BSC') {
        const response = await window.electronAPI.invoke('launch:estimateBSCGas', {
          rpcUrl: 'https://bsc-dataseed.binance.org/',
          totalSupply: formData.totalSupply,
          decimals: parseInt(formData.decimals)
        })
        if (response.success && response.data) {
          setGasEstimate(response.data)
        }
      } else {
        const response = await window.electronAPI.invoke('launch:estimateSolanaCost', {
          rpcUrl: 'https://api.mainnet-beta.solana.com'
        })
        if (response.success && response.data) {
          setSolanaEstimate(response.data)
        }
      }
    } catch (error) {
      console.error('Failed to estimate cost:', error)
    } finally {
      setEstimatingGas(false)
    }
  }

  // 验证表单
  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof LaunchFormData, string>> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Token name is required'
    } else if (formData.name.length > 50) {
      newErrors.name = 'Token name must be less than 50 characters'
    }

    if (!formData.symbol.trim()) {
      newErrors.symbol = 'Token symbol is required'
    } else if (formData.symbol.length > 10) {
      newErrors.symbol = 'Token symbol must be less than 10 characters'
    }

    if (!formData.totalSupply || parseFloat(formData.totalSupply) <= 0) {
      newErrors.totalSupply = 'Total supply must be greater than 0'
    }

    if (!formData.decimals || parseInt(formData.decimals) < 0 || parseInt(formData.decimals) > 18) {
      newErrors.decimals = 'Decimals must be between 0 and 18'
    }

    if (!formData.walletId) {
      newErrors.walletId = 'Please select a wallet'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsDeploying(true)
    setDeployStatus({
      status: 'deploying',
      message: 'Initializing deployment...',
      progress: 10
    })

    try {
      // 创建发币任务
      const response = await window.electronAPI.invoke('launch:createTask', {
        network: formData.network,
        name: formData.name,
        symbol: formData.symbol,
        totalSupply: formData.totalSupply,
        decimals: parseInt(formData.decimals),
        walletId: formData.walletId,
        useMEVProtection: formData.useMEVProtection
      })

      if (response.success && response.data) {
        const taskId = response.data.taskId

        setDeployStatus(prev => ({
          ...prev,
          taskId,
          message: 'Deployment task created...',
          progress: 20
        }))

        // 轮询任务状态
        pollTaskStatus(taskId)

      } else {
        throw new Error(response.error || 'Failed to create launch task')
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setDeployStatus({
        status: 'failed',
        message: 'Deployment failed',
        error: errorMessage,
        progress: 0
      })
      setIsDeploying(false)
    }
  }

  // 轮询任务状态
  const pollTaskStatus = async (taskId: string) => {
    const interval = setInterval(async () => {
      try {
        const response = await window.electronAPI.invoke('launch:getTask', taskId)

        if (response.success && response.data) {
          const task = response.data

          if (task.status === 'completed') {
            clearInterval(interval)
            setDeployStatus({
              status: 'completed',
              taskId,
              message: 'Deployment completed successfully!',
              result: task.result,
              progress: 100
            })
            setIsDeploying(false)
          } else if (task.status === 'failed') {
            clearInterval(interval)
            setDeployStatus({
              status: 'failed',
              taskId,
              message: 'Deployment failed',
              error: task.error,
              progress: 0
            })
            setIsDeploying(false)
          } else if (task.status === 'processing') {
            setDeployStatus(prev => ({
              ...prev,
              message: 'Processing deployment...',
              progress: prev.progress + 10
            }))
          }
        }
      } catch (error) {
        console.error('Failed to poll task status:', error)
        clearInterval(interval)
        setDeployStatus(prev => ({
          ...prev,
          status: 'failed',
          message: 'Failed to check deployment status',
          error: error instanceof Error ? error.message : 'Unknown error'
        }))
        setIsDeploying(false)
      }
    }, 2000)
  }

  // 重置表单
  const handleReset = () => {
    setFormData({
      network: 'BSC',
      name: '',
      symbol: '',
      totalSupply: '',
      decimals: '18',
      walletId: '',
      useMEVProtection: false
    })
    setDeployStatus({
      status: 'idle',
      message: '',
      progress: 0
    })
    setGasEstimate(null)
    setSolanaEstimate(null)
    setErrors({})
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Launch Token</h1>
          <p className="text-muted-foreground">Deploy your meme token on BSC or Solana</p>
        </div>
        <Badge variant={formData.network === 'BSC' ? 'default' : 'secondary'}>
          {formData.network} Network
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：部署表单 */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Token Configuration</CardTitle>
              <CardDescription>
                Configure your token parameters for deployment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* 网络选择 */}
                <div className="space-y-2">
                  <Label>Network</Label>
                  <Tabs
                    value={formData.network}
                    onValueChange={(value) => {
                      setFormData(prev => ({ ...prev, network: value as any }))
                      loadWallets()
                    }}
                  >
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="BSC">BSC</TabsTrigger>
                      <TabsTrigger value="Solana">Solana</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>

                {/* 代币名称 */}
                <div className="space-y-2">
                  <Label htmlFor="name">Token Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., DogeCoin"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    disabled={isDeploying}
                    className={errors.name ? 'border-destructive' : ''}
                  />
                  {errors.name && (
                    <p className="text-sm text-destructive">{errors.name}</p>
                  )}
                </div>

                {/* 代币符号 */}
                <div className="space-y-2">
                  <Label htmlFor="symbol">Token Symbol</Label>
                  <Input
                    id="symbol"
                    placeholder="e.g., DOGE"
                    value={formData.symbol}
                    onChange={(e) => setFormData(prev => ({ ...prev, symbol: e.target.value }))}
                    disabled={isDeploying}
                    className={errors.symbol ? 'border-destructive' : ''}
                  />
                  {errors.symbol && (
                    <p className="text-sm text-destructive">{errors.symbol}</p>
                  )}
                </div>

                {/* 总供应量 */}
                <div className="space-y-2">
                  <Label htmlFor="totalSupply">Total Supply</Label>
                  <Input
                    id="totalSupply"
                    type="number"
                    placeholder="e.g., 1000000000"
                    value={formData.totalSupply}
                    onChange={(e) => setFormData(prev => ({ ...prev, totalSupply: e.target.value }))}
                    disabled={isDeploying}
                    className={errors.totalSupply ? 'border-destructive' : ''}
                  />
                  {errors.totalSupply && (
                    <p className="text-sm text-destructive">{errors.totalSupply}</p>
                  )}
                </div>

                {/* 小数位数 */}
                <div className="space-y-2">
                  <Label htmlFor="decimals">Decimals</Label>
                  <Select
                    value={formData.decimals}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, decimals: value }))}
                    disabled={isDeploying}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 19 }, (_, i) => (
                        <SelectItem key={i} value={i.toString()}>
                          {i}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.decimals && (
                    <p className="text-sm text-destructive">{errors.decimals}</p>
                  )}
                </div>

                {/* 钱包选择 */}
                <div className="space-y-2">
                  <Label htmlFor="walletId">Deployment Wallet</Label>
                  <Select
                    value={formData.walletId}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, walletId: value }))}
                    disabled={isDeploying || loadingWallets}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a wallet" />
                    </SelectTrigger>
                    <SelectContent>
                      {wallets.map(wallet => (
                        <SelectItem key={wallet.id} value={wallet.id}>
                          {wallet.name} ({wallet.address.slice(0, 8)}...)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.walletId && (
                    <p className="text-sm text-destructive">{errors.walletId}</p>
                  )}
                </div>

                {/* MEV保护开关（仅BSC） */}
                {formData.network === 'BSC' && (
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>MEV Protection</Label>
                      <p className="text-xs text-muted-foreground">
                        Use Flashbots to protect against MEV attacks
                      </p>
                    </div>
                    <Switch
                      checked={formData.useMEVProtection}
                      onCheckedChange={(checked) =>
                        setFormData(prev => ({ ...prev, useMEVProtection: checked }))
                      }
                      disabled={isDeploying}
                    />
                  </div>
                )}

                {/* 按钮组 */}
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    disabled={isDeploying}
                    className="flex-1"
                  >
                    {isDeploying ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Deploying...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Launch Token
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleReset}
                    disabled={isDeploying}
                  >
                    Reset
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* 右侧：费用估算和状态 */}
        <div className="space-y-6">
          {/* 费用估算 */}
          <Card>
            <CardHeader>
              <CardTitle>Cost Estimate</CardTitle>
              <CardDescription>
                Estimated deployment costs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {estimatingGas && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              )}

              {formData.network === 'BSC' && gasEstimate && (
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Gas Limit</span>
                    <span className="font-medium">{gasEstimate.gasLimit.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Gas Price</span>
                    <span className="font-medium">{gasEstimate.gasPrice}</span>
                  </div>
                  <div className="border-t pt-3">
                    <div className="flex justify-between">
                      <span className="font-medium">Estimated Fee</span>
                      <span className="font-bold text-lg">{gasEstimate.estimatedFee}</span>
                    </div>
                  </div>
                </div>
              )}

              {formData.network === 'Solana' && solanaEstimate && (
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Transaction Fees</span>
                    <span className="font-medium">{solanaEstimate.estimatedFees.toFixed(6)} SOL</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Rent Exempt</span>
                    <span className="font-medium">{solanaEstimate.rentExempt.toFixed(6)} SOL</span>
                  </div>
                  <div className="border-t pt-3">
                    <div className="flex justify-between">
                      <span className="font-medium">Total Cost</span>
                      <span className="font-bold text-lg">{solanaEstimate.total.toFixed(6)} SOL</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 部署状态 */}
          <Card>
            <CardHeader>
              <CardTitle>Deployment Status</CardTitle>
              <CardDescription>
                Track your token deployment progress
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {deployStatus.status === 'idle' && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Ready to deploy your token
                </p>
              )}

              {deployStatus.status !== 'idle' && (
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    {deployStatus.status === 'deploying' && (
                      <Loader2 className="h-5 w-5 animate-spin mt-0.5" />
                    )}
                    {deployStatus.status === 'completed' && (
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                    )}
                    {deployStatus.status === 'failed' && (
                      <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-medium">{deployStatus.message}</p>
                      {deployStatus.taskId && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Task ID: {deployStatus.taskId}
                        </p>
                      )}
                    </div>
                  </div>

                  {deployStatus.status === 'deploying' && (
                    <Progress value={deployStatus.progress} className="h-2" />
                  )}

                  {deployStatus.status === 'failed' && deployStatus.error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Error</AlertTitle>
                      <AlertDescription>{deployStatus.error}</AlertDescription>
                    </Alert>
                  )}

                  {deployStatus.status === 'completed' && deployStatus.result && (
                    <div className="space-y-2 pt-2 border-t">
                      <div className="text-sm">
                        <span className="text-muted-foreground">Contract Address: </span>
                        <span className="font-medium font-mono text-xs">
                          {deployStatus.result.contractAddress || deployStatus.result.mintAddress}
                        </span>
                      </div>
                      {deployStatus.result.txHash && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">Transaction: </span>
                          <span className="font-medium font-mono text-xs">
                            {deployStatus.result.txHash}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default LaunchToken
