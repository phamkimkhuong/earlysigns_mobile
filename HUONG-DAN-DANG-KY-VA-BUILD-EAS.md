# 📱 TÀI LIỆU HƯỚNG DẪN BÀN GIAO: ĐĂNG KÝ EXPO & VẬN HÀNH BUILD CLOUD (EAS BUILD)
**Dự án:** EarlySigns Mobile Application (iOS & Android)  
**Môi trường:** Expo SDK 57 • React Native 0.86 • Development Build (EAS)  
**Đối tượng áp dụng:** Khách hàng, Đội ngũ Quản trị & Vận hành dự án  

---

## 📑 MỤC LỤC
1. [Giới thiệu về Hạ tầng Expo EAS Build](#1-giới-thiệu-về-hạ-tầng-expo-eas-build)
2. [Bước 1: Đăng ký Tài khoản Expo Cloud (Miễn phí)](#2-bước-1-đăng-ký-tài-khoản-expo-cloud-miễn-phí)
3. [Bước 2: Cài đặt Công cụ & Đăng nhập trên Máy tính](#3-bước-2-cài-đặt-công-cụ--đăng-nhập-trên-máy-tính)
4. [Bước 3: Chuyển giao & Liên kết Dự án vào Tài khoản Mới](#4-bước-3-chuyển-giao--liên-kết-dự-án-vào-tài-khoản-mới)
5. [Bước 4: Quy trình 1-Click Build Ứng dụng](#5-bước-4-quy-trình-1-click-build-ứng-dụng)
6. [Bước 5: Tải File & Cài đặt Ứng dụng trên Điện thoại](#6-bước-5-tải-file--cài-đặt-ứng-dụng-trên-điện-thoại)
7. [Bước 6: Cơ chế Quản lý Chứng chỉ (Keystore & Certificates)](#7-bước-6-cơ-chế-quản-lý-chứng-chỉ-keystore--certificates)
8. [Bước 7: Hướng dẫn Lấy SHA-1 & Cấu hình Đăng nhập Google (Google Sign-In)](#8-bước-7-hướng-dẫn-lấy-sha-1--cấu-hình-đăng-nhập-google-google-sign-in)
9. [Bước 8: Câu hỏi thường gặp & Khắc phục sự cố (FAQ)](#9-bước-8-câu-hỏi-thường-gặp--khắc-phục-sự-cố-faq)

---

## 1. Giới thiệu về Hạ tầng Expo EAS Build
Hệ thống EarlySigns sử dụng **EAS Build (Expo Application Services)** — hạ tầng điện toán đám mây chính thức của Expo:
- **Không cần máy Mac cấu hình khủng:** Bạn có thể build ứng dụng **iOS (.ipa)** trực tiếp từ máy tính Windows/Linux thông qua máy chủ đám mây của Expo.
- **Tự động hóa 100% chứng chỉ:** Không lo mất file Android Keystore hay cấu hình sai Provisioning Profile trên Apple Developer.
- **3 Môi trường độc lập:** Cho phép cài đặt song song cả 3 bản **Dev Client**, **Preview (Test APK)** và **Production** trên cùng một chiếc điện thoại mà không bị xung đột.

---

## 2. Bước 1: Đăng ký Tài khoản Expo Cloud (Miễn phí)
Tài khoản Expo Cloud dùng để lưu trữ chứng chỉ, quản lý các bản build và theo dõi tiến độ nộp app lên Store.

1. Truy cập trang đăng ký chính thức của Expo:  
   👉 **[https://expo.dev/signup](https://expo.dev/signup)**
2. Nhập các thông tin cơ bản:
   - **Email:** Nhập email công ty/quản trị của bạn.
   - **Username:** Tên định danh (Ví dụ: `earlysigns-admin` hoặc tên công ty). *Lưu ý: Ghi nhớ Username này để điền vào cấu hình dự án.*
   - **Password:** Mật khẩu bảo mật.
3. Bấm **"Create your account"**.
4. Mở hộp thư email để bấm nút xác thực tài khoản (Verify Email).

> 💡 **Gói dịch vụ:** Gói Free của Expo hoàn toàn miễn phí, cung cấp sẵn 30 lượt build Android và 30 lượt build iOS mỗi tháng, đáp ứng thoải mái nhu cầu kiểm thử và phát hành.

---

## 3. Bước 2: Cài đặt Công cụ & Đăng nhập trên Máy tính

Bạn không cần cài đặt phức tạp, chỉ cần máy tính đã cài đặt **Node.js** (khuyến nghị phiên bản 18, 20 hoặc 22).

### Cách 1: Đăng nhập nhanh bằng `npx` (Không cần cài đặt trước)
Mở cửa sổ dòng lệnh (Terminal / PowerShell / CMD) tại thư mục dự án và chạy:
```bash
npx eas-cli login
```

### Cách 2: Cài đặt công cụ `eas-cli` vĩnh viễn trên máy
Nếu bạn thường xuyên build, hãy cài đặt công cụ toàn cục:
```bash
npm install -g eas-cli
```
Sau đó đăng nhập:
```bash
eas login
```

### Quá trình đăng nhập:
1. Terminal sẽ hiện thông báo:
   ```text
   Log in to EAS
   Email or username: <Nhập Email hoặc Username bạn vừa đăng ký>
   Password: <Nhập mật khẩu - Terminal sẽ ẩn ký tự vì lý do bảo mật>
   ```
2. Sau khi nhập xong, Terminal hiện:  
   `✔ Logged in to Expo as <tên_tài_khoản_của_bạn>` là đã thành công!

---

## 4. Bước 3: Chuyển giao & Liên kết Dự án vào Tài khoản Mới

Để các bản build được lưu vào đúng Dashboard tài khoản của bạn, bạn thực hiện **1 trong 2 cách** sau:

### Cách A: Tự động qua lệnh `npx eas init` (Khuyên dùng - Nhanh nhất)
Tại thư mục mã nguồn dự án, chạy lệnh:
```bash
npx eas init
```
Hệ thống sẽ hỏi:
```text
? Which account should own this project?
> your-username (Tài khoản của bạn)
? Would you like to create a new project on Expo?
> Yes
```
👉 EAS sẽ tạo một Project ID mới trên tài khoản của bạn (Ví dụ dạng chuỗi UUID: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`).  

> ⚠️ **BẮT BUỘC PHẢI CẬP NHẬT 3 VỊ TRÍ TRONG TỆP `app.json`:**  
> Nếu bạn giữ nguyên thông tin tài khoản của lập trình viên (`phamkhuong436`), khi ra lệnh build hệ thống Expo EAS sẽ báo lỗi **Forbidden (Không có quyền truy cập vào dự án @phamkhuong436/earlysigns)**.  
> Do đó, bạn hãy mở tệp `app.json` tại thư mục gốc dự án và cập nhật chính xác **3 vị trí** sau:

```json
{
  "expo": {
    "name": "EarlySigns",
    "slug": "earlysigns",

    "// 1. ĐỔI OWNER THÀNH USERNAME EXPO CỦA BẠN": "",
    "owner": "<ten-tai-khoan-expo-cua-ban>",

    "icon": "./assets/icon.png",
    "...": "(giữ nguyên các cấu hình khác)",

    "// 2. ĐỔI PROJECT ID TRONG URL CẬP NHẬT OTA": "",
    "updates": {
      "url": "https://u.expo.dev/<ma-project-id-moi-cua-ban>"
    },

    "// 3. GIỮ NGUYÊN CHIẾN LƯỢC PHIÊN BẢN": "",
    "runtimeVersion": {
      "policy": "appVersion"
    },

    "// 4. ĐỔI PROJECT ID ĐỂ LIÊN KẾT EAS BUILD": "",
    "extra": {
      "eas": {
        "projectId": "<ma-project-id-moi-cua-ban>"
      }
    }
  }
}
```

---

### Cách B: Cấu hình thủ công hoàn toàn qua tệp `app.json`
Nếu bạn không dùng `npx eas init`:
1. Mở tệp `app.json`, sửa `"owner"` thành Username Expo của bạn.
2. Xóa trường `"updates"` và `"extra"` cũ (hoặc điền ID mới của bạn).
3. Chạy lệnh:
   ```bash
   npx eas project:init
   ```
   EAS sẽ tự động sinh Project ID mới trên tài khoản của bạn và bạn điền ID đó vào cả 2 vị trí `"updates.url"` và `"extra.eas.projectId"` như mẫu ở trên.

---

## 5. Bước 4: Quy trình 1-Click Build Ứng dụng

Mã nguồn đã được tích hợp sẵn các lệnh thực thi rút gọn trong `package.json`. Dưới đây là bảng tra cứu nhanh toàn bộ các lệnh:

| Lệnh (Command) | Chức năng chi tiết | Khi nào sử dụng? |
| :--- | :--- | :--- |
| `npm start` | Khởi động Metro Bundler kết nối với app Dev Client | Khi bắt đầu lập trình code hàng ngày |
| `npm run android` | Tự động biên dịch mã native và chạy app trên máy Android thật / máy ảo local | Khi debug native local trên máy Android |
| `npm run ios` | Tự động biên dịch mã native và chạy app trên máy ảo iOS local (trên Mac) | Khi debug native local trên máy macOS |
| `npm run typecheck` | Rà soát toàn bộ lỗi định kiểu dữ liệu tĩnh TypeScript (`tsc --noEmit`) | Trước khi commit code hoặc ra lệnh build |
| `npm run lint` | Kiểm tra quy chuẩn chất lượng và format code theo ESLint của Expo | Đảm bảo code sạch, không có biến thừa |
| `npm test` | Chạy 61 kịch bản kiểm thử tự động (Unit Tests) nghiệp vụ âm và thanh toán | Đảm bảo 100% logic không bị hồi quy |
| `npm run build:dev:android` | Build Cloud bản Dev Client xuất file APK cho Android | Khi thêm thư viện native mới cần build lại app dev |
| `npm run build:dev:ios` | Build Cloud bản Dev Client cho thiết bị iPhone thật | Khi cần test app dev trên iPhone thật |
| `npm run build:dev:sim` | Build Cloud bản Dev Client cho máy ảo iOS Simulator (miễn phí, không cần Apple Dev) | Khi test app dev trên máy ảo Mac |
| `npm run build:preview:android` | **Build Cloud xuất file APK thử nghiệm độc lập** cho khách hàng & tester | 👉 **Khuyên dùng:** Gửi file APK cho khách hàng test trực tiếp |
| `npm run build:preview:ios` | Build Cloud bản Preview thử nghiệm cho iOS (TestFlight / Ad-hoc) | Gửi cho tester iOS nội bộ kiểm thử |
| `npm run build:prod:android` | Build Cloud bản Production xuất file `.aab` (Android App Bundle) | Chuẩn bị nộp app lên Google Play Store |
| `npm run build:prod:ios` | Build Cloud bản Production xuất file `.ipa` chuẩn App Store | Chuẩn bị nộp app lên Apple App Store |
| `npm run build:prod` | Build Cloud cả 2 bản Production (Android + iOS) cùng một lúc | Khi phát hành bản cập nhật chính thức |
| `npm run submit:prod` | Tự động tải bản build Production lên Google Play và TestFlight/App Store | Nộp app tự động không cần upload thủ công |

---

### 🧪 1. Build bản thử nghiệm cho Tester / Khách hàng (Tạo file APK)
*Dành cho điện thoại Android, tải file APK cài trực tiếp, không cần tài khoản Google Play.*
```bash
npm run build:preview:android
```

### 🛠️ 2. Build bản Lập trình viên (Development Client)
*Dành cho lập trình viên cần debug mã nguồn, kết nối Metro server.*
- Cho máy Android thật:
  ```bash
  npm run build:dev:android
  ```
- Cho máy iPhone thật:
  ```bash
  npm run build:dev:ios
  ```
- Cho máy ảo iOS Simulator (trên máy Mac, không cần tài khoản Apple Developer trả phí):
  ```bash
  npm run build:dev:sim
  ```

### 🚀 3. Build bản Phát hành chính thức lên Store (Production)
*Dành cho việc xuất bản lên Google Play Store và Apple App Store.*
- Build bản Android (Xuất file `.aab` - Android App Bundle chuẩn Google Play):
  ```bash
  npm run build:prod:android
  ```
- Build bản iOS (Xuất file `.ipa` chuẩn App Store):
  ```bash
  npm run build:prod:ios
  ```
- Build cả 2 hệ điều hành cùng lúc:
  ```bash
  npm run build:prod
  ```

---

## 6. Bước 5: Tải File & Cài đặt Ứng dụng trên Điện thoại

Khi lệnh build được gửi đi:
1. Terminal sẽ cung cấp một đường link Dashboard theo dõi thời gian thực (Ví dụ: `https://expo.dev/accounts/.../builds/...`).
2. Máy chủ Expo sẽ tự động biên dịch toàn bộ mã nguồn trên đám mây (Cloud). Quá trình thường mất từ **8 - 15 phút**.
3. Khi hoàn tất:
   - Terminal sẽ hiển thị **Mã QR Code** và **Đường link tải trực tiếp**.
   - **Với Android (.apk):** Dùng camera điện thoại quét mã QR hoặc mở link trên trình duyệt điện thoại để tải file `.apk` về và bấm Cài đặt ngay.
   - **Với iOS (.ipa):** Có thể cài trực tiếp qua Apple TestFlight hoặc trang cài đặt nội bộ của Expo.

---

## 7. Bước 6: Cơ chế Quản lý Chứng chỉ (Keystore & Certificates)

Trong lần build đầu tiên, hệ thống EAS sẽ hỏi bạn về việc khởi tạo khóa ký ứng dụng:

```text
? Generate a new Android Keystore?
> Yes, generate a new keystore (Khuyên dùng)
```
- **Hãy chọn `Yes`**: Expo sẽ tự động tạo một cặp khóa mã hóa bảo mật chuẩn SHA-256 cho bạn và lưu trữ an toàn trên dịch vụ đám mây bảo mật của Expo.
- **Không lo mất khóa:** Ngay cả khi bạn đổi máy tính hoặc format ổ cứng, khóa ký ứng dụng vẫn được lưu an toàn trên tài khoản Expo, đảm bảo việc cập nhật các phiên bản tiếp theo không bao giờ bị gián đoạn.
- **Sao lưu chứng chỉ (Nếu muốn lưu về máy):** Bạn có thể tải chứng chỉ về máy tính bất kỳ lúc nào bằng lệnh:
  ```bash
  npx eas credentials
  ```

---

## 8. Bước 7: Hướng dẫn Lấy SHA-1 & Cấu hình Đăng nhập Google (Google Sign-In)

> ⚠️ **LƯU Ý CỐT LÕI KHI BÀN GIAO:**  
> Khi bạn chuyển dự án sang tài khoản Expo mới của riêng bạn, hệ thống EAS Cloud sẽ tự động sinh ra một bộ khóa ký ứng dụng (Keystore) mới tương ứng với tài khoản của bạn.  
> Do đó, **mã vân tay chứng chỉ (SHA-1 Fingerprint) trên tài khoản của bạn sẽ khác với tài khoản của đội ngũ lập trình viên**.  
> Để tính năng **Đăng nhập Google** hoạt động chuẩn xác trên các bản build của bạn, bạn cần thực hiện theo các bước dưới đây để khai báo mã SHA-1 mới này với Google.

### Bước 7.1: Chạy lệnh lấy mã SHA-1 của từng bản build

Tại thư mục mã nguồn dự án, mở Terminal và chạy lệnh:
```bash
npx eas credentials
```

1. Chọn nền tảng: **`Android`**
2. Chọn profile cần lấy mã:
   - **Bản Lập trình viên:** Chọn profile `development`
   - **Bản Thử nghiệm Tester (APK):** Chọn profile `preview`
   - **Bản Phát hành chính thức:** Chọn profile `production`
3. Terminal sẽ hiển thị chi tiết chứng chỉ Keystore:
   ```text
   Keystore:
     SHA-1 Fingerprint: XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX
   ```
4. 👉 **Sao chép (Copy) chuỗi SHA-1 Fingerprint này lại.**

---

### Bước 7.2: Cấu hình trên Google Cloud Console (hoặc Firebase Console)

Google bảo mật bằng cách kiểm tra nghiêm ngặt cặp đôi **`Package Name + Mã SHA-1 Fingerprint`**.

#### 1. Tạo Web Client ID (Dùng chung duy nhất 1 ID cho cả 3 môi trường):
1. Truy cập: 👉 [https://console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials) *(hoặc Firebase Console > Authentication > Sign-in method > Google)*.
2. Bấm **Create Credentials (Tạo thông tin xác thực)** -> Chọn **OAuth client ID**.
3. Chọn Application type: **Web application**.
4. Đặt tên: `EarlySigns Web Client` -> Bấm **Create**.
5. Copy mã Client ID vừa được tạo (dạng: `xxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com`).
6. Mở tệp `.env` trong thư mục gốc dự án và dán vào:
   ```env
   EXPO_PUBLIC_GOOGLE_CLIENT_ID=xxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com
   ```
   *(Web Client ID này chỉ cần tạo 1 lần duy nhất và dùng chung cho cả 3 bản Dev, Preview và Production).*

#### 2. Tạo Android Client ID tương ứng cho từng bản cài đặt:
Tiếp tục tại trang Google Cloud Credentials, bấm **Create Credentials** -> **OAuth client ID** -> Chọn Application type: **Android**:

- **Cho bản Lập trình viên (Development):**
  - **Package Name:** `net.earlysigns.android.dev`
  - **SHA-1 certificate fingerprint:** Dán mã SHA-1 lấy từ profile `development` ở Bước 7.1.
- **Cho bản Thử nghiệm Tester (Preview APK):**
  - **Package Name:** `net.earlysigns.android.preview`
  - **SHA-1 certificate fingerprint:** Dán mã SHA-1 lấy từ profile `preview` ở Bước 7.1.
- **Cho bản Phát hành chính thức (Production):**
  - **Package Name:** `net.earlysigns.android`
  - **SHA-1 certificate fingerprint:** Dán mã SHA-1 lấy từ profile `production` ở Bước 7.1.

> 💡 **Mẹo khi đưa app lên Google Play Store:**  
> Khi bạn tải file `.aab` lên Google Play Console, Google sẽ kích hoạt tính năng **Google Play App Signing**. Bạn chỉ cần vào Google Play Console: *Release > Setup > App integrity* -> Copy thêm dòng **App signing key certificate (SHA-1 fingerprint)** và dán bổ sung vào danh sách OAuth Client ID Android trên Google Cloud Console là đảm bảo 100% người dùng tải app về máy đăng nhập thành công.

---

## 9. Bước 8: Câu hỏi thường gặp & Khắc phục sự cố (FAQ)

### Q1: Cài đặt cả 3 bản Dev, Preview và Production trên cùng 1 điện thoại có bị ghi đè không?
**Trả lời:** **Hoàn toàn KHÔNG**. Hệ thống đã được cấu hình cơ chế *App Variants* thông minh:
- Bản Dev: Tên `EarlySigns (Dev)`, Package: `net.earlysigns.android.dev`
- Bản Preview: Tên `EarlySigns (Prev)`, Package: `net.earlysigns.android.preview`
- Bản Production: Tên `EarlySigns`, Package: `net.earlysigns.android`  
Cả 3 bản là 3 app hoàn toàn riêng biệt trên hệ điều hành.

### Q2: Tôi không dùng máy Mac thì có build được file iOS (.ipa) không?
**Trả lời:** **Được 100%**. Vì toàn bộ quá trình biên dịch diễn ra trên máy chủ macOS trên mây của Expo (EAS Cloud), bạn có thể dùng máy tính Windows hoặc Linux để ra lệnh build iOS bình thường.

### Q3: Muốn tự động đẩy bản build lên Google Play / App Store thì làm thế nào?
**Trả lời:** Chạy lệnh:
```bash
npm run submit:prod
```
EAS sẽ tự động nộp bản build vào đường đua **Kiểm thử nội bộ (Internal Testing)** của Google Play Console và TestFlight của Apple App Store Connect.

---
**Tài liệu được phát hành bởi Đội ngũ Phát triển EarlySigns.**  
*Mọi thắc mắc kỹ thuật trong quá trình chuyển giao, vui lòng liên hệ đội ngũ lập trình để được hỗ trợ tức thì.*
