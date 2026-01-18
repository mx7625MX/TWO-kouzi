import { Table, Tag, Card, Space, Typography } from 'antd'
import { WalletOutlined, ClockCircleOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import './WalletList.css'

const { Title } = Typography

// 钱包数据类型定义
interface WalletData {
  key: string
  name: string
  address: string
  network: 'BSC' | 'Solana'
  createdAt: string
}

function WalletList() {
  // 模拟钱包数据
  const walletData: WalletData[] = [
    {
      key: '1',
      name: '主钱包',
      address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      network: 'BSC',
      createdAt: '2024-01-15 10:30:25',
    },
    {
      key: '2',
      name: '测试钱包',
      address: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
      network: 'Solana',
      createdAt: '2024-01-16 14:22:18',
    },
    {
      key: '3',
      name: '交易钱包A',
      address: '0x8f4e77806BEFB5C812cD37B3e7E5e1A0C9E8b9d1',
      network: 'BSC',
      createdAt: '2024-01-17 09:15:43',
    },
    {
      key: '4',
      name: '投资钱包',
      address: 'DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK',
      network: 'Solana',
      createdAt: '2024-01-18 16:45:30',
    },
    {
      key: '5',
      name: '交易钱包B',
      address: '0x1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t',
      network: 'BSC',
      createdAt: '2024-01-19 11:20:15',
    },
    {
      key: '6',
      name: '备用钱包',
      address: 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH',
      network: 'Solana',
      createdAt: '2024-01-20 13:55:42',
    },
    {
      key: '7',
      name: 'DeFi钱包',
      address: '0x9f8e7d6c5b4a3g2h1i0j9k8l7m6n5o4p3q2r1s0t',
      network: 'BSC',
      createdAt: '2024-01-21 08:30:20',
    },
    {
      key: '8',
      name: 'NFT钱包',
      address: 'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn',
      network: 'Solana',
      createdAt: '2024-01-22 15:10:35',
    },
  ]

  // 表格列定义
  const columns: ColumnsType<WalletData> = [
    {
      title: '钱包名称',
      dataIndex: 'name',
      key: 'name',
      width: 150,
      render: (name: string) => (
        <Space>
          <WalletOutlined style={{ color: '#667eea', fontSize: '16px' }} />
          <span className="wallet-name">{name}</span>
        </Space>
      ),
    },
    {
      title: '钱包地址',
      dataIndex: 'address',
      key: 'address',
      render: (address: string) => (
        <span className="wallet-address" title={address}>
          {address}
        </span>
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
      render: (network: string) => {
        const color = network === 'BSC' ? 'gold' : 'purple'
        return <Tag color={color}>{network}</Tag>
      },
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      sorter: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      render: (time: string) => (
        <Space>
          <ClockCircleOutlined style={{ color: '#8c8c8c' }} />
          <span>{time}</span>
        </Space>
      ),
    },
  ]

  return (
    <div className="wallet-list-container">
      <Card className="wallet-list-card">
        <div className="wallet-list-header">
          <Title level={2} className="wallet-list-title">
            <WalletOutlined /> 钱包列表
          </Title>
          <p className="wallet-list-description">
            管理您的BSC和Solana网络钱包
          </p>
        </div>

        <Table
          columns={columns}
          dataSource={walletData}
          pagination={{
            pageSize: 5,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 个钱包`,
            pageSizeOptions: ['5', '10', '20', '50'],
          }}
          bordered
          className="wallet-table"
        />
      </Card>
    </div>
  )
}

export default WalletList
