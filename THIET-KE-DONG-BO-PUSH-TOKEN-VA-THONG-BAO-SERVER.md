# Thiết Kế Hệ Thống Đồng Bộ Push Token & Cài Đặt Thông Báo Với Backend (Mục 16)

> **Mã tài liệu:** SPEC-NOTIF-SYNC-016  
> **Áp dụng cho:** EarlySigns Mobile App (React Native / Expo SDK 57) & EarlySigns Backend Service  
> **Đối chiếu quy chuẩn:** Mục 16 của `Tai lieu dac ta phan mem.md` & Vấn đề F07 trong `PHAN-TICH-DOI-CHIEU-DAC-TA.md`  
> **Trạng thái:** Tài liệu kỹ thuật chính thức (Official Engineering Architecture)

---

## 1. Hiện Trạng & Yêu Cầu

### 1.1. Hiện trạng thực tế
* **Phía Client Mobile (Đã hoàn thiện tốt):**
  Ứng dụng đã tích hợp thư viện chuẩn `expo-notifications`, plugin đã khai báo trong `app.json`, hệ thống thông báo cục bộ (Local Notifications) trên thiết bị đã hoạt động trọn vẹn, bao gồm:
  * Nhắc luyện tập hằng ngày (`DAILY_PRACTICE`).
  * Nhắc bài học đang dang dở (`INCOMPLETE_LESSON`) với cơ chế giới nghiêm ban đêm (Night Curfew).
  * Nhắc duy trì chuỗi học tập (`STREAK_REMINDER`).
  * Quy trình xử lý quyền thông báo phân tầng (`UNDETERMINED` $\rightarrow$ Soft-Ask $\rightarrow$ System Prompt $\rightarrow$ Settings).
  * Giao diện cài đặt trực quan trong `NotificationSettingsScreen.tsx`.
  * Bộ giải mã dữ liệu (`handleNotificationResponse`) và điều hướng sâu (Deep Linking) khi người dùng chạm vào thông báo.
  * Hàm `registerForPushNotificationsAsync()` đã có trong codebase để lấy `ExpoPushToken`.
* **Khoảng trống Kiến trúc (Chưa có Remote Push Infrastructure):**
  * Toàn bộ cài đặt (`dailyReminderEnabled`, `incompleteLessonEnabled`, `streakReminderEnabled`, `contentUpdatesEnabled`, `promotionsEnabled`) hiện chỉ được lưu cục bộ trên thiết bị qua `AsyncStorage` (`earlysigns_notif_*`).
  * Token lấy được từ `getExpoPushTokenAsync()` chưa từng được gửi lên server.
  * Backend hiện **chưa có cơ sở dữ liệu và API** để quản lý thiết bị, push token hoặc notification preferences.
  * **Hệ quả:** Hệ thống hiện tại chỉ hoạt động với Local Notifications; Backend hoàn toàn chưa thể chủ động gửi Remote Push tới đúng tài khoản, chưa thể gửi thông báo khi có bài học mới, cảnh báo tài khoản/giao dịch hoặc lọc người nhận theo tùy chọn marketing.

### 1.2. Yêu cầu nghiệp vụ
1. **Đăng ký thiết bị & Đồng bộ Preferences:** Bổ sung cơ chế đăng ký thiết bị và đồng bộ tùy chọn thông báo giữa Mobile App và Backend. Mỗi thiết bị đăng nhập EarlySigns phải đăng ký `ExpoPushToken` của mình với server.
2. **Hỗ trợ Đa thiết bị (Multi-Device):** Backend phải hỗ trợ nhiều thiết bị cho cùng một tài khoản (ví dụ: iPhone + Android tablet), quản lý độc lập từng token còn hiệu lực và chỉ gửi từng loại notification tới những thiết bị đã cho phép loại nội dung tương ứng.
3. **Phân tách Thông báo Thiết yếu vs. Tiếp thị:**
   * Thông báo thiết yếu liên quan tới: `ACCOUNT`, `SUBSCRIPTION`, `SECURITY`, `TRANSACTION` **không bị chặn bởi preference marketing**; Backend được phép gửi nếu thiết bị còn active và hệ điều hành (OS) của người dùng vẫn cho phép nhận thông báo (OS Permission granted & Push Token còn hiệu lực).
   * Thông báo dạng: `NEW_CONTENT` (phụ thuộc `content_updates_enabled == true`) và `PROMOTION` (bắt buộc phụ thuộc `promotions_enabled == true`).
4. **Giải pháp Hạ tầng:** Sử dụng **Expo Push Service**. Mobile lấy `ExpoPushToken` bằng `getExpoPushTokenAsync({ projectId })`. Backend gửi notification qua Expo Push API; Expo sau đó định tuyến tự động tới FCM (Android) hoặc APNs (iOS). Backend phải theo dõi Push Receipts và ngừng gửi tới các token nhận lỗi `DeviceNotRegistered`.

---

## 2. Kiến Trúc Tổng Thể Hệ Thống

```
┌────────────────────────────────────────────────────────────────────────┐
│                        EARLYSIGNS MOBILE APP                           │
│                                                                        │
│  1. Login thành công                                                   │
│  2. Người dùng cấp quyền thông báo                                     │
│  3. Lấy Constants.expoConfig.extra.eas.projectId                       │
│  4. Gọi getExpoPushTokenAsync({ projectId })                           │
│  5. Lắng nghe addPushTokenListener() (khi token xoay vòng)             │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    │ POST /api/notifications/devices
                                    │ (Kèm Header: Bearer <JWT>)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        EARLYSIGNS BACKEND                              │
│                                                                        │
│  1. Trích xuất user_id từ JWT (Chống giả mạo chủ quyền thiết bị)       │
│  2. Lưu/Cập nhật vào bảng `push_devices` (Idempotent Upsert)           │
│  3. Khi có sự kiện phát thông báo:                                    │
│     ├── Kiểm tra category (ESSENTIAL vs. MARKETING)                    │
│     ├── Lọc danh sách thiết bị theo user_id & preferences              │
│     └── Gọi Expo Push API (Batch tối đa 100 tin/request)               │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    │ POST https://exp.host/--/api/v2/push/send
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      EXPO PUSH SERVICE GATEWAY                         │
│                                                                        │
│  Trả về Push Tickets (Chấp nhận lệnh gửi ban đầu)                      │
│  Tự động điều phối hạ tầng:                                            │
│        ├── Cho thiết bị Android ──> Chuyển tiếp tới FCM v1 (Google)    │
│        └── Cho thiết bị iOS     ──> Chuyển tiếp tới APNs (Apple)       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
                       ┌─────────────────────────┐
                       │  THIẾT BỊ NGƯỜI DÙNG    │
                       │  (Android / iOS Banner) │
                       └─────────────────────────┘
                                    │
    [Sau ~15 phút]                  ▼
┌────────────────────────────────────────────────────────────────────────┐
│                  HẬU KIỂM VÉ PHẢN HỒI (PUSH RECEIPTS)                  │
│                                                                        │
│  Backend Worker gọi: POST https://exp.host/--/api/v2/push/getReceipts │
│  - Nếu Receipt status = "ok" ────────> Hoàn tất                        │
│  - Nếu Error = "DeviceNotRegistered" -> Đặt `is_active = false`        │
│  - Nếu Lỗi mạng tạm thời             -> Retry Exponential Backoff      │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Thiết Kế Cơ Sở Dữ Liệu Backend (`push_devices`)

Tuyệt đối **không đặt cột `push_token` trực tiếp trên bảng `users`** vì một người dùng có thể sở hữu đồng thời nhiều thiết bị (iPhone, iPad, máy Android). Bảng `push_devices` được thiết kế để quản lý độc lập từng máy.

> [!NOTE]
> **Quy ước DDL (Logical / Reference Schema):** Đoạn mã SQL dưới đây được viết theo chuẩn MySQL/MariaDB nhằm thể hiện rõ cấu trúc và ràng buộc nghiệp vụ. Nếu Backend EarlySigns sử dụng PostgreSQL, MongoDB hoặc cơ sở dữ liệu khác, đội ngũ Backend hoàn toàn có thể điều chỉnh cú pháp DDL tương ứng (ví dụ: kiểu `UUID` nguyên bản, hàm `gen_random_uuid()`, cú pháp `ON CONFLICT (...) DO UPDATE`), nhưng **bắt buộc tuân thủ đúng các ràng buộc toàn vẹn và quy tắc nghiệp vụ** dưới đây.

```sql
CREATE TABLE push_devices (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id VARCHAR(36) NOT NULL,
    device_id VARCHAR(100) NOT NULL,                 -- Định danh duy nhất của lượt cài đặt (Installation UUID)
    expo_push_token VARCHAR(255) NOT NULL,           -- Chuỗi ExponentPushToken[...]
    platform ENUM('ios', 'android') NOT NULL,
    app_version VARCHAR(20),                         -- Ví dụ: "0.1.0"
    locale VARCHAR(10) DEFAULT 'vi',                 -- Ngôn ngữ thiết bị ("vi" hoặc "en")
    timezone VARCHAR(50) DEFAULT 'Asia/Ho_Chi_Minh', -- Múi giờ để canh giờ nhắc
    permission_granted BOOLEAN NOT NULL DEFAULT TRUE,
    content_updates_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    promotions_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_push_devices_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uq_expo_push_token (expo_push_token),
    UNIQUE KEY uq_user_device (user_id, device_id),
    INDEX idx_user_active_devices (user_id, is_active),
    INDEX idx_active_promotions (promotions_enabled, is_active)
);
```

### 3.1. Quyết định Kiến trúc: Tùy chọn theo Tài khoản (Account-Level) vs. theo Thiết bị (Device-Level)
* **Thuộc tính cấp độ Thiết bị (Device-Level):** `expo_push_token`, `platform`, `app_version`, `locale`, `timezone`, `is_active`, `last_seen_at`.
* **Tùy chọn cấp độ Tài khoản (Account-Level):** Các cờ tiếp thị `promotions_enabled` và cập nhật `content_updates_enabled`.
  * *Nguyên tắc nghiệp vụ:* Khi người dùng chọn *"Không nhận khuyến mại"* trên iPhone, quyết định này phải có hiệu lực trên toàn tài khoản, tránh trường hợp cùng một người dùng lại nhận quảng cáo khi mở iPad.
  * *Triển khai linh hoạt cho Backend:* Backend có thể tách riêng bảng `notification_preferences (user_id, content_updates_enabled, promotions_enabled)` hoặc duy trì lưu trên `push_devices` và tự động đồng bộ (broadcast update) cho toàn bộ các thiết bị đang active của cùng `user_id` khi có thay đổi.

### 3.2. Quy chuẩn Định danh Thiết bị (`device_id`)
* `device_id` **bắt buộc là Installation UUID** ngẫu nhiên được sinh ra lần đầu khi cài đặt ứng dụng và lưu bền vững vào `SecureStore` (hoặc sử dụng installation identifier từ `expo-application`).
* **Tuyệt đối KHÔNG sử dụng định danh phần cứng** (như IMEI, MAC address, số Serial) nhằm tuân thủ nghiêm ngặt chính sách bảo vệ quyền riêng tư người dùng của Apple App Store và Google Play Store.

### 3.3. Xử lý Chuyển đổi Tài khoản trên Cùng Thiết bị (Atomic Re-binding)
* **Kịch bản thực tế:**
  1. Người dùng A đăng nhập trên Điện thoại X $\rightarrow$ Token `ExponentPushToken[ABC]` được lưu cho `user_id = A`, `device_id = X`.
  2. Người dùng A bấm Đăng xuất.
  3. Người dùng B đăng nhập trên cùng Điện thoại X $\rightarrow$ Vẫn token `ExponentPushToken[ABC]`.
* **Yêu cầu đối với Backend:**
  * Nếu backend chỉ dùng lệnh `ON DUPLICATE KEY UPDATE` thuần túy, sẽ xảy ra xung đột khóa Unique (`uq_expo_push_token` bị trùng trong khi `user_id` đã đổi sang B).
  * Do đó, khi nhận request đăng ký thiết bị với JWT hợp lệ của User B: Nếu `expo_push_token` hoặc `device_id` đã từng gắn với User A, Backend **phải thực hiện Re-binding quyền sở hữu trong cùng một Database Transaction**:
    1. Vô hiệu hóa (`is_active = FALSE`) hoặc cập nhật quyền sở hữu `user_id = B` cho token/device đó.
    2. Cập nhật trạng thái `is_active = TRUE`, `last_seen_at = NOW()` cho User B.
    3. Trả về cài đặt preferences hiện tại của User B để Mobile cập nhật giao diện ngay lập tức.

### Minh họa Quản lý Đa Thiết Bị:
```
User 27 (Nguyễn Văn A)
  ├── Thiết bị 1: iPhone 15 Pro (device_id: "uuid-1")
  │     ├── expo_push_token: "ExponentPushToken[AAA...]"
  │     └── promotions_enabled: false (Tắt quảng cáo)
  └── Thiết bị 2: Samsung Galaxy Tab (device_id: "uuid-2")
        ├── expo_push_token: "ExponentPushToken[BBB...]"
        └── promotions_enabled: true (Nhận khuyến mại)

* Khi Backend gửi thông báo ACCOUNT / BẢO MẬT:
  -> Cả iPhone [AAA] và Samsung [BBB] đều nhận được (nếu OS cho phép).
* Khi Backend gửi tin PROMOTION / KHUYẾN MẠI:
  -> iPhone [AAA] bị loại trừ (❌); Chỉ gửi tới Samsung [BBB] (✅).
```

---

## 4. Đặc Tả Bộ 3 API Chuẩn (Client <-> Backend Contracts)

### 4.1. Đăng ký hoặc Cập nhật Thiết bị (`POST /api/notifications/devices`)
Kích hoạt khi:
* Người dùng vừa đăng nhập thành công.
* Người dùng cấp quyền thông báo trong cài đặt.
* Sự kiện `Notifications.addPushTokenListener()` phát hiện token được hệ thống xoay vòng mới.
* Ứng dụng khởi động lại ở trạng thái đã đăng nhập và đã có quyền thông báo.

* **Endpoint:** `POST /api/notifications/devices`
* **Headers:**
  ```http
  Authorization: Bearer <access_token>
  Content-Type: application/json
  ```
* **Request Body:**
  ```json
  {
    "expo_push_token": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
    "platform": "ios",
    "device_id": "9B1D614A-5712-42DF-B433-28945A6136B2",
    "app_version": "0.1.0",
    "locale": "vi",
    "timezone": "Asia/Ho_Chi_Minh"
  }
  ```
  *(Lưu ý: Không gửi `user_id` trong Body! Backend tự động trích xuất `user_id` từ JWT token để ngăn chặn User A gán token của mình sang User B).*
* **Xử lý phía Server (Idempotent Upsert & Atomic Re-binding):**
  * Server kiểm tra token/device: nếu đã từng thuộc về `user_id` khác (tài khoản cũ trên cùng máy), tiến hành re-bind sang `user_id` hiện tại (từ JWT) trong cùng một Transaction.
  ```sql
  INSERT INTO push_devices (
    user_id, device_id, expo_push_token, platform, app_version, locale, timezone, is_active, last_seen_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, TRUE, NOW())
  ON DUPLICATE KEY UPDATE
    user_id = VALUES(user_id),
    expo_push_token = VALUES(expo_push_token),
    app_version = VALUES(app_version),
    locale = VALUES(locale),
    timezone = VALUES(timezone),
    is_active = TRUE,
    last_seen_at = NOW();
  ```
* **Response `200 OK` (Đồng bộ 2 chiều tức thì):**
  ```json
  {
    "ok": true,
    "device_id": "9B1D614A-5712-42DF-B433-28945A6136B2",
    "preferences": {
      "content_updates_enabled": true,
      "promotions_enabled": false
    }
  }
  ```
  *(Lợi ích: Trả về kèm `preferences` hiện tại của tài khoản giúp Mobile đồng bộ ngay trạng thái cấu hình của người dùng mà không cần tốn thêm một lượt gọi API roundtrip).*

---

### 4.2. Đồng bộ Tùy chọn Thông báo Remote (`PUT /api/notifications/preferences`)
Kích hoạt khi: Người dùng gạt công tắc trong màn hình `NotificationSettingsScreen`.

* **Endpoint:** `PUT /api/notifications/preferences`
* **Headers:**
  ```http
  Authorization: Bearer <access_token>
  Content-Type: application/json
  ```
* **Request Body (Hỗ trợ Partial Update):**
  ```json
  {
    "device_id": "9B1D614A-5712-42DF-B433-28945A6136B2",
    "content_updates_enabled": true,
    "promotions_enabled": false
  }
  ```
* **Phân định rõ ràng giữa Local và Remote Preferences:**
  * Các tùy chọn: `daily_reminder`, `incomplete_lesson`, `streak_reminder` tiếp tục được điều khiển bởi Local Notification Scheduler trên máy trạm để đảm bảo hoạt động ngay cả khi không có mạng.
  * Các tùy chọn: `content_updates_enabled` và `promotions_enabled` được lưu trên server để backend lọc danh sách trước khi gửi Push.
* **Response `200 OK`:**
  ```json
  {
    "ok": true,
    "preferences": {
      "content_updates_enabled": true,
      "promotions_enabled": false
    }
  }
  ```

---

### 4.3. Truy xuất Tùy chọn Thông báo (`GET /api/notifications/preferences`)
Kích hoạt khi: Người dùng vào màn hình Cài đặt Thông báo hoặc khi mở ứng dụng trên thiết bị mới / sau khi cài đặt lại.

* **Endpoint:** `GET /api/notifications/preferences?device_id=9B1D614A-5712-42DF-B433-28945A6136B2`
* **Headers:**
  ```http
  Authorization: Bearer <access_token>
  ```
* **Response `200 OK`:**
  ```json
  {
    "ok": true,
    "preferences": {
      "content_updates_enabled": true,
      "promotions_enabled": false
    }
  }
  ```

---

### 4.4. Hủy Đăng ký Thiết bị Khi Đăng xuất (`DELETE /api/notifications/devices/{device_id}`)
Kích hoạt khi: Người dùng bấm **"Đăng xuất"** trong `ProfileScreen`.

* **Endpoint:** `DELETE /api/notifications/devices/{device_id}`
* **Headers:**
  ```http
  Authorization: Bearer <access_token>
  ```
* **Xử lý phía Server:**
  * Đặt `is_active = FALSE` cho `device_id` tương ứng của `user_id` hiện tại.
  * **TUYỆT ĐỐI KHÔNG xóa toàn bộ token của tài khoản:** Người dùng vẫn có thể đang đăng nhập trên iPad hoặc thiết bị khác; chỉ vô hiệu hóa đúng thiết bị đang bấm đăng xuất!
* **Response `200 OK`:**
  ```json
  {
    "ok": true,
    "message": "Device unregistered successfully."
  }
  ```

---

## 5. Cải Tiến Mã Nguồn Phía Mobile (`mobile_app`)

### 5.1. Bổ sung `projectId` tường minh vào `getExpoPushTokenAsync()`
* **Vấn đề mã cũ trong `notifications.ts`:**
  ```typescript
  // CŨ: Dễ gây lỗi không lấy được token trên bản Standalone / Development Build
  const tokenResult = await getExpoPushTokenAsync();
  ```
* **Mã chuẩn hóa theo khuyến nghị của Expo SDK 57:**
  ```typescript
  import Constants from "expo-constants";
  import * as Notifications from "expo-notifications";

  export async function registerForPushNotificationsAsync(): Promise<string | null> {
    if (!isNativeMobile) return null;
    initNotifications();
    try {
      const perm = await requestNotificationPermission();
      if (!perm.granted) return null;

      // Lấy projectId động từ app.json / EAS config
      const projectId = getEasProjectId();
      if (!projectId) {
        logger.warn("Notifications", "EAS projectId is not configured in app.json or environment.");
        return null;
      }

      const tokenResult = await Notifications.getExpoPushTokenAsync({
        projectId,
      });
      return tokenResult?.data || null;
    } catch (err) {
      logger.warn("Notifications", "Error getting push token:", err);
      return null;
    }
  }
  ```

### 5.2. Lắng nghe Sự kiện Xoay vòng Token (`addPushTokenListener`)
> [!IMPORTANT]
> **Điểm mấu chốt kỹ thuật:** Hàm `Notifications.addPushTokenListener` trả về đối tượng `DevicePushToken` nguyên bản của hệ điều hành (native FCM registration token trên Android hoặc APNs device token trên iOS), **KHÔNG PHẢI** là `ExpoPushToken`. Nếu gửi trực tiếp chuỗi này lên Backend sẽ làm sai lệch định dạng `ExponentPushToken[...]` mà Expo Gateway yêu cầu.
> Do đó, Mobile App bắt buộc phải truyền `devicePushToken` này vào `Notifications.getExpoPushTokenAsync({ projectId, devicePushToken })` để chuyển đổi sang `ExpoPushToken` tương ứng trước khi gửi lên API Backend. Đồng thời sử dụng hệ thống ghi log `logger.warn` (chỉ chạy ở DEV) thay vì dùng `console.warn` trôi nổi.

```typescript
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { getItem } from "@/utils/storage";
import { AUTH_TOKEN_KEY } from "@/constants/storageKeys";
import { logger } from "@/core/logger";

export function setupPushTokenRefreshListener(): () => void {
  const subscription = Notifications.addPushTokenListener(
    async (devicePushToken) => {
      const authToken = getItem(AUTH_TOKEN_KEY);
      if (!authToken) return;

      try {
        const projectId = getEasProjectId();
        if (!projectId) {
          logger.warn("Notifications", "EAS projectId is missing during token refresh.");
          return;
        }

        // Chuyển đổi DevicePushToken (FCM/APNs) sang ExpoPushToken chuẩn
        const expoTokenResult = await Notifications.getExpoPushTokenAsync({
          projectId,
          devicePushToken,
        });

        const expoToken = expoTokenResult.data;
        if (!expoToken) return;

        const { notificationApi } = await import("@/api/notificationApi");
        await notificationApi.registerDevice({
          expo_push_token: expoToken,
        });
      } catch (err) {
        logger.warn("Notifications", "Failed to refresh Expo push token:", err);
      }
    }
  );

  return () => {
    subscription.remove();
  };
}
```

---

## 6. Quy Tắc Server Khi Gửi & Xử Lý Push Receipts

### 6.1. Ma trận Phân loại & Quyền gửi
| Loại thông báo (`type`) | Kênh gửi | Điều kiện gửi phía Server |
| :--- | :---: | :--- |
| `DAILY_PRACTICE` | Local | Thiết bị tự lên lịch, không cần server bắn push. |
| `INCOMPLETE_LESSON` | Local | Thiết bị tự lên lịch sau khi thoát bài chưa hoàn thành. |
| `STREAK_REMINDER` | Local / Remote | Local lúc 21:30; Hoặc Server kiểm tra DB nếu chưa học thì bắn Remote. |
| `NEW_CONTENT` | **Remote** | **Bắt buộc:** `content_updates_enabled == true`, `is_active == true`, OS Permission = Granted. |
| `PROMOTION` | **Remote** | **Bắt buộc:** `promotions_enabled == true`, `is_active == true`, OS Permission = Granted. Kèm `expiresAt`. |
| `ACCOUNT` | **Remote** | **Thiết yếu (Essential):** Không bị chặn bởi preference marketing; Backend gửi nếu `is_active == true` & token hợp lệ & OS Permission = Granted. |
| `SUBSCRIPTION` | **Remote** | **Thiết yếu (Essential):** Xác nhận thanh toán, gia hạn, cảnh báo hết hạn Pro; bỏ qua marketing preference, yêu cầu thiết bị active & token hợp lệ. |

### 6.2. Quy trình Xử lý Vé (Push Tickets) & Biên nhận (Push Receipts)
Không được coi việc nhận HTTP 200 từ `POST https://exp.host/--/api/v2/push/send` là thông báo đã đến thiết bị. Đó mới chỉ là **Push Ticket**.

```
1. Server gọi Expo Push API
   ├── Nhận Push Tickets: [ { "status": "ok", "id": "ticket-xxxx" }, ... ]
   └── Lưu danh sách `ticket_id` vào hàng đợi (Queue/Cache)

2. Sau khoảng 15 phút (Khoảng thời gian khuyến nghị của Expo):
   └── Worker gọi: POST https://exp.host/--/api/v2/push/getReceipts
       Request: { "ids": ["ticket-xxxx", "ticket-yyyy"] }

3. Xử lý phản hồi từ Receipts:
   ├── status: "ok" ─────────────> Giao thành công cho FCM/APNs.
   ├── error: "DeviceNotRegistered"
   │   └── Ý nghĩa: Ứng dụng đã bị gỡ cài đặt hoặc token bị thu hồi.
   │   └── Hành động: UPDATE push_devices SET is_active = FALSE WHERE expo_push_token = ?
   └── error: "MessageTooBig" / "MessageRateExceeded"
       └── Ghi log cảnh báo để đội ngũ kỹ thuật điều chỉnh payload.
```

---

## 7. Cấu Hình Chứng Chỉ EAS & Môi Trường Thử Nghiệm

Mã nguồn cần đi kèm cấu hình chứng chỉ Store trên Expo Application Services (EAS):

1. **Android (FCM v1):**
   * Tạo Service Account trên Google Cloud Console gắn với Firebase Project của EarlySigns.
   * Cấp quyền `Firebase Cloud Messaging API (V1)`.
   * Tải file Private Key JSON và cấu hình lên EAS:
     ```bash
     eas credentials
     # Chọn Android -> Production/Preview -> Server Credentials -> Google Service Account
     ```
2. **iOS (Apple APNs):**
   * Đăng nhập Apple Developer Program $\rightarrow$ *Certificates, Identifiers & Profiles* $\rightarrow$ *Keys*.
   * Tạo một Apple Push Notifications service (APNs) Key (`.p8`).
   * Tải key lên EAS Credentials:
     ```bash
     eas credentials
     # Chọn iOS -> Production/Preview -> Push Notifications Key
     ```
3. **Môi trường Kiểm thử (Testing Environment):**
   * **Lưu ý quan trọng:** Không sử dụng Expo Go để kiểm thử Remote Push Notifications trên Android.
   * Bắt buộc tạo **EAS Development Build**:
     ```bash
     npm run build:dev:android
     npm run build:dev:ios
     ```
   * Dùng [Expo Push Notifications Tool](https://expo.dev/notifications) để gửi thử nghiệm trực tiếp token đầu tiên.

---

## 8. Bảng Đối Chiếu Tiêu Chuẩn Nghiệm Thu (Acceptance Checklist)

| STT | Kịch bản kiểm thử (Test Case) | Tiêu chí đạt (Acceptance Criteria) |
| :---: | :--- | :--- |
| **TC1** | Khởi tạo Token có `projectId` | Gọi `registerForPushNotificationsAsync()`, token trả về có dạng `ExponentPushToken[...]` hợp lệ kết nối với EAS Project ID được cấu hình động từ `app.json` / `extra.eas.projectId`. |
| **TC2** | Đăng ký thiết bị không lộ `user_id` | API `POST /api/notifications/devices` gửi đầy đủ metadata thiết bị; server trích xuất an toàn `user_id` từ Bearer Token. |
| **TC3** | Tắt khuyến mại vẫn nhận tin thiết yếu | Đặt `promotions_enabled: false`. Server gửi tin `NEW_CONTENT` hoặc `PROMOTION` bị chặn; gửi tin `ACCOUNT` hoặc `SUBSCRIPTION` vẫn đến máy bình thường (nếu OS cho phép). |
| **TC4** | Tự động dọn rác token hết hạn | Giả lập receipt trả về `DeviceNotRegistered`, backend tự động chuyển `is_active = FALSE` trên bảng `push_devices`. |
| **TC5** | Đăng xuất độc lập theo thiết bị | Khi User đăng xuất trên iPhone, gọi `DELETE /api/notifications/devices/{device_id}`. Token iPhone bị vô hiệu hóa; iPad của cùng User vẫn duy trì nhận push. |
| **TC6** | Cảnh báo khi bấm thông báo lúc đang luyện phát âm | Nhấn vào thông báo khi đang trong màn hình `VideoPractice` hiển thị hộp thoại xác nhận theo đúng Mục 16.4 Phương án B, không gây mất kết quả ghi âm. |
| **TC7** | Xoay vòng Token (Token Refresh Conversion) | `addPushTokenListener` nhận `DevicePushToken` (FCM/APNs), chuyển đổi thành công sang `ExpoPushToken` qua `getExpoPushTokenAsync` và cập nhật backend. |
| **TC8** | Đổi tài khoản trên cùng thiết bị (Atomic Re-bind) | User A đăng xuất, User B đăng nhập trên cùng điện thoại; token được re-bind an toàn sang User B trong cùng transaction, không gây xung đột duplicate key. |
| **TC9** | Đồng bộ tùy chọn 2 chiều (Two-Way Sync) | Đăng ký thiết bị qua `POST /api/notifications/devices` trả về `preferences` hiện tại của tài khoản, giúp Mobile hiển thị đúng trạng thái toggles ngay lập tức. |

---

*Tài liệu này là căn cứ kỹ thuật chính thức, chuẩn hóa và thống nhất 100% giữa đội ngũ Mobile App và Backend Service của EarlySigns.*

---

## Phụ lục: Hướng Dẫn Lấy `google-services.json` & Cấu Hình FCM V1 Cho EarlySigns

### Tổng Quan

```
Mobile App → ExpoPushToken → EarlySigns Backend → Expo Push API → FCM V1 → Android Device
```

Bạn cần tạo Firebase Project + lấy 2 thứ:

1. `google-services.json` → đặt vào repo mobile
2. **FCM V1 Server Key** (Service Account JSON) → cấu hình trên Expo Dashboard

---

### Bước 1: Tạo Firebase Project

1. Truy cập [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"** (hoặc "Thêm dự án")
3. Đặt tên: `EarlySigns` (hoặc tên bạn muốn)
4. Google Analytics: Bật hoặc tắt đều được (không ảnh hưởng push)
5. Click **"Create project"** → Chờ tạo xong

---

### Bước 2: Thêm Android App vào Firebase Project

1. Trong Firebase Console → click icon **Android** (🤖) để thêm app
2. Điền thông tin:

| Field | Giá trị |
| :--- | :--- |
| **Android package name** | `net.earlysigns.android` |
| **App nickname** | `EarlySigns Android` (tùy chọn) |
| **Debug signing certificate SHA-1** | Bỏ trống (thêm sau nếu cần) |

> [!IMPORTANT]
> Package name **BẮT BUỘC** phải khớp chính xác với `"package": "net.earlysigns.android"` trong `app.json`.

3. Click **"Register app"**

---

### Bước 3: Tải `google-services.json`

1. Sau khi đăng ký app, Firebase sẽ hiển thị nút **"Download google-services.json"**
2. Click tải về
3. Đặt file vào thư mục gốc của project mobile:

```
mobile_app/
├── google-services.json   ← ĐẶT Ở ĐÂY
├── app.json
├── App.tsx
├── package.json
└── ...
```

4. Skip các bước tiếp theo trong wizard Firebase (Add Firebase SDK, v.v.) vì Expo đã xử lý

---

### Bước 4: Cấu Hình `app.json`

Thêm `googleServicesFile` vào block `android`:

```diff
 "android": {
   "package": "net.earlysigns.android",
+  "googleServicesFile": "./google-services.json",
   "adaptiveIcon": {
```

> [!WARNING]
> Đừng commit `google-services.json` vào public repo! File này chứa API key. Thêm vào `.gitignore` nếu repo là public.

---

### Bước 5: Cấu Hình FCM V1 trên Expo Dashboard (BẮT BUỘC)

Expo Push Service cần **FCM V1 Server Key** để gửi push đến Android qua FCM.

#### 5.1: Tạo Service Account Key từ Google Cloud

1. Vào **Firebase Console** → ⚙️ **Project Settings** → tab **"Service accounts"**
2. Click **"Generate new private key"**
3. Xác nhận → Tải file JSON về (ví dụ: `earlysigns-firebase-adminsdk-xxxxx.json`)

> [!CAUTION]
> File Service Account JSON này là **BÍ MẬT TUYỆT ĐỐI**.
> - KHÔNG commit vào repo
> - KHÔNG chia sẻ công khai
> - Chỉ upload lên Expo Dashboard

#### 5.2: Upload lên Expo Dashboard

1. Truy cập [Expo Dashboard](https://expo.dev/) → Login
2. Vào project **EarlySigns** → **Credentials** → **Android**
3. Tìm mục **"FCM V1 Service Account Key"**
4. Click **"Upload"** → Chọn file JSON vừa tải ở bước 5.1
5. Expo sẽ tự động dùng key này khi gửi push qua `exp.host/--/api/v2/push/send`

#### 5.3: Xác minh trên Expo Dashboard

Sau khi upload, dashboard sẽ hiển thị:

```
FCM V1 Service Account Key: ✅ Configured
```

---

### Bước 6: Rebuild EAS Development Build

Sau khi thêm `google-services.json` và cập nhật `app.json`, bạn cần build lại:

```bash
# Development build (để test)
eas build --platform android --profile development

# Hoặc preview build
eas build --platform android --profile preview
```

> [!NOTE]
> `expo start` (Expo Go) **KHÔNG hỗ trợ** push notifications thực. Bạn **BẮT BUỘC** phải dùng EAS Development Build hoặc Production Build để test push.

---

### Bước 7: Test Push Notification

**Dùng Expo Push Tool:**

1. Truy cập [Expo Push Notification Tool](https://expo.dev/notifications)
2. Nhập `ExpoPushToken` của thiết bị (xem trong log app khi boot)
3. Điền title + body → Send
4. Thiết bị Android sẽ nhận được push notification

**Dùng cURL:**

```bash
curl -X POST https://exp.host/--/api/v2/push/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
    "title": "EarlySigns Test",
    "body": "Push notification hoạt động!",
    "data": { "type": "DAILY_PRACTICE", "targetRoute": "Main" }
  }'
```

---

### iOS (Bonus — nếu cần sau)

iOS dùng **APNs** (Apple Push Notification service), không cần Firebase. Expo tự xử lý nếu bạn đã có:

- Apple Developer Account
- APNs Key (`.p8`) upload lên Expo Dashboard → **Credentials** → **iOS** → **Push Key**
- Hoặc chạy `eas credentials` để Expo tự tạo/quản lý.