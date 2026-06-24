import { prisma } from '../utils/prisma.js'

/** 后端服务器地址 */
const SERVER_BASE = process.env.SERVER_BASE || 'http://localhost:3000'

/** 默认封面图片完整 URL */
const DEFAULT_COVER = `${SERVER_BASE}/default-cover.png`

/**
 * 将封面相对路径转为完整 URL
 */
function coverUrl(cover: string | null): string {
  if (!cover) return DEFAULT_COVER
  if (cover.startsWith('http')) return cover
  return `${SERVER_BASE}${cover}`
}

export interface BookshelfItem {
  id: string
  bookId: string
  name: string
  author: string
  cover: string
  thomeColor: string | null
  progress: number
  updateTime: number
}

/**
 * 获取用户书架列表
 * 查询当前用户书架上的所有书籍，按更新时间倒序排列
 */
export async function getBookshelf(userId: string): Promise<BookshelfItem[]> {
  const bookshelf = await prisma.bookshelf.findMany({
    where: { userId },
    include: {
      book: {
        select: {
          id: true,
          name: true,
          author: true,
          cover: true,
          thomeColor: true,
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  })

  return bookshelf.map((item) => ({
    id: item.id,
    bookId: item.bookId,
    name: item.book.name,
    author: item.book.author,
    cover: coverUrl(item.book.cover),
    thomeColor: item.book.thomeColor,
    progress: item.progress,
    updateTime: new Date(item.updatedAt).getTime(),
  }))
}

/**
 * 将书加入书架
 * 如果已存在则直接返回，避免重复
 */
export async function addToBookshelf(userId: string, bookId: string) {
  const existing = await prisma.bookshelf.findUnique({
    where: { userId_bookId: { userId, bookId } },
  })

  if (existing) {
    return existing
  }

  return await prisma.bookshelf.create({
    data: { userId, bookId },
  })
}

/**
 * 从书架移除
 */
export async function removeFromBookshelf(userId: string, bookId: string) {
  await prisma.bookshelf.deleteMany({
    where: { userId, bookId },
  })
}

/**
 * 更新阅读进度
 *
 * 记录用户读到哪一章（通过章节 index）。
 * 每次用户切换章节或离开阅读页时，前端调用此接口上报进度。
 *
 * @param userId  用户 ID
 * @param bookId  书籍 ID
 * @param chapterIndex  当前阅读到的章节 index（从 1 开始）
 */
export async function updateProgress(
  userId: string,
  bookId: string,
  chapterIndex: number,
) {
  const bookshelf = await prisma.bookshelf.findUnique({
    where: { userId_bookId: { userId, bookId } },
  })

  if (!bookshelf) {
    // 如果书不在书架上，不记录进度
    return null
  }

  return await prisma.bookshelf.update({
    where: { userId_bookId: { userId, bookId } },
    data: { progress: chapterIndex },
  })
}
