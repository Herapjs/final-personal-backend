import jwt from 'jsonwebtoken';
import createError from 'http-errors';

export const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization; //req.headers.authorization: ระบบจะไปอ่านค่าใน Header ที่ชื่อ Authorization
    if (!authHeader?.startsWith('Bearer ')) { //startsWith('Bearer '): ตามมาตรฐานการส่ง Token เรามักจะขึ้นต้นด้วยคำว่า Bearer  ตามด้วยรหัส Token 
      throw createError(401, "Please login to continue"); //หากไม่มี Header นี้ หรือส่งมาผิดรูปแบบ ระบบจะโยน Error 401 (Unauthorized) ทันที เพื่อบอกว่า "กรุณาเข้าสู่ระบบก่อน"
    }

    const token = authHeader.split(' ')[1]; //split(' ')[1]: เป็นการตัดคำว่า Bearer ออก เพื่อเอาเฉพาะตัวรหัส Token จริงๆ ออกมา
    const decoded = jwt.verify(token, process.env.JWT_SECRET); //jwt.verify: นำ Token ที่ได้ไปตรวจสอบกับ JWT_SECRET (กุญแจลับที่เก็บไว้ในไฟล์ .env)
    //ถ้า Token ถูกต้องและยังไม่หมดอายุ: จะได้ข้อมูลที่ฝังไว้ใน Token ออกมา (เช่น id, username)
//ถ้า Token ปลอมหรือหมดอายุ: ฟังก์ชันนี้จะโยน Error ออกมาทันที

    // เก็บข้อมูล user ไว้ใน request เพื่อให้ controller อื่นๆ ใช้งานต่อได้
    req.user = decoded; //req.user = decoded: เมื่อตรวจสอบผ่านแล้ว ระบบจะเอาข้อมูลผู้ใช้ที่ถอดรหัสได้ไปฝากไว้ในตัวแปร req.user
    next();
  } catch (error) {
    next(createError(401, "Invalid or expired token"));
  }
};