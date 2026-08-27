import { useEffect, useState } from 'react';
import { CheckCircle2, QrCode } from 'lucide-react';
import QRCode from 'qrcode';

const clean = (value) => String(value ?? '').trim();

const CheckInPass = ({ checkInCode, gameName }) => {
  const code = clean(checkInCode);
  const [imageUrl, setImageUrl] = useState('');

  useEffect(() => {
    let active = true;

    if (!code) return undefined;

    QRCode.toDataURL(`noburi-checkin:${code}`, {
      width: 260,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#17120d',
        light: '#fffaf1',
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
  }, [code]);

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
      <p>Nhân viên quét mã khi bạn đến. QR không chứa tên hay số điện thoại.</p>
    </section>
  );
};

export default CheckInPass;
