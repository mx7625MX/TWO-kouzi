import CryptoJS from 'crypto-js'

/**
 * 加密工具类
 * 使用AES-256-CBC算法加密和解密私钥
 * 采用PBKDF2密钥派生、随机盐值和初始化向量
 */

/**
 * 加密私钥
 * @param privateKey 明文私钥
 * @param password 加密密码
 * @returns 加密后的私钥字符串（Base64格式：salt + iv + ciphertext）
 */
export function encrypt(privateKey: string, password: string): string {
  try {
    if (!privateKey) {
      throw new Error('私钥不能为空')
    }
    if (!password) {
      throw new Error('密码不能为空')
    }

    // 生成随机盐（16字节 = 128位）
    const salt = CryptoJS.lib.WordArray.random(16)
    
    // 使用PBKDF2派生密钥（100,000次迭代，256位密钥）
    const key = CryptoJS.PBKDF2(password, salt, {
      keySize: 256 / 32, // 256位密钥
      iterations: 100000 // 100,000次迭代
    })
    
    // 生成随机IV（16字节 = 128位）
    const iv = CryptoJS.lib.WordArray.random(16)
    
    // 使用AES-256-CBC模式加密
    const encrypted = CryptoJS.AES.encrypt(privateKey, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    })
    
    // 组合：salt + iv + ciphertext
    const combined = CryptoJS.lib.WordArray.create()
      .concat(salt)
      .concat(iv)
      .concat(encrypted.ciphertext)
    
    // 返回Base64编码
    return combined.toString(CryptoJS.enc.Base64)
  } catch (error: any) {
    console.error('加密失败:', error)
    throw new Error(`加密失败: ${error.message}`)
  }
}

/**
 * 解密私钥
 * @param encryptedKey 加密的私钥（Base64格式：salt + iv + ciphertext）
 * @param password 解密密码
 * @returns 明文私钥
 */
export function decrypt(encryptedKey: string, password: string): string {
  try {
    if (!encryptedKey) {
      throw new Error('加密数据不能为空')
    }
    if (!password) {
      throw new Error('密码不能为空')
    }

    // 解析Base64
    const combined = CryptoJS.enc.Base64.parse(encryptedKey)
    
    // 提取各部分（salt: 16字节, iv: 16字节, ciphertext: 剩余）
    const salt = CryptoJS.lib.WordArray.create(combined.words.slice(0, 4))
    const iv = CryptoJS.lib.WordArray.create(combined.words.slice(4, 8))
    const ciphertext = CryptoJS.lib.WordArray.create(combined.words.slice(8))
    
    // 使用相同参数派生密钥
    const key = CryptoJS.PBKDF2(password, salt, {
      keySize: 256 / 32,
      iterations: 100000
    })
    
    // 解密
    const encryptedObj = CryptoJS.lib.CipherParams.create({
      ciphertext: ciphertext
    })
    
    const decrypted = CryptoJS.AES.decrypt(encryptedObj, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    })
    
    // 转换为UTF8字符串
    const plaintext = decrypted.toString(CryptoJS.enc.Utf8)
    
    if (!plaintext) {
      throw new Error('解密失败，密码可能不正确')
    }
    
    return plaintext
  } catch (error: any) {
    console.error('解密失败:', error)
    throw new Error(`解密失败: ${error.message}`)
  }
}

/**
 * 生成安全的随机密码
 * @param length 密码长度（默认32）
 * @returns 随机密码字符串
 */
export function generateRandomPassword(length: number = 32): string {
  const wordArray = CryptoJS.lib.WordArray.random(length / 2)
  return wordArray.toString()
}

/**
 * 验证密码强度
 * @param password 密码
 * @returns 密码强度分数（0-4）和描述
 */
export function validatePasswordStrength(password: string): {
  score: number
  description: string
} {
  // 常见弱密码列表
  const commonPasswords = [
    'password', '123456', '12345678', 'qwerty', 'abc123',
    'monkey', 'master', 'dragon', '111111', 'baseball',
    'iloveyou', 'trustno1', 'sunshine', 'admin', 'welcome',
    'shadow', 'ashley', 'football', 'jesus', 'michael',
    'ninja', 'mustang', 'password1', '123456789', 'adobe123'
  ]
  
  // 检查常见密码
  if (commonPasswords.includes(password.toLowerCase())) {
    return { score: 0, description: '密码过于常见' }
  }
  
  let score = 0

  // 长度评分
  if (password.length >= 12) score += 2
  else if (password.length >= 8) score += 1
  
  // 字符类型
  const hasLower = /[a-z]/.test(password)
  const hasUpper = /[A-Z]/.test(password)
  const hasNumber = /\d/.test(password)
  const hasSpecial = /[^a-zA-Z0-9]/.test(password)
  
  const typeCount = [hasLower, hasUpper, hasNumber, hasSpecial].filter(Boolean).length
  if (typeCount >= 4) score += 2
  else if (typeCount >= 3) score += 1
  
  // 连续字符检查
  if (!/(.)\1{2,}/.test(password)) score += 1
  
  // 序列字符检查（如123, abc）
  if (!/012|123|234|345|456|567|678|789|890|abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz/i.test(password)) {
    score += 1
  }
  
  const descriptions = ['非常弱', '弱', '中等', '强', '非常强']
  
  return {
    score: Math.min(score, 4),
    description: descriptions[Math.min(score, 4)],
  }
}

/**
 * 生成密码的哈希值（用于验证）
 * @param password 密码
 * @returns SHA256哈希值
 */
export function hashPassword(password: string): string {
  return CryptoJS.SHA256(password).toString()
}

/**
 * 验证密码哈希
 * @param password 密码
 * @param hash 哈希值
 * @returns 是否匹配
 */
export function verifyPasswordHash(password: string, hash: string): boolean {
  const computedHash = hashPassword(password)
  return computedHash === hash
}

/**
 * 加密对象数据
 * @param data 要加密的对象
 * @param password 加密密码
 * @returns 加密后的字符串
 */
export function encryptObject(data: any, password: string): string {
  try {
    const jsonString = JSON.stringify(data)
    return encrypt(jsonString, password)
  } catch (error: any) {
    throw new Error(`对象加密失败: ${error.message}`)
  }
}

/**
 * 解密对象数据
 * @param encryptedData 加密的数据
 * @param password 解密密码
 * @returns 解密后的对象
 */
export function decryptObject<T = any>(encryptedData: string, password: string): T {
  try {
    const jsonString = decrypt(encryptedData, password)
    return JSON.parse(jsonString)
  } catch (error: any) {
    throw new Error(`对象解密失败: ${error.message}`)
  }
}
