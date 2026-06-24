/**
 * 将已有的书同步到用户书架
 * 用法: node scripts/sync-bookshelf.mjs <userId>
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const userId = process.argv[2]
  if (!userId) {
    console.error('请提供用户ID: node scripts/sync-bookshelf.mjs <userId>')
    process.exit(1)
  }

  // 查询所有还没有加入该用户书架的书
  const books = await prisma.book.findMany({
    where: {
      NOT: {
        bookshelves: {
          some: { userId },
        },
      },
    },
  })

  if (books.length === 0) {
    console.log('所有书已在该用户的书架中，无需同步')
    return
  }

  // 批量加入书架
  const result = await prisma.bookshelf.createMany({
    data: books.map((book) => ({
      userId,
      bookId: book.id,
    })),
  })

  console.log(`✅ 成功将 ${result.count} 本书同步到用户 ${userId} 的书架`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
