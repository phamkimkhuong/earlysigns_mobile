# Facebook Login: hợp đồng mobile / backend

Trạng thái: mobile đã triển khai payload dưới đây. Đây là hợp đồng đề xuất cho
backend mới, không phải xác nhận endpoint production đã hỗ trợ. Chỉ nghiệm thu
đăng nhập đầu cuối sau khi backend triển khai và test trên thiết bị thật.

## Luồng mobile

- Android: SDK Facebook đăng nhập, trả Access Token.
- iOS: gọi SDK với `loginTrackingIOS = limited`, tạo nonce ngẫu nhiên bằng
  `expo-crypto.randomUUID()` cho mỗi lần đăng nhập. Đọc AuthenticationToken (OIDC
  JWT), kiểm tra nonce SDK trả về khớp lần đăng nhập hiện tại. Không xin ATT để
  phục vụ đăng nhập, không dùng JWT này làm Graph API Access Token.
- SDK quyết định mở app Facebook hay trình duyệt hệ thống. Limited Login có thể
  mở trang `limited.facebook.com`; đây không phải lỗi token hay route của app.
- Hủy đăng nhập: không gọi backend, không báo lỗi. Chặn chạm liên tiếp trong suốt
  quá trình SDK + backend + hoàn tất phiên. Thất bại cho phép thử lại.
- Chỉ sau khi backend trả phiên EarlySigns hợp lệ mới gọi `handleLoginSuccess`,
  cập nhật trạng thái khách, đồng bộ dữ liệu/quyền hiện tại và điều hướng.

## Endpoint

`POST /api/auth/facebook`, HTTPS, JSON, không cần Bearer token EarlySigns.

Android:

```json
{
  "token_type": "access_token",
  "access_token": "<Facebook Access Token>",
  "device_id": "<installation id>"
}
```

iOS:

```json
{
  "token_type": "id_token",
  "id_token": "<Facebook AuthenticationToken JWT>",
  "nonce": "<nonce mobile đã gửi cho SDK, không hash>",
  "device_id": "<installation id>"
}
```

`token_type` bắt buộc; chỉ nhận một loại token. `nonce` bắt buộc cho `id_token`.
Không suy đoán loại token bằng việc thử lần lượt các cơ chế xác thực. Không gửi
App Secret xuống mobile. `device_id` là metadata, không phải bằng chứng danh tính.
Tên trường trên là quy ước API EarlySigns; Meta không định nghĩa API backend này.

## Xác minh backend bắt buộc

### Access Token

1. Xác minh bằng API kiểm tra token của Meta với thông tin ứng dụng giữ ở server.
   Kiểm tra token hợp lệ, đúng Facebook App ID cấu hình, thời hạn token và thời
   hạn truy cập dữ liệu nếu có, lấy user ID đã xác thực.
2. Đọc profile cần thiết từ Graph API bằng token đã xác minh. Không tin user ID,
   email hoặc tên do client tự gửi. Email có thể thiếu dù đã yêu cầu quyền email.
3. Gắn tài khoản bằng `(provider = facebook, app-scoped user ID)`. Không tự động
   gộp với tài khoản email/Google/Apple chỉ vì email trùng; cần xác minh liên kết.

### Limited Login / OIDC

1. Dùng thư viện JWT/OIDC chuẩn của backend, không chỉ base64-decode JWT.
   Cấu hình issuer tin cậy `https://www.facebook.com` và Facebook App ID làm
   audience. Lấy metadata/JWKS qua endpoint chính thức, cache và hỗ trợ key rotation;
   tuyệt đối không tải `jku`/`x5u` hay issuer tùy ý từ JWT người dùng gửi lên.
2. Kiểm tra chữ ký với khóa Meta, thuật toán cho phép (RS256), issuer, audience,
   `exp`, `iat` và `nbf` nếu có; giới hạn clock skew nhỏ. `sub` phải tồn tại.
3. Kiểm tra claim `nonce` đúng chính xác nonce trong request. Mobile đã truyền
   nonce thô cho SDK; hợp đồng này không dùng nonce đã hash.
4. Nonce mobile gửi lên **không tự nó ngăn phát lại**. Backend phải atomically
   ghi nhận token/nonce đã dùng (ví dụ hash token, khóa theo App ID), giữ tới hết
   hạn JWT cộng clock skew và từ chối sử dụng lại để tạo phiên mới. Không đánh
   dấu đã dùng trước khi chữ ký/claims hợp lệ. Nếu có retry sau mất response,
   thiết kế idempotency riêng hoặc yêu cầu đăng nhập mới, không bỏ replay check.
5. Sau xác minh dùng `sub` làm Facebook app-scoped user ID. Tên/email từ claims
   đã xác minh là tùy chọn. Không gọi Graph `/me` với ID Token, không tin profile
   giải mã bên mobile, không cấp phiên chỉ vì nonce khớp.

## Response

200 sau xác thực thành công:

```json
{
  "token": "<EarlySigns session token, không phải Facebook token>",
  "user_id": "<EarlySigns user id>",
  "email": null,
  "is_new_user": false
}
```

Mobile chấp nhận `access_token` thay `token` cho phiên EarlySigns để tương thích
luồng auth hiện có, nhưng backend mới nên thống nhất `token`. Sau đó mobile gọi
`GET /api/auth/me` như các phương thức đăng nhập khác.

Lỗi dùng HTTP status đúng và JSON `{ "code": "...", "message": "..." }`:
400 payload sai; 401 token/chữ ký/claims/nonce không hợp lệ hoặc replay; 429 rate
limit; 503 khi xác minh với Meta tạm thời không khả dụng. Không trả 200 kèm lỗi,
không lộ JWT, nonce, App Secret hay stacktrace trong log/response.

## Cấu hình native và nghiệm thu

- Facebook App ID phải cùng ứng dụng ở mobile, Meta dashboard và backend.
  Đăng ký đúng bundle ID iOS, URL scheme `fb<APP_ID>`, URL callback, Android
  package/key hashes, môi trường development/production và quyền public_profile/email.
- Expo đã dùng plugin `react-native-fbsdk-next`. Nếu thay native config/SDK cần
  build lại development client; Fast Refresh không cập nhật native dependency.
- Muốn kiểm tra khả năng chuyển sang app Facebook trên iOS, đọc `Podfile.lock`
  **của build thật** và cấu hình Meta. SDK 18.0.2 đưa lại Fast App Switching;
  khả năng sử dụng còn phụ thuộc tính năng/cấu hình Meta. Không ép `Linking.openURL`
  để giả lập đăng nhập và không cam kết mọi iPhone đều chuyển sang app Facebook.
- Test iPhone có/không cài Facebook, hủy login, đăng nhập mới và tài khoản cũ,
  từ chối email, backend 401/503, chạm liên tiếp. Android kiểm tra lại app switch.
- Backend phải có test chữ ký sai, sai audience/issuer, hết hạn, sai nonce,
  token dùng lại, thiếu email và hai request cùng token đồng thời.

## Tài liệu chính thức

- [react-native-fbsdk-next: Limited Login](https://github.com/thebergamo/react-native-fbsdk-next#limited-login-ios-only)
- [Meta Limited Login](https://developers.facebook.com/docs/facebook-login/limited-login/)
- [Meta token debugging](https://developers.facebook.com/docs/facebook-login/guides/access-tokens/debugging-and-error-handling/)
- [Facebook OIDC discovery](https://www.facebook.com/.well-known/openid-configuration/)
- [Meta iOS SDK changelog](https://github.com/facebook/facebook-ios-sdk/blob/main/CHANGELOG.md)
