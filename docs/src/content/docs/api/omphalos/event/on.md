---
title: omphalos.event.on
sidebar:
  label: on
---

```js
function omphalos.event.on(event, listener)
function omphalos.event.on(event, bundle, listener)
```

Listen for a given event to arrive and, when it does, invoke the listener with
the payload of the event as an argument.

By default the event is listened for in the current bundle; to listen for
events that were sent to some other bundle, pass that as the second argument to
the function.

The return value of both functions is a function that can be used to cancel the
callback.

This listens for events that are raised by
[omphalos.event.raise](/api/omphalos/event/raise)
and [omphalos.event.raiseToBundle](/api/omphalos/event/raisetobundle).

:::note[variable arguments]
With only two arguments, the `bundle` is inferred to be the current bundle;
thus you only need to include it in the argument list when you want to listen
for outside events.
:::

:::caution[reserved names]
Event names that start with `__sys` are reserved by Omphalos for system events;
you should not use them in your own events.
:::
