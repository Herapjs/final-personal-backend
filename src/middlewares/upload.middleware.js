import multer from 'multer'; //เครื่องมือหลักที่ใช้จัดการข้อมูลแบบ multipart/form-data (ซึ่งใช้ส่งไฟล์จากหน้าบ้าน)
import path from 'path'; // ใช้จัดการเกี่ยวกับเส้นทางไฟล์และนามสกุลไฟล์ (เช่น .jpg, .png)
import fs from 'fs'; //(File System) ใช้สั่งงานตัวจัดการไฟล์ในเครื่อง เช่น การสร้างโฟลเดอร์

// 1. กำหนดที่เก็บไฟล์ (Storage)
const storage = multer.diskStorage({
  destination: (req, file, cb) => { //destination: กำหนดให้เก็บไฟล์ไว้ที่ public/uploads
    const uploadDir = 'public/uploads';
    
    // ตรวจสอบว่ามีโฟลเดอร์หรือยัง ถ้าไม่มีให้สร้างใหม่
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true }); //fs.mkdirSync: หากยังไม่มีโฟลเดอร์นี้ ระบบจะสร้างให้โดยอัตโนมัติ (คล้ายการสร้างกระเป๋าไว้รอรับของ)
    }
    
    cb(null, uploadDir); // ส่งค่าโฟลเดอร์กลับไปให้ Multer
  },
  filename: (req, file, cb) => {
    // สร้างชื่อไฟล์แบบไม่ซ้ำ: Timestamp + เลขสุ่ม + นามสกุลเดิม
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9); //uniqueSuffix: ป้องกันปัญหา "ชื่อไฟล์ซ้ำ" (เช่น ผู้ใช้สองคนอัปโหลดรูปชื่อ cat.jpg พร้อมกัน) โดยการเอาเวลาปัจจุบัน (Timestamp) มาต่อด้วยเลขสุ่ม
    cb(null, uniqueSuffix + path.extname(file.originalname)); //path.extname: ดึงนามสกุลไฟล์เดิมมาใช้ เพื่อให้ไฟล์ที่เซฟลงเครื่องยังคงเป็นรูปภาพที่เปิดดูได้
  }
});



// 2. ตัวกรองไฟล์ (File Filter) - รับเฉพาะรูปภาพเท่านั้น
const fileFilter = (req, file, cb) => {
  //รับเฉพาะไฟล์ที่มีประเภทขึ้นต้นด้วย 'image/'
  if (file.mimetype.startsWith('image/')) { //mimetype.startsWith('image/'): ป้องกันไม่ให้ผู้ใช้แอบอัปโหลดไฟล์อันตราย (เช่น .exe หรือ .js) เข้ามาใน Server โดยจะรับเฉพาะไฟล์รูปภาพเท่านั้น
    cb(null, true); // อนุญาตให้ผ่าน
  } else {
    cb(new Error('Only images are allowed!'), false);// ปฏิเสธและส่ง Error
  }
};



// 3. สร้าง Middleware
const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // จำกัดขนาดไฟล์ไม่เกิน 5MB limits: กำหนดขนาดไฟล์สูงสุดที่รับได้ ในที่นี้คือ 5MB เพื่อประหยัดพื้นที่ Server และป้องกันการโดนยิงไฟล์ขนาดใหญ่ใส่ระบบ
}); //5 * 1024 * 1024: คือการคำนวณจาก Byte เป็น Megabyte ($5 \times 1024 \times 1024$ bytes)

export default upload;