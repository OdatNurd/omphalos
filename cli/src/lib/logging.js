import { logger, setLogHandler } from '@odatnurd/omphalos-common/logger';


// =============================================================================


/* Set up a simple log handler that dumps everything to the console; here we
 * purposely ignore things like the log module, since for a CLI that makes
 * less sense.
 *
 * This presumes that all of the log levels that the API says it supports are
 * actually console log methods, which is currently true. */
export const log = logger('omph-cli');

setLogHandler((level, subsystem, message, meta) => {
  // Automatically prefix the message with the log level moniker for everything
  // except standard info messages.
  if (level !== 'info') {
    message = `[${level.toUpperCase()}] ${message}`;
  }

  // The console API doesn't have a 'silly' method, so we map that specific
  // level to 'info' for the actual output.
  const consoleMethod = (level === 'silly' ? 'info' : level);

  if (meta !== undefined) {
    console[consoleMethod](message, meta);
  } else {
    console[consoleMethod](message);
  }
});


// =============================================================================
