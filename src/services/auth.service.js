import { prisma } from '../lib/prisma.js'; // เป็นตัวจัดการฐานข้อมูล เป็นตัวกลางคุยกับ Database
import bcrypt from 'bcrypt'; // สำหรับความปลอดภัยของรหัสผ่าน
import jwt from 'jsonwebtoken';// สำหรับการยืนยันตัวตน เหมือน บัตรผ่านดิจิทัลให้ User ยืนยันตัวตนในครั้งต่อๆ ไปโดยไม่ต้องล็อกอินซ้ำ
import createError from 'http-errors'; //ช่วยสร้าง Error Object ที่สวยงามและมีรหัส HTTP (401, 404, 409) ที่ชัดเจน

export const registerUser = async (data) => {
  const { username, email, password, firstName, lastName, profileImage } = data;

  const existingUser = await prisma.user.findFirst({
    where: { OR: [{ username }, { email }] }
  });
  if (existingUser) throw createError(409, "Username or Email already exists");
  //ตรวจสอบความซ้ำซ้อน: ใช้ prisma.user.findFirst เช็คว่า username หรือ email นี้มีคนใช้ไปหรือยัง 
  // ถ้ามีแล้วจะ throw 409 (Conflict) ทันที

  const hashedPassword = await bcrypt.hash(password, 10);
  //การเข้ารหัส (Hashing): สำคัญมาก! เราไม่เก็บรหัสผ่านตัวจริงลงฐานข้อมูล แต่ใช้ 
  // bcrypt.hash(password, 10) เพื่อเปลี่ยนรหัสผ่านเป็นชุดตัวอักษรที่เดาไม่ได้ (Salt round 10)

  return await prisma.user.create({ //การบันทึก: สั่ง prisma.user.create เพื่อลงข้อมูล
    data: { username, email, password: hashedPassword, firstName, lastName, profileImage: profileImage || "default_profile.png" },
    select: { id: true, username: true, email: true, firstName: true, lastName: true,bio: true, createdAt: true }
  }); //select เพื่อเลือกส่งค่ากลับไปเฉพาะที่จำเป็น (ไม่ส่ง password กลับไปที่หน้าบ้าน)
};



export const loginUser = async (username, password) => {
  const user = await prisma.user.findUnique({ where: { username: username } });
  if (!user) throw createError(401, "Invalid username or password");
  //ค้นหาผู้ใช้: หา User จาก username ถ้าไม่เจอจะตอบกลับด้วย Error 401 (Unauthorized)

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw createError(401, "Invalid email or password"); // ไม่บอกเจาะจง ว่า ชื่อผู้ใช้ผิด หรือ รหัสผ่านผิด เพื่อป้องกันไม่ให้ Hacker รู้ว่าในระบบมีชื่อผู้ใช้นี้อยู่จริงหรือไม่
  //ตรวจสอบรหัสผ่าน: ใช้ bcrypt.compare เพื่อเอา password ที่ User พิมพ์มา 
  // ไปเปรียบเทียบกับตัวที่ถูกเข้ารหัสไว้ใน DB (bcrypt จะรู้เองว่าตรงกันไหม)

  const token = jwt.sign(
    { id: user.id, username: user.username }, //การสร้าง Token (JWT) ถ้าผ่าน ระบบจะสร้าง JSON Web Token โดยฝัง id และ username ไว้ข้างใน
    process.env.JWT_SECRET, //JWT_SECRET: คือกุญแจลับที่เก็บไว้ในไฟล์ .env
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } //กำหนดอายุของ Token (ในที่นี้คือ 7 วัน)
  );

  return { token, user: { id: user.id, username: user.username, email: user.email, profileImage: user.profileImage } };
}; //ส่งทั้ง Token และข้อมูล User เบื้องต้นกลับไปเพื่อให้ Frontend เก็บไว้ใน LocalStorage



// (การดึงข้อมูลโปรไฟล์) ใช้ในหน้า "โปรไฟล์ส่วนตัว" หรือ "ดูโปรไฟล์เพื่อน"
export const getUserById = async (userId) => { //รับ userId มาเพื่อไปค้นหาในฐานข้อมูลด้วย findUnique
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { // ใช้ select เพื่อกรองข้อมูลที่อ่อนไหวออกไป
      id: true, 
      username: true, 
      email: true, 
      firstName: true, 
      lastName: true, 
      profileImage: true, 
      bio: true, 
      createdAt: true 
    }
  });
  if (!user) throw createError(404, "User not found"); //ถ้าหาไม่เจอจะส่ง Error 404 (Not Found)
  return user;
};


//(การแก้ไขข้อมูลส่วนตัว) ใช้สำหรับตอนที่ User ต้องการเปลี่ยนชื่อ, รูปโปรไฟล์ หรือเขียน Bio
export const updateUserProfile = async (userId, updateData) => {
  return await prisma.user.update({ // ส่งข้อมูลที่อัปเดตล่าสุดกลับไป เพื่อให้หน้าเว็บเปลี่ยนการแสดงผลตามข้อมูลใหม่ทันที
    where: { id: userId }, // ระบุว่าจะอัปเดตที่ User คนไหน
    data: updateData, //รับข้อมูลใหม่ที่ส่งมาจาก Controller มาอัปเดตลงไป
    select: { 
      id: true, 
      username: true, 
      email: true, 
      profileImage: true,
      bio: true, // 
      firstName: true,
      lastName: true   
    }
  });
};