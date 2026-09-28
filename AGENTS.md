# Expo & React Native Styling Rules (MANDATORY)

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

##  1. Nghiêm cấm Dynamic & Unsupported Tailwind/NativeWind Classes
Khi viết giao diện trong dự án (NativeWind v4 + React Native 0.86):
1. **Tuyệt đối KHÔNG dùng cú pháp opacity phân số (`/opacity`) trên màu sắc:**
   -  CẤM: `bg-blue-50/60`, `bg-slate-50/70`, `border-slate-200/80`, `text-black/50`
   -  THAY THẾ: Dùng style thuần: `style={{ backgroundColor: selected ? "#eff6ff" : "#f8fafc", borderColor: ... }}`
2. **Tuyệt đối KHÔNG dùng các class Web-only không tồn tại trong React Native:**
   -  CẤM: `transition-all`, `transition`, `duration-*`, `shadow-blue-500/25`, `backdrop-blur-*`, `cursor-pointer`
   -  THAY THẾ: Dùng `elevation` / `shadowColor` chuẩn React Native, hoặc React Native Reanimated cho animation.
3. **Ưu tiên React Native `style={{ ... }}` cho mọi trạng thái động (active / selected / toggled):**
   - Không nối chuỗi template string phức tạp vào `className` khi đổi màu viền, màu nền động.

## 🛡️ 2. Quy chuẩn Kiến trúc NavigationContainer
- Luôn đặt `<NavigationContainer>` ở root cấp cao nhất trong `App.tsx`.
- Tuyệt đối không đặt `<NavigationContainer>` bên trong các navigator/screen con có chứa `useTranslation()` để tránh unmount/remount làm mất context điều hướng khi đổi ngôn ngữ.

## 📏 3. Quy Chuẩn Kích Cỡ Chữ Toàn Ứng Dụng (Typography & Font Hierarchy)
Để đảm bảo trải nghiệm đọc tối ưu trên thiết bị di động (tương đương chuẩn iOS Settings & Material Design), tránh giao diện bị vụn hoặc quá nhỏ khi hiển thị trên màn hình mật độ pixel cao (Retina/OLED):
1. **Dòng menu / Hàng cài đặt / Danh sách lựa chọn (List Items & Setting Rows):**
   - Tiêu đề mục: Dùng `text-[15px]` (chuẩn Apple Settings) hoặc `text-base` (16px), font-semibold hoặc font-bold.
   - Mô tả phụ / Chú thích dưới mục: Tối thiểu `text-[13px]` (hoặc `text-sm`), không dùng `text-xs` (12px) hay `text-2xs` (10px) cho nội dung đọc dài.
2. **Nội dung văn bản chính / Điều khoản / Chính sách (Body & Legal Text):**
   - Tiêu đề từng điều khoản: `text-base` (16px) hoặc `text-lg` (18px) font-extrabold.
   - Nội dung điều khoản chi tiết: `text-[15px]` với `leading-6` để người dùng đọc thoải mái.
3. **Các nhãn nhỏ, Huy hiệu, Badge trạng thái (Badges & Tags):**
   - Tối thiểu `text-xs` (12px), tuyệt đối KHÔNG dùng `text-[10px]` hay `text-2xs` vì khó đọc trên màn hình nhỏ hoặc với người lớn tuổi.
4. **Nút bấm chính & Nút hành động phụ (Buttons):**
   - Nút lớn (Primary): `text-base` (16px) font-extrabold.
   - Nút vừa / Nút phụ (Secondary/Chip): `text-sm` (14px) font-bold.
5. **Tiêu đề phân đoạn (Section Headers):**
   - Dùng `text-xs font-bold uppercase tracking-wider` hoặc `text-[13px] font-bold`.

## 🚫 4. Quy Chuẩn Sử Dụng Icon & Nghiêm Cấm Lạm Dụng Icon AI (Sparkles)
1. **Nghiêm cấm lạm dụng icon AI (`Sparkles` / ✨):**
   - Tuyệt đối KHÔNG tùy tiện gắn icon `Sparkles` vào các nhãn thông thường, nhãn trạng thái gói (như "Hạn mức Miễn phí", "Trạng thái tài khoản", "Hạn mức dùng chung",...).
   - Tránh việc gắn icon AI vô tội vạ làm giao diện bị rối mắt, mất tính chuyên nghiệp.
2. **Quy tắc thay thế & Tối giản (Clutter-Free UI):**
   - Nhãn trạng thái tài khoản / Gói cước: Dùng `Crown` (cho Pro) hoặc **clear (bỏ hẳn icon)** đối với Free tier để giao diện thoáng, tinh tế chuẩn Apple / Material Design.
   - Hạn mức lượt dùng / Tiến trình: Dùng `Zap` (biểu thị lượt dùng / năng lượng) hoặc text thuần, không dùng `Sparkles`.
3. **Quy chuẩn hiển thị Badge & Chống vỡ chữ (Badge Layout & Anti-Truncation):**
   - Các badge ngắn (như "Miễn phí", "Pro", "Không giới hạn") khi nằm trong hàng tiêu đề phải luôn phân bổ ở phía đối diện (`justify-between`) hoặc có `shrink-0` và `numberOfLines={1}`.
   - Tuyệt đối không gom badge và tiêu đề dài chung một container chật hẹp khiến React Native tự ngắt dòng ở khoảng trắng (làm rớt chữ như "Miễn phí" thành "Miễn").


