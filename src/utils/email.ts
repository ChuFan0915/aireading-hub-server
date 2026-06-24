import { Resend } from 'resend'

/** Resend API Key（从 .env 读取） */
const RESEND_API_KEY = process.env.RESEND_API_KEY || ''

/**
 * 发件人邮箱
 * - 有域名时：使用自定义域名邮箱（需在 Resend 后台验证域名）
 * - 无域名时：使用 Resend 默认的 onboarding@resend.dev（需在 Resend 后台验证收件邮箱）
 */
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'

/** Resend 客户端实例 */
const resend = new Resend(RESEND_API_KEY)

/**
 * 发送邮箱验证码
 * @param to 收件人邮箱
 * @param code 验证码（6 位数字）
 * @returns 是否发送成功
 */
export async function sendVerificationCode(to: string, code: string): Promise<boolean> {
  console.log(`[DEV] 发送验证码 ${code} 到邮箱 ${to}`)

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: '【Novel Reader】邮箱验证码',
      html: `
        <div style="max-width:480px;margin:0 auto;padding:32px 24px;font-family:'Helvetica Neue',Arial,sans-serif;">
          <h2 style="color:#333;margin-bottom:24px;">邮箱验证</h2>
          <p style="color:#666;font-size:14px;line-height:1.6;">
            您正在使用邮箱进行验证，以下是您的验证码：
          </p>
          <div style="background:#f5f5f5;border-radius:8px;padding:24px;text-align:center;margin:24px 0;">
            <span style="font-size:36px;font-weight:bold;color:#333;">${code}</span>
          </div>
          <p style="color:#999;font-size:12px;line-height:1.6;">
            验证码有效期为 1 分钟，请尽快使用。<br>
          </p>
        </div>
      `,
    })

    if (error) {
      console.error('邮件发送失败:', error)
      return false
    }

    console.log(`[EMAIL] 验证码已发送到 ${to}`)
    return true
  } catch (err) {
    console.error('邮件发送异常:', err)
    return false
  }
}
