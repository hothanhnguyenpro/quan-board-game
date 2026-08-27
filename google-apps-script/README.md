# Backend Ghép tụ — Google Apps Script

Dán `Code.gs` vào Apps Script gắn với Google Sheet của quán.

## Thiết lập Sheet 2 dễ nhập

Trong `CONFIG` đầu `Code.gs`:

```js
meetupSheetId: 1475285450,
roomOptions: ['Phòng 1', 'Phòng 2', 'Phòng 3'],
adminEmail: '',
```

`meetupSheetId` chính là số `gid=` trong URL tab Sheet 2. Sau đó chạy `setupMeetupSheet()` một lần.

Hàm này tự tạo/chuẩn hóa các cột:

```text
id | gameId | startTime | requiredPlayers | currentPlayers | room | status | note
```

và thêm date/time picker, dropdown phòng, dropdown status, validation số người.

## Deploy nhận đăng ký

1. Deploy → New deployment → Web app.
2. Execute as: `Me`.
3. Who has access: `Anyone`.
4. Deploy.
5. Copy URL `/exec` vào `APP_CONFIG.meetup.registration.submitUrl`.

Nếu URL trả `401 Unauthorized`, deployment chưa public cho `Anyone` hoặc bạn đang dùng URL deployment cũ. Tạo deployment mới và copy lại `/exec`.

## Tính năng backend

- Ghi đăng ký vào `Registrations`.
- Timestamp server.
- Chặn trùng `meetupId + phone`.
- `companions` là số người đi cùng, nên số chỗ đơn đăng ký = `1 + companions`.
- Khóa `LockService` để hai người bấm cùng lúc không vượt sức chứa.
- Từ chối đăng ký nếu không đủ chỗ.
- Tự cập nhật `currentPlayers`.
- Tự đổi `status = full` khi đủ người.
- Có thể gửi email cho admin qua `CONFIG.adminEmail`.
- Frontend chỉ báo thành công sau khi script trả acknowledgement thật qua `postMessage`.
