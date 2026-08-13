---
title: omphalos.sound.set
sidebar:
  label: set
---

```js
function omphalos.sound.set(soundName, options);
function omphalos.sound.set(soundName, bundleName, options);
```

Adjust the per-sound options for the sound name provided, optionally in a
bundle other than this assets current bundle. The sound name is the name given
to the sound in the [[sound manifest|manifest#sounds]] for the given bundle.

:::caution
When used in a [[panel|panels]] or [[graphic|graphics]], this API only allows
for setting the playback settings for sounds in the current bundle. Attempting
to alter data for sounds in other bundles will raise an error. Such operations
need to be carried out in a server [[extension|extensions]].
:::

The passed options will be used to update the system mixer's settings for this
particular sound, for future use in calls to
[[omphalos.sound.play()]].


The options provided should follows this structure:
```js
{
  "volume": "number",  // Linear volume multiplier, 0.0 to 1.0 (100%)
  "pan": "number"      // Stereo panning -1.0 to 1.0, 0.0 is center
}
```
