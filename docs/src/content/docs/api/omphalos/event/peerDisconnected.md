---
title: omphalos.event.peerDisconnected
sidebar:
  label: peerDisconnected
---

```js
omphalos.event.peerDisconnected((payload) => {
  omphalos.log.debug(`asset ${omphalos.asset.name} in my bundle has disconnected`);
});

omphalos.event.peerDisconnected('other-bundle', (payload) => {
  omphalos.log.debug(`asset ${omphalos.asset.name} in other-bundle has disconnected`);
});

```

This event is raised to indicate that a peer asset has disconnected from the
back end and can no longer communicate.

This event gets a payload of:

```js
{
  type: "string", // "panel" | "graphic" | "system"
  name: "string", // The configured name of the asset
  count: "number" // Total active connections for this specific asset
}
```

The `count` is always `>=0`, given that more than one instance of any given
asset can be loaded at once. When the value is `0`, the last instance of that
asset has disconnected.

Invoking this function is equivalent to a call to
[omphalos.event.on](/api/omphalos/event/on), and thus returns a function you can
use to cancel the event listener registration as needed.
