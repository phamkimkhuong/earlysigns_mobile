# 📋 TÀI LIỆU HƯỚNG DẪN THIẾT LẬP & QUY TRÌNH KIỂM TRA HỆ THỐNG
## (Firebase Console, Google Sign-In, FCM Push Notification, RevenueCat IAP, Facebook Login & Apple Sign-In)

> **Dự án:** EarlySigns Mobile App  
> **Package Name chính thức (Production & Preview):** `net.earlysigns.app`  
> **Package Name lập trình (Development Client):** `net.earlysigns.app.dev`  
> **iOS Bundle Identifier:** `net.earlysigns.app`  
> **Cấu trúc tài liệu:**  
> - **PHẦN I:** Thiết lập nền tảng cốt lõi (Firebase Console một cửa, Google Sign-In, FCM Push Notifications, RevenueCat IAP và Bàn giao Keystore).  
> - **PHẦN II:** Thiết lập đăng nhập Facebook (Meta for Developers SDK, Key Hash Base64, Deep Link Scheme và Cấu hình Client).  
> - **PHẦN III:** Thiết lập đăng nhập Apple (Sign in with Apple cho iOS, App ID Capability, cơ chế xác thực JWT và Backend Direct Verification).

---

## 📑 MỤC LỤC TỔNG QUAN

### 🟢 PHẦN I: THIẾT LẬP NỀN TẢNG CỐT LÕI (FIREBASE, GOOGLE & REVENUECAT)
1. [Khâu 0: Bảng Thông Số Chứng Chỉ Số Chuẩn (Android Keystore)](#-khau-0-bang-thong-so-chung-chi-so-chuan-android-keystore)
2. [Khâu 1: Thiết Lập Trung Tâm Tại Firebase Console (Google Sign-In & FCM V1)](#-khau-1-thiet-lap-trung-tam-tai-firebase-console-google-sign-in--fcm-v1)
3. [Khâu 2: Thanh Toán Gói Cước Thuê Bao (RevenueCat In-App Purchase)](#-khau-2-thanh-toan-goi-cuoc-thue-bao-revenuecat-in-app-purchase)
4. [Khâu 3: Quy Trình Bàn Giao & Import Keystore Cho Khách Hàng](#-khau-3-quy-trinh-ban-giao--import-keystore-cho-khach-hang)
5. [Khâu 4: Bảng Checklist Nghiệm Thu Kỹ Thuật (Testing Matrix)](#-khau-4-bang-checklist-nghiem-thu-ky-thuat-testing-matrix)
6. [Khâu 5: Mẫu Tin Nhắn Soạn Sẵn Gửi Khách Hàng (Phần I)](#-khau-5-mau-tin-nhan-soan-san-gui-khach-hang-phan-i)

---

### 🔵 PHẦN II: THIẾT LẬP ĐĂNG NHẬP FACEBOOK (META FOR DEVELOPERS SDK)
7. [Khâu 6: Bản Chất Kỹ Thuật & Bảng Key Hash Base64 Chuẩn](#-khau-6-ban-chat-ky-thuat--bang-key-hash-base64-chuan)
8. [Khâu 7: Hướng Dẫn Thiết Lập Trên Meta for Developers](#-khau-7-huong-dan-thiet-lap-tren-meta-for-developers)
9. [Khâu 8: Cấu Hình Mã Nguồn & Expo Config Plugins](#-khau-8-cau-hinh-ma-nguon--expo-config-plugins)
10. [Khâu 9: Hướng Dẫn Xây Dựng API Xác Thực Trực Tiếp Trên Backend (Meta Graph API)](#-khau-9-huong-dan-xay-dung-api-xac-thuc-truc-tiep-tren-backend-meta-graph-api)
11. [Khâu 10: Mẫu Tin Nhắn Soạn Sẵn Gửi Khách Hàng (Phần II - Facebook)](#-khau-10-mau-tin-nhan-soan-san-gui-khach-hang-phan-ii---facebook)

---

### 🍎 PHẦN III: THIẾT LẬP ĐĂNG NHẬP APPLE (SIGN IN WITH APPLE CHO IOS)
12. [Khâu 11: Quy Định App Store & Bản Chất Kỹ Thuật](#-khau-11-quy-dinh-app-store--ban-chat-ky-thuat)
13. [Khâu 12: Cấu Hình Trên Apple Developer Portal](#-khau-12-cau-hinh-tren-apple-developer-portal)
14. [Khâu 13: Hướng Dẫn Xây Dựng API Xác Thực Trên Backend (POST /api/auth/apple)](#-khau-13-huong-dan-xay-dung-api-xac-thuc-tren-backend-post-apiauthapple)
15. [Khâu 14: Mẫu Tin Nhắn Soạn Sẵn Gửi Khách Hàng (Phần III - Apple)](#-khau-14-mau-tin-nhan-soan-san-gui-khach-hang-phan-iii---apple)

---
---

# 🟢 PHẦN I: THIẾT LẬP NỀN TẢNG CỐT LÕI

## 🔐 KHÂU 0: BẢNG THÔNG SỐ CHỨNG CHỈ SỐ CHUẨN (ANDROID KEYSTORE)

Toàn bộ chứng chỉ số Android đã được tạo chuẩn trên EAS. Đây là các giá trị cố định vĩnh viễn của ứng dụng:

### 1. Bản Chính Thức & Thử Nghiệm Nội Bộ (Production & Preview)
- **Application Identifier (Package Name):** `net.earlysigns.app`
- **Cấu hình trên EAS:** `Build Credentials ENCAxQvNXz (Default)`
- **Loại file:** `JKS`
- **Key Alias:** `fddcd06477d2abbc94668c3ac02466a3`
- **MD5 Fingerprint:** `D5:CD:F4:12:E3:17:1D:83:8E:8B:43:5A:01:F9:11:A3`
- **SHA-1 Fingerprint (CHÍNH THỨC):**
  ```text
  D7:15:0E:81:C2:8C:B0:7A:1E:F5:EF:B2:F3:6A:74:F0:3D:C4:3E:ED
  ```
- **SHA-256 Fingerprint:**
  ```text
  66:B1:4D:32:C3:EE:F3:42:23:48:A7:1D:9A:17:82:DE:67:D8:C1:06:EB:0A:D7:71:67:B7:98:A2:60:95:2E:52
  ```

### 2. Bản Lập Trình (Development Client)
- **Application Identifier (Package Name):** `net.earlysigns.app.dev`
- **Cấu hình trên EAS:** `Build Credentials dAttT_xVt0 (Default)`
- **Loại file:** `JKS`
- **Key Alias:** `33ef4ff7962ab86bccb8e1b03e76a29f`
- **MD5 Fingerprint:** `8C:A9:16:0E:A8:94:07:57:D8:09:10:78:07:09:65:A4`
- **SHA-1 Fingerprint (BẢN TEST DEV):**
  ```text
  EE:A0:75:59:8B:2E:FC:69:5B:EF:11:AC:F5:C4:13:9A:38:BB:C9:AA
  ```
- **SHA-256 Fingerprint:**
  ```text
  9E:E3:03:49:35:62:76:48:ED:58:D9:32:14:12:F6:A9:D9:26:B9:44:C1:8D:A8:45:41:51:9F:56:78:76:3E:A3
  ```

---

## 🚀 KHÂU 1: THIẾT LẬP TRUNG TÂM TẠI FIREBASE CONSOLE (Google Sign-In & FCM V1)

> 💡 **Cơ chế tự động:** Firebase Console và Google Cloud dùng chung một Project (`earlysigns-679f9`). Khi bạn thêm App và điền mã SHA-1 trên Firebase, Firebase **tự động sinh Android OAuth Client ID** bên Google Cloud. **Bạn không cần tạo thủ công trên Google Cloud Console.**

### 1.1. Khai Báo 2 Ứng Dụng Android & Nạp Mã SHA-1
1. Truy cập [Firebase Console](https://console.firebase.google.com/) $\rightarrow$ Chọn Project: `earlysigns-679f9`.
2. Bấm vào biểu tượng ⚙️ (**Project settings**) $\rightarrow$ Cuộn xuống mục **Your apps**:
3. **Thêm App Production:**
   - Bấm **Add app** (icon Android 🤖).
   - **Package name:** `net.earlysigns.app`
   - **App nickname:** `EarlySigns Android Prod`
   - **SHA-1 certificate fingerprint:**
     ```text
     D7:15:0E:81:C2:8C:B0:7A:1E:F5:EF:B2:F3:6A:74:F0:3D:C4:3E:ED
     ```
   - Bấm **Register app**.
4. **Thêm App Development:**
   - Tiếp tục bấm **Add app** (icon Android 🤖) lần 2.
   - **Package name:** `net.earlysigns.app.dev`
   - **App nickname:** `EarlySigns Android Dev`
   - **SHA-1 certificate fingerprint:**
     ```text
     EE:A0:75:59:8B:2E:FC:69:5B:EF:11:AC:F5:C4:13:9A:38:BB:C9:AA
     ```
   - Bấm **Register app**.
5. **Tải file `google-services.json`:**
   - Bấm nút tải file `google-services.json` mới về (file này sẽ chứa đủ cấu hình cho cả 2 ứng dụng).
   - Đặt file vào thư mục gốc của dự án Mobile.

---

### 1.2. Bật Google Sign-In & Lấy Chuỗi `Web Client ID`
App Mobile cần một mã `webClientId` để cấp ID Token cho Backend:
1. Tại menu bên trái Firebase Console, chọn **Build** $\rightarrow$ **Authentication**.
2. Chọn tab **Sign-in method** $\rightarrow$ Chọn nhà cung cấp **Google** $\rightarrow$ Bật kích hoạt (**Enable**).
3. Mở rộng mục **Web SDK configuration** (Cấu hình SDK web).
4. Bạn sẽ thấy dòng:
   👉 **Web client ID:** `xxxxxxxxxxxx-xxxxxxxxxxxxxxxx.apps.googleusercontent.com`
5. Sao chép chuỗi này và điền vào biến môi trường trong file `.env` của Mobile App:
   ```env
   EXPO_PUBLIC_GOOGLE_CLIENT_ID=xxxxxxxxxxxx-xxxxxxxxxxxxxxxx.apps.googleusercontent.com
   ```
   *(Không cần tạo gì thêm trên Google Cloud Console, chuỗi này đã sẵn sàng sử dụng).*

---

### 1.3. Xuất Khóa Dịch Vụ FCM V1 (Gửi Thông Báo Đẩy)
1. Trong Firebase Console $\rightarrow$ vào **Project settings** (⚙️) $\rightarrow$ Tab **Service accounts**.
2. Bấm nút **Generate new private key** (Tạo khóa riêng tư mới).
3. Tải file JSON bảo mật về máy (ví dụ: `earlysigns-679f9-firebase-adminsdk-xxxxx.json`).
4. **Tải lên Expo Dashboard:**
   - Đăng nhập [Expo Dashboard](https://expo.dev/) $\rightarrow$ Chọn Project **EarlySigns**.
   - Vào menu **Project settings** (hoặc **Credentials**) $\rightarrow$ Tab **Android**.
   - Tìm mục **FCM V1 Service Account Key** $\rightarrow$ Bấm **Upload** và chọn file JSON vừa tải về.

---

### 1.4. Quy Trình Kiểm Tra & Nghiệm Thu
- [ ] **Google Sign-In:** Mở app trên điện thoại $\rightarrow$ Bấm "Tiếp tục với Google" $\rightarrow$ Chọn tài khoản Google $\rightarrow$ Đăng nhập thành công, nhận token và vào màn hình Home.
- [ ] **FCM Notifications:** Mở app xin quyền thông báo $\rightarrow$ Thiết bị nhận token `ExponentPushToken[...]` $\rightarrow$ Thử nghiệm đẩy thông báo từ Expo Push Tool hoặc Backend $\rightarrow$ Banner thông báo hiển thị chuẩn xác trên thanh thông báo.

---

## 💎 KHÂU 2: THANH TOÁN GÓI CƯỚC THUÊ BAO (RevenueCat In-App Purchase)

### 2.1. Bản Chất Vận Hành
- **Dòng tiền & Doanh thu:** Apple App Store và Google Play Store thu tiền trực tiếp và chuyển 100% về tài khoản ngân hàng của doanh nghiệp. RevenueCat **KHÔNG giữ tiền**.
- **Vai trò:** Trung gian bảo mật xác thực biên lai mua hàng (Receipt Validation), chống gian lận và tự động kích hoạt tính năng VIP trên cả iOS/Android.

```
[Người dùng bấm Mua Pro]
         │
         ▼
[Google Play / App Store Thu Tiền $] ──► Chuyển về tài khoản ngân hàng công ty
         │
    (Biên lai)
         ▼
[RevenueCat Backend] ──(Xác thực hợp lệ)──► Mở khóa Entitlement 'pro'
         │
         ▼
[EarlySigns Mobile & Backend Server] ──► Mở khóa tài khoản PRO ngay lập tức
```

### 2.2. Các Bước Thiết Lập
1. **Tạo tài khoản & Project:**
   - Truy cập [RevenueCat Dashboard](https://app.revenuecat.com/) $\rightarrow$ Đăng ký miễn phí $\rightarrow$ Tạo Project: `EarlySigns`.
2. **Kết nối ứng dụng:**
   - **iOS:** Bundle ID: `net.earlysigns.app` + tải file Apple In-App Purchase Key (`.p8`).
   - **Android:** Package Name: `net.earlysigns.app` + nạp Google Play Service Account JSON.
3. **Cấu hình Entitlement (Bắt buộc đúng tên):**
   - Vào menu **Entitlements** $\rightarrow$ Bấm **+ New**:
     - **Identifier:** `pro` *(chữ thường, mã nguồn mobile và backend đã được lập trình nhận diện entitlement này)*.
   - Vào menu **Offerings** $\rightarrow$ Chọn **Default Offering** $\rightarrow$ Gắn các gói Tháng/Năm vào entitlement `pro`.
4. **Lấy API Keys điền vào `.env`:**
   - Khóa Public iOS (`appl_...`): Điền vào `EXPO_PUBLIC_REVENUECAT_APPLE_KEY`.
   - Khóa Public Android (`goog_...`): Điền vào `EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY`.
   - Khóa Secret Backend (`sk_...`): Gửi cho đội ngũ Backend để thiết lập webhook.

---

## 📦 KHÂU 3: QUY TRÌNH BÀN GIAO & IMPORT KEYSTORE CHO KHÁCH HÀNG

Toàn bộ chữ ký số Android được đóng gói trọn vẹn trong file `.jks`. Khi bàn giao dự án sang tài khoản EAS của khách hàng, chữ ký số và mã SHA-1 được bảo toàn 100%:

### 1. Tài Sản Bàn Giao Kèm Source Code:
1. File khóa Android Keystore gốc: `earlysigns-release-key.jks` (Tải từ EAS: `Build Credentials ENCAxQvNXz`).
2. Bảng thông số bảo mật:
   - **Key Alias:** `fddcd06477d2abbc94668c3ac02466a3`
   - **Keystore Password:** *(Lấy từ lệnh `eas credentials` hoặc web Expo Dashboard)*
   - **Key Password:** *(Lấy từ lệnh `eas credentials` hoặc web Expo Dashboard)*
   - **SHA-1 chuẩn:** `D7:15:0E:81:C2:8C:B0:7A:1E:F5:EF:B2:F3:6A:74:F0:3D:C4:3E:ED`

### 2. Thao Tác Của Khách Hàng Khi Dùng Tài Khoản EAS Mới:
1. Đăng nhập EAS CLI: `eas login`.
2. Chạy lệnh: `eas credentials`
3. Chọn: **`Android`** $\rightarrow$ Profile: **`production`**.
4. Chọn: **`Keystore: Manage everything needed to build your project`** $\rightarrow$ Chọn **`Import existing Keystore`**.
5. Nạp file `earlysigns-release-key.jks` và điền Keystore Password, Key Alias, Key Password.
6. **Kết quả:** Mọi bản build trên EAS của khách hàng đều ký cùng chữ ký số gốc. Google Sign-In và bản cập nhật trên Google Play Store chạy mượt mà, không bị xung đột.

---

## 📊 KHÂU 4: BẢNG CHECKLIST NGHIỆM THU KỸ THUẬT (TESTING MATRIX)

| STT | Hạng mục kiểm tra | Tiêu chuẩn đạt | Người phụ trách | Trạng thái |
|:---:|:---|:---|:---:|:---:|
| **1** | **Android App & SHA-1 trên Firebase** | Nạp đủ 2 Package (`net.earlysigns.app`, `net.earlysigns.app.dev`) và 2 mã SHA-1 | Khách hàng | ⏳ Chờ thực hiện |
| **2** | **Google Web Client ID** | Lấy từ Firebase Auth và điền vào `.env` | Khách hàng | ⏳ Chờ cung cấp |
| **3** | **Firebase FCM V1 Key** | Xuất private key JSON và upload lên Expo Dashboard | Khách hàng / Dev | ⏳ Chờ thực hiện |
| **4** | **RevenueCat Entitlement** | Tạo project `EarlySigns`, entitlement tên là `pro` | Khách hàng | ⏳ Chờ tạo |
| **5** | **RevenueCat API Keys** | Cung cấp đủ khóa `appl_...`, `goog_...` và `sk_...` | Khách hàng | ⏳ Chờ cung cấp |
| **6** | **Kiểm tra TypeScript Typecheck** | Lệnh `npm run typecheck` đạt 0 lỗi | Đội ngũ Kỹ thuật | ✅ **ĐẠT (PASS)** |
| **7** | **Kiểm tra Linter** | Lệnh `npm run lint` đạt 0 errors, 0 warnings | Đội ngũ Kỹ thuật | ✅ **ĐẠT (PASS)** |
| **8** | **Bộ Unit Test Tự Động** | Toàn bộ 148/148 unit tests chạy qua | Đội ngũ Kỹ thuật | ✅ **ĐẠT (PASS)** |

---

## 💬 KHÂU 5: MẪU TIN NHẮN SOẠN SẴN GỬI KHÁCH HÀNG (PHẦN I)

Bạn chỉ cần copy đoạn tin nhắn tinh gọn dưới đây gửi cho đối tác/khách hàng:

```markdown
Chào anh/chị, để hoàn tất kết nối tính năng Đăng nhập Google, Thông báo đẩy và Mua gói Pro cho ứng dụng EarlySigns, bên em đã tạo sẵn bộ chữ ký số bảo mật chuẩn. 

Quy trình hiện tại đã được tinh giản tối đa, anh/chị chỉ cần thao tác trên Firebase và RevenueCat như sau:

1️⃣ TRÊN FIREBASE CONSOLE (Project: earlysigns-679f9):
👉 Vào cài đặt dự án (Project settings ⚙️) -> cuộn xuống mục "Your apps" và bấm "Add app" (icon Android):
- App 1 (Bản chính thức):
  + Package Name: net.earlysigns.app
  + SHA-1: D7:15:0E:81:C2:8C:B0:7A:1E:F5:EF:B2:F3:6A:74:F0:3D:C4:3E:ED
- App 2 (Bản test dev):
  + Package Name: net.earlysigns.app.dev
  + SHA-1: EE:A0:75:59:8B:2E:FC:69:5B:EF:11:AC:F5:C4:13:9A:38:BB:C9:AA
-> Sau khi thêm, tải lại file google-services.json gửi giúp em.

👉 Vào mục Authentication -> Sign-in method -> Bật "Google":
- Mở rộng mục "Web SDK configuration" và copy gửi em chuỗi "Web client ID" (dạng xxxxxxxxxxxx-xxxxxxxxxxxxxxxx.apps.googleusercontent.com).

👉 Vào tab "Service accounts" -> Bấm "Generate new private key":
- Tải file JSON bảo mật về gửi em để kích hoạt quyền đẩy thông báo.

2️⃣ TRÊN REVENUECAT (Thanh toán gói cước):
- Đăng ký tài khoản miễn phí trên https://www.revenuecat.com/ -> Tạo Project: EarlySigns.
- Tạo Entitlement đặt tên chính xác là: pro
- Gửi giúp em 2 khóa Public API:
  + Khóa iOS (dạng: appl_xxxxxxxxxxxxxxxx)
  + Khóa Android (dạng: goog_xxxxxxxxxxxxxxxx)
  + Khóa Secret (dạng: sk_xxxxxxxxxxxxxxxx - gửi kèm cho Backend dev).

(100% doanh thu vẫn do Apple và Google thanh toán trực tiếp về tài khoản công ty của anh/chị, RevenueCat chỉ xử lý kỹ thuật mở khóa tài khoản tự động).

Em cảm ơn anh/chị nhiều!
```

---
---

# 🔵 PHẦN II: THIẾT LẬP ĐĂNG NHẬP FACEBOOK (META FOR DEVELOPERS SDK)

> **Mục tiêu:** Tích hợp tính năng *"Tiếp tục với Facebook"* thông qua thư viện chính thức `react-native-fbsdk-next` trên cả iOS và Android, đảm bảo người dùng đăng nhập mượt mà mà không gặp lỗi xác thực chữ ký (Invalid Key Hash).

---

## 🔐 KHÂU 6: BẢN CHẤT KỸ THUẬT & BẢNG KEY HASH BASE64 CHUẨN

### 6.1. Sự Khác Biệt Giữa Meta và Google
- **Google:** Nhận diện chữ ký Android bằng mã băm Hex dạng `XX:XX:XX:...` (SHA-1).
- **Meta (Facebook):** **BẮT BUỘC** chuyển đổi 20-byte SHA-1 thành chuỗi **Base64 (Key Hash)** kết thúc bằng dấu `=`. Nếu nhập sai hoặc thiếu, ứng dụng Android sẽ lập tức văng thông báo lỗi:
  ```text
  "Invalid key hash. The key hash does not match any stored key hashes."
  ```

### 6.2. Bảng Key Hash Base64 Trích Xuất Trực Tiếp Từ Keystore Của Dự Án
Dưới đây là 2 chuỗi Key Hash chính xác 100% được tính toán trực tiếp từ Keystore của ứng dụng:

| Môi trường | Package Name | SHA-1 Fingerprint (Hex) | **Facebook Key Hash (Base64) - DÙNG CHO META** |
| :--- | :--- | :--- | :--- |
| **Bản Chính thức (Production & Preview)** | `net.earlysigns.app` | `D7:15:0E:81:C2:8C:B0:7A:1E:F5:EF:B2:F3:6A:74:F0:3D:C4:3E:ED` | **`1xUOgcKMsHoe9e+y82p08D3EPu0=`** |
| **Bản Lập trình (Development Client)** | `net.earlysigns.app.dev` | `EE:A0:75:59:8B:2E:FC:69:5B:EF:11:AC:F5:C4:13:9A:38:BB:C9:AA` | **`7qB1WYsu/Glb7xGs9cQTmji7yao=`** |

---

## 🌐 KHÂU 7: HƯỚNG DẪN THIẾT LẬP TRÊN META FOR DEVELOPERS

### 7.1. Tạo Ứng Dụng Facebook & Lấy Thông Số Định Danh
1. Truy cập [Meta for Developers](https://developers.facebook.com/) và đăng nhập tài khoản Facebook của công ty/khách hàng.
2. Bấm **My Apps** (Ứng dụng của tôi) $\rightarrow$ Chọn **Create App** (Tạo ứng dụng).
3. **Loại ứng dụng (App Type):** Chọn **Authenticate and request data from users with Facebook Login** (hoặc chọn *Consumer*).
4. **Tên hiển thị:** Đặt tên là `EarlySigns`.
5. Sau khi tạo ứng dụng thành công:
   - **Facebook App ID:** Hiển thị trực tiếp ở góc trên bên trái Dashboard (chuỗi số, ví dụ: `123456789012345`).
   - **Facebook Client Token:** 
     - Vào menu bên trái: **App settings** (Cài đặt ứng dụng) $\rightarrow$ **Advanced** (Nâng cao).
     - Cuộn xuống mục **Security** (Bảo mật).
     - Sao chép chuỗi **Client token** (chuỗi 32 ký tự).

---

### 7.2. Cấu Hình Nền Tảng Android (Android Platform)
1. Trong Meta Dashboard $\rightarrow$ **App settings** $\rightarrow$ **Basic** (Cơ bản).
2. Cuộn xuống cuối trang $\rightarrow$ Bấm **+ Add Platform** (Thêm nền tảng) $\rightarrow$ Chọn **Android** $\rightarrow$ Chọn **Google Play**.
3. Điền thông tin kỹ thuật chính xác:
   - **Google Play Package Names:** Nhập cả 2 package:
     ```text
     net.earlysigns.app
     net.earlysigns.app.dev
     ```
   - **Class Name:** Nhập chính xác tên Activity khởi chạy của Expo/React Native:
     ```text
     net.earlysigns.app.MainActivity
     ```
   - **Key Hashes:** Dán cả 2 chuỗi Base64:
     ```text
     1xUOgcKMsHoe9e+y82p08D3EPu0=
     7qB1WYsu/Glb7xGs9cQTmji7yao=
     ```
4. Bấm **Save Changes** (Lưu thay đổi).

---

### 7.3. Cấu Hình Nền Tảng iOS (iOS Platform)
1. Trong **App settings** $\rightarrow$ **Basic** $\rightarrow$ Bấm **+ Add Platform** $\rightarrow$ Chọn **iOS**.
2. Điền thông tin kỹ thuật:
   - **Bundle ID:** `net.earlysigns.app`
   - **Single Sign On:** Gạt công tắc sang **YES**.
3. Bấm **Save Changes**.

---

### 7.4. Bật Chế Độ Công Khai (Live Mode) Cho Ứng Dụng
1. Ở thanh tiêu đề trên cùng của Meta Dashboard, tìm công tắc **App Mode: Development / Live**.
2. Gạt sang **Live** để tất cả người dùng bình thường đều có thể đăng nhập bằng tài khoản Facebook của họ (không chỉ riêng tài khoản Tester/Developer).
3. *(Lưu ý: Meta có thể yêu cầu điền link Chính sách quyền riêng tư (Privacy Policy URL) của EarlySigns trước khi chuyển sang Live).*

---

## 📱 KHÂU 8: CẤU HÌNH MÃ NGUỒN & EXPO CONFIG PLUGINS

Thư viện `react-native-fbsdk-next` trong ứng dụng đã sẵn sàng. Khi nhận được **Facebook App ID** và **Client Token** từ khách hàng, thực hiện cấu hình như sau:

### 1. File biến môi trường `.env`:
```env
EXPO_PUBLIC_FACEBOOK_APP_ID=123456789012345
EXPO_PUBLIC_FACEBOOK_CLIENT_TOKEN=abcdef0123456789abcdef0123456789
```

### 2. File cấu hình `app.json` (Mục plugins):
Cập nhật block `react-native-fbsdk-next` với App ID và Client Token thật:
```json
[
  "react-native-fbsdk-next",
  {
    "appID": "123456789012345",
    "clientToken": "abcdef0123456789abcdef0123456789",
    "displayName": "EarlySigns",
    "scheme": "fb123456789012345"
  }
]
```
*(Quy tắc: Trường `scheme` bắt buộc có định dạng `fb` ghép liền với `appID`, ví dụ: `fb123456789012345`).*

---

## ⚡ KHÂU 9: HƯỚNG DẪN XÂY DỰNG API XÁC THỰC TRỰC TIẾP TRÊN BACKEND (Meta Graph API)

> 💡 **Kiến trúc đồng bộ:** Backend EarlySigns không sử dụng Firebase Auth mà sử dụng cơ chế **xác thực trực tiếp và cấp phát JWT riêng** (tương tự như luồng `POST /api/auth/google`). Quy trình dưới đây giúp đội ngũ Backend triển khai API cho Facebook một cách nhanh chóng, bảo mật và đồng nhất.

### 9.1. Luồng Xác Thực Trực Tiếp (Direct Verification Flow)
```
[Mobile App]
    │  (1) Người dùng bấm "Tiếp tục với Facebook"
    ▼  (react-native-fbsdk-next trả về accessToken)
[Gửi POST /api/auth/facebook { access_token, device_id }]
    │
    ▼
[Backend EarlySigns Server]
    │  (2) Server gọi Graph API của Meta để lấy thông tin người dùng thật:
    │      GET https://graph.facebook.com/me?fields=id,name,email,picture&access_token={access_token}
    ▼
[Meta Facebook Server]
    │  (3) Trả về dữ liệu: { id: "10223849...", name: "Nguyễn Văn A", email: "a@gmail.com" }
    ▼
[Backend EarlySigns Server]
    │  (4) Tìm hoặc tạo mới User trong Database nội bộ
    │  (5) Cấp JWT Token của EarlySigns trả về cho Mobile
    ▼
[Mobile App] Lưu token vào useAuthStore -> Hoàn tất đăng nhập!
```

### 9.2. Đặc Tả Endpoint Cho Backend

#### `POST /api/auth/facebook`
- **Quyền truy cập:** Public (không yêu cầu Bearer token).
- **Mục đích:** Xác thực Facebook `access_token` với Meta, tạo hoặc lấy tài khoản người dùng và cấp JWT session của EarlySigns.

**Request Body:**
| Trường dữ liệu | Kiểu | Bắt buộc | Ghi chú |
| --- | --- | :---: | --- |
| `access_token` | string | Có | Mã truy cập nhận được từ `react-native-fbsdk-next` trên Mobile |
| `device_id` | string | Không | Mã định danh thiết bị (tối thiểu 8 ký tự) để phục vụ push token |

**Response `200` (Thành công):**
```json
{
  "ok": true,
  "token": "<JWT_AUTH_TOKEN>",
  "email": "user@example.com",
  "user_id": "<USER_UUID>",
  "is_new_user": false
}
```

**Mã lỗi (Errors):**
- `400`: Thiếu `access_token`.
- `401`: `access_token` không hợp lệ hoặc đã hết hạn từ phía Meta.

### 9.3. Mã Nguồn Mẫu Cho Backend (Triển Khai Nhanh)

#### Với Python (FastAPI):
```python
import httpx
from fastapi import APIRouter, HTTPException

router = APIRouter()

@router.post("/api/auth/facebook")
async def login_facebook(payload: dict):
    access_token = payload.get("access_token")
    device_id = payload.get("device_id")
    if not access_token:
        raise HTTPException(status_code=400, detail="Missing access_token")
    
    # 1. Gọi Meta Graph API để xác thực token và lấy thông tin tài khoản
    async with httpx.AsyncClient(timeout=10.0) as client:
        fb_resp = await client.get(
            "https://graph.facebook.com/me",
            params={
                "fields": "id,name,email,picture",
                "access_token": access_token
            }
        )
    
    if fb_resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid or expired Facebook access token")
    
    fb_data = fb_resp.json()
    email = fb_data.get("email") or f"{fb_data['id']}@facebook.com"
    
    # 2. Tìm hoặc tạo mới User trong CSDL của EarlySigns
    user, is_new = await get_or_create_user(
        email=email,
        full_name=fb_data.get("name"),
        facebook_id=fb_data.get("id"),
        device_id=device_id
    )
    
    # 3. Tạo JWT session token của EarlySigns trả về cho Mobile
    jwt_token = create_access_token(user_id=user.id)
    return {
        "ok": True,
        "token": jwt_token,
        "email": user.email,
        "user_id": str(user.id),
        "is_new_user": is_new
    }
```

#### Với Node.js (Express):
```javascript
const axios = require('axios');

app.post('/api/auth/facebook', async (req, res) => {
  const { access_token, device_id } = req.body;
  if (!access_token) return res.status(400).json({ ok: false, error: 'Missing access_token' });

  try {
    const fbRes = await axios.get('https://graph.facebook.com/me', {
      params: { fields: 'id,name,email,picture', access_token }
    });
    const fbData = fbRes.data;
    const email = fbData.email || `${fbData.id}@facebook.com`;

    const { user, isNew } = await findOrCreateUser({ email, name: fbData.name, facebookId: fbData.id, deviceId: device_id });
    const token = generateJwt(user.id);

    return res.json({ ok: true, token, email: user.email, user_id: user.id, is_new_user: isNew });
  } catch (err) {
    return res.status(401).json({ ok: false, error: 'Invalid Facebook token' });
  }
});
```

# 🍎 PHẦN III: THIẾT LẬP ĐĂNG NHẬP APPLE (SIGN IN WITH APPLE CHO IOS)

> **Mục tiêu:** Đáp ứng điều kiện tiên quyết của Apple Store Review Guidelines 4.8 khi cung cấp đăng nhập mạng xã hội trên iOS, kích hoạt Capability trên Apple Developer Portal và triển khai API xác thực JWT Identity Token trên Backend.

---

## ⚖️ KHÂU 11: QUY ĐỊNH APP STORE & BẢN CHẤT KỸ THUẬT

### 11.1. Quy Định Sống Còn Của Apple (App Store Review Guideline 4.8)
- **Bắt buộc tương đương:** Bất kỳ ứng dụng nào trên App Store có tích hợp đăng nhập bên thứ ba (Google hoặc Facebook) thì **bắt buộc phải có lựa chọn Sign in with Apple** với vị trí và trải nghiệm tương đương.
- Nếu nộp ứng dụng lên App Store mà có Google/Facebook nhưng thiếu Apple Sign-In $\rightarrow$ **Apple sẽ từ chối phê duyệt (REJECT 100%)**.
- **Xử lý đa nền tảng:**
  - Trên **iOS**: Nút "Tiếp tục với Apple" hiển thị đầy đủ.
  - Trên **Android & Web**: Nút này tự động ẩn (mã nguồn ứng dụng tại [src/screens/auth/LoginScreen.tsx](file:///c:/Users/phamk/Downloads/mobile_app/src/screens/auth/LoginScreen.tsx) đã xử lý chuẩn: `{vm.isAppleAvailable ? <AppleSignInButton ... /> : null}`).

### 11.2. "Cạm Bẫy Lần Đầu Tiên" Của Apple (First-Time Payload Trap)
- **Apple chỉ gửi Họ tên và Email DUY NHẤT LẦN ĐẦU TIÊN:**
  - Ở lần đầu tiên người dùng bấm đăng nhập: Apple trả về đầy đủ `identityToken`, `authorizationCode`, `fullName`, `email`, và `user` (chuỗi ID người dùng dạng `001234.abcdef...`).
  - Từ lần thứ 2 trở đi: Apple **KHÔNG BAO GIỜ GỬI LẠI** `email` và `fullName` (2 trường này sẽ trả về `null`).
  - 👉 **Quy tắc bắt buộc cho Backend:** Backend phải lưu trữ `user` (Apple Sub ID) làm khóa định danh duy nhất (Unique Key) vào Database ngay ở lần đầu tiên.
- **Tính năng Ẩn Email (Hide My Email / Private Relay):**
  - Người dùng có thể chọn ẩn email thật. Khi đó Apple sinh email ảo dạng `xyz@privaterelay.appleid.com`. Đây là email hợp lệ, Apple sẽ tự động chuyển tiếp (forward) thư đến email thật của người dùng.

---

## 🌐 KHÂU 12: CẤU HÌNH TRÊN APPLE DEVELOPER PORTAL

Để bản build iOS có quyền thực hiện Apple Sign-In, chủ tài khoản Apple Developer cần thực hiện:

1. Truy cập [Apple Developer Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources/identifiers/list).
2. Vào mục **Identifiers** $\rightarrow$ Tìm kiếm App ID:
   - App ID chính thức: `net.earlysigns.app`
   - App ID dev client: `net.earlysigns.app.dev`
3. Bấm vào App ID $\rightarrow$ Cuộn xuống danh sách **Capabilities** $\rightarrow$ Tích chọn: **"Sign in with Apple"**.
4. Bấm nút **Edit** cạnh Sign in with Apple $\rightarrow$ Chọn **Enable as a primary App ID** $\rightarrow$ Bấm **Save**.
5. *(Cấu hình phía Mobile App đã được thiết lập sẵn với `"usesAppleSignIn": true` trong `app.json` và `app.config.js`). Khi chạy lệnh `eas build --platform ios`, EAS CLI sẽ tự động tạo Provisioning Profile chứa Entitlement `com.apple.developer.applesignin`.*

---

## ⚡ KHÂU 13: HƯỚNG DẪN XÂY DỰNG API XÁC THỰC TRÊN BACKEND (`POST /api/auth/apple`)

> 💡 **Cơ chế xác thực:** Backend EarlySigns không cần qua Firebase Auth. `identity_token` của Apple là một JSON Web Token (JWT) được ký bằng thuật toán RS256. Backend chỉ cần giải mã và verify bằng Public Keys chính thức của Apple tại `https://appleid.apple.com/auth/keys`.

### 13.1. Đặc Tả Endpoint Cho Backend

#### `POST /api/auth/apple`
- **Quyền truy cập:** Public (không yêu cầu Bearer token).
- **Mục đích:** Xác thực Apple Identity Token, tạo/lấy tài khoản người dùng và cấp JWT session của EarlySigns.

**Request Body:**
| Trường dữ liệu | Kiểu | Bắt buộc | Ghi chú |
| --- | --- | :---: | --- |
| `identity_token` | string | Có | Mã JWT nhận từ Apple Authentication SDK trên iOS |
| `authorization_code` | string | Không | Mã ủy quyền của Apple |
| `user` | string | Có | Apple User ID duy nhất (ví dụ: `001234.abcdef...`) |
| `email` | string | Không | Email của người dùng (chỉ có ở lần đầu tiên) |
| `full_name` | string | Không | Họ tên người dùng (chỉ có ở lần đầu tiên) |
| `device_id` | string | Không | Mã định danh thiết bị |

**Response `200` (Thành công):**
```json
{
  "ok": true,
  "token": "<JWT_AUTH_TOKEN>",
  "email": "user@example.com",
  "user_id": "<USER_UUID>",
  "is_new_user": false
}
```

### 13.2. Mã Nguồn Mẫu Cho Backend (Python / FastAPI)

```python
import jwt
import httpx
from fastapi import APIRouter, HTTPException

router = APIRouter()

APPLE_PUBLIC_KEYS_URL = "https://appleid.apple.com/auth/keys"

@router.post("/api/auth/apple")
async def login_apple(payload: dict):
    identity_token = payload.get("identity_token")
    apple_user_id = payload.get("user")
    email = payload.get("email")
    full_name = payload.get("full_name")
    device_id = payload.get("device_id")

    if not identity_token:
        raise HTTPException(status_code=400, detail="Missing identity_token")

    try:
        # 1. Lấy danh sách Public Keys từ Apple
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(APPLE_PUBLIC_KEYS_URL)
            jwks = resp.json()

        # 2. Giải mã và verify JWT identity_token từ Apple
        header = jwt.get_unverified_header(identity_token)
        key = next(k for k in jwks["keys"] if k["kid"] == header["kid"])
        public_key = jwt.algorithms.RSAAlgorithm.from_jwk(key)

        decoded = jwt.decode(
            identity_token,
            public_key,
            algorithms=["RS256"],
            audience="net.earlysigns.app",      # Khớp chính xác Bundle ID iOS
            issuer="https://appleid.apple.com"
        )
        
        apple_sub = decoded.get("sub")
        verified_email = decoded.get("email") or email or f"{apple_sub}@apple.com"

        # 3. Tìm hoặc tạo User trong Database EarlySigns
        user, is_new = await get_or_create_user(
            email=verified_email,
            apple_user_id=apple_sub,
            full_name=full_name,
            device_id=device_id
        )

        # 4. Trả về JWT Session Token của EarlySigns
        jwt_token = create_access_token(user_id=user.id)
        return {
            "ok": True,
            "token": jwt_token,
            "email": user.email,
            "user_id": str(user.id),
            "is_new_user": is_new
        }
    except Exception as err:
        raise HTTPException(status_code=401, detail="Invalid Apple identity token")
```