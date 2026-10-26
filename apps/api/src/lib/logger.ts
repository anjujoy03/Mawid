// Tiny JSON logger. Good enough until this runs somewhere that needs pino.
type Level = 'info' | 'warn' | 'error';

function log(level: Level, msg: string, extra?: Record<string, unknown>) {
  if (process.env.NODE_ENV === 'test') return;
  const line = JSON.stringify({ level, time: new Date().toISOString(), msg, ...extra });
  (level === 'error' ? console.error : console.log)(line);
}

export const logger = {
  info: (msg: string, extra?: Record<string, unknown>) => log('info', msg, extra),
  warn: (msg: string, extra?: Record<string, unknown>) => log('warn', msg, extra),
  error: (msg: string, extra?: Record<string, unknown>) => log('error', msg, extra),
};
