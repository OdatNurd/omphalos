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
This item is only present in the API object in `panels` and `graphics`; it is
not present in the API that is given to the `extension`.
:::

Load the state of a given form from the storage system as saved by a call to
[omphalos.form.save][1] and apply it directly to the DOM.

`formOrFormName` can be:

- A form name, e.g. `"myForm"` for `<form name="myForm">` or `<form id="myForm">`
- An instance of `HTMLFormElement`
- A selector to pass to `document.querySelector`, which will resolve to the
  first matching element (e.g. `"#player-settings"` or `".config-form"`).

All fields associated with the form will be pulled. Any that have an attribute
of `data-var` will be loaded directly from storage via a call to
[omphalos.bundleVars.get][2]. All other values are loaded using their `name`
attribute in an internal meta-key that encodes the name of the form. Form
fields that have no `name` will be skipped, unless they have the `data-var`
attribute.

If a field has no stored value, it is left untouched so that native
HTML defaults are preserved.

Calls to this function will raise two [events][4] that can be listened for via
a call to [omphalos.listenFor][3]:

- `EVENT_FORM_PRE_LOAD`, which will trigger prior to the load finishing but
  after the data has been loaded. You can mutate the payload of the event to
  control how the load proceeds.
- `EVENT_FORM_POST_LOAD`, which triggers after the load has completed.

  [1]: /api/omphalos/form/save
  [2]: /api/omphalos/bundlevars/get
  [3]: /api/omphalos/listenfor/
  [4]: /api/omphalos/constants/