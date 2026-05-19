import dotenv from "dotenv"; // ทำหน้าที่โหลดค่ากำหนดต่างๆ จากไฟล์ .env เข้าไปที่ process.env เพื่อให้สามารถเรียกใช้ค่าความลับหรือการตั้งค่าต่างๆ (เช่น Database URL, API Key) ได้โดยไม่ต้องเขียนลงในโค้ดโดยตรง
import app from "./app.js";  // คือตัว Instance ของ Express (หรือ Framework อื่น) ที่ตั้งค่า Routes และ Middleware ไว้ในไฟล์ app.js
import shutdownUtil from "./utils/shutdown.util.js"; // เป็นฟังก์ชันที่เขียนแยกไว้เพื่อจัดการการปิด Server เมื่อเกิดเหตุการณ์บางอย่าง

dotenv.config()

const PORT = process.env.PORT || 8000; // พยายามอ่านค่า PORT จากไฟล์ .env ก่อน แต่ถ้าไม่ได้กำหนดไว้ (เช่น ในเครื่อง Local) จะใช้ค่า 8000 เป็นค่าเริ่มต้น (Default)




process.on('SIGINT', () => shutdownUtil('SIGINT'));   // จะเกิดขึ้นเมื่อกด Ctrl+C ที่ Terminal เพื่อหยุดการทำงาน
process.on('SIGTERM', () => shutdownUtil('SIGTERM')); // เป็นสัญญาณที่ส่งมาจากระบบปฏิบัติการ หรือจาก Docker/Kubernetes เพื่อบอกให้โปรแกรม "ปิดตัวลงได้แล้ว"
     



process.on("uncaughtException", ()=>  shutdownUtil('uncaughtException'))  // ใช้ดักจับ Error ของ JavaScript ที่เกิดขึ้นแต่ไม่มีการเขียน try-catch ครอบไว้
process.on("unhandledRejection", ()=> shutdownUtil('unhandledRejection')) // ใช้ดักจับกรณีที่ Promise ถูก Reject แต่ไม่มีการใช้ .catch() หรือ await ในบล็อกที่เหมาะสม

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend server is running on port ${PORT}`);
});

