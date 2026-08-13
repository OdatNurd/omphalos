---
title: Sounds
sidebar:
  order: 6
---

Bundles can contain sounds in their [[sound manifest|manifest#sounds]] which
allows for playback at any point.

Each sound has an associated `volume` and `pan` setting for how loud it plays
and where in the stereo landscape this occurs. A global mixer allows for
dynamically adjusting the defaults presented in bundles, and these values are
also available to code.

The [[API|omphalos]] has a `sound` object that supports the
following operations:
 - [[play|omphalos.sound.play]] the sound
 - [[get|omphalos.sound.get]] the mixer properties of the sound
 - [[set|omphalos.sound.set]] the mixer properties of the sound
