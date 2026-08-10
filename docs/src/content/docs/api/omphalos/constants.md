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

- `EVENT_IO_CONNECT`; the asset has been connected to the back end. This event
  has no payload. When this event fires, variables will have been hydrated, so
  the asset can begin immediate accessing state as desired.
- `EVENT_IO_DISCONNECT`; the asset has been disconnected from the back end. This
  event has no payload.

- `EVENT_PEER_CONNECTED`; a peer asset has been connected to the back end. This
  event has the payload `{type, name, count}` to indicate the peer and the total
  number of connections to that peer as of this message (count is always >= 1).
  Events of this type will always occur after instances of `EVENT_IO_CONNECT`.
- `EVENT_PEER_DISCONNECTED`; a peer asset has been disconnected from the back
  end. This event has the payload `{type, name, count}` to indicate the peer and
  the total number of connections to that peer as of this message (count is
  always >= 0).


  [1]: /guides/panels
  [2]: /guides/graphics
  [3]: /api/omphalos/onevent
  [4]: /api/omphalos/listenfor