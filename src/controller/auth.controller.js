import * as authService from '../services/auth.service.js';
import createError from 'http-errors';

export const register = async (req, res, next) => {
  try {
    const { username, email, password, firstName, lastName } = req.body; //คือการดึงข้อมูลที่ผู้ใช้พิมพ์ส่งมาจากหน้าฟอร์มสมัครสมาชิก (เช่น ชื่อผู้ใช้, อีเมล, รหัสผ่าน)
    if (!username || !email || !password || !firstName || !lastName) {
      throw createError(400, "All fields are required");
    }

    const newUser = await authService.registerUser(req.body); //ส่งข้อมูลไปให้ authService.registerUser ทำหน้าที่แทน (เช่น การเข้ารหัสผ่าน หรือการตรวจสอบอีเมลซ้ำ)
    res.status(201).json({ message: "User registered successfully", user: newUser });
  } catch (error) {
    next(error);
  }
};



export const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) throw createError(400, "Username and password are required");

    const { token, user } = await authService.loginUser(username, password); //Controller จะไม่จัดการเรื่องการเช็คพาสเวิร์ดหรือสร้าง Token เอง แต่จะส่งหน้าที่นี้ไปให้ authService.loginUser
    res.status(200).json({ message: "Login successful", accessToken: token, user });
  } catch (error) {
    next(error);
  }
};



export const getMe = async (req, res, next) => {
  try {
    const user = await authService.getUserById(req.user.id);
    res.status(200).json({ user });
  } catch (error) {
    next(error);
  }
};


export const updateMe = async (req, res, next) => {
  try {
    const updateData = {}; //การเตรียมข้อมูลอัปเดต
    
    // 1. ตรวจสอบรูปภาพ
    if (req.file) {
      updateData.profileImage = `/uploads/${req.file.filename}`;
    }// หาก User มีการอัปโหลดไฟล์ใหม่เข้ามา ระบบจะจัดเก็บ Path ของรูปภาพนั้นลงใน updateData.profileImage


    // 2. ดึงค่าจาก req.body (ชื่อ, bio, ฯลฯ)
    // ใช้ Object.assign หรือดึงทีละตัวเพื่อให้มั่นใจว่าข้อมูลเข้าครบ
    const { username, bio, firstName, lastName } = req.body;

    if (username) updateData.username = username;
    if (typeof bio !== 'undefined') {updateData.bio = bio}; // ใช้ undefined เพื่อให้ส่งค่าว่าง "" ไปลบ bio เดิมได้
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;

    // ตรวจสอบว่ามีข้อมูลส่งมาอัปเดตไหม หาก User กดปุ่ม Save โดยที่ไม่ได้เปลี่ยนข้อมูลอะไรเลย (Object updateData ว่างเปล่า) ระบบจะโยน Error 400 ออกไปทันที เพื่อไม่ให้ไปเสียเวลาเรียกใช้ Database โดยไม่จำเป็น
    if (Object.keys(updateData).length === 0) {
      throw createError(400, "No data provided for update");
    }

    const updatedUser = await authService.updateUserProfile(req.user.id, updateData); //ส่งไอดีของผู้ใช้ที่ได้จาก Token (req.user.id) และก้อนข้อมูลที่คัดกรองแล้วไปอัปเดตในฐานข้อมูล
    
    res.status(200).json({ 
      message: "Profile updated successfully", 
      user: updatedUser 
    });
  } catch (error) {
    // ถ้า Prisma ฟ้องว่า Username ซ้ำ (Unique constraint)
    if (error.code === 'P2002') {
      return next(createError(409, "Username already exists")); //ในกรณีนี้คือ User พยายามเปลี่ยน username ไปเป็นชื่อที่มีคนอื่นใช้ไปแล้ว ระบบจึงดัก Error นี้และส่ง 409 Conflict กลับไปบอกผู้ใช้ว่า "ชื่อนี้มีคนใช้แล้วนะ"
    }
    next(error);
  }
};