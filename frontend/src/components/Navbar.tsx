import { Link, useLocation } from 'react-router-dom'
import { Shield, Lock, Home, PlusCircle, LayoutDashboard, Heart, Info } from 'lucide-react'

const Navbar = () => {
  const location = useLocation()
  
  const navItems = [
    { path: '/', label: '首页', icon: Home },
    { path: '/create', label: '创建计划', icon: PlusCircle },
    { path: '/dashboard', label: '管理面板', icon: LayoutDashboard },
    { path: '/inheritance', label: '继承流程', icon: Heart },
    { path: '/about', label: '关于', icon: Info },
  ]

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

          <div className="flex items-center space-x-2">
            <Lock className="w-5 h-5 text-green-500" />
            <span className="text-sm text-gray-600">安全加密</span>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
