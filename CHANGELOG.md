# Nhật Ký Thay Đổi (Changelog)

Tất cả các thay đổi của ứng dụng **Go Audio & Video Player** được lưu lại tại tài liệu này với định dạng chuẩn, phục vụ việc hiển thị trực tiếp cho người dùng trong cửa sổ Cập nhật ứng dụng.

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
