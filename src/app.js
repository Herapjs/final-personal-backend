import express from 'express';  //Framework หลักที่ใช้สร้างเว็บเซิร์ฟเวอร์
import cors from 'cors'; //อนุญาตให้ Frontend (เช่น React ที่รันคนละ Port) สามารถส่ง Request มาหา Backend นี้ได้ ถ้าไม่มีตัวนี้ Browser จะบล็อกการเชื่อมต่อ
import authRoute from './routes/auth.route.js'; // ไฟล์แยกที่เก็บ Logic ของแต่ละฟีเจอร์เอาไว้ เพื่อไม่ให้ไฟล์นี้ยาวเกินไป
import postRoute from './routes/post.route.js';
import errorMiddleware from './middlewares/error.middleware.js'; // ฟังก์ชันที่จะทำงานเมื่อเกิดข้อผิดพลาด หรือเมื่อหา Route ไม่เจอ
import notFoundMiddleware from './middlewares/notFound.middleware.js';

const app = express(); 


// app.use(cors());

const cors = require('cors');

app.use(cors({
  origin: 'https://final-personal-frontend.vercel.app', 
  credentials: true,                                    
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json()); 
app.use(express.urlencoded({ extended: false }));




app.use('/uploads', express.static('public/uploads')); 




app.use('/api/auth', authRoute); 
app.use('/api/posts', postRoute); 
app.use(notFoundMiddleware); 
app.use(errorMiddleware); 

export default app;

