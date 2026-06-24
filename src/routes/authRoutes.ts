import Router from '@koa/router'
import { authController } from '../controllers/authController.js'
import { authMiddleware } from '../middleware/auth.js'

const router = new Router({ prefix: '/api/auth' })

/**
 * 认证相关路由
 *
 
 */

// 注册（用户名+密码，公开）
router.post('/register', authController.register)

// 登录（用户名+密码，公开）
router.post('/login', authController.login)

// 发送邮箱验证码（公开）
router.post('/sendCode', authController.sendCode)

// 邮箱注册（验证码方式，公开）
router.post('/register/email', authController.registerByEmail)

// 邮箱登录（验证码方式，公开）
router.post('/login-by-email', authController.loginByEmail)

// 获取当前用户信息（需要认证）
router.get('/me', authMiddleware, authController.getCurrentUser)

export default router
