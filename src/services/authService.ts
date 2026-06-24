import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import prisma from '../utils/prisma.js'
import { sendCode, verifyCode } from '../utils/verificationCode.js'
import type {
  RegisterRequest,
  LoginRequest,
  LoginResponseData,
  UserInfo,
  JwtPayload,
  EmailRegisterRequest,
  EmailLoginRequest,
} from '../types/index.js'
import type { User } from '@prisma/client'

const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key-change-in-production'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'

/** 密码加密的盐值轮数 */
const SALT_ROUNDS = 10

/**
 * 认证服务
 * 处理用户注册、登录等业务逻辑
 */
export const authService = {
  // ==================== 用户名+密码注册 ====================

  /**
   * 用户注册（用户名+密码）
   * @param params 注册参数
   * @returns 登录响应（含 token 和用户信息）
   * @throws 当用户名已存在时抛出错误
   */
  async register(params: RegisterRequest): Promise<LoginResponseData> {
    const { username, password, email } = params

    // 检查用户名是否已存在
    const existingUser = await prisma.user.findUnique({ where: { username } })
    if (existingUser) {
      throw new Error('USERNAME_EXISTS')
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS)

    // 创建用户
    const user = await prisma.user.create({
      data: {
        username,
        
        password: hashedPassword,
        email: email || null,
      },
    })

    // 生成 JWT
    const token = generateToken({ userId: user.id, username: user.username ,role:user.role})

    return {
      token,
      user: toUserInfo(user),
    }
  },

  // ==================== 用户名+密码登录 ====================

  /**
   * 用户登录（用户名+密码）
   * @param params 登录参数
   * @returns 登录响应（含 token 和用户信息）
   * @throws 当用户名或密码错误时抛出错误
   */
  async login(params: LoginRequest): Promise<LoginResponseData> {
    const { username, password } = params

    // 查找用户
    const user = await prisma.user.findUnique({ where: { username } })
    if (!user) {
      throw new Error('INVALID_CREDENTIALS')
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      throw new Error('INVALID_CREDENTIALS')
    }

    // 生成 JWT
    const token = generateToken({ userId: user.id, username: user.username ,role:user.role})

    return {
      token,
      user: toUserInfo(user),
    }
  },

  // ==================== 发送邮箱验证码 ====================

  /**
   * 发送邮箱验证码
   * @param email 邮箱地址
   * @returns 发送结果
   */
  async sendCode(email: string): Promise<{ success: boolean; message: string }> {
    return await sendCode(email)
  },

  // ==================== 邮箱+验证码注册 ====================

  /**
   * 邮箱注册（验证码方式）
   * 邮箱同时作为用户名
   * @param params 注册参数
   * @returns 登录响应（含 token 和用户信息）
   * @throws 当验证码错误或邮箱已注册时抛出错误
   */
  async registerByEmail(params: EmailRegisterRequest): Promise<LoginResponseData> {
    const { account, email, code, password } = params

    // 校验验证码
    const isValid = verifyCode(email, code)
    if (!isValid) {
      throw new Error('INVALID_CODE')
    }

    // 检查账号是否已存在
    const existingAccount = await prisma.user.findUnique({ where: { username: account } })
    if (existingAccount) {
      throw new Error('ACCOUNT_EXISTS')
    }

    // 检查邮箱是否已注册
    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      throw new Error('EMAIL_EXISTS')
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS)

    // 创建用户（使用 account 作为用户名）
    const user = await prisma.user.create({
      data: {
        username: account,
        password: hashedPassword,
        email,
      },
    })

    // 生成 JWT
    const token = generateToken({ userId: user.id, username: user.username,role:user.role })

    return {
      token,
      user: toUserInfo(user),
    }
  },

  // ==================== 邮箱+验证码登录 ====================

  /**
   * 邮箱登录（验证码方式）
   * @param params 登录参数
   * @returns 登录响应（含 token 和用户信息）
   * @throws 当验证码错误或用户不存在时抛出错误
   */
  async loginByEmail(params: EmailLoginRequest): Promise<LoginResponseData> {
    const { email, code } = params

    // 校验验证码
    const isValid = verifyCode(email, code)
    if (!isValid) {
      throw new Error('INVALID_CODE')
    }

    // 查找用户
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      throw new Error('USER_NOT_FOUND')
    }

    // 生成 JWT
    const token = generateToken({ userId: user.id, username: user.username,role:user.role })

    return {
      token,
      user: toUserInfo(user),
    }
  },
     
  // ==================== 获取当前用户 ====================

  /**
   * 获取当前登录用户信息
   * @param userId 用户 ID
   * @returns 用户信息
   * @throws 当用户不存在时抛出错误
   */
  async getCurrentUser(userId: string): Promise<UserInfo> {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      throw new Error('USER_NOT_FOUND')
    }
    return toUserInfo(user)
  },
}

/**
 * 生成 JWT Token
 */
function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload as object, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions)
}

/**
 * 将数据库 User 对象转换为安全的 UserInfo（排除密码等敏感字段）
 */
function toUserInfo(user: User): UserInfo {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    avatar: user.avatar,
    nickname: user.nickname,
    createdAt: user.createdAt,
    role:user.role
  }
}
