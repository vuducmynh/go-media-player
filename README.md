# Go Audio & Video Player - Windows 11 Fluent Listening Master 🎧🎬

Ứng dụng Windows Desktop hiện đại, độc lập, tối ưu hóa hiệu năng cao cho việc phát Media (Audio & Video) và hỗ trợ luyện nghe ngoại ngữ (Listening Assistant) được xây dựng bằng **Golang** kết hợp **Wails v2 + React / TypeScript / Tailwind CSS**.

---

## ✨ Tính năng nổi bật

- 🚀 **100% Độc lập & Tối ưu RAM**: Đóng gói thành 1 file `.exe` duy nhất, khởi chạy trực tiếp cửa sổ ứng dụng Windows 11 Fluent UI, khi đóng giải phóng 100% tài nguyên CPU/RAM.
- 📁 **Quản lý đa thư mục & Quét đệ quy**: Ghi nhớ nhiều vị trí thư mục, quét đệ quy mọi cấp thư mục con.
- ⚡ **Smart Resume (Fingerprint Chunk-Hash)**: Nhận diện file bằng thuật toán Chunk-Hash siêu tốc (kích thước + mẫu 64KB đầu/giữa/cuối file). Ghi nhớ chính xác vị trí phát cuối cùng dù đổi tên hay di chuyển thư mục.
- 🎯 **Bộ công cụ luyện nghe (Listening Assistant)**:
  - **Hold-to-Slow**: Giữ phím `S` (hoặc `Shift`) để tạm thời giảm tốc độ xuống `0.5x` khi gặp câu phát âm khó, thả phím phát lại bình thường.
  - **Tua linh hoạt**: Tua lùi/tiến $\pm 5$s (tùy chỉnh được trong Cài đặt).
  - **A-B Repeat Loop**: Đặt mốc A (phím `A`), mốc B (phím `B`) để lặp lại một câu thoại luyện listening.
  - **Điều chỉnh tốc độ toàn dải**: 0.25x đến 3.0x kèm các nút preset nhanh.
- 📡 **Internal HTTP Range Streaming (206 Partial Content)**: Tua media 4K/Audio dung lượng hàng GB tức thì, không nạp toàn bộ vào RAM.
- 🌊 **Audio Visualizer & Video Player**: Visualizer sóng âm cho audio và video viewport tỷ lệ chuẩn kèm chế độ toàn màn hình.

---

## ⌨️ Bảng phím tắt (Hotkeys)

| Phím tắt | Thao tác | Mô tả |
| :--- | :--- | :--- |
| **Space** | Phát / Tạm dừng | Bật hoặc dừng media |
| **Giữ [S]** (hoặc `Shift`) | **Hold-to-Slow** | Giảm tốc độ tức thì xuống **0.5x**; nhả phím trở về bình thường |
| **Mũi tên Trái [←]** | Tua lùi 5s | Tua lùi lại số giây cài đặt |
| **Mũi tên Phải [→]** | Tua tiến 5s | Tua tiến tới số giây cài đặt |
| **[ / ]** | Tốc độ phát | Giảm / Tăng tốc độ phát 0.1x |
| **[A]** | Mốc Loop A | Điểm bắt đầu lặp |
| **[B]** | Mốc Loop B | Điểm kết thúc lặp |
| **[L]** | Bật/Tắt Loop | Kích hoạt hoặc ngừng lặp A-B |
| **[C]** | Xóa Loop | Xóa cả 2 mốc A và B |
| **[M]** | Mute | Tắt / Bật tiếng |
| **[F]** | Toàn màn hình | Phóng to Video toàn màn hình |
| **Mũi tên Lên / Xuống** | Âm lượng | Tăng / Giảm âm lượng $\pm 5\%$ |

---

## 🛠️ Hướng dẫn cài đặt & Biên dịch

### Yêu cầu:
- Go 1.20+
- Node.js 18+ & npm

### Các bước:
```bash
# 1. Clone repository
git clone https://github.com/gdevgproject/golang-audio-play.git
cd golang-audio-play

# 2. Cài đặt và build frontend
cd frontend
npm install
npm run build
cd ..

# 3. Build file thực thi Go (Windows Desktop)
go build -tags desktop,production -ldflags "-H windowsgui" -o go-audio-player.exe .

# Hoặc đơn giản là nhấp đúp chạy file build.bat

# 4. Khởi chạy ứng dụng
./go-audio-player.exe
```

---

## 📄 License
MIT License.
