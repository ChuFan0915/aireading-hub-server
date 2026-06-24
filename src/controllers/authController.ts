import type { Middleware } from 'koa'
import { authService } from '../services/authService.js'
import { success, created, badRequest, conflict, unauthorized, error } from '../utils/response.js'
import type { RegisterRequest, LoginRequest, SendCodeRequest, EmailRegisterRequest, EmailLoginRequest } from '../types/index.js'

/**
 * 认证控制器
 * 处理注册、登录、发送验证码、获取当前用户等 HTTP 请求
 */
export const authController = {
  // ==================== 用户名+密码注册 ====================

  /**
   * POST /api/auth/register
   * 用户注册（用户名+密码）
   */
  register: (async (ctx) => {
    try {
      const body = ctx.request.body as unknown as RegisterRequest

      // ----- 参数校验 -----
      if (!body.username || !body.password || !body.confirmPassword) {
        ctx.status = 400
        ctx.body = badRequest('用户名、密码和确认密码为必填项')
        return
      }

      if (body.username.length < 3 || body.username.length > 50) {
        ctx.status = 400
        ctx.body = badRequest('用户名长度应为 3-50 个字符')
        return
      }

      if (body.password.length < 6) {
        ctx.status = 400
        ctx.body = badRequest('密码长度不能少于 6 个字符')
        return
      }

      if (body.password !== body.confirmPassword) {
        ctx.status = 400
        ctx.body = badRequest('两次输入的密码不一致')
        return
      }

      if (body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
        ctx.status = 400
        ctx.body = badRequest('邮箱格式不正确')
        return
      }

      // ----- 调用服务层 -----
      const result = await authService.register({
        username: body.username,
        password: body.password,
        confirmPassword: body.confirmPassword,
        email: body.email,
      })

      ctx.status = 201
      ctx.body = created(result, '注册成功')
    } catch (err) {
      const message = (err as Error).message

      if (message === 'USERNAME_EXISTS') {
        ctx.status = 409
        ctx.body = conflict('用户名已存在')
        return
      }

      console.error('注册失败:', err)
      ctx.status = 500
      ctx.body = error('注册失败，请稍后重试')
    }
  }) as Middleware,

  // ==================== 用户名+密码登录 ====================

  /**
   * POST /api/auth/login
   * 用户登录（用户名+密码）
   */
  login: (async (ctx) => {
    try {
      const body = ctx.request.body as unknown as LoginRequest

      // ----- 参数校验 -----
      if (!body.username || !body.password) {
        ctx.status = 400
        ctx.body = badRequest('用户名和密码为必填项')
        return
      }

      // ----- 调用服务层 -----
      const result = await authService.login({
        username: body.username,
        password: body.password,
      })

      ctx.body = success(result, '登录成功')
    } catch (err) {
      const message = (err as Error).message

      if (message === 'INVALID_CREDENTIALS') {
        ctx.status = 401
        ctx.body = unauthorized('用户名或密码错误')
        return
      }

      console.error('登录失败:', err)
      ctx.status = 500
      ctx.body = error('登录失败，请稍后重试')
    }
  }) as Middleware,

  // ==================== 发送邮箱验证码 ====================

  /**
   * POST /api/auth/send-code
   * 发送邮箱验证码
   */
  sendCode: (async (ctx) => {
    try {
      const body = ctx.request.body as unknown as SendCodeRequest

      // ----- 参数校验 -----
      if (!body.email) {
        ctx.status = 400
        ctx.body = badRequest('邮箱为必填项')
        return
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
        ctx.status = 400
        ctx.body = badRequest('邮箱格式不正确')
        return
      }

      // ----- 调用服务层 -----
      const result = await authService.sendCode(body.email)

      if (!result.success) {
        ctx.status = 429 // Too Many Requests
        ctx.body = badRequest(result.message)
        return
      }

      ctx.body = success(null, result.message)
    } catch (err) {
      console.error('发送验证码失败:', err)
      ctx.status = 500
      ctx.body = error('发送验证码失败，请稍后重试')
    }
  }) as Middleware,

  // ==================== 邮箱+验证码注册 ====================

  /**
   * POST /api/auth/register-by-email
   * 邮箱注册（验证码方式）
   */
  registerByEmail: (async (ctx) => {
    try {
      const body = ctx.request.body as unknown as EmailRegisterRequest

      // ----- 参数校验 -----
      if (!body.account || !body.email || !body.code || !body.password || !body.confirmPassword) {
        ctx.status = 400
        ctx.body = badRequest('账号、邮箱、验证码、密码和确认密码为必填项')
        return
      }

      if (body.account.length < 3 || body.account.length > 50) {
        ctx.status = 400
        ctx.body = badRequest('账号长度应为 3-50 个字符')
        return
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
        ctx.status = 400
        ctx.body = badRequest('邮箱格式不正确')
        return
      }

      if (!/^\d{6}$/.test(body.code)) {
        ctx.status = 400
        ctx.body = badRequest('验证码格式不正确（6 位数字）')
        return
      }

      if (body.password.length < 6) {
        ctx.status = 400
        ctx.body = badRequest('密码长度不能少于 6 个字符')
        return
      }

      if (body.password !== body.confirmPassword) {
        ctx.status = 400
        ctx.body = badRequest('两次输入的密码不一致')
        return
      }

      // ----- 调用服务层 -----
      const result = await authService.registerByEmail({
        account: body.account,
        email: body.email,
        code: body.code,
        password: body.password,
        confirmPassword: body.confirmPassword,
      })

      ctx.status = 201
      ctx.body = created(result, '注册成功')
    } catch (err) {
      const message = (err as Error).message

      if (message === 'INVALID_CODE') {
        ctx.status = 400
        ctx.body = badRequest('验证码错误或已过期')
        return
      }

      if (message === 'ACCOUNT_EXISTS') {
        ctx.status = 409
        ctx.body = conflict('该账号已存在')
        return
      }

      if (message === 'EMAIL_EXISTS') {
        ctx.status = 409
        ctx.body = conflict('该邮箱已注册')
        return
      }

      console.error('邮箱注册失败:', err)
      ctx.status = 500
      ctx.body = error('注册失败，请稍后重试')
    }
  }) as Middleware,

  // ==================== 邮箱+验证码登录 ====================

  /**
   * POST /api/auth/login-by-email
   * 邮箱登录（验证码方式）
   */
  loginByEmail: (async (ctx) => {
    try {
      const body = ctx.request.body as unknown as EmailLoginRequest

      // ----- 参数校验 -----
      if (!body.email || !body.code) {
        ctx.status = 400
        ctx.body = badRequest('邮箱和验证码为必填项')
        return
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
        ctx.status = 400
        ctx.body = badRequest('邮箱格式不正确')
        return
      }

      if (!/^\d{6}$/.test(body.code)) {
        ctx.status = 400
        ctx.body = badRequest('验证码格式不正确（6 位数字）')
        return
      }

      // ----- 调用服务层 -----
      const result = await authService.loginByEmail({
        email: body.email,
        code: body.code,
      })

      ctx.body = success(result, '登录成功')
    } catch (err) {
      const message = (err as Error).message

      if (message === 'INVALID_CODE') {
        ctx.status = 400
        ctx.body = badRequest('验证码错误或已过期')
        return
      }

      if (message === 'USER_NOT_FOUND') {
        ctx.status = 404
        ctx.body = badRequest('该邮箱未注册，请先注册')
        return
      }

      console.error('邮箱登录失败:', err)
      ctx.status = 500
      ctx.body = error('登录失败，请稍后重试')
    }
  }) as Middleware,

  // ==================== 获取当前用户 ====================

  /**
   * GET /api/auth/me
   * 获取当前登录用户信息（需认证）
   */
  getCurrentUser: (async (ctx) => {
    try {
      const userId = ctx.user?.userId
      if (!userId) {
        ctx.status = 401
        ctx.body = unauthorized()
        return
      }

      const user = await authService.getCurrentUser(userId)
      ctx.body = success(user, '获取用户信息成功')
    } catch (err) {
      const message = (err as Error).message

      if (message === 'USER_NOT_FOUND') {
        ctx.status = 404
        ctx.body = badRequest('用户不存在')
        return
      }

      console.error('获取用户信息失败:', err)
      ctx.status = 500
      ctx.body = error('获取用户信息失败')
    }
  }) as Middleware,
}
