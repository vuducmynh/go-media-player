# Nhật Ký Thay Đổi (Changelog)

Tất cả các thay đổi của ứng dụng **Go Audio & Video Player** được lưu lại tại tài liệu này với định dạng chuẩn, phục vụ việc hiển thị trực tiếp cho người dùng trong cửa sổ Cập nhật ứng dụng.

---

## [v1.3.7] - 21/09/2026

# Tối ưu Chế độ Audio Ngoại Tuyến (Ẩn Video & Đồng Bộ Điều Khiển), Chuẩn Hóa Số Thập Phân & Ngắt Câu Độc Thoại Thông Minh

Bản cập nhật v1.3.7 hoàn thiện trải nghiệm luyện nghe sâu với chế độ Âm thanh ngoại tuyến (Offline Audio) giúp ẩn hoàn toàn khung video để tập trung 100% vào việc nghe, đồng bộ đồng nhất các nút điều khiển phát/dừng, sửa triệt để lỗi tách nhầm số thập phân/tên miền web, và áp dụng cơ chế ngắt câu thông minh theo liên từ và nhịp thở (Clause & Pause Splitting) cho các bài độc thoại dài.

### Cải tiến & Khắc phục lỗi (4)
- **Tối ưu hóa Chế độ Audio Ngoại Tuyến (Offline Audio Mode)**:
  - Khi chuyển từ tab Video sang "Audio offline", khung video YouTube tự động được ẩn hoàn toàn (`hidden`), giải phóng tối đa không gian màn hình cho giao diện chép chính tả và luyện nghe sâu.
  - Chuyển đổi mượt mà giữa Video và Audio giữ nguyên chính xác vị trí phát (timestamp) hiện tại.
  - Đồng bộ toàn diện nút Play/Pause (icon đổi trạng thái chuẩn xác), thanh tua thời gian (scrubber), phím tắt Spacebar, phím tua lùi/tiến và phím giữ nghe chậm `S`.
- **Bảo vệ số thập phân, đơn vị đo lường & tên miền website**:
  - Khắc phục lỗi tách câu nhầm khi gặp số có dấu chấm (`5.45`, `1.0s`) hoặc địa chỉ website (`volcaenglish.com`), ngăn ngừa tình trạng tách thành hai câu kỳ quặc như `5.` và `45`.
  - Tự động chuẩn hóa dấu cách tiền tệ và dấu phẩy phân tách hàng nghìn (`was$10, 000` -> `was $10,000`, `$ 500` -> `$500`).
- **Phân đoạn câu độc thoại thông minh cho Luyện nghe sâu (Clause & Pause Splitting)**:
  - Loại bỏ hoàn toàn các câu độc thoại kéo dài bất thường (20s - 55s) do người nói nói nhanh không có dấu chấm.
  - Tự động ngắt câu tại khoảng dừng thở tự nhiên ($\ge 350$ms khi câu $\ge 7$s) hoặc tại các liên từ liên kết câu (*and*, *so*, *but*, *because*, *when*, *now*, *then*... khi câu $\ge 9.5$s kèm khoảng nghỉ $\ge 200$ms).
  - Khóa độ dài tối đa $\le 18$ giây / 25 từ, bảo đảm các câu học luôn nằm trong "khung vàng" 6–12 giây lý tưởng cho việc ghi nhớ và chép chính tả.
- **Tự động gắn kết token âm thanh BPE chuẩn xác**: Ngăn ngừa tình trạng token đầu tiên của khối âm thanh bị dán nhầm vào câu trước khi có khoảng lặng giữa các câu.

---

## [v1.3.6] - 21/09/2026

# Ngắt câu theo khoảng lặng (Pause Boundary), Viết hoa đại từ "I" & Khởi tạo Whisper Prompt Conditioning

Bản cập nhật v1.3.6 hoàn thiện độ chính xác câu từ và chính tả tiếng Anh khi phân tích bằng AI Whisper: tự động tách câu theo khoảng lặng ngừng nghỉ tự nhiên của người nói, sửa triệt để lỗi đại từ "I" và danh từ riêng viết thường, ngắt các câu nối dài (run-on sentences), và áp dụng kỹ thuật Prompt Conditioning giúp AI luôn giữ văn phong chuẩn mực kèm dấu câu hoàn chỉnh.

### Cải tiến & Khắc phục lỗi (4)
- **Tách câu thông minh theo khoảng lặng (Speech Pause Boundary Detection)**: Khi người nói tạm dừng từ 750ms trở lên (hoặc dừng 350ms trước một từ chuyển câu viết hoa như *Now*, *Then*, *It's*), hệ thống tự động chốt câu và bổ sung dấu chấm `.` kết thúc. Khắc phục triệt để tình trạng các câu nói nhanh dồn cục thành một đoạn văn dài không có dấu chấm.
- **Tự động chuẩn hóa đại từ nhân xưng "I" & danh từ riêng**: Tự động viết hoa 100% đại từ `I` và các dạng rút gọn (`I'm`, `I've`, `I'll`, `I'd`), danh từ riêng/quốc gia (`England`, `English`, `America`...) và tự động viết hoa chữ cái đầu sau dấu chấm câu.
- **Kỹ thuật Whisper Prompt Conditioning & `--carry-initial-prompt`**: Truyền câu mồi chuẩn mực vào Whisper trước khi nhận diện và duy trì xuyên suốt qua các khối 30s. Điều này "dạy" mô hình AI luôn xuất ra dấu câu đầy đủ, viết hoa chuẩn và không bị suy giảm chất lượng thành chữ thường không dấu.
- **Bảo đảm câu luôn có dấu câu kết thúc**: Mọi câu trong giao diện bài học và tệp Markdown xuất ra đều được bảo đảm kết thúc bằng dấu chấm `.`, hỏi `?` hoặc cảm `!`, ngăn ngừa tình trạng hai câu dính chùm vào nhau.

---

## [v1.3.5] - 21/09/2026

# Khắc phục lỗi tách rời từ ngữ AI Whisper (BPE Tokenizer Fix), Làm sạch chính tả & Tính năng Tạo lại bài học (Remake AI)

Bản cập nhật v1.3.5 giải quyết triệt để sự cố các từ ghép tiếng Anh bị tách rời thành từng mẩu vụn và dấu câu bị lỗi khoảng trắng khi nhận diện bằng AI Whisper; đồng thời bổ sung cơ chế làm sạch văn bản thông minh (on-the-fly & export sanitizer) và tính năng Tạo lại bài học (Remake) cho phép phân tích lại nội dung với mô hình AI khác chất lượng hơn.

### Cải tiến & Khắc phục lỗi (4)
- **Khắc phục lỗi tách từ Byte-Pair Encoding (BPE Tokenizer Fix)**: Whisper chia cắt từ ngữ theo các token BPE (ví dụ `compreh` + `ensible`, `vacuum` + `ing`, `ch` + `ores`, `do` + `ork` + `n` + `ob`). Hệ thống đã được nâng cấp để nhận diện chính xác token bắt đầu từ và tự động dán liền các sub-word/hậu tố/dấu câu vào từ gốc, bảo đảm văn bản trôi chảy tự nhiên 100% và thời lượng từ (`WordTiming`) chính xác tuyệt đối.
- **Bộ lọc làm sạch văn phong & chính tả tự động**: Tự động nhận diện và ghép các phụ âm rời rạc (`m owing` -> `mowing`, `r ake` -> `rake`), số thứ tự (`21 st` -> `21st`), từ viết tắt (`I 'm` -> `I'm`, `don 't` -> `don't`), từ ghép nối (`flip-flops`) và xóa bỏ khoảng trắng bất thường trước dấu chấm, phẩy, hỏi, than (`Hello .` -> `Hello.`).
- **Tự động làm sạch bài học cũ ngay khi tải lên (On-the-fly Sanitization)**: Mọi bài học đã được phân tích trước đây sẽ được tự động làm sạch chính tả và dấu câu ngay khi hiển thị lên giao diện hoặc xuất ra Markdown mà không cần phải phân tích lại từ đầu.
- **Tính năng Tạo lại bài học bằng AI (Remake AI)**: 
  - Thêm nút "Tạo lại" (`RotateCcw`) nổi bật trực tiếp trên thanh công cụ Luyện sâu.
  - Nút biểu tượng bên cạnh "Luyện sâu" trên thanh phát nhạc sẽ tự động biến thành nút xoay `RotateCcw` màu hổ phách khi tệp đã có bài học phân tích sẵn, giúp người dùng dễ dàng đổi mô hình AI cao cấp hơn hoặc phân tích lại bài học chỉ với 1 thao tác.

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
