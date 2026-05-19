import "dotenv/config"; //โหลดค่าตัวแปรสภาพแวดล้อมจากไฟล์ .env
import { PrismaMariaDb } from "@prisma/adapter-mariadb"; //Adapter สำหรับ MariaDB
import { PrismaClient } from "../generated/prisma/client.js"; //Prisma client ที่สร้างจาก schema

// Parse DATABASE_URL and configure adapter with higher limits/timeouts
const databaseUrl = new URL(process.env.DATABASE_URL);

const adapter = new PrismaMariaDb({
        host: databaseUrl.hostname,
        port: parseInt(databaseUrl.port) || 3306,
        user: decodeURIComponent(databaseUrl.username),
        password: decodeURIComponent(databaseUrl.password),
        database: databaseUrl.pathname.slice(1),
        connectionLimit: 20,
        // increase connect timeout to give the socket more time to create on slow networks
        connectTimeout: 10000
});

// Use a global singleton in Node (prevents exhausting DB connections during dev/hot-reload)
let prisma;
if (globalThis.prismaClient) {
    prisma = globalThis.prismaClient;
} else {
    prisma = new PrismaClient({ adapter });
    globalThis.prismaClient = prisma;
}

export { prisma };