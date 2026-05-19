import "dotenv/config"; //ทำหน้าที่โหลดค่าตัวแปรสภาพแวดล้อมจากไฟล์ .env (เช่น User, Password ของฐานข้อมูล) เข้ามาในระบบเพื่อให้ process.env เรียกใช้งานได้
import { PrismaMariaDb } from "@prisma/adapter-mariadb"; //ตัวช่วยจัดการการเชื่อมต่อ (Adapter) เฉพาะสำหรับ MariaDB
import { PrismaClient } from "../generated/prisma/client.js"; //ตัวหลักของ Prisma ที่เราจะใช้เขียนคำสั่งจัดการข้อมูล (เช่น prisma.user.findMany())

// const adapter = new PrismaMariaDb({
//  host: process.env.DATABASE_HOST,
//  user: process.env.DATABASE_USER,
//  password: process.env.DATABASE_PASSWORD,
//  database: process.env.DATABASE_NAME,
//  connectionLimit: 5, //เป็นการจำกัดว่าให้เปิดท่อเชื่อมต่อค้างไว้สูงสุดได้ 5 ท่อ พร้อมกัน ช่วยป้องกันไม่ให้แอปพลิเคชันแย่งทรัพยากรฐานข้อมูลจนเกินไปจนระบบล่ม
// });

const databaseUrl = new URL(process.env.DATABASE_URL);

const adapter = new PrismaMariaDb({
    host: databaseUrl.hostname,
    port: parseInt(databaseUrl.port) || 3306,
    user: decodeURIComponent(databaseUrl.username),
    password: decodeURIComponent(databaseUrl.password),
    database: databaseUrl.pathname.slice(1),
    connectionLimit: 20
})
const prisma = new PrismaClient({ adapter });

export { prisma };