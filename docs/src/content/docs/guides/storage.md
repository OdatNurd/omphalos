---
title: Storage
sidebar:
  order: 7
---

Omphalos allows for persistent storage, which is saved on the server in a
per-`bundle` way. This is an open ended system that allows for any number of
variables to be saved and persisted across sessions as well as shared between
[panels](/guides/panels), [graphics](/guides/graphics) and
[extensions](/guides/extensions).

The [API](/api) has a `bundleVars` object that supports the
following operations:
 - [setting](/api/omphalos/bundlevars/set) the value
 - [getting](/api/omphalos/bundlevars/get) the value
 - [deleting](/api/omphalos/bundlevars/delete) the variable
 - [notification](/api/omphalos/bundlevars/on) of changes


The storage systems allows any value to be persisted, with the only
restriction that it be `JSON-encodable`.

## Skepsis

The above API allows for simple, granular access to variables. When a variable
is used frequently in the code, a better option is often to use a
[Skepsis](/api/omphalos/skepsis) instead.

This is a simple object that wraps a particular variable; it's `.value`
property is always the most recent value, changing the value of this property
automatically sends an update to peers.

If the value of the `Skepsis` is an object or array, the `.update()` method can
be used to force an update, such as when there was a change to the inner object
(a property change or adding a new element to an array).
