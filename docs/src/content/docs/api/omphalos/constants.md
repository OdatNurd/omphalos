---
title: omphalos.constants
sidebar:
  label: constants
---

`omphalos.constants` contains a list of constant values that track
various system states:

## Events

These constants represent events that can be listened for in a
[panel][1] or [graphic][2] via [omphalos.onEvent][3] or
[omphalos.listenFor][4]:

- `EVENT_IO_CONNECT`; the asset has been connected to the back end.
- `EVENT_IO_DISCONNECT`; the asset has been disconnected from the back end.


  [1]: /guides/panels
  [2]: /guides/graphics
  [3]: /api/omphalos/onevent
  [4]: /api/omphalos/listenfor