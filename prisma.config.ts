import { defineConfig } from 'prisma/config';

// 手动加载 .env 文件
import { config } from 'dotenv';
config();

export default defineConfig({
  schema: './prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL || 'mysql://root:12345678@localhost:3307/novel_reader?socket=/tmp/mysql.sock',
  },
});
