import "dotenv/config"; //ทำหน้าที่โหลดค่าตัวแปรสภาพแวดล้อมจากไฟล์ .env (เช่น User, Password ของฐานข้อมูล) เข้ามาในระบบเพื่อให้ process.env เรียกใช้งานได้
import { PrismaMariaDb } from "@prisma/adapter-mariadb"; //ตัวช่วยจัดการการเชื่อมต่อ (Adapter) เฉพาะสำหรับ MariaDB
import { PrismaClient } from "../generated/prisma/client.js"; //ตัวหลักของ Prisma ที่เราจะใช้เขียนคำสั่งจัดการข้อมูล (เช่น prisma.user.findMany())

const adapter = new PrismaMariaDb({
 host: process.env.DATABASE_HOST,
 user: process.env.DATABASE_USER,
 password: process.env.DATABASE_PASSWORD,
 database: process.env.DATABASE_NAME,
 connectionLimit: 5, //เป็นการจำกัดว่าให้เปิดท่อเชื่อมต่อค้างไว้สูงสุดได้ 5 ท่อ พร้อมกัน ช่วยป้องกันไม่ให้แอปพลิเคชันแย่งทรัพยากรฐานข้อมูลจนเกินไปจนระบบล่ม
});
const prisma = new PrismaClient({ adapter });
//เป็นการสร้างตัวแปร prisma ขึ้นมาโดยนำเอาการตั้งค่าจาก adapter เมื่อสักครู่มาใส่ไว้
//หลังจากบรรทัดนี้ไป เราสามารถใช้ตัวแปร prisma ไปดึงข้อมูลหรือแก้ไขข้อมูลในฐานข้อมูลได้ทันที

// prisma.$queryRawUnsafe('show tables').then(console.log)
//บรรทัดนี้มีไว้สำหรับทดสอบครับ ถ้าเอา // ออก มันจะรันคำสั่ง SQL ดิบเพื่อดูรายชื่อตารางทั้งหมดใน 
// Database แล้วพิมพ์ออกมาที่หน้าจอ (Console) เพื่อเช็คว่าเชื่อมต่อสำเร็จหรือไม่

export { prisma };