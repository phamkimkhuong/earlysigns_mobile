**Nghiên cứu khả năng triển khai đăng nhập Facebook cho EarlySigns**

Ngày kiểm tra: 24/09/2026. Chuẩn yêu cầu: mục 6.3 của `Tai lieu dac ta phan mem.md`.

**Kết luận**

Facebook Login có thể được triển khai cho dự án Expo/React Native này. Chưa thể xác nhận ngày sẵn sàng cho mọi khách hàng: cần Meta App thực, cấu hình Android/iOS, backend xác minh token, bản build native và trạng thái quyền truy cập của ứng dụng trên Meta. Tài liệu Expo hiện hướng dẫn `react-native-fbsdk-next` cho Facebook Login và yêu cầu development build; Expo Go không chạy được thư viện này. Chưa có bằng chứng thư viện đã được kiểm tra cụ thể với Expo 57 / React Native 0.86 của dự án nên cần thử biên dịch sớm.

Nguồn: [Expo Facebook authentication](https://docs.expo.dev/guides/facebook-authentication/), [React Native FBSDK Next](https://github.com/thebergamo/react-native-fbsdk-next), [Expo AuthSession SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/auth-session/).

**Hiện trạng EarlySigns**

- `package.json` có `expo-auth-session`, Apple SDK, nhưng không có `react-native-fbsdk-next` hoặc module Facebook.
- `LoginScreen.tsx` chỉ có OTP, Apple, Google; `config.ts` chỉ có Google Client ID. Backend trong workspace này không có `/api/auth/facebook` để kiểm tra.
- Scheme hiện tại là `earlysigns` trong `app.json`. Native Facebook SDK còn yêu cầu scheme dạng `fb<Meta App ID>` theo hướng dẫn của thư viện; không được thay thế tùy tiện bằng scheme hiện tại.
- Android `applicationId` và iOS bundle identifier hiện là `com.mhung.hust.earlysigns` trong các thư mục native. Cần chốt các định danh phát hành trước khi khai báo trên Meta.
- Dự án có thư mục `android/` và `ios/`, nên sau khi thêm config/plugin phải kiểm tra cấu hình native thực tế và build lại. Lệnh chạy Expo Go trong README không đủ để kiểm tra Facebook SDK.

**Vì sao khó hơn Google trong trường hợp này**

1. **Native build:** con đường Expo đang hướng dẫn là `react-native-fbsdk-next`, cần mã native và development build. SDK này không chạy bằng Expo Go. Google hiện được dự án triển khai bằng `expo-auth-session`, dù luồng Google cũng cần kiểm thử build phát hành.
2. **Android:** Meta cần package name, class name và key hash đúng với chứng chỉ ký ứng dụng. Key hash bản debug có thể khác bản do Google Play ký. Tài liệu Expo hiện lưu ý việc thêm Android platform vào Meta project cần Play Store URL hợp lệ của ứng dụng đã được chấp thuận; đây là phụ thuộc phát hành phải kiểm tra sớm với Meta App thật, không nên đợi tới cuối dự án. [Expo Facebook authentication](https://docs.expo.dev/guides/facebook-authentication/).
3. **iOS Limited Login:** thư viện mô tả luồng này trả `AuthenticationToken` dạng OpenID Connect thay vì `AccessToken` dùng cho Graph API. Backend phải xác minh đúng loại token và nonce; không thể giả định cùng một kiểu token cho iOS/Android hoặc gửi Limited Login token vào Graph API. [React Native FBSDK Next — Limited Login](https://github.com/thebergamo/react-native-fbsdk-next#limited-login-ios-only).
4. **Quyền cho người dùng thật:** tài khoản có vai trò trong Meta App có thể đăng nhập khi app còn phát triển, nhưng tài khoản khách hàng bình thường còn phụ thuộc app mode và quyền truy cập cho `public_profile`, `email`. Yêu cầu Advanced Access, Business Verification hoặc App Review cụ thể phụ thuộc loại Meta App, trạng thái và quyền được yêu cầu; phải đọc trực tiếp trang *App Review → Permissions and Features* của Meta App sẽ dùng. Không nên khẳng định mọi app đều phải qua cùng một bước duyệt. [Meta access levels](https://developers.facebook.com/docs/graph-api/overview/access-levels/).
5. **Email không đáng tin làm khóa chính:** quyền email có thể không được cấp hoặc Meta không trả email. Thư viện cũng ghi rõ trường email không lấy trực tiếp được từ Android native SDK dù đã yêu cầu quyền; cần lấy profile bằng luồng phù hợp và vẫn có phương án khi email rỗng. [React Native FBSDK Next](https://github.com/thebergamo/react-native-fbsdk-next).

**Phương án phù hợp**

Ưu tiên SDK native qua `react-native-fbsdk-next` vì đây là đường Expo hướng dẫn cho Facebook. Cần kiểm tra tương thích bằng một bản development build Android và iOS trước khi mở rộng UI/backend. Một phương án khác là dùng `expo-auth-session` với browser OAuth qua backend, nhưng phải thử redirect HTTPS, scheme và chính sách hiện hành của Meta với chính Meta App này. Không nên mặc định rằng có thể chỉ thay Google URL bằng Facebook URL là xong. AuthSession hỗ trợ OAuth chung, còn Expo khuyến nghị thư viện của nhà cung cấp khi có. [Expo AuthSession SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/auth-session/).

**Thiết kế đăng nhập để đáp ứng mục 6.3**

| Yêu cầu đặc tả | Cách đáp ứng |
| --- | --- |
| Trạng thái riêng cho từng nhà cung cấp | `facebookLoading` độc lập với OTP/Apple/Google; chặn bấm lặp; hiển thị lỗi riêng của Facebook. |
| Hủy không báo lỗi | Kiểm tra kết quả `isCancelled` hoặc callback hủy; trở lại Login mà không toast thất bại. |
| Đổi tài khoản | Có thao tác đăng xuất/chọn tài khoản Facebook và chạy lại xác thực; thử trên máy có/không cài Facebook app. Không dựa vào việc xóa session EarlySigns là đã đổi tài khoản Meta. |
| Không trả email | Backend định danh bằng cặp `(provider = facebook, provider_user_id)` đã được xác minh; email là thuộc tính tùy chọn. Nếu sản phẩm bắt buộc email, xin bổ sung qua bước xác minh riêng. |
| Email riêng tư Apple | Giữ cách định danh theo Apple subject, không gộp với Facebook/Google chỉ vì email giống hoặc khác. |
| Quyền bị thu hồi/token hết hạn | Backend kiểm tra token tại đăng nhập, phát phiên EarlySigns riêng, xử lý khi xác minh thất bại và yêu cầu đăng nhập lại khi phiên ứng dụng hết hạn. |
| Không tự gộp tài khoản | Bảng identity theo provider + subject; liên kết với tài khoản đã có chỉ sau thao tác và xác nhận rõ ràng của người dùng. |
| Giữ nội dung/mục tiêu | Lưu intent có cấu trúc (route, ID bài, video, hành động) và bản nháp trước khi mở SDK; sau `handleLoginSuccess` nạp lại nội dung rồi điều hướng. Cơ chế `next/nextParams` hiện tại chỉ giữ màn hình/params, chưa giữ bản nháp. |

Backend nên cung cấp `POST /api/auth/facebook` nhận loại chứng thực và token. Phía máy chủ xác minh chữ ký/issuer/audience/hạn dùng/nonce cho iOS Limited Login hoặc kiểm tra access token và chủ thể Facebook cho luồng còn lại, rồi mới tạo phiên EarlySigns. App secret chỉ nằm ở server. Trả rõ người dùng mới/cũ, trạng thái cần bổ sung email hoặc xác nhận liên kết, và lỗi nhà cung cấp tạm thời không khả dụng.

**Các mốc quyết định triển khai**

1. Chốt chủ sở hữu Meta App, loại app, quyền đã được cấp, app mode, privacy policy/data deletion URLs, App ID/client token; không chia sẻ App Secret trong mã mobile.
2. Chốt Android package, iOS bundle ID và tài khoản phát hành. Đối chiếu yêu cầu Play Store URL và lấy key hash từ đúng chứng chỉ debug, upload và Play App Signing.
3. Làm bản thử native đăng nhập bằng tài khoản có vai trò trên Meta App. Kiểm tra riêng Android token và iOS Limited Login token; thử hủy, đổi tài khoản và email rỗng.
4. Hoàn thiện backend identity/token verification, sau đó thử tài khoản Facebook không có vai trò trong Meta App. Đây mới là bằng chứng có thể mở cho khách hàng.
5. Chạy ca nghiệm thu mục 6.3 với đăng nhập mới/cũ, session hết hạn, mất mạng, quyền bị thu hồi và bảo toàn bản nháp/đích điều hướng.

Giới hạn nghiên cứu: trang Meta Developer Dashboard của khách hàng và backend không có trong workspace, nên chưa xác nhận app mode, quyền, review hoặc Business Verification của ứng dụng cụ thể. Một số trang tài liệu Meta công khai trả giới hạn truy cập khi kiểm tra; các điều kiện thay đổi theo dashboard phải được xác nhận trực tiếp ở đó. Trong lượt này chỉ nghiên cứu và tạo ghi chú, chưa thay đổi chức năng đăng nhập.
