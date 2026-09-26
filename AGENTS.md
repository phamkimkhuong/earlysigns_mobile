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
