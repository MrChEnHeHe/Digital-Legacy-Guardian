import { Link, useLocation } from 'react-router-dom'
import { Shield, Home, PlusCircle, LayoutDashboard, Heart, Users } from 'lucide-react'

const navItems = [
  { path: '/', icon: Home, label: '首页' },
  { path: '/create-plan', icon: PlusCircle, label: '创建计划' },
  { path: '/dashboard', icon: LayoutDashboard, label: '控制台' },
  { path: '/inheritance', icon: Heart, label: '继承' },
  { path: '/guardian', icon: Users, label: '监护人' },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation()

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <nav className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center space-x-2">
                <Shield className="h-8 w-8 text-primary-600" />
                <span className="text-xl font-bold text-gradient">数字遗产管家</span>
              </Link>
            </div>
            <div className="flex items-center space-x-1">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = location.pathname === item.path
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 ${
                      isActive
                        ? 'bg-primary-100 text-primary-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="hidden sm:inline">{item.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}
