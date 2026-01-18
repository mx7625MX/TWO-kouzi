/**
 * 发币任务列表界面
 * 展示和管理所有发币任务
 */

import React, { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  RefreshCw,
  Search,
  Filter,
  Trash2,
  RefreshCw as RetryIcon,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  ExternalLink,
  AlertCircle,
  MoreHorizontal,
  Eye,
  Copy,
  Calendar,
  Network
} from 'lucide-react'

// 类型定义
interface LaunchTask {
  id: string
  network: 'BSC' | 'Solana'
  token_name: string
  token_symbol: string
  total_supply: string
  token_address?: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  result?: string
  error?: string
  created_at: number
  completed_at?: number
}

interface TaskStatistics {
  total: number
  completed: number
  failed: number
  inProgress: number
  pending: number
}

export const LaunchTasks: React.FC = () => {
  // 任务列表
  const [tasks, setTasks] = useState<LaunchTask[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  // 筛选和搜索
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterNetwork, setFilterNetwork] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // 统计数据
  const [statistics, setStatistics] = useState<TaskStatistics | null>(null)

  // 选中的任务详情
  const [selectedTask, setSelectedTask] = useState<LaunchTask | null>(null)
  const [showDetailDialog, setShowDetailDialog] = useState(false)

  // 加载任务列表
  const loadTasks = async () => {
    setLoading(true)
    try {
      const response = await window.electronAPI.invoke('launch:getAllTasks')
      if (response.success && response.data) {
        setTasks(response.data)
      }
    } catch (error) {
      console.error('Failed to load tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  // 加载统计数据
  const loadStatistics = async () => {
    try {
      const response = await window.electronAPI.invoke('launch:getStatistics')
      if (response.success && response.data) {
        setStatistics(response.data)
      }
    } catch (error) {
      console.error('Failed to load statistics:', error)
    }
  }

  // 刷新数据
  const handleRefresh = async () => {
    setRefreshing(true)
    await Promise.all([loadTasks(), loadStatistics()])
    setRefreshing(false)
  }

  // 取消任务
  const handleCancelTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to cancel this task?')) return

    try {
      const response = await window.electronAPI.invoke('launch:cancelTask', taskId)
      if (response.success) {
        await handleRefresh()
      }
    } catch (error) {
      console.error('Failed to cancel task:', error)
      alert('Failed to cancel task')
    }
  }

  // 重试失败的任务
  const handleRetryTask = async (taskId: string) => {
    try {
      const response = await window.electronAPI.invoke('launch:retryTask', taskId)
      if (response.success) {
        await handleRefresh()
      }
    } catch (error) {
      console.error('Failed to retry task:', error)
      alert('Failed to retry task')
    }
  }

  // 清理已完成的任务
  const handleClearCompleted = async () => {
    if (!confirm('Are you sure you want to clear completed tasks?')) return

    try {
      const response = await window.electronAPI.invoke('launch:clearCompleted')
      if (response.success) {
        await handleRefresh()
      }
    } catch (error) {
      console.error('Failed to clear tasks:', error)
      alert('Failed to clear tasks')
    }
  }

  // 复制地址
  const handleCopyAddress = (address: string) => {
    navigator.clipboard.writeText(address)
  }

  // 格式化时间
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleString()
  }

  // 获取状态徽章
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500">Completed</Badge>
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>
      case 'processing':
        return <Badge variant="default" className="bg-blue-500">Processing</Badge>
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  // 获取状态图标
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-destructive" />
      case 'processing':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
      case 'pending':
        return <Clock className="h-4 w-4 text-muted-foreground" />
      default:
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />
    }
  }

  // 筛选任务
  const filteredTasks = tasks.filter(task => {
    // 状态筛选
    if (filterStatus !== 'all' && task.status !== filterStatus) {
      return false
    }

    // 网络筛选
    if (filterNetwork !== 'all' && task.network !== filterNetwork) {
      return false
    }

    // 搜索筛选
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        task.token_name.toLowerCase().includes(query) ||
        task.token_symbol.toLowerCase().includes(query) ||
        task.id.toLowerCase().includes(query) ||
        (task.token_address && task.token_address.toLowerCase().includes(query))
      )
    }

    return true
  })

  // 初始加载
  useEffect(() => {
    loadTasks()
    loadStatistics()

    // 设置定时刷新
    const interval = setInterval(async () => {
      await loadTasks()
      await loadStatistics()
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* 标题和操作 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Launch Tasks</h1>
          <p className="text-muted-foreground">Manage your token deployment tasks</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleClearCompleted}
            disabled={refreshing}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Clear Completed
          </Button>
          <Button
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      {statistics && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{statistics.total}</div>
              <p className="text-xs text-muted-foreground">Total Tasks</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-500">{statistics.completed}</div>
              <p className="text-xs text-muted-foreground">Completed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-500">{statistics.failed}</div>
              <p className="text-xs text-muted-foreground">Failed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-500">{statistics.inProgress}</div>
              <p className="text-xs text-muted-foreground">In Progress</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{statistics.pending}</div>
              <p className="text-xs text-muted-foreground">Pending</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 筛选和搜索 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* 搜索 */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, symbol, or address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* 状态筛选 */}
            <div className="w-full md:w-48">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</Item>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 网络筛选 */}
            <div className="w-full md:w-48">
              <Select value={filterNetwork} onValueChange={setFilterNetwork}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by network" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Networks</SelectItem>
                  <SelectItem value="BSC">BSC</SelectItem>
                  <SelectItem value="Solana">Solana</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 任务列表 */}
      <Card>
        <CardHeader>
          <CardTitle>Tasks ({filteredTasks.length})</CardTitle>
          <CardDescription>
            {loading ? 'Loading tasks...' : 'Recent deployment tasks'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading && filteredTasks.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No tasks found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Token</TableHead>
                    <TableHead>Network</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTasks.map(task => (
                    <TableRow key={task.id}>
                      <TableCell>
                        {getStatusIcon(task.status)}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{task.token_name}</div>
                          <div className="text-sm text-muted-foreground">{task.token_symbol}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={task.network === 'BSC' ? 'default' : 'secondary'}>
                          {task.network}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(task.status)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{formatDate(task.created_at)}</div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => {
                              setSelectedTask(task)
                              setShowDetailDialog(true)
                            }}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            {task.status === 'failed' && (
                              <DropdownMenuItem onClick={() => handleRetryTask(task.id)}>
                                <RetryIcon className="mr-2 h-4 w-4" />
                                Retry
                              </DropdownMenuItem>
                            )}
                            {(task.status === 'pending' || task.status === 'processing') && (
                              <DropdownMenuItem
                                onClick={() => handleCancelTask(task.id)}
                                className="text-destructive"
                              >
                                <XCircle className="mr-2 h-4 w-4" />
                                Cancel
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 任务详情对话框 */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Task Details</DialogTitle>
            <DialogDescription>
              Detailed information about the deployment task
            </DialogDescription>
          </DialogHeader>
          {selectedTask && (
            <div className="space-y-4">
              {/* 基本信息 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="text-sm font-medium">Task ID</div>
                  <div className="text-sm text-muted-foreground font-mono">
                    {selectedTask.id}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-medium">Status</div>
                  <div>
                    {getStatusBadge(selectedTask.status)}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-medium">Network</div>
                  <Badge variant={selectedTask.network === 'BSC' ? 'default' : 'secondary'}>
                    {selectedTask.network}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-medium">Created At</div>
                  <div className="text-sm text-muted-foreground">
                    {formatDate(selectedTask.created_at)}
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                {/* 代币信息 */}
                <div className="space-y-2 mb-4">
                  <div className="text-sm font-medium">Token Information</div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-muted-foreground">Name</div>
                      <div className="text-sm">{selectedTask.token_name}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Symbol</div>
                      <div className="text-sm">{selectedTask.token_symbol}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Total Supply</div>
                      <div className="text-sm">{selectedTask.total_supply}</div>
                    </div>
                    {selectedTask.token_address && (
                      <div>
                        <div className="text-xs text-muted-foreground">
                          {selectedTask.network === 'BSC' ? 'Contract Address' : 'Mint Address'}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-mono">
                            {selectedTask.token_address.slice(0, 12)}...{selectedTask.token_address.slice(-6)}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => handleCopyAddress(selectedTask.token_address!)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => {
                              const explorerUrl = selectedTask.network === 'BSC'
                                ? `https://bscscan.com/address/${selectedTask.token_address}`
                                : `https://solscan.io/account/${selectedTask.token_address}`
                              window.open(explorerUrl, '_blank')
                            }}
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 错误信息 */}
                {selectedTask.error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{selectedTask.error}</AlertDescription>
                  </Alert>
                )}

                {/* 结果信息 */}
                {selectedTask.result && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Deployment Result</div>
                    <div className="bg-muted p-4 rounded-md">
                      <pre className="text-xs overflow-auto">
                        {JSON.stringify(JSON.parse(selectedTask.result), null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

                {/* 完成时间 */}
                {selectedTask.completed_at && (
                  <div className="text-sm text-muted-foreground">
                    Completed at: {formatDate(selectedTask.completed_at)}
                  </div>
                )}
              </div>

              {/* 操作按钮 */}
              <div className="flex gap-2 pt-4 border-t">
                {selectedTask.status === 'failed' && (
                  <Button onClick={() => {
                    handleRetryTask(selectedTask.id)
                    setShowDetailDialog(false)
                  }}>
                    <RetryIcon className="mr-2 h-4 w-4" />
                    Retry Task
                  </Button>
                )}
                {(selectedTask.status === 'pending' || selectedTask.status === 'processing') && (
                  <Button
                    variant="destructive"
                    onClick={() => {
                      handleCancelTask(selectedTask.id)
                      setShowDetailDialog(false)
                    }}
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Cancel Task
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => setShowDetailDialog(false)}
                  className="ml-auto"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default LaunchTasks
