import { ZodError } from "zod"

export default function (err, req, res, next) {
  //จัดการเรื่อง Token หมดอายุ (Token Expired)
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Token Expired',
      message: 'Your session has expired. Please log in again.'
    });
  }
  //สาเหตุ: เกิดขึ้นเมื่อผู้ใช้ส่ง JWT Token ที่หมดอายุมา (เช่น ล็อกอินทิ้งไว้นานเกินไป)
//การตอบกลับ: ส่งสถานะ 401 (Unauthorized) เพื่อบอกหน้าบ้านให้ทำการ Log out ผู้ใช้โดยอัตโนมัติ 
// หรือเด้งไปหน้า Login ใหม่



//จัดการเรื่อง Token ปลอมหรือผิดรูปแบบ (Invalid Token)
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Invalid Token',
      message: 'The provided token is invalid or malformed.'
    });
  }
  //สาเหตุ: เกิดจาก Token ถูกแก้ไข, แอบอ้าง หรือส่งมาในรูปแบบที่ถอดรหัสไม่ได้
//การตอบกลับ: ส่งสถานะ 401 และแจ้งว่า Token นี้ใช้งานไม่ได้ เพื่อความปลอดภัยของระบบ


//จัดการเรื่องข้อมูลไม่ถูกต้องตามโครงสร้าง (Validation Error)
  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      errors: err.flatten().fieldErrors
      // errors: err.issues.map(err => err.message)
    })
  }
  //สาเหตุ: เกิดจากไลบรารี Zod (ตัวเช็ค Schema ข้อมูล) พบว่าข้อมูลที่ส่งมาไม่ตรงตามที่กำหนด เช่น 
// ลืมกรอกอีเมล หรือรหัสผ่านสั้นเกินไป
//err.flatten().fieldErrors: เป็นคำสั่งที่ฉลาดมากครับ มันจะสรุป Error แยกตามรายชื่อ Field เลย (เช่น 
// { email: ["Invalid email"], password: ["Too short"] }) ทำให้หน้าบ้านนำไปโชว์ใต้ช่องกรอกข้อมูลได้ทันที
//การตอบกลับ: ส่งสถานะ 400 (Bad Request)

  console.error(err)
  res.status(err.status || 500)
  res.json({
    status: err.status || 500,
    message: err.message
  })
}
