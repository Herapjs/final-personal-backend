import express from 'express';  //Framework หลักที่ใช้สร้างเว็บเซิร์ฟเวอร์
import cors from 'cors'; //อนุญาตให้ Frontend (เช่น React ที่รันคนละ Port) สามารถส่ง Request มาหา Backend นี้ได้ ถ้าไม่มีตัวนี้ Browser จะบล็อกการเชื่อมต่อ
import authRoute from './routes/auth.route.js'; // ไฟล์แยกที่เก็บ Logic ของแต่ละฟีเจอร์เอาไว้ เพื่อไม่ให้ไฟล์นี้ยาวเกินไป
import postRoute from './routes/post.route.js';
import errorMiddleware from './middlewares/error.middleware.js'; // ฟังก์ชันที่จะทำงานเมื่อเกิดข้อผิดพลาด หรือเมื่อหา Route ไม่เจอ
import notFoundMiddleware from './middlewares/notFound.middleware.js';

const app = express(); 

// --- 1. Global Middlewares ---
app.use(cors());
app.use(express.json()); // แปลงข้อมูลที่ส่งมาเป็น JSON ให้กลายเป็น Object ใน JavaScript (ทำให้เราใช้ req.body ได้)

// ใช้การส่งข้อมูลผ่าน Form (เช่น การอัปโหลดรูปภาพพร้อมกับข้อความ) มันจะช่วยแกะข้อมูล text ที่แนบมากับฟอร์มได้
app.use(express.urlencoded({ extended: false }));



// --- 2. Static Files (สำหรับการดูรูปโปรไฟล์และรูปโพสต์) ---
// เวลาเรียกใช้ใน Frontend จะเป็น http://localhost:8899/uploads/filename.jpg
// ปกติ Node.js จะไม่ยอมให้ใครเข้าถึงไฟล์ในเครื่องได้โดยตรง แต่คำสั่งนี้คือการ "เปิดโฟลเดอร์ให้คนภายนอกเข้าดู"

// Path ตัวหน้า (/uploads): คือ URL ที่ใช้เรียก (เช่น http://localhost:8899/uploads/mycat.jpg)
// Path ตัวหลัง (public/uploads): คือที่อยู่จริงๆ ของโฟลเดอร์ในเครื่องเซิร์ฟเวอร์
app.use('/uploads', express.static('public/uploads')); 



// --- 3. API Routes ---
app.use('/api/auth', authRoute); // ทุกอย่างที่เกี่ยวกับการสมัครสมาชิก, ล็อกอิน, ข้อมูลส่วนตัว จะวิ่งไปที่ authRoute
app.use('/api/posts', postRoute); // ทุกอย่างที่เกี่ยวกับการโพสต์รูปสัตว์, การกด Like, การคอมเมนต์ จะวิ่งไปที่ postRoute

//ระบบ Comment และ Like ถูกรวมอยู่ใน postRoute 
 // (router.post('/like', ...) และ router.post('/comment', ...))


// --- 4. Error Handling Middlewares ---
// ต้องวางไว้หลัง Route ทั้งหมด
app.use(notFoundMiddleware); // ถ้า User พิมพ์ URL มั่วมา (เช่น /api/banana) ซึ่งไม่มีในระบบ ตัวนี้จะทำงานและส่งคำตอบกลับไปว่า "404 Not Found"
app.use(errorMiddleware); // เป็นด่านสุดท้าย ถ้าโค้ดส่วนไหนก็ตามในแอปเกิดพัง (Crash/Throw Error) ตัวนี้จะดักจับไว้ไม่ให้เซิร์ฟเวอร์ค้าง และส่งข้อความ Error กลับไปบอก Frontend อย่างสุภาพ

export default app;

// เมื่อ Frontend ส่งข้อมูลมา (เช่น ส่งรูปแมว):

//ผ่าน CORS (อนุญาตไหม?)

//ผ่าน JSON/Urlencoded (ถอดรหัสข้อมูลออกมาเป็น Object)

//วิ่งไปหา Route ที่ตรงกัน (เช่น /api/posts)

//ถ้าทำงานสำเร็จ -> ส่งข้อมูลกลับ

//ถ้าหาไม่เจอ -> วิ่งไปหา NotFound

//ถ้าเกิด Error ระหว่างทาง -> วิ่งไปหา ErrorMiddleware

//ท้ายที่สุดไฟล์นี้จะถูก export default app; ไปให้ไฟล์ server.js เพื่อสั่ง app.listen เริ่มเดินเครื่อง