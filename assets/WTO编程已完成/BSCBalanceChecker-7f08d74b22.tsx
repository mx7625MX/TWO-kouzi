import { useState } from 'react'
import { Card, Input, Button, message, Space, Typography, Divider } from 'antd'
import { WalletOutlined, SearchOutlined } from '@ant-design/icons'
import { getBSCBalance, formatBalance } from '@shared/bscUtils'
import './WalletList.css'

const { Title, Text } = Typography

function BSCBalanceChecker() {
  const [address, setAddress] = useState('')
  const [balance, setBalance] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleCheckBalance = async () => {
    if (!address.trim()) {
      message.warning('请输入钱包地址')
      return
    }

    setLoading(true)
    try {
      const result = await getBSCBalance(address.trim())
      setBalance(result)
      message.success('查询成功！')
    } catch (error: any) {
      message.error(error.message || '查询失败')
      setBalance(null)
    } finally {
      setLoading(false)
    }
  }

  // 示例地址
  const exampleAddresses = [
    '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    '0x8894E0a0c962CB723c1976a4421c95949bE2D4E3',
  ]

  const handleUseExample = (addr: string) => {
    setAddress(addr)
    setBalance(null)
  }

  return (
    <div className="wallet-list-container">
      <Card className="wallet-list-card" style={{ maxWidth: 600 }}>
        <Title level={2} className="wallet-list-title">
          <WalletOutlined /> BSC 余额查询
        </Title>
        <Text type="secondary">查询BNB钱包余额</Text>

        <Divider />

        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div>
            <Text strong>钱包地址</Text>
            <Input
              size="large"
              placeholder="输入BSC钱包地址 (0x...)"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              prefix={<WalletOutlined style={{ color: '#8c8c8c' }} />}
              onPressEnter={handleCheckBalance}
            />
          </div>

          <Button
            type="primary"
            size="large"
            block
            icon={<SearchOutlined />}
            loading={loading}
            onClick={handleCheckBalance}
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
            }}
          >
            查询余额
          </Button>

          {balance !== null && (
            <Card
              style={{
                background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
                border: '1px solid #667eea',
              }}
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                <Text type="secondary">BNB 余额</Text>
                <Title level={3} style={{ margin: 0, color: '#667eea' }}>
                  {formatBalance(balance)} BNB
                </Title>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  精确值: {balance} BNB
                </Text>
              </Space>
            </Card>
          )}

          <div>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              示例地址（点击使用）:
            </Text>
            <div style={{ marginTop: 8 }}>
              {exampleAddresses.map((addr, index) => (
                <Button
                  key={index}
                  size="small"
                  onClick={() => handleUseExample(addr)}
                  style={{ marginRight: 8, marginBottom: 8 }}
                >
                  示例 {index + 1}
                </Button>
              ))}
            </div>
          </div>
        </Space>
      </Card>
    </div>
  )
}

export default BSCBalanceChecker
