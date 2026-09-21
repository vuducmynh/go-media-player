# Nhật Ký Thay Đổi (Changelog)

Tất cả các thay đổi của ứng dụng **Go Audio & Video Player** được lưu lại tại tài liệu này với định dạng chuẩn, phục vụ việc hiển thị trực tiếp cho người dùng trong cửa sổ Cập nhật ứng dụng.

---

## [v1.3.14] - 21/09/2026

# Bảo Toàn Danh Xưng, Chữ Viết Tắt & Khâu Liền Mạch Số Thẻ, Động Từ Khuyết Cùng Chỉ Dẫn IELTS

Bản cập nhật v1.3.14 giải quyết triệt để các trường hợp phân mảnh câu và dị tật chính tả Whisper đặc thù phát hiện trên Practice Test 2 và các audio hội thoại/học thuật: bảo tồn dấu chấm danh xưng và viết tắt (`Mr.`, `Mrs.`, `etc.`), khâu liền số thẻ thanh toán bị cắt đôi, nối liền mệnh đề danh ngữ với động từ khiếm khuyết, hợp nhất câu chỉ dẫn thi IELTS, tự động tách các từ bị dính chùm và chuẩn hóa dấu câu hội thoại giao tiếp.

### Cải tiến (3)
- **Bảo tồn danh xưng & Chữ viết tắt chuẩn mực (Honorifics & Abbreviation Preservation)**:
  - Tự động nhận diện danh xưng (`Mr.`, `Mrs.`, `Ms.`, `Dr.`, `Prof.`) và viết tắt danh mục (`etc.`), không cho phép thuật toán cắt câu sau các từ này trong lúc người nói tạm ngừng (`pause`).
  - Bảo tồn dấu chấm danh xưng nguyên vẹn và bảo vệ tên riêng phía sau không bị biến thành chữ thường: `...today Mr.` + `Brian Kinsella...` ➔ `...today Mr. Brian Kinsella, who is here to talk...`.
  - Khâu liền vị từ bị ngắt sau `etc.`: `lawyers, accountants, etc.` + `Have not felt...` ➔ `lawyers, accountants, etc. have not felt too comfortable with marketing...`.
- **Khâu liền khối số thẻ thanh toán & Chuẩn hóa đánh vần (Credit Card & Spelling Normalization)**:
  - Tự động phát hiện và khâu liền 16 chữ số thẻ thanh toán bị dấu chấm chia đôi thành một khối hoàn chỉnh: `The card number is 4550-1392.` + `8309-32 21.` ➔ `The card number is 4550-1392-8309-3221.`.
  - Chuẩn hóa khoảng trắng đánh vần tên riêng có gạch nối: `W- A- D- D- E- L- L` ➔ `W-A-D-D-E-L-L`.
- **Hợp nhất câu chỉ dẫn đề thi IELTS & Câu hỏi đuôi (IELTS Prompts & Tag Questions)**:
  - Khâu liền mạch các câu lệnh thi quen thuộc: `Now, listen and answer.` + `Questions one to five.` ➔ `Now, listen and answer questions one to five.`, và `...you have some time.` + `To look at questions 26 to 30.` ➔ `...you have some time to look at questions 26 to 30.`.
  - Tự động bổ sung dấu chấm câu chuyển tiếp khi người dẫn chuyện bắt đầu chỉ dẫn: `...around 18% by May before you hear...` ➔ `...around 18% by May. Before you hear the rest of the recording...`.
  - Chuẩn hóa dấu chấm hỏi cho câu hỏi đuôi và chuyển lượt thoại hội thoại: `isn't it that's right` ➔ `isn't it? That's right.`, `about that oh yes` ➔ `about that? Oh yes...`.

### Sửa lỗi (2)
- **Khắc phục tách rời tính từ chỉ định & Mệnh đề danh ngữ (Adjective & Noun Clause Slicing)**:
  - Khâu liền cụm giới từ - tính từ chỉ định: `...exposed to long hours of direct.` + `Sunlight such as...` ➔ `...exposed to long hours of direct sunlight such as the United Kingdom...`.
  - Khâu liền mệnh đề danh ngữ với động từ khuyết: `...what the product.` + `Will do for them.` ➔ `...what the product will do for them.`.
- **Sửa lỗi dính từ của mô hình Whisper (Subword Fusion Healing)**:
  - Tự động tách các từ dính chùm âm thanh: `slightlyless` ➔ `slightly less`, `supplyless than` ➔ `supply less than`.
  - Tự động viết hoa địa danh và tiền tố núi: `wellington` ➔ `Wellington`, `transcoastal` ➔ `Transcoastal`, `mount Narahoe` ➔ `Mount Narahoe`.

### Bản vá (0)

---

## [v1.3.13] - 21/09/2026

# Mở Khóa Độ Dài Linh Hoạt Cho Mẩu Câu Mồ Côi & Bảo Tồn Toàn Vẹn Cú Pháp Câu Luyện Nghe

Bản cập nhật v1.3.13 mở khóa nút thắt cổ chai độ dài cơ học (Dynamic Orphan Threshold), bảo tồn 100% các quy tắc ngữ pháp đã kiểm chứng, cho phép tự động khâu liền các mẩu câu mồ côi (orphans <= 7 từ) và mệnh đề quan hệ dở dang trong các câu nói dài, mang lại trải nghiệm luyện nghe và chép chính tả trọn vẹn tuyệt đối.

### Cải tiến (2)
- **Mở khóa trần độ dài linh hoạt (Dynamic Orphan Threshold)**: Nới lỏng trần khống chế độ dài từ 35 từ lên 48–52 từ khi câu kế tiếp là mẩu cụt mồ côi (`len(w2) <= 7`) hoặc là vị ngữ hoàn thiện mệnh đề quan hệ. Điều này giải phóng toàn bộ các quy tắc cú pháp đã có mà không bao giờ gộp nhầm các câu thoại ngắn độc lập.
- **Bổ sung liên kết vị từ và danh từ ghép hoàn chỉnh**: Nhận diện tự nhiên các liên kết giữa vị từ (look/seem/feel + tính từ bổ ngữ như "a bit stressed"), cụm từ hội thoại ("you know") và danh từ ghép ("book list", "time management").

### Sửa lỗi (1)
- **Khắc phục triệt để hiện tượng ngắt cụt đuôi câu dài**: Khâu liền mạch hoàn hảo 4 vị trí câu phức dài còn sót lại trong các bài thi và bài giảng học thuật (`...when people start to look a bit stressed.`, `...as I have a book list here...`, `...you know, in our lunch hour.`, `...countries require you to provide...`).

### Bản vá (0)

---

## [v1.3.12] - 21/09/2026

# Hoàn Thiện Tinh Tế Thuật Toán Phân Đoạn, Xử Lý Triệt Để 9 Trường Hợp Biên Cắt Vụn & Làm Sạch Dấu Câu Kép

Bản cập nhật v1.3.12 hoàn thiện nốt 9 trường hợp biên (edge cases) tinh tế trong nhận diện giọng nói phục vụ luyện nghe tiếng Anh: xử lý đại từ chủ ngữ đứng sau liên từ (`as I`, `because they`), tính từ phân từ và từ ghép có gạch nối (`neighbouring countries`, `five-week course`), động từ đòi hỏi to-V (`start to look`) và tân ngữ trực tiếp (`have an assignment`), cụm từ đệm giao tiếp (`you know`), dán liền subword `denominations`, và loại bỏ triệt để hiện tượng dấu câu kép `,.`.

### Cải tiến & Khắc phục lỗi (5)
- **Bảo vệ đại từ chủ ngữ phụ thuộc (Subordinate Subject Pronouns)**:
  - Tự động nhận diện đại từ nhân xưng chủ ngữ (`I`, `he`, `she`, `we`, `they`) đứng sau các liên từ phụ thuộc (`as I`, `because they`, `when we`, `if you`, `that I`, `while we`...): ngăn chặn 100% việc cắt câu dở dang như `...after the lecture, as I.` \| `Have a book list...` ➔ `...after the lecture, as I have a book list here and some other useful materials.`
- **Bảo vệ tính từ phân từ & Tính từ ghép có gạch nối (Attributive & Compound Adjectives)**:
  - Tự động gom các tính từ ghép chỉ thời gian/định lượng (`five-week`, `part-time`, `full-time`, `two-year`) và tính từ phân từ (`neighbouring`, `neighboring`, `surrounding`) vào danh từ phía sau: `five-week.` + `Course right...` ➔ `five-week course. Right...`, `neighbouring.` + `Countries require...` ➔ `neighbouring countries require...`.
- **Khâu liền động từ vị ngữ với to-Infinitive & Tân ngữ trực tiếp (Predicate Complementation)**:
  - Khâu nối mượt mà các động từ trạng thái/bắt đầu (`start`, `started`, `begin`, `continue`, `tend`, `manage`, `try`, `plan`...) khi theo sau bởi `to + V`: `when people start.` + `To look a bit stressed.` ➔ `when people start to look a bit stressed.`
  - Khâu nối ngoại động từ (`they have`, `we have`, `you need`) với tân ngữ bắt đầu bằng mạo từ (`a`, `an`, `the`): `mainly because they have.` + `An assignment to do.` ➔ `mainly because they have an assignment to do.`
- **Nhận diện cụm từ đệm & Danh từ ghép học thuật (Discourse Markers & Compound Nouns)**:
  - Tự động khâu cụm từ đệm hội thoại phổ biến: `with colleagues from work, you.` + `Know, in our lunch hour.` ➔ `with colleagues from work, you know, in our lunch hour.`
  - Hợp nhất cụm danh từ ghép: `how to use the library.` + `Computer system...` ➔ `how to use the library computer system...`
  - Nối liền câu chỉ dẫn đề thi IELTS: `As you listen to the rest of the conversation, complete the form...`
- **Làm sạch dấu câu kép & Định dạng ngoại hối (Double Punctuation & Currency Formatting)**:
  - Triệt tiêu hoàn toàn lỗi dấu câu kép `,.` (e.g. `conversation,.` ➔ `conversation,`, `course,.` ➔ `course,`).
  - Tự động vá lỗi tách rời subword tiền tệ: `denomin ations` ➔ `denominations`.
  - Tự động định dạng khoảng trắng ngoại tệ: `dollars.us dollars` ➔ `dollars. US dollars`.

---

## [v1.3.11] - 21/09/2026

# Tự Động Vá Lành & Chống Cắt Vụn Câu Luyện Nghe, Xóa Bỏ Dấu Chấm Giữa Chừng & Ghép Nối Đa Tầng Ranh Giới Whisper

Bản cập nhật v1.3.11 giải quyết toàn diện vấn đề ngắt vụn câu (sentence fragmentation) - một trong những hạn chế lớn nhất khi dùng AI nhận diện giọng nói phục vụ luyện nghe (IELTS, bài giảng, podcast). Thuật toán phân đoạn câu mới bảo vệ tính toàn vẹn ngữ pháp, triệt tiêu việc ngắt câu khi đang dở dang ý, xóa bỏ hoàn toàn dấu chấm câu xuất hiện ở giữa câu do ranh giới cửa sổ 30 giây của Whisper, và tự động khâu liền các phân mảnh câu thành một câu hoàn chỉnh, liền mạch và tự nhiên.

### Cải tiến & Khắc phục lỗi (4)
- **Hệ thống nhận diện cụm từ ngữ pháp dở dang (Grammar Completeness Guard)**:
  - Bổ sung từ điển ngữ pháp toàn diện kiểm soát các cấu trúc không thể kết thúc câu: giới từ (`without`, `to`, `of`, `in`, `for`, `on`, `about`, `into`, `through`, `under`...), mạo từ & từ chỉ định (`the`, `a`, `an`, `this`, `that`, `these`, `those`, `your`, `our`, `their`...), liên từ (`and`, `or`, `but`, `so`, `because`, `while`, `although`...), trợ động từ & động từ khiếm khuyết (`been`, `has been`, `have been`, `will be`, `is`, `are`, `was`, `were`, `will`, `would`, `can`, `could`, `should`...), và các tính từ/phân từ đòi hỏi danh từ bổ nghĩa (`numbered`, `written`, `longer`, `special`, `cautious`, `difficult`...).
  - Ngăn chặn triệt để thuật toán cắt câu khi câu đang dừng lại ở các cấu trúc dở dang này, bảo đảm câu luyện nghe luôn đầy đủ chủ ngữ - vị ngữ - tân ngữ.
- **Triệt tiêu dấu chấm câu sai lệch & Hạ chữ hoa khi câu tiếp diễn (Premature Punctuation Healing)**:
  - Khi Whisper tự ý đặt dấu chấm ở cuối cửa sổ 30s (`...so that has been.`) nhưng câu chưa kết thúc, hệ thống tự động loại bỏ dấu chấm giả mạo, chuyển từ tiếp theo về chữ thường tự nhiên (`Written on the form.` ➔ `written on the form.`), ghép thành một câu duy nhất: `So that has been written on the form.`
  - Bảo vệ tuyệt đối các trường hợp số thập phân (`5.45`), tên miền (`volcaenglish.com`), và khoảng số thứ tự (`questions 15 to 20.`).
- **Cơ chế khâu nối câu phân mảnh đa tầng (Multi-Pass Sentence Stitcher)**:
  - Thuật toán khâu nối tự động quét và hợp nhất các câu bị cắt đôi hoặc cắt ba (e.g. `You will now.` + `Have half a minute to check your.` + `Answers.` ➔ `You will now have half a minute to check your answers.`).
  - Hợp nhất đồng thời thời gian âm thanh (`StartMs`, `EndMs`) và mảng từ ngữ chi tiết (`WordTiming`) để giữ tính đồng bộ chuẩn xác từng mili-giây khi người dùng luyện nghe chép chính tả (Dictation) hoặc lặp lại từng từ (Shadowing).
- **Nâng cấp ngưỡng ngắt câu theo khoảng lặng (Intelligent Speech Pause Thresholds)**:
  - Tăng ngưỡng ngắt câu tự nhiên theo khoảng lặng từ 750ms lên 1000ms, đồng thời yêu cầu kiểm tra tính trọn vẹn ngữ pháp trước khi cho phép ngắt câu.
  - Ngăn chặn hiện tượng speaker chỉ mới hít một hơi ngắn (300-500ms) giữa mệnh đề mà câu đã bị chặt làm đôi.

---

## [v1.3.10] - 21/09/2026

# Khắc Phục Triệt Để Kẹt Kéo Thả Sidebar, Làm Chủ Độ Phân Giải YouTube 1080p & Mặc Định Âm Lượng Tối Đa 100%

Bản cập nhật v1.3.10 tập trung tối ưu hóa sâu trải nghiệm người dùng (UX/UI): giải quyết triệt để lỗi kẹt khi kéo giãn Sidebar qua vùng phát Video/YouTube nhờ lớp bảo vệ con trỏ vô hình (Pointer Barrier Overlay), nâng cấp toàn diện cơ chế điều khiển chất lượng YouTube (mặc định ưu tiên 1080p HD, ép xả buffer để đổi chất lượng tức thì, menu chọn độ phân giải đầy đủ), và thiết lập âm lượng mặc định 100% kèm ghi nhớ vĩnh viễn trên toàn hệ thống.

### Cải tiến & Khắc phục lỗi (3)
- **Khắc phục triệt để lỗi kẹt kéo thả thanh bên (Sidebar Resizing Barrier)**:
  - Bổ sung màn chắn con trỏ vô hình toàn màn hình (`Pointer Capture Overlay`) khi bắt đầu kéo: ngăn chặn 100% tình trạng sự kiện chuột (`mousemove`, `mouseup`) bị iframe YouTube hoặc video nuốt chửng khi con trỏ di chuyển qua.
  - Tăng gấp đôi diện tích vùng chạm kéo thả (16px), bổ sung vạch căn giữa và mốc định vị trực quan; thêm tính năng **nhấp đúp chuột** (`double click`) vào thanh trượt để đặt lại ngay về độ rộng tiêu chuẩn 340px.
  - Tách biệt hoàn toàn việc lưu trữ `localStorage` khỏi sự kiện kéo thả pixel, loại bỏ hiện tượng giật lag khung hình khi di chuyển chuột.
- **Làm chủ chất lượng video YouTube & Ưu tiên sắc nét 1080p**:
  - Tự động áp dụng chất lượng 1080p (`hd1080`) ngay khi mở bất kỳ video YouTube nào; ghi nhớ vĩnh viễn lựa chọn độ phân giải của người dùng qua các lần sử dụng.
  - Khắc phục cơ chế đệm thích ứng DASH của YouTube: khi người dùng chọn độ phân giải mới, hệ thống tự động gọi lệnh ép xả hàng đợi đệm (`buffer flush seekTo`), buộc YouTube phải tải ngay phân đoạn video ở chất lượng mới thay vì tiếp tục phát 30 giây độ phân giải cũ đã nạp sẵn.
  - Nâng cấp menu tùy chọn độ phân giải: luôn cung cấp đầy đủ các chuẩn chất lượng (1080p HD, 720p HD, 480p, 360p, 240p, Tự động) để người dùng chủ động lựa chọn bất cứ lúc nào.
- **Mặc định âm lượng tối đa 100% (1.0) & Ghi nhớ âm lượng toàn diện**:
  - Thiết lập âm lượng mặc định 100% trên toàn bộ hệ thống (từ tầng Backend Go, cấu hình ứng dụng, trình phát tệp cục bộ đến trình phát YouTube và audio ngoại tuyến).
  - Tự động đồng bộ và ghi nhớ mức âm lượng người dùng điều chỉnh vào bộ nhớ vĩnh viễn `app_volume`, không còn tình trạng âm thanh bị nhỏ hoặc reset về mức cũ sau khi mở lại ứng dụng.

---

## [v1.3.9] - 21/09/2026

# Khắc Phục Triệt Để Tách Rời Cụm Phụ Âm (wr, kn, cl, tr...), Chống Cắt Vụn Câu & Bảo Vệ Định Dạng Số / Tiền Tệ

Bản cập nhật v1.3.9 hoàn thiện toàn bộ các trường hợp biên của thuật toán xử lý ngôn ngữ và văn phong transcription: xử lý triệt để các cụm phụ âm bị chia tách, ngăn chặn hiện tượng câu bị ngắt ngọn ở các từ chỉ định/sở hữu qua ranh giới 30 giây của Whisper, sửa lỗi ghép nhầm tên thương hiệu viết hoa, và khắc phục lỗi xuất file Markdown làm vỡ định dạng số hàng nghìn và số tiền tệ.

### Cải tiến & Khắc phục lỗi (5)
- **Ghép nối toàn diện cụm phụ âm (Consonant Cluster & Prefix Merger)**:
  - Tăng ngưỡng dung sai thời gian ghép nối token BPE (`gapMs`) từ 150ms lên 600ms, giúp bao quát trọn vẹn khoảng ngập ngừng tự nhiên giữa phụ âm và nguyên âm.
  - Tự động nhận diện và dán liền các cụm phụ âm bị Whisper tách rời: `wr inkly` ➔ `wrinkly`, `kn uckles` ➔ `knuckles`, `cl ippers` ➔ `clippers`, `tr inkets` ➔ `trinkets`, `hes itating` ➔ `hesitating`, `can adian` ➔ `Canadian`, `CE FR` ➔ `CEFR`.
- **Tự động gắn các hậu tố phụ thuộc (Bound Morpheme Suffix Merger)**:
  - Các hậu tố không thể đứng độc lập trong tiếng Anh (`ed`, `ing`, `ly`, `es`, `tion`, `ment`, `ness`, `ible`) khi bị cách rời đều được tự động gom vào từ gốc: `budget ed` ➔ `budgeted`, `vacuum ing` ➔ `vacuuming`, `spong es` ➔ `sponges`.
- **Bảo vệ từ viết tắt và chữ cái hoa đứng riêng (Acronym Protection)**:
  - Ngăn chặn triệt để hiện tượng dính chữ như `Circle Kand` ➔ tự động tách đúng thành `Circle K and`, nhờ bộ lọc loại trừ các liên từ/giới từ độc lập phổ biến (`and`, `or`, `to`, `in`, `on`, `at`).
- **Chống ngắt câu sai ngữ pháp ở ranh giới 30s (Dangling Word Protection)**:
  - Phát hiện và loại bỏ các dấu chấm vô lý do Whisper đặt ở cuối chu kỳ 30 giây khi gặp các từ sở hữu hoặc mạo từ (`my. Hair` ➔ `my hair`, `a. Lot` ➔ `a lot`), không làm đứt đoạn câu nói của người bản xứ.
  - Nâng cấp tham số ngữ cảnh `-mc 64` trong Whisper engine giúp bộ giải mã ghi nhớ ngữ cảnh liên tục qua các phân đoạn âm thanh.
- **Khắc phục lỗi định dạng số và tiền tệ khi xuất Markdown**:
  - Viết lại bộ lọc xuất Markdown thông minh: bảo vệ toàn vẹn dấu phẩy hàng nghìn (`$10,000`, `3,000`, `40,000`, `56,000`), dấu chấm thập phân (`5.45`, `1.0s`) và khoảng cách tiền tệ (`$2.$2?` ➔ `$2. $2?`).

---

## [v1.3.8] - 21/09/2026

# Đồng Hồ Đo Thời Gian & Tốc Độ AI Thực Tế (Timer, ETA & Speed Factor), Tự Động Dừng Media Khi Xử Lý & Tối Ưu Băng Thông GPU

Bản cập nhật v1.3.8 nâng cấp mạnh mẽ trải nghiệm người dùng khi phân tích bài học AI Whisper: bổ sung cụm đồng hồ thời gian thực (thời gian đã chạy, ước tính thời gian còn lại ETA, hệ số tốc độ gấp N lần thời gian thực), tự động dừng hoàn toàn video/audio/YouTube đang phát khi bắt đầu phân tích để giải phóng 100% băng thông GPU/VRAM, và giải thích sâu sắc về cơ chế vận hành Autoregressive Memory-Bound của mô hình AI.

### Cải tiến & Khắc phục lỗi (3)
- **Tự động dừng phát Media khi bắt đầu phân tích AI**:
  - Khi người dùng bấm "Luyện sâu", "Tạo lại bài học" hoặc mở cửa sổ chọn mô hình, hệ thống lập tức ra lệnh tạm dừng (`pause`) tất cả nguồn phát (YouTube, video/audio tệp tin, audio ngoại tuyến).
  - Tránh tình trạng video tiếp tục phát ầm ĩ dưới nền khiến người dùng bị kẹt không thể dừng lại.
  - Giải phóng bộ giải mã phần cứng GPU Video Decoder và băng thông bộ nhớ VRAM, giúp AI Whisper đạt tốc độ tối đa không bị tranh chấp.
- **Bổ sung Dashboard Đo Lường Thời Gian Thực (Timer, ETA, Speed Factor & Audio Length)**:
  - Hiển thị 3 thẻ thông số trực quan ngay trong hộp thoại phân tích:
    - ⏱️ **Đã chạy (Elapsed Time)**: Đếm chính xác số giây, phút đã xử lý.
    - ⏳ **Còn khoảng (ETA Remaining)**: Dự toán tự động thời gian còn lại dựa trên độ dốc tiến độ thực tế (`~00:45`, `~01:20`).
    - ⚡ **Tốc độ AI (Speed Factor)**: Đo lường tốc độ thực tế so với thời lượng audio gốc (ví dụ: `12.5x (gấp 12.5 lần thời gian thực)` kèm thời lượng gốc `22:34`).
- **Nâng cấp Bảng hướng dẫn & So sánh Mô hình Whisper**:
  - Giải thích rõ ràng sự khác biệt giữa **Large-v3** (32 tầng giải mã tuần tự, chuẩn xác nhất cho accent khó) và **Large-v3-Turbo** (4 tầng giải mã, nhanh gấp 4 - 8 lần).
  - Giúp người dùng hiểu rõ bản chất GPU bận ~40% là do giới hạn băng thông bộ nhớ (Memory-Bandwidth Bound) của thuật toán Autoregressive sinh từng từ, không phải do hệ thống bỏ phí tài nguyên.

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
