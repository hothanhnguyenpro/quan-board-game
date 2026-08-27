# Ultimate Diagnostic Summary

## Critical bugs đã xử lý

1. **Filter bị click không ăn / overlay chặn**
   - Filter FAB + FilterSheet chuyển sang portal ở `document.body`.
   - Z-index tách biệt và backdrop chỉ tồn tại khi sheet mở.
   - Modal body lock có reference counter để không để lại trạng thái scroll bị khóa.

2. **Player filter sai `Nhóm đông`**
   - Tập trung parsing/rule tại `gameUtils.js`.
   - Quy tắc duy nhất: `maxPlayers >= 5`.

3. **Meetup / đăng ký gây cảm giác treo**
   - Tách component lớn thành Sheet/Card/Form.
   - Có timeout cho backend acknowledgement.
   - Không báo success trước khi backend xác nhận.
   - Trong lúc đang submit, modal không thể bị đóng giữa request; timeout sẽ mở khóa UI.

4. **Google Apps Script CORS**
   - Không dùng `fetch()` POST từ browser.
   - Submit bằng native form vào hidden iframe, Apps Script phản hồi bằng `postMessage`.

5. **Race condition và vượt số người**
   - Apps Script dùng `LockService`.
   - Mỗi đơn tính `1 + companions`.
   - Backend kiểm tra capacity ngay tại thời điểm ghi.

6. **Đăng ký trùng**
   - Chặn theo `meetupId + normalized phone`.

7. **CSV Sheet 2 stale sau khi đăng ký**
   - Không refetch ngay sau success để tránh dữ liệu CSV chưa cập nhật ghi đè trạng thái `full` vừa được backend xác nhận.
   - Lần mở Meetup tiếp theo mới đồng bộ lại.

8. **Social icon lỗi import Facebook từ lucide-react**
   - Dùng SVG riêng cho Facebook/TikTok/Instagram, Zalo wordmark và generic icon cho platform khác.

9. **Code khó bảo trì**
   - Tách `dateUtils`, `gameUtils`, `meetupFetcher`, `useModalBehavior`.
   - Meetup UI được chia thành ba component nhỏ.

## Ý tưởng nâng cấp tiếp theo

- “Chọn game cho bàn tôi”: nhập số người + thời gian còn lại → đề xuất 3 game tốt nhất.
- QR trên từng hộp vật lý → mở thẳng Cheat Sheet theo `gameId`.
- Favorite/recent games lưu localStorage.
- PWA/offline cache cho Cheat Sheet khi Wi-Fi quán yếu.
- Admin dashboard nhỏ để mở/đóng tụ và xem số chỗ mà không cần sửa Sheet thủ công.
- Waitlist khi tụ đầy.
- Check-in QR tại quán để biết người đăng ký đã đến.
