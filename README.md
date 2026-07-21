# 🎅 AI English Roleplay Web App

Ứng dụng web giúp bạn **luyện nói tiếng Anh trực tiếp với AI Tutor 3D (Ông già Noel / Santa)** một cách tự nhiên và thú vị.

---

## 🌟 1. Những gì ứng dụng ĐÃ LÀM ĐƯỢC:

1. **Nói chuyện trực tiếp với AI**: Bấm Mic để nói (hoặc gõ chữ), AI Santa sẽ trả lời bằng giọng nói và cử động nhép môi 3D sinh động.
2. **Dịch nhanh & Tra từ điển**: Dễ dàng vuốt để xem bản dịch Tiếng Việt; bôi đen từ mới trong câu để tra ngay nghĩa, cách đọc và ví dụ mẫu.
3. **Gợi ý câu nói & Luyện thi IELTS**: Gợi ý sẵn câu mẫu khi bạn bí từ; chọn giao tiếp tự do hoặc luyện thi IELTS Speaking (Part 1, Part 2 đếm ngược 1-2 phút, Part 3).
4. **Nhận xét & Sửa lỗi thông minh**: Chấm điểm từng câu nói, chỉ ra 1 lỗi cần sửa quan trọng nhất và có nút bấm thử lại ngay.
5. **Chỉnh giọng đọc & Tốc độ**: Chọn giọng ấm áp của Santa hoặc giọng máy mặc định, điều chỉnh tốc độ nói nhanh/chậm (từ 0.8x đến 1.8x).

---

## 🛠️ 2. Công nghệ & Công cụ sử dụng (Tech Stack):

* **Giao diện (Frontend)**: React + TypeScript + Vite, Tailwind CSS, Three.js (Hiển thị Avatar 3D nhép môi LipSync), Web Audio API (Thu âm & xử lý giọng nói).
* **Máy chủ (Backend)**: Node.js, Express, Socket.IO (WebSockets kết nối phản hồi thời gian thực siêu tốc).
* **Cơ sở dữ liệu (Database)**: PostgreSQL, Prisma ORM (Quản lý lưu trữ tiến độ học), Docker.
* **Trí tuệ nhân tạo (AI & Voice)**: Google Gemini API (Phân tích & đối thoại), Web Speech API (Speech-to-Text & Text-to-Speech).

---

## 🔍 3. Phân tích & So sánh với App đối thủ (BiBung English):

### 🔴 Điểm đối thủ làm rất tốt (Họ là một trường học online thu nhỏ):
* **Luyện nghe & Chép chính tả (See & Write)**: Vừa nghe video Youtube vừa gõ lại câu thoại để AI chấm điểm.
* **Kho từ vựng & Ôn tập thông minh (SRS)**: Lưu từ vựng vào từng thư mục và nhắc ôn lại đúng lúc trước khi quên.
* **Đề thi thử TOEIC**: Có sẵn các bài thi thử kỹ năng Nói và Viết theo chuẩn TOEIC.
* **Tạo động lực học (Gamification)**: Thưởng điểm kinh nghiệm (XP), đếm chuỗi ngày học liên tục (Streak) và Bảng xếp hạng thi đua.
* **Trang quản trị (Admin Backoffice)**: Trang riêng dành cho người quản lý để đăng video, soạn từ vựng và quản lý tài khoản.

### 🟢 Lợi thế vượt trội của chúng ta (Đối thủ CHƯA CÓ):
* **Hội thoại giọng nói thời gian thực**: Phản hồi tức thì qua kết nối WebSockets (đối thủ dùng kiểu gửi tin nhắn cũ nên bị khựng).
* **AI Tutor 3D nhép môi sinh động**: Có nhân vật 3D biết tương tác cử động, tạo cảm giác nói chuyện như với người thật.

---

## 🌐 4. Kế hoạch phát triển mô hình Cộng đồng (Social & Co-learning Platform):

1. **Phòng Gọi Tương Tác 1-1 (Interactive Live Call Room)**:
   * **Gọi Video/Audio 1-1**: Kết nối 2 bạn học trực tiếp với chất lượng cao.
   * **Mini-Games Phá Băng**: *Picture Guessing* (Mô tả hình ảnh), *Word Speed Race* (Đua tốc độ từ vựng), *Roleplay Cards* (Thẻ bài đóng vai theo tình huống).
   * **AI Santa 3D làm Trợ lý phòng gọi (Co-pilot)**: Tự động xuất hiện gợi ý chủ đề nói khi 2 bên im lặng và chấm điểm phát âm sau cuộc gọi.

2. **Hệ Thống Ghép Đôi Thông Minh (Smart Matching)**:
   * Ghép ngẫu nhiên 1-chạm (Quick Match) với bạn học đang online.
   * Ghép đôi theo mục tiêu (Giao tiếp tự do, Luyện thi IELTS Speaking Part 1-3, Tiếng Anh công sở).

3. **Động Lực Học Theo Nhóm & Thi Đua (Social Gamification)**:
   * **Chuỗi Ngày Học Đôi (Pair Streak)**: Tích điểm và duy trì streak khi 2 bạn rủ nhau luyện nói mỗi ngày.
   * **Bảng Xếp Hạng Cặp Đôi**: Thi đua tích lũy XP leo top tuần.
   * **Quà Tặng Ảo**: Gửi quà tặng Giáng sinh / Ngôi sao vàng cổ vũ bạn học.

4. **Bảng Tin & Câu Lạc Bộ (Community & Study Clubs)**:
   * **Thách thức nói 1 phút (Daily 1-Min Challenge)**: Thu âm đăng bài nhận thả tim & góp ý từ cộng đồng.
   * **Câu lạc bộ học tập**: Nhóm luyện nói theo sở thích (Phim ảnh, Du lịch, IELTS 7.0+).

---

## 📈 5. Kế hoạch cải thiện & Nâng cấp AI (System Improvements):

1. **Nâng cấp AI Chấm phát âm chuyên sâu (Pronunciation Assessment)**:
   * Tích hợp công nghệ **Forced Alignment (Azure Speech API)** để phân tích sóng âm đến từng mili-giây.
   * Chấm 5 tiêu chí: *Âm tiết (Phoneme & âm cuối -s/-ed), Trọng âm từ (Word Stress), Ngữ điệu (Intonation), Độ trôi chảy (Fluency) và Nối âm (Linking)*.
2. **AI Co-pilot Trợ lý thông minh phòng gọi 1-1**:
   * Tự động phát hiện khoảng im lặng để đưa ra chủ đề gợi ý ("Ice-breaker").
   * Cân bằng thời lượng phát biểu giữa 2 người và tổng hợp báo cáo phát âm sau cuộc gọi.
3. **Tối ưu hóa độ trễ phản hồi (Ultra-low Latency)**:
   * Nâng cấp mô hình streaming âm thanh để AI phản hồi dưới **1 giây**, tạo cảm giác hội thoại tự nhiên nhất.
4. **Cá nhân hóa lộ trình học (Personalized Adaptive Learning)**:
   * Tự động phân tích điểm yếu từ vựng/ngữ pháp từ các cuộc gọi để gợi ý bài luyện cá nhân hóa tiếp theo.
5. **Đa dạng hóa nhân vật AI Tutor (Multi-Persona & Accents)**:
   * Mở rộng thêm nhiều nhân vật AI 3D mới với đa dạng chất giọng bản xứ (Anh-Mỹ, Anh-Anh, Anh-Úc) và phong cách dạy khác nhau.



