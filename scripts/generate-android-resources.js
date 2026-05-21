const fs = require('fs');
const path = require('path');

const translations = require('../src/constants/translations.json');

const statusKeys = [
  'scheduled',
  'checkin',
  'on_time',
  'gateclosed',
  'boarding',
  'delayed',
  'canceled',
  'departed',
  'en_route',
  'arrived',
  'diverted',
  'unknown',
];

const localeDirectories = {
  en: 'values',
  ru: 'values-ru',
};

const stringDefinitions = [
  ['notification_channel_flight', (locale) => locale.notifications.channels.flight],
  ['notification_channel_urgent', (locale) => locale.notifications.channels.urgent],
  ['notification_changed_start_datetime', (locale) => locale.notifications.changed_start_datetime],
  ['notification_changed_end_datetime', (locale) => locale.notifications.changed_end_datetime],
  ['notification_changed_status', (locale) => locale.notifications.changed_status],
  ['notification_changed_departure_check_in_desk', (locale) => locale.notifications.changed_departure_check_in_desk],
  ['notification_changed_departure_terminal', (locale) => locale.notifications.changed_departure_terminal],
  ['notification_changed_departure_gate', (locale) => locale.notifications.changed_departure_gate],
  ['notification_changed_arrival_terminal', (locale) => locale.notifications.changed_arrival_terminal],
  ['notification_changed_baggage_belt', (locale) => locale.notifications.changed_baggage_belt],
  ['notification_flight_title', (locale) => `${locale.flights.flight} %1$s %2$s`],
  ...statusKeys.map((statusKey) => [
    `notification_status_${statusKey}`,
    (locale) => locale.flights.statuses[statusKey],
  ]),
];

function toAndroidPlaceholders(value) {
  let index = 1;
  return value.replace(/%\{[^}]+\}/g, () => `%${index++}$s`);
}

function escapeXml(value) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function buildStringsXml(localeCode) {
  const locale = translations[localeCode];
  if (!locale) {
    throw new Error(`Unsupported locale: ${localeCode}`);
  }

  const items = stringDefinitions.map(([name, getValue]) => {
    const rawValue = getValue(locale);
    if (typeof rawValue !== 'string' || rawValue.length === 0) {
      throw new Error(`Missing translation for ${localeCode}:${name}`);
    }
    return `  <string name="${name}">${escapeXml(toAndroidPlaceholders(rawValue))}</string>`;
  });

  return [
    '<resources>',
    '  <!-- Generated from src/constants/translations.json -->',
    ...items,
    '</resources>',
    '',
  ].join('\n');
}

function writeLocaleFile(localeCode, directoryName) {
  const dirPath = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res', directoryName);
  const filePath = path.join(dirPath, 'notification_strings.xml');
  fs.mkdirSync(dirPath, { recursive: true });
  sanitizeLegacyStringsFile(path.join(dirPath, 'strings.xml'));
  fs.writeFileSync(filePath, buildStringsXml(localeCode), 'utf8');
  console.log(`Generated ${path.relative(path.join(__dirname, '..'), filePath)}`);
}

function sanitizeLegacyStringsFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const original = fs.readFileSync(filePath, 'utf8');
  const sanitized = original
    .split(/\r?\n/)
    .filter((line) => !line.includes('<string name="notification_'))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n');

  if (sanitized !== original) {
    fs.writeFileSync(filePath, sanitized, 'utf8');
    console.log(`Sanitized ${path.relative(path.join(__dirname, '..'), filePath)}`);
  }
}

for (const [localeCode, directoryName] of Object.entries(localeDirectories)) {
  writeLocaleFile(localeCode, directoryName);
}
