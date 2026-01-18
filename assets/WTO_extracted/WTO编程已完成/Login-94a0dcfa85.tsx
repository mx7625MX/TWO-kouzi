import { Form, Input, Button, Card, message } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import './Login.css'

interface LoginFormValues {
  username: string
  password: string
}

function Login() {
  const [form] = Form.useForm()

  const onFinish = (values: LoginFormValues) => {
    console.log('登录信息:', values)
    message.success(`欢迎回来, ${values.username}!`)
    // 这里可以添加实际的登录逻辑
  }

  const onFinishFailed = (errorInfo: any) => {
    console.log('验证失败:', errorInfo)
    message.error('请检查输入信息')
  }

  return (
    <div className="login-container">
      <Card className="login-card" bordered={false}>
        <div className="login-header">
          <h1 className="login-title">欢迎登录</h1>
          <p className="login-subtitle">Electron + React + TypeScript</p>
        </div>
        
        <Form
          form={form}
          name="login"
          initialValues={{ remember: true }}
          onFinish={onFinish}
          onFinishFailed={onFinishFailed}
          autoComplete="off"
          size="large"
        >
          <Form.Item
            name="username"
            rules={[
              { required: true, message: '请输入用户名!' },
              { min: 3, message: '用户名至少3个字符!' }
            ]}
          >
            <Input
              prefix={<UserOutlined className="input-icon" />}
              placeholder="用户名"
              autoComplete="username"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[
              { required: true, message: '请输入密码!' },
              { min: 6, message: '密码至少6个字符!' }
            ]}
          >
            <Input.Password
              prefix={<LockOutlined className="input-icon" />}
              placeholder="密码"
              autoComplete="current-password"
            />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" className="login-button" block>
              登录
            </Button>
          </Form.Item>
        </Form>

        <div className="login-footer">
          <a href="#" onClick={(e) => { e.preventDefault(); message.info('忘记密码功能待开发') }}>
            忘记密码?
          </a>
          <span className="separator">•</span>
          <a href="#" onClick={(e) => { e.preventDefault(); message.info('注册功能待开发') }}>
            注册账号
          </a>
        </div>
      </Card>
    </div>
  )
}

export default Login
