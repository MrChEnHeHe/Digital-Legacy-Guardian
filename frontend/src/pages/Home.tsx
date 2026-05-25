import { motion, AnimatePresence } from 'framer-motion'
import { Shield, Lock, Users, Clock, Zap, ShieldCheck, ArrowDown, CheckCircle } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'

const features = [
  {
    icon: Shield,
    title: '资产托管',
    description: '将私钥/密码分片加密，分发给多位监护人，消除单点故障',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  {
    icon: Clock,
    title: '条件触发',
    description: '时间锁、社会共识、混合模式三种触发机制，自动化验证继承条件',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
  },
  {
    icon: Lock,
    title: '隐私继承',
    description: '零知识证明+门限签名，资产详情全程加密，抗胁迫设计',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
  {
    icon: Users,
    title: '分布式信任',
    description: '无需信任任何单一实体，纯密码学保障安全',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
  },
  {
    icon: Zap,
    title: '自动执行',
    description: '智能合约确保条件满足后自动执行，无需人工干预',
    color: 'text-red-600',
    bgColor: 'bg-red-100',
  },
  {
    icon: ShieldCheck,
    title: '安全审计',
    description: '全栈开源，代码可审计，经过专业安全审计',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100',
  },
]

export default function Home() {
  const navigate = useNavigate()
  const [currentPage, setCurrentPage] = useState(0)
  const [autoPlayEnabled, setAutoPlayEnabled] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)
  const autoPlayTimerRef = useRef<NodeJS.Timeout | null>(null)

  const totalPages = 8 // 首页 + 6个特点页 + 登录页
  const AUTO_PLAY_INTERVAL = 5000 // 5秒自动跳转

  const nextPage = () => {
    if (currentPage < totalPages - 1) {
      stopAutoPlay()
      const newPage = currentPage + 1
      setCurrentPage(newPage)
      scrollToPage(newPage)
    }
  }

  const prevPage = () => {
    if (currentPage > 0) {
      stopAutoPlay()
      const newPage = currentPage - 1
      setCurrentPage(newPage)
      scrollToPage(newPage)
    }
  }

  const goToPage = (index: number) => {
    stopAutoPlay()
    setCurrentPage(index)
    scrollToPage(index)
  }

  const scrollToPage = (page: number) => {
    const container = containerRef.current
    if (container) {
      container.scrollTo({
        top: page * window.innerHeight,
        behavior: 'smooth'
      })
    }
  }

  // 监听滚动事件，实现页面滚动切换
  useEffect(() => {
    const handleScroll = () => {
      const container = containerRef.current
      if (container) {
        const scrollTop = container.scrollTop
        const windowHeight = window.innerHeight
        const newPage = Math.round(scrollTop / windowHeight)
        if (newPage !== currentPage && newPage >= 0 && newPage < totalPages) {
          setCurrentPage(newPage)
        }
      }
    }

    const container = containerRef.current
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true })
      return () => container.removeEventListener('scroll', handleScroll)
    }
  }, [currentPage, totalPages])

  // 自动播放功能
  useEffect(() => {
    const startAutoPlay = () => {
      if (autoPlayTimerRef.current) {
        clearInterval(autoPlayTimerRef.current)
      }

      if (autoPlayEnabled && currentPage < totalPages - 1) {
        autoPlayTimerRef.current = setInterval(() => {
          setCurrentPage((prev) => {
            const nextPage = prev + 1
            if (nextPage <= totalPages - 1) {
              scrollToPage(nextPage)
              if (nextPage === totalPages - 1) {
                if (autoPlayTimerRef.current) {
                  clearInterval(autoPlayTimerRef.current)
                }
                return prev
              }
              return nextPage
            } else {
              if (autoPlayTimerRef.current) {
                clearInterval(autoPlayTimerRef.current)
              }
              return prev
            }
          })
        }, AUTO_PLAY_INTERVAL)
      }
    }

    startAutoPlay()

    return () => {
      if (autoPlayTimerRef.current) {
        clearInterval(autoPlayTimerRef.current)
      }
    }
  }, [autoPlayEnabled, currentPage, totalPages])

  // 停止自动播放
  const stopAutoPlay = () => {
    setAutoPlayEnabled(false)
    if (autoPlayTimerRef.current) {
      clearInterval(autoPlayTimerRef.current)
      autoPlayTimerRef.current = null
    }
  }

  // 恢复自动播放
  const resumeAutoPlay = () => {
    if (currentPage < totalPages - 1) {
      setAutoPlayEnabled(true)
    }
  }

  return (
    <div 
      ref={containerRef}
      className="relative h-screen"
      style={{ 
        scrollSnapType: 'y mandatory',
        overflowY: 'scroll',
        WebkitOverflowScrolling: 'touch'
      }}
    >
      {/* 页面指示器 */}
      <div className="fixed right-8 top-1/2 transform -translate-y-1/2 z-50 flex flex-col space-y-3">
        {Array.from({ length: totalPages }).map((_, index) => (
          <button
            key={index}
            onClick={() => {
              goToPage(index)
              if (autoPlayEnabled) {
                stopAutoPlay()
              }
            }}
            className={`w-3 h-3 rounded-full transition-all duration-300 ${currentPage === index ? 'bg-primary-600 w-6' : 'bg-gray-300'}`}
            aria-label={`切换到页面 ${index + 1}`}
          />
        ))}
        <button
          onClick={() => {
            if (autoPlayEnabled) {
              stopAutoPlay()
            } else {
              resumeAutoPlay()
            }
          }}
          className={`mt-4 px-3 py-1 rounded-full text-xs font-medium transition-all duration-300 ${autoPlayEnabled ? 'bg-primary-600 text-white' : 'bg-gray-300 text-gray-600'}`}
          aria-label={autoPlayEnabled ? '暂停自动播放' : '开始自动播放'}
        >
          {autoPlayEnabled ? '暂停' : '播放'}
        </button>
      </div>

      {/* 第1页：首页 */}
      <motion.div
        className="h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-indigo-50 via-white to-purple-50"
        style={{ scrollSnapAlign: 'start' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: currentPage === 0 ? 1 : 0 }}
        transition={{ duration: 0.8 }}
      >
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8, type: "spring" }}
          className="flex justify-center mb-8"
        >
          <div className="w-24 h-24 bg-gradient-to-br from-primary-600 to-blue-500 rounded-full flex items-center justify-center shadow-lg shadow-primary-200">
            <Shield className="h-12 w-12 text-white" />
          </div>
        </motion.div>
        
        <motion.h1
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.8, type: "spring" }}
          className="text-5xl md:text-7xl font-bold text-gradient mb-6 text-center"
        >
          数字遗产管家
        </motion.h1>
        
        <motion.p
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.8, type: "spring" }}
          className="text-xl text-gray-600 max-w-3xl mx-auto mb-12 text-center"
        >
          基于门限密码与去中心化触发条件的数字资产继承协议
          <br />
          用"数学分散"替代"信任集中"
        </motion.p>
        
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.8, type: "spring" }}
          className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-6"
        >
          <Link to="/create-plan" className="btn-primary text-lg px-8 py-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            创建遗产计划
          </Link>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.8, type: "spring" }}
          className="absolute bottom-12 left-1/2 transform -translate-x-1/2"
        >
          <button 
            onClick={nextPage}
            className="flex flex-col items-center text-gray-500 hover:text-primary-600 transition-colors"
          >
            <span className="text-sm mb-2">向下滚动了解更多</span>
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              <ArrowDown className="h-6 w-6" />
            </motion.div>
          </button>
        </motion.div>
      </motion.div>

      {/* 特点页面 */}
      {features.map((feature, index) => {
        const Icon = feature.icon
        return (
          <motion.div
            key={index}
            className={`h-screen flex flex-col items-center justify-center p-4 ${
              index % 2 === 0 ? 'bg-white' : 'bg-gradient-to-br from-gray-50 to-white'
            }`}
            style={{ scrollSnapAlign: 'start' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: currentPage === index + 1 ? 1 : 0 }}
            transition={{ duration: 0.8 }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: currentPage === index + 1 ? 1 : 0, scale: currentPage === index + 1 ? 1 : 0.8 }}
              transition={{ duration: 0.8, type: "spring" }}
              className="text-center max-w-4xl"
            >
              <div className={`${feature.bgColor} ${feature.color} p-6 rounded-full mb-8 inline-block shadow-md`}>
                <Icon className="h-16 w-16" />
              </div>
              <motion.h2
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: currentPage === index + 1 ? 1 : 0, y: currentPage === index + 1 ? 0 : 30 }}
                transition={{ delay: 0.2, duration: 0.8 }}
                className="text-4xl font-bold mb-6 text-gray-800"
              >
                {feature.title}
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: currentPage === index + 1 ? 1 : 0, y: currentPage === index + 1 ? 0 : 30 }}
                transition={{ delay: 0.4, duration: 0.8 }}
                className="text-xl text-gray-600 mb-12"
              >
                {feature.description}
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: currentPage === index + 1 ? 1 : 0, y: currentPage === index + 1 ? 0 : 30 }}
                transition={{ delay: 0.6, duration: 0.8 }}
                className="flex justify-center space-x-4"
              >
                <button 
                  onClick={nextPage}
                  className="btn-secondary px-8 py-3"
                >
                  {index === features.length - 1 ? '返回首页' : '了解下一个特点'}
                </button>
                <Link 
                  to="/login"
                  className="btn-primary px-8 py-3"
                >
                  立即开始
                </Link>
              </motion.div>
            </motion.div>
          </motion.div>
        )
      })}

      {/* 登录/注册页面 */}
      <motion.div
        className="h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-primary-50 to-blue-50"
        style={{ scrollSnapAlign: 'start' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: currentPage === features.length + 1 ? 1 : 0 }}
        transition={{ duration: 0.8 }}
      >
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: currentPage === features.length + 1 ? 1 : 0, y: currentPage === features.length + 1 ? 0 : 50 }}
          transition={{ duration: 0.8, type: "spring" }}
          className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full border border-gray-100"
        >
          <div className="text-center mb-10">
            <motion.h2
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: currentPage === features.length + 1 ? 1 : 0, y: currentPage === features.length + 1 ? 0 : 30 }}
              transition={{ delay: 0.2, duration: 0.8 }}
              className="text-3xl font-bold mb-3"
            >
              立即开始
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: currentPage === features.length + 1 ? 1 : 0, y: currentPage === features.length + 1 ? 0 : 30 }}
              transition={{ delay: 0.4, duration: 0.8 }}
              className="text-gray-600"
            >
              加入数字遗产管家，保护您的数字资产
            </motion.p>
          </div>
          
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: currentPage === features.length + 1 ? 1 : 0, y: currentPage === features.length + 1 ? 0 : 30 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="space-y-4"
          >
            <Link to="/login" className="btn-primary flex items-center justify-center py-4 px-6 rounded-xl text-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              登录
            </Link>
            <Link to="/register" className="btn-secondary flex items-center justify-center py-4 px-6 rounded-xl text-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              注册
            </Link>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  )
}
