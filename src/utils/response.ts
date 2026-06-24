import type { ApiResponse } from '../types/index.js'

/**
 * 统一响应工具
 * 确保所有接口返回一致的 JSON 结构
 */

/** 成功响应（200） */
export function success<T>(data?: T, message = '操作成功'): ApiResponse<T> {
  return { code: 200, message, data }
}

/** 创建成功响应（201） */
export function created<T>(data?: T, message = '创建成功'): ApiResponse<T> {
  return { code: 201, message, data }
}

/** 请求参数错误（400） */
export function badRequest(message = '请求参数错误'): ApiResponse {
  return { code: 400, message }
}

/** 未授权（401） */
export function unauthorized(message = '未登录或登录已过期'): ApiResponse {
  return { code: 401, message }
}

/** 资源不存在（404） */
export function notFound(message = '资源不存在'): ApiResponse {
  return { code: 404, message }
}

/** 冲突/重复（409） */
export function conflict(message = '资源已存在'): ApiResponse {
  return { code: 409, message }
}

/** 服务器内部错误（500） */
export function error(message = '服务器内部错误'): ApiResponse {
  return { code: 500, message }
}
