import type { Middleware } from 'koa'
import jwt from 'jsonwebtoken'
import type { JwtPayload } from '../types/index.js'
import { unauthorized } from '../utils/response.js'

const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key-change-in-production'

/**
 * JWT 认证中间件
 * 验证请求头中的 Bearer Token，解析后将用户信息注入 ctx.user
 */
export const authMiddleware: Middleware = async (ctx, next) => {
  const authHeader = ctx.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    ctx.status = 401
    ctx.body = unauthorized('未提供认证令牌')
    return
  }

  const token = authHeader.slice(7) // 去掉 "Bearer " 前缀

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload
    ctx.user = decoded
    await next()
  } catch (err) {
    ctx.status = 401
    ctx.body = unauthorized('认证令牌无效或已过期')
  }
}
