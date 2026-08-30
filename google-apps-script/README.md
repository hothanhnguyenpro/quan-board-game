# Backend vận hành — Google Apps Script

Thư mục này là một bộ hoàn chỉnh. Hãy tạo đủ năm file trong **cùng một Apps Script project**:

```text
Code.gs
AdminConfig.gs
LeadgameNotifications.gs
AdminDashboard.html
JsQr.html
```

- `Code.gs`: đăng ký ghép tụ, xác nhận trạng thái, nhịp bàn, QR check-in và dữ liệu dashboard.
- `AdminConfig.gs`: xác thực admin tách riêng; không chứa mật khẩu thật.
- `LeadgameNotifications.gs`: gửi yêu cầu gọi bàn sang Telegram; Bot Token chỉ nằm trong Script Properties.
- `AdminDashboard.html`: giao diện quản trị mobile-first, chạy ngay trên Apps Script.
- `JsQr.html`: bộ giải mã `jsQR@1.4.0` đóng gói cục bộ; không phụ thuộc CDN/Wi-Fi.

## 1. Cấu hình Google Sheet

Nên dùng Apps Script gắn trực tiếp với Google Sheet của quán. Khi đó giữ `spreadsheetId: ''` trong `APP_BACKEND_CONFIG`. Nếu dùng project Apps Script độc lập, điền ID của file Sheet nguồn vào trường này.

Các giá trị thường chỉnh ở đầu `Code.gs`:

```js
meetupSheetId: 1475285450,
meetupSheetName: 'Meetups',
registrationSheetName: 'Registrations',
meetupHistorySheetName: 'MeetupHistory',
tableSessionSheetName: 'TableSessions',
waitlistSheetName: 'Waitlist',
supportRequestSheetName: 'SupportRequests',
adminEmail: '',
roomOptions: ['Phòng chung', 'Phòng 1', 'Phòng 2', 'Phòng 3'],
```

`meetupSheetId` là số `gid=` của tab lịch ghép tụ. Sau khi dán đủ file, chạy thủ công `setupOperationalSheets()` một lần và cấp quyền. Hàm này giữ dữ liệu cũ, chỉ tạo Sheet/cột còn thiếu và bổ sung validation cần thiết.

Các tab vận hành:

```text
Meetups       lịch tụ, leader, sức chứa và trạng thái mở/full/đóng/hủy
Registrations người đăng ký, token xác nhận, QR và trạng thái check-in
MeetupHistory  lịch sử tụ đã kết thúc, tỷ lệ đến và thời gian host
TableSessions tín hiệu tự nguyện từ QR tại bàn
Waitlist       hàng chờ nhận bàn và trạng thái báo khách/xếp bàn
SupportRequests yêu cầu hỗ trợ theo mã bàn và trạng thái xử lý
```

## 2. Mật khẩu admin nằm ngoài frontend

Không đặt mật khẩu trong `src/config.js`, JSON, HTML hay `Code.gs`.

1. Đăng nhập đúng tài khoản chủ Google Sheet.
2. Trong Apps Script, chạy thủ công `configureAdminPassword()`.
3. Nhập mật khẩu tối thiểu 12 ký tự và xác nhận lại.

Script chỉ lưu salt và hash lặp trong **Script Properties**. Mật khẩu gốc không được ghi vào source. Đổi mật khẩu sẽ vô hiệu toàn bộ phiên admin cũ. Phiên đăng nhập nằm trong `CacheService` tối đa sáu giờ và token được lưu trong `localStorage` của đúng origin dashboard để dùng chung giữa các tab trên thiết bị admin.

Tab hệ thống `Meetups` có thêm `gameName` và `leaderName`; form **Tạo Tụ** tự đồng bộ hai trường này. Website cho khách hiển thị và tìm theo tên leader; dashboard ghép rõ tên game với leader tương ứng ngay cả khi tụ chưa có đăng ký đầu tiên.

Leader chỉ cần nhập lịch tại tab **Tạo Tụ**; `Meetups` là bảng vận hành mà website/backend đọc và được đồng bộ tự động. Script tự tìm sheet thư viện game có header `id` và `name`, tạo danh sách ẩn `_GameChoices`, rồi cung cấp dropdown tìm kiếm dạng `ID — Tên game`. Gõ ID hoặc tên đầy đủ/duy nhất cũng được tự chuẩn hóa thành lựa chọn đúng. Nếu ai đó sửa trực tiếp `Meetups`, trigger cũng đồng bộ ngược lại `Tạo Tụ` để hai tab không lệch nhau, nhưng đây chỉ là cơ chế cứu hộ chứ không phải luồng nhập liệu chính.

Tab **Tạo Tụ** chỉ yêu cầu chọn/nhập Game, tên leader, ngày, giờ, số người và phòng; ghi chú là tùy chọn. `Mã tụ`, `gameId`, `gameName`, `startTime`, `status`, `currentPlayers`, `updatedAt`, `updatedBy` đều được đồng bộ tự động. Ngày dùng calendar validation; giờ là dropdown từ 08:00 đến 23:30, cách nhau 30 phút. Chạy `setupOperationalSheets()` một lần sau khi cập nhật code để cài installable edit trigger; Google sẽ hỏi cấp quyền. Hàm này giữ các dòng đã nhập ở **Tạo Tụ**, cài trigger không trùng và chạy đồng bộ sửa dữ liệu hiện có. Có thể chạy riêng `syncAllMeetupEditorRows()` để ép đồng bộ lại toàn bộ, hoặc `installMeetupEditorTrigger()` nếu trigger đã bị xóa. Chạy lại menu **Làm mới form Tạo Tụ và danh sách game** khi vừa thêm game mới vào thư viện.

Nếu tab `Registrations` đã có dữ liệu từ backend cũ, chạy thủ công `backfillRegistrationCheckInCodes()` một lần. Hàm chỉ điền `registrationId`, `checkInCode`, `checkInStatus` còn thiếu; không ghi đè mã đã có và không xóa dòng cũ.

## 3. Deploy bản web app mới

1. Chọn **Deploy → New deployment → Web app**.
2. **Execute as:** `Me`.
3. **Who has access:** `Anyone`.
4. Deploy và sao chép URL kết thúc bằng `/exec`.
5. Dán URL này vào `APP_CONFIG.meetup.registration.submitUrl` của frontend.

Sau mỗi lần thay đổi một trong ba file Apps Script, vào **Manage deployments**, chỉnh deployment và chọn **New version**. Sửa code mà không tạo version mới sẽ khiến website vẫn chạy backend cũ.

Kiểm tra nhanh:

```text
GET <URL_EXEC>
```

Kết quả phải có `protocol: 2`. Nếu gặp `401`, deployment chưa public cho `Anyone` hoặc đang dùng URL `/dev`/deployment cũ.

## 4. Mở dashboard

Địa chỉ:

```text
<URL_EXEC>?view=admin
```

Dashboard cho phép:

- xem số chỗ đăng ký và số người đã đến;
- mở/đóng nhận đăng ký mà không sửa Sheet thủ công;
- bắt đầu tính giờ host; đồng hồ trên từng tụ cập nhật mỗi giây;
- kết thúc tụ, lưu lịch sử đến/đăng ký và thời lượng host rồi dọn dữ liệu hoạt động;
- mở camera gốc của điện thoại hoặc chọn ảnh QR có sẵn, rồi giải mã tại chỗ bằng `jsQR`;
- nhập mã check-in thủ công nếu ảnh quá mờ hoặc thiết bị không có camera;
- phân trang đăng ký từ backend, mỗi lần chỉ tải và dựng 12 dòng;
- xem “nhịp bàn” gần nhất do khách chủ động báo.
- báo khách trong hàng chờ đến quầy, xác nhận đã xếp bàn hoặc kết thúc lượt chờ;
- nhận, đánh dấu đang xử lý và hoàn tất yêu cầu hỗ trợ tại bàn;
- thấy rõ mỗi yêu cầu đã gửi Telegram thành công, chưa cấu hình hay gửi thất bại.

Khi bấm **Bắt đầu tính giờ**, backend lưu `hostStartedAt` vào `Meetups` và tự đóng nhận đăng ký; khách đến muộn vẫn có thể được check-in. Khi bấm **Kết thúc tụ**, dashboard yêu cầu xác nhận, sau đó backend ghi vào `MeetupHistory` trước khi xóa dữ liệu liên quan khỏi `Meetups`, `Registrations` và `Tạo Tụ`. Bản lịch sử có game, leader, ngày host, giờ bắt đầu/kết thúc thực tế, tổng phút/giờ host, số người đến trên số người đăng ký và số nhóm đến/đăng ký. Nếu mạng chập chờn làm gửi lại yêu cầu, `meetupId` trong lịch sử được dùng để tránh ghi trùng.

Nhịp bàn không phải lời hứa khách sẽ rời quán. Dashboard chỉ hiển thị tín hiệu gần nhất như “đang chơi”, “ván cuối” hoặc “sắp thu dọn”, kèm game và độ dài một ván nếu khách chọn game qua công cụ gợi ý.

## 5. Luồng đăng ký đã xác nhận thật

Frontend gửi POST `no-cors`, sau đó hỏi trạng thái bằng JSONP với cùng `requestToken`:

```text
React POST → Apps Script khóa và ghi Sheet → flush/đọc lại token
          → JSONP status=success → React mới báo thành công
```

Không dùng hidden iframe hoặc phụ thuộc `postMessage`, nên không còn bị `X-Frame-Options: sameorigin`. Backend có kiểm tra idempotency theo token, chặn trùng `meetupId + phone`, khóa chống vượt sức chứa và chỉ trả thành công sau khi xác minh dòng đã được ghi.

## 6. QR check-in

Sau khi đăng ký thành công, backend tạo `registrationId` và mã check-in ngẫu nhiên 6 ký tự, ví dụ `K7M4Q2`. Mã dùng bảng 32 ký tự không có `0/O` và `1/I`, được kiểm tra trùng trước khi lưu. Backend đồng thời tự lấy URL deployment đang chạy bằng `ScriptApp.getService().getUrl()` và trả deep link `<URL_EXEC>?view=admin&checkin=K7M4Q2`; vì vậy QR không phụ thuộc một URL frontend cũ sau khi Apps Script được deploy lại. Không dùng query parameter `c` hoặc `sid`: Google Apps Script dành riêng hai tên này và trả HTTP 400 trước khi gọi `doGet`. Vé phía khách không có nút check-in và QR không chứa tên hoặc số điện thoại. Camera điện thoại mở dashboard với mã điền sẵn, nhưng backend chỉ check-in sau khi xác thực phiên admin; khách tự quét trên máy chưa đăng nhập không thể tự xác nhận. Quét lại cùng mã không cộng ghế lần hai.

Mã dài HMAC đã phát trước đây vẫn hợp lệ để bảo toàn QR cũ. Muốn đổi cột `checkInCode` của các đăng ký hiện có sang mã 6 ký tự, chạy menu **Rút gọn mã check-in hiện có** hoặc hàm `migrateCheckInCodesToShort()` một lần. Việc chuyển đổi không làm QR dài cũ mất hiệu lực.

Nút **Mở camera quét QR** dùng `input type="file" accept="image/*" capture="environment"` để gọi giao diện camera gốc của điện thoại. Cách này không phụ thuộc `getUserMedia()` trong iframe Apps Script, nên tránh tình trạng dashboard báo không hỗ trợ hoặc không hiện hộp xin quyền camera. Nút **Chọn ảnh có sẵn** là phương án dự phòng. Ảnh chỉ được giải mã tại chỗ và không tải lên Sheet.

Dashboard chỉ hoạt động ở URL Web App kết thúc bằng `/exec`. Không mở trực tiếp `AdminDashboard.html` bằng `file:///...`: file local không có `google.script.run`, không thể xác thực server và có thể không được trình duyệt cấp camera.

Phiên admin được giữ tối đa 6 giờ và dùng chung giữa các tab cùng dashboard. Snapshot gần nhất được hiển thị ngay khi reload rồi đồng bộ ngầm; backend cache kết quả đọc Sheet trong 15 giây để giảm độ trễ nhưng xóa cache ngay sau đăng ký, cập nhật nhịp bàn, đổi trạng thái tụ hoặc check-in. Snapshot chính chỉ mang 12 đăng ký mới nhất; các trang cũ được lấy riêng bằng `adminGetRegistrationPage()` để giảm payload và số node DOM.

Dashboard nhúng `jsQR@1.4.0` từ file `JsQr.html` trong cùng Apps Script project, nên không phụ thuộc CDN hoặc Wi-Fi quán. Dashboard hiện rõ trạng thái bộ đọc đã sẵn sàng; nếu thiết bị hỗ trợ `BarcodeDetector` thì dùng trước, sau đó `jsQR` thử toàn ảnh ở nhiều độ phân giải và nhiều vùng chồng lấn để tìm QR không nằm chính giữa. File giấy phép đi kèm tại `JSQR-LICENSE.txt` trong repository. Có thể chạy `npm run test:qr` trong repository để xác nhận chính file decoder đóng gói đọc được QR do ứng dụng sinh ra và QR nằm trong ảnh camera lớn.

Không sửa/xóa `CHECKIN_SIGNING_SECRET` trong Script Properties sau khi đã phát vé, vì các QR cũ sẽ không còn hợp lệ.

## 7. QR nhịp bàn

Mỗi bàn có thể in một QR trỏ đến website với tham số `table`, ví dụ:

```text
https://ten-mien-cua-quan.example/?table=B03
```

Khách vào qua QR mới thấy khối **Nhịp của bàn mình**. Việc cập nhật hoàn toàn tự nguyện và không yêu cầu khách khai giờ rời quán. Nếu không có `?table=...`, khối này được ẩn khỏi khách truy cập thông thường.

## 8. Hàng chờ nhận bàn và hỗ trợ tại bàn

`setupOperationalSheets()` tự tạo hai tab độc lập, không thêm cột vào `Meetups` hoặc `Registrations`:

```text
Waitlist        joinedAt, waitlistId, queueCode, claimToken, name, phone,
                groupSize, status, notifiedAt, seatedAt, cancelledAt, ...
SupportRequests createdAt, requestId, tableCode, category, gameId, gameName,
                note, status, acknowledgedAt, resolvedAt, ...
```

Khách vào hàng chờ qua luồng POST + JSONP status giống đăng ký tụ. Trình duyệt chỉ giữ `waitlistId`, mã nhận lượt và thông tin hiển thị; số điện thoại không được lưu lại trong localStorage. Dashboard chỉ tải các lượt `waiting/notified` và tối đa 30 yêu cầu hỗ trợ chưa hoàn tất, nên không phải dựng toàn bộ lịch sử sau nhiều tháng vận hành.

Khoảng chờ được cố ý hiển thị rộng và ghi rõ không phải giờ hẹn. Backend ưu tiên tín hiệu `available`, `leaving_soon`, `last_round` mới nhất từ `TableSessions`, nhưng không tự động đóng hoặc thúc bất kỳ bàn nào. Yêu cầu hỗ trợ giống nhau từ cùng một bàn trong vòng ba phút được trả về bản ghi đang mở thay vì tạo nhiều dòng.

## 9. Báo tức thời cho leadgame bằng Telegram

Không dùng Dashboard Apps Script làm kênh báo chính. HTML Service chạy trong iframe bảo mật; khi điện thoại khóa màn hình, chuyển app hoặc hệ điều hành đóng băng tab, timer, âm thanh và rung trong trang có thể dừng. Dashboard vẫn có toast và âm dự phòng khi đang mở, nhưng Apps Script gửi Telegram ngay sau khi dòng `SupportRequests` được ghi thành công.

Thiết lập một lần:

1. Trong Telegram, nhắn `@BotFather`, tạo bot bằng `/newbot` và giữ Bot Token.
2. Nên tạo một nhóm trực leadgame, thêm bot vào nhóm rồi gửi `/start`. Nếu chỉ có một người trực, người đó mở bot và nhấn **Start**.
3. Reload Google Sheet để thấy menu **Noburi Board Game Cafe**.
4. Chọn **Kết nối Telegram cho leadgame**, dán Bot Token và chọn người/nhóm nhận.
5. Script tự gửi một tin kiểm tra. Trên điện thoại leadgame, bật Notification, âm thanh và rung cho Telegram.
6. Có thể dùng menu **Gửi thử cảnh báo Telegram** bất cứ lúc nào để kiểm tra ca trực.

Bot Token, chat ID và trạng thái bật/tắt được lưu trong Apps Script **Script Properties**, không nằm trong frontend, source hoặc Sheet. Mỗi yêu cầu ghi thêm `notificationChannel`, `notificationStatus`, `notificationAt` và `notificationError` để biết cảnh báo có thực sự được chuyển đi hay không. Telegram lỗi không làm mất yêu cầu: dòng vẫn nằm trong `SupportRequests`, còn khách được nhắc gọi nhân viên trực tiếp nếu cần gấp.
