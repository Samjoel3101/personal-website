import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

/**
 * The page under the camera.
 *
 * `--dev` shoots whatever is already running on the dev server, which is the
 * fast loop: edit a shape, save, shoot, look. Without it the tool builds and
 * previews, which is slower and is what a before/after worth keeping is taken
 * against — the dev server serves unminified modules and a different asset
 * path, and a frame budget measured there is not the one that ships.
 */
export async function startServer({ dev, port }) {
  if (dev) {
    await waitForServer(port, 5_000);
    return { url: `http://127.0.0.1:${port}`, stop: async () => {} };
  }

  await run('npm', ['run', 'build']);
  const preview = spawn('npx', ['vite', 'preview', '--port', String(port), '--host', '127.0.0.1'], {
    stdio: 'ignore',
  });
  await waitForServer(port, 60_000);
  return {
    url: `http://127.0.0.1:${port}`,
    stop: async () => {
      preview.kill('SIGTERM');
    },
  };
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit' });
    child.on('exit', (code) =>
      code === 0 ? resolve() : reject(new Error(`${command} ${args.join(' ')} exited ${code}`)),
    );
  });
}

async function waitForServer(port, timeout) {
  const until = Date.now() + timeout;
  const url = `http://127.0.0.1:${port}/`;
  while (Date.now() < until) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Not up yet. Nothing to report until the deadline passes.
    }
    await delay(300);
  }
  throw new Error(
    `Nothing answering on ${url}. ${
      timeout < 10_000 ? 'Is `npm run dev` running?' : 'The preview server never came up.'
    }`,
  );
}
