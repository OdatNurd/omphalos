---
title: Graphics
sidebar:
  order: 3
---

This page would discuss graphics, which are simple `html` pages that you write
that Omphalos will serve out to your stream software (e.g. `obs`) and can
display anything you like.

There is a section in the manifest that controls graphics; probably talk about
that more here and have the manifest page only briefly cover the options and
link here or whatever.

When the HTML for graphics loads, it has default CSS rules applied for simple
consistency; you are of course free to override any and all style rules as you
see fit; the defaults are just to give a base to work from.

```css
body {
  background: darkorchid;
  color: white;
  font-size: 32px;
}
```

When graphics load, [[omphalos.config]] is set to the configuration under which
Omphalos is currently running. This is the same configuration as is loaded from
the configuration files.

In addition, a global variables named [[omphalos]] is set up to provide an API
to the graphic that allows it to interface with the system.
