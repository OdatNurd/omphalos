import { resolve } from 'node:path';

/* Bundles can optionally export an object named symbols; if they do, those
 * symbols will be available to other bundles that wish to import them through
 * the omphalos.import() function. */
export const symbols = {}

/* All bundles with server side code must specify a file that is the entry point
 * to the serve code, and that file should export a specifically named function
 * which will take as a paramter the API for the application.
 *
 * When the bundle loads, this function gets called to do final initialization
 * that might be needed. */
export function main(omphalos) {
  omphalos.log.info(`I am the extension entry point for the bundle ${omphalos.bundle.name}`);
  omphalos.log.info(`the configured log timestamp format is ${omphalos.config.logging.timestamp}`)

  // Add a simple export; we don't need to do this here, but it lets us
  // capture the omphalos object for logging.
  symbols["exported"] = () => omphalos.log.info('I am an exported function');

  // =========================================================================
  // SKEPSIS API DEMONSTRATION
  // =========================================================================

  // Create a Skepsis instance to track the global click count. This will pull
  // the existing value or default to 69 if it is not already set.
  const clickCount = omphalos.Skepsis('clickCount', 69);

  // Prove that the server can also reactively listen to its own variable
  // changes. The callback signature now includes the key name.
  clickCount.on((newValue, oldValue, key) => {
    omphalos.log.debug(`Skepsis reactive trigger: ${key} changed from ${oldValue} to ${newValue}`);
  });

  // =========================================================================
  // EVENT API DEMONSTRATION
  // =========================================================================

  // Listen for peer connection and disconnection events
  omphalos.event.peerConnected((data) => {
    omphalos.log.info(`Extension saw peer connect: [${data.type}] ${data.name}`);
  });

  omphalos.event.peerDisconnected((data) => {
    omphalos.log.info(`Extension saw peer disconnect: [${data.type}] ${data.name}`);
  });

  // Listen for an incoming click message, and when one arrives, send out a
  // clack.
  omphalos.event.on('click', () => {
    omphalos.log.debug('*** CLICK? CLACK! ***');
    omphalos.sound.play('click');
    omphalos.event.raise('clack');

    // Update the global value via the Skepsis setter
    clickCount.value++;

    omphalos.toast(`Server received a click message (${clickCount.value} times); sent clack`, 'info', 3);
  });

  // =========================================================================
  // IMPORT API DEMONSTRATION
  // =========================================================================

  // Try to import a symbol from another omphalos bundle; this will give you
  // object list of symbols from that bundle, which may be empty if that
  // bundle exports no symbols.
  const { imported } = omphalos.import('some-bundle');
  if (imported !== undefined) {
    omphalos.log.info('We imported a function from another bundle');
  } else {
    omphalos.log.warn('Attempt to import a symbol failed.');
  }

  // =========================================================================
  // MOUNT API DEMONSTRATION
  // =========================================================================

  // Create a custom router to serve files from an "images" directory
  // in the root of the bundle without needing to import express.
  const router = omphalos.createRouter();

  router.get('/images/:imageName', (req, res) => {
    const imagePath = resolve(omphalos.bundle.omphalos.location, 'images', req.params.imageName);
    res.sendFile(imagePath);
  });

  // By passing this router to omphalos.mount(), the Omphalos loader will
  // automatically prefix the path with `/bundles/sample-bundle`.
  //
  // Files in the "sample-bundle/images" folder  will be accessible in the
  // browser via the link:
  //     http://localhost:<port>/bundles/sample-bundle/images/:imageName
  omphalos.mount(router);
}
