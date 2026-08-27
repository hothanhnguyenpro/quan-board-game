import { ExternalLink } from 'lucide-react';

import { APP_CONFIG } from '../config.js';

const FacebookIcon = ({ size = 18 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073c0 6.019 4.388 11.003 10.125 11.928v-8.437H7.078v-3.491h3.047V9.413c0-3.017 1.792-4.686 4.533-4.686 1.312 0 2.686.235 2.686.235v2.975h-1.514c-1.492 0-1.956.931-1.956 1.888v2.268h3.328l-.532 3.491h-2.796V24C19.612 23.076 24 18.092 24 12.073Z" />
  </svg>
);

const InstagramIcon = ({ size = 18 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <rect
      x="3"
      y="3"
      width="18"
      height="18"
      rx="5"
      stroke="currentColor"
      strokeWidth="2"
    />
    <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
    <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" />
  </svg>
);

const TikTokIcon = ({ size = 18 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M19.59 7.09a5.73 5.73 0 0 1-3.27-1.02A5.82 5.82 0 0 1 14.07 3H10.9v12.11a2.96 2.96 0 1 1-2.03-2.81V9.08a6.15 6.15 0 1 0 5.2 6.03V9.17a8.9 8.9 0 0 0 5.52 1.92v-4Z" />
  </svg>
);

const ZaloIcon = () => (
  <span className="social-zalo-word" aria-hidden="true">
    Zalo
  </span>
);

const ICONS = {
  facebook: FacebookIcon,
  instagram: InstagramIcon,
  tiktok: TikTokIcon,
  zalo: ZaloIcon,
};

const clean = (value) => String(value ?? '').trim();

const isUsableUrl = (value) => {
  const text = clean(value);
  if (!text) return false;

  try {
    const url = new URL(text);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
};

const SocialIcon = ({ platform }) => {
  const Icon = ICONS[platform];
  return Icon ? <Icon /> : <ExternalLink size={17} aria-hidden="true" />;
};

const SocialLinks = () => {
  const socialConfig = APP_CONFIG?.social || {};

  const items = Object.entries(socialConfig)
    .map(([key, config]) => ({ key, config }))
    .filter(({ config }) => config?.enabled === true);

  if (!items.length) {
    return null;
  }

  return (
    <nav className="social-links" aria-label="Mạng xã hội của quán">
      {items.map(({ key, config }) => {
        const label = clean(config?.label) || key;
        const url = clean(config?.url);
        const hasUrl = isUsableUrl(url);
        const className = `social-link social-${key}${hasUrl ? '' : ' is-disabled'}`;

        if (!hasUrl) {
          return (
            <button
              key={key}
              type="button"
              className={className}
              aria-label={`${label} chưa cấu hình link`}
              title={`${label}: chưa cấu hình link trong config.js`}
              disabled
            >
              <SocialIcon platform={key} />
            </button>
          );
        }

        return (
          <a
            key={key}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={className}
            aria-label={`Mở ${label}`}
            title={label}
          >
            <SocialIcon platform={key} />
          </a>
        );
      })}
    </nav>
  );
};

export default SocialLinks;
