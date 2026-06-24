import { prisma } from '../utils/prisma.js'
import { readChapterContent } from '../utils/contentStore.js'

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

export interface BookDetail {
  id: string
  name: string
  author: string
  cover: string
  desc: string | null
  category: string | null
  status: string
  chapterCoun: number
  chapters: {
    id: string
    title: string
    index: number
  }[]
}

/**
 * 获取书籍详情（含章节列表）
 * @param bookId 书籍 ID
 */
export async function getBookDetail(bookId: string): Promise<BookDetail | null> {
  const book = await prisma.book.findUnique({
    where: { id: bookId },
    include: {
      chapters: {
        select: {
          id: true,
          title: true,
          index: true,
        },
        orderBy: { index: 'asc' },
      },
    },
  })

  if (!book) return null

  return {
    id: book.id,
    name: book.name,
    author: book.author,
    cover: coverUrl(book.cover),
    desc: book.desc,
    category: book.category,
    status: book.status,
    chapterCoun: book.chapters.length,
    chapters: book.chapters.map((ch) => ({
      id: ch.id,
      title: ch.title,
      index: ch.index,
    })),
  }
}

/**
 * 获取章节内容
 * @param chapterId 章节 ID
 */
export async function getChapterContent(chapterId: string) {
  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    select: {
      id: true,
      title: true,
      index: true,
      content: true,
      contentPath: true,
      bookId: true,
    },
  })

  if (!chapter) return null

  // 优先从文件系统读取内容，回退到数据库 content 字段
  let content: string
  if (chapter.contentPath) {
    const fileContent = await readChapterContent(chapter.bookId, chapterId, chapter.contentPath)
    content = fileContent ?? chapter.content ?? ''
  } else {
    content = chapter.content ?? ''
  }

  return {
    id: chapter.id,
    title: chapter.title,
    index: chapter.index,
    content,
    bookId: chapter.bookId,
  }
}

export interface BookReadData {
  id: string
  name: string
  author: string
  cover: string
  desc: string | null
  category: string | null
  status: string
  chapterCoun: number
  /** 书架上的阅读进度（章节 index），0 表示未读过 */
  lastReadIndex: number
  /** 所有章节（含内容） */
  chapters: {
    id: string
    title: string
    index: number
    content: string
  }[]
}

/**
 * 获取书籍完整阅读数据（所有章节内容 + 书架进度）
 *
 * 如果传入了 userId，会同时查询书架上的阅读进度。
 *
 * @param bookId  书籍 ID
 * @param userId  当前用户 ID（可选，用于获取书架进度）
 */
export async function getBookReadData(
  bookId: string,
  userId?: string,
): Promise<BookReadData | null> {
  const book = await prisma.book.findUnique({
    where: { id: bookId },
    include: {
      chapters: {
        select: {
          id: true,
          title: true,
          index: true,
          content: true,
          contentPath: true,
        },
        orderBy: { index: 'asc' },
      },
    },
  })

  if (!book) return null

  // 查询书架阅读进度
  let lastReadIndex = 0
  if (userId) {
    const bookshelf = await prisma.bookshelf.findUnique({
      where: { userId_bookId: { userId, bookId } },
      select: { progress: true },
    })
    if (bookshelf) {
      lastReadIndex = bookshelf.progress
    }
  }

  // 批量从文件系统读取章节内容，回退到数据库
  const chaptersWithContent = await Promise.all(
    book.chapters.map(async (ch) => {
      let content: string
      if (ch.contentPath) {
        const fileContent = await readChapterContent(book.id, ch.id, ch.contentPath)
        content = fileContent ?? ch.content ?? ''
      } else {
        content = ch.content ?? ''
      }
      return {
        id: ch.id,
        title: ch.title,
        index: ch.index,
        content,
      }
    }),
  )

  return {
    id: book.id,
    name: book.name,
    author: book.author,
    cover: coverUrl(book.cover),
    desc: book.desc,
    category: book.category,
    status: book.status,
    chapterCoun: chaptersWithContent.length,
    lastReadIndex,
    chapters: chaptersWithContent,
  }
}
