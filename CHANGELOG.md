# Nhật Ký Thay Đổi (Changelog)

Tất cả các thay đổi của ứng dụng **Go Audio & Video Player** được lưu lại tại tài liệu này với định dạng chuẩn, phục vụ việc hiển thị trực tiếp cho người dùng trong cửa sổ Cập nhật ứng dụng.

---

## [v1.3.4] - 21/09/2026

# Tùy biến thanh bên, Logo trang chủ & Tối ưu hiển thị tệp tin cùng thang đo mô hình AI

Bản cập nhật v1.3.4 mang lại khả năng tùy chỉnh linh hoạt cho thanh bên (Sidebar Resizing), cho phép nhấp vào Logo ứng dụng để về màn hình chào ban đầu, tối ưu hóa không gian hiển thị danh sách phát với thời lượng nổi trên thumbnail, khắc phục triệt để lỗi hai thùng rác trùng lặp, chuẩn hóa thang cấp độ mô hình AI Whisper (Cấp 1 - 6 kèm chú thích kỹ thuật) và sửa lỗi menu chọn độ phân giải YouTube bị cắt khuất.

### Cải tiến (5)
- **Thanh bên tùy chỉnh kích thước (Resizable Sidebar)**: Hỗ trợ rê chuột kéo mép phải Sidebar để co giãn linh hoạt từ 280px đến 600px theo ý thích, tự động ghi nhớ kích thước đã chọn cho các lần mở sau.
- **Biểu tượng Logo trở về Trang chủ**: Nhấp vào Logo "Go Audio Player" ở thanh bên để đóng tệp đang mở và quay lại màn hình chờ ban đầu.
- **Tái cấu trúc bố cục danh sách tệp tin**: Thời lượng phát được chuyển xuống dạng huy hiệu trên ảnh thu nhỏ (video/YouTube) hoặc dòng thông tin bên dưới (audio), giải phóng 100% chiều ngang cho tiêu đề tệp hiển thị rộng rãi, thoáng đãng.
- **Phân biệt trực quan nút "Nghe lại từ đầu" và "Xóa"**: Thay thế icon thùng rác thứ hai gây hiểu nhầm bằng biểu tượng xoay `RotateCcw` màu hổ phách giúp reset tiến trình nghe dở về 0:00 nhanh chóng và tường minh.
- **Thang cấp độ mô hình AI Whisper (Cấp độ 1 - 6)**: Đặt tên mô hình AI theo cấp độ trực quan tăng dần cho người dùng phổ thông, bổ sung nút thông tin `(i)` hiển thị chính xác tên tệp ggml và thông số kiến trúc mô hình.

### Sửa lỗi (1)
- **Khắc phục menu chọn chất lượng YouTube bị che khuất**: Sửa thuộc tính cắt tràn vùng chứa cha trên thanh phát nhạc, giúp cửa sổ bật lên (popover) chọn độ phân giải 1080P/720P/480P hiển thị trọn vẹn.

---

## [v1.3.3] - 21/09/2026

# Bố cục Sidebar 2 hàng & Tinh chỉnh ngôn ngữ người dùng tự nhiên

Bản cập nhật v1.3.3 tái cấu trúc toàn bộ các tab bộ lọc Sidebar thành 2 hàng gọn gàng, loại bỏ tình trạng tràn cuộn ngang gây vướng víu; đồng thời chuẩn hóa ngôn ngữ giao diện theo hướng ngắn gọn, tự nhiên, thân thiện và đặt người dùng làm trung tâm ("Tiếp tục nghe", "Nhấn giữ để nghe chậm", "Nhớ vị trí đang nghe dở").

### Cải tiến (4)
- **Bộ lọc Sidebar 2 hàng thông minh**: Sắp xếp các tab phân loại media thành 2 hàng cân đối (Hàng 1: Tiếp tục nghe & YouTube; Hàng 2: Audio, Video, Đã xong), hiển thị trọn vẹn mà không bị tràn thanh cuộn ngang trên màn hình tiêu chuẩn.
- **Ngôn ngữ tự nhiên & thân thiện người dùng**: Thay thế các thuật ngữ kỹ thuật và developer-centric (Hold-to-Slow, Fingerprint, Smart Resume, ListenSlice...) bằng cách diễn đạt tiếng Việt súc tích, tự nhiên như "Tiếp tục nghe", "Nhấn giữ để nghe chậm", "Nhớ vị trí đang nghe dở".
- **Tinh gọn giao diện Cài đặt (Settings)**: Bỏ cách đánh số tiêu đề (1., 2., 4., 5.), lược bỏ các dòng mô tả kỹ thuật dư thừa, tập trung vào đúng công dụng thực tế của từng tùy chọn.
- **Chuẩn hóa Bảng phím tắt & Thanh điều khiển**: Tinh chỉnh toàn bộ mô tả phím tắt, nút bấm và chú giải công cụ (tooltips) trên thanh phát nhạc, chế độ Luyện sâu và quản lý mô hình AI.

### Sửa lỗi (1)
- **Khắc phục tình trạng các tab Sidebar bị che khuất**: Bố cục 2 hàng giúp người dùng chọn ngay nguồn nghe mong muốn chỉ với 1 cú nhấp chuột mà không cần phải rê chuột cuộn ngang.

### Bản vá (0)

---

## [v1.3.2] - 21/09/2026

# Ghi nhớ tiến trình YouTube & Lưu trữ bài học Luyện nghe sâu bền vững

Bản cập nhật v1.3.2 tối ưu hóa trải nghiệm người dùng với YouTube và Luyện nghe sâu: tự động ghi nhớ vị trí xem dở, bảo tồn vĩnh viễn bài học phân tích bằng AI Whisper, không để thất lạc video khi chuyển thư mục, và khôi phục bài học đang dở ngay khi mở ứng dụng.

### Cải tiến (4)
- **Ghi nhớ phiên và khôi phục tự động**: Tự động lưu và khôi phục video hoặc tệp tin đang nghe/học dở nhất ngay khi mở lại ứng dụng; tự động chuyển sang tab YouTube khi thêm hoặc phát video.
- **Huy hiệu "✨ Luyện sâu" trực quan**: Hiển thị nhãn nổi bật cho tất cả các video hoặc tệp tin đã có bài học phân tích sẵn bằng Whisper AI, giúp người dùng vào học ngay lập tức với độ trễ 0ms mà không cần phân tích lại.
- **Tự động lưu tiến trình liên tục**: Tự động lưu tiến trình định kỳ khi đang phát, khi chuyển câu, khi đóng chế độ Luyện nghe sâu và khi thoát ứng dụng.
- **Dọn dẹp tiến trình linh hoạt**: Cho phép xóa tiến trình "Đang nghe" đối với cả video YouTube để reset nghe lại từ đầu khi cần.

### Sửa lỗi (1)
- **Khắc phục video YouTube bị ẩn khi chọn thư mục**: Sửa triệt để lỗi bộ lọc khiến tab YouTube hoặc Đang nghe bị trống khi đang chọn một thư mục cục bộ; danh sách YouTube luôn hiển thị toàn bộ 100% video đã lưu.

### Bản vá (0)

---

## [v1.3.1] - 21/09/2026

# Nâng cấp giao diện Cập nhật ứng dụng (Changelog Markdown UI)

Bản cập nhật v1.3.1 mang đến giao diện xem thông tin cập nhật hoàn toàn mới theo phong cách hiện đại, hiển thị trực tiếp ghi chú thay đổi và loại bỏ các thành phần kỹ thuật không cần thiết.

### Cải tiến (3)
- **Giao diện Changelog trực quan & rộng rãi**: Mở rộng kích thước cửa sổ cập nhật lên chuẩn `max-w-3xl`, tự động hiển thị đầy đủ ghi chú thay đổi với thanh cuộn mượt mà.
- **3 nhóm thay đổi có đếm số lượng & Accordion**: Phân loại rõ ràng thành Cải tiến (Improvements), Sửa lỗi (Fixes), Bản vá (Patches) kèm đếm số lượng và đóng/mở tiện lợi.
- **Loại bỏ hiệu ứng nhảy nút bấm**: Nút Cài đặt ở thanh trạng thái được chuyển sang dạng cố định thanh lịch, không còn hiệu ứng `animate-bounce` gây mất tập trung.

### Sửa lỗi (1)
- **Gỡ bỏ hộp kiểm tra kỹ thuật**: Bỏ hoàn toàn khung hiển thị tiến trình tải/sao lưu/thay thế kỹ thuật để người dùng tập trung hoàn toàn vào nội dung thay đổi của ứng dụng.

### Bản vá (0)

---

## [v1.3.0] - 21/09/2026

# Luyện nghe sâu Video & YouTube với AI Whisper

Bản cập nhật v1.3.0 nâng cấp toàn diện tính năng Luyện nghe sâu (Dictation / ListenSlice) hỗ trợ đầy đủ cho cả Video YouTube và Video offline với giao diện Split View, cơ chế Dual-Source Playback 0ms và sửa lỗi FFmpeg.

### Cải tiến (4)
- **Luyện nghe sâu Video YouTube với Whisper AI**: Tự động tải và chuẩn hóa âm thanh 16kHz WAV ngầm qua module `yt-dlp` tích hợp sẵn, phân tích nhận diện câu và mốc thời gian bằng Whisper AI.
- **Bố cục Split View tối ưu cho Video**: Khi luyện nghe video, khung hình 16:9 thu gọn ở nửa trên màn hình (giữ nguyên phát, không bao giờ bị tải lại IFrame), không gian bên dưới dành trọn cho bài tập chép chính tả và lặp câu.
- **Dual-Source Playback (Video ↔ Audio 0ms)**: Cho phép chuyển đổi tức thì giữa phát trực tiếp Video YouTube và phát Audio offline qua HTTP streamer nội bộ để tua lặp câu với độ trễ 0ms tuyệt đối.
- **Tự động dọn dẹp âm thanh tạm**: Tự động xóa file audio tạm khi xóa video khỏi thư viện để tiết kiệm dung lượng ổ cứng.

### Sửa lỗi (1)
- **Sửa lỗi FFmpeg crash (exit status 0xc0000137)**: Bổ sung cờ `-nostdin` và chuẩn hóa handle standard input khi chuyển đổi âm thanh trên Windows 11.

### Bản vá (0)

---

## [v1.2.1] - 21/09/2026

# Tối ưu độ trễ phát hiện phần cứng & Giao diện Skeleton AI

Bản cập nhật v1.2.1 loại bỏ hoàn toàn độ trễ khi mở cửa sổ Quản Lý Mô Hình & Hiệu Suất AI Whisper và bổ sung hiệu ứng Skeleton loading chuyên nghiệp.

### Cải tiến (2)
- **Đọc thông tin CPU & RAM qua Win32 API**: Thay thế hoàn toàn PowerShell WMI bằng Windows Registry và Win32 `GlobalMemoryStatusEx`, giảm thời gian phản hồi từ 2.5 giây xuống dưới 0.01ms.
- **Giao diện Skeleton Loading**: Bổ sung khung Skeleton Card chuyển động nhịp tim cho thông tin phần cứng và danh sách mô hình AI khi đang tải dữ liệu.

### Sửa lỗi (1)
- **Khóa nút bấm an toàn**: Vô hiệu hóa nút chọn mô hình trong lúc đang kiểm tra dữ liệu phần cứng để ngăn ngừa thao tác lỗi.

### Bản vá (0)

---

## [v1.2.0] - 20/09/2026

# Đổi tên file trực tiếp trong ứng dụng

Bản cập nhật v1.2.0 cho phép người dùng đổi tên file audio và video trực tiếp từ giao diện ứng dụng mà không cần mở Windows Explorer.

### Cải tiến (2)
- **Đổi tên file trực tiếp**: Hỗ trợ đổi tên file trên ổ đĩa từ danh sách thư viện với phím tắt F2 hoặc menu chuột phải.
- **Tự động cập nhật đường dẫn & tiến trình**: Đồng bộ lại dữ liệu tiến trình học tập và trạng thái hoàn thành theo tên file mới.

### Sửa lỗi (1)
- **Tự động xuống dòng khi kiểm tra đáp án**: Khắc phục lỗi tràn khung văn bản sau khi kiểm tra đáp án chép chính tả.

### Bản vá (0)
