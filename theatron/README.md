# Theatron

Theatron is a small sample Omphalos bundle that aims to provide a suite of
useful streaming tools that you can use to check out what Omphalos can do right
out of the box by creating a simple stream setup.

In this regard, Theatron is intended to be a stream provider agnostic set of
ready to use streaming tools. Use them to try out Omphalos, or as the basis of
your own setup.

The following items are planned (in no particular order):

- [ ] Suite of Lower Thirds
    Multiple animated styles, which should be theme-able and trigger-able via a
    panel or via the API

- [ ] Social Banner / Call To Action Rotator
    Corner popups that you could use to promote your Twitter, YouTube, etc on
    an animated, rotating basis.

- [ ] Image Carousel
    For artists or streamers with a portfolio; a rotating image carousel of
    custom images.

- [ ] Broadcast Slates
    Full page overlays for stream starting, BRB, and stream ending, with
    integrated timers.

- [ ] On Screen Timer
    A simple timer for counting up or counting down that can be started and
    stopped via the panel or an API.

- [ ] Persistent corner "bug"
    A small corner watermark for streamer logo

- [ ] OBS Bridge
    A simple server side extension that allows for a connection to OBS, and
    which implements an OBS-WebSocket proxy via events, so that any bundle can
    interface with OBS without having to self-implement.
