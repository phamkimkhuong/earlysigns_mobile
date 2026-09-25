# ĐẶC TẢ PHẦN MỀM MOBILE EARLYSIGNS

**Phiên bản:** 1.0  
**Sản phẩm:** Ứng dụng luyện phát âm tiếng Anh EarlySigns  
**Nền tảng:** iOS và Android  
**Ngôn ngữ:** Tiếng Việt và English

## 1. Mục đích

EarlySigns là ứng dụng giúp người dùng luyện phát âm tiếng Anh trong thời lượng ngắn mỗi ngày. Ứng dụng cung cấp nội dung luyện tập, ghi âm giọng nói, chấm điểm phát âm, phân tích lỗi theo âm IPA và đề xuất bài học phù hợp với năng lực của từng người.

Tài liệu này đặc tả các tính năng và luồng người dùng cần có trong ứng dụng mobile. Tài liệu không đặc tả cách triển khai kỹ thuật, hệ thống phía máy chủ hoặc thủ tục đăng ký/phát hành trên các cửa hàng ứng dụng.

## 2. Mục tiêu sản phẩm

Ứng dụng phải giúp người dùng:

1. Bắt đầu luyện phát âm nhanh chóng.
2. Luyện theo câu, đoạn văn, video và âm cụ thể.
3. Nhận phản hồi dễ hiểu sau mỗi lần nói.
4. Nhìn thấy tiến bộ theo thời gian.
5. Nhận bài học cá nhân hóa theo các âm còn yếu.
6. Duy trì thói quen luyện tập hằng ngày.
7. Mua và sử dụng gói EarlySigns Pro ngay trong ứng dụng.
8. Nhận thông báo nhắc luyện tập và thông tin sản phẩm theo lựa chọn cá nhân.

## 3. Đối tượng sử dụng

### 3.1. Người dùng chưa đăng nhập hoặc đã đăng xuất

Người dùng chưa đăng nhập hoặc đã đăng xuất chỉ có thể:

- xem các màn hình onboarding;
- xem Trang chủ với danh sách tính năng chính;
- chọn ngôn ngữ;
- xem thông tin pháp lý;
- thực hiện đăng nhập hoặc tạo tài khoản.

Khi người dùng chọn một tính năng trên Trang chủ mà chưa đăng nhập, ứng dụng yêu cầu đăng nhập. Sau khi đăng nhập thành công, người dùng được đưa tới đúng tính năng vừa chọn.

Người dùng phải đăng nhập thành công trước khi sử dụng bất kỳ tính năng luyện tập, lưu dữ liệu, xem tiến độ, nhận thông báo hoặc mua gói nào.

### 3.2. Người dùng miễn phí đã đăng nhập

Người dùng miễn phí đã đăng nhập có thể:

- lưu và xem tiến độ luyện tập;
- nhận bài học cá nhân hóa;
- lưu đoạn văn luyện tập;
- xem lịch sử và streak;
- sử dụng các quyền lợi của tài khoản;
- mua, khôi phục và quản lý gói Pro;
- sử dụng hạn mức miễn phí theo tháng.

### 3.3. Người dùng Pro

Người dùng Pro được sử dụng các tính năng và quyền lợi theo gói đã mua. Các hạn mức miễn phí theo tháng không áp dụng cho người dùng Pro trong phạm vi quyền lợi của gói. Quyền lợi cụ thể của từng gói phải được hiển thị rõ trên màn hình mua hàng và trong thông tin tài khoản.

## 4. Cấu trúc chức năng chính

Ứng dụng gồm hai tab chính ở thanh điều hướng phía dưới:

1. **Trang chủ:** giới thiệu và truy cập toàn bộ tính năng luyện tập.
2. **Trang cá nhân:** hồ sơ phát âm, tiến độ, gói dịch vụ và cài đặt.

Các tính năng chính được mở từ Trang chủ theo thứ tự:

1. **Luyện với video**
2. **Luyện với văn bản tự do**
3. **Luyện ngữ âm** — gồm hành trình học tập và danh sách âm yếu, tương tự trang ngữ âm trên web

Các tính năng này không xuất hiện như tab riêng ở thanh điều hướng phía dưới.

Các khu vực pháp lý và hỗ trợ gồm:

- Giới thiệu;
- Điều khoản sử dụng;
- Chính sách bảo mật;
- Chương trình giới thiệu;
- Liên hệ hỗ trợ.

## 5. Khởi động và lựa chọn ngôn ngữ

### 5.1. Lần mở ứng dụng đầu tiên

1. Hiển thị thương hiệu EarlySigns.
2. Cho phép người dùng chọn Tiếng Việt hoặc English.
3. Giới thiệu ngắn gọn các tính năng chính:
   - luyện với video;
   - luyện với văn bản tự do;
   - luyện ngữ âm và theo dõi tiến độ.
4. Yêu cầu người dùng đăng nhập hoặc tạo tài khoản để tiếp tục.
5. Sau khi đăng nhập thành công, mở Trang chủ.

### 5.2. Những lần mở tiếp theo

- Sử dụng ngôn ngữ người dùng đã chọn.
- Khôi phục trạng thái tài khoản nếu người dùng vẫn đăng nhập.
- Mở Trang chủ.
- Không yêu cầu mở lại đúng bài đang luyện tập từ lần sử dụng trước.

Người dùng có thể đổi ngôn ngữ bất kỳ lúc nào trong phần Hồ sơ. Thay đổi ngôn ngữ phải áp dụng ngay cho toàn bộ nội dung giao diện.

## 6. Đăng nhập và tài khoản

### 6.1. Các phương thức đăng nhập

Màn hình đăng nhập phải cung cấp:

1. Đăng nhập bằng email và mã OTP.
2. Tiếp tục với Apple.
3. Tiếp tục với Google.
4. Tiếp tục với Meta/Facebook.

Trên iOS, khi ứng dụng cung cấp đăng nhập bằng Google hoặc Meta/Facebook, phải đồng thời cung cấp lựa chọn Đăng nhập với Apple tương đương.

### 6.2. Đăng nhập bằng email OTP

Luồng sử dụng:

1. Người dùng nhập email.
2. Chọn **Gửi mã xác minh**.
3. Nhập mã xác minh được gửi tới email.
4. Chọn **Xác nhận**.
5. Sau khi thành công, chuyển tới nội dung người dùng đang muốn sử dụng.

Yêu cầu:

- Cho phép đổi email trước khi xác nhận.
- Cho phép gửi lại mã.
- Hiển thị thời gian chờ gửi lại nếu có.
- Thông báo rõ mã sai, mã hết hạn hoặc vượt số lần thử.
- Giữ lại mục tiêu ban đầu của người dùng, chẳng hạn bài học, paywall hoặc nội dung từ thông báo.

### 6.3. Đăng nhập bằng Apple, Google và Meta/Facebook

Luồng sử dụng:

1. Người dùng chọn một nhà cung cấp.
2. Hoàn tất xác thực trên giao diện xác thực chính thức của nhà cung cấp.
3. Quay lại EarlySigns.
4. Nếu tài khoản đã tồn tại, mở đúng tài khoản đó.
5. Nếu là người dùng mới, tạo hồ sơ và đưa tới bước bắt đầu sử dụng.

Yêu cầu:

- Có trạng thái đang xác thực riêng cho từng lựa chọn.
- Cho phép người dùng hủy mà không hiển thị lỗi không cần thiết.
- Hỗ trợ đổi tài khoản.
- Xử lý trường hợp nhà cung cấp không trả email.
- Hỗ trợ email riêng tư của Apple.
- Xử lý tài khoản đã bị thu hồi quyền, phiên xác thực hết hạn hoặc nhà cung cấp tạm thời không khả dụng.
- Không tự động gộp hai tài khoản chỉ vì chúng có cùng địa chỉ email nếu chưa có xác nhận phù hợp.
- Không làm mất nội dung hoặc mục tiêu người dùng đang thực hiện trước khi đăng nhập.

### 6.4. Phiên tài khoản

- Khi mở ứng dụng, người dùng đã đăng nhập được đưa tới Trang chủ.
- Khi phiên hết hạn, yêu cầu đăng nhập lại.
- Khi đăng xuất, chỉ còn xem được Trang chủ; dữ liệu cá nhân và tiến độ của tài khoản cũ không được hiển thị.
- Khi người dùng đã đăng xuất chọn một tính năng trên Trang chủ, ứng dụng yêu cầu đăng nhập và sau đó mở đúng tính năng đó.
- Cho phép đăng xuất từ phần Hồ sơ.
- Sau khi đăng nhập lại, tải lại gói dịch vụ, tiến độ, hạn mức và ngôn ngữ của tài khoản.

## 7. Trang chủ giới thiệu tính năng

Trang chủ là màn hình trung tâm của ứng dụng. Trang chủ phải giới thiệu rõ các tính năng chính và cho phép người dùng chọn trực tiếp tính năng muốn sử dụng.

Thứ tự các khu vực trên Trang chủ:

1. **Luyện với video** — mở danh mục và luyện phát âm qua video YouTube.
2. **Luyện với văn bản tự do** — mở nhập văn bản, quét ảnh và luyện đoạn văn cá nhân.
3. **Luyện ngữ âm** — mở khu vực ngữ âm gồm hành trình học tập và danh sách âm yếu, tương tự trang ngữ âm trên web.

Khi đã đăng nhập, Trang chủ còn có thể hiển thị:

- lời chào và trạng thái tài khoản;
- số ngày duy trì liên tiếp;
- điểm phát âm tổng quan nếu đã đạt ngưỡng tiến độ;
- tóm tắt số lượt kiểm tra, chuyển ảnh và sinh audio còn lại trong tháng đối với người dùng miễn phí.

Khi người dùng chọn một thẻ tính năng mà đã đăng nhập, ứng dụng mở đúng màn hình tương ứng. Nếu chưa đăng nhập, yêu cầu đăng nhập trước rồi mở đúng tính năng đó. Người dùng luôn có thể quay lại Trang chủ bằng nút quay lại hoặc thanh điều hướng phía dưới.

### 7.1. Luyện ngữ âm trên Trang chủ

Khu vực **Luyện ngữ âm** gồm:

- hành trình học tập và bài học được đề xuất;
- danh sách âm yếu;
- nút bắt đầu bài học cá nhân hóa.

Luồng bài học cá nhân hóa:

1. Người dùng chọn **Bắt đầu bài học**.
2. Ứng dụng mở một tập câu được chọn theo các âm người dùng cần cải thiện.
3. Người dùng luyện từng câu và nhận kết quả.
4. Sau khi hoàn thành, hiển thị trạng thái hoàn thành và bài học tiếp theo.
5. Hành trình, streak và đề xuất âm yếu được cập nhật.


## 8. Luồng luyện phát âm chung

### 8.1. Bắt đầu một lượt luyện

Mỗi lượt luyện phải có:

- câu tiếng Anh cần nói;
- bản dịch nếu có;
- cách đọc IPA theo từ nếu có;
- phát âm;
- nút nghe phát âm mẫu nếu tính năng được mở;
- nút bắt đầu ghi âm.

Toàn bộ ứng dụng chỉ sử dụng giọng UK. Người dùng không được lựa chọn hoặc thay đổi accent trong ứng dụng.

### 8.2. Ghi âm

1. Người dùng chọn **Bắt đầu ghi âm**.
2. Ứng dụng thông báo trạng thái đang nghe.
3. Người dùng nói câu được hiển thị.
4. Người dùng chọn dừng hoặc ứng dụng tự dừng sau khoảng lặng phù hợp.
5. Ứng dụng gửi bản ghi để kiểm tra.
6. Hiển thị trạng thái đang phân tích.

Yêu cầu:

- Chỉ yêu cầu quyền sử dụng microphone khi người dùng bắt đầu ghi âm.
- Giải thích cách cấp lại quyền nếu người dùng đã từ chối.
- Không ghi âm khi người dùng chưa chủ động bắt đầu, ngoại trừ bài học có hướng dẫn tự động rõ ràng.
- Có giới hạn thời lượng để tránh ghi âm ngoài ý muốn.
- Có thể dừng an toàn khi người dùng rời màn hình hoặc nhận cuộc gọi.

### 8.3. Kết quả phát âm

Kết quả phải hiển thị:

- điểm phát âm;
- mức độ rõ ràng;
- từ hoặc âm phát âm đúng;
- âm bị thiếu;
- âm bị thừa;
- âm bị thay thế;
- phần phân tích chi tiết theo từ/âm khi có dữ liệu.

Người dùng có thể:

- nghe lại bản ghi của mình;
- nghe phát âm mẫu;
- xem hướng dẫn sửa lỗi;
- luyện riêng âm đang yếu;
- thử lại câu;
- chuyển sang câu tiếp theo.

Nếu điểm thấp, ứng dụng phải khuyến khích người dùng thử lại.

### 8.4. Lỗi trong lượt luyện

Ứng dụng phải có thông báo phù hợp khi:

- microphone bị từ chối: yêu cầu và hướng dẫn cho phép ghi âm khi chưa có quyền và khi ấn vào nút ghi âm. 
- không tìm thấy microphone;
- bản ghi quá ngắn hoặc không có tiếng nói;
- mạng không khả dụng;
- quá thời gian xử lý;
- hệ thống chấm phát âm tạm thời không sẵn sàng;
- người dùng đã đạt hạn mức;
- kết quả không thể tải.

Người dùng phải có thể thử lại mà không cần khởi động lại ứng dụng.

## 9. Luyện qua video

### 9.1. Danh mục video

Danh mục phải cho phép:

- xem video theo chủ đề;
- lọc theo trình độ;
- xem thumbnail, tiêu đề, thời lượng và số câu;
- xem các video đã luyện;
- tiếp tục video đang luyện;
- tải thêm nội dung;
- mở chi tiết một video.

Khi không có video phù hợp, hiển thị hướng dẫn thay đổi bộ lọc.

### 9.2. Luyện từng câu trong video

1. Người dùng mở một video.
2. Ứng dụng hiển thị trình phát và câu hiện tại.
3. Video tự dừng sau mỗi câu để người dùng nhắc lại.
4. Người dùng có thể phát lại câu, về đầu câu hoặc chuyển câu.
5. Người dùng ghi âm câu hiện tại.
6. Ứng dụng hiển thị kết quả phát âm.
7. Người dùng tiếp tục tới câu kế tiếp hoặc luyện lại câu hiện tại.

Ứng dụng phải ghi nhận tiến độ đã xem/luyện để người dùng có thể tiếp tục vào lần sau.

## 10. Luyện văn bản cá nhân

### 10.1. Nhập văn bản

- Người dùng có thể gõ hoặc dán văn bản tiếng Anh.
- Ứng dụng tách văn bản thành các câu luyện tập.
- Người dùng có thể xem và chỉnh sửa nội dung trước khi bắt đầu.
- Nội dung được chuẩn bị theo giọng UK.
- Nội dung trống hoặc không thể tách thành câu phải có thông báo rõ ràng.

### 10.2. Quét văn bản từ hình ảnh

- Cho phép chụp ảnh bằng camera.
- Cho phép chọn ảnh từ thư viện.
- Chỉ yêu cầu quyền camera/thư viện khi người dùng chọn chức năng tương ứng.
- Hiển thị trạng thái đang nhận diện văn bản.
- Đưa văn bản nhận diện được vào ô soạn thảo để người dùng kiểm tra và sửa.
- Thông báo khi ảnh không có văn bản, văn bản không đọc được hoặc quyền truy cập bị từ chối.

### 10.3. Lưu và sử dụng lại văn bản

- Người dùng đã đăng nhập có thể đặt tiêu đề và lưu đoạn văn.
- Hiển thị danh sách các đoạn văn đã lưu.
- Cho phép mở lại, chỉnh sửa và bắt đầu luyện.
- Không tự động xóa nội dung đang nhập khi tải danh sách.
- Sau khi đăng xuất, không hiển thị đoạn văn của tài khoản trước.

## 11. Luyện theo âm IPA

Khu vực này nằm trong **Luyện ngữ âm** trên Trang chủ. Ứng dụng phải cho phép người dùng:

- xem danh sách các âm cần cải thiện;
- chọn một âm để mở bài học;
- xem hướng dẫn phát âm âm đó;
- luyện các câu có chứa âm mục tiêu;
- xem phân tích các lỗi liên quan tới âm;
- chuyển từ kết quả phát âm sang bài luyện âm tương ứng.

Danh sách âm yếu phải được sắp xếp theo mức độ ưu tiên và cập nhật sau các lượt luyện mới.

## 12. Hành trình học tập

Hành trình nằm trong **Luyện ngữ âm** trên Trang chủ và phải thể hiện:

- các cột mốc;
- các module;
- bài đã hoàn thành;
- bài hiện tại;
- bài sắp tới;
- trạng thái khóa/mở khóa;
- tiến độ tổng thể.

Luồng sử dụng:

1. Người dùng mở Hành trình.
2. Chọn bài hiện tại hoặc bài được mở khóa.
3. Hoàn thành các câu trong bài.
4. Nhận thông báo hoàn thành.
5. Hành trình cập nhật module và bài tiếp theo.

## 13. Hồ sơ và tiến độ

### 13.1. Tiến độ

Tiến độ phát âm chỉ được hiển thị sau khi người dùng đạt ngưỡng luyện tập tối thiểu:

- mỗi âm được theo dõi có ít nhất 5 lượt kiểm tra phát âm thành công;
- dữ liệu đã bao phủ ít nhất 80% tổng số âm được theo dõi.

Trước khi đạt ngưỡng:

- không hiển thị điểm phát âm tổng;
- không hiển thị biểu đồ tiến bộ;
- không hiển thị độ chính xác chi tiết theo âm;
- hiển thị thông báo hồ sơ phát âm đang được xây dựng;
- hiển thị nút đưa người dùng tới trang chủ.

Sau khi đạt ngưỡng, hiển thị:

- điểm phát âm tổng;
- độ chính xác theo từng âm;
- biểu đồ tiến bộ theo thời gian;
- số lượt luyện;
- streak;
- bài học gần đây;
- các âm cần cải thiện và bài học được đề xuất.

Khi chưa có dữ liệu hoặc chưa đạt ngưỡng, không hiển thị biểu đồ trống hoặc điểm mặc định gây hiểu nhầm.

### 13.2. Cài đặt tài khoản

Người dùng có thể:

- xem email/tài khoản;
- sử dụng giọng UK mặc định;
- đổi ngôn ngữ;
- xem gói hiện tại;
- mua hoặc nâng cấp Pro;
- khôi phục giao dịch;
- quản lý gói đăng ký;
- cài đặt thông báo;
- xem chương trình giới thiệu;
- mở Điều khoản và Chính sách bảo mật;
- đăng xuất.

## 14. Hạn mức người dùng miễn phí

Người dùng miễn phí đã đăng nhập được cấp hạn mức theo tháng:

- **100 lượt kiểm tra phát âm**;
- **20 lượt chuyển ảnh sang văn bản**;
- **20 lượt sinh audio luyện tập**.

### 14.1. Quy tắc hạn mức

- Hạn mức được tính riêng cho từng tài khoản theo chu kỳ đăng ký.
- Trang chủ, Trang cá nhân và màn hình tính năng phải hiển thị số lượt đã sử dụng và số lượt còn lại khi phù hợp.
- Khi còn ít lượt, hiển thị cảnh báo và lời mời nâng cấp Pro.
- Khi hết một loại hạn mức, người dùng không thể tiếp tục sử dụng loại tính năng đó trong tháng hiện tại, nhưng vẫn có thể sử dụng các tính năng còn hạn mức.
- Người dùng vẫn có thể mở nội dung, xem tiến độ và sử dụng các tính năng không yêu cầu loại hạn mức đã hết.
- Lượt kiểm tra phát âm chỉ được tính khi hệ thống trả về kết quả chấm thành công. Lỗi do mạng, hệ thống hoặc thao tác bị hủy không làm giảm hạn mức.
- Lượt chuyển ảnh sang văn bản chỉ được tính khi ảnh được chuyển đổi thành công. Ảnh bị hủy, không đọc được hoặc lỗi xử lý không làm giảm hạn mức.
- Lượt sinh audio luyện tập chỉ được tính khi audio được tạo thành công. Nghe lại audio đã có không tạo thêm lượt dùng.
- Khi người dùng nâng cấp Pro, quyền sử dụng được cập nhật ngay sau khi giao dịch thành công.

### 14.2. Khi đạt hạn mức

Khi người dùng cố gắng sử dụng tính năng đã hết hạn mức:

1. Không bắt đầu thao tác mới.
2. Hiển thị số lượt đã dùng và thời điểm hạn mức được làm mới.
3. Hiển thị nút nâng cấp Pro.
4. Cho phép đóng thông báo và quay lại sử dụng tính năng khác.

## 15. Gói EarlySigns Pro và thanh toán trong ứng dụng

### 15.1. Paywall

Paywall phải hiển thị:

- lợi ích của Pro;
- các gói hiện có;
- giá và chu kỳ thanh toán do cửa hàng cung cấp;
- ưu đãi dùng thử hoặc khuyến mại nếu có;
- điều kiện gia hạn;
- Điều khoản sử dụng;
- Chính sách bảo mật;
- nút mua;
- nút khôi phục giao dịch;
- nút quản lý gói.

Không yêu cầu người dùng nhập thông tin thanh toán riêng trong ứng dụng.

### 15.2. Mua Pro

Luồng:

1. Người dùng mở paywall.
2. Chọn một gói.
3. Xem giá, chu kỳ và quyền lợi.
4. Xác nhận mua bằng phương thức thanh toán của Apple hoặc Google.
5. Chờ kết quả giao dịch.
6. Khi giao dịch thành công, tài khoản được cập nhật quyền Pro.
7. Hiển thị màn hình xác nhận và ngày hết hạn/gia hạn nếu có.

Các trạng thái phải được xử lý:

- mua thành công;
- người dùng hủy;
- giao dịch đang chờ;
- cần phê duyệt;
- sản phẩm không khả dụng;
- thanh toán không khả dụng;
- giao dịch đã sở hữu;
- lỗi tạm thời;
- giao dịch chưa được xác nhận.

Không hiển thị giao dịch thành công nếu quyền Pro chưa được xác nhận.

### 15.3. Khôi phục giao dịch

- Có nút khôi phục trên paywall và trong Hồ sơ.
- Cho phép khôi phục sau khi cài lại ứng dụng hoặc đổi thiết bị.
- Sau khi khôi phục, hiển thị đúng gói và quyền lợi hiện tại.
- Nếu không có giao dịch, hiển thị thông báo rõ ràng.
- Không tạo gói mới khi người dùng chỉ đang khôi phục giao dịch.

### 15.4. Trạng thái gói

Hồ sơ phải phản ánh đúng các trạng thái:

- đang dùng thử;
- đang hoạt động;
- sắp hết hạn;
- đã hết hạn;
- đang chờ thanh toán;
- tạm dừng;
- đã hoàn tiền hoặc bị thu hồi.

Người dùng có thể mở trang quản lý gói của Apple hoặc Google để thay đổi hoặc hủy đăng ký.

## 16. Thông báo đẩy

### 16.1. Loại thông báo

Ứng dụng hỗ trợ:

1. Nhắc luyện tập hằng ngày.
2. Nhắc bài học đang dang dở.
3. Nhắc duy trì streak.
4. Thông báo bài học hoặc nội dung mới.
5. Thông báo liên quan tới tài khoản và gói dịch vụ.
6. Thông báo khuyến mại và marketing.

### 16.2. Quyền nhận thông báo

- Không yêu cầu quyền thông báo ngay khi mở ứng dụng lần đầu.
- Giải thích lợi ích trước khi hiển thị yêu cầu của hệ điều hành.
- Cho phép người dùng bỏ qua và cấp quyền sau.
- Nếu quyền bị từ chối, hướng dẫn người dùng mở phần Cài đặt thiết bị.
- Không hỏi lại liên tục sau khi người dùng đã từ chối.

### 16.3. Cài đặt thông báo

Trong Hồ sơ, người dùng có thể:

- bật/tắt nhắc luyện tập;
- chọn thời gian nhắc;
- bật/tắt thông báo nội dung mới;
- bật/tắt thông báo khuyến mại/marketing;
- xem trạng thái quyền thông báo;
- mở Cài đặt thiết bị.

Việc tắt marketing không được tắt các thông báo cần thiết về giao dịch hoặc tài khoản.

### 16.4. Xử lý khi chọn thông báo

- Nhắc luyện tập mở bài học hôm nay.
- Nhắc bài dang dở mở đúng bài đang thực hiện.
- Thông báo nội dung mới mở đúng nội dung được giới thiệu.
- Thông báo Pro mở paywall hoặc thông tin gói.
- Thông báo không còn hiệu lực phải mở màn hình an toàn, không dẫn tới nội dung sai.
- Nếu nội dung yêu cầu đăng nhập, yêu cầu đăng nhập trước rồi tiếp tục tới nội dung đó.
- Nếu người dùng chọn thông báo khi ứng dụng đang mở, không được tự ý chuyển màn hình nếu chưa có thao tác xác nhận phù hợp.

## 17. Chương trình giới thiệu

Người dùng có thể:

- tạo mã giới thiệu;
- sao chép và chia sẻ mã;
- nhập mã của người khác;
- xem trạng thái mã;
- xem phần thưởng nếu đủ điều kiện.

Ứng dụng phải hiển thị rõ:

- điều kiện tham gia;
- thời hạn sử dụng;
- số lần được sử dụng;
- phần thưởng;
- lý do nếu mã không hợp lệ hoặc đã hết hạn.

## 18. Nội dung pháp lý và hỗ trợ

Ứng dụng phải có thể truy cập:

- Điều khoản sử dụng;
- Chính sách bảo mật;
- Giới thiệu sản phẩm;
- Thông tin liên hệ hỗ trợ;
- Chương trình giới thiệu.

Các nội dung này phải có bản dịch phù hợp với ngôn ngữ người dùng. Liên kết và thông tin liên hệ phải mở được từ thiết bị mobile.

## 19. Yêu cầu trải nghiệm và chất lượng chức năng

- Mỗi màn hình phải có trạng thái đang tải, không có dữ liệu và lỗi.
- Lỗi phải dùng ngôn ngữ dễ hiểu, nêu nguyên nhân khi có thể và có hướng xử lý.
- Các thao tác gửi, mua, lưu hoặc ghi âm phải có trạng thái đang xử lý và không bị thực hiện lặp ngoài ý muốn.
- Nội dung người dùng đang nhập không bị mất khi mở màn hình đăng nhập, thông báo lỗi hoặc paywall.
- Nút chính phải dễ nhận biết và có kích thước phù hợp cho thao tác bằng một tay.
- Văn bản phải hiển thị tốt ở cỡ chữ lớn.
- Toàn bộ tính năng chính phải dùng được với trình đọc màn hình.
- Màu sắc không phải là cách duy nhất để phân biệt đúng/sai hoặc trạng thái.
- Người dùng có thể quay lại an toàn từ mọi modal và màn hình luyện tập.
- Ứng dụng không được giữ microphone, camera hoặc nội dung riêng tư khi người dùng đã rời khỏi chức năng tương ứng.

## 20. Tiêu chí nghiệm thu tính năng

Ứng dụng được xem là đáp ứng đặc tả khi:

1. Người dùng mới có thể chọn ngôn ngữ, xem giới thiệu tính năng và phải đăng nhập trước khi sử dụng tính năng luyện tập.
2. Email OTP, Apple, Google và Meta/Facebook đều có thể đăng nhập và quay lại đúng tính năng vừa chọn.
3. Trang chủ sắp xếp theo thứ tự: luyện với video, luyện với văn bản tự do, luyện ngữ âm; không có thẻ Kiểm tra phát âm.
4. Người dùng đã đăng xuất chỉ xem được Trang chủ; khi chọn một tính năng sẽ được yêu cầu đăng nhập.
5. Người dùng có thể luyện qua video, văn bản, ngữ âm và bài học cá nhân hóa.
6. Mỗi lượt nói đều có trạng thái ghi âm, phân tích, kết quả và xử lý lỗi rõ ràng.
7. Tiến độ chỉ hiển thị sau khi người dùng đạt đủ ngưỡng luyện tập; trước đó hiển thị trạng thái đang xây dựng hồ sơ.
8. Người dùng có thể nhập, quét, lưu và luyện văn bản cá nhân.
9. Hạn mức miễn phí hàng tháng là 100 lượt kiểm tra phát âm, 20 lượt chuyển ảnh sang văn bản và 20 lượt sinh audio luyện tập.
10. Thanh điều hướng phía dưới chỉ có Trang chủ và Trang cá nhân.
11. Người dùng có thể xem quyền lợi, mua, khôi phục và quản lý gói Pro bằng thanh toán trong ứng dụng của Apple/Google.
12. Người dùng có thể cấp, từ chối và thay đổi quyền nhận thông báo.
13. Thông báo mở đúng bài học, nội dung hoặc paywall liên quan.
14. Người dùng có thể tắt marketing mà vẫn nhận được thông báo cần thiết về tài khoản và giao dịch.
15. Các màn hình chính có đầy đủ nội dung Tiếng Việt và English.