import { useState } from 'react'
import {
  Modal,
  Form,
  Input,
  Select,
  Button,
  Space,
  Tabs,
  Alert,
  message,
} from 'antd'
import { ImportOutlined, WalletOutlined } from '@ant-design/icons'
import type { ImportWalletInput } from '@shared/types'

const { Option } = Select
const { TextArea } = Input

interface ImportWalletModalProps {
  visible: boolean
  onCancel: () => void
  onSuccess: () => void
}

function ImportWalletModal({ visible, onCancel, onSuccess }: ImportWalletModalProps) {
  const [form] = Form.useForm()
  const [importType, setImportType] = useState<'privateKey' | 'mnemonic'>('privateKey')
  const [importing, setImporting] = useState(false)

  // 处理导入钱包
  const handleImport = async (values: any) => {
    setImporting(true)
    try {
      // 构造导入参数
      const importInput: ImportWalletInput = {
        name: values.name,
        network: values.network,
        importType: importType,
        password: values.password,
      }

      if (importType === 'privateKey') {
        importInput.privateKey = values.privateKey?.trim()
      } else {
        importInput.mnemonic = values.mnemonic?.trim()
        if (values.derivationPath) {
          importInput.derivationPath = values.derivationPath.trim()
        }
      }

      // 调用IPC接口
      const response = await window.electronAPI.wallet.import(importInput)

      if (response.success && response.data) {
        message.success('钱包导入成功！')
        form.resetFields()
        onSuccess()
      } else {
        message.error(response.error || '导入钱包失败')
      }
    } catch (error: any) {
      message.error('导入钱包失败: ' + error.message)
    } finally {
      setImporting(false)
    }
  }

  // 处理取消
  const handleCancel = () => {
    form.resetFields()
    onCancel()
  }

  // 验证BSC私钥格式
  const validateBSCPrivateKey = (network: string, value: string) => {
    if (network === 'BSC') {
      const cleanKey = value.trim()
      if (!cleanKey.startsWith('0x') || cleanKey.length !== 66) {
        return false
      }
      // 验证是否为有效的十六进制
      const hexPattern = /^0x[0-9a-fA-F]{64}$/
      return hexPattern.test(cleanKey)
    }
    return true
  }

  // 验证Solana私钥格式
  const validateSolanaPrivateKey = (network: string, value: string) => {
    if (network === 'Solana') {
      const cleanKey = value.trim()
      // Solana私钥可以是Base64字符串或JSON数组格式
      try {
        // 尝试解析为JSON数组
        const parsed = JSON.parse(cleanKey)
        if (Array.isArray(parsed) && parsed.length === 64) {
          return true
        }
      } catch {
        // 如果不是JSON，检查是否是Base64格式（应该是88个字符左右）
        if (cleanKey.length >= 80 && cleanKey.length <= 100) {
          return true
        }
      }
      return false
    }
    return true
  }

  // 验证助记词格式
  const validateMnemonic = (value: string) => {
    const words = value.trim().split(/\s+/)
    // 助记词应该是12、15、18、21或24个单词
    const validLengths = [12, 15, 18, 21, 24]
    return validLengths.includes(words.length)
  }

  return (
    <Modal
      title={<Space><ImportOutlined /> 导入钱包</Space>}
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={600}
      destroyOnClose
    >
      <Tabs
        activeKey={importType}
        onChange={(key) => setImportType(key as 'privateKey' | 'mnemonic')}
        items={[
          { key: 'privateKey', label: '🔑 私钥导入' },
          { key: 'mnemonic', label: '🌱 助记词导入' },
        ]}
        style={{ marginBottom: 16 }}
      />

      <Form form={form} layout="vertical" onFinish={handleImport}>
        <Form.Item
          name="name"
          label="钱包名称"
          rules={[
            { required: true, message: '请输入钱包名称' },
            { min: 2, message: '钱包名称至少2个字符' },
            { max: 50, message: '钱包名称最多50个字符' },
          ]}
        >
          <Input 
            placeholder="为导入的钱包命名，例如：主钱包、交易钱包" 
            prefix={<WalletOutlined />} 
          />
        </Form.Item>

        <Form.Item
          name="network"
          label="选择网络"
          rules={[{ required: true, message: '请选择网络' }]}
          initialValue="BSC"
        >
          <Select size="large">
            <Option value="BSC">
              <Space>
                <span style={{ fontSize: '16px' }}>🔶</span>
                BSC (BNB Chain)
              </Space>
            </Option>
            <Option value="Solana">
              <Space>
                <span style={{ fontSize: '16px' }}>🟢</span>
                Solana
              </Space>
            </Option>
          </Select>
        </Form.Item>

        {importType === 'privateKey' ? (
          <Form.Item
            name="privateKey"
            label="私钥"
            rules={[
              { required: true, message: '请输入私钥' },
              {
                validator: async (_, value) => {
                  if (!value) return
                  const network = form.getFieldValue('network')
                  
                  if (network === 'BSC') {
                    if (!validateBSCPrivateKey(network, value)) {
                      throw new Error('BSC私钥格式错误，应为0x开头的64位十六进制字符串')
                    }
                  } else if (network === 'Solana') {
                    if (!validateSolanaPrivateKey(network, value)) {
                      throw new Error('Solana私钥格式错误，应为Base64字符串或JSON数组格式')
                    }
                  }
                },
              },
            ]}
            extra={
              <div style={{ marginTop: 4 }}>
                <div>• BSC私钥：0x开头，共66个字符（例如：0x123abc...）</div>
                <div>• Solana私钥：Base64格式或JSON数组[1,2,3...]</div>
              </div>
            }
          >
            <TextArea
              rows={4}
              placeholder="输入私钥"
              style={{ fontFamily: 'monospace', fontSize: '12px' }}
            />
          </Form.Item>
        ) : (
          <>
            <Form.Item
              name="mnemonic"
              label="助记词"
              rules={[
                { required: true, message: '请输入助记词' },
                {
                  validator: async (_, value) => {
                    if (!value) return
                    if (!validateMnemonic(value)) {
                      throw new Error('助记词格式错误，应为12/15/18/21/24个单词，用空格分隔')
                    }
                  },
                },
              ]}
              extra="支持12、15、18、21或24个单词，用空格分隔"
            >
              <TextArea 
                rows={4} 
                placeholder="word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12" 
              />
            </Form.Item>

            <Form.Item
              name="derivationPath"
              label="派生路径（可选）"
              extra={
                <div style={{ marginTop: 4 }}>
                  <div>留空使用默认路径：</div>
                  <div>• BSC: m/44'/60'/0'/0/0</div>
                  <div>• Solana: m/44'/501'/0'/0'</div>
                </div>
              }
            >
              <Input 
                placeholder="例如：m/44'/60'/0'/0/0" 
                style={{ fontFamily: 'monospace' }}
              />
            </Form.Item>
          </>
        )}

        <Form.Item
          name="password"
          label="加密密码"
          rules={[
            { required: true, message: '请输入加密密码' },
            { min: 6, message: '密码至少6个字符' },
          ]}
          extra="用于加密保存私钥，请牢记此密码"
        >
          <Input.Password 
            placeholder="输入密码用于加密私钥" 
          />
        </Form.Item>

        <Alert
          message="安全提示"
          description={
            <div>
              <div>• 请确保在安全的环境中操作</div>
              <div>• 不要在不信任的设备上输入私钥或助记词</div>
              <div>• 私钥将使用您设置的密码进行AES-256-CBC加密存储</div>
              <div>• 导入后请妥善保管原始私钥/助记词</div>
            </div>
          }
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Form.Item>
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button onClick={handleCancel}>
              取消
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={importing}
              icon={<ImportOutlined />}
              style={{
                background: 'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)',
                border: 'none',
              }}
            >
              导入钱包
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default ImportWalletModal
