// =============================================================================


/* The global log handler that is responsible for all logging; the default
 * value here sends the output that it is given to the console, so that it is
 * not strictly required to set up a handler in order to operate, under the
 * Policy of Least Surprise.
 *
 * Note that in order to be compatible with Winston we allow our log handlers to
 * take meta data; the handler here just dumps it directly to screen, but other
 * handlers could do other, smarter things. */
let currentHandler = (level, subsystem, message, meta) => {
  if (meta !== undefined) {
    console.log(`[${level}] ${subsystem}: ${message}`, meta);
  } else {
    console.log(`[${level}] ${subsystem}: ${message}`);
  }
}


// =============================================================================


/* Replace the log handler with a custom handler; this accepts a function with
 * the same signature as the handler above:
 *     (level, subsystem, message, meta). */
export function setLogHandler(newHandler) {
  currentHandler = newHandler;
}


// =============================================================================


/* Create and return a new logger for the provided subsystem; this uses whatever
 * the currently configured log handler is to handle the actual logging, which
 * can be modified at any point. */
export function logger(subsystem) {
  return {
    info:  (msg, meta) => currentHandler('info', subsystem, msg, meta),
    debug: (msg, meta) => currentHandler('debug', subsystem, msg, meta),
    warn:  (msg, meta) => currentHandler('warn', subsystem, msg, meta),
    error: (msg, meta) => currentHandler('error', subsystem, msg, meta),
    silly: (msg, meta) => currentHandler('silly', subsystem, msg, meta),
  }
}


// =============================================================================


