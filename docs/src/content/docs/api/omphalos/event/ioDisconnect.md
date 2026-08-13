---
title: omphalos.event.ioDisconnect
sidebar:
  label: ioDisconnect
  badge:
    variant: tip
    text: Client
---

```js
omphalos.event.ioDisonnect(() => {
  omphalos.log.debug(`asset ${omphalos.asset.name} has disconnected`);
})
```

:::caution[Client only]
This item is only present in the API object in [[panels]] and [[graphics]]; it is
not present in the API that is given to [[extensions]].
:::

This event is raised whenever the asset has been disconnected from the back end
system.

Invoking this function is equivalent to a call to [[omphalos.event.on()]], and
thus returns a function you can use to cancel the event listener registration
as needed.
