# Board Game Cafe — Ultimate Version

Bản React + Vite đã được refactor theo hướng mobile-first, ổn định overlay/modal và tách rõ dữ liệu Game / Ghép tụ / Đăng ký.

## Chạy dự án

```bash
npm install
npm run dev
npm run lint
npm run test:logic
npm run build
```

## Những phần đã được sửa quan trọng

- Filter FAB và FilterSheet render bằng portal ở `document.body`, có z-index riêng và không bị lớp layout của tủ chặn click.
- Modal dùng chung `useModalBehavior`: Escape chỉ đóng modal nằm trên cùng, body scroll không bị kẹt khi nhiều modal chuyển tiếp nhau.
- Logic player filter nằm duy nhất trong `src/utils/gameUtils.js`.
  - `1-4` KHÔNG thuộc `Nhóm đông`.
  - `2-5`, `3-6`, `5-10`, `Không giới hạn` thuộc `Nhóm đông`.
- Search prefix, không dấu, hỗ trợ `name` + `alias`.
- Google Sheet 1 có normalize dữ liệu và fallback có cảnh báo rõ ràng.
- Meetup Sheet 2 được tải độc lập, lỗi Sheet 2 không làm hỏng thư viện game.
- Meetup chỉ fetch khi người dùng thực sự mở "Ghép tụ" để giảm request không cần thiết.
- Đăng ký không còn báo thành công giả. Frontend chờ Apps Script xác nhận qua `postMessage`, có timeout để không treo vô hạn.
- Backend Apps Script có lock chống race condition, chặn số điện thoại đăng ký trùng, kiểm tra số chỗ, tự đổi `full`, timestamp và email admin.
- SocialLinks đọc động từ `APP_CONFIG.social`; thêm `zalo` hoặc nền tảng mới trong config không cần sửa component.
- Announcement có CTA thật, CTA `#meetup` mở trực tiếp giao diện Ghép tụ.

## 1. Google Sheet 1 — Game

URL nằm tại `GOOGLE_SHEETS_CSV_URL` trong `src/config.js`.

Khuyến nghị các cột:

```text
id
name
alias
image
players
time
difficulty
category
description
winCondition
turnSteps
scoring
tricks
edgeColor
boxHeight
boxThickness
featured
available
```

`turnSteps`, `scoring`, `tricks` nhận xuống dòng, `|` hoặc `;`.

## 2. Google Sheet 2 — Ghép tụ

URL nằm tại `GOOGLE_SHEETS_MEETUP_CSV_URL` / `APP_CONFIG.meetup.sheetUrl`.

Các cột chuẩn:

```text
id | gameId | startTime | requiredPlayers | currentPlayers | room | status | note
```

- `gameId`: ID từ Sheet 1, không nhập lại tên game.
- `requiredPlayers`: tổng sức chứa của tụ.
- `currentPlayers`: Apps Script tự cập nhật.
- `status`: `active`, `full`, `closed`, `cancelled`.

### Quan trọng nếu Sheet 2 bị CORS / 401

Đây không phải lỗi React. Trong Google Sheets, dùng **File → Share → Publish to web → Entire document**, sau đó kiểm tra URL CSV trong cửa sổ ẩn danh. Nếu URL CSV chuyển sang `accounts.google.com/ServiceLogin`, tab đó chưa được public đúng cách.

## 3. Thiết lập dropdown ngày/phòng/status trong Sheet 2

Trong thư mục `google-apps-script/` đã có `Code.gs`.

1. Mở Google Sheet → Extensions → Apps Script.
2. Dán toàn bộ `google-apps-script/Code.gs`.
3. Sửa phần `CONFIG` đầu file nếu cần:
   - `meetupSheetId`: chính là `gid` của Sheet 2. Bản này đã đặt `1475285450` theo URL hiện tại.
   - `roomOptions`: danh sách phòng muốn chọn bằng dropdown.
   - `adminEmail`: email nhận thông báo đăng ký.
4. Chạy `setupMeetupSheet()` một lần và cấp quyền.
5. Sau đó Sheet 2 sẽ có:
   - date/time validation cho `startTime`;
   - dropdown `room`;
   - dropdown `status`;
   - validation số người;
   - tự tạo cột thiếu.

## 4. Backend nhận đăng ký

Sau khi dán `Code.gs`:

1. Deploy → New deployment → Web app.
2. Execute as: **Me**.
3. Who has access: **Anyone**.
4. Copy URL kết thúc bằng `/exec`.
5. Dán vào:

```js
APP_CONFIG.meetup.registration.submitUrl
```

Không dùng URL `/dev` và không dùng deployment yêu cầu đăng nhập.

Backend sẽ:

- ghi vào tab `Registrations`;
- ghi timestamp;
- chống trùng `meetupId + phone`;
- tính `1 + companions` chỗ cho mỗi đơn;
- từ chối nếu vượt sức chứa;
- tự đổi meetup thành `full` khi đủ;
- cập nhật `currentPlayers`;
- gửi email cho admin nếu cấu hình;
- trả kết quả thật về frontend.

## 5. Config social / announcement

Mọi phần chỉnh thường xuyên nằm trong `src/config.js`.

Social chỉ hiện khi `enabled: true` **và** URL hợp lệ. Vì vậy chỉ cần dán link thật vào:

```js
APP_CONFIG.social.facebook.url
APP_CONFIG.social.tiktok.url
APP_CONFIG.social.instagram.url
APP_CONFIG.social.zalo.url
```

Announcement mặc định bật. `buttonUrl: '#meetup'` sẽ mở Ghép tụ; URL ngoài sẽ mở tab mới an toàn.

## Cấu trúc chính

```text
src/
  App.jsx
  config.js
  hooks/
    useModalBehavior.js
  components/
    AnnouncementModal.jsx
    CheatSheet.jsx
    FilterSheet.jsx
    GameCard.jsx
    Library.jsx
    MeetupCard.jsx
    MeetupRegistrationForm.jsx
    MeetupSheet.jsx
    SocialLinks.jsx
  utils/
    dataFetcher.js
    dateUtils.js
    gameUtils.js
    meetupFetcher.js
  index.css

google-apps-script/
  Code.gs
  README.md
```
