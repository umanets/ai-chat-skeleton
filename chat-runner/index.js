#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');

// Root of the project (one level up)
const rootDir = path.resolve(__dirname, '..');

// Determine OS
const isWin = process.platform === 'win32';
// Define npm command for frontend
const npmCmd = isWin ? 'npm.cmd' : 'npm';
// Define each service with its start command and working directory
const services = [
  {
    name: 'qdrant',
    cmd: 'docker-compose',
    args: ['up'],
    cwd: rootDir,
  },
  {
    name: 'backend',
    // activate venv then start Uvicorn
    cmd: isWin ? 'cmd.exe' : 'bash',
    args: isWin
      ? ['/c', 'call venv\\Scripts\\activate.bat && python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000']
      : ['-lc', 'source venv/bin/activate && python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000'],
    cwd: path.join(rootDir, 'backend'),
  },
  {
    name: 'inference-service',
    // activate venv then start Uvicorn
    cmd: isWin ? 'cmd.exe' : 'bash',
    args: isWin
      ? ['/c', 'call venv\\Scripts\\activate.bat && python -m uvicorn main:app --reload --port 8001']
      : ['-lc', 'source venv/bin/activate && python -m uvicorn main:app --reload --port 8001'],
    cwd: path.join(rootDir, 'inference-service'),
  },
  {
    name: 'frontend',
    cmd: npmCmd,
    args: ['run', 'dev'],
    cwd: path.join(rootDir, 'my-chat-app'),
  },
];

const processes = [];

// Spawn each service process
services.forEach(({ name, cmd, args, cwd }) => {
  console.log(`Starting ${name}...`);
  const proc = spawn(cmd, args, { cwd, stdio: 'inherit' });
  processes.push({ name, proc });
  proc.on('exit', (code, signal) => {
    console.log(`${name} exited: ${signal || code}`);
  });
  proc.on('error', (err) => {
    console.error(`Failed to start ${name}: ${err.message}`);
  });
});

// Graceful shutdown on Ctrl+C or termination
function shutdown() {
  console.log('Shutting down all services...');
  processes.forEach(({ name, proc }) => {
    if (!proc.killed) proc.kill('SIGINT');
  });
  setTimeout(() => process.exit(), 1000);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);