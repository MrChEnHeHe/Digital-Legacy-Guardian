import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Shield, Lock, Home, PlusCircle, LayoutDashboard, Heart, LogIn, LogOut, User, RefreshCw, Sparkles } from 'lucide-react'

const Navbar = () => {
  const location = useLocation()
  const navigate = useNavigate()
  
  const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null
  const user = userStr ? JSON.parse(userStr) : null

  const navItems = [
    { path: '/', label: '首页', icon: Home },
    { path: '/ai', label: 'AI助手', icon: Sparkles },
    { path: '/create-plan', label: '创建计划', icon: PlusCircle },
    { path: '/dashboard', label: '个人信息', icon: LayoutDashboard },
    { path: '/inheritance', label: '继承', icon: Heart },
    { path: '/guardian', label: '监护人', icon: User },
  ]

  const handleLogout = () => {
    localStorage.removeItem('user')
    navigate('/login')
  }

  const handleSwitchUser = () => {
    localStorage.removeItem('user')
    navigate('/login')
  }

  return (
    <nav className="bg-white shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center space-x-2">
            <div className="bg-gradient-to-r from-primary-600 to-secondary-600 p-2 rounded-lg">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-gradient">数字遗产管家</span>
          </Link>
          
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-1 px-3 py-2 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </div>

          <div className="flex items-center space-x-3">
            {user ? (
              <>
                <div className="flex items-center space-x-2 text-sm">
                  <User className="w-4 h-4 text-primary-600" />
                  <div className="flex flex-col">
                    <span className="text-gray-700">{user.name}</span>
                    <span className="text-xs text-gray-400">ID: {user.id}</span>
                  </div>
                </div>
                <button
                  onClick={handleSwitchUser}
                  className="flex items-center space-x-1 px-3 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="切换用户"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>切换</span>
                </button>
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-1 px-3 py-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="退出登录"
                >
                  <LogOut className="w-4 h-4" />
                  <span>退出</span>
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="flex items-center space-x-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <LogIn className="w-4 h-4" />
                <span>登录</span>
              </Link>
            )}
            <div className="flex items-center space-x-1 text-sm text-gray-500">
              <Lock className="w-4 h-4 text-green-500" />
              <span>安全加密</span>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
