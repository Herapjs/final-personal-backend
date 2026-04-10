
CC22-FOREVERHOME-API
===
### evn guid
PORT=8899
DATABASE_URL="mysql://root:Ployploy1995@localhost:3306/backend"
JWT_SECRET=hera










# 🔍 API Documentation (P2P Stray Animal Support)

ระบบจัดการการช่วยเหลือสัตว์แบบ Peer-to-Peer โดยไม่มีระบบ Admin และ Notification

### 🔐 Authentication
| Path | Method | Authen | Params | Query | Body |
| :--- | :---: | :---: | :---: | :---: | :--- |
| `/api/auth/register` | POST | ❌ | - | - | `{ username, password, email, firstName, lastName }` |
| `/api/auth/login` | POST | ❌ | - | - | `{ username, password }` |

### 👤 User & Profile
| Path | Method | Authen | Params | Query | Body |
| :--- | :---: | :---: | :---: | :---: | :--- |
| `/api/users/me` | GET | ✅ | - | - | - |
| `/api/users/:id` | GET | ✅ | `id` | - | - |
| `/api/users/profile` | PATCH | ✅ | - | - | `{ bio, profileImgge }` |

### 📝 Posts (Rescue, Adopt, Happy)
| Path | Method | Authen | Params | Query | Body |
| :--- | :---: | :---: | :---: | :---: | :--- |
| `/api/posts` | GET | ✅ | - | `type`, `page` | - |
| `/api/posts` | POST | ✅ | - | - | `{ content, image, postType, message }` |
| `/api/posts/:id` | GET | ✅ | `id` | - | - |
| `/api/posts/:id` | DELETE | ✅ | `id` | - | - |

### 🐕 Rescue Logic (Dog & Cat)
*หมายเหตุ: ใช้ร่วมกับ PostType: RESCUE*
| Path | Method | Authen | Params | Query | Body |
| :--- | :---: | :---: | :---: | :---: | :--- |
| `/api/rescue/:postId/reserve` | PATCH | ✅ | `postId` | - | - |
| `/api/rescue/:postId/complete` | PATCH | ✅ | `postId` | - | - |

### 🏠 Adoption Logic
*หมายเหตุ: ใช้ร่วมกับ PostType: ADOPT*
| Path | Method | Authen | Params | Query | Body |
| :--- | :---: | :---: | :---: | :---: | :--- |
| `/api/adopt/:postId/request` | POST | ✅ | `postId` | - | - |
| `/api/adopt/:postId/confirm` | PATCH | ✅ | `postId` | - | `{ adopterId }` |

### ❤️ Social Interactions
| Path | Method | Authen | Params | Query | Body |
| :--- | :---: | :---: | :---: | :---: | :--- |
| `/api/posts/:id/like` | POST | ✅ | `id` | - | - |
| `/api/posts/:id/comments` | POST | ✅ | `id` | - | `{ message }` |

---

## 🛠️ Implementation Logic & Rules

1. **Rescue Reservation:** เมื่อเรียก `/reserve` ระบบต้องตรวจสอบว่า `isHelperNeeded` ของเคสนั้นเป็น `true` และสถานะยังเป็น `PENDING`
2. **Post Ownership:** การ `DELETE` โพสต์ หรือ `PATCH` สถานะการรับอุปการะ (`confirm`) ต้องมีการตรวจสอบว่า `req.user.id === post.authorId`
3. **Data Cascade:** การลบ `Post` จะส่งผลให้ `DogCase`, `CatCase`, `Comment`, และ `Like` ที่เกี่ยวข้องถูกลบออกโดยอัตโนมัติ (OnDelete: Cascade)