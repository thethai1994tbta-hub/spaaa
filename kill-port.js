#!/usr/bin/env node
const net = require('net');
const { exec } = require('child_process');
const os = require('os');

const PORT = 5173;

// Try to connect to the port to see if anything is listening
const client = new net.Socket();
client.setTimeout(500);

client.on('connect', () => {
  client.destroy();

  // Something is listening on the port, kill it
  if (os.platform() === 'win32') {
    // Windows: use netstat + taskkill
    exec(`netstat -ano | findstr :${PORT}`, (err, stdout) => {
      if (stdout) {
        const lines = stdout.trim().split('\n');
        lines.forEach(line => {
          const parts = line.trim().split(/\s+/);
          const pid = parts[parts.length - 1];
          if (pid && pid !== 'PID') {
            exec(`taskkill /F /PID ${pid}`, () => {
              console.log(`[KILL] Killed process ${pid} on port ${PORT}`);
            });
          }
        });
      }
    });
  } else {
    // Unix: use lsof
    exec(`lsof -ti:${PORT} | xargs kill -9`, (err) => {
      if (!err) console.log(`[KILL] Killed process on port ${PORT}`);
    });
  }
});

client.on('error', () => {
  // Port is free, do nothing
});

client.on('timeout', () => {
  client.destroy();
});

client.connect(PORT, 'localhost');
