/**
 * 捆绑买入界面
 * 提供多钱包批量买入新发行代币的配置界面
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
import { Checkbox } from '@/components/ui/checkbox'
import { AlertCircle, CheckCircle, Loader2, ShoppingCart, Wallet } from 'lucide-react'

// 类型定义
interface BundleBuyFormData {
  network: 'BSC' | 'Solana'
  tokenAddress: string
  selectedWallets: string[]
  amountPerWallet: string
  slippage: string
  useMEVProtection: boolean
  useJito: boolean
}

interface Wallet {
  id: string
  name: string
  network: string
  address: string
}

interface BundleBuyResult {
  batchId: string
  status: 'pending' | 'executing' | 'completed' | 'failed'
  currentIndex: number
  totalWallets: number
  results: {
    walletAddress: string
    txHash: string
    amountIn: string
    amountOut: string
    gasUsed: string
    status: 'success' | 'failed'
    error?: string
  }[]
  summary: {
    totalWallets: number
    successful: number
    failed: number
    totalAmountIn: string
    totalAmountOut: string
    totalGasUsed: string
  }
}

export const BundleBuy: React.FC = () => {
  // 表单状态
  const [formData, setFormData] = useState<BundleBuyFormData>({
    network: 'BSC',
    tokenAddress: '',
    selectedWallets: [],
    amountPerWallet: '',
    slippage: '5',
    useMEVProtection: false,
    useJito: false
  })

  // 钱包列表
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [loadingWallets, setLoadingWallets] = useState(false)

  // 交易状态
  const [isExecuting, setIsExecuting] = useState(false)
  const [bundleStatus, setBundleStatus] = useState<BundleBuyResult | null>(null)

  // 费用估算
  const [costEstimate, setCostEstimate] = useState<{
    feePerWallet: number
    totalFee: number
    rentExempt?: number
  } | null>(null)
  const [estimatingCost, setEstimatingCost] = useState(false)

  // 表单验证
  const [errors, setErrors] = useState<Partial<Record<keyof BundleBuyFormData, string>>>({})

  // 加载钱包列表
  useEffect(() => {
    loadWallets()
  }, [formData.network])

  // 更新费用估算
  useEffect(() => {
    if (formData.selectedWallets.length > 0 && formData.amountPerWallet) {
      estimateBundleCost()
    }
  }, [formData.network, formData.selectedWallets.length, formData.amountPerWallet])

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

  // 估算捆绑费用
  const estimateBundleCost = async () => {
    if (!formData.amountPerWallet || formData.selectedWallets.length === 0) return

    setEstimatingCost(true)
    try {
      if (formData.network === 'BSC') {
        const response = await window.electronAPI.invoke('launch:estimateBSCBundleGas', {
          tokenAddress: formData.tokenAddress,
          walletAddresses: formData.selectedWallets,
          amountPerWallet: formData.amountPerWallet,
          slippage: parseFloat(formData.slippage) / 100,
          rpcUrl: 'https://bsc-dataseed.binance.org/'
        })
        if (response.success && response.data) {
          setCostEstimate({
            feePerWallet: parseFloat(response.data.estimatedCostPerWallet),
            totalFee: parseFloat(response.data.totalEstimatedCost)
          })
        }
      } else {
        const response = await window.electronAPI.invoke('launch:estimateSolanaBundleCost', {
          mintAddress: formData.tokenAddress,
          walletAddresses: formData.selectedWallets,
          amountPerWallet: formData.amountPerWallet,
          slippage: parseFloat(formData.slippage) / 100,
          rpcUrl: 'https://api.mainnet-beta.solana.com'
        })
        if (response.success && response.data) {
          setCostEstimate(response.data)
        }
      }
    } catch (error) {
      console.error('Failed to estimate cost:', error)
    } finally {
      setEstimatingCost(false)
    }
  }

  // 验证表单
  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof BundleBuyFormData, string>> = {}

    if (!formData.tokenAddress.trim()) {
      newErrors.tokenAddress = 'Token address is required'
    }

    if (formData.selectedWallets.length === 0) {
      newErrors.selectedWallets = 'Please select at least one wallet'
    }

    if (!formData.amountPerWallet || parseFloat(formData.amountPerWallet) <= 0) {
      newErrors.amountPerWallet = 'Amount per wallet must be greater than 0'
    }

    const slippageValue = parseFloat(formData.slippage)
    if (isNaN(slippageValue) || slippageValue < 0 || slippageValue > 50) {
      newErrors.slippage = 'Slippage must be between 0 and 50%'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (formData.selectedWallets.length === wallets.length) {
      setFormData(prev => ({ ...prev, selectedWallets: [] }))
    } else {
      setFormData(prev => ({
        ...prev,
        selectedWallets: wallets.map(w => w.id)
      }))
    }
  }

  // 切换单个钱包选择
  const toggleWallet = (walletId: string) => {
    setFormData(prev => {
      if (prev.selectedWallets.includes(walletId)) {
        return {
          ...prev,
          selectedWallets: prev.selectedWallets.filter(id => id !== walletId)
        }
      } else {
        return {
          ...prev,
          selectedWallets: [...prev.selectedWallets, walletId]
        }
      }
    })
  }

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsExecuting(true)
    setBundleStatus(null)

    try {
      const params = {
        network: formData.network,
        tokenAddress: formData.tokenAddress,
        walletAddresses: formData.selectedWallets,
        amountPerWallet: formData.amountPerWallet,
        slippage: parseFloat(formData.slippage) / 100,
        rpcUrl: formData.network === 'BSC'
          ? 'https://bsc-dataseed.binance.org/'
          : 'https://api.mainnet-beta.solana.com',
        useMEVProtection: formData.useMEVProtection,
        useJito: formData.useJito
      }

      let response
      if (formData.network === 'BSC') {
        response = await window.electronAPI.invoke('launch:executeBSCBundleBuy', params)
      } else {
        response = await window.electronAPI.invoke('launch:executeSolanaBundleBuy', params)
      }

      if (response.success && response.data) {
        const batchId = response.data.batchId

        // 初始化状态
        setBundleStatus({
          batchId,
          status: 'executing',
          currentIndex: 0,
          totalWallets: formData.selectedWallets.length,
          results: [],
          summary: {
            totalWallets: formData.selectedWallets.length,
            successful: 0,
            failed: 0,
            totalAmountIn: '0',
            totalAmountOut: '0',
            totalGasUsed: '0'
          }
        })

        // 轮询状态
        pollBundleStatus(batchId, formData.network)

      } else {
        throw new Error(response.error || 'Failed to execute bundle buy')
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setIsExecuting(false)
      alert(`Error: ${errorMessage}`)
    }
  }

  // 轮询捆绑状态
  const pollBundleStatus = async (batchId: string, network: 'BSC' | 'Solana') => {
    const interval = setInterval(async () => {
      try {
        let response
        if (network === 'BSC') {
          response = await window.electronAPI.invoke('launch:getBSCBundleStatus', batchId)
        } else {
          response = await window.electronAPI.invoke('launch:getSolanaBundleStatus', batchId)
        }

        if (response.success && response.data) {
          const status = response.data

          setBundleStatus({
            batchId: status.batchId,
            status: status.status === 'completed' || status.status === 'failed'
              ? status.status as 'completed' | 'failed'
              : 'executing' as any,
            currentIndex: status.currentIndex,
            totalWallets: status.totalWallets,
            results: status.results,
            summary: status.summary
          })

          if (status.status === 'completed' || status.status === 'failed') {
            clearInterval(interval)
            setIsExecuting(false)
          }
        }
      } catch (error) {
        console.error('Failed to poll bundle status:', error)
        clearInterval(interval)
        setIsExecuting(false)
      }
    }, 1000)
  }

  // 取消捆绑
  const handleCancel = async () => {
    if (!bundleStatus) return

    try {
      let response
      if (formData.network === 'BSC') {
        response = await window.electronAPI.invoke('launch:cancelBSCBundle', bundleStatus.batchId)
      } else {
        response = await window.electronAPI.invoke('launch:cancelSolanaBundle', bundleStatus.batchId)
      }

      if (response.success && response.data?.cancelled) {
        setIsExecuting(false)
        setBundleStatus(prev => prev ? { ...prev, status: 'failed' } : null)
      }
    } catch (error) {
      console.error('Failed to cancel bundle:', error)
    }
  }

  // 重置表单
  const handleReset = () => {
    setFormData({
      network: 'BSC',
      tokenAddress: '',
      selectedWallets: [],
      amountPerWallet: '',
      slippage: '5',
      useMEVProtection: false,
      useJito: false
    })
    setBundleStatus(null)
    setCostEstimate(null)
    setErrors({})
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Bundle Buy</h1>
          <p className="text-muted-foreground">Execute bulk token purchases across multiple wallets</p>
        </div>
        <Badge variant={formData.network === 'BSC' ? 'default' : 'secondary'}>
          {formData.network} Network
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：配置表单 */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Bundle Configuration</CardTitle>
              <CardDescription>
                Configure your bulk purchase parameters
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
                    }}
                  >
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="BSC">BSC</TabsTrigger>
                      <TabsTrigger value="Solana">Solana</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>

                {/* 代币地址 */}
                <div className="space-y-2">
                  <Label htmlFor="tokenAddress">
                    {formData.network === 'BSC' ? 'Contract' : 'Mint'} Address
                  </Label>
                  <Input
                    id="tokenAddress"
                    placeholder="0x..."
                    value={formData.tokenAddress}
                    onChange={(e) => setFormData(prev => ({ ...prev, tokenAddress: e.target.value }))}
                    disabled={isExecuting}
                    className={errors.tokenAddress ? 'border-destructive' : ''}
                  />
                  {errors.tokenAddress && (
                    <p className="text-sm text-destructive">{errors.tokenAddress}</p>
                  )}
                </div>

                {/* 钱包选择 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Wallets ({formData.selectedWallets.length} selected)</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={toggleSelectAll}
                      disabled={isExecuting || loadingWallets}
                    >
                      {formData.selectedWallets.length === wallets.length
                        ? 'Deselect All'
                        : 'Select All'}
                    </Button>
                  </div>

                  {loadingWallets ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : (
                    <div className="border rounded-md divide-y max-h-64 overflow-y-auto">
                      {wallets.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          No wallets available for {formData.network} network
                        </div>
                      ) : (
                        wallets.map(wallet => (
                          <div
                            key={wallet.id}
                            className="flex items-center space-x-3 p-3 hover:bg-muted/50"
                          >
                            <Checkbox
                              id={`wallet-${wallet.id}`}
                              checked={formData.selectedWallets.includes(wallet.id)}
                              onCheckedChange={() => toggleWallet(wallet.id)}
                              disabled={isExecuting}
                            />
                            <div className="flex-1">
                              <label
                                htmlFor={`wallet-${wallet.id}`}
                                className="text-sm font-medium cursor-pointer"
                              >
                                {wallet.name}
                              </label>
                              <p className="text-xs text-muted-foreground font-mono">
                                {wallet.address.slice(0, 8)}...{wallet.address.slice(-6)}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                  {errors.selectedWallets && (
                    <p className="text-sm text-destructive">{errors.selectedWallets}</p>
                  )}
                </div>

                {/* 每个钱包金额 */}
                <div className="space-y-2">
                  <Label htmlFor="amountPerWallet">
                    Amount Per Wallet ({formData.network === 'BSC' ? 'BNB' : 'SOL'})
                  </Label>
                  <Input
                    id="amountPerWallet"
                    type="number"
                    step="0.0001"
                    placeholder="0.001"
                    value={formData.amountPerWallet}
                    onChange={(e) => setFormData(prev => ({ ...prev, amountPerWallet: e.target.value }))}
                    disabled={isExecuting}
                    className={errors.amountPerWallet ? 'border-destructive' : ''}
                  />
                  {errors.amountPerWallet && (
                    <p className="text-sm text-destructive">{errors.amountPerWallet}</p>
                  )}
                </div>

                {/* 滑点 */}
                <div className="space-y-2">
                  <Label htmlFor="slippage">Slippage Tolerance (%)</Label>
                  <div className="flex gap-2">
                    {[1, 3, 5, 10].map(s => (
                      <Button
                        key={s}
                        type="button"
                        variant={formData.slippage === s.toString() ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFormData(prev => ({ ...prev, slippage: s.toString() }))}
                        disabled={isExecuting}
                      >
                        {s}%
                      </Button>
                    ))}
                    <Input
                      id="slippage"
                      type="number"
                      step="0.1"
                      min="0"
                      max="50"
                      className="w-24"
                      value={formData.slippage}
                      onChange={(e) => setFormData(prev => ({ ...prev, slippage: e.target.value }))}
                      disabled={isExecuting}
                    />
                  </div>
                  {errors.slippage && (
                    <p className="text-sm text-destructive">{errors.slippage}</p>
                  )}
                </div>

                {/* 高级选项 */}
                <div className="space-y-3 pt-2 border-t">
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
                        disabled={isExecuting}
                      />
                    </div>
                  )}

                  {formData.network === 'Solana' && (
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Use Jito</Label>
                        <p className="text-xs text-muted-foreground">
                          Use Jito for priority transaction ordering
                        </p>
                      </div>
                      <Switch
                        checked={formData.useJito}
                        onCheckedChange={(checked) =>
                          setFormData(prev => ({ ...prev, useJito: checked }))
                        }
                        disabled={isExecuting}
                      />
                    </div>
                  )}
                </div>

                {/* 按钮组 */}
                <div className="flex gap-2 pt-2">
                  <Button
                    type="submit"
                    disabled={isExecuting}
                    className="flex-1"
                  >
                    {isExecuting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Executing...
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="mr-2 h-4 w-4" />
                        Execute Bundle Buy
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={isExecuting ? handleCancel : handleReset}
                  >
                    {isExecuting ? 'Cancel' : 'Reset'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* 右侧：费用估算和执行状态 */}
        <div className="space-y-6">
          {/* 费用估算 */}
          <Card>
            <CardHeader>
              <CardTitle>Cost Estimate</CardTitle>
              <CardDescription>
                Estimated transaction costs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {estimatingCost && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              )}

              {!estimatingCost && costEstimate && (
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Wallets Selected</span>
                    <span className="font-medium">{formData.selectedWallets.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Amount Per Wallet</span>
                    <span className="font-medium">
                      {formData.amountPerWallet} {formData.network === 'BSC' ? 'BNB' : 'SOL'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Fee Per Wallet</span>
                    <span className="font-medium">
                      {formData.network === 'BSC'
                        ? costEstimate.feePerWallet.toFixed(6) + ' BNB'
                        : costEstimate.feePerWallet.toFixed(6) + ' SOL'}
                    </span>
                  </div>
                  {costEstimate.rentExempt && (
                    <div className="flex justify-between text-sm">
                      <span>Rent Exempt</span>
                      <span className="font-medium">
                        {costEstimate.rentExempt.toFixed(6)} SOL
                      </span>
                    </div>
                  )}
                  <div className="border-t pt-3">
                    <div className="flex justify-between">
                      <span className="font-medium">Total Cost</span>
                      <span className="font-bold text-lg">
                        {formData.network === 'BSC'
                          ? costEstimate.totalFee.toFixed(6) + ' BNB'
                          : (costEstimate.totalFee + (costEstimate.rentExempt || 0)).toFixed(6) + ' SOL'}
                      </span>
                    </div>
                  </div>
                  <div className="pt-2">
                    <Alert>
                      <Wallet className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        Total: {formData.selectedWallets.length} wallets × {formData.amountPerWallet} {formData.network === 'BSC' ? 'BNB' : 'SOL'}
                        {' '}+ gas fees
                      </AlertDescription>
                    </Alert>
                  </div>
                </div>
              )}

              {!estimatingCost && !costEstimate && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Enter parameters to estimate costs
                </p>
              )}
            </CardContent>
          </Card>

          {/* 执行状态 */}
          <Card>
            <CardHeader>
              <CardTitle>Execution Status</CardTitle>
              <CardDescription>
                Track bundle buy progress
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!bundleStatus && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Ready to execute bundle buy
                </p>
              )}

              {bundleStatus && (
                <div className="space-y-4">
                  {/* 进度 */}
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-medium">
                        Progress: {bundleStatus.currentIndex} / {bundleStatus.totalWallets}
                      </span>
                      <span className="text-muted-foreground">
                        {Math.round((bundleStatus.currentIndex / bundleStatus.totalWallets) * 100)}%
                      </span>
                    </div>
                    <Progress
                      value={(bundleStatus.currentIndex / bundleStatus.totalWallets) * 100}
                      className="h-2"
                    />
                  </div>

                  {/* 摘要 */}
                  {bundleStatus.summary && (
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-500">
                          {bundleStatus.summary.successful}
                        </div>
                        <div className="text-xs text-muted-foreground">Success</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-500">
                          {bundleStatus.summary.failed}
                        </div>
                        <div className="text-xs text-muted-foreground">Failed</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">
                          {bundleStatus.summary.totalWallets}
                        </div>
                        <div className="text-xs text-muted-foreground">Total</div>
                      </div>
                    </div>
                  )}

                  {/* 状态指示 */}
                  {bundleStatus.status === 'executing' && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Processing transactions...</span>
                    </div>
                  )}

                  {bundleStatus.status === 'completed' && (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      <span>Bundle buy completed successfully!</span>
                    </div>
                  )}

                  {bundleStatus.status === 'failed' && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Execution Failed</AlertTitle>
                      <AlertDescription>
                        Check individual results for details
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* 总计 */}
                  {bundleStatus.summary && bundleStatus.status !== 'executing' && (
                    <div className="pt-2 border-t space-y-1">
                      <div className="text-sm flex justify-between">
                        <span className="text-muted-foreground">Total In:</span>
                        <span className="font-medium">
                          {bundleStatus.summary.totalAmountIn} {formData.network === 'BSC' ? 'BNB' : 'SOL'}
                        </span>
                      </div>
                      <div className="text-sm flex justify-between">
                        <span className="text-muted-foreground">Total Out:</span>
                        <span className="font-medium">
                          {bundleStatus.summary.totalAmountOut} tokens
                        </span>
                      </div>
                      <div className="text-sm flex justify-between">
                        <span className="text-muted-foreground">Total Gas:</span>
                        <span className="font-medium">
                          {formData.network === 'BSC'
                            ? bundleStatus.summary.totalGasUsed + ' BNB'
                            : bundleStatus.summary.totalGasUsed + ' SOL'}
                        </span>
                      </div>
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

export default BundleBuy
