import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  DoorOpen,
  Send,
  UsersRound,
} from 'lucide-react';

import { formatMeetupDateTime } from '../utils/dateUtils.js';
import {
  createRequestToken,
  submitWithStatus,
} from '../utils/appsScriptClient.js';
import CheckInPass from './CheckInPass.jsx';

const clean = (value) => String(value ?? '').trim();

const createEmptyForm = () => ({
  name: '',
  phone: '',
  facebook: '',
  companions: '0',
});

const isReasonablePhone = (value) =>
  /^(?:\+84|84|0)\d{8,10}$/.test(clean(value).replace(/[\s().-]/g, ''));

const isValidOptionalUrl = (value) => {
  const text = clean(value);
  if (!text) return true;

  try {
    const url = new URL(text);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

const MeetupRegistrationForm = ({
  meetup,
  config,
  onBack,
  onSuccess,
  onBusyChange,
}) => {
  const fields = config?.fields || {};
  const submitUrl = clean(config?.submitUrl);
  const totalTimeoutMs =
    Number(config?.timeoutMs) > 0 ? Number(config.timeoutMs) : 45000;
  const controllerRef = useRef(null);
  const [form, setForm] = useState(createEmptyForm);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState({ type: '', message: '', data: null });

  const setBusy = useCallback(
    (value) => {
      setSubmitting(value);
      onBusyChange?.(value);
    },
    [onBusyChange]
  );

  useEffect(
    () => () => {
      controllerRef.current?.abort();
      onBusyChange?.(false);
    },
    [onBusyChange]
  );

  const updateField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: '' }));

    if (result.type === 'error' && !submitting) {
      setResult({ type: '', message: '', data: null });
    }
  };

  const validate = () => {
    const next = {};

    if (!clean(form.name)) {
      next.name = 'Vui lòng nhập tên hoặc biệt danh.';
    }

    if (!clean(form.phone)) {
      next.phone = 'Vui lòng nhập số điện thoại.';
    } else if (!isReasonablePhone(form.phone)) {
      next.phone = 'Số điện thoại chưa đúng định dạng.';
    }

    const companions = clean(form.companions);
    if (!/^\d+$/.test(companions)) {
      next.companions = 'Số người đi cùng phải là số nguyên không âm.';
    }

    if (!isValidOptionalUrl(form.facebook)) {
      next.facebook = 'Link Facebook chưa đúng định dạng.';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (submitting || !validate()) return;

    if (!submitUrl) {
      setResult({
        type: 'error',
        message: config?.notConfiguredMessage || 'Chưa cấu hình Apps Script.',
        data: null,
      });
      return;
    }

    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const submissionToken = createRequestToken('meetup');
    const game = meetup.game;

    setBusy(true);
    setErrors({});
    setResult({ type: '', message: '', data: null });

    try {
      const data = await submitWithStatus({
        url: submitUrl,
        token: submissionToken,
        timeoutMs: totalTimeoutMs,
        signal: controller.signal,
        payload: {
          action: 'register',
          submissionToken,
          meetupId: meetup.id || '',
          gameId: game?.id || '',
          gameName: game?.name || '',
          startTime: meetup.startTime || '',
          room: meetup.room || '',
          name: clean(form.name),
          phone: clean(form.phone),
          facebook: clean(form.facebook),
          companions: clean(form.companions),
        },
      });

      setResult({
        type: 'success',
        message:
          clean(data?.message) ||
          config?.successMessage ||
          'Đăng ký thành công!',
        data,
      });
      setForm(createEmptyForm());
      setErrors({});
      onSuccess?.(data);
    } catch (error) {
      if (error?.name === 'AbortError') return;

      setResult({
        type: 'error',
        message:
          clean(error?.message) ||
          config?.errorMessage ||
          'Không thể gửi đăng ký.',
        data: null,
      });
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  };

  const game = meetup.game;
  const formatted = formatMeetupDateTime(meetup.date);

  return (
    <form className="meetup-form-wrap" onSubmit={handleSubmit} noValidate>
      <button
        type="button"
        className="meetup-back"
        onClick={onBack}
        disabled={submitting}
      >
        <ArrowLeft size={17} />
        Danh sách tụ game
      </button>

      <div className="meetup-selected-game">
        {game?.image ? (
          <img src={game.image} alt="" loading="lazy" decoding="async" />
        ) : (
          <div
            className="meetup-selected-fallback"
            style={{ background: game?.edgeColor || '#5a4635' }}
            aria-hidden="true"
          >
            🎲
          </div>
        )}

        <div className="meetup-selected-copy">
          <span className="eyebrow">{config?.title || 'Đăng ký tham gia'}</span>
          <h3>{game?.name}</h3>
          <p>{formatted.full}</p>

          {meetup.room && (
            <p className="meetup-selected-meta">
              <DoorOpen size={13} />
              {meetup.room}
            </p>
          )}

          {Number.isFinite(Number(meetup.requiredPlayers)) && (
            <p className="meetup-selected-meta">
              <UsersRound size={13} />
              Sức chứa {meetup.requiredPlayers} người
            </p>
          )}
        </div>
      </div>

      <div className="meetup-form">
        <label className="meetup-field">
          <span>{fields.name?.label || 'Tên hoặc biệt danh *'}</span>
          <input
            type="text"
            value={form.name}
            placeholder={fields.name?.placeholder || 'Ví dụ: Nguyên'}
            onChange={(event) => updateField('name', event.target.value)}
            disabled={submitting}
            required
            autoComplete="name"
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? 'meetup-name-error' : undefined}
          />
          {errors.name && <small id="meetup-name-error">{errors.name}</small>}
        </label>

        <label className="meetup-field">
          <span>{fields.phone?.label || 'Số điện thoại *'}</span>
          <input
            type="tel"
            value={form.phone}
            placeholder={fields.phone?.placeholder || 'Ví dụ: 09xxxxxxxx'}
            onChange={(event) => updateField('phone', event.target.value)}
            disabled={submitting}
            required
            autoComplete="tel"
            inputMode="tel"
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={errors.phone ? 'meetup-phone-error' : undefined}
          />
          {errors.phone && <small id="meetup-phone-error">{errors.phone}</small>}
        </label>

        <label className="meetup-field">
          <span>{fields.facebook?.label || 'Link Facebook'}</span>
          <input
            type="url"
            value={form.facebook}
            placeholder={fields.facebook?.placeholder || 'https://facebook.com/...'}
            onChange={(event) => updateField('facebook', event.target.value)}
            disabled={submitting}
            autoComplete="url"
            inputMode="url"
            aria-invalid={Boolean(errors.facebook)}
            aria-describedby={errors.facebook ? 'meetup-facebook-error' : undefined}
          />
          {errors.facebook && (
            <small id="meetup-facebook-error">{errors.facebook}</small>
          )}
        </label>

        <label className="meetup-field">
          <span>{fields.companions?.label || 'Số lượng người đi cùng *'}</span>
          <input
            type="number"
            min="0"
            max="30"
            step="1"
            value={form.companions}
            placeholder={fields.companions?.placeholder || 'Ví dụ: 0'}
            onChange={(event) => updateField('companions', event.target.value)}
            disabled={submitting}
            required
            inputMode="numeric"
            aria-invalid={Boolean(errors.companions)}
            aria-describedby={
              errors.companions ? 'meetup-companions-error' : undefined
            }
          />
          {errors.companions && (
            <small id="meetup-companions-error">{errors.companions}</small>
          )}
        </label>
      </div>

      {result.message && (
        <div
          className={`meetup-submit-state ${result.type}`}
          role={result.type === 'error' ? 'alert' : 'status'}
          aria-live="polite"
        >
          {result.type === 'success' ? (
            <CheckCircle2 size={18} />
          ) : (
            <AlertCircle size={18} />
          )}
          <span>{result.message}</span>
        </div>
      )}

      {result.type === 'success' && (
        <CheckInPass
          checkInCode={result.data?.checkInCode}
          gameName={game?.name}
        />
      )}

      {result.type !== 'success' ? (
        <button type="submit" className="meetup-submit" disabled={submitting}>
          <Send size={17} />
          {submitting
            ? 'Đang xác nhận với quán...'
            : config?.buttonText || 'Gửi đăng ký'}
        </button>
      ) : (
        <button type="button" className="meetup-submit secondary" onClick={onBack}>
          Quay lại danh sách tụ
        </button>
      )}
    </form>
  );
};

export default MeetupRegistrationForm;
