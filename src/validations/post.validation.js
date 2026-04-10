// import { z } from "zod";

// // Helper: สำหรับแปลง ID จาก String เป็น Number
// const numericParam = z.string().regex(/^\d+$/).transform(Number);

// /**
//  * 1. Create Post
//  */
// export const createPostSchema = z.object({
//   body: z.object({
//     message: z.string().min(1, "กรุณากรอกข้อความ").max(2000),
//     postType: z.enum(["RESCUE", "ADOPT", "HAPPY"]),
//     type: z.enum(["DOG", "CAT", "OTHER"]).optional(),
//     urgentLevel: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
//     location: z.string().optional(),
//   }),
// });

// /**
//  * 2. ID ใน Body (ใช้กับ Like, Reserve, Unreserve, applyAdoption)
//  */
// export const postIdBodySchema = z.object({
//   body: z.object({
//     postId: numericParam,
//   }),
// });

// /**
//  * 3. Request ID ใน Body (ใช้กับ approveAdoption)
//  */
// export const requestIdBodySchema = z.object({
//   body: z.object({
//     requestId: numericParam,
//   }),
// });

// /**
//  * 4. Comment (ตรวจสอบทั้ง Body และ Params)
//  */
// export const commentSchema = z.object({
//   body: z.object({
//     postId: numericParam,
//     message: z.string().max(500).optional(),
//   }),
// });

// // สำหรับ GET /:postId/comments และ GET /adoption/requests/:postId
// export const postIdParamsSchema = z.object({
//   params: z.object({
//     postId: numericParam,
//   }),
// });

// // สำหรับ DELETE /comment/:commentId
// export const commentIdParamsSchema = z.object({
//   params: z.object({
//     commentId: numericParam,
//   }),
// });

// /**
//  * 5. Update & Delete Post (ใช้ ID ใน Params)
//  */
// export const updatePostSchema = z.object({
//   params: z.object({
//     id: numericParam,
//   }),
//   body: z.object({
//     message: z.string().min(1, "ข้อความแก้ไขต้องไม่ว่างเปล่า"),
//   }),
// });

// export const deletePostSchema = z.object({
//   params: z.object({
//     id: numericParam,
//   }),
// });