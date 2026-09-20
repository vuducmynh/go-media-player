# 🎧 Go Audio & Video Player (Windows 11) 🎬
### *Trình Phát Media Hiện Đại Tích Hợp Trợ Lý Luyện Nghe & Chép Chính Tả AI Thông Minh*

[![GitHub Release](https://img.shields.io/github/v/release/vuducmynh/go-media-player?color=10b981&label=Release&logo=github)](https://github.com/vuducmynh/go-media-player/releases/latest)
[![Platform](https://img.shields.io/badge/Platform-Windows%2011%20x64-0078d4?logo=windows11&logoColor=white)](https://github.com/vuducmynh/go-media-player/releases/latest)
[![Go Version](https://img.shields.io/badge/Go-1.23%2B-00ADD8?logo=go&logoColor=white)](https://golang.org)
[![Wails v2](https://img.shields.io/badge/Framework-Wails%20v2-df1a2a?logo=wails&logoColor=white)](https://wails.io)
[![React](https://img.shields.io/badge/Frontend-React%2018%20%2B%20Vite%20%2B%20Tailwind-61DAFB?logo=react&logoColor=black)](https://reactjs.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **Go Audio & Video Player** là ứng dụng desktop Windows 11 thế hệ mới được thiết kế chuyên biệt cho người học ngoại ngữ (IELTS, TOEIC, TOEFL, Giao tiếp) và người yêu thích nghe nhạc, podcast, xem video chất lượng cao. Ứng dụng chạy mượt mà, siêu nhẹ, không tốn RAM, tích hợp trí tuệ nhân tạo **Whisper AI** để nhận diện giọng nói, tách câu tự động, chấm điểm chép chính tả thông minh và tự động cập nhật phiên bản mới chỉ với 1 cú click!

---

## 🚀 Tải Về & Sử Dụng Ngay (Dành Cho Người Dùng)

Không cần cài đặt phức tạp, không cần Node.js hay Go. Chỉ cần tải về và mở lên chạy ngay trên **Windows 11 / Windows 10 (64-bit)**:

- 📦 **[Tải file chạy trực tiếp (.exe)](https://github.com/vuducmynh/go-media-player/releases/latest/download/go-audio-player.exe)**: Tải về, bấm mở là dùng ngay.
- 🗜️ **[Tải file nén trọn gói (.zip)](https://github.com/vuducmynh/go-media-player/releases/latest/download/GoAudioPlayer-Windows11-x64.zip)**: Giải nén vào thư mục bất kỳ và chạy `go-audio-player.exe`.

> 💡 **Tính năng Tự Động Cập Nhật (In-App Auto-Update)**: Khi có bản mới trên GitHub, ứng dụng sẽ hiện nút **[ Cập nhật ]** ở góc dưới bên trái. Bấm 1 click là app tự tải về và nâng cấp ngay tại chỗ, bạn không cần phải tải lại thủ công!

---

## ✨ Tính Năng Đột Phá

### 1. 🎯 Trợ Lý Luyện Sâu & Chép Chính Tả (Deep Listening & Dictation)
- **Tự động nhận diện & tách câu bằng Whisper AI**: Phân đoạn hội thoại chính xác từng câu kèm mốc thời gian mili-giây (timestamps).
- **Chế độ Luyện Nghe (Ear-First)**: Mặc định ẩn transcript để người học tập trung nghe bằng tai, có thể bấm mở hoặc dùng phím tắt để đối chiếu.
- **Chế độ Chép Chính Tả (Dictation)**: Gõ lại những gì bạn nghe được. Thuật toán **Smart Word Diff** thông minh:
  - Tự động bỏ qua dấu câu (`.`, `,`, `?`, `!`), không phân biệt chữ hoa/thường, chuẩn hóa số viết tắt (`1` $\leftrightarrow$ `one`, `don't` $\leftrightarrow$ `do not`).
  - Tô màu trực quan: Từ đúng hiển thị tự nhiên, từ sai/thiếu được gạch chân màu vàng hổ phách, từ thừa được gạch ngang màu đỏ.
  - Tính điểm phần trăm chính xác kèm phản hồi động viên.
- **Tua lùi $\pm 5$s & A-B Loop trong bài học**: Lặp lại đoạn phát âm khó với dải highlight màu tím trực quan trên thanh timeline câu.

### 2. 📝 Xuất & Nhập Script Đa Định Dạng (Export / Import)
- **Xuất Markdown Văn Xuôi Liền Mạch (`.md`)**: Tự động ghép nối các câu thành các đoạn văn trôi chảy (Reading Prose) theo ngữ cảnh thời gian, giúp bạn đọc hiểu liền mạch nội dung bài nghe kèm bảng phụ lục thời gian.
- **Xuất Backup JSON (`.json`)**: Bảo toàn 100% dữ liệu gốc của bài học (mốc thời gian, lịch sử làm bài, câu gắn sao).
- **Xuất Phụ Đề Chuẩn SRT (`.srt`)**: Dễ dàng xuất phụ đề chuẩn để dùng trên các trình phát khác.
- **Nhập Script ghi đè**: Dán nội dung hoặc tải file (`.json`, `.srt`, `.vtt`, `.txt`) để tạo hoặc sửa bài học tức thì.

### 3. 📺 Tích Hợp YouTube Trực Tiếp (YouTube Hub)
- Dán link YouTube vào app để phát trực tiếp với trình phát tối ưu.
- Lưu tiến trình phát tự động, hỗ trợ đầy đủ các tính năng luyện nghe: Hold-to-Slow, A-B Repeat Loop, tua lùi/tiến.

### 4. ⚡ Hiệu Năng Vượt Trội & Bộ Nhớ Siêu Nhẹ
- **Công nghệ Wails v2 + Go**: Giao diện dựng bằng WebView2 của Windows 11, backend viết bằng Go tối ưu đa luồng.
- **Internal HTTP Range Streaming (206 Partial Content)**: Tua tức thì các file âm thanh và video 4K dung lượng hàng Gigabyte mà không ngốn RAM.
- **Smart Resume (Fingerprint Chunk-Hash)**: Nhận diện file thông minh qua mẫu băm, ghi nhớ vị trí đang nghe dở kể cả khi bạn đổi tên file hay di chuyển sang thư mục khác.

---

## ⌨️ Bảng Phím Tắt Tiêu Chuẩn (Mouse-Free Workflow)

Ứng dụng hỗ trợ hệ thống phím tắt toàn diện giúp bạn điều khiển bài nghe mà **không cần chạm vào chuột**:

### Khi Đang Luyện Nghe & Chép Chính Tả (Hoạt động cả khi đang gõ chữ)
| Phím tắt | Thao tác | Mô tả |
| :--- | :--- | :--- |
| **Shift + Enter** | Nghe lại câu hiện tại | Tua về đầu câu và phát lại ngay lập tức |
| **Ctrl + Space** | Phát / Tạm dừng | Bật hoặc dừng âm thanh |
| **Ctrl + S** | Nghe chậm (0.5x) | Bật/tắt tốc độ phát chậm để nghe rõ âm khó |
| **Ctrl + ← / →** | Câu trước / Câu sau | Chuyển sang câu liền kề |
| **Ctrl + H** | Ẩn / Hiện Transcript | Mở hoặc giấu văn bản mẫu |
| **Ctrl + Shift + S** | Gắn / Bỏ sao | Đánh dấu câu quan trọng cần ôn tập lại |
| **Enter** | Kiểm tra / Tiếp theo | Chưa check $\rightarrow$ Chấm điểm; Đã check $\rightarrow$ Sang câu tiếp |

### Phím Tắt Điều Khiển Media Chung
| Phím tắt | Thao tác | Mô tả |
| :--- | :--- | :--- |
| **Space** | Phát / Tạm dừng | Dừng hoặc tiếp tục phát |
| **Giữ phím [S]** | **Hold-to-Slow** | Giữ phím để giảm tốc độ xuống **0.5x**; thả phím để trở về bình thường |
| **← / →** | Tua lùi / Tua tiến | Tua lùi/tiến số giây cài đặt (mặc định 5s) |
| **[A]** | Đặt Mốc Loop A | Điểm bắt đầu lặp đoạn |
| **[B]** | Đặt Mốc Loop B | Điểm kết thúc lặp đoạn |
| **[L]** | Bật / Tắt Loop | Kích hoạt hoặc hủy lặp đoạn A-B |
| **[C]** | Xóa Loop | Xóa toàn bộ mốc A-B |
| **[M]** | Tắt / Mở tiếng (Mute) | Tắt hoặc bật lại âm thanh |
| **[F]** | Toàn màn hình | Phóng to chế độ xem video |
| **↑ / ↓** | Âm lượng | Tăng / giảm âm lượng $\pm 5\%$ |

---

## 🛠️ Dành Cho Lập Trình Viên (Developer Guide)

### Yêu Cầu Môi Trường
- **Hệ điều hành**: Windows 11 (khuyên dùng) hoặc Windows 10 x64.
- **Go**: 1.23+ (đã kiểm thử trên Go 1.27.1).
- **Node.js**: 20+ (đã kiểm thử trên Node.js v24.20.0).
- **Wails CLI v2**: `go install github.com/wailsapp/wails/v2/cmd/wails@latest`.

### Khởi Chạy Môi Trường Phát Triển
```powershell
# 1. Clone repository
git clone https://github.com/vuducmynh/go-media-player.git
cd go-media-player

# 2. Cài đặt thư viện frontend
cd frontend
npm install
cd ..

# 3. Khởi chạy chế độ Live Development (Hot-Reload)
wails dev
```

### Biên Dịch Bản Phát Hành Cục Bộ (Local Build)
Để biên dịch nhanh ra file `go-audio-player.exe` mà không bị treo:
```powershell
cmd.exe /c "build.bat < nul"
```

---

## 📐 Kiến Trúc Dự Án (Architecture Standards)

Dự án tuân thủ nghiêm ngặt 2 tiêu chuẩn kiến trúc:
1. **Backend**: **Domain-Driven Design (DDD)** trong Go (`internal/domain/`, `internal/application/`, `internal/infrastructure/`).
2. **Frontend**: **Feature-Sliced Design (FSD)** trong React (`widgets/`, `features/`, `entities/`, `shared/`).

Chi tiết xem tại tài liệu hướng dẫn Agent: [`.agents/skills/architecture-and-release-workflow/SKILL.md`](.agents/skills/architecture-and-release-workflow/SKILL.md) và [`AGENTS.md`](AGENTS.md).

---

## 📄 Bản Quyền (License)

Dự án được phân phối dưới giấy phép **MIT License**. Bạn được tự do sử dụng, chỉnh sửa và phân phối cho mục đích cá nhân hoặc thương mại.
