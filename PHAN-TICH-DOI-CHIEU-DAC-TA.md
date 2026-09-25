**BÁO CÁO ĐỐI CHIẾU DỰ ÁN EARLYSIGNS VỚI ĐẶC TẢ PHẦN MỀM**

Ngày rà soát: 24/09/2026. Chuẩn nghiệp vụ: `Tai lieu dac ta phan mem.md`, phiên bản 1.0.

**1. Kết luận và phạm vi đánh giá**

Dự án đã có cấu trúc và phần lớn màn hình của ứng dụng luyện phát âm, nhưng chưa đủ điều kiện nghiệm thu theo đặc tả. Những vấn đề chính nằm ở quy tắc nghiệp vụ và việc nối các luồng: thanh toán Store chưa thực sự được tích hợp, hạn mức đang bị vô hiệu hóa, ngưỡng hiển thị tiến độ bị bỏ qua, dữ liệu tài khoản chưa được dọn sạch ở các màn hình, thiếu Facebook, thiếu xử lý thông báo đẩy và chương trình giới thiệu thực tế.

Đánh giá này dựa trên đọc mã nguồn mobile, đối chiếu từng nhóm yêu cầu và chạy TypeScript/ESLint. Chưa kiểm thử trên thiết bị iOS/Android, chưa xác minh backend, tài khoản OAuth, dịch vụ chấm phát âm, App Store/Google Play hay hệ thống gửi push. “Có triển khai” không đồng nghĩa “đã nghiệm thu”. Không dùng tỷ lệ hoàn thành phần trăm vì chưa có bộ test nghiệm thu và trọng số yêu cầu được thống nhất.

`Tai-lieu-cap-nhap.md` và `README.md` chỉ được dùng làm tài liệu tham khảo. Khi nội dung của chúng khác đặc tả hoặc khác mã nguồn thực tế, đặc tả là chuẩn yêu cầu và mã nguồn là bằng chứng hiện trạng.

**2. Cấu trúc kỹ thuật hiện tại**

| Thành phần | Hiện trạng và vai trò |
| --- | --- |
| Nền tảng | React Native 0.86.3, Expo ~57.0.25, React 19.2.3, TypeScript |
| Điều hướng | React Navigation: hai tab Home/Profile và các màn hình luyện tập trên stack |
| Giao diện | NativeWind, các component dùng chung, biểu đồ tiến độ, trình phát YouTube |
| Khởi động | `App.tsx` nạp lưu trữ/ngôn ngữ; `AuthProvider` khôi phục và xác minh phiên |
| Tài khoản | `services/Auth.tsx`, OTP/Google/Apple, API `/api/auth/*` |
| Luyện tập | `usePronunciationCheck`, `IPAChecking`, các màn hình video/văn bản/ngữ âm/hành trình |
| Dữ liệu | Chủ yếu fetch trực tiếp, state từng màn hình, cache `sessionData` và sự kiện billing |
| Trạng thái bổ sung | Có QueryClient và Zustand, nhưng chưa thấy màn hình dùng `useQuery`, `useMutation`, `useAppStore` hoặc `useBillingStore` trong luồng hiện tại |
| Phụ thuộc ngoài workspace | Backend cung cấp nội dung, OCR, audio, chấm điểm, tiến độ, đăng nhập và quyền lợi |

Cấu trúc hiện tại có thể tiếp tục phát triển. Chưa có căn cứ cần viết lại toàn bộ. Nên ưu tiên sửa quy tắc nghiệp vụ và vòng đời tài khoản trước khi tổ chức lại tầng dữ liệu.

**3. Đối chiếu 15 tiêu chí nghiệm thu ở mục 20**

“Phù hợp trong mã” chỉ xác nhận cấu trúc/logic đã đọc; các luồng tích hợp vẫn cần kiểm thử thực tế.

| STT | Yêu cầu nghiệm thu | Đánh giá | Bằng chứng hoặc phần còn thiếu |
| --- | --- | --- | --- |
| 1 | Chọn ngôn ngữ, giới thiệu, đăng nhập trước luyện tập | Một phần | Có onboarding và chặn các nút tính năng từ Home. Kết thúc onboarding đi thẳng Main, chưa yêu cầu đăng nhập theo mục 5.1. |
| 2 | OTP, Apple, Google, Meta/Facebook và quay lại đúng tính năng | Chưa đạt | Có OTP/Apple/Google và `next`/`nextParams`; chưa có Facebook. Giữ màn hình đích chưa bảo đảm giữ nội dung đang nhập. |
| 3 | Home theo thứ tự Video → Văn bản → Ngữ âm, không có thẻ Kiểm tra phát âm | Phù hợp trong mã | Ba khu vực đúng thứ tự tại `HomeScreen.tsx`. |
| 4 | Đăng xuất chỉ xem Home, muốn dùng tính năng phải đăng nhập | Chưa đạt | Home có chặn truy cập, nhưng Profile vẫn mở được; state tiến độ không được xóa khi mất token. |
| 5 | Luyện video, văn bản, âm và cá nhân hóa | Một phần | Đã có màn hình và API; còn thiếu tiếp tục video đúng vị trí, hướng dẫn âm, hoàn tất bài từ Home và chọn bài mở khóa cụ thể. |
| 6 | Ghi âm, phân tích, kết quả, xử lý lỗi rõ ràng | Một phần | Có hook ghi âm/chấm điểm, tự dừng khi im lặng và timeout. Còn tự ghi khi mở modal, thiếu dừng rõ ràng khi đóng modal, âm thừa bị lọc khỏi kết quả. |
| 7 | Chỉ hiển thị tiến độ khi đủ ngưỡng | Chưa đạt | `MOBILE_FREE_ACCESS` làm ngưỡng luôn đạt; công thức còn sai 35/44 và tự giả định 5 lượt khi thiếu số đếm. |
| 8 | Nhập, quét, lưu, luyện văn bản | Một phần | Có API và giao diện; thiếu bảo toàn bản nháp qua đăng nhập lại, xử lý lỗi mở camera/thư viện, trạng thái danh sách và dọn dữ liệu khi mất phiên. |
| 9 | Hạn mức tháng 100/20/20 | Chưa đạt | Có hằng số nhưng các hàm chặn bị bypass; chu kỳ local là tháng lịch, chưa theo chu kỳ tài khoản. |
| 10 | Chỉ có Home và Profile ở thanh tab | Phù hợp trong mã | `RootNavigator.tsx` khai báo đúng hai tab. |
| 11 | Xem quyền lợi, mua/khôi phục/quản lý Pro qua Apple/Google | Chưa đạt | Có paywall và link quản lý gói; mua/restore chưa kết nối Store thực, giá hardcode và có cấp Pro local. |
| 12 | Cấp, từ chối, thay đổi quyền thông báo | Một phần | Có kiểm tra/yêu cầu quyền và mở Cài đặt; chưa có bước giải thích riêng trước prompt, thiếu kiểm thử từ chối và thay đổi quyền trên máy. |
| 13 | Bấm thông báo mở đúng nội dung | Chưa đạt | Chưa thấy listener xử lý notification response/cold start hoặc điều hướng theo payload. |
| 14 | Tắt marketing vẫn nhận thông báo thiết yếu | Chưa đạt | Hai tùy chọn mới được lưu local; chưa thấy đăng ký push token hay đồng bộ lựa chọn với hệ thống gửi. |
| 15 | Toàn bộ màn hình chính có Việt/Anh | Chưa đạt | Có i18n nhưng nhiều chuỗi Home/Profile/Payment/quota/thông báo ghi trực tiếp tiếng Việt; nội dung Terms/Privacy ghi trực tiếp tiếng Anh. |

**4. Các sai lệch cần sửa trước nghiệm thu**

**F01 — Thanh toán chưa phải giao dịch Store thực. Ưu tiên P0. Đặc tả 15.1–15.4.**

`src/services/iap.ts:110` tìm sản phẩm trong danh sách cố định; `:128` tự tạo transaction ID bằng thời gian và số ngẫu nhiên. Khi API lỗi hoặc không xác nhận quyền, `:143` vẫn tự tính hạn dùng, lưu local, `seedBillingUsage` cấp Pro và `:166` trả thành công. Chưa thấy mã gọi StoreKit/Google Play Billing hoặc thư viện cầu nối IAP trong luồng này. Giá tại `:21` không được lấy từ Store.

Restore ở `:215` dùng bản ghi local chung `earlysigns_active_iap_subscription`, không gắn tài khoản. Logout không xóa bản ghi đó. Vì vậy có nhánh cấp quyền giao diện cho tài khoản khác trên cùng máy từ bản ghi cũ; chưa thể kết luận backend cũng cấp quyền tương ứng.

`PaymentScreen.tsx` truyền `status: "confirmed"` khi chuyển màn hình nhưng `PaymentResultScreen.tsx:20`–`:27` chỉ xác minh bằng `orderCode`, bỏ qua tham số đó. Luồng IAP không truyền orderCode nên có thể mắc ở giao diện “đang xác minh”.

Hướng sửa: nối giao dịch Store thật, lấy sản phẩm/giá/chu kỳ từ Store, xác minh quyền lợi qua backend, không tự cấp Pro khi xác minh lỗi. Thiết kế đầy đủ trạng thái hủy/chờ/phê duyệt/đã sở hữu/chưa xác nhận/hoàn tiền/thu hồi. Restore phải truy vấn giao dịch thực và gắn đúng tài khoản. Màn hình kết quả phải dùng đúng trạng thái của luồng IAP.

**F02 — Hạn mức miễn phí bị vô hiệu hóa và mô hình tính tháng chưa đúng. P0. Đặc tả 14.**

`src/core/config.ts:16` bật `MOBILE_FREE_ACCESS = true`; các hàm kiểm tra quota trong `services/usageLimits.ts` trả không hết hạn mức. Snapshot ở `:162` coi mọi tài khoản là không giới hạn; `MonthlyQuotaCard.tsx:31` hiển thị “Tài khoản Pro Không Giới Hạn” ngay cả khi tài khoản thực tế miễn phí. Hook ghi âm cũng bỏ qua đếm local ở `usePronunciationCheck.ts:232`.

Ngay cả khi tắt cờ, vẫn còn các vấn đề: reset theo YYYY-MM trên thiết bị (`usageLimits.ts:61`), OCR/audio chỉ đếm local, khóa tài khoản dựa email hoặc dùng chung `__signed_in__` khi thiếu email, và dùng `daily_remaining` cho số dư tháng mà chưa có hợp đồng API chứng minh ý nghĩa tương ứng. Chưa có thời điểm reset thật trong dữ liệu snapshot.

`IPAChecking.tsx:240` lấy audio mới qua callback mỗi lần nghe nếu câu chưa có `audio_url`, nhưng không lưu URL trả về vào cache câu. `TextPracticeScreen.tsx:242` tăng quota mỗi lần nhận URL. Có nguy cơ nghe lại vẫn bị tính thêm lượt.

Hướng sửa: chuẩn hóa quota theo user ID và chu kỳ tài khoản do backend trả về; tách ba bộ đếm, chỉ tăng khi thành công, thống nhất thông báo hết lượt/ngày reset, và tái sử dụng audio đã sinh. Việc chỉ tắt cờ là chưa đủ.

**F03 — Ngưỡng hiển thị tiến độ sai. P0. Đặc tả 13.1.**

`ProfileScreen.tsx:211` trả `true` nếu bật free access nên có thể hiển thị biểu đồ 0 khi chưa có dữ liệu. `:63` dùng ngưỡng 35/44, tương đương khoảng 79,55%, thấp hơn yêu cầu ít nhất 80%; nếu tổng âm là 44 thì cần tối thiểu 36 âm đủ điều kiện. `:205` tự xem một âm có accuracy nhưng thiếu số đếm là đã có 5 lượt kiểm tra.

Home hiển thị `total_accuracy` khi có số mà không kiểm tra ngưỡng; Phonemes cũng hiển thị điểm khi số lớn hơn 0. Vì vậy sửa riêng Profile không bảo đảm toàn ứng dụng đúng yêu cầu.

Hướng sửa: một quy tắc chung dựa trên số âm theo dõi thực tế và số lượt chấm thành công được xác nhận; thiếu dữ liệu số lượt phải được coi là chưa đủ bằng chứng. Trước ngưỡng chỉ hiện trạng thái đang xây dựng hồ sơ và nút về Home. Sau ngưỡng bổ sung các mục còn thiếu trong Profile: số lượt, streak, bài gần đây và đề xuất học.

**F04 — Mất phiên/đăng xuất chưa cô lập dữ liệu và chức năng. P0. Đặc tả 3.1, 6.4, 10.3, 19.**

`Auth.tsx:119` xóa token và cache dịch vụ, nhưng không reset state từng màn hình. `ProfileScreen.tsx:170` chỉ tắt loading rồi return khi không có token; `items`, `history`, `usage` vẫn được giữ. Profile không có điều kiện chặn người chưa đăng nhập, và `RootNavigator.tsx` luôn đăng ký tab đó. Sau khi tài khoản A xem tiến độ rồi logout, mã hiện tại cho phép quay lại vùng tiến độ với dữ liệu đã giữ.

`HomeScreen` không xóa summary trong effect khi token mất; khu vực âm yếu/hành trình vẫn được render ngoài điều kiện đăng nhập. `TextPracticeScreen` không xóa passages khi mất phiên; nếu API sau đó lỗi, danh sách cũ vẫn có thể tồn tại trên màn hình đang giữ trong stack. Cài đặt và lịch nhắc local cũng không được dừng khi logout.

Hướng sửa: chặn tập trung các khu vực tài khoản/luyện tập, reset navigation phù hợp khi phiên mất, xóa state và cache theo tài khoản, hủy request cũ và ngăn response cũ cập nhật phiên mới. Giữ quyền truy cập ngôn ngữ/pháp lý theo mục 3.1.

**F05 — Vòng đời ghi âm và kết quả chưa khớp yêu cầu. P1. Đặc tả 8, 19.**

`IPAChecking.tsx:183` tự gọi ghi âm sau 400 ms khi mở phiên. Text/Home/Journey đều truyền `autoRecordKey`, chưa có hướng dẫn tự động rõ ràng tương ứng với ngoại lệ ở mục 8.2. Người dùng có thể bị hỏi quyền micro ngay khi bấm bắt đầu bài, trước khi chủ động bấm ghi âm.

Đóng modal chỉ gọi `onClose`; `:294` trả null khi đóng nhưng component và hook vẫn có thể còn mounted. Hook dọn recorder khi unmount (`usePronunciationCheck.ts:478`), chưa có nhánh dừng tương ứng khi `open` chuyển false hoặc màn hình mất focus. Cần xác minh trên thiết bị các trường hợp đóng modal, chuyển nền và cuộc gọi; mã hiện tại chưa bảo đảm dừng theo yêu cầu.

`utils/pronunciationAnalysis.ts:81` chỉ đưa correct/deleted/replaced vào phân tích; `ScoreWords.tsx:45` lọc inserted. Vì vậy âm thừa chưa được thể hiện đầy đủ theo mục 8.3. Replay và chi tiết còn bị ẩn theo ngưỡng điểm trong `IPAChecking`, cần đối chiếu yêu cầu cho phép nghe lại và xem lỗi kể cả điểm thấp.

Hướng sửa: chỉ ghi âm sau thao tác/hướng dẫn phù hợp, dừng và giải phóng tài nguyên khi đóng/rời chức năng, bổ sung âm thừa và kiểm thử mọi nhánh quyền micro/mất mạng/không có tiếng nói.

**F06 — Thiếu Facebook và luồng đăng nhập chưa giữ đủ ngữ cảnh. P1. Đặc tả 5, 6, 19.**

`LoginScreen.tsx` có OTP, Apple và Google; không tìm thấy luồng Facebook trong mã mobile. OTP có gửi lại/đổi email nhưng chưa có countdown gửi lại. Việc xử lý email riêng tư, thu hồi quyền và liên kết tài khoản cần xác minh thêm phía backend.

`OnboardingScreen.tsx:102` hoàn tất bằng Main, khác bước yêu cầu đăng nhập ở mục 5.1. Cần giữ nhất quán với quyền xem Home của khách ở mục 3.1: màn hình kết thúc onboarding dẫn đăng nhập, còn khả năng xem Home/pháp lý vẫn phải tuân theo phạm vi khách được phép.

`navigateAfterLogin` reset stack và tạo lại màn hình đích. Văn bản/tiêu đề trong Text chỉ được giữ bằng state cục bộ, nên khi bị yêu cầu đăng nhập lại có thể mất nội dung đang nhập, dù quay lại đúng tên màn hình.

Hướng sửa: bổ sung provider thiếu và bảo toàn cả hành động đích, ID nội dung, tham số và bản nháp. Không coi việc quay lại đúng route là đã đáp ứng yêu cầu giữ ngữ cảnh.

**F07 — Thông báo mới có nhắc local. P1. Đặc tả 16.**

`notifications.ts:147` lên lịch nhắc hằng ngày với payload `{ screen: "Home" }`. Không tìm thấy đăng ký push token, đồng bộ tùy chọn với backend, listener khi bấm thông báo hay xử lý thông báo khi mở app từ trạng thái đóng. Hai cờ nội dung/marketing chỉ ghi vào lưu trữ thiết bị.

Chưa đủ các loại nhắc bài dang dở, streak, nội dung mới, tài khoản/gói và marketing. `saveNotificationSettings` chưa dùng kết quả boolean của thao tác lên lịch để phản ánh thất bại. Nội dung nhắc chỉ có tiếng Việt. Khi logout chưa hủy nhắc.

Hướng sửa: định nghĩa payload theo loại nội dung và ID, đồng bộ token/tùy chọn theo tài khoản, xử lý app đang mở/đang nền/đã đóng, đăng nhập rồi tiếp tục, nội dung hết hiệu lực và tắt marketing độc lập thông báo thiết yếu.

**F08 — Chương trình giới thiệu mới là trang mô tả. P1. Đặc tả 17.**

`ReferralScreen.tsx:15` đưa người dùng về Profile kèm `referral: create/redeem`, nhưng Profile không xử lý tham số này và chưa có UI/API tạo, nhập, sao chép, chia sẻ hoặc xem trạng thái mã. Có chuỗi dịch về referral không chứng minh tính năng đã triển khai. Mã kích hoạt trong Payment là luồng khác, không thay thế chương trình giới thiệu.

Hướng sửa: triển khai đầy đủ tạo/nhập mã, chia sẻ, điều kiện/thời hạn/số lần dùng/phần thưởng và lý do từ chối; cập nhật quyền lợi khi đủ điều kiện.

**F09 — Video chưa tiếp tục từ vị trí đã luyện. P1. Đặc tả 9.**

Có danh mục, chủ đề/trình độ, thumbnail, thời lượng, số câu, video đã xem và API ghi nhận từng segment. Tuy nhiên `VideoPracticeScreen.tsx:225` luôn `setActiveIndex(0)` khi nạp video, chưa khôi phục câu đang học. Ghi nhận đã xem không thay thế việc khôi phục tiến độ luyện.

Hướng sửa: lưu và đọc vị trí/tiến độ theo user và video, mở câu phù hợp khi người dùng chọn tiếp tục. Phân biệt đã xem với đã chấm phát âm thành công khi thiết kế dữ liệu.

**F10 — Ngữ âm/hành trình chưa liền mạch. P1. Đặc tả 7.1, 11, 12.**

`PhonemesScreen.tsx:182` xóa `instructionsHtml` khi mở bài âm, nên hướng dẫn phát âm từ bài học không được hiển thị qua cơ chế đó. Home/Phonemes dùng năm âm cố định khi chưa có danh sách âm yếu, dễ khiến dữ liệu mặc định được hiểu là kết quả cá nhân hóa. Các chip âm trên Home chỉ mở danh sách Phonemes mà không truyền âm vừa chọn.

`HomeJourney.tsx:82` chỉ cung cấp nút cho module current và callback không nhận ID bài/module; chưa có luồng chọn một bài mở khóa cụ thể. Journey có callback `/api/lessons/journey-complete`, nhưng modal bài cá nhân hóa từ Home không truyền `onLessonAllCompleted` và tải bài tiếp theo cũng chưa gọi cùng luồng ghi hoàn thành. Cần xác minh backend có tự ghi nhận hay không; phía mobile hiện không nhất quán.

Hướng sửa: một luồng hoàn thành bài dùng chung, giữ hướng dẫn âm, truyền đúng âm/bài đã chọn, hỗ trợ các bài được mở khóa và cập nhật summary/streak/đề xuất sau thành công.

**F11 — Văn bản/OCR còn thiếu xử lý trạng thái. P1. Đặc tả 10, 19.**

Điểm đã có: nhập/dán, chuẩn bị câu, lưu tiêu đề, nạp đoạn cũ; tải danh sách không tự xóa input. OCR đưa nội dung vào editor để sửa.

Điểm thiếu: `TextPracticeScreen.tsx:178` gọi camera/thư viện trước khối try/catch và trước trạng thái loading, nên lỗi từ chối quyền/lỗi mở picker chưa đi qua thông báo lỗi của màn hình. Danh sách chỉ render `passages.map`, lỗi nạp bị bỏ qua, chưa có trạng thái tải/rỗng/lỗi rõ ràng. Lưu lại đoạn đã mở vẫn gọi POST không kèm ID, cần chốt API cập nhật đoạn cũ để tránh tạo bản sao ngoài ý muốn.

Hướng sửa: xử lý quyền và lỗi toàn bộ thao tác picker, trạng thái danh sách, bản nháp qua đăng nhập/paywall và cập nhật đoạn đã lưu theo ID.

**F12 — Bản địa hóa và khả năng tiếp cận chưa đủ. P1/P2. Đặc tả 5, 18, 19.**

Nhiều nội dung chính của Home/Profile/Payment/MonthlyQuotaCard và thông báo viết trực tiếp tiếng Việt. Terms/Privacy chỉ dịch tiêu đề, phần thân tiếng Anh cố định. Đổi i18n không thể đổi các chuỗi này. Địa chỉ hỗ trợ ở Profile và trang pháp lý còn khác tên miền, cần thống nhất theo thông tin khách hàng cung cấp.

Chưa tìm thấy khai báo accessibility trong mã `src`. Điều này không có nghĩa mọi điều khiển đều không đọc được, nhưng chưa đủ bằng chứng đáp ứng toàn bộ tính năng chính với VoiceOver/TalkBack. Các nút biểu tượng, trạng thái xử lý, cách mô tả đúng/sai và bố cục cỡ chữ lớn cần kiểm thử riêng.

Hướng sửa: chuyển mọi chuỗi giao diện sang key dịch, thống nhất nội dung pháp lý/hỗ trợ, bổ sung nhãn/vai trò/trạng thái truy cập và kiểm thử hai ngôn ngữ với cỡ chữ lớn trên thiết bị.

**5. Kết quả kiểm tra kỹ thuật**

| Kiểm tra | Kết quả |
| --- | --- |
| `npm run typecheck` | Thành công, exit code 0 |
| `npm run lint` | Exit code 0; 0 lỗi, 13 cảnh báo, chủ yếu setState trong effect và import i18n |
| Kiểm thử tự động nghiệp vụ | Chưa thấy file test/spec thuộc mã ứng dụng trong phạm vi đã rà soát |
| Build/export native | Chưa chạy trong lượt phân tích này |
| Luồng trên thiết bị và tích hợp dịch vụ | Chưa kiểm thử |

Lần chạy ban đầu bị EPERM do sandbox; chạy lại ngoài sandbox đã hoàn tất. Không coi lỗi quyền ban đầu là lỗi TypeScript của dự án.

Đã đọc [tài liệu Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/) theo AGENTS.md. Tài liệu yêu cầu Node tối thiểu 22.13.x cho SDK 57; runtime ghi nhận trong lần chạy ban đầu là Node 20.20.0. Nên chuẩn hóa Node và kiểm tra build trong môi trường đáp ứng phiên bản trước vòng QA thiết bị. Đây là điểm môi trường, không phải bằng chứng một chức năng đã hỏng.

Tài liệu cập nhật có khẳng định build thành công bảo đảm ứng dụng hoạt động 100% trên thiết bị. Kết luận đó vượt quá bằng chứng: typecheck, lint và bundle không xác minh giao dịch Store, quyền thiết bị, backend hoặc toàn bộ tiêu chí nghiệm thu.

**6. Thứ tự thực hiện đề xuất**

| Đợt | Công việc | Điều kiện kết thúc |
| --- | --- | --- |
| 1 — Quy tắc nền tảng | F01–F04: quyền Pro thật, quota thật, ngưỡng tiến độ, cô lập tài khoản | Không cấp Pro giả; không dùng vượt quota; không hiện điểm trước ngưỡng; không lộ dữ liệu tài khoản trước |
| 2 — Luồng luyện tập | F05, F09–F11 và giữ bản nháp ở F06 | Bắt đầu/dừng/đóng an toàn; resume video; bài âm có hướng dẫn; hoàn thành bài cập nhật tiến độ; văn bản được bảo toàn |
| 3 — Chức năng còn thiếu | Facebook, push/định tuyến thông báo, referral | Luồng thành công/thất bại/hủy hoạt động với dịch vụ thực và đúng tài khoản |
| 4 — Chất lượng nghiệm thu | Việt/Anh, accessibility, lỗi/rỗng/loading, đồng bộ tài liệu | Hoàn tất kiểm thử mục 20 trên iOS và Android với bằng chứng kết quả |

Không cần đổi toàn bộ kiến trúc để bắt đầu. Nên thống nhất dữ liệu tài khoản/quota/progress trước, sau đó giảm cache và state trùng lặp trong các màn hình liên quan.

**7. Bộ ca nghiệm thu cần dùng để xác nhận đã sửa**

| Nhóm | Ca kiểm thử và kết quả mong đợi |
| --- | --- |
| Khách/onboarding | Cài mới → chọn ngôn ngữ → xem giới thiệu → đăng nhập theo luồng mục 5.1; khách chỉ truy cập phạm vi mục 3.1 |
| Đăng nhập | OTP/Apple/Google/Facebook; thành công/hủy/lỗi; giữ đúng màn hình, bài và bản nháp trước đăng nhập |
| Đổi tài khoản | A xem tiến độ/lưu văn bản/bật nhắc → logout → guest → B login; không thấy dữ liệu hay quyền Pro của A |
| Quota | Lần thành công thứ 100/20/20 được tính đúng; thao tác kế tiếp bị chặn trước khi bắt đầu; lỗi/hủy không trừ; hết OCR vẫn luyện bằng ghi âm nếu còn lượt |
| Chu kỳ quota | Cùng tài khoản trên hai thiết bị có cùng số dư và ngày reset; đổi ngày máy/cài lại không cấp lại hạn mức |
| Audio | Sinh một audio thành công tính một lượt; nghe lại audio đó không tăng usage |
| Ngưỡng tiến độ | 34/44, 35/44 âm đủ 5 lần chưa mở; 36/44 mới đạt nếu tổng theo dõi là 44; thiếu checks_count không tự coi đủ; mọi màn hình dùng cùng quy tắc |
| IAP | Giá do Store cung cấp; mua/hủy/chờ/phê duyệt/lỗi; không cấp Pro khi chưa xác nhận; restore sau cài lại/đổi máy; hết hạn/hoàn tiền/thu hồi cập nhật đúng |
| Ghi âm | Không tự thu thiếu hướng dẫn; từ chối quyền có hướng xử lý; đóng modal/chuyển nền/cuộc gọi dừng an toàn; im lặng/quá ngắn/mất mạng có thể thử lại |
| Kết quả | Hiển thị đúng, thiếu, thừa, thay thế; nghe lại bản ghi kể cả điểm thấp; chuyển tới bài âm tương ứng |
| Video | Luyện vài câu → thoát → mở lại từ danh sách đã luyện; tiếp tục đúng câu và tiến độ |
| Hành trình | Bài current và bài mở khóa truy cập đúng; bài khóa không truy cập; hoàn thành từ Home/Phonemes/Journey đều cập nhật nhất quán |
| Văn bản | Camera/thư viện được cấp hoặc từ chối; OCR rỗng/lỗi; mở/sửa/lưu đoạn; danh sách tải lỗi không xóa nội dung đang nhập |
| Thông báo | App mở/nền/đóng; đúng bài/paywall; hết phiên đăng nhập rồi tiếp tục; nội dung hết hiệu lực về màn hình an toàn; tắt marketing vẫn nhận giao dịch |
| Referral | Tạo/sao chép/chia sẻ/nhập mã; mã hết hạn/đã dùng/không hợp lệ; phần thưởng và số lần dùng được hiển thị đúng |
| Ngôn ngữ và tiếp cận | Việt/Anh toàn bộ màn hình, pháp lý và thông báo; cỡ chữ lớn; VoiceOver/TalkBack; không chỉ dùng màu để diễn đạt trạng thái |

**8. Dữ liệu cần chốt với đội sản phẩm/backend khi triển khai**

- Hợp đồng API quota theo tháng: user ID, chu kỳ bắt đầu/kết thúc, số đã dùng/còn lại từng loại và quy tắc đếm thành công.
- Tổng số âm được theo dõi, định nghĩa một lượt kiểm tra thành công cho từng âm và dữ liệu ngưỡng đã được backend xác nhận.
- Quyền lợi/SKU/giá/chu kỳ của gói Store và nguồn xác nhận trạng thái quyền lợi.
- Dữ liệu vị trí video, ID bài học, hoàn tất hành trình và cách cập nhật streak.
- Payload thông báo, hệ thống gửi, lựa chọn marketing theo tài khoản và xử lý nội dung hết hiệu lực.
- Quy tắc liên kết tài khoản xã hội và chương trình giới thiệu.
- Bản nội dung pháp lý Việt/Anh và thông tin hỗ trợ đã được khách hàng duyệt.

Đây là dữ liệu cần để triển khai đúng các yêu cầu đã có, không phải đề xuất thêm tính năng ngoài phạm vi đặc tả. Trong lượt này chỉ tạo báo cáo; không sửa mã nguồn chức năng.
