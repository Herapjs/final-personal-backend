export default function (req, res, next) {
  res.status(404).json({
    message : 'Path not found'
  })
}

//res.status(404): เป็นการกำหนด HTTP Status Code ให้เป็น 404 เพื่อบอก Browser 
// หรือหน้าบ้านว่า "หาทรัพยากรที่ร้องขอไม่พบ"
//.json({ message : 'Path not found' }): ส่งข้อมูลกลับไปในรูปแบบ JSON เพื่อให้
// นำไปแสดงผลแจ้งเตือนผู้ใช้ได้อย่างสวยงาม แทนที่จะปล่อยให้หน้าเว็บขาวโพลนหรือขึ้น Error ของระบบ

//Middleware ตัวนี้ ต้องวางไว้ที่ไฟล์หลัก (เช่น app.js หรือ index.js) และต้องวางไว้ 
//หลังจากการเรียกใช้ Router ทั้งหมด แต่ต้องก่อนตัวจัดการ Error (Error Middleware)"