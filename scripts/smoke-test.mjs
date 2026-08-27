import assert from 'node:assert/strict';

import {
  matchesGameSearch,
  matchesPlayerFilter,
  matchesTimeFilter,
  parsePlayerRange,
} from '../src/utils/gameUtils.js';
import {
  getCurrentWeekRange,
  isDateInCurrentWeek,
  parseLocalDate,
} from '../src/utils/dateUtils.js';
import {
  parseDurationRangeMinutes,
  recommendGames,
} from '../src/utils/gameRecommender.js';

const playerCases = [
  ['1-4', 'Nhóm đông', false],
  ['2-4', 'Nhóm đông', false],
  ['2-5', 'Nhóm đông', true],
  ['3-6', 'Nhóm đông', true],
  ['5-10', 'Nhóm đông', true],
  ['2-10', 'Nhóm đông', true],
  ['Không giới hạn', 'Nhóm đông', true],
  ['2-5', '2', true],
  ['3-6', '2', false],
  ['1-4', '3-4', true],
  ['5-10', '3-4', false],
];

for (const [players, filter, expected] of playerCases) {
  assert.equal(
    matchesPlayerFilter(players, filter),
    expected,
    `${players} / ${filter}`
  );
}

assert.deepEqual(parsePlayerRange('2 – 5 người'), { min: 2, max: 5 });
assert.equal(matchesTimeFilter('10 phút', '<15 phút'), true);
assert.equal(matchesTimeFilter('15-30 phút', '<15 phút'), false);
assert.equal(matchesTimeFilter('20-45 phút', '30-60 phút'), true);
assert.equal(matchesTimeFilter('120 phút', '45-90 phút'), false);

assert.equal(matchesGameSearch({ name: 'Mèo Nổ', alias: 'Exploding Kittens' }, 'meo'), true);
assert.equal(matchesGameSearch({ name: 'Splendor', alias: '' }, 'spl'), true);
assert.equal(matchesGameSearch({ name: 'Splendor', alias: '' }, 'len'), false);

const localDate = parseLocalDate('29/08/2026 19:00');
assert.ok(localDate instanceof Date);
assert.equal(localDate.getFullYear(), 2026);
assert.equal(localDate.getMonth(), 7);
assert.equal(localDate.getDate(), 29);
assert.equal(parseLocalDate('31/02/2026 19:00'), null);
assert.equal(parseLocalDate('29/08/2026 19:00:30')?.getSeconds(), 30);
assert.equal(parseLocalDate('08/29/2026 19:00:00')?.getDate(), 29);

const reference = new Date(2026, 7, 27, 12, 0, 0);
const { start, end } = getCurrentWeekRange(reference);
assert.equal(isDateInCurrentWeek(new Date(2026, 7, 24, 0, 0), reference), true);
assert.equal(isDateInCurrentWeek(new Date(2026, 7, 30, 23, 59), reference), true);
assert.equal(isDateInCurrentWeek(new Date(2026, 7, 31, 0, 0), reference), false);
assert.ok(start < end);

assert.deepEqual(parseDurationRangeMinutes('1-2 giờ'), { min: 60, max: 120 });
assert.deepEqual(parseDurationRangeMinutes('1 giờ 30 phút'), { min: 90, max: 90 });
assert.deepEqual(parseDurationRangeMinutes('<15 phút'), { min: 0, max: 14 });

const recommenderGames = [
  {
    id: 'quick-party',
    name: 'Quick Party',
    players: '3-8',
    time: '20-30 phút',
    difficulty: 'Dễ',
    category: 'Party',
    turnSteps: ['Chơi một lượt'],
    available: true,
  },
  {
    id: 'strategy-60',
    name: 'Strategy 60',
    players: '2-4',
    time: '45-60 phút',
    difficulty: 'Vừa',
    category: 'Chiến thuật',
    winCondition: 'Nhiều điểm nhất',
    turnSteps: ['Thực hiện hành động'],
    scoring: ['Cộng điểm'],
    featured: true,
    available: true,
  },
  {
    id: 'coop-45',
    name: 'Coop 45',
    players: '1-5',
    time: '30-45 phút',
    difficulty: 'Dễ',
    category: 'Co-op',
    available: true,
  },
  {
    id: 'wrong-player-count',
    name: 'Two Only',
    players: '2',
    time: '30 phút',
    available: true,
  },
];
const recommenderSnapshot = structuredClone(recommenderGames);
const firstRecommendations = recommendGames(recommenderGames, {
  players: 4,
  durationMinutes: 60,
});
const secondRecommendations = recommendGames(recommenderGames, {
  players: 4,
  durationMinutes: 60,
});

assert.equal(firstRecommendations.length, 3);
assert.equal(firstRecommendations[0].game.id, 'strategy-60');
assert.equal(
  firstRecommendations.some((item) => item.game.id === 'wrong-player-count'),
  false
);
assert.deepEqual(
  firstRecommendations.map((item) => item.game.id),
  secondRecommendations.map((item) => item.game.id)
);
assert.deepEqual(recommenderGames, recommenderSnapshot);

console.log('Logic smoke tests: PASS');
