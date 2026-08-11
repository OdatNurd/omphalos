---
title: Events
sidebar:
  order: 7
---

Omphalos allows [panels](/guides/panels), [graphics](/guides/graphics) and
[extensions](/guides/extensions) to communicate with each other via events.
This is supported both for intra-bundle communications, as well as for
communications between bundles as well, as desired.

Events are transmitted via websocket to the destination locations, which  means
that they can only be delivered to peers that are connected.


## Generic Events

The [API](/api/api) has an `event` object that supports the
following generic operations :
 - [raise](/api/omphalos/event/raise) to raise an event within your bundle
 - [raiseToBundle](/api/omphalos/event/raisetobundle) to raise an event to
   an external bundle
 - [on](/api/omphalos/event/on) to listen for an event that has been raised.

All events are represented by a string name, and can carry an arbitrary payload
of `JSON-encodable` data. The payload is delivered as-is as the argument to the
callback of the event handler set by
[omphalos.event.on](/api/omphalos/event/on).

Events are delivered to everything within the targeted bundle, with the sole
exception of the bundle member that raises the event.

:::caution[reserved names]
Event names that start with `__sys` are reserved by Omphalos for system events;
you should not use them in your own events.
:::


## System Events

In addition to generic events, there are also a number of system defined events
that provide bundle members with information about the state of the system in
general, such as knowing when they are connected or disconnected from the event
system.

These take the form of specialized versions of the
[omphalos.event.on](/api/omphalos/event/on) handler which listen for specific
events.

See the API documentation for full details on what is available; the most
commonly used events are:
- [ioConnect](/api/omphalos/event/ioconnect) to know when you are connected
- [ioDisconnect](/api/omphalos/event/iodisconnect) to know if you have become
  disconnected from the system
- [peerConnected](/api/omphalos/event/peerconnected) to know if one of the peers
  in your bundle or in another bundle have connected (e.g. so that you can
  transmit events to them)
- [peerDisconnected](/api/omphalos/event/peerdisconnected) to know if one of the
  peers in your bundle or in another bundle have been disconnected.
