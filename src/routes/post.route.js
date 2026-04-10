import express from 'express';
import * as postController from '../controller/post.controller.js';
import { authenticate } from '../middlewares/authenticate.middleware.js';
import upload from '../middlewares/upload.middleware.js'; // ตรวจสอบว่า export แบบ default หรือ named

const router = express.Router();

//ทุกตัวที่อยู่ต่ำกว่าบรรทัดนี้ลงไป ต้อง Login เท่านั้น ถึงจะใช้งานได้ โดย Middleware นี้จะเช็ค 
// Token และเอาข้อมูลผู้ใช้ไปใส่ไว้ใน req.user ให้ Controller เรียกใช้
router.use(authenticate);


// 1. ดึงโพสต์ทั้งหมด (Home Feed)
router.get('/', postController.getAllPosts);

// 2. สร้างโพสต์ใหม่ (รองรับ RESCUE, ADOPT, HAPPY ตาม Enum ใน Prisma)
// ต้องวาง upload.single('image') ไว้หน้า Controller เพื่อรับไฟล์ภาพ
//upload.single('image'): เป็น Middleware (Multer) ที่ทำหน้าที่แงะไฟล์รูปภาพจากฟอร์มมาเก็บลงเครื่องก่อน แล้วค่อยส่งข้อมูลตัวอักษรไปให้ createPost
router.post('/create', upload.single('image'), postController.createPost);

// 3. ดึงกิจกรรมของตนเอง 
router.get('/my-activity', postController.getMyActivity);

// 4. ระบบจองเคสช่วยเหลือ 
router.patch('/reserve', postController.reserveCase);
router.patch('/unreserve', postController.cancelReserveCase);

// 5. ระบบ Like (Toggle)
router.post('/like', postController.likePost);

// 6. Comment Routes
router.post('/comment', upload.single('image'), postController.addComment); //เขียนคอมเมนต์ (รองรับการแนบรูปภาพด้วย upload.single('image'))
router.get('/:postId/comments', postController.getComments); //ดึงรายการคอมเมนต์ทั้งหมดของโพสต์นั้นมาโชว์
router.delete('/comment/:commentId', postController.deleteComment); //ลบคอมเมนต์ (เช็คสิทธิ์เจ้าของคอมเมนต์ก่อนลบ)

// 7. ลบโพสต์ 
router.delete('/:id', postController.deletePost);

//  8. แก้ไขโพสต์
router.patch('/:id', postController.updatePost);

// สำหรับคนที่จะมารับเลี้ยงกด
router.post('/adoption/apply', postController.applyAdoption); 

// สำหรับเจ้าของโพสต์กดเลือกคนรับเลี้ยง
router.patch('/adoption/confirm', postController.approveAdoption);

// เจ้าของโพสต์ดูรายชื่อคนสมัครได้
router.get('/adoption/requests/:postId', postController.getAdoptionRequests);

//router.get('/my-activity', ...) ถูกวางไว้ ก่อน router.delete('/:id', ...)
//เพราะถ้าเอา /:id ไว้ก่อน แล้วเราเรียก /my-activity ตัว Express จะเข้าใจผิดว่าคำว่า my-activity คือ ID ของโพสต์ ทำให้โปรแกรมพัง

export default router;