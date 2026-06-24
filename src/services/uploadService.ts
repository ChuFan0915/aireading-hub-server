import AdmZip from 'adm-zip'
import { Parser } from 'xml2js'
import { prisma } from '../utils/prisma.js'
import { saveChapterContent } from '../utils/contentStore.js'
import * as path from 'path'
import * as fs from 'fs/promises'
import crypto from 'crypto'
import { randomUUID } from 'crypto'

// 封面图片存储目录
const COVERS_DIR = path.resolve('uploads/covers')

/** 确保封面目录存在 */
async function ensureCoversDir() {
  try {
    await fs.mkdir(COVERS_DIR, { recursive: true })
  } catch {
    // 目录已存在
  }
}

// ==================== 公开接口 ====================

export interface UploadResult {
  bookId: string
  bookName: string
  author: string
  chapterCount: number
}

/**
 * 上传并解析小说文件
 * 支持 .txt 和 .epub 格式
 * @param userId 上传者用户ID，用于自动加入书架
 */
export async function uploadBook(
  filePath: string,
  originalName: string,
  userId?: string,
): Promise<UploadResult> {
  const ext = path.extname(originalName).toLowerCase()

  let bookName: string
  let author: string
  let chapters: { title: string; content: string }[]
  let coverPath: string | null = null

  if (ext === '.epub') {
    // EPUB 解析时尝试提取封面
    const result = await parseEpub(filePath)
    bookName = result.bookName
    author = result.author
    chapters = result.chapters
    coverPath = result.coverPath
  } else if (ext === '.txt') {
    ;({ bookName, author, chapters } = await parseTxt(filePath, originalName))
  } else {
    throw new Error(`不支持的文件格式: ${ext}，仅支持 .txt 和 .epub`)
  }

  // 先创建书籍记录（不含章节）
  const book = await prisma.book.create({
    data: {
      name: bookName,
      author,
      cover: coverPath,
      status: 'completed',
    },
  })

  // 逐章处理：内容存入文件系统
  const chapterCount = chapters.length
  let chapterIndex = 0
  for (const ch of chapters) {
    chapterIndex++
    // 先生成 chapterId，以便直接保存到正确的文件路径
    const chapterId = randomUUID()
    const contentPath = await saveChapterContent(book.id, chapterId, ch.content)
    await prisma.chapter.create({
      data: {
        id: chapterId,
        bookId: book.id,
        title: ch.title || `第${chapterIndex}章`,
        index: chapterIndex,
        contentPath,
      },
    })
  }
 
  // 如果传入了 userId，自动将书加入该用户的书架
  if (userId) {
    await prisma.bookshelf.upsert({
      where: { userId_bookId: { userId, bookId: book.id } },
      update: {},
      create: { userId, bookId: book.id },
    })
  }

  return {
    bookId: book.id,
    bookName: book.name,
    author: book.author,
    chapterCount,
  }
}

// ==================== TXT 解析 ====================

/** 常见的章节标题正则 */
const CHAPTER_PATTERNS = [
  /^第[一二三四五六七八九十百千万零\d]+[章回节部集卷]/,
  /^第\d+[章回节部集卷]/,
  /^(?:序章|前言|引子|楔子|尾声|后记|番外)/,
  /^Chapter\s+\d+/i,
  /^CHAPTER\s+\d+/,
  /^Vol\.?\s*\d+/i,
  /^Part\s+\d+/i,
  /^\d+[、\.\s]/,
  /^[一二三四五六七八九十百千万]+[、\.\s]/,
  /^\([一二三四五六七八九十]+\)/,
  /^【[^】]+】/,
]

/**
 * 解析 TXT 文件
 * 智能识别章节标题，自动拆分章节
 */
async function parseTxt(
  filePath: string,
  originalName: string,
): Promise<{
  bookName: string
  author: string
  chapters: { title: string; content: string }[]
}> {
  // 读取文件，尝试多种编码
  const raw = await fs.readFile(filePath)
  let text: string

  // 尝试 UTF-8 解码
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(raw)
  } catch {
    // UTF-8 失败则尝试 GBK
    try {
      const iconv = (await import('iconv-lite')).default
      text = iconv.decode(raw, 'gbk')
    } catch {
      // 兜底：忽略无效字符用 UTF-8
      text = new TextDecoder('utf-8', { fatal: false }).decode(raw)
    }
  }

  // 清理 BOM 头和 \r
  text = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  // 按行分割
  const lines = text.split('\n')

  // 提取书名和作者（从文件名或前几行）
  let bookName = path.basename(originalName, '.txt')
  let author = '未知作者'

  // 尝试从文件头部提取元信息
  const headerLines = lines.slice(0, Math.min(20, lines.length)).join('\n')
  const authorMatch = headerLines.match(/作者[：:]\s*(\S+)/)
  if (authorMatch) author = authorMatch[1]

  const nameMatch = headerLines.match(/书名[：:]\s*(\S+)/)
  if (nameMatch) bookName = nameMatch[1]

  // 识别章节
  const chapters: { title: string; content: string }[] = []
  let currentTitle = ''
  let currentContent: string[] = []
  let chapterIndex = 0

  for (const line of lines) {
    const trimmed = line.trim()

    // 跳过空行（但保留段落间的空行）
    if (!trimmed) {
      if (currentContent.length > 0) {
        currentContent.push('')
      }
      continue
    }

    // 检查是否是章节标题
    const isChapterTitle = CHAPTER_PATTERNS.some((pattern) => pattern.test(trimmed))

    if (isChapterTitle) {
      // 保存上一章
      if (currentContent.length > 0) {
        chapters.push({
          title: currentTitle || `第${chapterIndex}章`,
          content: currentContent.join('\n').replace(/\n{3,}/g, '\n\n').trim(),
        })
        chapterIndex++
      }
      currentTitle = trimmed
      currentContent = []
    } else {
      currentContent.push(line)
    }
  }

  // 保存最后一章
  if (currentContent.length > 0) {
    chapters.push({
      title: currentTitle || `第${chapterIndex + 1}章`,
      content: currentContent.join('\n').replace(/\n{3,}/g, '\n\n').trim(),
    })
  }

  // 如果没识别到任何章节，整本书作为一章
  if (chapters.length === 0) {
    chapters.push({
      title: bookName,
      content: lines.join('\n').trim(),
    })
  }

  return { bookName, author, chapters }
}

// ==================== EPUB 解析 ====================

interface EpubMeta {
  bookName: string
  author: string
  coverUrl?: string
}

interface EpubChapter {
  title: string
  content: string
}

interface EpubParseResult {
  bookName: string
  author: string
  chapters: EpubChapter[]
  coverPath: string | null
}

/**
 * 解析 EPUB 文件
 *
 * EPUB 结构：
 *   - ZIP 压缩包
 *   - META-INF/container.xml → 指向 .opf 文件
 *   - .opf 文件 → 包含元数据（书名、作者）和章节清单（spine）
 *   - 每个章节是一个 XHTML/HTML 文件
 */
async function parseEpub(filePath: string): Promise<EpubParseResult> {
  const zip = new AdmZip(filePath)
  const zipEntries = zip.getEntries()

  // 1. 找到 container.xml
  const containerEntry = zipEntries.find(
    (e) => e.entryName === 'META-INF/container.xml',
  )
  if (!containerEntry) {
    throw new Error('无效的 EPUB 文件：找不到 META-INF/container.xml')
  }

  const containerXml = containerEntry.getData().toString('utf-8')
  const containerParsed = await parseXmlPromise(containerXml)

  // 2. 从 container.xml 获取 OPF 文件路径
  const rootfilePath =
    containerParsed.container?.rootfiles?.[0]?.rootfile?.[0]?.$?.['full-path']
  if (!rootfilePath) {
    throw new Error('无效的 EPUB 文件：找不到 OPF 文件路径')
  }

  // 3. 解析 OPF 文件
  const opfEntry = zipEntries.find(
    (e) => e.entryName === rootfilePath || e.entryName.endsWith('/' + rootfilePath),
  )
  if (!opfEntry) {
    throw new Error(`无效的 EPUB 文件：找不到 OPF 文件 ${rootfilePath}`)
  }

  const opfXml = opfEntry.getData().toString('utf-8')
  const opfParsed = await parseXmlPromise(opfXml)

  const opfDir = path.dirname(rootfilePath)

  // 4. 提取元数据
  const metadata = opfParsed.package?.metadata?.[0] || {}
  const bookName =
    findMetadata(metadata, 'title') ||
    path.basename(filePath, '.epub')
  const author =
    findMetadata(metadata, 'creator') || '未知作者'

  // 5. 提取封面图片
  let coverPath: string | null = null
  try {
    coverPath = await extractEpubCover(zip, zipEntries, opfParsed, opfDir)
  } catch (err) {
    console.warn('提取 EPUB 封面失败:', (err as Error).message)
  }

  // 6. 获取章节文件列表（spine）
  const spine = opfParsed.package?.spine?.[0]
  const spineItems: string[] = []

  if (spine?.itemref) {
    for (const ref of spine.itemref) {
      const idref = ref.$?.idref
      if (idref) spineItems.push(idref)
    }
  }

  // 7. 获取 manifest（id → href 映射）
  const manifest = opfParsed.package?.manifest?.[0]
  const idToHref: Record<string, string> = {}

  if (manifest?.item) {
    for (const item of manifest.item) {
      const id = item.$.id
      const href = item.$.href
      if (id && href) {
        idToHref[id] = href
      }
    }
  }

  // 8. 按 spine 顺序读取每个章节
  const chapters: EpubChapter[] = []

  // 需要跳过的非正文文件（封面页、标题页等）
  const SKIP_FILES = ['titlepage', 'cover', 'toc', 'nav']

  for (const idref of spineItems) {
    const href = idToHref[idref]
    if (!href) continue

    // 跳过封面页、标题页等非正文文件
    const hrefLower = href.toLowerCase()
    if (SKIP_FILES.some((skip) => hrefLower.includes(skip))) continue

    // 计算在 ZIP 中的完整路径
    // 注意: path.dirname('content.opf') 返回 '.'，此时直接用 href
    const fullPath = opfDir && opfDir !== '.' ? `${opfDir}/${href}` : href
    const entry = zipEntries.find(
      (e) => e.entryName === fullPath || e.entryName.endsWith('/' + href),
    )
    if (!entry) continue

    const htmlContent = entry.getData().toString('utf-8')

    // 提取标题和纯文本
    const { title, text } = extractHtmlContent(htmlContent, bookName)

    // 过滤掉空内容（如分页产生的空白页）和纯空白/标点内容
    const cleaned = text.trim()
    // 如果内容只包含书名（或书名+少量标点），则跳过
    const contentOnlyBookName =
      bookName &&
      cleaned.replace(/[\s\n\r\t,.;:!?，。；：！？、·…—\-_"]/g, '').length <= bookName.replace(/[\s\n\r\t,.;:!?，。；：！？、·…—\-_"]/g, '').length + 5
    if (cleaned && !contentOnlyBookName && cleaned.replace(/[\s\n\r\t,.;:!?，。；：！？、·…—\-_"]/g, '').length > 10) {
      chapters.push({
        title: title || `第${chapters.length + 1}章`,
        content: cleaned,
      })
    }
  }

  return { bookName, author, chapters, coverPath }
}

/**
 * 从 EPUB 中提取封面图片并保存到本地
 *
 * EPUB 封面通常通过两种方式指定：
 * 1. OPF 的 metadata 中有 <meta name="cover" content="cover-image-id"/>
 * 2. manifest 中 properties="cover-image" 的项
 */
async function extractEpubCover(
  zip: AdmZip,
  zipEntries: any[],
  opfParsed: any,
  opfDir: string,
): Promise<string | null> {
  const manifest = opfParsed.package?.manifest?.[0]
  if (!manifest?.item) return null

  // 方式1: 查找 manifest 中 properties="cover-image" 的项
  let coverId: string | null = null
  for (const item of manifest.item) {
    const props = item.$.properties || ''
    if (props.includes('cover-image')) {
      coverId = item.$.id
      break
    }
  }

  // 方式2: 从 metadata 中查找 <meta name="cover" content="..."/>
  if (!coverId) {
    const metadata = opfParsed.package?.metadata?.[0] || {}
    for (const key of Object.keys(metadata)) {
      if (key === 'meta' || key.endsWith(':meta')) {
        const metas = Array.isArray(metadata[key]) ? metadata[key] : [metadata[key]]
        for (const meta of metas) {
          if (meta.$?.name === 'cover' && meta.$?.content) {
            coverId = meta.$.content
            break
          }
        }
      }
    }
  }

  if (!coverId) return null

  // 查找封面文件在 manifest 中的 href
  let coverHref: string | null = null
  for (const item of manifest.item) {
    if (item.$.id === coverId) {
      coverHref = item.$.href
      break
    }
  }

  if (!coverHref) return null

  // 计算在 ZIP 中的完整路径
  // 注意: path.dirname('content.opf') 返回 '.'，此时直接用 coverHref
  const fullPath = opfDir && opfDir !== '.' ? `${opfDir}/${coverHref}` : coverHref
  const entry = zipEntries.find(
    (e) => e.entryName === fullPath || e.entryName.endsWith('/' + coverHref),
  )
  if (!entry) return null

  // 读取封面图片数据
  const coverData = entry.getData()

  // 确定扩展名
  const coverExt = path.extname(coverHref).toLowerCase() || '.jpg'
  const coverFileName = `${crypto.randomUUID()}${coverExt}`
  const coverFilePath = path.join(COVERS_DIR, coverFileName)

  // 保存封面图片
  await ensureCoversDir()
  await fs.writeFile(coverFilePath, coverData)

  // 返回可访问的 URL 路径
  return `/uploads/covers/${coverFileName}`
}

/** 从 HTML 中提取标题和纯文本 */
function extractHtmlContent(html: string, bookName?: string): { title: string; text: string } {
  let title = ''

  // 提取 <h1>~<h6> 作为章节标题（优先使用）
  const hMatch = html.match(/<h([1-6])[^>]*>([^<]*)<\/h\1>/i)
  if (hMatch) {
    title = hMatch[2].trim()
  }

  // 如果没有 h 标签，尝试从 body 中第一个 <p> 之前的内容提取标题
  // （很多 epub 的章节标题以纯文本形式放在第一个段落之前）
  if (!title) {
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)
    if (bodyMatch) {
      const body = bodyMatch[1]
      // 取第一个 <p> 标签之前的内容
      const beforeFirstP = body.split(/<p[^>]*>/i)[0]
      const beforeText = beforeFirstP
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
      if (beforeText && beforeText.length > 0 && beforeText.length <= 50) {
        title = beforeText
      }
    }
  }

  // 如果仍然没有标题，尝试提取 <title>
  if (!title) {
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i)
    if (titleMatch) title = titleMatch[1].trim()
  }

  // 如果标题等于书名，则降级为无标题（后续会用章节编号）
  if (title && bookName && title === bookName) {
    title = ''
  }

  // 移除 HTML 标签，保留纯文本
  let text = html
    // 移除 <style> 和 <script> 块
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    // 移除 <h1>~<h6> 标题标签及其内容（标题已单独提取，不应出现在正文中）
    .replace(/<h[1-6][^>]*>[\s\S]*?<\/h[1-6]>/gi, '')
    // 移除 <title> 标签及其内容（书名不应出现在正文中）
    .replace(/<title[^>]*>[\s\S]*?<\/title>/gi, '')
    // 替换 <br> <p> <div> 为换行
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    // 移除所有剩余 HTML 标签
    .replace(/<[^>]+>/g, '')
    // 解码 HTML 实体
    .replace(/&nbsp;/g, ' ')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/&/g, '&')
    .replace(/"/g, '"')
    .replace(/'/g, "'")
    .replace(/&#\d+;/g, ' ')
    // 清理多余空行
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  return { title, text }
}

// ==================== 工具函数 ====================

/** 从 OPF metadata 中查找指定名称的值 */
function findMetadata(metadata: any, name: string): string | undefined {
  const dcName = `dc:${name}`
  for (const key of Object.keys(metadata)) {
    if (key === dcName || key.endsWith(`:${name}`) || key === name) {
      const val = metadata[key]
      if (Array.isArray(val) && val.length > 0) {
        // 可能是对象（带 _ 属性）或字符串
        if (typeof val[0] === 'object') {
          return val[0]._ || val[0]?.$
        }
        return String(val[0])
      }
    }
  }
  return undefined
}

/** Promise 版本的 xml2js.parseString */
function parseXmlPromise(xml: string): Promise<any> {
  const parser = new Parser()
  return new Promise((resolve, reject) => {
    parser.parseString(xml, (err: any, result: any) => {
      if (err) reject(err)
      else resolve(result)
    })
  })
}
