// import createError from "http-errors";

// export const validate = (schema) => async (req, res, next) => {
//   try {
//     // ตรวจสอบทั้ง body, params, และ query ตามที่กำหนดใน schema
//     const validatedData = await schema.parseAsync({
//       body: req.body,
//       query: req.query,
//       params: req.params,
//     });
    
//     // แทนที่ข้อมูลเดิมด้วยข้อมูลที่ผ่านการ transform (เช่น string id เป็น number)
//     req.body = validatedData.body;
//     req.params = validatedData.params;
//     req.query = validatedData.query;
    
//     next();
//   } catch (error) {
//     // รวม error messages จาก Zod
//     const errorMessage = error.errors.map((err) => err.message).join(", ");
//     next(createError(400, errorMessage));
//   }
// };