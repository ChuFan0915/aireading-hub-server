import Router from '@koa/router'
import { uploadBook } from '../controllers/uploadController.js'
import { authMiddleware } from '../middleware/auth.js'

const router = new Router({ prefix: '/api/upload' })

/**
 * 上传路由
 *
 * 管理员上传小说文件（.txt / .epub），后端自动解析并存入数据库。
 * 需要登录认证。
 */

// 上传并解析小说文件
// POST /api/upload/book
// Content-Type: multipart/form-data
// 字段: file (支持 .txt 或 .epub)
router.post('/book', authMiddleware, uploadBook)

export default router
