---
title: omphalos.event.peerConnected
sidebar:
  label: peerConnected
---

```js
omphalos.event.peerConnected((payload) => {
  omphalos.log.debug(`asset ${omphalos.asset.name} in my bundle has connected`);
});

omphalos.event.peerConnected('other-bundle', (payload) => {
  omphalos.log.debug(`asset ${omphalos.asset.name} in other-bundle has connected`);
});
```

This event is raised to indicate that a peer asset has connected to the back end
and is ready to communicate.

This event gets a payload of:

```js
{
  type: "string", // "panel" | "graphic" | "system"
  name: "string", // The configured name of the asset
  count: "number" // Total active connections for this specific asset
}
```

The `count` is always `>=1`, given that more than one instance of any given
asset can be loaded at once.

This event is always raised after [[omphalos.event.ioConnect()]] is issued for
the current asset.

Invoking this function is equivalent to a call to [[omphalos.event.on()]], and
thus returns a function you can use to cancel the event listener registration
as needed.
