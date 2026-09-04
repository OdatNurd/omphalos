---
title: omphalos.sound.play
sidebar:
  label: play
---

```js
function omphalos.sound.play(soundName, options);
function omphalos.sound.play(soundName, bundleName, options);
```

Sends a request to the server's master mixing console to trigger a specific
sound. The sound name is the name given to the sound in the [[sound
manifest|guide.sounds]] for the given bundle.

A sound can be played from either the current bundle (the default), or the
given bundle.

The optional `options` object has the structure:
```js
{
  "volume": "number",  // Linear volume multiplier, 0.0 to 1.0 (100%)
  "pan": "number"      // Stereo panning -1.0 to 1.0, 0.0 is center
}
```

If provided, the options object sets what volume and panning should be used
during the playback. If this is not given, the call will use the values set in
the system mixer panel in the dashboard instead, falling back to the configured
defaults in the manifest if the mixer has not been used to adjust the sound.

The final per-sound options are combined with the system global master settings
to arrive at the final playback. That is, setting 100% volume here means to use
100% of the global system volume set, which may be less than 100%.