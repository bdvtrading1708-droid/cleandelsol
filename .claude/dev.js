const { spawn } = require('child_process');
const path = require('path');

process.env.PATH = '/Users/briandevries/.nvm/versions/node/v24.14.0/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:' + (process.env.PATH || '');

const nextBin = path.resolve(__dirname, '../node_modules/.bin/next');
const child = spawn(process.execPath, [nextBin, 'dev'], {
  stdio: 'inherit',
  env: process.env,
  cwd: path.resolve(__dirname, '..'),
});

child.on('exit', (code) => process.exit(code || 0));
