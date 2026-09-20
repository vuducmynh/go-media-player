---
name: architecture-and-release-workflow
description: >-
  Enforces Domain-Driven Design (DDD) in the Go backend and Feature-Sliced Design (FSD)
  in the React frontend, Windows non-hanging build execution, and strict GitHub Release,
  tagging, and auto-update governance for the go-media-player project.
  Use this skill whenever modifying the codebase, introducing new features, refactoring,
  building binaries, or creating new releases and git tags.
---

# Go Audio & Video Player: Architecture & Release Governance Skill

Tài liệu này là quy chuẩn kỹ thuật bắt buộc cho mọi AI Agent và lập trình viên khi phát triển, chỉnh sửa, kiểm thử hoặc phát hành ứng dụng **Go Audio & Video Player**.

---

## 1. Kiến Trúc Backend: Domain-Driven Design (DDD) trong Go

Backend được tổ chức theo mô hình phân tầng hướng miền (Domain-Driven Design). Mọi thay đổi phải tuân thủ nghiêm ngặt các quy tắc sau:

```text
internal/
├── domain/            # 1. Tầng Miền (Domain Layer - Core Business Logic & Entities)
│   ├── library/       # Quản lý thư viện, thư mục, cài đặt người dùng (AppSettings)
│   ├── media/         # Quản lý thực thể media (MediaItem, YouTubeItem, PlaybackState)
│   └── study/         # Quản lý học tập (Lesson, Sentence, DictationAttempt, Diff)
├── application/       # 2. Tầng Ứng Dụng (Application Layer - Use Cases & Orchestration)
│   ├── media_service.go
│   ├── playback_service.go
│   ├── youtube_service.go
│   ├── study_service.go
│   └── updater_service.go
└── infrastructure/    # 3. Tầng Hạ Tầng (Infrastructure Layer - Drivers & External Tools)
    ├── scanner/       # Quét ổ đĩa, phân tích metadata media
    ├── storage/       # Lưu trữ dữ liệu JSON (Store, LessonStore)
    ├── streamer/      # HTTP streaming server nội bộ
    └── whisper/       # Tích hợp Whisper AI engine, Model Manager
app.go                 # 4. IPC Facade Controller (Wails Gateway)
```

### Quy tắc bất biến (Invariants):
1. **Domain là trung tâm độc lập**: `internal/domain/` không được phép import bất kỳ package nào từ `application/` hoặc `infrastructure/`. Chỉ chứa struct, interface và business validation thuần túy.
2. **Application điều phối Use Cases**: Mọi logic nghiệp vụ phức tạp (ví dụ: so sánh phiên bản, stream download exe, chuyển đổi Whisper) phải nằm trong `internal/application/`.
3. **Infrastructure triển khai chi tiết kỹ thuật**: Tương tác với đĩa, hệ điều hành, mạng, Whisper C++ phải nằm trong `internal/infrastructure/`.
4. **`app.go` chỉ là Facade IPC**: `app.go` chỉ làm nhiệm vụ ủy quyền (delegate) lời gọi từ Wails frontend sang Application Services. Tuyệt đối không viết logic nghiệp vụ dài dòng trực tiếp trong `app.go`.

---

## 2. Kiến Trúc Frontend: Feature-Sliced Design (FSD) trong React

Frontend tổ chức theo kiến trúc chuẩn quốc tế **Feature-Sliced Design (FSD)**:

```text
frontend/src/
├── app/               # Tầng khởi tạo ứng dụng, providers, styles toàn cục
├── widgets/           # Tầng khối giao diện lớn độc lập (Sidebar, PlayerView, SettingsModal, HotkeysModal)
│   ├── sidebar/
│   ├── player-viewport/
│   ├── settings-modal/
│   └── hotkeys-modal/
├── features/          # Tầng tính năng tương tác của người dùng (User Scenarios)
│   ├── study/              # Luyện sâu, chép chính tả, import/export script
│   ├── playback-controls/  # A-B loop, tua lùi/tiến, tốc độ phát
│   ├── updater/            # Kiểm tra bản mới, tải xuống, modal cài đặt
│   ├── model-manager/      # Quản lý tải và chọn model Whisper
│   └── youtube-loader/     # Tải và xử lý video/audio từ YouTube
├── entities/          # Tầng thực thể dữ liệu nghiệp vụ (Media, Study, Library types)
│   ├── media/
│   └── study/
└── shared/            # Tầng dùng chung không chứa nghiệp vụ riêng (UI kit, api, hooks, lib, utils)
    ├── api/wailsBridge.ts  # Cầu nối IPC duy nhất với Go backend
    ├── lib/                # diff algorithm, formatters
    └── hooks/              # useHotkeys, useYouTubePlayer
```

### Quy tắc bất biến của FSD:
1. **Quy tắc một chiều (Top-down Dependency)**: Một tầng chỉ được phép import từ các tầng **BÊN DƯỚI** nó:
   - `widgets` -> có thể import `features`, `entities`, `shared`.
   - `features` -> có thể import `entities`, `shared`.
   - `entities` -> chỉ có thể import `shared`.
   - `shared` -> không được import bất kỳ tầng nào khác.
2. **Tuyệt đối không import chéo cùng tầng (No Cross-imports)**:
   - Ví dụ: `features/study` **không được** import trực tiếp từ `features/updater`. Nếu cần chia sẻ dữ liệu hoặc tương tác, phải nhấc (lift) lên tầng `widgets` hoặc `app`, hoặc tách thành `entities`/`shared`.
3. **Public API qua `index.ts`**: Mỗi slice trong `widgets/` và `features/` phải có `index.ts` xuất khẩu rõ ràng những component/hook được phép sử dụng từ bên ngoài. Không import sâu vào đường dẫn nội bộ của slice khác.

---

## 3. Quy Tắc Biên Dịch & Chạy Lệnh Trên Windows (Anti-Hang Execution)

Khi thực thi biên dịch hoặc chạy lệnh terminal trên Windows:
1. **Tránh treo lệnh vĩnh viễn (Anti-Hang)**:
   - File `build.bat` có lệnh `pause`. Khi chạy qua terminal của agent, **BẮT BUỘC** phải pipe input:
     `cmd.exe /c "build.bat < nul"`
   - Luôn đặt `WaitMsBeforeAsync: 10000` để chờ lệnh hoàn tất đồng bộ một cách an toàn.
2. **Dọn dẹp tiến trình cũ trước khi build**:
   - File executable đang chạy sẽ khóa đĩa. Luôn đảm bảo đóng tiến trình cũ:
     `taskkill /F /IM go-audio-player.exe /IM go-audio-play.exe 2>nul`
3. **Kiểm tra 2 bước**:
   - Bước 1: `npm run build` trong thư mục `frontend/` (xác thực không có lỗi TypeScript / JSX).
   - Bước 2: `cmd.exe /c "build.bat < nul"` tại thư mục gốc (xác thực binary Wails và WebView2).

---

## 4. Quy Trình Phát Hành, Gắn Tag & Cập Nhật Tự Động (Release & Auto-Update Governance)

Khi thêm tính năng mới hoặc sửa lỗi sẵn sàng phát hành, Agent phải tuân thủ chuẩn xác **6 bước bắt buộc**:

### Bước 1: Cập nhật số phiên bản tập trung
- Mở `internal/application/updater_service.go`, nâng phiên bản trong hằng số:
  ```go
  const CurrentAppVersion = "vX.Y.Z"
  ```
- Nếu cần, cập nhật version trong `wails.json` và `frontend/package.json` cho đồng bộ.

### Bước 2: Biên dịch và kiểm thử cục bộ
- Chạy `npm run build` tại `frontend/`.
- Chạy `cmd.exe /c "build.bat < nul"` tại thư mục gốc.
- Đảm bảo mã lỗi thoát là `0` (không có cảnh báo nghiêm trọng hay lỗi biên dịch).

### Bước 3: Commit mã nguồn
- Định dạng commit chuẩn Conventional Commits:
  `git add .`
  `git commit -m "feat: <mô tả tính năng>" ` hoặc `git commit -m "fix: <mô tả lỗi đã sửa>"`

### Bước 4: Đẩy lên nhánh chính (Push to main)
- `git push origin main`

### Bước 5: Tạo và đẩy Git Tag phiên bản mới
- Tạo tag trùng khớp với `CurrentAppVersion`:
  `git tag vX.Y.Z`
  `git push origin vX.Y.Z`

### Bước 6: Giám sát GitHub Actions & Xác thực Auto-Update
- GitHub Actions workflow `.github/workflows/release.yml` sẽ tự động:
  1. Build ứng dụng trên `windows-latest` bằng Wails CLI.
  2. Tạo bản Release chính thức trên GitHub với 2 asset:
     - `go-audio-player.exe` (Dùng cho auto-updater tải trực tiếp).
     - `GoAudioPlayer-Windows11-x64.zip` (Dùng cho người dùng tải trọn gói).
- Khi người dùng đang mở phiên bản cũ, ứng dụng sẽ:
  1. Tự động nhận diện bản phát hành mới từ GitHub API.
  2. Hiển thị nút `[ Cập nhật vX.Y.Z ]` ở góc dưới Sidebar.
  3. Tải xuống với hiển thị phần trăm thời gian thực.
  4. Thay thế file an toàn bằng cơ chế đổi tên `.old` và khởi động lại.
