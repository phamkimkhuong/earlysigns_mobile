# 💳 TÀI LIỆU HƯỚNG DẪN THIẾT LẬP REVENUECAT & IN-APP PURCHASE (IAP)
**Dự án:** EarlySigns Mobile Application (iOS & Android)  
**Môi trường:** Expo SDK 57 • React Native 0.86 • StoreKit 2 & Google Play Billing  
**Thông số Production:**
- **iOS Bundle Identifier:** `net.earlysigns.android`
- **Android Package Name:** `net.earlysigns.android`
- **Mã Quyền Lợi Gói Pro (Entitlement ID):** `pro` (Bắt buộc viết thường chính xác)  
**Đối tượng áp dụng:** Khách hàng, Đội ngũ Quản trị & Kỹ thuật Vận hành  

---

## 📑 MỤC LỤC
1. [Bản chất RevenueCat & Tại sao Apple/Google bắt buộc sử dụng](#1-bản-chất-revenuecat--tại-sao-applegoogle-bắt-buộc-sử-dụng)
2. [Bảng So Sánh 4 Giải Pháp Thanh Toán](#2-bảng-so-sánh-4-giải-pháp-thanh-toán)
3. [Bước 1: Tạo Tài Khoản & Dự Án Trên RevenueCat](#3-bước-1-tạo-tài-khoản--dự-án-trên-revenuecat)
4. [Bước 2: Cấu Hình iOS (Lấy In-App Purchase Key .p8 Từ Apple)](#4-bước-2-cấu-hình-ios-lấy-in-app-purchase-key-p8-từ-apple)
5. [Bước 3: Cấu Hình Android (Lấy Service Account JSON Từ Google)](#5-bước-3-cấu-hình-android-lấy-service-account-json-từ-google)
6. [Bước 4: Cấu Hình Quyền Lợi (Entitlement) & Gói Cước (Packages)](#6-bước-4-cấu-hình-quyền-lợi-entitlement--gói-cước-packages)
7. [Bước 5: Cấu Hình API Keys & Hướng Dẫn Tích Hợp Dành Cho Backend](#7-bước-5-cấu-hình-api-keys--hướng-dẫn-tích-hợp-dành-cho-backend)
8. [Bước 6: Quy Trình Kiểm Thử Giao Dịch (Sandbox & License Testing)](#8-bước-6-quy-trình-kiểm-thử-giao-dịch-sandbox--license-testing)
9. [Bảng Tổng Hợp Thông Số & Khắc Phục Sự Cố (Cheat Sheet & FAQ)](#9-bảng-tổng-hợp-thông-số--khắc-phục-sự-cố-cheat-sheet--faq)

---

## 1. Bản chất RevenueCat & Tại sao Apple/Google bắt buộc sử dụng

### 1.1. RevenueCat là gì?
RevenueCat **không phải là cổng thanh toán trung gian thu hộ** (khác biệt hoàn toàn với MoMo, VNPay, ZaloPay hay PayOS).  
RevenueCat là **hạ tầng quản lý thuê bao (In-App Subscription Infrastructure)** tiêu chuẩn số 1 thế giới dành cho ứng dụng di động, kết nối trực tiếp với Apple StoreKit và Google Play Billing.

### 1.2. Quy định nghiêm ngặt từ Apple và Google (App Store Guideline 3.1.1)
- **Quy định bắt buộc:** Mọi ứng dụng di động bán tính năng số, nội dung số, mở khóa bài học, tài khoản Pro, hội viên VIP... **bắt buộc 100% phải thanh toán qua hệ sinh thái của Apple (StoreKit) và Google (Google Play Billing)**.
- **Rủi ro nếu vi phạm:** Nếu gắn cổng thanh toán web (VNPay, PayOS, quét mã QR...) trực tiếp vào ứng dụng để mở khóa tính năng, ứng dụng sẽ bị Apple và Google **từ chối duyệt (Reject)** hoặc **xóa khỏi kho ứng dụng vĩnh viễn**.

### 1.3. Cơ chế dòng tiền & Chi phí
- 💰 **Dòng tiền đi thẳng vào tài khoản của bạn:** 100% tiền khách hàng trả bằng thẻ VISA/MasterCard/MoMo trên Apple ID hoặc Google Play sẽ được **Apple và Google quyết toán trực tiếp vào tài khoản ngân hàng của công ty bạn**. RevenueCat **hoàn toàn KHÔNG giữ tiền**.
- 🆓 **Chi phí RevenueCat miễn phí 100%:** RevenueCat cung cấp gói Free Tier hoàn toàn miễn phí cho đến khi doanh thu đạt **$2.500 USD/tháng** (tương đương khoảng **63.000.000 VNĐ/tháng**).

---

## 2. Bảng So Sánh 4 Giải Pháp Thanh Toán

| Giải pháp | Cách thức hoạt động | Chi phí dịch vụ | Độ phức tạp kỹ thuật | Rủi ro bị Apple/Google từ chối |
| :--- | :--- | :--- | :--- | :--- |
| **1. RevenueCat (Đang triển khai)** | Hạ tầng Subscription chuẩn toàn cầu, xử lý biên nhận và webhook | Miễn phí đến $2.500/tháng (sau đó 1%) | 🟢 **Rất thấp** (Đã tích hợp xong trong app) | 🟢 **Tuyệt đối an toàn** (Apple & Google khuyên dùng) |
| **2. Tự code trực tiếp (StoreKit 2 & Google Billing)** | Tự viết backend giải mã JWS token và Pub/Sub notification | Miễn phí (0đ) | 🔴 **Cực kỳ cao** (Mất 4-8 tuần backend chuyên sâu) | 🟡 Thấp nếu làm đúng chuẩn bảo mật |
| **3. Đối thủ RevenueCat (Adapty, Qonversion)** | Tương tự RevenueCat | Miễn phí giai đoạn đầu, sau đó tính phí | 🟢 Thấp | 🟢 Rất an toàn |
| **4. Cổng nội địa VN (PayOS, MoMo, VNPay)** | Quét mã QR, thẻ ATM nội địa | ~1.5% - 2.5% mỗi giao dịch | 🟡 Trung bình | 🔴 **Bị Reject 100%** khi bán gói Pro trên App |

---

## 3. Bước 1: Tạo Tài Khoản & Dự Án Trên RevenueCat

1. Truy cập trang chủ RevenueCat:  
   👉 **[https://www.revenuecat.com/](https://www.revenuecat.com/)** → Bấm **Sign Up** (Miễn phí).
2. Đăng ký bằng Email công ty hoặc tài khoản Google/GitHub quản trị.
3. Sau khi đăng nhập, tại màn hình Dashboard, bấm **Create New Project**:
   - **Project Name:** Nhập `EarlySigns`
   - Bấm **Create Project**.

---

## 4. Bước 2: Cấu Hình iOS (Lấy In-App Purchase Key .p8 Từ Apple)

Apple quản lý các khóa giao dịch thông qua trang quản trị **App Store Connect**.

### 4.1. Tạo In-App Purchase Key trên App Store Connect
1. Đăng nhập trang quản trị Apple: **[https://appstoreconnect.apple.com/](https://appstoreconnect.apple.com/)** (Bằng tài khoản Apple Developer của doanh nghiệp).
2. Trên thanh menu trên cùng, bấm chọn mục **Users and Access (Người dùng và Quyền truy cập)**.
3. Chuyển sang tab **Integrations** (hoặc tab **Keys** tùy giao diện).
4. Ở cột danh mục bên trái, chọn **In-App Purchase (Giao dịch trong ứng dụng)**.
5. Bấm dấu cộng **(+)** để tạo khóa mới:
   - **Name (Tên khóa):** Nhập `RevenueCat In-App Purchase Key`.
   - Bấm **Generate**.

### 4.2. Thu thập 4 thông số bắt buộc
Sau khi tạo, bạn cần lấy đủ 4 thông tin:
1. **Tệp khóa `.p8`:** Bấm nút **Download API Key** để tải về tệp có đuôi `.p8` (Ví dụ: `SubscriptionKey_ABC123XYZ.p8`).
   > [!CAUTION]
   > **Apple chỉ cho phép tải tệp `.p8` này DUY NHẤT 1 LẦN**. Hãy cất giữ cẩn thận trong thư mục an toàn của công ty. Nếu làm mất, bạn sẽ phải thu hồi và tạo khóa mới.
2. **Key ID:** `3GVVJ77PH8` (Dãy 10 ký tự của khóa In-App Purchase đã tạo).
3. **Issuer ID:** `30415671-8a58-418c-8dc9-5b79c34796dc` (Mã UUID của tổ chức trên App Store Connect).
4. **App Bundle ID:** `net.earlysigns.app`

### 4.3. Kết nối vào RevenueCat
1. Mở RevenueCat Dashboard → Chọn Project `EarlySigns` → Menu trái: **Project Settings** → **Apps** → Bấm **+ New App** → Chọn **App Store**.
2. Điền các trường:
   - **App name:** `EarlySigns iOS`
   - **Bundle ID:** `net.earlysigns.app`
   - **In-app purchase key (.p8 file):** Bấm tải lên tệp `.p8` vừa tải ở trên.
   - **Key ID:** `3GVVJ77PH8`
   - **Issuer ID:** `30415671-8a58-418c-8dc9-5b79c34796dc`
3. Bấm **Save Changes**.

---

## 5. Bước 3: Cấu Hình Android (Lấy Service Account JSON Từ Google)

Google Play Console xác thực quyền kiểm tra hóa đơn thông qua **Google Cloud Service Account**.

> [!IMPORTANT]
> Khách hàng đã chỉ định Package Name chính thức cho Production trên Android là:  
> **`net.earlysigns.android`**

### 5.1. Liên kết Google Play Console với Google Cloud
1. Đăng nhập trang quản trị: **[https://play.google.com/console](https://play.google.com/console)**.
2. Ở menu bên trái, cuộn xuống mục **Setup (Cài đặt)** → Chọn **API access (Quyền truy cập API)**.
3. Nếu tài khoản chưa liên kết: Bấm nút **Link a project (Liên kết dự án)** → Chọn tạo dự án mới hoặc chọn dự án Google Cloud có sẵn → Bấm **Link project**.

### 5.2. Kích hoạt Google Play Developer API trên Google Cloud
1. Truy cập **Google Cloud Console**: **[https://console.cloud.google.com/](https://console.cloud.google.com/)**.
2. Chọn đúng Project Google Cloud vừa liên kết ở Bước 5.1.
3. Vào mục **APIs & Services** → **Library** → Tìm kiếm: `Google Play Android Developer API` → Bấm **Enable (Bật)**.

### 5.3. Tạo Service Account và tải file JSON
1. Quay lại trang **API access** trên Google Play Console, cuộn xuống mục **Service accounts (Tài khoản dịch vụ)**.
2. Bấm nút **Create new service account** → Một hộp thoại xuất hiện → Bấm vào đường link dẫn sang Google Cloud Console.
3. Tại trang Google Cloud Console:
   - Bấm **+ Create Service Account** ở thanh trên cùng.
   - **Service account name:** Đặt tên gợi nhớ, ví dụ: `revenuecat-billing-service`.
   - Bấm **Create and Continue** → Phần Role (Vai trò) bấm **Continue** (bỏ qua vì quyền sẽ được phân ở Google Play Console) → Bấm **Done**.
4. Trong danh sách tài khoản dịch vụ vừa tạo:
   - Bấm vào dấu **3 chấm dọc** bên phải tài khoản đó (hoặc bấm vào tên tài khoản).
   - Chọn tab **Keys** → Bấm **Add Key** → Chọn **Create new key**.
   - Chọn định dạng: **JSON** → Bấm **Create**.
   - Trình duyệt sẽ tự động tải về 1 tệp đuôi `.json` (Ví dụ: `earlysigns-project-xxxxxx.json`).

### 5.4. Cấp quyền cho Service Account trong Google Play Console
1. Quay trở lại tab trình duyệt **Google Play Console** (trang API Access).
2. Bấm nút **Refresh service accounts (Làm mới)**. Tài khoản vừa tạo ở bước 5.3 sẽ hiển thị.
3. Bấm **Manage permissions (hoặc Grant access)** bên cạnh tài khoản đó:
   - Tab **App permissions:** Chọn ứng dụng EarlySigns với Package Name **`net.earlysigns.app`**.
   - Tab **Account permissions (Quyền tài khoản):** Tích chọn 3 quyền cốt lõi:
     - ✅ **View app information and download bulk reports (read-only)**
     - ✅ **View financial data, orders, and cancellation survey responses**
     - ✅ **Manage orders and subscriptions**
4. Bấm **Save (Lưu)** hoặc **Invite user** để hoàn tất.

### 5.5. Kết nối vào RevenueCat
1. Mở RevenueCat Dashboard → Project `EarlySigns` → **Project Settings** → **Apps** → Bấm **+ New App** → Chọn **Play Store**.
2. Điền các trường:
   - **App name:** `EarlySigns Android`
   - **Google Play Package Name:** **`net.earlysigns.app`**
   - **Service Account credentials JSON:** Bấm **Choose file** và tải tệp `.json` vừa tải ở bước 5.3 lên.
3. Bấm **Save Changes**.

---

## 6. Bước 4: Cấu Hình Quyền Lợi (Entitlement) & Gói Cước (Packages)

RevenueCat sử dụng mô hình: **Store Products → Entitlement → Offering / Packages**.

```mermaid
graph LR
    subgraph RevenueCat Dashboard
        E["Entitlement: earlysigns_pro"] --> OFF["Default Offering"]
        OFF --> PKG1["$rc_monthly (1 Tháng)"]
        OFF --> PKG2["$rc_three_month (3 Tháng)"]
        OFF --> PKG3["$rc_annual (12 Tháng)"]
    end
    
    subgraph App Store & Google Play
        SP1["monthly"] -.-> PKG1
        SP2["Three_months"] -.-> PKG2
        SP3["yearly"] -.-> PKG3
    end
```

### 6.1. Tạo Entitlement (`earlysigns_pro`)
> [!IMPORTANT]
> Mã nguồn ứng dụng Mobile kiểm tra quyền lợi thông qua hằng số:  
> `export const PRO_ENTITLEMENT_ID = "earlysigns_pro";` (và tương thích ngược với `"pro"`).  
> Do đó, **Identifier của Entitlement trên RevenueCat Dashboard nên đặt là `earlysigns_pro`**.

1. Tại RevenueCat Dashboard, menu trái chọn mục **Entitlements**.
2. Bấm **+ New Entitlement**:
   - **Identifier:** `earlysigns_pro`
   - **Description:** `EarlySigns Pro Membership`
3. Bấm **Save**.

### 6.2. Đăng ký Sản phẩm (Products) trên Store & Gắn vào RevenueCat
Các gói thuê bao định kỳ (Auto-renewable Subscriptions) trên App Store Connect và Google Play Console theo cấu hình của khách hàng:

| Gói cước | Product ID trên Store | Loại gói trên RevenueCat | Thời hạn |
| :--- | :--- | :--- | :--- |
| **Gói Tháng** | `monthly` | `$rc_monthly` | 1 tháng |
| **Gói 3 Tháng** | `Three_months` | `$rc_three_month` | 3 tháng |
| **Gói 1 Năm** | `yearly` | `$rc_annual` | 12 tháng (1 năm) |

1. Tại RevenueCat Dashboard → Chọn **Products** → Bấm **+ New Product**:
   - Thêm 3 Product IDs tương ứng: `monthly`, `Three_months`, `yearly`.
   - Gắn Entitlement `earlysigns_pro` vào từng Product.
2. Chọn **Offerings** → Bấm vào Offering mặc định (Identifier `default`):
   - Thêm package `$rc_monthly` và gán Product `monthly`.
   - Thêm package `$rc_three_month` và gán Product `Three_months`.
   - Thêm package `$rc_annual` và gán Product `yearly`.
3. Bấm **Save**.

---

## 7. Bước 5: Cấu Hình API Keys & Hướng Dẫn Tích Hợp Dành Cho Backend

### 7.1. Lấy Public API Keys cho ứng dụng Mobile
1. Tại RevenueCat Dashboard → Menu trái chọn **Project Settings** → **API Keys**.
2. Bạn sẽ thấy 2 khóa Public API Keys được tạo tự động cho 2 nền tảng:
   - **Apple Public API Key:** Dạng `appl_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - **Google Public API Key:** Dạng `goog_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
3. Mở tệp `.env` trong thư mục gốc của dự án Mobile và điền vào:
   ```env
   # RevenueCat Public API Keys
   EXPO_PUBLIC_REVENUECAT_APPLE_KEY=appl_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY=goog_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

### 7.2. Nguyên Tắc Hoạt Động: Mobile Hoàn Toàn Độc Lập (Không Bị Block Bởi Backend)
> [!TIP]
> **Mobile App có thể chạy mua bán thật và nộp lên App Store / Google Play duyệt ngay lập tức mà không cần chờ Backend hoàn thành Webhook!**
> - **Lý do:** RevenueCat SDK trên Mobile kết nối trực tiếp với StoreKit 2 và Google Play Billing. Khi thanh toán thành công, RevenueCat xác nhận chữ ký số của Apple/Google và trả về `customerInfo.entitlements.active["pro"]`. Mobile app lập tức mở khóa Pro và lưu trữ an toàn mà không cần chờ Backend phản hồi.
> - **Về phía Apple & Google Review:** Đội ngũ duyệt app chỉ kiểm tra xem bấm mua có xuất hiện hộp thoại thanh toán Store và có mở khóa quyền lợi hay không. Họ không phụ thuộc vào hạ tầng Webhook nội bộ của bạn.

---

### 7.3. Hướng Dẫn Dành Riêng Cho Đội Ngũ Backend (Tích Hợp Webhook & REST API)

#### A. Vai trò thực tế của Backend trong hệ thống mới:
Backend **không cần tự viết code giải mã biên nhận StoreKit 2 / Google Play API** nữa. Backend chuyển sang vai trò **Lắng nghe & Đồng bộ dữ liệu** cho 2 mục đích:
1. **Đồng bộ tài khoản Pro khi người dùng đăng nhập Web App (`webapp/`):** Phiên bản web trên máy tính không có StoreKit nên Backend cần biết người dùng đã mua Pro trên mobile để trả về `is_pro: true` khi gọi `GET /api/billing/usage`.
2. **Lưu lịch sử giao dịch vào Database:** Phục vụ báo cáo tài chính nội bộ và kế toán.

#### B. Cách cấu hình Webhook trên RevenueCat Dashboard:
1. Vào **Project Settings** → Chọn **Integrations** → Chọn **Webhooks**.
2. Bấm **+ Add Webhook**:
   - **Webhook URL:** Nhập endpoint của Backend (Ví dụ: `https://api.earlysigns.net/api/webhooks/revenuecat`).
   - **Authorization header:** Đặt một khóa bí mật tùy chọn (Ví dụ: `Bearer your-secret-webhook-token`) để Backend xác thực nguồn gửi đến đúng là từ RevenueCat.
3. Bấm **Save**.

#### C. Code mẫu xử lý Webhook trên Backend (Python FastAPI):

RevenueCat sẽ gửi một HTTP `POST` request chứa payload JSON mỗi khi có biến động về gói cước.

```python
from fastapi import APIRouter, Request, HTTPException, Header
from typing import Optional

router = APIRouter(prefix="/api/webhooks", tags=["Webhooks"])

EXPECTED_AUTH_TOKEN = "your-secret-webhook-token"

@router.post("/revenuecat")
async def revenuecat_webhook(
    request: Request,
    authorization: Optional[str] = Header(None)
):
    # 1. Kiểm tra Authorization Header để đảm bảo request từ RevenueCat
    if authorization != f"Bearer {EXPECTED_AUTH_TOKEN}":
        raise HTTPException(status_code=401, detail="Unauthorized webhook")

    data = await request.json()
    event = data.get("event", {})
    event_type = event.get("type")
    app_user_id = event.get("app_user_id") # Chính là User ID của hệ thống
    entitlement_ids = event.get("entitlement_ids", [])
    expiration_ms = event.get("expiration_at_ms")

    # 2. Xử lý quyền lợi Pro
    if "pro" in entitlement_ids:
        if event_type in ["INITIAL_PURCHASE", "RENEWAL", "UNCANCELLATION"]:
            # Kích hoạt hoặc gia hạn Pro trong database
            await update_user_subscription(
                user_id=app_user_id,
                is_pro=True,
                expires_at_ms=expiration_ms,
                order_id=event.get("transaction_id")
            )
        elif event_type in ["EXPIRATION", "REVOCATION"]:
            # Hạ cấp về Free khi gói hết hạn hoặc người dùng được hoàn tiền (Refund)
            await update_user_subscription(
                user_id=app_user_id,
                is_pro=False,
                expires_at_ms=None
            )

    return {"status": "success"}
```

#### D. Các Event Type phổ biến cần quan tâm:
- `INITIAL_PURCHASE`: Người dùng mua gói thành công lần đầu $\rightarrow$ Kích hoạt Pro.
- `RENEWAL`: Tự động gia hạn thành công tháng/năm tiếp theo $\rightarrow$ Cập nhật ngày hết hạn mới.
- `CANCELLATION`: Người dùng hủy gia hạn trong Cài đặt điện thoại $\rightarrow$ *Lưu ý: Vẫn giữ Pro cho người dùng cho đến khi hết chu kỳ đã thanh toán.*
- `EXPIRATION`: Chu kỳ thuê bao chính thức kết thúc mà không gia hạn $\rightarrow$ Chuyển tài khoản về Free.
- `REVOCATION`: Apple/Google hoàn tiền (Refund) cho khách hàng $\rightarrow$ Thu hồi quyền Pro ngay lập tức.

---

### 7.4. Hướng Dẫn Backend Truy Vấn REST API Trực Tiếp (Khi Cần Đối Soát Thủ Công)

Nếu Backend muốn chủ động kiểm tra trạng thái thuê bao của bất kỳ người dùng nào mà không cần đợi Webhook:
1. Lấy **Secret API Key** (`sk_xxxxxxxxxxxxxxxx`) tại mục: **Project Settings → API Keys → Secret API Keys**.
2. Gửi request REST API trực tiếp đến RevenueCat:
   ```http
   GET https://api.revenuecat.com/v1/subscribers/{app_user_id}
   Authorization: Bearer sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   Content-Type: application/json
   ```
3. Đọc trường `subscriber.entitlements.pro`:
   - Nếu tồn tại và `expires_date` còn hạn $\rightarrow$ Tài khoản đang là **Pro**.
   - Nếu `null` hoặc đã hết hạn $\rightarrow$ Tài khoản là **Free**.

---

## 8. Bước 6: Quy Trình Kiểm Thử Giao Dịch (Sandbox & License Testing)

### 8.1. Kiểm thử trên iOS (Apple Sandbox)
1. Truy cập App Store Connect → **Users and Access** → Chọn mục **Sandbox Testers** (ở cột trái).
2. Bấm dấu **(+)** để tạo một tài khoản Sandbox Tester (dùng email phụ chưa từng dùng cho Apple ID thật).
3. Trên iPhone thử nghiệm:
   - Mở **Cài đặt (Settings)** → **App Store** → Cuộn xuống dưới cùng tìm mục **SANDBOX ACCOUNT** → Đăng nhập tài khoản tester vừa tạo.
4. Mở app EarlySigns (bản Dev hoặc TestFlight) → Vào màn hình Nâng cấp Pro và thực hiện mua gói. Hệ thống sẽ hiện popup thanh toán Sandbox và **không bị trừ tiền thật**.

### 8.2. Kiểm thử trên Android (Google Play License Testing & Cơ chế 3 Bản Build)

#### A. Hiểu bản chất cơ chế bảo mật của Google Play Billing:
Khi bạn bấm nút "Mua gói", thư viện Google Play Billing trên điện thoại sẽ tự động gửi **Package Name của ứng dụng đang chạy** lên máy chủ Google Play:
- Nếu bạn đang mở bản Dev (`net.earlysigns.android.dev`) hoặc bản Preview thông thường (`net.earlysigns.android.preview`), Google Play sẽ tìm kiếm xem trên kho ứng dụng có app nào mang tên đó không.
- Vì trên Google Play Console bạn **chỉ đăng ký duy nhất 1 ứng dụng là `net.earlysigns.android`**, nên Google Play lập tức trả về lỗi: *"The item you were attempting to purchase could not be found"* (Không tìm thấy sản phẩm).
- 👉 **Quy tắc vàng của Google:** Muốn gọi được sản phẩm thật từ Google Play Store, ứng dụng cài trên máy **bắt buộc phải có Package Name đúng 100% với Google Play Console (`net.earlysigns.android`)**.

#### B. Phân luồng kiểm thử chuẩn xác cho từng bản:

| Bản cài đặt | Package Name | Phương án kiểm thử đề xuất | Cách thực hiện |
| :--- | :--- | :--- | :--- |
| **1. Bản Dev Client** | `net.earlysigns.android.dev` | 🟢 **RevenueCat Test Store** | Dùng API Key Test (`test_...`) của RevenueCat để mô phỏng giao dịch mua, mở khóa Pro tự động chuẩn xác 100%. |
| **2. Bản Preview APK** | `net.earlysigns.android.preview` | 🟢 **RevenueCat Test Store** | Dùng để gửi khách hàng test giao diện, kiểm thử bài học, chức năng chấm phát âm AI. |
| **3. Bản Production (hoặc Preview Store APK)** | **`net.earlysigns.android`** | 🟡 **Google Play Billing THẬT (License Testing)** | Kiểm thử hộp thoại thanh toán thật của Google Play bằng thẻ ảo miễn phí (Không trừ tiền thật). |

#### C. Quy trình cấu hình Google Play License Testing (Thanh toán thật - Miễn phí):
1. Truy cập **Google Play Console** → Trang chủ chính → Menu trái: **Setup (Cài đặt)** → **License testing (Kiểm thử cấp phép)**.
2. Thêm địa chỉ Gmail của tài khoản Google đang đăng nhập trên chiếc điện thoại Android thử nghiệm vào danh sách **License testers**.
3. Tại mục **License test response**, chọn: `RESPOND_NORMALLY`.
4. **Lựa chọn 1 trong 2 cách cài đặt app để test Google Play Billing:**
   - **Cách 1 (Chuẩn khuyến nghị Google - Kênh Internal Testing):**
     - Chạy lệnh build: `eas build --platform android --profile production` (xuất file `.aab`).
     - Tải tệp `.aab` lên mục **Internal testing (Kiểm thử nội bộ)** trên Google Play Console.
     - Lấy link chia sẻ bản thử nghiệm mở trên điện thoại và bấm **Tải về / Cập nhật**.
   - **Cách 2 (Cài nhanh file APK trực tiếp có Package `net.earlysigns.android`):**
     - Chạy lệnh: `eas build --platform android --profile preview`
     - Lệnh này sẽ xuất ra file `.apk` cài trực tiếp nhưng mang đúng Package Name **`net.earlysigns.android`**, giúp bạn cài thẳng vào máy qua cáp USB hoặc link download để test Google Play Billing ngay mà không cần chờ duyệt kênh Internal.
5. Mở app trên điện thoại và bấm Mua gói:
   - Google Play sẽ hiển thị hộp thoại thanh toán chính thức kèm dòng chữ xanh: **"Test Card, always approves" (Thẻ thử nghiệm, luôn chấp thuận)**.
   - Bạn có thể mua thử thoải mái, hệ thống sẽ kích hoạt Pro ngay lập tức mà không phát sinh bất kỳ khoản phí nào.

---

## 9. Bảng Tổng Hợp Thông Số & Khắc Phục Sự Cố (Cheat Sheet & FAQ)

### 9.1. Cheat Sheet Thông Số Kỹ Thuật

| Thông số | Giá trị cấu hình | Nơi khai báo / Ghi chú |
| :--- | :--- | :--- |
| **iOS Bundle Identifier** | `net.earlysigns.android` | App Store Connect & RevenueCat iOS App |
| **Android Package Name** | `net.earlysigns.android` | Google Play Console & RevenueCat Android App |
| **Entitlement ID** | `pro` | **Bắt buộc viết thường**, code app kiểm tra trực tiếp |
| **Offering Identifier** | `default` | Offering mặc định chứa 3 gói cước |
| **Gói 1 Tháng** | Package: `$rc_monthly` | ID Store: `earlysigns_pro_1m` |
| **Gói 3 Tháng** | Package: `$rc_three_month` | ID Store: `earlysigns_pro_3m` |
| **Gói 1 Năm (12 Tháng)** | Package: `$rc_annual` | ID Store: `earlysigns_pro_1y` (hoặc `earlysigns_pro_12m`) |
| **Biến môi trường iOS** | `EXPO_PUBLIC_REVENUECAT_APPLE_KEY` | File `.env` (bắt đầu bằng `appl_`) |
| **Biến môi trường Android** | `EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY` | File `.env` (bắt đầu bằng `goog_`) |

### 9.2. Câu hỏi thường gặp & Khắc phục sự cố

#### Q1: Mua thử nghiệm trên Android báo lỗi "The item you were attempting to purchase could not be found"?
- **Hiện tượng:** Khi bấm mua gói cước trên Android, hộp thoại Google Play báo lỗi *"The item you were attempting to purchase could not be found"* hoặc không tải được danh sách gói.
- **Nguyên nhân chính:** 
  1. Điện thoại đang cài bản **Dev** (`net.earlysigns.android.dev`) hoặc bản **Preview** (`net.earlysigns.android.preview`), trong khi Google Play chỉ chấp nhận kết nối từ bản có Package Name đúng chuẩn là **`net.earlysigns.android`**.
  2. File `.aab` chưa từng được tải lên kênh Internal Testing trên Google Play Console (Google Play chỉ mở cổng IAP khi có ít nhất 1 bản build được upload).
  3. Google Play cần từ 2 đến 12 tiếng để đồng bộ In-App Products mới tạo trên máy chủ.
- **Cách khắc phục:**
  - **Nếu đang phát triển tính năng / test UI:** Sử dụng API Key Test (`test_...`) của RevenueCat trong file `.env`. RevenueCat SDK sẽ tự động mô phỏng giao dịch mua thành công và cấp quyền Pro mà không bị Google chặn.
  - **Nếu muốn test thanh toán thật:** Hãy cài bản build có Package Name `net.earlysigns.android` (thông qua link Google Play Internal Testing hoặc build bằng lệnh `eas build --platform android --profile preview`). Đồng thời đảm bảo email Google trên điện thoại đã nằm trong danh sách **License testers**.

#### Q2: Bấm mua trên iOS bị đứng hoặc báo lỗi "StoreKit Unavailable"?
- **Nguyên nhân:** Khóa `.p8` chưa được cấu hình đúng trên RevenueCat Dashboard hoặc thiết bị chạy trên Simulator iOS cũ không hỗ trợ StoreKit 2. Hãy test trên thiết bị thật hoặc TestFlight.

#### Q3: Người dùng hủy gói trong Cài đặt iPhone/Android thì ứng dụng có biết không?
- **Hoàn toàn BIẾT.** Ứng dụng EarlySigns đã được tích hợp bộ lắng nghe vòng đời **`addCustomerInfoUpdateListener`** trong mã nguồn. Ngay khi người dùng hủy gói hoặc được hoàn tiền, RevenueCat sẽ gửi thông báo để app tự động thu hồi quyền Pro và chuyển về Free mà không cần khởi động lại ứng dụng.
