import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import pngjs from 'pngjs';
import QRCode from 'qrcode';

import { createCheckInQrPayload } from '../src/utils/checkInQr.js';

const { PNG } = pngjs;
const expectedPayload = createCheckInQrPayload(
  'K7M4Q2',
  'https://script.google.com/macros/s/TEST_DEPLOYMENT/exec?old=value#ignored'
);

assert.equal(
  expectedPayload,
  'https://script.google.com/macros/s/TEST_DEPLOYMENT/exec?view=admin&checkin=K7M4Q2',
  'The customer ticket must deep-link to the protected admin check-in flow'
);
assert.equal(
  createCheckInQrPayload('K7M4Q2', ''),
  'noburi-checkin:K7M4Q2',
  'An invalid admin URL must fall back to an opaque scanner payload'
);
const html = readFileSync(
  new URL('../google-apps-script/JsQr.html', import.meta.url),
  'utf8'
);
const dashboardHtml = readFileSync(
  new URL('../google-apps-script/AdminDashboard.html', import.meta.url),
  'utf8'
);
const backendSource = readFileSync(
  new URL('../google-apps-script/Code.gs', import.meta.url),
  'utf8'
);
const source = html
  .replace(/^\s*<script[^>]*>/i, '')
  .replace(/<\/script>\s*$/i, '');
const browserScope = {};
const jsQR = Function(
  'self',
  `${source}\nreturn self.jsQR;`
)(browserScope);

assert.equal(typeof jsQR, 'function', 'JsQr.html must expose self.jsQR');

const extractorStart = dashboardHtml.indexOf('function extractCheckInCode(rawValue)');
const extractorEnd = dashboardHtml.indexOf(
  'async function consumePendingCheckInCode()',
  extractorStart
);
assert.ok(extractorStart >= 0 && extractorEnd > extractorStart);
const extractorSource = dashboardHtml.slice(extractorStart, extractorEnd).trim();
const extractCheckInCode = Function(
  'clean',
  `return (${extractorSource});`
)((value) => String(value ?? '').trim());

assert.equal(extractCheckInCode(expectedPayload), 'K7M4Q2');
assert.equal(extractCheckInCode('noburi-checkin:K7M4Q2'), 'K7M4Q2');
assert.equal(extractCheckInCode('{"checkInCode":"K7M4Q2"}'), 'K7M4Q2');
assert.doesNotMatch(backendSource, /params\.c\s*\|\|/);
assert.match(backendSource, /params\.checkInCode\s*\|\|\s*params\.checkin/);
assert.match(backendSource, /view\s*===\s*'admin'\s*\|\|\s*checkInCode/);
assert.match(backendSource, /requireAdminSession_\(sessionToken\)/);
assert.match(
  dashboardHtml,
  /<form id="login-form" autocomplete="on"/,
  'The admin login must opt into browser credential handling'
);
assert.match(
  dashboardHtml,
  /name="username"[\s\S]*?autocomplete="username"/,
  'Password managers need a stable username field'
);
assert.match(
  dashboardHtml,
  /name="password"[\s\S]*?autocomplete="current-password"/,
  'The password field must declare the current-password purpose'
);
assert.match(
  dashboardHtml,
  /id="logout-button"[\s\S]*?logout-button/,
  'The dashboard must expose a distinct logout control'
);
assert.match(dashboardHtml, /\.adminLogout\(sessionToken\)/);

const qrBuffer = await QRCode.toBuffer(expectedPayload, {
  width: 640,
  margin: 5,
  errorCorrectionLevel: 'M',
  color: { dark: '#000000', light: '#ffffff' },
});
const qrPng = PNG.sync.read(qrBuffer);

const decode = (data, width, height) =>
  jsQR(new Uint8ClampedArray(data), width, height, {
    inversionAttempts: 'attemptBoth',
  })?.data || '';

assert.equal(
  decode(qrPng.data, qrPng.width, qrPng.height),
  expectedPayload,
  'The bundled decoder must read the app QR image'
);

const photoWidth = 1800;
const photoHeight = 2400;
const photo = new Uint8ClampedArray(photoWidth * photoHeight * 4);
photo.fill(255);
const offsetX = Math.floor((photoWidth - qrPng.width) / 2);
const offsetY = Math.floor((photoHeight - qrPng.height) / 2);

for (let y = 0; y < qrPng.height; y += 1) {
  for (let x = 0; x < qrPng.width; x += 1) {
    const sourceIndex = (y * qrPng.width + x) * 4;
    const targetIndex = ((offsetY + y) * photoWidth + offsetX + x) * 4;
    photo[targetIndex] = qrPng.data[sourceIndex];
    photo[targetIndex + 1] = qrPng.data[sourceIndex + 1];
    photo[targetIndex + 2] = qrPng.data[sourceIndex + 2];
    photo[targetIndex + 3] = qrPng.data[sourceIndex + 3];
  }
}

assert.equal(
  decode(photo, photoWidth, photoHeight),
  expectedPayload,
  'The bundled decoder must find a centered QR inside a camera-sized image'
);

const rotatedWidth = photoHeight;
const rotatedHeight = photoWidth;
const rotatedPhoto = new Uint8ClampedArray(rotatedWidth * rotatedHeight * 4);
for (let y = 0; y < photoHeight; y += 1) {
  for (let x = 0; x < photoWidth; x += 1) {
    const sourceIndex = (y * photoWidth + x) * 4;
    const rotatedX = photoHeight - 1 - y;
    const rotatedY = x;
    const targetIndex = (rotatedY * rotatedWidth + rotatedX) * 4;
    rotatedPhoto[targetIndex] = photo[sourceIndex];
    rotatedPhoto[targetIndex + 1] = photo[sourceIndex + 1];
    rotatedPhoto[targetIndex + 2] = photo[sourceIndex + 2];
    rotatedPhoto[targetIndex + 3] = photo[sourceIndex + 3];
  }
}

assert.equal(
  decode(rotatedPhoto, rotatedWidth, rotatedHeight),
  expectedPayload,
  'The bundled decoder must read a portrait photo after device rotation'
);

console.log('QR decoder integration tests: PASS');
