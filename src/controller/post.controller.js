import * as postService from "../services/post.service.js";
import createError from "http-errors";

/**
 * 1. สร้างโพสต์ใหม่ (RESCUE, ADOPT, HAPPY)
 */
export const createPost = async (req, res, next) => {
  try {
    const { message, type, urgentLevel, location, postType } = req.body; //รับข้อมูลรายละเอียดโพสต์จาก User
    const userId = req.user.id; //ดึง ID ของผู้โพสต์จาก Token (ที่ผ่าน Middleware ตรวจสอบสิทธิ์มาแล้ว)

    // ตรวจสอบ Path รูปภาพ (multer)
    const imagePath = req.file ? `/uploads/${req.file.filename}` : null; //req.file: ตรวจสอบว่ามีการอัปโหลดรูปภาพผ่าน Multer หรือไม่ ถ้ามีจะเก็บ Path ของรูปไว้ใน imagePath แต่ถ้าไม่มีจะให้ค่าเป็น null

    const validPostTypes = ["RESCUE", "ADOPT", "HAPPY"]; //ระบบทำการตรวจสอบว่า postType ที่ส่งมา ตรงกับที่ระบบอนุญาตหรือไม่
    const finalPostType = validPostTypes.includes(postType) ? postType : "RESCUE"; //หาก User ไม่ส่งมา หรือส่งค่าที่ไม่ถูกต้องมา ระบบจะกำหนดให้เป็น "RESCUE" โดยอัตโนมัติเพื่อป้องกัน Error ในฐานข้อมูล

    const postData = { //ทำการรวบรวมข้อมูลทั้งหมดให้อยู่ในรูปของ Object postData เพื่อให้ง่ายต่อการส่งต่อไปยัง Service Layer
      message,
      image: imagePath,
      postType: finalPostType,
      details: {
        animalType: type || "OTHER",
        urgentLevel: urgentLevel || "LOW",
        location: location || "",
      },
    };

    const post = await postService.createPostWithCase(userId, postData); //ส่งข้อมูลไปให้ Service Layer จัดการบันทึกลง Database (ซึ่งจะไปจัดการแยกตาราง Post, DogCase, หรือ CatCase ให้เอง)

    res.status(201).json({
      message: "สร้างโพสต์สำเร็จ",
      post
    });
  } catch (error) {
    console.error("CreatePost Error: ", error);
    next(error);
  }
};




/**
 * 2. ดึงโพสต์ทั้งหมด 
 *  ใช้ postService.fetchAllPosts เพื่อให้ได้ข้อมูล isLiked และ isBooked
 */
export const getAllPosts = async (req, res, next) => {
  try {
    const currentUserId = req.user?.id; // ดึง ID จาก Token ใช้ ?. เพื่อดึง ID ของผู้ใช้ที่ล็อกอินอยู่ (ถ้ามี) เพื่อส่งไปเช็คในฐานข้อมูลว่า "โพสต์นี้เราเคยกดไลก์หรือยัง?" หรือ "เราเคยส่งคำขอรับเลี้ยงหรือยัง?" เพื่อให้หน้าจอแสดงสถานะปุ่มสีแดงหรือสีเทาได้ถูกต้อง
    const { type } = req.query; // รับ Filter รับค่าตัวแปรจาก URL (เช่น ?type=RESCUE) เพื่อนำไปใช้กรองหมวดหมู่โพสต์ที่ต้องการดู

    const posts = await postService.fetchAllPosts(type, currentUserId); //ส่งต่อ type (ตัวกรอง) และ currentUserId (ตัวตนผู้เข้าชม) ไปให้ postService

    res.status(200).json({ 
      success: true,
      data: posts 
    });
  } catch (err) {
    console.error("GetAllPosts Error: ", err);
    next(err);
  }
};




/**
 * 3. ระบบจองเคส (Reserve Case)
 *  ไม่ต้องส่ง caseType มาจากหน้าบ้าน เพราะ Service จะเช็คเองจาก postId
 */
export const reserveCase = async (req, res, next) => {
  try {
    const { postId } = req.body; //รับไอดีของโพสต์ที่อาสาสมัครกดปุ่ม "ช่วยเหลือ" มาจากหน้าบ้าน 
    const helperId = req.user.id; //ดึงไอดีของอาสาสมัครจาก Token (ที่ได้จากการ Login) เพื่อระบุตัวตนว่า ใครเป็นคนอาสาช่วยเคสนี้

    if (!postId) {
      throw createError(400, "Post ID is required"); //ตรวจสอบว่ามีการส่งไอดีโพสต์มาจริงหรือไม่ หากไม่มี (เช่น ข้อมูลตกหล่น) ระบบจะหยุดทำงานทันทีและส่ง Error 400 (Bad Request) กลับไป เพื่อไม่ให้ไปรบกวนการทำงานของฐานข้อมูล
    }

    const updatedCase = await postService.updateCaseReservation(postId, helperId); //Controller จะไม่เข้าไปเปลี่ยนสถานะใน Database เอง แต่จะส่งหน้าที่ให้ postService.updateCaseReservation ไปจัดการต่อ
     //สิ่งที่ Service ทำ (เบื้องหลัง)
//ตรวจสอบว่าเคสนี้มีคนอื่นจองไปก่อนหรือยัง 
//เปลี่ยนสถานะจาก PENDING เป็น RESERVED
//บันทึกชื่ออาสาสมัครลงในเคสนั้นๆ

    res.status(200).json({ 
      message: "รับเคสช่วยเหลือสำเร็จ! กรุณาเตรียมตัวเข้าช่วยเหลือ", 
      updatedCase 
    });
  } catch (error) {
    next(error);
  }
};



//การยกเลิกการจองเคสช่วยเหลือ
export const cancelReserveCase = async (req, res, next) => {
  try {
    const { postId } = req.body; // รับไอดีโพสต์จากหน้าบ้าน postId: ระบุว่ากำลังจะยกเลิกการจองที่โพสต์ไหน
    const helperId = req.user.id; // // ดึงไอดีจาก Token ของคนที่ล็อกอินอยู่ มาเป็นตัวยืนยันว่า "คนที่สั่งยกเลิก คือคนเดียวกับคนที่กดจองไว้ตอนแรกใช่หรือไม่" เพื่อป้องกันไม่ให้ User คนอื่นแอบมายกเลิกงานของคนอื่น

    if (!postId) { //หากหน้าบ้านไม่ได้ส่ง postId มา (เช่น เกิดข้อผิดพลาดทางเทคนิค) ระบบจะหยุดการทำงานทันทีและแจ้ง Error 400 (Bad Request) เพื่อไม่ให้ส่งคำสั่งที่ไม่มีข้อมูลไปหาฐานข้อมูล
      throw createError(400, "Post ID is required");
    }

    const updatedCase = await postService.cancelCaseReservation(postId, helperId); //ส่งข้อมูลไปให้ postService จัดการ Logic หลังบ้านทั้งหมด 
    // ซึ่งใน Service จะทำหน้าที่
//เช็คว่าเคสนั้นเป็นของหมาหรือแมว
//เช็คว่า helperId ตรงกับเจ้าของคิวจริงไหม (ถ้าไม่ตรงจะ Error 403)
//เปลี่ยนสถานะกลับเป็น PENDING (ว่าง) และล้างชื่อ helperId ให้เป็น null

    res.status(200).json({ 
      message: "ยกเลิกการรับเคสสำเร็จ", 
      updatedCase 
    });
  } catch (error) {
    next(error);
  }
};





/**
 * 4. ดึงกิจกรรมของผู้ใช้ (Activity Tabs)
 */
export const getMyActivity = async (req, res, next) => {
  try {
    const currentUserId = req.user.id; // ดึง ID ของเราจาก Token ใช้ระบุตัวตนว่า "ฉันคือใคร" เพื่อไปดึงข้อมูลที่เกี่ยวข้องกับเราเท่านั้น
    const { tab } = req.query; // ดูว่า User กำลังเปิดแท็บไหนอยู่ (เช่น ?tab=rescues) รับค่ามาจาก URL Query เพื่อใช้ตัดสินใจว่าควรจะไปดึงข้อมูลชุดไหนมาโชว์ที่หน้าจอ

    let data; //ใช้คำสั่ง if-else เพื่อเลือกแหล่งข้อมูลตามแท็บที่ User เลือก
    if (tab === "rescues") {
      data = await postService.getRescuesByHelperId(currentUserId);
      //กรณี tab === "rescues" :
        //จะเรียกใช้ postService.getRescuesByHelperId
        //เป้าหมาย: ดึงโพสต์ของ "คนอื่น" ที่ เรา (Helper) ไปกดจองเพื่อเข้าช่วยเหลือไว้ (เช่น เคสหมาเจ็บที่เราอาสาไปรับ)
    } else {
      data = await postService.getPostsByUserId(currentUserId, currentUserId);
    }
    //กรณีอื่นๆ (Default - แท็บโพสต์ของฉัน):
//จะเรียกใช้ postService.getPostsByUserId
//เป้าหมาย: ดึงโพสต์ทั้งหมดที่ เราเป็นคนสร้างเอง (เช่น เราโพสต์หาบ้านให้แมว หรือเราโพสต์แจ้งเหตุเอง)
//มีการส่ง currentUserId ไปสองครั้ง เพื่อเช็คสิทธิ์ isOwner ให้เป็น True เสมอสำหรับโพสต์เหล่านี้

    res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
};




/**
 * 5. กด Like / Unlike (Toggle)
 */
export const likePost = async (req, res, next) => {
  try {
    const { postId } = req.body; //postId: รับไอดีของโพสต์ที่ผู้ใช้กดปุ่ม Like มาจาก Body ของ Request
    const userId = req.user.id; // userId: ดึงไอดีของผู้ใช้มาจาก req.user ซึ่งข้อมูลนี้จะถูกฝังมาโดย Authenticate Middleware (ตัวตรวจสอบ Token) ทำให้มั่นใจได้ว่าคนที่กด Like มีตัวตนจริงและล็อกอินอยู่ในระบบ
    const result = await postService.toggleLike(userId, postId); //ส่ง userId และ postId ไปให้ postService.toggleLike จัดการ
    //การทำงานเบื้องหลัง (Service)
//หากในฐานข้อมูล ยังไม่มีการกด Like จาก User นี้ในโพสต์นี้ -> ระบบจะทำการสร้างข้อมูล Like ใหม่
//หากในฐานข้อมูล มีอยู่แล้ว (กดซ้ำ) -> ระบบจะทำการลบข้อมูล Like นั้นออก

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};




/**
 * 6. เพิ่มคอมเมนท์
 */
export const addComment = async (req, res, next) => {
  try {
    const { postId, message } = req.body; //req.body: รับไอดีโพสต์และข้อความจากฟอร์มคอมเมนต์
    const userId = req.user.id; //req.user.id: ระบุตัวตนผู้คอมเมนต์จาก Token

    // ตรวจสอบว่ามีการส่งรูปมาพร้อมคอมเมนต์ไหม
    const imagePath = req.file ? `/uploads/${req.file.filename}` : null; //req.file: หากผู้ใช้เลือกแนบรูปภาพมาด้วย (ผ่าน Multer) ระบบจะเก็บเส้นทางไฟล์รูปภาพไว้ใน imagePath แต่ถ้าไม่มีจะเป็น null

    // ตรวจสอบข้อมูลเบื้องต้น
    if (!postId || (!message && !imagePath)) { //ระบบอนุญาตให้คอมเมนต์ได้ถ้ามี "ข้อความ" หรือ "รูปภาพ" อย่างใดอย่างหนึ่ง (หรือทั้งคู่)
      throw createError(400, "กรุณาระบุ Post ID และข้อความหรือรูปภาพ");
    }

    const comment = await postService.createComment( //ส่งข้อมูลทั้งหมดไปให้ postService บันทึกลงตาราง comment ในฐานข้อมูล
      userId, 
      Number(postId), //Number(postId): เป็นการทำ Type Casting เพราะข้อมูลที่ส่งมาจาก req.body มักจะเป็นตัวอักษร (String) แต่ฐานข้อมูล (Prisma) ต้องการตัวเลข การแปลงค่าตรงนี้จะช่วยป้องกัน Error "Inconsistent column type" 
      message, 
      imagePath
    ); 
    
    res.status(201).json({ message: "เพิ่มคอมเมนต์สำเร็จ", comment });
  } catch (error) {
    next(error);
  }
};



export const deleteComment = async (req, res, next) => {
  try {
    const { commentId } = req.params; //req.params: ต่างจากฟังก์ชันก่อนหน้าที่ใช้ req.body เพราะการลบมักจะส่ง ID มาทาง URL (เช่น /comments/15) ซึ่ง commentId จะถูกดึงมาจากตัวเลขท้าย URL นั้น
    const userId = req.user.id; // ดึง ID ผู้ใช้จาก Token เพื่อเช็คสิทธิ์

    await postService.deleteComment(Number(commentId), userId); //Number(commentId): ทำการแปลงค่าจากตัวอักษร (String) ที่ได้จาก URL ให้กลายเป็นตัวเลข (Number) เพื่อให้ฐานข้อมูล Prisma ค้นหา ID ได้ถูกต้อง
//ภายใน postService.deleteComment จะไม่ได้มีแค่คำสั่งลบ แต่จะมี Logic สำคัญคือ
//ค้นหาว่ามีคอมเมนต์ ID นี้จริงไหม?
//Check Authorization: เช็คว่า userId ของคนสั่งลบ ตรงกับ userId เจ้าของคอมเมนต์นั้นหรือไม่ (เพื่อป้องกันไม่ให้ใครมาแอบลบคอมเมนต์ของคนอื่น)

    res.status(200).json({ success: true, message: "ลบคอมเมนต์สำเร็จ" });
  } catch (error) {
    console.error("DeleteComment Error: ", error);
    next(error);
  }
};




/**
 * 7. ดึงคอมเมนท์ของโพสต์
 */
export const getComments = async (req, res, next) => {
  try {
    const { postId } = req.params; //req.params: เป็นการดึงค่าจาก Path ของ URL (เช่น หาก URL คือ /posts/10/comments ค่าของ postId ก็คือ 10) เป็นมาตรฐานในการระบุว่าเราต้องการดึงข้อมูล "ของสิ่งใด"
    const comments = await postService.fetchCommentsByPostId(postId); //ส่ง postId ไปให้ postService.fetchCommentsByPostId จัดการ
//การทำงานเบื้องหลัง (Service)
//ระบบจะไปค้นหาในตาราง Comment
//มักจะมีการ include ข้อมูลผู้ใช้งาน (เช่น ชื่อ, รูปโปรไฟล์) มาให้พร้อมกัน เพื่อให้หน้าบ้านแสดงผลได้ทันทีว่า "ใครเป็นคนคอมเมนต์"
//มักจะมีการเรียงลำดับ (เช่น จากเก่าไปใหม่ หรือใหม่ไปเก่า) ตามความเหมาะสม

    res.status(200).json({ comments });
  } catch (error) {
    next(error);
  }
};



/**
 * 8. ลบโพสต์
 */
export const deletePost = async (req, res, next) => {
  try {
    const { id } = req.params; //ดึงค่า id ของโพสต์มาจาก URL (เช่น /posts/42) เพื่อระบุว่าต้องการลบโพสต์ไหน
    const userId = req.user.id; //ดึง ID ของผู้ใช้งานที่กำลังล็อกอินอยู่จาก Token เพื่อใช้ตรวจสอบว่าคนคนนี้มีสิทธิ์ลบโพสต์ดังกล่าวหรือไม่

    await postService.deletePost(Number(id), userId); //Number(id): แปลง ID จากตัวอักษรเป็นตัวเลขเพื่อให้ Database (Prisma) ค้นหาข้อมูลได้ถูกต้อง
// ส่งหน้าที่ไปให้ Service Layer จัดการ Logic เบื้องหลัง 
//(Authorize): เช็คว่า userId ที่ส่งไป ตรงกับเจ้าของโพสต์ในฐานข้อมูลไหม ถ้าไม่ตรงจะหยุดทำงานและส่ง Error 403 
//(Delete): ถ้าสิทธิ์ถูกต้อง จะทำการลบโพสต์ (และอาจลบข้อมูลที่เกี่ยวข้อง เช่น รูปภาพหรือคอมเมนต์) ออกจากฐานข้อมูล

    res.status(200).json({ success: true, message: "ลบโพสต์สำเร็จ" });
  } catch (error) {
    next(error);
  }
};


//แก้ไขเนื้อหาโพสต์" (Edit Post)
export const updatePost = async (req, res, next) => {
  try {
    const { id } = req.params; // ดึง ID ของโพสต์จาก URL (เช่น /posts/5) req.params: ระบุว่าเรากำลังจะแก้ไขโพสต์ใบไหน
    const { message } = req.body; // รับข้อความใหม่ที่ User แก้ไขมาจากหน้าฟอร์ม req.body: ระบุว่าเราจะเปลี่ยนเนื้อหาเป็นอะไร
    const userId = req.user.id; // ดึง ID ของผู้ใช้จาก Token เพื่อยืนยันตัวตน req.user.id: ระบุว่า ใครเป็นคนสั่งแก้ไข (ใช้ป้องกันการแอบแก้โพสต์คนอื่น)

    // เรียกใช้ service เพื่อแก้ไขข้อมูลใน Database
    const updatedPost = await postService.updatePost(Number(id), userId, { message }); //Number(id): แปลง ID จาก String เป็น Number เพื่อให้ Prisma ทำงานได้ถูกต้อง
//postService.updatePost: ส่งหน้าที่ให้ชั้น Service ไปจัดการ Logic
//(Authorize): เช็คใน Database ว่า userId ของคนสั่งแก้ ตรงกับเจ้าของโพสต์จริงไหม
//อัปเดตข้อมูล: ถ้าสิทธิ์ถูกต้อง จะทำการเปลี่ยน message ใน Database เป็นค่าใหม่ที่ส่งมา
    res.status(200).json({
      message: "แก้ไขโพสต์สำเร็จ",
      post: updatedPost
    });
  } catch (error) {
    next(error);
  }
};




// ส่งคำขอ ขอรับอุปการะสัตว์ (ผู้อื่นกดปุ่ม APPLY)
export const applyAdoption = async (req, res, next) => {
  try {
    const { postId } = req.body; // รับ ID ของโพสต์ที่ต้องการขอรับเลี้ยง postId: ระบุว่าผู้ใช้สนใจสัตว์จากโพสต์ไหน
    const userId = req.user.id; // ดึง ID ของผู้ใช้งานจาก Token userId: ยืนยันตัวตนว่าใครเป็นคนส่งคำขอ (ดึงจากระบบ Login)
    
    if (!postId) throw createError(400, "Post ID is required"); //หากหน้าบ้านไม่ได้ส่ง postId มา ระบบจะหยุดทำงานทันทีและแจ้ง Error 400 เพื่อไม่ให้เกิดข้อผิดพลาดในชั้นฐานข้อมูล
    
    const result = await postService.requestAdoption(postId, userId);
    //ส่งหน้าที่ให้ postService.requestAdoption ไปจัดการ Logic 
//เช็คว่าสัตว์ตัวนี้ได้บ้านไปหรือยัง
//เช็คว่าเราเป็นเจ้าของโพสต์เองหรือเปล่า (ห้ามอุปการะสัตว์ตัวเอง)
//บันทึกข้อมูลลงตารางคำขอรับเลี้ยง
    
    res.status(201).json({ 
      success: true,
      message: "ส่งคำขอรับอุปการะสำเร็จ", 
      data: result 
    });
  } catch (error) {
    if (error.code === 'P2002') {
        return next(createError(400, "คุณได้ส่งคำขอไปแล้ว"));
    }
    next(error);
  }
};



// ยืนยันคำขอ (เจ้าของโพสต์กดปุ่ม CheckCircle ใน Modal)
export const approveAdoption = async (req, res, next) => {
  try {
    const { requestId } = req.body; //requestId: รับไอดีของ "ใบคำขอ" ที่เจ้าของเลือก (จากหลายๆ คนที่ส่งมา เจ้าของจะเลือกมาแค่ 1 ID ที่ถูกใจที่สุด)
    const ownerId = req.user.id; // ownerId: ดึงจาก Token เพื่อยืนยันว่า "คนที่กดอนุมัติ คือเจ้าของโพสต์ตัวจริงใช่ไหม" ไม่ใช่ใครที่ไหนก็มาเนียนกดแทนได้

    if (!requestId) throw createError(400, "Request ID is required"); //ป้องกันกรณีที่หน้าบ้านส่งข้อมูลมาไม่ครบ ถ้าไม่มีไอดีคำขอ ระบบจะไม่ทำงานต่อเพื่อลดภาระของฐานข้อมูล

    const result = await postService.confirmAdoption(requestId, ownerId);
    //ส่งหน้าที่ให้ postService.confirmAdoption ไปจัดการ Logic 
//ตรวจสอบสิทธิ์: เช็คว่า requestId นี้ เป็นของโพสต์ที่ ownerId คนนี้เป็นเจ้าของจริงหรือไม่
//อัปเดตสถานะคำขอ: เปลี่ยนคำขอที่เลือกให้เป็น APPROVED
//ปิดโพสต์: เปลี่ยนสถานะของโพสต์นั้นเป็น CLOSED หรือ ADOPTED เพื่อไม่ให้คนอื่นมองเห็นหรือส่งคำขอเข้ามาเพิ่มได้อีก

    res.status(200).json({ 
      success: true,
      message: "ยืนยันการรับอุปการะเรียบร้อย ปิดโพสต์แล้ว", 
      data: result 
    });
  } catch (error) {
    next(error);
  }
};



//ดูรายชื่อผู้ที่สนใจขอรับอุปการะสัตว์
export const getAdoptionRequests = async (req, res, next) => {
  try {
    const { postId } = req.params; //req.params: ระบบจะดึงค่า postId มาจากที่อยู่ URL (เช่น /posts/25/adoption-requests) ช่วยให้ระบบรู้ว่า "คุณกำลังอยากดูรายชื่อคนขอเลี้ยง ของสัตว์ตัวไหน"

    // ตรวจว่ามี postId ส่งมาไหม
    if (!postId) { //เป็นการเช็คความปลอดภัยขั้นต้น หากไม่มีการระบุ ID ของโพสต์มา ระบบจะตอบกลับด้วย Status 400 ทันที เพื่อป้องกันไม่ให้โค้ดส่วนถัดไปทำงานผิดพลาด
      return res.status(400).json({ message: "Post ID is required" });
    }

    const requests = await postService.getAdoptionRequestsByPostId(Number(postId));
    //ส่ง postId ไปให้ postService จัดการดึงข้อมูลจากฐานข้อมูล
//สิ่งที่ Service มักจะทำ
//ค้นหาข้อมูลในตาราง AdoptionRequest ที่เชื่อมโยงกับ postId นี้
//Include User Info: มักจะดึงข้อมูลของผู้ที่ส่งคำขอมาด้วย (เช่น ชื่อ, เบอร์โทร, ประวัติเบื้องต้น) เพื่อให้เจ้าของโพสต์ใช้ตัดสินใจได้ทันที

    res.status(200).json({
      message: "Get adoption requests success",
      requests: requests, 
    });
  } catch (err) {
    next(err);
  }
};