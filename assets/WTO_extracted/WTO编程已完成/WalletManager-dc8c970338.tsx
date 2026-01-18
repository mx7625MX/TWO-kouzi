import { useState, useEffect } from 'react'
import { 
  Card, 
  Table, 
  Button, 
  Modal, 
  Form, 
  Input, 
  Select, 
  message, 
  Space, 
  Tag,
  Typography,
  Spin
} from 'antd'
import { WalletOutlined, PlusOutlined, ReloadOutlined, DollarOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { Wallet, CreateWalletInput } from '@shared/types'
import './WalletList.css'

const { Title, Text } = Typography
const { Option } = Select

interface WalletWithBalance extends Wallet {
  balance?: string
  balanceLoading?: boolean
}

function WalletManager() {
  const [wallets, setWallets] = useState<WalletWithBalance[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [form] = Form.useForm()

  // 加载钱包列表
  const loadWallets = async () => {
    setLoading(true)
    try {
      const response = await window.electronAPI.wallet.list()
      
      if (response.success && response.data) {
        setWallets(response.data)
        message.success(`加载了 ${response.data.length} 个钱包`)
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

  // 创建钱包
  const handleCreateWallet = async (values: CreateWalletInput) => {
    try {
      const response = await window.electronAPI.wallet.create(values)
      
      if (response.success) {
        message.success('钱包创建成功！')
        form.resetFields()
        setModalVisible(false)
        loadWallets() // 重新加载列表
      } else {
        message.error(response.error || '创建钱包失败')
      }
    } catch (error: any) {
      message.error('创建钱包失败: ' + error.message)
    }
  }

  // 查询单个钱包余额
  const handleCheckBalance = async (wallet: WalletWithBalance) => {
    // 更新状态：正在加载
    setWallets(prev => 
      prev.map(w => 
        w.id === wallet.id 
          ? { ...w, balanceLoading: true } 
          : w
      )
    )

    try {
      const response = await window.electronAPI.wallet.getBalance({
        address: wallet.address,
        network: wallet.network,
      })

      if (response.success && response.data) {
        // 更新余额
        setWallets(prev =>
          prev.map(w =>
            w.id === wallet.id
              ? { ...w, balance: response.data!.balance, balanceLoading: false }
              : w
          )
        )
        message.success('余额查询成功')
      } else {
        setWallets(prev =>
          prev.map(w =>
            w.id === wallet.id
              ? { ...w, balanceLoading: false }
              : w
          )
        )
        message.error(response.error || '查询余额失败')
      }
    } catch (error: any) {
      setWallets(prev =>
        prev.map(w =>
          w.id === wallet.id
            ? { ...w, balanceLoading: false }
            : w
        )
      )
      message.error('查询余额失败: ' + error.message)
    }
  }

  // 删除钱包
  const handleDeleteWallet = async (id: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个钱包吗？此操作无法撤销！',
      okText: '确定',
      cancelText: '取消',
      okType: 'danger',
      onOk: async () => {
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
      },
    })
  }

  // 表格列定义
  const columns: ColumnsType<WalletWithBalance> = [
    {
      title: '钱包名称',
      dataIndex: 'name',
      key: 'name',
      width: 150,
      render: (name: string) => (
        <Space>
          <WalletOutlined style={{ color: '#667eea' }} />
          <Text strong>{name}</Text>
        </Space>
      ),
    },
    {
      title: '钱包地址',
      dataIndex: 'address',
      key: 'address',
      render: (address: string) => (
        <Text
          copyable
          style={{
            fontFamily: 'monospace',
            fontSize: '12px',
            maxWidth: '300px',
            display: 'inline-block',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {address}
        </Text>
      ),
    },
    {
      title: '网络',
      dataIndex: 'network',
      key: 'network',
      width: 100,
      align: 'center',
      render: (network: string) => (
        <Tag color={network === 'BSC' ? 'gold' : 'purple'}>{network}</Tag>
      ),
    },
    {
      title: '余额',
      key: 'balance',
      width: 200,
      render: (_, record) => (
        <Space>
          {record.balanceLoading ? (
            <Spin size="small" />
          ) : record.balance ? (
            <Text strong style={{ color: '#52c41a' }}>
              {parseFloat(record.balance).toFixed(4)} {record.network === 'BSC' ? 'BNB' : 'SOL'}
            </Text>
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
      render: (timestamp: number) => new Date(timestamp).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_, record) => (
        <Button
          type="link"
          danger
          size="small"
          onClick={() => handleDeleteWallet(record.id)}
        >
          删除
        </Button>
      ),
    },
  ]

  return (
    <div className="wallet-list-container">
      <Card className="wallet-list-card">
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          {/* 头部 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Title level={2} style={{ margin: 0 }}>
                <WalletOutlined /> 钱包管理
              </Title>
              <Text type="secondary">管理您的BSC和Solana钱包</Text>
            </div>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={loadWallets} loading={loading}>
                刷新
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setModalVisible(true)}
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none',
                }}
              >
                创建钱包
              </Button>
            </Space>
          </div>

          {/* 表格 */}
          <Table
            columns={columns}
            dataSource={wallets}
            rowKey="id"
            loading={loading}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 个钱包`,
            }}
            bordered
          />
        </Space>
      </Card>

      {/* 创建钱包弹窗 */}
      <Modal
        title="创建新钱包"
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false)
          form.resetFields()
        }}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateWallet}
        >
          <Form.Item
            name="name"
            label="钱包名称"
            rules={[{ required: true, message: '请输入钱包名称' }]}
          >
            <Input placeholder="例如：主钱包" />
          </Form.Item>

          <Form.Item
            name="network"
            label="网络"
            rules={[{ required: true, message: '请选择网络' }]}
          >
            <Select placeholder="选择网络">
              <Option value="BSC">BSC (BNB Chain)</Option>
              <Option value="Solana">Solana</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="address"
            label="钱包地址"
            rules={[
              { required: true, message: '请输入钱包地址' },
              {
                validator: (_, value) => {
                  const network = form.getFieldValue('network')
                  if (!value) return Promise.resolve()
                  
                  if (network === 'BSC' && !value.startsWith('0x')) {
                    return Promise.reject('BSC地址应以0x开头')
                  }
                  if (network === 'BSC' && value.length !== 42) {
                    return Promise.reject('BSC地址长度应为42个字符')
                  }
                  if (network === 'Solana' && (value.length < 32 || value.length > 44)) {
                    return Promise.reject('Solana地址长度应为32-44个字符')
                  }
                  
                  return Promise.resolve()
                },
              },
            ]}
          >
            <Input placeholder="输入钱包地址" />
          </Form.Item>

          <Form.Item
            name="encrypted_key"
            label="加密私钥"
            rules={[{ required: true, message: '请输入加密后的私钥' }]}
            extra="请确保私钥已经过加密处理"
          >
            <Input.TextArea
              rows={3}
              placeholder="输入加密后的私钥（Base64编码）"
            />
          </Form.Item>

          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => setModalVisible(false)}>
                取消
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none',
                }}
              >
                创建
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default WalletManager
