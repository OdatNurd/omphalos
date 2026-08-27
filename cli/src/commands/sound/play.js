import { log } from '#logging';

import { enforce, getRequiredAsset, getRequiredAssetPath, validateAssetIdentifier, wrappedHandler } from '#helpers';

import playSound from 'play-sound';


// =============================================================================


// Initialize the player instance
const player = playSound();


// =============================================================================


/* Attempt to play back a sound from the manifest using the default audio
 * device.
 *
 * This uses the play-sound package, which just tries to use an appropriate
 * command line tool. This is largely untested code I ripped from an example. */
async function handlePlay({ name, raw, bundlePath, manifest }) {
  const soundConfig = getRequiredAsset(name, 'sound', manifest);
  const assetPath = getRequiredAssetPath(soundConfig.file, 'sound', manifest, bundlePath);

  const targetName = name;

  // Pull volume and panning.
  const vol = soundConfig.volume !== undefined ? soundConfig.volume : 1.0;
  const pan = soundConfig.pan !== undefined ? soundConfig.pan : 0;

  // Log the intent based on the raw flag. As it transpires this package can't
  // actually use such arguments, but maybe there is a better way.
  if (raw === false) {
    log.info(`playing '${targetName}'...`);
    log.info(`configured Mix -> Volume: ${vol}, Pan: ${pan}`);
    log.warn(`the 'play-sound' package delegates to system CLI players and lacks a unified volume/pan API; playing at normal level.`);
  } else {
    log.info(`playing '${targetName}' (Raw mode: ignoring configured mix)...`);
  }

  // The play-sound library uses callbacks, so we wrap it in a Promise to keep
  // the CLI alive until the track finishes playing.
  await new Promise((resolve, reject) => {
    player.play(assetPath.absolute, (err) => {
      if (err !== null && err !== undefined) {
        log.error(`failed to play sound: ${err.message || err}`);
        reject(err);
      } else {
        log.info('playback complete.');
        resolve();
      }
    });
  });
}


// =============================================================================


export const playCommand = {
  command: 'play <name>',
  describe: 'Play a sound locally via the host audio device',
  builder: yargs => {
    return yargs
      .positional('name', {
        type: 'string',
        describe: 'Sound name to play',
        coerce: enforce('name', validateAssetIdentifier),
      })
      .option('raw', {
        alias: 'r',
        type: 'boolean',
        describe: 'Ignore manifest volume and pan settings (plays back normally)',
        default: false
      });
  },
  handler: wrappedHandler(handlePlay, 1)
};


// =============================================================================
