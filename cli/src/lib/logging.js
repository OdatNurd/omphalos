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


// Helper for use in logDetails; determine if a value happens to be an object
// or not, so we know how to convert it.
const isObj = value => typeof value === 'object' && value !== null && Array.isArray(value) === false;

// Specific helper for detecting if an object contains a width and height,
// indicating that it is a sizing object from a manifest object.
const isWidthObj = value => isObj(value) === true && 'width' in value && 'height' in value;

// When displaying a value in logDetails, convert the incoming value into a
// string.
const formatValue = value => {
  if (isWidthObj(value) === true) {
    return `${value.width}x${value.height}`;
  }

  if (isObj(value) === true) {
    return JSON.stringify(value);
  }

  return `${value}`;
}


// =============================================================================


/* Formats and logs a mixed array of properties, strings, and callables,
 * providing automatic alignment for colons and right-gutter badges.
 *
 * Items in the array can be:
 *   - A tuple of [label, value, options?]. Undefined values are skipped.
 *   - A header object: { header: 'Section Title' }.
 *   - A string, which is printed as-is.
 *   - A function, which is evaluated and its result processed as above.
 *
 * Internal options:
 *    'prev':  the previous value for the item; displayed as old -> new
 *    'badge': a badge to display to the right of the value
 * Global options:
 *   - prefix: A string prepended to every line (used heavily by logTree). */
export function logDetails(items, globalOptions = {}) {
  // Capture a global prefix option to see if we should be inserting anything
  // at the start of every line or not.
  const prefix = globalOptions.prefix !== undefined ? globalOptions.prefix : '';

  // Scan over the list of items and resolve all of the callable entries; we do
  // this by invoking them all and returning back whatever they return; anything
  // that is not a callable is left as is.
  //
  // Once that's done, we scan again and drop anything that is not defined.
  const validItems = items
    .map(item => {
      if (typeof item === 'function') {
        try {
          return item();
        }
        catch (error) {
          return undefined;
        }
      }
      return item;
    })
    .filter(item => {
      // Skip over arrays of single items or anything where the returned item
      // is undefined or null.
      if (Array.isArray(item) === true) {
        return item[1] !== undefined;
      }

      // Skip items that are undefined or null.
      return item !== undefined && item !== null;
    });

  // We scan now over all of the tuples to build the display strings; here we
  // need to determine the widest label and the maximum value length so that we
  // know how to format the table to line up, and where it is safe to display
  // annotations.
  let maxLabelLen = 0;
  let maxValueLen = 0;

  const processedItems = validItems.map(item => {
    // Intercept our specific header intent objects
    if (typeof item === 'object' && Array.isArray(item) === false && item.header !== undefined) {
      return { type: 'header', text: item.header };
    }

    if (Array.isArray(item) === false) {
      return { type: 'raw', text: item };
    }

    // Grab the values out for us to work with.
    const [label, value, options = {}] = item;

    // Determine what the value string is going to be for this item; this starts
    // as the value, but if the options has a prev key, then we show how it is
    // changing as well.
    let valStr = formatValue(value);
    if (options.prev !== undefined) {
      valStr = `${formatValue(options.prev)} -> ${valStr}`;
    }

    // See if the size of this label pushes us out at all.
    if (label.length > maxLabelLen) {
      maxLabelLen = label.length;
    }

    // Check to see if we've updated where our badges should start.
    if (valStr.length > maxValueLen) {
      maxValueLen = valStr.length;
    }

    // Insert the item now.
    return { type: 'tuple', label, valStr, badge: options.badge };
  });

  // Calculate the total width of the data block (label + ": " + value)
  const contentWidth = maxLabelLen + 2 + maxValueLen;

  // Now we can render out and log everything with the appropriate padding so
  // that things look nice.
  for (const item of processedItems) {
    if (item.type === 'raw') {
      // Raw strings are just a dump.
      log.info(`${prefix}${item.text}`);
    } else if (item.type === 'header') {
      // Headers display nicely centered in the width. Just in case the text
      // ends up being widger than the content, scale up.
      const width = Math.max(contentWidth, item.text.length);
      const leftPad = Math.max(0, Math.floor((width - item.text.length) / 2));

      log.info(`${prefix}${' '.repeat(leftPad)}${item.text}`);
      log.info(`${prefix}${'-'.repeat(width)}`);
    } else {
      // Get a version of the label with appropriate left padding.
      const paddedLabel = item.label.padStart(maxLabelLen, ' ');

      if (item.badge !== undefined) {
        // Items with a badge need to have their value right padded so that the
        // badges all line up.
        const paddedValue = item.valStr.padEnd(maxValueLen, ' ');
        log.info(`${prefix}${paddedLabel}: ${paddedValue}  [${item.badge}]`);
      } else {
        // Items without a badge are a simple display.
        log.info(`${prefix}${paddedLabel}: ${item.valStr}`);
      }
    }
  }
}


// =============================================================================


/* Formats an array of hierarchical nodes into a CLI tree.
 *
 * Each node in the array expects the following keys:
 *   - header: The string to print at the branch root.
 *   - details: An array of items passed directly to logDetails.
 *
 * In use the header fill be displayed, and the details nodes are passed
 * directly to the logDetails function, which will display them just a that
 * function would.
 *
 * The difference is that here the call to logDetails includes the global
 * prefix option so that all output is appropriate. */
export function logTree(nodes) {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const isLastNode = i === nodes.length - 1;

    // The prefix for the branch item and for child items depends on whether or
    // not this is the last item in the list or not.
    const branchPrefix = isLastNode === true ? '└── ' : '├── ';
    const childPrefix  = isLastNode === true ? '    ' : '│   ';

    // Log the header, followed by a call into the detail logger.
    log.info(`${branchPrefix}${node.header}`);
    if (node.details !== undefined && node.details.length > 0) {
      logDetails(node.details, { prefix: childPrefix });
      log.info(childPrefix)
    }
  }
}


// =============================================================================
