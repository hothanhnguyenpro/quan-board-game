import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

const pillStyle = {
  position: 'fixed',
  left: 'max(16px, env(safe-area-inset-left, 0px))',
  bottom: 'max(16px, env(safe-area-inset-bottom, 0px))',
  zIndex: 8500,
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  maxWidth: 'calc(100vw - 32px)',
  minHeight: '40px',
  padding: '9px 13px',
  border: '1px solid rgba(245, 158, 11, 0.35)',
  borderRadius: '999px',
  background: 'rgba(20, 21, 25, 0.94)',
  color: '#f4f4f5',
  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.38)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  fontSize: '13px',
  fontWeight: 750,
  lineHeight: 1.25,
  pointerEvents: 'none',
};

const getOfflineState = () =>
  typeof navigator !== 'undefined' ? !navigator.onLine : false;

const OfflineStatus = () => {
  const [isOffline, setOffline] = useState(getOfflineState);

  useEffect(() => {
    const handleOnline = () => setOffline(false);
    const handleOffline = () => setOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) {
    return null;
  }

  return (
    <div style={pillStyle} role="status" aria-live="polite" aria-atomic="true">
      <WifiOff size={16} strokeWidth={2.2} aria-hidden="true" />
      <span>Đang ngoại tuyến</span>
    </div>
  );
};

export default OfflineStatus;
