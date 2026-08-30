import { useEffect, useState } from 'react';
import { CheckCircle2, QrCode } from 'lucide-react';
import QRCode from 'qrcode';

import { createCheckInQrPayload } from '../utils/checkInQr.js';

const clean = (value) => String(value ?? '').trim();

const CheckInPass = ({ checkInCode, gameName, adminBaseUrl }) => {
  const code = clean(checkInCode);
  const qrPayload = createCheckInQrPayload(code, adminBaseUrl);
  const [imageUrl, setImageUrl] = useState('');

  useEffect(() => {
    let active = true;

    if (!code) return undefined;

    QRCode.toDataURL(qrPayload, {
      width: 640,
      margin: 5,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    })
      .then((url) => {
        if (active) setImageUrl(url);
      })
      .catch(() => {
        if (active) setImageUrl('');
      });

    return () => {
      active = false;
    };
  }, [code, qrPayload]);

  if (!code) return null;

  return (
    <section className="checkin-pass" aria-labelledby="checkin-pass-title">
      <div className="checkin-pass-heading">
        <CheckCircle2 size={20} aria-hidden="true" />
        <div>
          <span>VÉ GHÉP TỤ</span>
          <h4 id="checkin-pass-title">Giữ mã này để check-in tại quán</h4>
        </div>
      </div>

      {imageUrl ? (
        <img
          src={imageUrl}
          alt={`Mã QR check-in${gameName ? ` cho ${gameName}` : ''}`}
          className="checkin-qr"
        />
      ) : (
        <div className="checkin-qr-fallback" aria-hidden="true">
          <QrCode size={48} />
        </div>
      )}

      <code className="checkin-code">{code}</code>
      <p>
        Đưa vé này cho nhân viên khi đến quán. Camera điện thoại sẽ mở đúng
        dashboard và điền sẵn mã; chỉ nhân viên đã đăng nhập mới có thể xác
        nhận nên khách không thể tự check-in.
      </p>
    </section>
  );
};

export default CheckInPass;
