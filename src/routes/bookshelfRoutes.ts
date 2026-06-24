import Router from '@koa/router'
import {
  getBookshelf,
  addToBookshelf,
  removeFromBookshelf,
  updateProgress,
} from '../controllers/bookshelfController.js'
import { authMiddleware } from '../middleware/auth.js'

const router = new Router({ prefix: '/api/bookshelf' })

/**
 * 书架路由
 *
 * 所有书架接口都需要登录认证。
 */

// 获取当前用户的书架列表
router.get('/', authMiddleware, getBookshelf)

// 将书加入书架
router.post('/add', authMiddleware, addToBookshelf)

// 从书架移除（按 bookId）
router.delete('/:bookId', authMiddleware, removeFromBookshelf)

// 更新阅读进度
router.put('/:bookId/progress', authMiddleware, updateProgress)

export default router
