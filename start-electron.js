const { spawn } = require('child_process');
const path = require('path');
const electron = require('electron');

// Delete the bad environment variable
delete process.env.ELECTRON_RUN_AS_NODE;

process.env.NODE_ENV = 'development';

const child = spawn(electron, ['.'], {
    stdio: 'inherit',
    env: process.env
});

child.on('close', (code) => {
    process.exit(code);
});
