import { sendVerificationCode } from './email.js'

// ==================== 配置 ====================

/** 验证码有效期（毫秒） */
const CODE_EXPIRY_MS = 5 * 60 * 1000 // 5 分钟

/** 验证码长度 */
const CODE_LENGTH = 6

/** 同一邮箱发送间隔（毫秒） */
const SEND_INTERVAL_MS = 60 * 1000 // 60 秒

// ==================== 内存存储 ====================

interface CodeRecord {
  code: string
  expiresAt: number
  lastSentAt: number
}

/**
 * 验证码存储（内存 Map）
 * 生产环境建议替换为 Redis，以支持多实例部署
 */
const codeStore = new Map<string, CodeRecord>()

// 每分钟清理一次过期验证码
setInterval(() => {
  const now = Date.now()
  for (const [email, record] of codeStore.entries()) {
    if (now > record.expiresAt) {
      codeStore.delete(email)
    }
  }
}, 60 * 1000)

// ==================== 工具函数 ====================

/**
 * 生成随机数字验证码
 */
function generateCode(): string {
  let code = ''
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += Math.floor(Math.random() * 10).toString()
  }
  return code
}

// ==================== 导出方法 ====================

/**
 * 发送邮箱验证码
 * @param email 邮箱地址
 * @returns { success, message }
 *   - success: true 表示发送成功
 *   - message: 提示信息
 */
export async function sendCode(email: string): Promise<{ success: boolean; message: string }> {
  const now = Date.now()
  const existing = codeStore.get(email)

  // 检查发送频率限制（60 秒内不能重复发送）
  if (existing && now - existing.lastSentAt < SEND_INTERVAL_MS) {
    const remainingSeconds = Math.ceil((SEND_INTERVAL_MS - (now - existing.lastSentAt)) / 1000)
    return {
      success: false,
      message: `发送过于频繁，请 ${remainingSeconds} 秒后重试`,
    }
  }

  // 生成验证码
  const code = generateCode()

  // 调用 Resend 发送邮件
  const sent = await sendVerificationCode(email, code)
  if (!sent) {
    return {
      success: false,
      message: '验证码发送失败，请稍后重试',
    }
  }

  // 存储验证码
  codeStore.set(email, {
    code,
    expiresAt: now + CODE_EXPIRY_MS,
    lastSentAt: now,
  })

  return {
    success: true,
    message: '验证码已发送到您的邮箱',
  }
}

/**
 * 校验验证码
 * @param email 邮箱地址
 * @param code 用户输入的验证码
 * @returns true 表示验证通过，false 表示验证失败
 */
export function verifyCode(email: string, code: string): boolean {
  const record = codeStore.get(email)

  if (!record) {
    return false // 未发送过验证码
  }

  if (Date.now() > record.expiresAt) {
    codeStore.delete(email)
    return false // 验证码已过期
  }

  if (record.code !== code) {
    return false // 验证码错误
  }

  // 验证通过后立即删除，防止重复使用
  codeStore.delete(email)
  return true
}
