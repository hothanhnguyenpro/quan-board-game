# Board Game Cafe — Ultimate Version

Bản React + Vite đã được refactor theo hướng mobile-first, ổn định overlay/modal và tách rõ dữ liệu Game / Ghép tụ / Đăng ký.

## Chạy dự án

```bash
npm install
npm run dev
npm run lint
npm run test:logic
npm run test:qr
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
- Đăng ký không còn báo thành công giả. Frontend POST dữ liệu rồi polling JSONP theo cùng token; chỉ báo thành công sau khi backend ghi và đọc xác minh token trong Sheet.
- Backend Apps Script có lock chống race condition, idempotency, chặn số điện thoại đăng ký trùng, kiểm tra số chỗ, tự đổi `full`, QR check-in và dashboard admin.
- `Tạo Tụ` là nơi nhập lịch duy nhất; installable edit trigger tự đồng bộ sang `Meetups`, hỗ trợ đồng bộ ngược khi cần cứu dữ liệu và có lệnh sửa toàn bộ dòng hiện có.
- “Chọn game cho bàn tôi” lọc đúng số người, hiểu thời lượng phút/giờ và xếp hạng tối đa ba game theo độ vừa thời gian, mức dễ bắt đầu và chất lượng Cheat Sheet.
- Tủ game giữ thiết kế signature dạng hộp dựng trên bốn tầng kệ gỗ; ảnh dùng `object-fit: cover` để không kéo méo tỷ lệ, lazy-load theo vùng nhìn và tự chuyển sang gáy hộp dự phòng có tên game khi URL chết/hotlink lỗi.
- QR tại bàn chỉ hỏi độ dài của **một ván**, không hỏi giờ khách rời quán; khách có thể chủ động báo “ván cuối” hoặc “sắp thu dọn”.
- PWA cache app shell, game snapshot và ảnh đã xem để Cheat Sheet tiếp tục dùng khi Wi-Fi yếu; giao dịch đăng ký/admin/check-in không bị cache.
- Hàng chờ nhận bàn chỉ yêu cầu tên, số điện thoại và số người; khách thấy vị trí cùng một khoảng chờ rộng, còn dashboard có thể báo đến quầy, xác nhận đã xếp bàn hoặc kết thúc lượt chờ.
- QR của từng bàn mở nút **Cần hỗ trợ** để gọi hướng dẫn luật, báo thiếu quân, đổi game, gọi thêm nước hoặc gửi ghi chú; yêu cầu trùng trong ba phút được gộp để tránh bấm liên tục.
- Mỗi Cheat Sheet có bộ công cụ trong ván lưu hoàn toàn trên thiết bị: đồng hồ, số vòng, bảng điểm, chọn người đi trước, xúc xắc và tung đồng xu. Công cụ không ghi thêm dữ liệu vào Google Sheet.
- Announcement hiện một lần khi tải trang mới; đóng rồi đi vào Cheat Sheet/quay lại tủ sẽ không xuất hiện lại, nhưng reload hoặc mở trang ở lượt mới sẽ hiện lại.
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
id | gameId | gameName | leaderName | startTime | requiredPlayers | currentPlayers | room | status | note
```

- `gameId`: ID từ Sheet 1, không nhập lại tên game.
- `gameName`: tên hiển thị trong dashboard trước khi có đăng ký đầu tiên.
- `leaderName`: tên hoặc biệt danh leader để khách hỏi nhân viên và tìm tụ theo tên.
- `requiredPlayers`: tổng sức chứa của tụ.
- `currentPlayers`: Apps Script tự cập nhật.
- `status`: `active`, `full`, `closed`, `cancelled`.

Leader không cần nhập trực tiếp bảng 12 cột này. Sau khi chạy
`setupOperationalSheets()`, dùng tab **Tạo Tụ** với các cột ngắn gọn:

```text
Mã tụ | Game (ID — Tên) | Tên leader | Ngày chơi | Giờ bắt đầu | Số người | Phòng | Ghi chú | Trạng thái | Đã đăng ký
```

- `Mã tụ` được tự động điền và ẩn; `Trạng thái`, `Đã đăng ký` chỉ để leader theo dõi.
- Ô Game là dropdown tìm kiếm: gõ ID hoặc tên game rồi chọn dòng `ID — Tên`.
- Ngày chơi dùng lịch; giờ bắt đầu chọn theo từng mốc 30 phút.
- Chỉ cần nhập Game, leader, ngày, giờ, số người và phòng; ghi chú là tùy chọn.
- Tab `Meetups` vẫn là bảng hệ thống dùng cho website/backend và được đồng bộ tự động.

### Quan trọng nếu Sheet 2 bị CORS / 401

Đây không phải lỗi React. Trong Google Sheets, dùng **File → Share → Publish to web → Entire document**, sau đó kiểm tra URL CSV trong cửa sổ ẩn danh. Nếu URL CSV chuyển sang `accounts.google.com/ServiceLogin`, tab đó chưa được public đúng cách.

## 3. Thiết lập dropdown ngày/phòng/status trong Sheet 2

Trong thư mục `google-apps-script/` đã có đủ backend, cấu hình xác thực admin và giao diện dashboard.

1. Mở Google Sheet → Extensions → Apps Script.
2. Tạo đủ `Code.gs`, `AdminConfig.gs`, `AdminDashboard.html` từ thư mục `google-apps-script/`.
3. Sửa phần `APP_BACKEND_CONFIG` đầu `Code.gs` nếu cần:
   - `meetupSheetId`: chính là `gid` của Sheet 2. Bản này đã đặt `1475285450` theo URL hiện tại.
   - `roomOptions`: danh sách phòng muốn chọn bằng dropdown.
   - `adminEmail`: email nhận thông báo đăng ký.
4. Chạy `setupOperationalSheets()` một lần và cấp quyền.
5. Sau đó Sheet 2 sẽ có:
   - date/time validation cho `startTime`;
   - dropdown `room`;
   - dropdown `status`;
   - validation số người;
   - tự tạo cột thiếu.

## 4. Backend nhận đăng ký, admin và check-in

Sau khi dán đủ bốn file Apps Script (`Code.gs`, `AdminConfig.gs`, `AdminDashboard.html`, `JsQr.html`):

1. Chạy `configureAdminPassword()` bằng tài khoản chủ Sheet. Mật khẩu chỉ được lưu dạng hash trong Script Properties, không đặt trong frontend/config JSON.
2. Deploy → New deployment → Web app.
3. Execute as: **Me**.
4. Who has access: **Anyone**.
5. Copy URL kết thúc bằng `/exec` và dán vào:

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
- trả kết quả thật về frontend;
- phát QR check-in không chứa thông tin cá nhân;
- phục vụ dashboard tại `<URL_EXEC>?view=admin`.
- cho admin bắt đầu đồng hồ host và tự đóng đăng ký;
- lưu tổng kết vào `MeetupHistory` rồi dọn tụ đã kết thúc khỏi các sheet hoạt động.

Sau mỗi lần sửa Apps Script, phải tạo **New version** cho deployment. Xem hướng dẫn đầy đủ tại `google-apps-script/README.md`.

## 5. Config social / announcement

Mọi phần chỉnh thường xuyên nằm trong `src/config.js`.

Social chỉ hiện khi `enabled: true` **và** URL hợp lệ. Vì vậy chỉ cần dán link thật vào:

```js
APP_CONFIG.social.facebook.url
APP_CONFIG.social.tiktok.url
APP_CONFIG.social.instagram.url
APP_CONFIG.social.zalo.url
```

Announcement mặc định bật. `buttonUrl: '#meetup'` sẽ mở Ghép tụ; URL ngoài sẽ mở tab mới an toàn. Với `showOncePerSession: false`, thông báo hiện một lần trên mỗi lượt tải trang và không lặp lại khi điều hướng nội bộ. Nếu đổi thành `true`, cùng một `announcement.id` chỉ hiện lại ở phiên trình duyệt mới; đổi `id` khi bắt đầu chiến dịch khác.

## 6. Chọn game theo bàn

Nút **Gợi ý 3 game** nhận:

- tổng số người đang chơi;
- thời lượng mong muốn cho một ván: 15, 30, 45, 60, 90 hoặc 120+ phút.

Thuật toán loại game không hỗ trợ đúng số người, ưu tiên game vừa mốc thời lượng và trả cảnh báo rõ nếu chỉ gần phù hợp. Câu chữ luôn nhắc đây là nhịp một ván, không phải giờ rời quán và quán vẫn chơi không giới hạn thời gian.

Nếu khách mở site từ URL có mã bàn, ví dụ:

```text
https://ten-mien-cua-quan.example/?table=B03
```

thì app mới hiện khối cập nhật nhịp bàn. Khách truy cập thông thường không thấy khối này.

## 7. PWA và Cheat Sheet ngoại tuyến

Production build tự đăng ký `public/sw.js`. Chính sách cache:

- cache app shell và các asset build cùng origin;
- lưu snapshot tủ game vào localStorage sau lần tải online thành công;
- cache ảnh game đã từng xem;
- tuyệt đối bỏ qua Google Sheet live, Apps Script, admin, status, check-in và mọi request không phải GET.

Vì vậy khách cần mở ứng dụng online thành công ít nhất một lần trước khi dùng ngoại tuyến. Khi mất mạng, app hiển thị nhãn **Đang ngoại tuyến** và dùng snapshot gần nhất để mở Cheat Sheet.

## 8. QR check-in và dashboard

Sau đăng ký thành công, khách nhận QR cùng mã chữ dự phòng 6 ký tự, ví dụ `K7M4Q2`. Bảng chữ cái bỏ `0/O` và `1/I` để leader dễ đọc, nhập tay. Vé khách không có nút check-in. QR chứa deep link bảo vệ tới dashboard dạng `<URL_EXEC>?view=admin&checkin=K7M4Q2`: camera điện thoại mở đúng dashboard và điền sẵn mã, nhưng chỉ phiên nhân viên đã đăng nhập mới được gọi hàm check-in nên khách không thể tự xác nhận. Không dùng tham số `c` hoặc `sid` vì đây là tên dành riêng khiến Google Apps Script trả HTTP 400 trước khi `doGet` chạy. Nhân viên cũng có thể mở trực tiếp:

```text
<URL_EXEC>?view=admin
```

để mở camera gốc của điện thoại hoặc chọn ảnh QR có sẵn, nhập mã chữ, xem số ghế đăng ký/đã đến và mở hoặc đóng tụ. Ảnh được giải mã ngay trên thiết bị và không tải lên Sheet. Danh sách đăng ký tải 12 dòng mỗi trang để dashboard không dựng hàng trăm thẻ cùng lúc. Chỉ `adminCheckInRegistration()` với phiên admin hợp lệ mới đổi trạng thái check-in; quét lại cùng vé không cộng số người lần hai.

Với dữ liệu đăng ký tạo từ backend cũ, chạy `backfillRegistrationCheckInCodes()` một lần trong Apps Script để bổ sung mã còn thiếu mà không ghi đè dữ liệu hiện có.

## 9. Hàng chờ, gọi hỗ trợ và công cụ trong ván

Khi quán hết bàn, khách mở **Chờ bàn**, nhập tên, số điện thoại và quy mô nhóm. Backend tạo mã ngắn dạng `W7K4M`, lưu vào tab `Waitlist` và trả vị trí hiện tại. Khoảng chờ chỉ là ước tính rộng; nó được điều chỉnh theo các tín hiệu tự nguyện mới nhất trong `TableSessions`, không biến thành giờ hẹn cố định và không yêu cầu nhân viên đi hỏi khách đang ngồi bao giờ về.

Dashboard có hai khối vận hành mới:

- **Hàng chờ nhận bàn:** chuyển `waiting → notified → seated`, hoặc kết thúc bằng `cancelled`.
- **Khách cần hỗ trợ:** chuyển `pending → acknowledged → resolved`.

Nút **Cần hỗ trợ** chỉ xuất hiện khi URL có mã bàn, ví dụ `?table=B03`. Vì vậy nên dùng chính URL QR tại bàn đang dùng cho Nhịp bàn; khách mở website bình thường sẽ không thấy nút này.

Trong mỗi Cheat Sheet, **Công cụ trong ván** chạy độc lập bằng localStorage. Điểm, vòng và đồng hồ của mỗi game được lưu riêng trên đúng thiết bị, vẫn dùng được với bản PWA đã cache và không làm file Sheet nặng thêm.

## Cấu trúc chính

```text
src/
  App.jsx
  config.js
  hooks/
    useModalBehavior.js
    useTableContext.js
  components/
    AnnouncementModal.jsx
    CheatSheet.jsx
    CheckInPass.jsx
    FilterSheet.jsx
    GameCard.jsx
    GameCompanionSheet.jsx
    GameRecommenderSheet.jsx
    Library.jsx
    MeetupCard.jsx
    MeetupRegistrationForm.jsx
    MeetupSheet.jsx
    OfflineStatus.jsx
    RecommendationCard.jsx
    SocialLinks.jsx
    TableSupport.jsx
    TablePulse.jsx
    WaitlistSheet.jsx
  utils/
    appsScriptClient.js
    dataFetcher.js
    dateUtils.js
    gameRecommender.js
    gameUtils.js
    meetupFetcher.js
    registerServiceWorker.js
  index.css

google-apps-script/
  AdminConfig.gs
  AdminDashboard.html
  Code.gs
  README.md

public/
  manifest.webmanifest
  pwa-icon.svg
  sw.js
```
