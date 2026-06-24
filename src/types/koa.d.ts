import 'koa'
import type { JwtPayload } from './index.js'

declare module 'koa' {
  interface ExtendableContext {
    /** 当前登录用户信息（由 auth 中间件注入） */
    user?: JwtPayload
  }

  interface Request {
    /** koa-body 解析后的请求体 */
    body?: unknown
  }
}
