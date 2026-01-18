/**
 * 数据管理面板
 * 提供数据导出、导入、备份、恢复等功能
 */

import React, { useState } from 'react'
import { Card, Button, Space, Modal, Form, Select, Checkbox, message, Tabs, Row, Col, Alert, Typography, Divider, Tooltip } from 'antd'
import { DownloadOutlined, UploadOutlined, CloudUploadOutlined, DeleteOutlined, HistoryOutlined, SafetyOutlined, DatabaseOutlined, FileTextOutlined } from '@ant-design/icons'
import type { TabsProps } from 'antd'
import './styles/DataManagementPanel.css'

const { Title, Paragraph, Text } = Typography
const { Option } = Select

/**
 * 导出配置
 */
interface ExportConfig {
  dataType: 'wallets' | 'transactions' | 'launch-tasks' | 'all'
  format: 'json' | 'csv'
}

/**
 * 备份配置
 */
interface BackupConfig {
  includeWallets: boolean
  includeTransactions: boolean
  includeTasks: boolean
  includeSettings: boolean
  encrypt: boolean
}

/**
 * 数据管理面板组件
 */
const DataManagementPanel: React.FC = () => {
  const [exportModalVisible, setExportModalVisible] = useState(false)
  const [importModalVisible, setImportModalVisible] = useState(false)
  const [backupModalVisible, setBackupModalVisible] = useState(false)
  const [restoreModalVisible, setRestoreModalVisible] = useState(false)
  const [exportForm] = Form.useForm()
  const [backupForm] = Form.useForm()
  const [loading, setLoading] = useState(false)

  // 导出数据
  const handleExport = async (values: ExportConfig) => {
    setExportModalVisible(false)
    setLoading(true)
    message.loading('正在导出数据...', 0)

    try {
      const result = await window.ipcRenderer.invoke('data:export', values)

      message.destroy()

      if (result.success) {
        message.success(`导出成功！文件已保存到: ${result.filePath}`)
      } else if (result.canceled) {
        message.info('已取消导出')
      } else {
        message.error(result.error || '导出失败')
      }
    } catch (error: any) {
      message.destroy()
      console.error('导出失败:', error)
      message.error('导出失败')
    } finally {
      setLoading(false)
    }
  }

  // 导入数据
  const handleImport = async () => {
    try {
      const result = await window.ipcRenderer.invoke('dialog:open-file', {
        title: '选择要导入的文件',
        filters: [
          { name: 'JSON 文件', extensions: ['json'] },
          { name: 'CSV 文件', extensions: ['csv'] }
        ]
      })

      if (result.canceled || !result.filePath) {
        return
      }

      setLoading(true)
      message.loading('正在导入数据...', 0)

      const importResult = await window.ipcRenderer.invoke('data:import', result.filePath)

      message.destroy()

      if (importResult.success) {
        const { wallets, transactions, launchTasks } = importResult.result
        const totalImported = (wallets || 0) + (transactions || 0) + (launchTasks || 0)
        message.success(`导入成功！共导入 ${totalImported} 条数据`)
        setImportModalVisible(false)
      } else {
        message.error(importResult.error || '导入失败')
      }
    } catch (error: any) {
      message.destroy()
      console.error('导入失败:', error)
      message.error('导入失败')
    } finally {
      setLoading(false)
    }
  }

  // 备份数据
  const handleBackup = async (values: BackupConfig) => {
    setBackupModalVisible(false)
    setLoading(true)
    message.loading('正在备份数据...', 0)

    try {
      const result = await window.ipcRenderer.invoke('data:backup', values)

      message.destroy()

      if (result.success) {
        message.success(`备份成功！文件已保存到: ${result.filePath}`)
      } else if (result.canceled) {
        message.info('已取消备份')
      } else {
        message.error(result.error || '备份失败')
      }
    } catch (error: any) {
      message.destroy()
      console.error('备份失败:', error)
      message.error('备份失败')
    } finally {
      setLoading(false)
    }
  }

  // 恢复数据
  const handleRestore = async () => {
    try {
      const result = await window.ipcRenderer.invoke('dialog:open-file', {
        title: '选择备份文件',
        filters: [
          { name: '备份文件', extensions: ['json'] }
        ]
      })

      if (result.canceled || !result.filePath) {
        return
      }

      setLoading(true)
      message.loading('正在恢复数据...', 0)

      const restoreResult = await window.ipcRenderer.invoke('data:restore', result.filePath)

      message.destroy()

      if (restoreResult.success) {
        const { wallets, transactions, launchTasks, settings } = restoreResult.result
        message.success(`恢复成功！钱包: ${wallets}, 交易: ${transactions}, 任务: ${launchTasks}, 设置: ${settings}`)
        setRestoreModalVisible(false)
      } else {
        message.error(restoreResult.error || '恢复失败')
      }
    } catch (error: any) {
      message.destroy()
      console.error('恢复失败:', error)
      message.error('恢复失败')
    } finally {
      setLoading(false)
    }
  }

  // Tab 切换内容
  const tabItems: TabsProps['items'] = [
    {
      key: 'export',
      label: (
        <span>
          <DownloadOutlined />
          数据导出
        </span>
      ),
      children: (
        <div className="data-panel-content">
          <Alert
            message="导出说明"
            description="导出数据可以用于备份、分析或与其他系统共享。支持 JSON 和 CSV 两种格式。"
            type="info"
            showIcon
            style={{ marginBottom: 24 }}
          />

          <Row gutter={[16, 16]}>
            <Col span={8}>
              <Card
                hoverable
                className="data-export-card"
                onClick={() => {
                  exportForm.setFieldsValue({ dataType: 'wallets', format: 'json' })
                  setExportModalVisible(true)
                }}
              >
                <DatabaseOutlined className="card-icon" />
                <Title level={5}>导出钱包</Title>
                <Paragraph type="secondary">导出所有钱包信息，包括地址、余额等。</Paragraph>
                <Button type="primary" icon={<DownloadOutlined />}>
                  立即导出
                </Button>
              </Card>
            </Col>

            <Col span={8}>
              <Card
                hoverable
                className="data-export-card"
                onClick={() => {
                  exportForm.setFieldsValue({ dataType: 'transactions', format: 'json' })
                  setExportModalVisible(true)
                }}
              >
                <HistoryOutlined className="card-icon" />
                <Title level={5}>导出交易记录</Title>
                <Paragraph type="secondary">导出所有交易历史记录，包括发币、买卖等。</Paragraph>
                <Button type="primary" icon={<DownloadOutlined />}>
                  立即导出
                </Button>
              </Card>
            </Col>

            <Col span={8}>
              <Card
                hoverable
                className="data-export-card"
                onClick={() => {
                  exportForm.setFieldsValue({ dataType: 'all', format: 'json' })
                  setExportModalVisible(true)
                }}
              >
                <FileTextOutlined className="card-icon" />
                <Title level={5}>导出全部数据</Title>
                <Paragraph type="secondary">导出所有数据，包括钱包、交易、任务和设置。</Paragraph>
                <Button type="primary" icon={<DownloadOutlined />}>
                  立即导出
                </Button>
              </Card>
            </Col>
          </Row>

          <Divider />

          <Card title="自定义导出" extra={<Button onClick={() => setExportModalVisible(true)}>配置导出</Button>}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Paragraph>
                <Text strong>支持的导出格式：</Text>
                <ul>
                  <li><Text code>JSON</Text>：结构化数据，适合程序处理和备份</li>
                  <li><Text code>CSV</Text>：表格数据，适合 Excel 打开和分析</li>
                </ul>
              </Paragraph>
              <Paragraph>
                <Text strong>导出的数据类型：</Text>
                <ul>
                  <li>钱包信息</li>
                  <li>交易记录</li>
                  <li>发币任务</li>
                  <li>全部数据（以上所有）</li>
                </ul>
              </Paragraph>
            </Space>
          </Card>
        </div>
      )
    },
    {
      key: 'import',
      label: (
        <span>
          <UploadOutlined />
          数据导入
        </span>
      ),
      children: (
        <div className="data-panel-content">
          <Alert
            message="导入说明"
            description="从备份文件或其他来源导入数据。支持 JSON 和 CSV 两种格式。导入前请确保数据格式正确。"
            type="warning"
            showIcon
            style={{ marginBottom: 24 }}
          />

          <Card>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <div>
                <Title level={4}>快速导入</Title>
                <Paragraph type="secondary">点击下方按钮选择要导入的文件。</Paragraph>
                <Button
                  type="primary"
                  size="large"
                  icon={<UploadOutlined />}
                  onClick={handleImport}
                  loading={loading}
                >
                  选择文件并导入
                </Button>
              </div>

              <Divider />

              <div>
                <Title level={4}>导入格式说明</Title>
                <Paragraph>
                  <Text strong>JSON 格式：</Text>标准 JSON 格式，包含完整的数据结构。推荐用于备份数据的恢复。
                </Paragraph>
                <Paragraph>
                  <Text strong>CSV 格式：</Text>逗号分隔值格式，第一行为表头。适合从 Excel 或其他表格工具导入。
                </Paragraph>
              </div>

              <Alert
                message="注意事项"
                description="导入数据可能会覆盖现有数据，建议先进行备份。重复的数据将根据 ID 自动去重。"
                type="error"
                showIcon
              />
            </Space>
          </Card>
        </div>
      )
    },
    {
      key: 'backup',
      label: (
        <span>
          <SafetyOutlined />
          数据备份
        </span>
      ),
      children: (
        <div className="data-panel-content">
          <Alert
            message="备份说明"
            description="创建完整的数据备份，包含所有钱包、交易、任务和设置。建议定期备份以防止数据丢失。"
            type="info"
            showIcon
            style={{ marginBottom: 24 }}
          />

          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Card
                hoverable
                className="backup-card"
                onClick={() => {
                  backupForm.setFieldsValue({
                    includeWallets: true,
                    includeTransactions: true,
                    includeTasks: true,
                    includeSettings: true,
                    encrypt: false
                  })
                  setBackupModalVisible(true)
                }}
              >
                <SafetyOutlined className="card-icon" style={{ fontSize: 48, color: '#52c41a' }} />
                <Title level={5}>完整备份</Title>
                <Paragraph type="secondary">备份所有数据，包括钱包、交易、任务和设置。</Paragraph>
                <Button type="primary" icon={<CloudUploadOutlined />}>
                  立即备份
                </Button>
              </Card>
            </Col>

            <Col span={12}>
              <Card
                hoverable
                className="backup-card"
                onClick={() => setBackupModalVisible(true)}
              >
                <DatabaseOutlined className="card-icon" style={{ fontSize: 48, color: '#1890ff' }} />
                <Title level={5}>自定义备份</Title>
                <Paragraph type="secondary">选择需要备份的数据类型，灵活控制备份内容。</Paragraph>
                <Button type="primary" icon={<CloudUploadOutlined />}>
                  配置备份
                </Button>
              </Card>
            </Col>
          </Row>

          <Divider />

          <Card title="备份建议">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Paragraph>
                <Text strong>备份频率：</Text>
                <ul>
                  <li>日常使用：每周备份一次</li>
                  <li>高频交易：每天备份一次</li>
                  <li>重要操作前：先备份</li>
                </ul>
              </Paragraph>
              <Paragraph>
                <Text strong>备份存储：</Text>
                <ul>
                  <li>存储到云盘（如 Google Drive、Dropbox）</li>
                  <li>存储到外部硬盘或U盘</li>
                  <li>多处备份，确保安全</li>
                </ul>
              </Paragraph>
              <Paragraph>
                <Text strong>备份验证：</Text>定期测试备份文件的可用性，确保可以正常恢复。
              </Paragraph>
            </Space>
          </Card>
        </div>
      )
    },
    {
      key: 'restore',
      label: (
        <span>
          <HistoryOutlined />
          数据恢复
        </span>
      ),
      children: (
        <div className="data-panel-content">
          <Alert
            message="恢复说明"
            description="从备份文件恢复数据。恢复操作会覆盖现有数据，请谨慎操作，建议先备份当前数据。"
            type="warning"
            showIcon
            style={{ marginBottom: 24 }}
          />

          <Card>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <div>
                <Title level={4}>快速恢复</Title>
                <Paragraph type="secondary">点击下方按钮选择备份文件进行恢复。</Paragraph>
                <Button
                  type="primary"
                  size="large"
                  danger
                  icon={<UploadOutlined />}
                  onClick={handleRestore}
                  loading={loading}
                >
                  选择备份文件并恢复
                </Button>
              </div>

              <Divider />

              <div>
                <Title level={4}>恢复流程</Title>
                <ol style={{ lineHeight: 2 }}>
                  <li>选择要恢复的备份文件</li>
                  <li>系统验证备份文件格式和完整性</li>
                  <li>显示备份文件的基本信息（版本、日期等）</li>
                  <li>确认后执行恢复操作</li>
                  <li>显示恢复结果统计</li>
                </ol>
              </div>

              <Alert
                message="重要提示"
                description="恢复操作不可撤销，会覆盖现有数据。执行前请确保：1. 已备份当前数据 2. 确认备份文件来源可靠 3. 备份文件版本兼容。"
                type="error"
                showIcon
              />
            </Space>
          </Card>
        </div>
      )
    }
  ]

  return (
    <div className="data-management-panel">
      <div className="panel-header">
        <Title level={2}>数据管理</Title>
        <Paragraph type="secondary">
          管理您的钱包、交易和任务数据，支持导出、导入、备份和恢复功能。
        </Paragraph>
      </div>

      <Tabs
        defaultActiveKey="export"
        items={tabItems}
        className="data-tabs"
      />

      {/* 导出对话框 */}
      <Modal
        title="导出数据"
        open={exportModalVisible}
        onCancel={() => setExportModalVisible(false)}
        footer={null}
        width={500}
      >
        <Form
          form={exportForm}
          layout="vertical"
          onFinish={handleExport}
          initialValues={{
            dataType: 'all',
            format: 'json'
          }}
        >
          <Form.Item
            label="导出数据类型"
            name="dataType"
            rules={[{ required: true, message: '请选择导出数据类型' }]}
          >
            <Select>
              <Option value="wallets">钱包信息</Option>
              <Option value="transactions">交易记录</Option>
              <Option value="launch-tasks">发币任务</Option>
              <Option value="all">全部数据</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="导出格式"
            name="format"
            rules={[{ required: true, message: '请选择导出格式' }]}
          >
            <Select>
              <Option value="json">JSON</Option>
              <Option value="csv">CSV</Option>
            </Select>
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                导出
              </Button>
              <Button onClick={() => setExportModalVisible(false)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 导入对话框 */}
      <Modal
        title="导入数据"
        open={importModalVisible}
        onCancel={() => setImportModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setImportModalVisible(false)}>
            取消
          </Button>,
          <Button key="import" type="primary" onClick={handleImport} loading={loading}>
            选择文件
          </Button>
        ]}
        width={500}
      >
        <Alert
          message="导入数据"
          description="点击下方按钮选择要导入的文件。支持 JSON 和 CSV 格式。"
          type="info"
          showIcon
        />
      </Modal>

      {/* 备份对话框 */}
      <Modal
        title="备份数据"
        open={backupModalVisible}
        onCancel={() => setBackupModalVisible(false)}
        footer={null}
        width={500}
      >
        <Form
          form={backupForm}
          layout="vertical"
          onFinish={handleBackup}
          initialValues={{
            includeWallets: true,
            includeTransactions: true,
            includeTasks: true,
            includeSettings: true,
            encrypt: false
          }}
        >
          <Form.Item label="备份内容">
            <Space direction="vertical">
              <Checkbox name="includeWallets" valuePropName="checked">
                钱包信息
              </Checkbox>
              <Checkbox name="includeTransactions" valuePropName="checked">
                交易记录
              </Checkbox>
              <Checkbox name="includeTasks" valuePropName="checked">
                发币任务
              </Checkbox>
              <Checkbox name="includeSettings" valuePropName="checked">
                系统设置
              </Checkbox>
            </Space>
          </Form.Item>

          <Form.Item name="encrypt" valuePropName="checked">
            <Checkbox>加密备份（推荐）</Checkbox>
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                备份
              </Button>
              <Button onClick={() => setBackupModalVisible(false)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 恢复对话框 */}
      <Modal
        title="恢复数据"
        open={restoreModalVisible}
        onCancel={() => setRestoreModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setRestoreModalVisible(false)}>
            取消
          </Button>,
          <Button key="restore" type="primary" danger onClick={handleRestore} loading={loading}>
            选择备份文件
          </Button>
        ]}
        width={500}
      >
        <Alert
          message="恢复数据"
          description="选择备份文件进行恢复。恢复操作会覆盖现有数据，请谨慎操作。"
          type="warning"
          showIcon
        />
      </Modal>
    </div>
  )
}

export default DataManagementPanel
