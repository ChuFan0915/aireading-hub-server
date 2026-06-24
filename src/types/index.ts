// ==================== 请求体类型 ====================

/** 注册请求（用户名+密码） */
export interface RegisterRequest {
  username: string
  password: string
  confirmPassword: string
  email?: string
}

/** 登录请求（用户名+密码） */
export interface LoginRequest {
  username: string
  password: string
}

/** 发送邮箱验证码请求 */
export interface SendCodeRequest {
  email: string
}

/** 邮箱注册请求（验证码方式） */
export interface EmailRegisterRequest {
  account: string
  email: string
  code: string
  password: string
  confirmPassword: string
}

/** 邮箱登录请求（验证码方式） */
export interface EmailLoginRequest {
  email: string
  code: string
}

// ==================== 响应类型 ====================

/** 统一响应格式 */
export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data?: T
}

/** 登录响应数据 */
export interface LoginResponseData {
  token: string
  user: UserInfo
}

/** 用户信息 */
export interface UserInfo {
  id: string
  username: string
  email: string | null
  avatar: string | null
  nickname: string | null
  createdAt: Date
  role:string
}

// ==================== JWT 载荷 ====================

/** JWT 中存储的用户信息 */
export interface JwtPayload {
  userId: string
  username: string
  role:string
}
