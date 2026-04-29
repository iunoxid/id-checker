const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'watcher.log');

function formatLine(level, message) {
  const ts = new Date().toISOString();
  return `[${ts}] [${level}] ${message}`;
}

function info(message) {
  const line = formatLine('INFO', message);
  console.log(line);
  fs.appendFile(LOG_FILE, line + '\n', () => {});
}

function warn(message) {
  const line = formatLine('WARN', message);
  console.warn(line);
  fs.appendFile(LOG_FILE, line + '\n', () => {});
}

function error(message) {
  const line = formatLine('ERROR', message);
  console.error(line);
  fs.appendFile(LOG_FILE, line + '\n', () => {});
}

module.exports = { info, warn, error };
