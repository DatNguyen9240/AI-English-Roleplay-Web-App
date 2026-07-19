# 02. User Experience & Flows

## First-time experience

```text
Mở app
→ chọn mục tiêu ngắn gọn
→ chọn hoặc nhận đề xuất một topic
→ tutor bắt đầu
→ người dùng nói một câu
→ nhận insight và lựa chọn retry / continue
```

Mục tiêu: người dùng nói câu đầu tiên trong dưới hai phút. Setting, chọn voice và tính năng nâng cao chỉ mở khi cần.

## Daily home

Nút chính luôn là **Continue learning**. Nó dẫn đến activity tốt nhất dựa trên review đến hạn, knowledge yếu, mục tiêu, lịch sử gần đây và thời gian sẵn có.

## Live speaking

1. Tutor nêu ngữ cảnh và câu hỏi.
2. Người học nói hoặc gõ.
3. App hiển thị transcript và tutor trả lời streaming.
4. Learning insight hiện độc lập với tutor reply: score ngắn, một feedback, nút **Try again**.
5. Người dùng retry hoặc tiếp tục cuộc hội thoại.

## Finish state

Khi kết thúc, người dùng chỉ cần thấy: điều đã làm tốt, một điểm cần ôn, từ/cấu trúc được lưu và bước học hợp lý tiếp theo. Không dùng popup dày đặc hoặc dashboard nặng làm gián đoạn.

## Presentation Engine boundary

Presentation Engine quyết định **cách hiển thị** state: animation, overlay, accessibility, responsive layout và transition. Nó không tính mastery, score hay recommendation.

## Accessibility & performance

- Luôn có text fallback cho audio và microphone.
- UI đáp ứng trước; audio/TTS bắt đầu sau khi text đầu tiên được paint.
- 3D tutor là progressive enhancement, không chặn bài học.
- Hiệu ứng/reward tôn trọng reduced motion và không cản thao tác chính.
