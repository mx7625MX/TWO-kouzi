/**
 * 交易历史面板
 * 展示、筛选、导出交易记录
 */

import React, { useState, useEffect } from 'react'
import { Table, Button, Space, DatePicker, Select, Input, Card, Statistic, Row, Col, Tag, Modal, message, Tooltip } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import { ReloadOutlined, DownloadOutlined, DeleteOutlined, FilterOutlined, ExportOutlined } from '@ant-design/icons'
import './styles/TransactionHistoryPanel.css'

const { RangePicker } = DatePicker
const { Option } = Select

/**
 * 交易记录接口
 */
interface Transaction {
  id: string
  type: string
  network: string
  token_address: string
  wallet_id?: string
  amount: string
  tx_hash?: string
  status: 'success' | 'failed' | 'pending'
  gas_used?: string
  created_at: number
}

/**
 * 查询参数接口
 */
interface QueryParams {
  startDate?: number
  endDate?: number
  type?: string
  network?: string
  tokenAddress?: string
  walletId?: string
  status?: string
  limit?: number
  offset?: number
}

/**
 * 统计数据接口
 */
interface Stats {
  totalTransactions: number
  totalAmount: string
  successfulTransactions: number
  failedTransactions: number
  pendingTransactions: number
  averageAmount: string
}

/**
 * 交易历史面板组件
 */
const TransactionHistoryPanel: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState<Stats | null>(null)
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [filters, setFilters] = useState<QueryParams>({})
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0
  })
  const [exportModalVisible, setExportModalVisible] = useState(false)
  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv')

  // 加载交易历史
  const loadTransactions = async () => {
    setLoading(true)
    try {
      const result = await window.ipcRenderer.invoke('transactions:get-history', {
        ...filters,
        limit: pagination.pageSize,
        offset: (pagination.current - 1) * pagination.pageSize
      })

      if (result.success) {
        setTransactions(result.data)
      } else {
        message.error(result.error || '加载交易历史失败')
      }
    } catch (error: any) {
      console.error('加载交易历史失败:', error)
      message.error('加载交易历史失败')
    } finally {
      setLoading(false)
    }
  }

  // 加载统计数据
  const loadStats = async () => {
    try {
      const result = await window.ipcRenderer.invoke('transactions:get-stats', filters)
      if (result.success) {
        setStats(result.data)
      }
    } catch (error) {
      console.error('加载统计失败:', error)
    }
  }

  // 初始加载
  useEffect(() => {
    loadTransactions()
    loadStats()
  }, [pagination.current, pagination.pageSize])

  // 刷新数据
  const handleRefresh = () => {
    loadTransactions()
    loadStats()
  }

  // 筛选条件变化
  const handleFilterChange = (key: string, value: any) => {
    setFilters({ ...filters, [key]: value })
    setPagination({ ...pagination, current: 1 })
  }

  // 日期范围变化
  const handleDateRangeChange = (dates: any) => {
    if (dates && dates[0] && dates[1]) {
      setFilters({
        ...filters,
        startDate: dates[0].unix(),
        endDate: dates[1].unix()
      })
    } else {
      const { startDate, endDate, ...rest } = filters
      setFilters(rest)
    }
    setPagination({ ...pagination, current: 1 })
  }

  // 搜索代币地址
  const handleSearchTokenAddress = () => {
    loadTransactions()
    loadStats()
  }

  // 重置筛选
  const handleResetFilters = () => {
    setFilters({})
    setPagination({ ...pagination, current: 1 })
  }

  // 导出交易历史
  const handleExport = async () => {
    setExportModalVisible(false)
    message.loading('正在导出...', 0)

    try {
      const savePath = await window.ipcRenderer.invoke('dialog:save-file', {
        filters: [
          { name: exportFormat === 'csv' ? 'CSV 文件' : 'JSON 文件', extensions: [exportFormat] }
        ]
      })

      if (!savePath) {
        message.destroy()
        return
      }

      const result = await window.ipcRenderer.invoke('transactions:export', {
        query: filters,
        format: exportFormat,
        savePath: path.dirname(savePath)
      })

      message.destroy()

      if (result.success) {
        message.success('导出成功')
      } else {
        message.error(result.error || '导出失败')
      }
    } catch (error: any) {
      message.destroy()
      console.error('导出失败:', error)
      message.error('导出失败')
    }
  }

  // 删除选中交易
  const handleDeleteSelected = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要删除的交易记录')
      return
    }

    Modal.confirm({
      title: '确认删除',
      content: `确定要删除选中的 ${selectedRowKeys.length} 条交易记录吗？`,
      onOk: async () => {
        try {
          const result = await window.ipcRenderer.invoke('transactions:delete-batch', selectedRowKeys as string[])
          if (result.success) {
            message.success(`成功删除 ${result.deleted} 条记录`)
            setSelectedRowKeys([])
            loadTransactions()
            loadStats()
          } else {
            message.error(result.error || '删除失败')
          }
        } catch (error: any) {
          console.error('删除失败:', error)
          message.error('删除失败')
        }
      }
    })
  }

  // 单条删除
  const handleDelete = async (record: Transaction) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这条交易记录吗？',
      onOk: async () => {
        try {
          const result = await window.ipcRenderer.invoke('transactions:delete', record.id)
          if (result.success) {
            message.success('删除成功')
            loadTransactions()
            loadStats()
          } else {
            message.error(result.error || '删除失败')
          }
        } catch (error: any) {
          console.error('删除失败:', error)
          message.error('删除失败')
        }
      }
    })
  }

  // 表格列定义
  const columns: ColumnsType<Transaction> = [
    {
      title: '时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (timestamp: number) => dayjs.unix(timestamp).format('YYYY-MM-DD HH:mm:ss')
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (type: string) => {
        const typeMap: Record<string, { text: string; color: string }> = {
          'launch': { text: '发币', color: 'blue' },
          'buy': { text: '买入', color: 'green' },
          'sell': { text: '卖出', color: 'orange' },
          'transfer': { text: '转账', color: 'purple' },
          'bundle_buy': { text: '批量买入', color: 'cyan' }
        }
        const config = typeMap[type] || { text: type, color: 'default' }
        return <Tag color={config.color}>{config.text}</Tag>
      }
    },
    {
      title: '网络',
      dataIndex: 'network',
      key: 'network',
      width: 80,
      render: (network: string) => {
        const networkMap: Record<string, string> = {
          'BSC': 'BSC',
          'Solana': 'SOL'
        }
        return networkMap[network] || network
      }
    },
    {
      title: '代币地址',
      dataIndex: 'token_address',
      key: 'token_address',
      width: 200,
      ellipsis: {
        showTitle: false
      },
      render: (address: string) => (
        <Tooltip placement="topLeft" title={address}>
          {address.substring(0, 8)}...{address.substring(address.length - 6)}
        </Tooltip>
      )
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 150,
      render: (amount: string) => {
        const num = parseFloat(amount)
        return num.toFixed(4)
      }
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const statusMap: Record<string, { text: string; color: string }> = {
          'success': { text: '成功', color: 'success' },
          'failed': { text: '失败', color: 'error' },
          'pending': { text: '待处理', color: 'processing' }
        }
        const config = statusMap[status] || { text: status, color: 'default' }
        return <Tag color={config.color}>{config.text}</Tag>
      }
    },
    {
      title: 'Gas消耗',
      dataIndex: 'gas_used',
      key: 'gas_used',
      width: 120,
      render: (gas: string | undefined) => gas ? `${parseFloat(gas).toFixed(4)} BNB` : '-'
    },
    {
      title: '交易哈希',
      dataIndex: 'tx_hash',
      key: 'tx_hash',
      width: 200,
      ellipsis: {
        showTitle: false
      },
      render: (txHash: string | undefined) => {
        if (!txHash) return '-'
        return (
          <Tooltip placement="topLeft" title={txHash}>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault()
                window.ipcRenderer.invoke('app:open-external', txHash)
              }}
            >
              {txHash.substring(0, 8)}...{txHash.substring(txHash.length - 6)}
            </a>
          </Tooltip>
        )
      }
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      fixed: 'right',
      render: (_: any, record: Transaction) => (
        <Button
          type="link"
          danger
          size="small"
          icon={<DeleteOutlined />}
          onClick={() => handleDelete(record)}
        >
          删除
        </Button>
      )
    }
  ]

  return (
    <div className="transaction-history-panel">
      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={4}>
          <Card>
            <Statistic
              title="总交易数"
              value={stats?.totalTransactions || 0}
              prefix={<ReloadOutlined />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="总金额"
              value={stats?.totalAmount || '0'}
              precision={4}
              suffix="BNB"
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="成功交易"
              value={stats?.successfulTransactions || 0}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="失败交易"
              value={stats?.failedTransactions || 0}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="待处理"
              value={stats?.pendingTransactions || 0}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="平均金额"
              value={stats?.averageAmount || '0'}
              precision={4}
              suffix="BNB"
            />
          </Card>
        </Col>
      </Row>

      {/* 筛选工具栏 */}
      <Card style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Row gutter={16}>
            <Col span={6}>
              <RangePicker
                style={{ width: '100%' }}
                placeholder={['开始时间', '结束时间']}
                onChange={handleDateRangeChange}
              />
            </Col>
            <Col span={4}>
              <Select
                placeholder="交易类型"
                style={{ width: '100%' }}
                allowClear
                onChange={(value) => handleFilterChange('type', value)}
              >
                <Option value="launch">发币</Option>
                <Option value="buy">买入</Option>
                <Option value="sell">卖出</Option>
                <Option value="transfer">转账</Option>
                <Option value="bundle_buy">批量买入</Option>
              </Select>
            </Col>
            <Col span={4}>
              <Select
                placeholder="网络"
                style={{ width: '100%' }}
                allowClear
                onChange={(value) => handleFilterChange('network', value)}
              >
                <Option value="BSC">BSC</Option>
                <Option value="Solana">Solana</Option>
              </Select>
            </Col>
            <Col span={4}>
              <Select
                placeholder="状态"
                style={{ width: '100%' }}
                allowClear
                onChange={(value) => handleFilterChange('status', value)}
              >
                <Option value="success">成功</Option>
                <Option value="failed">失败</Option>
                <Option value="pending">待处理</Option>
              </Select>
            </Col>
            <Col span={6}>
              <Input.Search
                placeholder="输入代币地址"
                enterButton="搜索"
                onSearch={handleSearchTokenAddress}
              />
            </Col>
          </Row>
          <Row>
            <Space>
              <Button
                type="primary"
                icon={<ReloadOutlined />}
                onClick={handleRefresh}
              >
                刷新
              </Button>
              <Button
                icon={<FilterOutlined />}
                onClick={handleResetFilters}
              >
                重置筛选
              </Button>
              <Button
                icon={<ExportOutlined />}
                onClick={() => setExportModalVisible(true)}
              >
                导出
              </Button>
              {selectedRowKeys.length > 0 && (
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  onClick={handleDeleteSelected}
                >
                  删除选中 ({selectedRowKeys.length})
                </Button>
              )}
            </Space>
          </Row>
        </Space>
      </Card>

      {/* 交易记录表格 */}
      <Card>
        <Table
          columns={columns}
          dataSource={transactions}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1200, y: 600 }}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
            onChange: (page, pageSize) => {
              setPagination({
                ...pagination,
                current: page,
                pageSize: pageSize || 20
              })
            }
          }}
          rowSelection={{
            selectedRowKeys,
            onChange: (keys) => setSelectedRowKeys(keys)
          }}
        />
      </Card>

      {/* 导出对话框 */}
      <Modal
        title="导出交易历史"
        open={exportModalVisible}
        onOk={handleExport}
        onCancel={() => setExportModalVisible(false)}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <label>导出格式：</label>
            <Select
              value={exportFormat}
              onChange={setExportFormat}
              style={{ width: 200, marginLeft: 8 }}
            >
              <Option value="csv">CSV</Option>
              <Option value="json">JSON</Option>
            </Select>
          </div>
        </Space>
      </Modal>
    </div>
  )
}

export default TransactionHistoryPanel
