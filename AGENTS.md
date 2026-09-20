# Project Guidelines for AI Agents & Developers

Ứng dụng **Go Audio & Video Player** tuân thủ các chuẩn mực kiến trúc và quy trình phát hành nghiêm ngặt. Bất kỳ AI Agent nào (Antigravity, Cursor, Copilot, Claude, v.v.) làm việc trên dự án này đều **BẮT BUỘC** phải tuân theo các quy tắc dưới đây.

Chi tiết runbook đầy đủ được lưu tại: [`.agents/skills/architecture-and-release-workflow/SKILL.md`](.agents/skills/architecture-and-release-workflow/SKILL.md).

---

## 1. Kiến Trúc Backend (Domain-Driven Design trong Go)
- **Tầng Miền (`internal/domain/`)**: Chứa thực thể và luật nghiệp vụ thuần túy (`library`, `media`, `study`). Tuyệt đối không import tầng ngoài.
- **Tầng Ứng Dụng (`internal/application/`)**: Điều phối các Use Case (`media_service.go`, `study_service.go`, `updater_service.go`, v.v.).
- **Tầng Hạ Tầng (`internal/infrastructure/`)**: Triển khai chi tiết kỹ thuật (`scanner`, `storage`, `streamer`, `whisper`).
- **`app.go`**: Chỉ đóng vai trò Facade IPC Controller cho Wails, ủy quyền trực tiếp xuống Application Services, không viết logic trực tiếp tại đây.

---

## 2. Kiến Trúc Frontend (Feature-Sliced Design trong React)
- **Cấu trúc phân tầng**: `app/` -> `widgets/` -> `features/` -> `entities/` -> `shared/`.
- **Quy tắc phụ thuộc**: Một tầng chỉ được import từ các tầng **bên dưới** nó. Tuyệt đối không import ngược hoặc import chéo giữa các slice cùng tầng.
- **Public API**: Mỗi widget hoặc feature phải có `index.ts` để xuất khẩu component ra ngoài.

---

## 3. Quy Tắc Biên Dịch & Chạy Lệnh Trên Windows (Anti-Hang & Local-First)
- **Tuyệt đối không chạy `build.bat` trực tiếp** vì có lệnh `pause` gây treo vĩnh viễn tiến trình của agent. Luôn luôn chạy:
  ```powershell
  cmd.exe /c "build.bat < nul"
  ```
- **Luôn kiểm tra 2 bước**: Chạy `npm run build` trong `frontend/` trước khi build Wails binary.
- **Tự động đóng app cũ**: Luôn chạy `taskkill /F /IM go-audio-player.exe /IM go-audio-play.exe 2>nul` để tránh lỗi khóa file của Windows (`Access is denied`).
- **Luôn tạo sẵn file exe cục bộ (`go-audio-player.exe`) sau khi làm xong**: Mỗi khi hoàn tất một tính năng hoặc sửa lỗi, Agent **BẮT BUỘC** phải biên dịch ra file `go-audio-player.exe` ngay tại thư mục gốc dự án để người dùng mở lên dùng thử cục bộ ngay lập tức mà không phải lên GitHub tải về thủ công hay chờ GitHub Actions.

---

## 4. Quy Trình Phát Hành & Tự Động Cập Nhật (Release & Update Workflow)
Khi hoàn tất tính năng mới hoặc bản vá lỗi sẵn sàng phát hành:
1. **Đồng bộ phiên bản ở cả 3 tệp**:
   - `internal/application/updater_service.go` (`CurrentAppVersion = "vX.Y.Z"`).
   - `wails.json` (`"productVersion": "X.Y.Z"`).
   - `frontend/package.json` (`"version": "X.Y.Z"`).
2. **Biên dịch kiểm thử cục bộ**: `npm run build` và `cmd.exe /c "build.bat < nul"` (đảm bảo file `go-audio-player.exe` đã được tạo mới).
3. **Commit mã nguồn**: `git add .` và `git commit -m "feat: ..."` (Conventional Commits).
4. **Đẩy mã nguồn**: `git push origin main`.
5. **Tạo và đẩy Tag**: `git tag vX.Y.Z` và `git push origin vX.Y.Z`.
6. **GitHub Actions (`.github/workflows/release.yml`)** tự động đóng gói file `.exe` và `.zip`, kích hoạt tính năng tự động cập nhật trong ứng dụng của người dùng.

