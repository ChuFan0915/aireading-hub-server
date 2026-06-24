import Router from '@koa/router'
import * as crawlerController from '../controllers/crawlerController.js'

const router = new Router({ prefix: '/api/crawler' })

/**
 * 爬虫相关路由
 *
 * 提供小说搜索、章节列表、章节内容的 HTTP 接口。
 * 前端可通过 source 参数切换小说源。
 */

// 获取可用小说源列表
router.get('/sources', crawlerController.getSources)

// 搜索小说
// GET /api/crawler/search?keyword=xxx&source=可选
router.get('/search', crawlerController.search)

// 获取章节列表
// GET /api/crawler/chapters?url=/book/xxx/&source=可选
router.get('/chapters', crawlerController.getChapterList)

// 获取章节内容
// GET /api/crawler/content?url=/book/xxx/xxx.html&source=可选
router.get('/content', crawlerController.getChapterContent)

export default router
