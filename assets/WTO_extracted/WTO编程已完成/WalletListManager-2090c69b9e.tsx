import { useState, useEffect } from 'react'
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Radio,
  message,
  Space,
  Tag,
  Typography,
  Spin,
  Tooltip,
  Popconfirm,
  Alert,
} from 'antd'
import {
  WalletOutlined,
  PlusOutlined,
  ReloadOutlined,
  DollarOutlined,
  ImportOutlined,
  DeleteOutlined,
  EyeOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { Wallet } from '@shared/types'
import ImportWalletModal from './ImportWalletModal'
import './WalletList.css'

const { Title, Text, Paragraph } = Typography

interface WalletWithBalance extends Wallet {
  balance?: string
  balanceLoading?: boolean
}

function WalletListManager() {
  const [wallets, setWallets] = useState<WalletWithBalance[]>([])
  const [loading, setLoading] = useState(false)
  const [createModalVisible, setCreateModalVisible] = useState(false)
  const [importModalVisible, setImportModalVisible] = useState(false)
  const [createForm] = Form.useForm()
  const [creatingWallet, setCreatingWallet] = useState(false)
  const [newWalletInfo, setNewWalletInfo] = useState<{
    address: string
    privateKey: string
    mnemonic?: string
  } | null>(null)

  // 加载钱包列表
  const loadWallets = async () => {
    setLoading(true)
    try {
      const response = await window.electronAPI.wallet.list()

      if (response.success && response.data) {
        setWallets(response.data)
        if (response.data.length > 0) {
          message.success(`加载了 ${response.data.length} 个钱包`)
        }
      } else {
        message.error(response.error || '加载钱包列表失败')
      }
    } catch (error: any) {
      message.error('加载钱包列表失败: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  // 组件加载时获取钱包列表
  useEffect(() => {
    loadWallets()
  }, [])

  // 创建新钱包
  const handleCreateWallet = async (_values: { name: string; network: 'BSC' | 'Solana' }) => {
    setCreatingWallet(true)
    try {
      // 这里需要调用创建钱包的IPC方法
      // 目前我们先使用模拟数据
      message.success('钱包创建功能开发中...')
      
      // 模拟创建结果
      setNewWalletInfo({
        address: '0x' + Math.random().toString(16).substr(2, 40),
        privateKey: '0x' + Math.random().toString(16).substr(2, 64),
        mnemonic: 'word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12',
      })
      
      createForm.resetFields()
      // 不立即关闭modal，让用户看到私钥和助记词
    } catch (error: any) {
      message.error('创建钱包失败: ' + error.message)
    } finally {
      setCreatingWallet(false)
    }
  }

  // 确认保存新钱包
  const handleSaveNewWallet = () => {
    setCreateModalVisible(false)
    setNewWalletInfo(null)
    loadWallets()
  }

  // 导入成功回调
  const handleImportSuccess = () => {
    setImportModalVisible(false)
    loadWallets()
  }

  // 查询单个钱包余额
  const handleCheckBalance = async (wallet: WalletWithBalance) => {
    setWallets((prev) =>
      prev.map((w) => (w.id === wallet.id ? { ...w, balanceLoading: true } : w))
    )

    try {
      const response = await window.electronAPI.wallet.getBalance({
        address: wallet.address,
        network: wallet.network,
      })

      if (response.success && response.data) {
        setWallets((prev) =>
          prev.map((w) =>
            w.id === wallet.id
              ? { ...w, balance: response.data!.balance, balanceLoading: false }
              : w
          )
        )
        message.success('余额查询成功')
      } else {
        setWallets((prev) =>
          prev.map((w) => (w.id === wallet.id ? { ...w, balanceLoading: false } : w))
        )
        message.error(response.error || '查询余额失败')
      }
    } catch (error: any) {
      setWallets((prev) =>
        prev.map((w) => (w.id === wallet.id ? { ...w, balanceLoading: false } : w))
      )
      message.error('查询余额失败: ' + error.message)
    }
  }

  // 批量查询余额
  const handleCheckAllBalances = async () => {
    message.info('批量查询余额...')
    for (const wallet of wallets) {
      await handleCheckBalance(wallet)
      // 添加延迟避免请求过快
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
  }

  // 删除钱包
  const handleDeleteWallet = async (id: string) => {
    try {
      const response = await window.electronAPI.wallet.delete(id)

      if (response.success) {
        message.success('钱包删除成功')
        loadWallets()
      } else {
        message.error(response.error || '删除钱包失败')
      }
    } catch (error: any) {
      message.error('删除钱包失败: ' + error.message)
    }
  }

  // 表格列定义
  const columns: ColumnsType<WalletWithBalance> = [
    {
      title: '钱包名称',
      dataIndex: 'name',
      key: 'name',
      width: 150,
      fixed: 'left',
      render: (name: string) => (
        <Space>
          <WalletOutlined style={{ color: '#667eea', fontSize: '16px' }} />
          <Text strong>{name}</Text>
        </Space>
      ),
    },
    {
      title: '钱包地址',
      dataIndex: 'address',
      key: 'address',
      width: 300,
      render: (address: string) => (
        <Space>
          <Text
            copyable={{ text: address, tooltips: ['复制地址', '已复制'] }}
            style={{
              fontFamily: 'monospace',
              fontSize: '12px',
              maxWidth: '250px',
              display: 'inline-block',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {address}
          </Text>
        </Space>
      ),
    },
    {
      title: '网络',
      dataIndex: 'network',
      key: 'network',
      width: 100,
      align: 'center',
      filters: [
        { text: 'BSC', value: 'BSC' },
        { text: 'Solana', value: 'Solana' },
      ],
      onFilter: (value, record) => record.network === value,
      render: (network: string) => (
        <Tag color={network === 'BSC' ? 'gold' : 'purple'}>{network}</Tag>
      ),
    },
    {
      title: '余额',
      key: 'balance',
      width: 200,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          {record.balanceLoading ? (
            <Space>
              <Spin size="small" />
              <Text type="secondary" style={{ fontSize: '12px' }}>查询中...</Text>
            </Space>
          ) : record.balance ? (
            <>
              <Text strong style={{ color: '#52c41a', fontSize: '14px' }}>
                {parseFloat(record.balance).toFixed(4)}{' '}
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {record.network === 'BSC' ? 'BNB' : 'SOL'}
                </Text>
              </Text>
              <Button
                size="small"
                type="text"
                icon={<ReloadOutlined />}
                onClick={() => handleCheckBalance(record)}
                style={{ padding: '0 4px', height: '20px', fontSize: '12px' }}
              >
                刷新
              </Button>
            </>
          ) : (
            <Button
              size="small"
              type="link"
              icon={<DollarOutlined />}
              onClick={() => handleCheckBalance(record)}
            >
              查询余额
            </Button>
          )}
        </Space>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      sorter: (a, b) => a.created_at - b.created_at,
      render: (timestamp: number) => new Date(timestamp).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="查看详情">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => message.info('详情功能开发中...')}
            />
          </Tooltip>
          <Popconfirm
            title="确认删除"
            description="确定要删除这个钱包吗？此操作无法撤销！"
            onConfirm={() => handleDeleteWallet(record.id)}
            okText="确定"
            cancelText="取消"
            okType="danger"
          >
            <Tooltip title="删除钱包">
              <Button type="text" size="small" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div className="wallet-list-container">
      <Card className="wallet-list-card">
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          {/* 头部 */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            <div>
              <Title level={2} style={{ margin: 0 }}>
                <WalletOutlined /> 钱包管理系统
              </Title>
              <Text type="secondary">
                管理您的BSC和Solana钱包 · 共 {wallets.length} 个钱包
              </Text>
            </div>
            <Space wrap>
              <Button icon={<ReloadOutlined />} onClick={loadWallets} loading={loading}>
                刷新
              </Button>
              <Button
                icon={<DollarOutlined />}
                onClick={handleCheckAllBalances}
                type="primary"
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none',
                }}
              >
                批量查询余额
              </Button>
              <Button
                icon={<ImportOutlined />}
                onClick={() => setImportModalVisible(true)}
                style={{
                  borderColor: '#52c41a',
                  color: '#52c41a',
                }}
              >
                导入钱包
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setCreateModalVisible(true)}
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none',
                }}
              >
                创建钱包
              </Button>
            </Space>
          </div>

          {/* 资产统计卡片 */}
          {wallets.length > 0 && (
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <Card
                size="small"
                style={{
                  flex: 1,
                  minWidth: '200px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                }}
              >
                <Space direction="vertical" size={0}>
                  <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px' }}>
                    BSC钱包
                  </Text>
                  <Title level={3} style={{ color: 'white', margin: '8px 0 0 0' }}>
                    {wallets.filter(w => w.network === 'BSC').length}
                  </Title>
                  <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: '13px' }}>
                    总余额:{' '}
                    {wallets
                      .filter(w => w.network === 'BSC' && w.balance)
                      .reduce((sum, w) => sum + parseFloat(w.balance || '0'), 0)
                      .toFixed(4)}{' '}
                    BNB
                  </Text>
                </Space>
              </Card>

              <Card
                size="small"
                style={{
                  flex: 1,
                  minWidth: '200px',
                  background: 'linear-gradient(135deg, #14F195 0%, #9945FF 100%)',
                  color: 'white',
                }}
              >
                <Space direction="vertical" size={0}>
                  <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px' }}>
                    Solana钱包
                  </Text>
                  <Title level={3} style={{ color: 'white', margin: '8px 0 0 0' }}>
                    {wallets.filter(w => w.network === 'Solana').length}
                  </Title>
                  <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: '13px' }}>
                    总余额:{' '}
                    {wallets
                      .filter(w => w.network === 'Solana' && w.balance)
                      .reduce((sum, w) => sum + parseFloat(w.balance || '0'), 0)
                      .toFixed(4)}{' '}
                    SOL
                  </Text>
                </Space>
              </Card>

              <Card
                size="small"
                style={{
                  flex: 1,
                  minWidth: '200px',
                  background: 'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)',
                  color: 'white',
                }}
              >
                <Space direction="vertical" size={0}>
                  <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px' }}>
                    已查询余额
                  </Text>
                  <Title level={3} style={{ color: 'white', margin: '8px 0 0 0' }}>
                    {wallets.filter(w => w.balance).length}/{wallets.length}
                  </Title>
                  <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: '13px' }}>
                    {wallets.filter(w => w.balance).length === wallets.length
                      ? '所有钱包已查询'
                      : `还有 ${wallets.length - wallets.filter(w => w.balance).length} 个未查询`}
                  </Text>
                </Space>
              </Card>
            </div>
          )}

          {/* 提示信息 */}
          {wallets.length === 0 && !loading && (
            <Alert
              message="还没有钱包"
              description={'点击"创建钱包"按钮创建新钱包，或点击"导入钱包"导入现有钱包。'}
              type="info"
              showIcon
              icon={<WalletOutlined />}
            />
          )}

          {/* 表格 */}
          <Table
            columns={columns}
            dataSource={wallets}
            rowKey="id"
            loading={loading}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `共 ${total} 个钱包`,
              pageSizeOptions: ['10', '20', '50', '100'],
            }}
            bordered
            scroll={{ x: 1200 }}
          />
        </Space>
      </Card>

      {/* 创建钱包弹窗 */}
      <Modal
        title={<Space><PlusOutlined /> 创建新钱包</Space>}
        open={createModalVisible}
        onCancel={() => {
          setCreateModalVisible(false)
          setNewWalletInfo(null)
          createForm.resetFields()
        }}
        footer={null}
        width={600}
      >
        {!newWalletInfo ? (
          <Form form={createForm} layout="vertical" onFinish={handleCreateWallet}>
            <Form.Item
              name="name"
              label="钱包名称"
              rules={[
                { required: true, message: '请输入钱包名称' },
                { min: 2, message: '钱包名称至少2个字符' },
              ]}
            >
              <Input placeholder="例如：主钱包、交易钱包" prefix={<WalletOutlined />} />
            </Form.Item>

            <Form.Item
              name="network"
              label="选择网络"
              rules={[{ required: true, message: '请选择网络' }]}
              initialValue="BSC"
            >
              <Radio.Group size="large">
                <Radio.Button value="BSC">
                  <Space>
                    <span style={{ color: '#F3BA2F' }}>🔶</span>
                    BSC (BNB Chain)
                  </Space>
                </Radio.Button>
                <Radio.Button value="Solana">
                  <Space>
                    <span style={{ color: '#14F195' }}>🟢</span>
                    Solana
                  </Space>
                </Radio.Button>
              </Radio.Group>
            </Form.Item>

            <Alert
              message="安全提示"
              description="创建钱包后，请务必备份您的私钥和助记词，并妥善保管。私钥一旦丢失将无法找回！"
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
            />

            <Form.Item>
              <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                <Button onClick={() => setCreateModalVisible(false)}>取消</Button>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={creatingWallet}
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    border: 'none',
                  }}
                >
                  创建钱包
                </Button>
              </Space>
            </Form.Item>
          </Form>
        ) : (
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <Alert
              message="钱包创建成功！"
              description="请立即备份以下信息，这是唯一一次显示完整私钥的机会。"
              type="success"
              showIcon
            />

            <Card size="small" title="钱包地址">
              <Paragraph
                copyable={{ text: newWalletInfo.address }}
                style={{ fontFamily: 'monospace', marginBottom: 0 }}
              >
                {newWalletInfo.address}
              </Paragraph>
            </Card>

            <Card size="small" title="私钥（请妥善保管）">
              <Paragraph
                copyable={{ text: newWalletInfo.privateKey }}
                style={{ fontFamily: 'monospace', marginBottom: 0, color: '#ff4d4f' }}
              >
                {newWalletInfo.privateKey}
              </Paragraph>
            </Card>

            {newWalletInfo.mnemonic && (
              <Card size="small" title="助记词（请妥善保管）">
                <Paragraph
                  copyable={{ text: newWalletInfo.mnemonic }}
                  style={{ marginBottom: 0, color: '#ff4d4f' }}
                >
                  {newWalletInfo.mnemonic}
                </Paragraph>
              </Card>
            )}

            <Alert
              message="⚠️ 重要提醒"
              description="私钥和助记词是恢复钱包的唯一凭证，请将其保存在安全的地方，切勿泄露给他人。关闭此窗口后将无法再次查看完整私钥。"
              type="error"
              showIcon
            />

            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button
                type="primary"
                onClick={handleSaveNewWallet}
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none',
                }}
              >
                我已备份，确认关闭
              </Button>
            </Space>
          </Space>
        )}
      </Modal>

      {/* 导入钱包弹窗 - 使用独立组件 */}
      <ImportWalletModal
        visible={importModalVisible}
        onCancel={() => setImportModalVisible(false)}
        onSuccess={handleImportSuccess}
      />
    </div>
  )
}

export default WalletListManager
