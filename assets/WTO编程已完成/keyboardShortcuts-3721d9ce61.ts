/**
 * 快捷键管理系统
 * 支持全局快捷键和自定义快捷键
 */

import { useEffect, useCallback } from 'react'

interface Shortcut {
  key: string
  ctrlKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  metaKey?: boolean
  description: string
  action: () => void
}

interface UseKeyboardShortcutsOptions {
  shortcuts: Shortcut[]
  enabled?: boolean
}

/**
 * 使用快捷键的 Hook
 */
export const useKeyboardShortcuts = (options: UseKeyboardShortcutsOptions) => {
  const { shortcuts, enabled = true } = options

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return

    // 忽略输入框中的快捷键
    const target = event.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return
    }

    const matchingShortcut = shortcuts.find(shortcut => {
      const keyMatch = shortcut.key.toLowerCase() === event.key.toLowerCase()
      const ctrlMatch = (shortcut.ctrlKey || false) === event.ctrlKey
      const shiftMatch = (shortcut.shiftKey || false) === event.shiftKey
      const altMatch = (shortcut.altKey || false) === event.altKey
      const metaMatch = (shortcut.metaKey || false) === event.metaKey

      return keyMatch && ctrlMatch && shiftMatch && altMatch && metaMatch
    })

    if (matchingShortcut) {
      event.preventDefault()
      matchingShortcut.action()
    }
  }, [shortcuts, enabled])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown])
}

/**
 * 默认快捷键配置
 */
export const defaultShortcuts: Shortcut[] = [
  // 导航快捷键
  {
    key: '1',
    ctrlKey: true,
    description: '首页',
    action: () => console.log('Navigate to Dashboard')
  },
  {
    key: '2',
    ctrlKey: true,
    description: '钱包管理',
    action: () => console.log('Navigate to Wallets')
  },
  {
    key: '3',
    ctrlKey: true,
    description: '发币',
    action: () => console.log('Navigate to Launch')
  },
  {
    key: '4',
    ctrlKey: true,
    description: '发币任务',
    action: () => console.log('Navigate to Tasks')
  },
  {
    key: '5',
    ctrlKey: true,
    description: '市值管理',
    action: () => console.log('Navigate to Market')
  },
  {
    key: '6',
    ctrlKey: true,
    description: '闪卖',
    action: () => console.log('Navigate to Flash Sell')
  },
  {
    key: '7',
    ctrlKey: true,
    description: '收益统计',
    action: () => console.log('Navigate to Profit')
  },
  {
    key: '8',
    ctrlKey: true,
    description: '热点监控',
    action: () => console.log('Navigate to Hotspot')
  },

  // 主题快捷键
  {
    key: 't',
    ctrlKey: true,
    shiftKey: true,
    description: '切换主题',
    action: () => console.log('Toggle Theme')
  },

  // 通用快捷键
  {
    key: 's',
    ctrlKey: true,
    description: '保存',
    action: () => console.log('Save')
  },
  {
    key: 'r',
    ctrlKey: true,
    description: '刷新',
    action: () => console.log('Refresh')
  },
  {
    key: 'f',
    ctrlKey: true,
    description: '搜索',
    action: () => console.log('Search')
  },

  // 设置快捷键
  {
    key: ',',
    ctrlKey: true,
    description: '设置',
    action: () => console.log('Open Settings')
  },

  // 帮助快捷键
  {
    key: '?',
    shiftKey: true,
    description: '快捷键帮助',
    action: () => console.log('Show Shortcuts Help')
  }
]

/**
 * 快捷键帮助面板
 */
export const KeyboardShortcutsHelp: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return (
    <div className="shortcuts-help-overlay" onClick={onClose}>
      <div className="shortcuts-help-panel" onClick={e => e.stopPropagation()}>
        <div className="shortcuts-help-header">
          <h2>快捷键帮助</h2>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="shortcuts-help-content">
          <div className="shortcuts-category">
            <h3>导航</h3>
            <ul>
              <li><kbd>Ctrl</kbd> + <kbd>1</kbd> - 首页</li>
              <li><kbd>Ctrl</kbd> + <kbd>2</kbd> - 钱包管理</li>
              <li><kbd>Ctrl</kbd> + <kbd>3</kbd> - 发币</li>
              <li><kbd>Ctrl</kbd> + <kbd>4</kbd> - 发币任务</li>
              <li><kbd>Ctrl</kbd> + <kbd>5</kbd> - 市值管理</li>
              <li><kbd>Ctrl</kbd> + <kbd>6</kbd> - 闪卖</li>
              <li><kbd>Ctrl</kbd> + <kbd>7</kbd> - 收益统计</li>
              <li><kbd>Ctrl</kbd> + <kbd>8</kbd> - 热点监控</li>
            </ul>
          </div>

          <div className="shortcuts-category">
            <h3>主题</h3>
            <ul>
              <li><kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>T</kbd> - 切换主题</li>
            </ul>
          </div>

          <div className="shortcuts-category">
            <h3>通用</h3>
            <ul>
              <li><kbd>Ctrl</kbd> + <kbd>S</kbd> - 保存</li>
              <li><kbd>Ctrl</kbd> + <kbd>R</kbd> - 刷新</li>
              <li><kbd>Ctrl</kbd> + <kbd>F</kbd> - 搜索</li>
              <li><kbd>Ctrl</kbd> + <kbd>,</kbd> - 设置</li>
            </ul>
          </div>

          <div className="shortcuts-category">
            <h3>帮助</h3>
            <ul>
              <li><kbd>Shift</kbd> + <kbd>?</kbd> - 显示快捷键帮助</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * 快捷键配置存储
 */
export const shortcutConfigStorage = {
  /**
   * 保存快捷键配置
   */
  save(shortcuts: Shortcut[]): void {
    try {
      localStorage.setItem('keyboard-shortcuts', JSON.stringify(shortcuts))
    } catch (error) {
      console.error('保存快捷键配置失败:', error)
    }
  },

  /**
   * 加载快捷键配置
   */
  load(): Shortcut[] | null {
    try {
      const saved = localStorage.getItem('keyboard-shortcuts')
      if (saved) {
        return JSON.parse(saved)
      }
    } catch (error) {
      console.error('加载快捷键配置失败:', error)
    }
    return null
  },

  /**
   * 清除快捷键配置
   */
  clear(): void {
    try {
      localStorage.removeItem('keyboard-shortcuts')
    } catch (error) {
      console.error('清除快捷键配置失败:', error)
    }
  }
}

/**
 * 快捷键格式化
 */
export const formatShortcut = (shortcut: Shortcut): string => {
  const parts: string[] = []

  if (shortcut.ctrlKey) parts.push('Ctrl')
  if (shortcut.shiftKey) parts.push('Shift')
  if (shortcut.altKey) parts.push('Alt')
  if (shortcut.metaKey) parts.push('Cmd')

  parts.push(shortcut.key.toUpperCase())

  return parts.join(' + ')
}
