import bcrypt from 'bcrypt'
import { prisma } from '../src/lib/prisma.js'

//ทำหน้าที่เป็น "Script สำหรับสร้างข้อมูลเริ่มต้น" (Database Seeding) ประโยชน์ของมันคือ
// ช่วยให้เรามีข้อมูลตัวอย่าง (Mock Data) สำหรับทดสอบระบบทันที โดยไม่ต้องเสียเวลานั่งสมัครสมาชิกเองทีละคน

const hashedPassword = () => bcrypt.hashSync('123456', 8) //bcrypt.hashSync: เป็นการเข้ารหัสรหัสผ่าน '123456' ให้เป็นข้อความที่อ่านไม่รู้เรื่อง (Hash) ก่อนเก็บลง Database เพื่อความปลอดภัย (เหมือนการทำงานจริงในระบบ Register)

const userData = [ //userData: เป็น Array ที่เก็บข้อมูลผู้ใช้ตัวอย่าง 4 คน (Andy, Bobby, Candy, Danny) พร้อมรูปโปรไฟล์จาก SVGRepo
  {
    firstName: 'Andy', lastName: 'Codecamp',username: 'Andy', password: hashedPassword(), email: 'andy@ggg.mail',
    profileImage: 'https://www.svgrepo.com/show/420364/avatar-male-man.svg'
  },
  {
    firstName: 'Bobby', lastName: 'Codecamp',username: 'Bobby', password: hashedPassword(), email: 'bobby@ggg.mail',
    profileImage: 'https://www.svgrepo.com/show/420319/actor-chaplin-comedy.svg'
  },
  {
    firstName: 'Candy', lastName: 'Codecamp',username: 'Candy', password: hashedPassword(), email: 'candy@ggg.mail',
    profileImage: 'https://www.svgrepo.com/show/420327/avatar-child-girl.svg'
  },
  {
    firstName: 'Danny', lastName: 'Codecamp',username: 'Danny', password: hashedPassword(), email: 'danny@ggg.mail',
    profileImage: 'https://www.svgrepo.com/show/420314/builder-helmet-worker.svg'
  },
]

async function main() {
  console.log('Clean table...')
  //การล้างข้อมูลเก่า (Clean Table)
//ก่อนจะเพิ่มข้อมูลใหม่เข้าไป Script นี้จะทำการล้างตารางที่มีอยู่ก่อนเพื่อป้องกันข้อมูลซ้ำซ้อนหรือติด Error:
  await prisma.$transaction([
    prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0;'),
    prisma.$executeRawUnsafe('TRUNCATE TABLE `Like`;'),
    prisma.$executeRawUnsafe('TRUNCATE TABLE `Comment`;'),
    prisma.$executeRawUnsafe('TRUNCATE TABLE `Post`;'),
    prisma.$executeRawUnsafe('TRUNCATE TABLE Follows;'),
    prisma.$executeRawUnsafe('TRUNCATE TABLE `User`;'),
    prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1;'),
  ]);
  //SET FOREIGN_KEY_CHECKS = 0: สั่งให้ฐานข้อมูล "ปิดการเช็คความสัมพันธ์" ชั่วคราว 
  // เพื่อให้เราสามารถลบข้อมูลในตารางที่มีการเชื่อมโยงกันอยู่ได้ (เช่น ลบ User แม้ว่าจะมี Post ค้างอยู่)

//TRUNCATE TABLE: เป็นคำสั่งลบข้อมูลทั้งหมดในตารางและรีเซ็ตเลข ID ให้เริ่มนับ 1 ใหม่

//$transaction: เป็นการมัดรวมคำสั่งทั้งหมดให้ทำงานทีเดียว ถ้ามีตัวไหนพัง 
// ระบบจะไม่ทำอะไรเลยเพื่อความปลอดภัยของข้อมูล

  console.log('Start seeding...')
  //การเพิ่มข้อมูล
  const createdUsers = await prisma.user.createMany({ //prisma.user.createMany: สั่งให้ Prisma นำข้อมูลจาก userData ทั้งหมดไปใส่ในตาราง User ในคำสั่งเดียว (รวดเร็วกว่าการค่อยๆ วนลูป insert ทีละคน)
    data: userData,
    skipDuplicates: true, //skipDuplicates: true: หากมีข้อมูลที่ซ้ำกัน (เช่น Email เดิม) ระบบจะข้ามไปโดยไม่หยุดทำงาน
  })
  console.log(`Created : ${createdUsers.count} users`)
}

main().then(async () => {
  await prisma.$disconnect()
}).catch(async (e) => {
  console.error(e)
  await prisma.$disconnect()
  process.exit(1)
})
//เมื่อฟังก์ชัน main() ทำงานเสร็จ (ไม่ว่าจะสำเร็จหรือล้มเหลว) ระบบจะสั่ง $disconnect() 
// เพื่อปิดการเชื่อมต่อกับ Database ให้เรียบร้อย
//หากเกิด Error จะพิมพ์ Error ออกมาแล้วสั่งปิดโปรแกรมด้วย Code 1 (เพื่อบอกระบบว่าจบงานแบบไม่ปกติ)




