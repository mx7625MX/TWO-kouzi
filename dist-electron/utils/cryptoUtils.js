"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.encrypt = encrypt;
exports.decrypt = decrypt;
exports.generateRandomPassword = generateRandomPassword;
exports.validatePasswordStrength = validatePasswordStrength;
exports.hashPassword = hashPassword;
exports.verifyPasswordHash = verifyPasswordHash;
exports.encryptObject = encryptObject;
exports.decryptObject = decryptObject;
const crypto_js_1 = __importDefault(require("crypto-js"));
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
function encrypt(privateKey, password) {
    try {
        if (!privateKey) {
            throw new Error('私钥不能为空');
        }
        if (!password) {
            throw new Error('密码不能为空');
        }
        // 生成随机盐（16字节 = 128位）
        const salt = crypto_js_1.default.lib.WordArray.random(16);
        // 使用PBKDF2派生密钥（100,000次迭代，256位密钥）
        const key = crypto_js_1.default.PBKDF2(password, salt, {
            keySize: 256 / 32, // 256位密钥
            iterations: 100000 // 100,000次迭代
        });
        // 生成随机IV（16字节 = 128位）
        const iv = crypto_js_1.default.lib.WordArray.random(16);
        // 使用AES-256-CBC模式加密
        const encrypted = crypto_js_1.default.AES.encrypt(privateKey, key, {
            iv: iv,
            mode: crypto_js_1.default.mode.CBC,
            padding: crypto_js_1.default.pad.Pkcs7
        });
        // 组合：salt + iv + ciphertext
        const combined = crypto_js_1.default.lib.WordArray.create()
            .concat(salt)
            .concat(iv)
            .concat(encrypted.ciphertext);
        // 返回Base64编码
        return combined.toString(crypto_js_1.default.enc.Base64);
    }
    catch (error) {
        console.error('加密失败:', error);
        throw new Error(`加密失败: ${error.message}`);
    }
}
/**
 * 解密私钥
 * @param encryptedKey 加密的私钥（Base64格式：salt + iv + ciphertext）
 * @param password 解密密码
 * @returns 明文私钥
 */
function decrypt(encryptedKey, password) {
    try {
        if (!encryptedKey) {
            throw new Error('加密数据不能为空');
        }
        if (!password) {
            throw new Error('密码不能为空');
        }
        // 解析Base64
        const combined = crypto_js_1.default.enc.Base64.parse(encryptedKey);
        // 提取各部分（salt: 16字节, iv: 16字节, ciphertext: 剩余）
        const salt = crypto_js_1.default.lib.WordArray.create(combined.words.slice(0, 4));
        const iv = crypto_js_1.default.lib.WordArray.create(combined.words.slice(4, 8));
        const ciphertext = crypto_js_1.default.lib.WordArray.create(combined.words.slice(8));
        // 使用相同参数派生密钥
        const key = crypto_js_1.default.PBKDF2(password, salt, {
            keySize: 256 / 32,
            iterations: 100000
        });
        // 解密
        const encryptedObj = crypto_js_1.default.lib.CipherParams.create({
            ciphertext: ciphertext
        });
        const decrypted = crypto_js_1.default.AES.decrypt(encryptedObj, key, {
            iv: iv,
            mode: crypto_js_1.default.mode.CBC,
            padding: crypto_js_1.default.pad.Pkcs7
        });
        // 转换为UTF8字符串
        const plaintext = decrypted.toString(crypto_js_1.default.enc.Utf8);
        if (!plaintext) {
            throw new Error('解密失败，密码可能不正确');
        }
        return plaintext;
    }
    catch (error) {
        console.error('解密失败:', error);
        throw new Error(`解密失败: ${error.message}`);
    }
}
/**
 * 生成安全的随机密码
 * @param length 密码长度（默认32）
 * @returns 随机密码字符串
 */
function generateRandomPassword(length = 32) {
    const wordArray = crypto_js_1.default.lib.WordArray.random(length / 2);
    return wordArray.toString();
}
/**
 * 验证密码强度
 * @param password 密码
 * @returns 密码强度分数（0-4）和描述
 */
function validatePasswordStrength(password) {
    // 常见弱密码列表
    const commonPasswords = [
        'password', '123456', '12345678', 'qwerty', 'abc123',
        'monkey', 'master', 'dragon', '111111', 'baseball',
        'iloveyou', 'trustno1', 'sunshine', 'admin', 'welcome',
        'shadow', 'ashley', 'football', 'jesus', 'michael',
        'ninja', 'mustang', 'password1', '123456789', 'adobe123'
    ];
    // 检查常见密码
    if (commonPasswords.includes(password.toLowerCase())) {
        return { score: 0, description: '密码过于常见' };
    }
    let score = 0;
    // 长度评分
    if (password.length >= 12)
        score += 2;
    else if (password.length >= 8)
        score += 1;
    // 字符类型
    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[^a-zA-Z0-9]/.test(password);
    const typeCount = [hasLower, hasUpper, hasNumber, hasSpecial].filter(Boolean).length;
    if (typeCount >= 4)
        score += 2;
    else if (typeCount >= 3)
        score += 1;
    // 连续字符检查
    if (!/(.)\1{2,}/.test(password))
        score += 1;
    // 序列字符检查（如123, abc）
    if (!/012|123|234|345|456|567|678|789|890|abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz/i.test(password)) {
        score += 1;
    }
    const descriptions = ['非常弱', '弱', '中等', '强', '非常强'];
    return {
        score: Math.min(score, 4),
        description: descriptions[Math.min(score, 4)],
    };
}
/**
 * 生成密码的哈希值（用于验证）
 * @param password 密码
 * @returns SHA256哈希值
 */
function hashPassword(password) {
    return crypto_js_1.default.SHA256(password).toString();
}
/**
 * 验证密码哈希
 * @param password 密码
 * @param hash 哈希值
 * @returns 是否匹配
 */
function verifyPasswordHash(password, hash) {
    const computedHash = hashPassword(password);
    return computedHash === hash;
}
/**
 * 加密对象数据
 * @param data 要加密的对象
 * @param password 加密密码
 * @returns 加密后的字符串
 */
function encryptObject(data, password) {
    const jsonString = JSON.stringify(data);
    return encrypt(jsonString, password);
}
/**
 * 解密对象数据
 * @param encryptedData 加密的字符串
 * @param password 解密密码
 * @returns 解密后的对象
 */
function decryptObject(encryptedData, password) {
    const jsonString = decrypt(encryptedData, password);
    return JSON.parse(jsonString);
}
