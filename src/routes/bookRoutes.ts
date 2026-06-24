import Router from '@koa/router'
import {
  getBookDetail,
  getChapterContent,
  getBookReadData,
} from '../controllers/bookController.js'
import { authMiddleware } from '../middleware/auth.js'

const router = new Router({ prefix: '/api/books' })

/**
 * 书籍相关路由
 *
 * 需要登录认证。
 */

// 获取书籍详情（含章节列表）
router.get('/:bookId', authMiddleware, getBookDetail)

// 获取书籍完整阅读数据（所有章节内容 + 书架进度）
router.get('/:bookId/read', authMiddleware, getBookReadData)

// 获取章节内容
router.get('/:bookId/chapters/:chapterId', authMiddleware, getChapterContent)

export default router
