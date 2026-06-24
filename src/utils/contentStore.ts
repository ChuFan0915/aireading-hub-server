import * as fs from 'fs/promises'
import * as path from 'path'

/**
 * 章节内容文件存储工具
 *
 * 将章节正文从数据库迁移到文件系统：
 * - 每章一个 .txt 文件，按 bookId 分目录
 * - 存储路径：storage/chapters/{bookId}/{chapterId}.txt
 * - 优势：数据库轻量、支持大文本、方便备份迁移
 */

/** 存储根目录（相对于项目根目录） */
const STORAGE_ROOT = path.resolve('storage/chapters')

/**
 * 确保存储目录存在
 */
async function ensureDir(dirPath: string): Promise<void> {
  try {
    await fs.mkdir(dirPath, { recursive: true })
  } catch {
    // 目录已存在
  }
}

/**
 * 获取章节内容的文件路径
 * @param bookId   书籍 ID
 * @param chapterId 章节 ID
 * @returns 文件绝对路径
 */
function getChapterPath(bookId: string, chapterId: string): string {
  return path.join(STORAGE_ROOT, bookId, `${chapterId}.txt`)
}

/**
 * 获取章节内容存储的相对路径（用于存入数据库 contentPath 字段）
 */
function getRelativePath(bookId: string, chapterId: string): string {
  return `storage/chapters/${bookId}/${chapterId}.txt`
}

/**
 * 将章节内容保存到文件
 * @param bookId    书籍 ID
 * @param chapterId 章节 ID
 * @param content   章节正文
 * @returns 文件相对路径
 */
export async function saveChapterContent(
  bookId: string,
  chapterId: string,
  content: string,
): Promise<string> {
  const dirPath = path.join(STORAGE_ROOT, bookId)
  await ensureDir(dirPath)

  const filePath = getChapterPath(bookId, chapterId)
  await fs.writeFile(filePath, content, 'utf-8')

  return getRelativePath(bookId, chapterId)
}

/**
 * 从文件读取章节内容
 * @param bookId    书籍 ID
 * @param chapterId 章节 ID
 * @param contentPath 数据库中的 contentPath 字段（优先使用）
 * @returns 章节正文，文件不存在返回 null
 */
export async function readChapterContent(
  bookId: string,
  chapterId: string,
  contentPath?: string | null,
): Promise<string | null> {
  let filePath: string

  if (contentPath) {
    filePath = path.resolve(contentPath)
  } else {
    filePath = getChapterPath(bookId, chapterId)
  }

  try {
    return await fs.readFile(filePath, 'utf-8')
  } catch {
    // 文件不存在返回 null，由调用方回退到数据库 content 字段
    return null
  }
}

/**
 * 删除章节内容文件
 * @param bookId    书籍 ID
 * @param chapterId 章节 ID
 * @param contentPath 数据库中的 contentPath 字段
 */
export async function deleteChapterContent(
  bookId: string,
  chapterId: string,
  contentPath?: string | null,
): Promise<void> {
  let filePath: string

  if (contentPath) {
    filePath = path.resolve(contentPath)
  } else {
    filePath = getChapterPath(bookId, chapterId)
  }

  try {
    await fs.unlink(filePath)
  } catch {
    // 文件不存在，忽略
  }
}

/**
 * 批量删除某本书的所有章节文件
 * @param bookId 书籍 ID
 */
export async function deleteBookChapters(bookId: string): Promise<void> {
  const bookDir = path.join(STORAGE_ROOT, bookId)
  try {
    await fs.rm(bookDir, { recursive: true, force: true })
  } catch {
    // 目录不存在，忽略
  }
}

/**
 * 获取存储统计信息
 */
export async function getStorageStats(): Promise<{
  totalFiles: number
  totalSize: number
}> {
  let totalFiles = 0
  let totalSize = 0

  async function walkDir(dir: string): Promise<void> {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          await walkDir(fullPath)
        } else if (entry.isFile()) {
          totalFiles++
          const stat = await fs.stat(fullPath)
          totalSize += stat.size
        }
      }
    } catch {
      // 目录不存在
    }
  }

  await walkDir(STORAGE_ROOT)
  return { totalFiles, totalSize }
}