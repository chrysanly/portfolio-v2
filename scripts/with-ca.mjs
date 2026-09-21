/**
 * Runs a command with NODE_EXTRA_CA_CERTS already in place.
 *
 * Node reads its certificate list once, while it starts. Putting
 * NODE_EXTRA_CA_CERTS in `.env` is therefore too late for the process that
 * loads it — Next has the variable in `process.env`, and its TLS stack has
 * already been built without it. The symptom is a dev server that logs
 * `API unreachable: fetch failed` on every request while the same value works
 * perfectly for a script that sets it beforehand.
 *
 * So the variable has to exist before the process does. This wrapper reads the
 * env files itself and spawns the real command with them applied.
 *
 * Without a CA configured it does nothing but pass the command through, so a
 * machine with a real certificate — production, CI — is unaffected.
 *
 *   node scripts/with-ca.mjs next dev
 */

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const [command, ...args] = process.argv.slice(2);

if (!command) {
  console.error('[ca] nothing to run. Usage: node scripts/with-ca.mjs <command> [args...]');
  process.exit(1);
}

// First file wins, and a real environment variable beats both — the same order
// Next itself uses, so this cannot disagree with what the app sees.
for (const file of ['.env.local', '.env']) {
  const at = path.join(process.cwd(), file);
  if (!fs.existsSync(at)) continue;
  try {
    process.loadEnvFile(at);
  } catch {
    // A malformed env file is not this script's problem to report; the app
    // will say so far more usefully than a launcher can.
  }
}

const ca = process.env.NODE_EXTRA_CA_CERTS;

if (ca && !fs.existsSync(ca)) {
  console.warn(`[ca] NODE_EXTRA_CA_CERTS points at ${ca}, which does not exist. Ignoring it.`);
  delete process.env.NODE_EXTRA_CA_CERTS;
} else if (ca) {
  console.log(`[ca] trusting ${path.basename(ca)}`);
}

/*
 * `shell: true` on Windows, because `next` is a .cmd shim there and spawn
 * cannot execute it directly. The command comes from package.json, not from
 * user input, so there is nothing here for a shell to mis-handle.
 */
const child = spawn(command, args, {
  stdio: 'inherit',
  env: process.env,
  shell: process.platform === 'win32',
});

child.on('exit', (code, signal) => {
  // Signals are reported as a null exit code; turn that back into something a
  // shell can read, or a Ctrl-C looks like a success.
  if (signal) process.exit(1);
  process.exit(code ?? 0);
});

child.on('error', (error) => {
  console.error(`[ca] could not start ${command}:`, error.message);
  process.exit(1);
});
