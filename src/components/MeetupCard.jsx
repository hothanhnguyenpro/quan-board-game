import {
  CalendarDays,
  Clock3,
  DoorOpen,
  UsersRound,
} from 'lucide-react';

import { formatMeetupDateTime } from '../utils/dateUtils.js';

const GameThumb = ({ game }) => {
  const image = String(game?.image || '').trim();

  if (image) {
    return (
      <img
        src={image}
        alt=""
        className="meetup-card-image"
        loading="lazy"
        decoding="async"
        onError={(event) => {
          event.currentTarget.hidden = true;
          event.currentTarget.nextElementSibling?.removeAttribute('hidden');
        }}
      />
    );
  }

  return null;
};

const MeetupCard = ({
  meetup,
  statusLabel,
  registrationEnabled,
  registerLabel = 'Đăng ký',
  onRegister,
}) => {
  const { game, date } = meetup;
  const status = meetup.status || 'closed';
  const canRegister = status === 'active' && registrationEnabled;
  const formatted = formatMeetupDateTime(date);
  const playerProgress =
    Number.isInteger(meetup.currentPlayers) &&
    Number.isInteger(meetup.requiredPlayers) &&
    meetup.requiredPlayers > 0
      ? `${meetup.currentPlayers}/${meetup.requiredPlayers} người`
      : Number.isInteger(meetup.requiredPlayers)
        ? `Cần ${meetup.requiredPlayers} người`
        : '';

  return (
    <article className="meetup-card">
      <div className="meetup-card-image-wrap" aria-hidden="true">
        <GameThumb game={game} />
        <div
          className="meetup-card-image fallback"
          hidden={Boolean(game?.image)}
          style={{ background: game?.edgeColor || '#5a4635' }}
        >
          🎲
        </div>
      </div>

      <div className="meetup-card-main">
        <div className="meetup-card-top">
          <div className="meetup-card-copy">
            <span className="eyebrow">GHÉP TỤ</span>
            <h3>{game?.name || 'Game không tồn tại'}</h3>
            {(game?.time || game?.players) && (
              <p className="meetup-game-facts">
                {[game.time, game.players ? `${game.players} người` : '']
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            )}
          </div>

          <span className={`meetup-status ${status}`}>
            {statusLabel}
          </span>
        </div>

        <div className="meetup-meta">
          <span>
            <CalendarDays size={15} aria-hidden="true" />
            {formatted.date}
          </span>
          <span>
            <Clock3 size={15} aria-hidden="true" />
            {formatted.time}
          </span>
          {meetup.room && (
            <span>
              <DoorOpen size={15} aria-hidden="true" />
              {meetup.room}
            </span>
          )}
          {playerProgress && (
            <span>
              <UsersRound size={15} aria-hidden="true" />
              {playerProgress}
            </span>
          )}
        </div>

        {meetup.note && <p className="meetup-note">{meetup.note}</p>}

        <button
          type="button"
          className="meetup-register"
          disabled={!canRegister}
          onClick={() => onRegister?.(meetup)}
        >
          {canRegister ? registerLabel : statusLabel}
        </button>
      </div>
    </article>
  );
};

export default MeetupCard;
