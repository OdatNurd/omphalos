---
title: omphalos.form.load
sidebar:
  label: load
  badge:
    variant: tip
    text: Client
---

```js
function omphalos.form.load(formOrFormName)
```

:::caution[Client only]
This item is only present in the API object in [[panels]] and [[graphics]]; it is
not present in the API that is given to [[extensions]].
:::

Load the state of a given form from the storage system as saved by a call to
[[omphalos.form.save()]] and apply it directly to the DOM.

`formOrFormName` can be:

- A form name, e.g. `"myForm"` for `<form name="myForm">` or `<form id="myForm">`
- An instance of `HTMLFormElement`
- A selector to pass to `document.querySelector`, which will resolve to the
  first matching element (e.g. `"#player-settings"` or `".config-form"`).

All fields associated with the form will be pulled. Any that have an attribute
of `data-var` will be loaded directly from storage via a call to
[[omphalos.storage.get()]]. All other values are loaded using their `name`
attribute in an internal meta-key that encodes the name of the form. Form
fields that have no `name` will be skipped, unless they have the `data-var`
attribute.

If a field has no stored value, it is left untouched so that native
HTML defaults are preserved.

Calls to this function will raise two [[events]] that can be listened for:

- [[omphalos.event.formPreLoad()]], which will trigger prior to the load
  finishing but after the data has been loaded. You can mutate the payload of
  the event to control how the load proceeds.
- [[omphalos.event.formPostLoad()]], which triggers after the load has
  completed.
