/**
 * 主题管理上下文
 * 支持浅色/深色主题切换
 */

import React, { createContext, useContext, useState, useEffect } from 'react'

export type ThemeType = 'light' | 'dark' | 'auto'

interface ThemeContextType {
  theme: ThemeType
  currentTheme: 'light' | 'dark'
  setTheme: (theme: ThemeType) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

/**
 * 主题提供者组件
 */
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<ThemeType>(() => {
    const saved = localStorage.getItem('theme') as ThemeType
    return saved || 'dark'
  })
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>('dark')

  // 根据主题设置更新当前主题
  useEffect(() => {
    const updateCurrentTheme = () => {
      let resolvedTheme: 'light' | 'dark' = 'dark'

      if (theme === 'auto') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        resolvedTheme = prefersDark ? 'dark' : 'light'
      } else {
        resolvedTheme = theme
      }

      setCurrentTheme(resolvedTheme)
      document.documentElement.setAttribute('data-theme', resolvedTheme)
      localStorage.setItem('theme', theme)
    }

    updateCurrentTheme()

    // 监听系统主题变化（仅在 auto 模式下）
    if (theme === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handleChange = () => updateCurrentTheme()
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }
  }, [theme])

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark')
  }

  return (
    <ThemeContext.Provider value={{ theme, currentTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

/**
 * 使用主题的 Hook
 */
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

/**
 * 主题色配置
 */
export const themeColors = {
  light: {
    primary: '#2563eb',
    secondary: '#7c3aed',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    background: '#f8fafc',
    surface: '#ffffff',
    text: '#1e293b',
    textSecondary: '#64748b',
    border: '#e2e8f0',
    hover: '#f1f5f9'
  },
  dark: {
    primary: '#3b82f6',
    secondary: '#8b5cf6',
    success: '#22c55e',
    warning: '#eab308',
    error: '#ef4444',
    background: '#0f172a',
    surface: '#1e293b',
    text: '#f8fafc',
    textSecondary: '#94a3b8',
    border: '#334155',
    hover: '#334155'
  }
}
