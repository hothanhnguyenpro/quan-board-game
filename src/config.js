/**
 * Central application configuration.
 *
 * Keep customer-editable copy, external links and feature switches here so
 * ordinary content changes do not require editing React components.
 */

export const GOOGLE_SHEETS_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vSOHRXeeWP7b8Pasg4lowQkwV_Fn02vQuUQztn9A5DsBDE6iwhP5249uQAXiAf95NlSvVZEazM1VTkU/pub?gid=0&single=true&output=csv';

// Sheet 2: weekly meetup schedule. Leave empty to disable remote meetup data.
export const GOOGLE_SHEETS_MEETUP_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vSOHRXeeWP7b8Pasg4lowQkwV_Fn02vQuUQztn9A5DsBDE6iwhP5249uQAXiAf95NlSvVZEazM1VTkU/pub?gid=1475285450&single=true&output=csv';

export const APP_CONFIG = {
  brand: {
    eyebrow: 'BOARD GAME CAFE',
    libraryTitle: 'Tìm game cho bàn của bạn',
    librarySubtitle: 'Tìm theo tên game, hoặc mở Bộ lọc khi bạn cần.',
    searchPlaceholder: 'Tìm tên game...',
    logoUrl: '/logo.png',
  },

  social: {
    // Add or remove entries freely. SocialLinks renders unknown keys with a
    // safe generic icon, so adding another platform does not require JSX edits.
    facebook: {
      enabled: true,
      label: 'Facebook',
      url: 'https://www.facebook.com/profile.php?id=61590288459544',
    },
    tiktok: {
      enabled: true,
      label: 'TikTok',
      url: '',
    },
    instagram: {
      enabled: true,
      label: 'Instagram',
      url: '',
    },
    zalo: {
      enabled: true,
      label: 'Zalo',
      url: '',
    },
  },

  waitlist: {
    enabled: true,
    buttonLabel: 'Chờ bàn',
    pollIntervalMs: 15000,
  },

  tableSupport: {
    enabled: true,
    buttonLabel: 'Cần hỗ trợ',
  },

  gameCompanion: {
    enabled: true,
    buttonLabel: 'Công cụ trong ván',
  },

  meetup: {
    enabled: true,
    buttonLabel: 'Ghép tụ',
    eyebrow: 'GẶP GỠ & CHƠI GAME',
    title: 'Những tụ game tuần này',
    description: 'Chọn một tụ phù hợp và đăng ký tham gia cùng mọi người.',
    sheetUrl: GOOGLE_SHEETS_MEETUP_CSV_URL,
    showOnlyCurrentWeek: true,
    emptyMessage: 'Chưa có tụ game tuần này.',
    loadErrorMessage: 'Không thể tải lịch ghép tụ. Vui lòng thử lại sau.',
    statusLabels: {
      active: 'Đang nhận đăng ký',
      full: 'Đã đủ người',
      closed: 'Đã đóng đăng ký',
      cancelled: 'Đã hủy',
    },
    registration: {
      enabled: true,
      submitUrl:
        'https://script.google.com/macros/s/AKfycbw4R4sOeHc1S1DizDy4cIORsEiI-8KQ8kdw6F2M29eJoIXyzLKYnxzQ-kc_VPEt4E53/exec',
      timeoutMs: 20000,
      openButtonText: 'Đăng ký',
      buttonText: 'Gửi đăng ký',
      successMessage: 'Đăng ký thành công! Quán sẽ liên hệ với bạn.',
      errorMessage: 'Không thể gửi đăng ký.',
      notConfiguredMessage: 'Chưa cấu hình nơi nhận đăng ký.',
      fields: {
        name: {
          label: 'Tên hoặc biệt danh *',
          placeholder: 'Ví dụ: Nguyên',
        },
        phone: {
          label: 'Số điện thoại *',
          placeholder: 'Ví dụ: 09xxxxxxxx',
        },
        facebook: {
          label: 'Link Facebook',
          placeholder: 'https://facebook.com/...',
        },
        companions: {
          label: 'Số lượng người đi cùng *',
          placeholder: 'Ví dụ: 0',
        },
      },
    },
  },

  announcement: {
    enabled: true,
    id: 'weekly-meetups-2026-w35',
    // Show once for every fresh page load. Closing it only affects the current
    // React mount, so opening a Cheat Sheet and returning will not show it again.
    showOncePerSession: false,
    title: '🎲 Có kèo mới!',
    message: 'Tuần này quán có những tụ game mới. Ghé xem và chọn bàn hợp gu nhé!',
    buttonText: 'Xem tụ tuần này',
    buttonUrl: '#meetup',
    dismissible: true,
  },
};
