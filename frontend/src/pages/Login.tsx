import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { authApi } from '../services/api'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const [isLogin, setIsLogin] = useState(true)

  useEffect(() => {
    // 根据当前路径自动切换到注册模式
    if (location.pathname === '/register') {
      setIsLogin(false)
    }
  }, [location.pathname])
  const [loading, setLoading] = useState(false)
  const [codeLoading, setCodeLoading] = useState(false)
  const [message, setMessage] = useState('')

  const [registerForm, setRegisterForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  })

  const [loginForm, setLoginForm] = useState({
    email: '',
    password: '',
    verificationCode: '',
  })

  const [countdown, setCountdown] = useState(0)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('')

    if (!registerForm.name || !registerForm.email || !registerForm.password) {
      setMessage('请填写所有必填字段')
      return
    }

    if (registerForm.password.length < 6) {
      setMessage('密码长度至少为6位')
      return
    }

    if (registerForm.password !== registerForm.confirmPassword) {
      setMessage('两次输入的密码不一致')
      return
    }

    setLoading(true)
    try {
      const result = await authApi.register({
        name: registerForm.name,
        email: registerForm.email,
        password: registerForm.password,
      })

      if (result.success) {
        setMessage(`注册成功！您的用户ID是: ${result.userId}`)
        setRegisterForm({ name: '', email: '', password: '', confirmPassword: '' })
        setTimeout(() => {
          setIsLogin(true)
        }, 3000)
      } else {
        setMessage(result.message || '注册失败')
      }
    } catch (error: any) {
      setMessage(error.response?.data?.error || '注册失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  const handleSendCode = async () => {
    if (!loginForm.email) {
      setMessage('请先输入邮箱')
      return
    }

    setCodeLoading(true)
    try {
      const result = await authApi.sendVerificationCode(loginForm.email)
      if (result.success) {
        setMessage(result.message)
        setCountdown(60)
        const timer = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(timer)
              return 0
            }
            return prev - 1
          })
        }, 1000)
      } else {
        setMessage(result.message || '发送验证码失败')
      }
    } catch (error: any) {
      setMessage(error.response?.data?.error || '发送验证码失败')
    } finally {
      setCodeLoading(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('')

    if (!loginForm.email || !loginForm.password) {
      setMessage('请填写邮箱和密码')
      return
    }

    if (!loginForm.verificationCode) {
      setMessage('请输入验证码')
      return
    }

    setLoading(true)
    try {
      const result = await authApi.login({
        email: loginForm.email,
        password: loginForm.password,
        verificationCode: loginForm.verificationCode,
      })

      if (result.success) {
        // 使用sessionStorage存储登录状态（关闭浏览器后自动清除）
        sessionStorage.setItem('user', JSON.stringify(result.user))
        setMessage('登录成功！')
        setTimeout(() => {
          navigate('/dashboard')
        }, 1000)
      } else {
        setMessage(result.message || '登录失败')
      }
    } catch (error: any) {
      setMessage(error.response?.data?.message || '登录失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-primary-600 to-blue-500 rounded-full flex items-center justify-center shadow-lg shadow-primary-200">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gradient mb-2">数字遗产管家</h1>
          <p className="text-gray-600">安全可靠的数字资产继承平台</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex mb-6 bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => { setIsLogin(true); setMessage('') }}
              className={`flex-1 py-2 text-center font-medium rounded-lg transition-all duration-300 ${
                isLogin 
                  ? 'bg-white text-primary-600 shadow-sm transform -translate-y-0.5' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              登录
            </button>
            <button
              onClick={() => { setIsLogin(false); setMessage('') }}
              className={`flex-1 py-2 text-center font-medium rounded-lg transition-all duration-300 ${
                !isLogin 
                  ? 'bg-white text-primary-600 shadow-sm transform -translate-y-0.5' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              注册
            </button>
          </div>

          {message && (
            <div className={`mb-4 p-3 rounded-lg text-sm ${
              message.includes('成功') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}>
              {message}
            </div>
          )}

          {isLogin ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">邮箱</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <input
                    type="email"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-300 shadow-sm"
                    placeholder="请输入邮箱"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">密码</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    type="password"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-300 shadow-sm"
                    placeholder="请输入密码"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">验证码</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={loginForm.verificationCode}
                      onChange={(e) => setLoginForm({ ...loginForm, verificationCode: e.target.value })}
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-300 shadow-sm"
                      placeholder="请输入验证码"
                      maxLength={6}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSendCode}
                    disabled={codeLoading || countdown > 0 || !loginForm.email}
                    className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
                      codeLoading || countdown > 0 || !loginForm.email
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-primary-100 text-primary-600 hover:bg-primary-200'
                    }`}
                  >
                    {codeLoading ? '发送中...' : (countdown > 0 ? `${countdown}秒` : '获取验证码')}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-primary-600 to-blue-500 text-white rounded-xl font-medium hover:from-primary-700 hover:to-blue-600 transition-all duration-300 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    登录中...
                  </div>
                ) : (
                  '登录'
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">姓名</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    value={registerForm.name}
                    onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-300 shadow-sm"
                    placeholder="请输入姓名"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">邮箱</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <input
                    type="email"
                    value={registerForm.email}
                    onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-300 shadow-sm"
                    placeholder="请输入邮箱"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">密码</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    type="password"
                    value={registerForm.password}
                    onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-300 shadow-sm"
                    placeholder="请输入密码（至少6位）"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">确认密码</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    type="password"
                    value={registerForm.confirmPassword}
                    onChange={(e) => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-300 shadow-sm"
                    placeholder="请再次输入密码"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-primary-600 to-blue-500 text-white rounded-xl font-medium hover:from-primary-700 hover:to-blue-600 transition-all duration-300 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    注册中...
                  </div>
                ) : (
                  '注册'
                )}
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            <button
              onClick={() => navigate('/')}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              返回首页
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
