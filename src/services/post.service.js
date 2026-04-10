import { prisma } from '../lib/prisma.js';
import createError from 'http-errors';

// 1. Create Post
export const createPostWithCase = async (userId, payload) => { // payload: คือข้อมูลก้อนใหญ่ที่ส่งมาจาก Frontend
  const { message, image, postType, details } = payload;

  return await prisma.$transaction(async (tx) => { 
    // ใช้ระบบ Database Transaction ($transaction) เพื่อรับประกันว่าข้อมูลจะถูกบันทึกครบทุกตาราง 
    // หรือถ้าพังก็จะไม่บันทึกเลย (ป้องกันข้อมูลค้างคา) หลักการ All-or-Nothing
    const newPost = await tx.post.create({ // กระบวนการสร้างโพสต์หลักก่อน (tx.post.create)
      data: {
        message,
        image,
        postType,
        userId,
      },
      // ขั้นตอนแรกคือการสร้างข้อมูลลงในตาราง post ก่อน เพื่อให้ได้ newPost.id (Primary Key) 
      // มาใช้งานต่อในขั้นตอนถัดไป โดยเก็บข้อมูลพื้นฐาน เช่น ข้อความ รูปภาพ และประเภทของโพสต์
    });

    // ตรวจสอบ postType และ details เพื่อสร้าง Case ย่อย
    //คือการแยกเคส ตรวจสอบ postType ถ้าเป็น RESCUE หรือ ADOPT 
    // จะไปสร้างข้อมูลย่อยในตาราง dogCase หรือ catCase ตามประเภทสัตว์ที่ส่งมา
    if ((postType === 'RESCUE' || postType === 'ADOPT') && details) { //&& details: เป็นการป้องกัน Error ว่าต้องมีการส่งรายละเอียดเคสมาด้วย ถ้า details เป็นค่าว่าง โค้ดในปีกกานี้จะไม่ทำงานเลย
      const caseData = { // เตรียมข้อมูลสำหรับ Case
        postId: newPost.id, // จุดเชื่อมโยง (Foreign Key) ที่บอกว่า "รายละเอียดเคสนี้ เป็นของโพสต์หมายเลขนี้นะ"
        location: details.location || "Unknown", // เก็บสถานที่เกิดเหตุ หาก Frontend ไม่ได้ส่งมา จะใส่ค่าเริ่มต้นเป็น "Unknown" เพื่อไม่ให้ข้อมูลใน Database ว่างเปล่า
        urgentLevel: details.urgentLevel || "LOW", // ระดับความด่วน  หากไม่ระบุจะตั้งเป็น "LOW"  ไว้ก่อน
        isHelperNeeded: true, // ตั้งค่าสถานะเริ่มต้นว่า "ต้องการอาสาสมัคร" เพื่อให้ระบบสามารถแสดงปุ่มให้คนอื่นมากดช่วยได้
        status: 'PENDING' // กำหนดสถานะเคสเป็น "รอดำเนินการ" (ยังไม่มีใครรับเคส)
      };

      //หาก User ระบุว่าเป็นโพสต์ช่วยเหลือ ระบบจะนำ newPost.id ไปผูก (Foreign Key) 
      // กับตาราง dogCase หรือ catCase * มีการใส่ค่าเริ่มต้น เช่น status: 'PENDING' 
      // เพื่อบอกว่าเคสนี้นังรอการช่วยเหลืออยู่
      if (details.animalType === 'DOG') {
        await tx.dogCase.create({ data: caseData });
      } else if (details.animalType === 'CAT') {
        await tx.catCase.create({ data: caseData });
      }
    } 
    // ถ้าเป็นประเภทรับอุปการะ จะสร้างแถวข้อมูลในตาราง adoption 
    // เพื่อเตรียมไว้สำหรับการยืนยันการรับเลี้ยงในอนาคต
    if (postType === 'ADOPT') {
      await tx.adoption.create({
        data: { postId: newPost.id }
      });
    }


    //เมื่อบันทึกทุกอย่างลงทุกตารางสำเร็จแล้ว ฟังก์ชันจะทำการ Query ข้อมูลทั้งหมดที่เพิ่งสร้างขึ้นมารวมกัน
    // เป็นก้อนเดียว (Object) โดยใช้ include เพื่อดึงข้อมูลข้ามตารางกลับไปให้ Frontend แสดงผลได้ทันที
    // โดยไม่ต้อง Refresh หน้าจอ
    return await tx.post.findUnique({ //สั่งให้ Prisma ไปค้นหาโพสต์เพียงหนึ่งเดียว (Unique)
      where: { id: newPost.id },// ระบุเจาะจงว่า "เอาโพสต์ที่เราเพิ่งสร้างเมื่อกี้" (โดยใช้ ID ที่ได้จากตัวแปร newPost)
      include: { //คือการสั่งให้ "ไปหยิบข้อมูลจากตารางอื่นที่สัมพันธ์กันมาด้วย"
        dogCase: true, 
        catCase: true, 
        adoption: true,
        user: { select: { id: true, username: true, profileImage: true } }
      },
    });
  });
};





//2. Fetch All Posts ฟังก์ชันที่ใช้แสดงผลในหน้า Feed หลัก
export const fetchAllPosts = async (type, currentUserId = null) => { // currentUserId = null: เป็นการรับ ID ของคนที่กำลังใช้งานอยู่ (ถ้าล็อกอินไว้) เพื่อเอาไปเช็คว่าคนนี้เคย "กดไลก์" หรือ "ส่งคำขอ" ในโพสต์นั้นๆ หรือยัง (ค่าเริ่มต้นเป็น null กรณีไม่ได้ล็อกอิน)
  const validTypes = ["RESCUE", "ADOPT", "HAPPY"]; // กำหนด "รายการที่อนุญาต" เพื่อป้องกัน Error หรือการดึงข้อมูลผิดประเภท
  const whereClause = validTypes.includes(type) ? { postType: type } : {};
  //ใช้การเขียนแบบ Ternary Operator (ตัวย่อของ if-else) เพื่อสร้าง Object เงื่อนไขสำหรับ Prisma:
//ถ้า type ตรงกับค่าที่กำหนด (เช่น "RESCUE"):
//whereClause จะกลายเป็น { postType: "RESCUE" }
//ผลลัพธ์: Prisma จะดึงมาเฉพาะโพสต์ที่เป็นการช่วยเหลือสัตว์เท่านั้น
//ถ้า type ไม่ตรง หรือเป็นค่าว่าง (เช่น User กดดูหน้า "ทั้งหมด"):
//whereClause จะกลายเป็น {} (Object ว่าง)
//ผลลัพธ์: ในภาษาของ Prisma การส่ง {} เข้าไปใน where หมายถึง "ดึงมาทั้งหมดโดยไม่ต้องกรองประเภท
  
  const posts = await prisma.post.findMany({ //ดึงข้อมูล User (เจ้าของโพสต์), 
  // Case (รายละเอียดสัตว์), Comments, และยอด Count ต่างๆ มาพร้อมกันใน Query เดียว
    where: whereClause, //ใช้ตัวกรองที่เราเตรียมไว้ (เช่น กรองเฉพาะหมวดหมู่ RESCUE หรือดึงทั้งหมด)
    include: {
      user: { select: { id: true, username: true, profileImage: true } },
      dogCase: { include: { helper: { select: { username: true } } } },
      catCase: { include: { helper: { select: { username: true } } } },
      adoption: { include: { adopter: { select: { username: true } } } },
      adoptionRequests: currentUserId ? { //ถ้า User ล็อกอินอยู่ ระบบจะเช็คว่า "ตัวเราเอง" เคยส่งคำขอรับเลี้ยงสัตว์ในโพสต์นี้ไปหรือยัง
        where: { userId: currentUserId },
        select: { id: true, userId: true }
      } : false,
      comments: {
        include: {
          user: { select: { id: true, username: true, profileImage: true } }
        },
        orderBy: { createdAt: 'asc' } 
      },
      _count: { //แทนที่เราจะดึงข้อมูล Likes หรือ Comments ทั้งหมดมานั่งนับเอง โค้ดส่วนนี้จะสั่งให้ Database นับจำนวนมาให้เลยจากหลังบ้าน ส่งกลับมาเป็นตัวเลข เช่น { likes: 10, comments: 5 }
        select: { likes: true, comments: true, adoptionRequests: true } 
      },
      likes: currentUserId ? {
        where: { userId: currentUserId },
        select: { userId: true }
      } : false
    },
    orderBy: { createdAt: 'desc' },//สั่งให้เรียงลำดับจาก "ใหม่ไปเก่า" เพื่อให้โพสต์ล่าสุดอยู่บนสุดของหน้า Feed เสมอ
  });

  return posts.map(post => ({ // มีการเช็คสถานะเฉพาะตัวของ User ที่ล็อกอินอยู่ เช่น 
  // isLiked (เรากดไลก์หรือยัง?), isOwner (โพสต์เราเองไหม?), hasRequested (เราส่งคำขออุปการะไปหรือยัง?) 
  // เพื่อให้ Frontend แสดงปุ่มได้ถูกต้อง
    ...post,
    isLiked: post.likes?.length > 0,
    isOwner: currentUserId ? post.userId === currentUserId : false,
    isBooked: (post.dogCase?.status === 'RESERVED' || post.catCase?.status === 'RESERVED'),
    hasRequested: post.adoptionRequests?.length > 0,
    likeCount: post._count.likes,
    commentCount: post._count.comments,
    requestCount: post._count.adoptionRequests
  }));
};


  //3. Update Case Reservation ระบบจองเคสช่วยเหลือ
 //เพื่อเปลี่ยนสถานะจากสัตว์ที่กำลังรอความช่วยเหลือ ให้กลายเป็นสัตว์ที่มีอาสาสมัครรับเรื่องแล้ว
export const updateCaseReservation = async (postId, helperId) => {
  return await prisma.$transaction(async (tx) => {
    const dog = await tx.dogCase.findUnique({ where: { postId } });
    const cat = await tx.catCase.findUnique({ where: { postId } });
    //เนื่องจากระบบแยกตาราง dogCase และ catCase โค้ดจึงต้องเช็คทั้งคู่ว่า postId นี้เป็นเคสของสุนัขหรือแมวกันแน่

    if (!dog && !cat) throw createError(404, "Rescue case not found");

    const targetTable = dog ? tx.dogCase : tx.catCase; //เป็นการกำหนด "เป้าหมาย" ว่าเราจะไป Update ข้อมูลที่ตารางไหน (ถ้ามีข้อมูลใน dog ก็ไปตารางหมา ถ้าไม่มีก็ไปตารางแมว)
    const existingCase = dog || cat; //ดึงข้อมูลเคสที่พบออกมาเก็บไว้ในตัวแปรเดียวเพื่อให้ง่ายต่อการเช็คเงื่อนไขในบรรทัดถัดไป

    if (existingCase.status !== 'PENDING') throw createError(400, "Case already reserved or completed"); // ระบบจะอนุญาตให้จองได้เฉพาะเคสที่มีสถานะเป็น PENDING (รอดำเนินการ) เท่านั้น
    
    const post = await tx.post.findUnique({ where: { id: postId } }); //ระบบทำการดึงข้อมูลโพสต์หลักมาเช็คว่า userId (เจ้าของโพสต์) กับ helperId (คนที่จะมาช่วย) เป็นคนเดียวกันหรือไม่
    if (post.userId === helperId) throw createError(400, "You cannot rescue your own post");

    // เคสนั้นต้องมีสถานะเป็น PENDING (ยังไม่มีคนจอง) และ ห้ามจองโพสต์ของตัวเอง

    return await targetTable.update({
      where: { postId },
      data: {
        status: 'RESERVED',
        helperId: helperId,
      },
      include: { 
        helper: { select: { username: true, firstName: true } },
        post: true 
      }, //เมื่อจองสำเร็จ สถานะจะเปลี่ยนเป็น RESERVED และเก็บ ID ของผู้ช่วยเหลือไว้
    });
  });
};


// การยกเลิก ฟังก์ชัน cancelCaseReservation รองรับกรณีเปลี่ยนใจ 
// โดยต้องเป็นคนที่จองไว้เท่านั้นถึงจะยกเลิกได้
export const cancelCaseReservation = async (postId, helperId) => {
  return await prisma.$transaction(async (tx) => {
    const dog = await tx.dogCase.findUnique({ where: { postId } });
    const cat = await tx.catCase.findUnique({ where: { postId } });
    //นื่องจากเราแยกตาราง dogCase และ catCase จึงต้องเช็คก่อนว่า postId นี้ผูกอยู่กับสัตว์ประเภทไหน

    if (!dog && !cat) throw createError(404, "ไม่พบเคสช่วยเหลือ");

    const targetTable = dog ? tx.dogCase : tx.catCase;
    const existingCase = dog || cat;

    if (existingCase.helperId !== helperId) {
      throw createError(403, "คุณไม่มีสิทธิ์ยกเลิกเคสที่ผู้อื่นจองไว้");
    }

    return await targetTable.update({
      where: { postId },
      data: {
        status: 'PENDING', // เปลี่ยนสถานะจาก RESERVED (จองแล้ว) กลับเป็น PENDING (รอดำเนินการ) เพื่อให้โพสต์นี้กลับไปแสดงสถานะ "ต้องการความช่วยเหลือ" บนหน้า Feed อีกครั้ง
        helperId: null, // ล้างชื่ออาสาสมัครคนเดิมออก เพื่อให้เคสนี้ว่างสำหรับคนใหม่
      }
    });
  });
};

// 4. Toggle Like 
//Toggle Like: ใช้ Logic "สลับสถานะ" ถ้าเคยไลก์แล้วให้ลบ (delete) ถ้ายังไม่เคยให้สร้าง (create) 
// โดยอ้างอิงจาก Composite Key userId_postId
 
export const toggleLike = async (userId, postId) => {
  const existingLike = await prisma.like.findUnique({
    where: {
      userId_postId: { userId, postId }, //Composite Key หรือการรวมเอา ID ของคนกด และ ID ของโพสต์ มาทำเป็นรหัสประจำตัวชุดเดียวกัน
    }, // ระบบจะเข้าไปดูในตาราง like ว่า "User คนนี้ (userId) เคยไลก์โพสต์นี้ (postId) หรือยัง?"
  });

  if (existingLike) {
    await prisma.like.delete({
      where: { userId_postId: { userId, postId } },
    });
    return { message: "Unliked successfully" }; //หากตรวจพบว่ามีข้อมูลการไลก์ค้างอยู่ในฐานข้อมูล (User กดซ้ำ) ระบบจะสั่ง delete ข้อมูลแถวนั้นทิ้งทันที
  } else {
    await prisma.like.create({
      data: { userId, postId },
    });
    return { message: "Liked successfully" };// หากตรวจไม่พบข้อมูล (ยังไม่เคยไลก์มาก่อน) ระบบจะสั่ง create แถวข้อมูลใหม่ลงในตาราง like เพื่อจับคู่ userId กับ postId เข้าด้วยกัน
  }
};

// 5. Comments บันทึกข้อความและรูปภาพประกอบคอมเมนต์ พร้อมมีการ Number(userId) 
// เพื่อป้องกัน Error จากประเภทข้อมูลที่ส่งมาผิดพลาด
export const createComment = async (userId, postId, message, image = null) => {
  return await prisma.comment.create({
    data: {
      message: message || "",// หาก User ไม่ได้พิมพ์ข้อความแต่ส่งเฉพาะรูปภาพ ระบบจะใส่เป็น "ค่าว่าง" ("") แทนการส่ง undefined เพื่อไม่ให้ Database เกิด Error
      image: image,
      // userId และ postId เป็นตัวเลข บางครั้งข้อมูลที่ส่งมาจาก Frontend หรือ URL อาจมาในรูปแบบตัวอักษร (String) การครอบด้วย Number() จะช่วยยืนยันว่าข้อมูลที่ส่งเข้า Database เป็นตัวเลข (Integer) ตามที่ Schema กำหนดไว้จริงๆ
      userId: Number(userId),
      postId: Number(postId)
    },
    include: {
      user: { 
        select: { 
          id: true, 
          username: true, 
          profileImage: true 
        } 
      }
    }
  });
};




export const deleteComment = async (commentId, userId) => {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId } //ระบบจะไม่สั่งลบทันที แต่จะไป "ดึงข้อมูล" ของคอมเมนต์นั้นจากฐานข้อมูลขึ้นมาดูก่อน
  });

  if (!comment) throw createError(404, "ไม่พบคอมเมนต์นี้");
  if (comment.userId !== userId) throw createError(403, "คุณไม่มีสิทธิ์ลบคอมเมนต์นี้");
  //เปรียบเทียบ userId ของคนที่เขียนคอมเมนต์ (จาก DB) กับ userId ของคนที่กำลังสั่งลบ (จาก Token/Session)หาก ID ไม่ตรงกัน ระบบจะปฏิเสธการลบทันที

  return await prisma.comment.delete({
    where: { id: commentId }
  });
};



export const fetchCommentsByPostId = async (postId) => {
  return await prisma.comment.findMany({ //สั่งให้ Prisma ไปดึงข้อมูลคอมเมนต์มา "หลายรายการ" (ทุกอันที่เจอ)
    where: { postId }, //ระบุเงื่อนไขว่า "เอาเฉพาะคอมเมนต์ที่อยู่ในโพสต์ ID นี้เท่านั้น"
    include: { // ปกติในตารางคอมเมนต์จะมีแค่ userId (เป็นตัวเลข) แต่การใช้ include จะทำให้ระบบไปหยิบ "ข้อมูลจริง" ของ User คนนั้นมาจากตาราง User มาให้ด้วย
      user: { select: { id: true, username: true, profileImage: true } }
    },
    orderBy: { createdAt: 'asc' }
  });
};

//6. User Activity ใช้ในหน้า Profile ของ User เพื่อดูว่าคนนี้เคยโพสต์อะไรไปบ้าง
export const getPostsByUserId = async (targetUserId, currentUserId) => {
  const posts = await prisma.post.findMany({
    where: { userId: targetUserId }, //กรองเอาเฉพาะโพสต์ที่ userId ตรงกับไอดีที่เราต้องการค้นหา (เช่น ดูหน้าโปรไฟล์ของนาย A ระบบก็จะดึงมาเฉพาะโพสต์ของนาย A)
    include: {
      user: { select: { username: true, profileImage: true } },
      dogCase: true,
      catCase: true,
      adoption: true,
      comments: {
        include: { user: { select: { username: true, profileImage: true } } }
      },
      _count: { select: { likes: true, comments: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  return posts.map(post => ({ //คือการวนลูปทุกโพสต์ที่ดึงมาได้
    ...post, //การคัดลอกข้อมูลเดิมทั้งหมดของโพสต์นั้นไว้
    isOwner: post.userId === currentUserId //เปรียบเทียบว่า userId ของโพสต์นี้ ตรงกับ currentUserId (คนที่กำลังล็อกอินดูหน้าเว็บอยู่ตอนนี้) หรือไม่
  })); //ถ้าใช่ (True): Frontend จะรู้ว่านี่คือโพสต์ของตัวเราเอง และจะแสดงปุ่ม "แก้ไข" หรือ "ลบ" ให้เห็น ถ้าไม่ใช่ (False): Frontend จะซ่อนปุ่มจัดการโพสต์ทิ้งไป เพื่อความปลอดภัย
};

// 7. Post Management การลบโพสต์
export const deletePost = async (postId, userId) => {
  const post = await prisma.post.findUnique({ where: { id: postId } }); //ระบบจะไปเช็คในฐานข้อมูลก่อนว่าโพสต์ ID นี้มีอยู่จริงไหม
  if (!post) throw createError(404, "Post not found");
  if (post.userId !== userId) throw createError(403, "Permission denied"); // เช็คว่า userId ของเจ้าของโพสต์ (ใน DB) ตรงกับ userId ของคนที่สั่งลบ (จาก Token) หรือไม่ ถ้าไม่ใช่ จะส่ง 403 Permission denied เพื่อป้องกันการแอบลบโพสต์ของคนอื่น

  return await prisma.post.delete({ where: { id: postId } });
};



// การแก้ไขข้อความในโพสต์
export const updatePost = async (postId, userId, data) => {
  const post = await prisma.post.findUnique({ where: { id: postId } });

  if (!post) throw createError(404, "ไม่พบโพสต์นี้");
  if (post.userId !== userId) throw createError(403, "คุณไม่มีสิทธิ์แก้ไขโพสต์นี้");

  return await prisma.post.update({
    where: { id: postId },
    data: { message: data.message }
  });
};

// 8. Adoption System

//requestAdoption (ฝั่งผู้ขอเลี้ยง): ส่งคำขอไปหาเจ้าของโพสต์ ระบบจะเช็คว่าสัตว์ตัวนี้ได้บ้านไป
//หรือยัง (isConfirm) และเช็คว่าคนขอเคยส่งคำขอไปหรือยังเพื่อป้องกันการส่งซ้ำ
export const requestAdoption = async (postId, userId) => {
  return await prisma.$transaction(async (tx) => { //ใช้เพื่อให้มั่นใจว่ากระบวนการเช็คและบันทึกข้อมูลเป็นไปอย่างถูกต้อง 100% ป้องกันกรณีมีคนกดขอพร้อมกันในเสี้ยววินาที
    const post = await tx.post.findUnique({
      where: { id: postId },
      include: { adoption: true } //ดึงข้อมูลจากตารางการรับเลี้ยงมาด้วย เพื่อดูสถานะว่าสัตว์ตัวนี้ถูก "ยืนยัน" (Confirm) ไปแล้วหรือยัง
    });

    if (!post || post.postType !== 'ADOPT') throw createError(404, "ไม่พบโพสต์รับอุปการะนี้"); //ต้องเป็นโพสต์ประเภท ADOPT เท่านั้น (กันคนแอบส่งคำขอในโพสต์ประเภทอื่น)
    if (post.adoption?.isConfirm) throw createError(400, "น้องสัตว์ตัวนี้ได้บ้านใหม่ไปแล้ว");
    if (post.userId === userId) throw createError(400, "คุณไม่สามารถขอรับอุปการะสัตว์ของตัวเองได้");

    const existingRequest = await tx.adoptionRequest.findUnique({
      where: {
        postId_userId: { postId, userId }
      } //ใช้ Composite Key (postId_userId) เพื่อเข้าไปเช็คว่า User คนนี้เคยส่งคำขอไปที่โพสต์นี้แล้วหรือยัง
    });
    
    if (existingRequest) throw createError(400, "คุณได้ส่งคำขอไปแล้ว");

    return await tx.adoptionRequest.create({
      data: { postId, userId },
      include: { user: { select: { username: true } } }
    });
  });
};


// confirmAdoption (ฝั่งเจ้าของสัตว์): เจ้าของเลือก "ยืนยัน" ให้คนใดคนหนึ่ง
export const confirmAdoption = async (requestId, ownerId) => {
  return await prisma.$transaction(async (tx) => {
    const request = await tx.adoptionRequest.findUnique({
      where: { id: requestId }, //เช็คคำขอ: ไปดูว่า requestId นี้มีอยู่จริงไหม
      include: { post: { include: { adoption: true } } }
    });

    if (!request) throw createError(404, "ไม่พบคำขออุปการะนี้");
    if (request.post.userId !== ownerId) throw createError(403, "คุณไม่มีสิทธิ์ยืนยันคำขอนี้"); //เพื่อป้องกันไม่ให้คนอื่นมาสวมรอยกดรับแทนเจ้าของโพสต์ตัวจริง
    if (request.post.adoption?.isConfirm) throw createError(400, "โพสต์นี้ปิดการรับอุปการะไปแล้ว"); //ถ้าสัตว์ตัวนี้ถูกยกให้คนอื่นไปแล้ว (isConfirm เป็น true) ระบบจะไม่อนุญาตให้กดซ้ำ เพื่อป้องกันความสับสน

    await tx.adoption.update({ //สถานะในตาราง adoption จะกลายเป็น isConfirm: true
      where: { postId: request.postId },
      data: { 
        isConfirm: true,
        adopterId: request.userId
      } //เก็บ adopterId (คนได้สัตว์ไป)
    });

    return await tx.adoptionRequest.update({
      where: { id: requestId },
      data: { status: 'COMPLETED' } // เปลี่ยนสถานะคำขอนั้นเป็น APPROVED
    });
  });
};


// ดึงรายการคำขอรับเลี้ยงทั้งหมด ของโพสต์นั้น ๆ ออกมา เพื่อให้เจ้าของโพสต์สามารถเข้ามาเช็คได้ว่ามีใครสนใจอยากรับน้องสัตว์ไปดูแลบ้าง
export const getAdoptionRequestsByPostId = async (postId) => {
  return await prisma.adoptionRequest.findMany({ // สั่งให้ Prisma ไปดึงข้อมูลคำขอ (Requests) มาทั้งหมด ที่เจอในฐานข้อมูล
    where: { postId },//ระบุเงื่อนไขการกรองว่า "เอาเฉพาะคำขอที่ส่งมาหาโพสต์ ID นี้เท่านั้น"
    include: {
      user: { select: { id: true, username: true, profileImage: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
};