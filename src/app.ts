import 'dotenv/config'
import Koa from 'koa'
import cors from '@koa/cors'
import { koaBody } from 'koa-body'
import authRoutes from './routes/authRoutes.js'
import crawlerRoutes from './routes/crawlerRoutes.js'
import uploadRoutes from './routes/uploadRoutes.js'
import bookshelfRoutes from './routes/bookshelfRoutes.js'
import bookRoutes from './routes/bookRoutes.js'
import * as path from 'path'
import * as fs from 'fs/promises'

const app = new Koa()
const PORT = parseInt(process.env.PORT || '3000', 10)

// ==================== 全局中间件 ====================

// CORS — 允许前端跨域请求
app.use(cors({
  origin: '*',
  credentials: true,
}))

// 请求体解析 — 解析 JSON / form-data / urlencoded，支持文件上传
app.use(koaBody({
  multipart: true,
  formidable: {
    maxFileSize: 100 * 1024 * 1024, // 最大 100MB
  },
}))

// 静态文件中间件 — 提供封面图片和默认封面的访问
// public/ 目录下的文件通过根路径访问（如 /default-cover.png）
// uploads/ 目录下的文件通过 /uploads/ 路径访问
app.use(async (ctx, next) => {
  // 处理根路径下的静态文件（映射到 public/ 目录）
  const publicFilePath = path.resolve('public', ctx.path.slice(1))
  try {
    await fs.access(publicFilePath)
    const stat = await fs.stat(publicFilePath)
    if (stat.isFile()) {
      ctx.type = path.extname(publicFilePath)
      ctx.body = await fs.readFile(publicFilePath)
      return
    }
  } catch {
    // 文件不在 public/ 中，继续
  }

  // 处理 /uploads/ 路径（映射到 uploads/ 目录）
  if (ctx.path.startsWith('/uploads/')) {
    const uploadFilePath = path.resolve('.' + ctx.path)
    try {
      await fs.access(uploadFilePath)
      ctx.type = path.extname(uploadFilePath)
      ctx.body = await fs.readFile(uploadFilePath)
      return
    } catch {
      ctx.status = 404
      ctx.body = 'Not Found'
      return
    }
  }

  await next()
})

// ==================== 路由注册 ====================

app.use(authRoutes.routes())
app.use(authRoutes.allowedMethods())

app.use(crawlerRoutes.routes())
app.use(crawlerRoutes.allowedMethods())

app.use(uploadRoutes.routes())
app.use(uploadRoutes.allowedMethods())

app.use(bookshelfRoutes.routes())
app.use(bookshelfRoutes.allowedMethods())

app.use(bookRoutes.routes())
app.use(bookRoutes.allowedMethods())

// ==================== 健康检查 ====================

app.use(async (ctx) => {
  if (ctx.path === '/health') {
    ctx.body = {
      code: 200,
      message: 'OK',
      data: {
        status: 'running',
        timestamp: new Date().toISOString(),
      },
    }
  }
})

// ==================== 启动服务器 ====================

app.listen(PORT, () => {
  console.log(`🚀 Novel Reader Server is running on http://localhost:${PORT}`)
})

export default app
