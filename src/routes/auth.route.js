import express from 'express'
import { getMe, login, register, updateMe } from '../controller/auth.controller.js'
import { authenticate } from '../middlewares/authenticate.middleware.js'
import  upload  from '../middlewares/upload.middleware.js'; 


const authRoute = express.Router()

authRoute.post('/register', register)
authRoute.post('/login',login)
authRoute.get('/users/me', authenticate, getMe)
authRoute.patch('/update-profile', authenticate, upload.single('profileImage'), updateMe);
//ใช้ upload.single ใน Route นี้ช่วยให้ระบบรองรับการอัปโหลดไฟล์ (Multipart/form-data) ได้ทันที สำหรับหน้าแก้ไขโปรไฟล์ที่มีทั้งข้อความและรูปภาพ
export default authRoute
