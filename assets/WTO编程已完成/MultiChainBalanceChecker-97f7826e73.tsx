import { useState } from 'react'
import { Card, Input, Button, message, Space, Typography, Divider, Tabs } from 'antd'
import { WalletOutlined, SearchOutlined } from '@ant-design/icons'
import { getBSCBalance, formatBalance } from '@shared/bscUtils'
import { getSolanaBalance, formatSolanaBalance } from '@shared/solanaUtils'
import './WalletList.css'

const { Title, Text } = Typography
const { TabPane } = Tabs

type NetworkType = 'bsc' | 'solana'

function MultiChainBalanceChecker() {
  const [activeNetwork, setActiveNetwork] = useState<NetworkType>('bsc')
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
      let result: string
      if (activeNetwork === 'bsc') {
        result = await getBSCBalance(address.trim())
      } else {
        result = await getSolanaBalance(address.trim())
      }
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
  const exampleAddresses = {
    bsc: [
      '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      '0x8894E0a0c962CB723c1976a4421c95949bE2D4E3',
    ],
    solana: [
      '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
      'DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK',
    ],
  }

  const handleUseExample = (addr: string) => {
    setAddress(addr)
    setBalance(null)
  }

  const handleNetworkChange = (key: string) => {
    setActiveNetwork(key as NetworkType)
    setAddress('')
    setBalance(null)
  }

  const networkConfig = {
    bsc: {
      name: 'BSC',
      currency: 'BNB',
      placeholder: '输入BSC钱包地址 (0x...)',
      color: '#F3BA2F',
    },
    solana: {
      name: 'Solana',
      currency: 'SOL',
      placeholder: '输入Solana钱包地址',
      color: '#14F195',
    },
  }

  const currentNetwork = networkConfig[activeNetwork]

  return (
    <div className="wallet-list-container">
      <Card className="wallet-list-card" style={{ maxWidth: 650 }}>
        <Title level={2} className="wallet-list-title">
          <WalletOutlined /> 多链余额查询
        </Title>
        <Text type="secondary">支持BSC和Solana网络</Text>

        <Divider />

        <Tabs activeKey={activeNetwork} onChange={handleNetworkChange}>
          <TabPane tab="🔶 BSC Network" key="bsc" />
          <TabPane tab="🟢 Solana Network" key="solana" />
        </Tabs>

        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div>
            <Text strong>钱包地址</Text>
            <Input
              size="large"
              placeholder={currentNetwork.placeholder}
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
            查询 {currentNetwork.name} 余额
          </Button>

          {balance !== null && (
            <Card
              style={{
                background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
                border: '1px solid #667eea',
              }}
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                <Text type="secondary">{currentNetwork.currency} 余额</Text>
                <Title level={3} style={{ margin: 0, color: '#667eea' }}>
                  {activeNetwork === 'bsc'
                    ? formatBalance(balance)
                    : formatSolanaBalance(balance)}{' '}
                  {currentNetwork.currency}
                </Title>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  精确值: {balance} {currentNetwork.currency}
                </Text>
              </Space>
            </Card>
          )}

          <div>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              示例地址（点击使用）:
            </Text>
            <div style={{ marginTop: 8 }}>
              {exampleAddresses[activeNetwork].map((addr, index) => (
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

          <Card size="small" style={{ background: '#f5f5f5' }}>
            <Space direction="vertical" size="small">
              <Text strong style={{ fontSize: '12px' }}>
                💡 提示
              </Text>
              <Text style={{ fontSize: '12px' }}>
                • BSC地址以 "0x" 开头，长度42个字符
              </Text>
              <Text style={{ fontSize: '12px' }}>
                • Solana地址是32-44个字符的Base58编码
              </Text>
              <Text style={{ fontSize: '12px' }}>
                • 查询使用公开RPC节点，可能会有速率限制
              </Text>
            </Space>
          </Card>
        </Space>
      </Card>
    </div>
  )
}

export default MultiChainBalanceChecker
