import {prisma} from '../lib/prisma.js'

export default async function(signal) { //signal: คือสัญญาณที่ระบบปฏิบัติการ (OS) ส่งมาบอกโปรแกรม เช่น SIGINT (เมื่อเรากด Ctrl+C) หรือ SIGTERM (เมื่อ Process ถูกสั่งหยุด)
 console.log(`\nReceived ${signal}, shutting down...`); //แจ้งเตือนที่ Console ว่า "ได้รับสัญญาณชัตดาวน์แล้วนะ"
 try {
   await prisma.$disconnect(); //prisma.$disconnect(): นี่คือส่วนที่สำคัญ ปกติเวลา Server ทำงาน มันจะเปิดการเชื่อมต่อ (Connection Pool) ค้างไว้กับ Database
   //หากเราปิดโปรแกรมไปเฉยๆ โดยไม่สั่ง Disconnect อาจทำให้เกิดการเชื่อมต่อที่ค้างอยู่ใน Database จนเต็มได้
//โค้ดส่วนนี้จึงพยายามสั่ง "วางสาย" กับ Database ให้เรียบร้อยก่อน

   console.log('Prisma disconnected.');
 } catch (err) {
   console.error('Error during disconnection:', err);
 } finally { //ไม่ว่าจะ Disconnect สำเร็จหรือเกิด Error โค้ดในบล็อกนี้จะทำงานเสมอ
    process.exit(0); }
    //process.exit(0): เป็นการสั่งให้ Node.js หยุดการทำงานของโปรแกรมอย่างเป็นทางการ
//เลข 0 หมายถึง "จบการทำงานตามปกติ (Success)"
//หากใส่เลขอื่น (เช่น 1) จะหมายถึง "จบการทำงานเนื่องจากเกิดข้อผิดพลาด (Failure)"
}


//โค้ดชุดนี้คือฟังก์ชันสำหรับการ "ปิดระบบ" 
// หน้าที่หลักของมันคือการจัดการเคลียร์ทรัพยากร (ในที่นี้คือการเชื่อมต่อฐานข้อมูล) ให้เรียบร้อยก่อนที่โปรแกรม 
// Node.js จะปิดตัวลงจริงๆ