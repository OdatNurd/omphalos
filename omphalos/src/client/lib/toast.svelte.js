// =============================================================================


/* This simple function will return back a random unique ID value to be used
 * on the toast notfications, since Svelte needs something to distinguish
 * components when they're added to the DOM to know how to update things. */
const _id = () => '_' + Math.random().toString(36).substr(2, 9)


// =============================================================================


/* Holds our toast notification messages as reactive state; notifications are
 * auto-removed a short time after they are added. This acts as a queue where
 * only the oldest notification is timed out at a time, creating a cascading
 * effect. */
class NotificationState {
  list = $state([]);
  #timer = null;

  /* Process the queue by setting a timeout for the first item. When it
   * expires, it removes the item and recursively calls itself to process
   * the next item if one exists. */
  #processQueue() {
    if (this.list.length > 0 && this.#timer === null) {
      this.#timer = setTimeout(() => {
        this.list.shift();
        this.#timer = null;
        this.#processQueue();
      }, this.list[0].timeout);
    }
  }

  /* The core method for adding in a notification; this appends a new record
   * to the notification list and kicks off the queue processing if it is
   * not already running. */
  #send(message, type, timeout) {
    const notification = { id: _id(), type, message, timeout };
    this.list.push(notification);
    this.#processQueue();
  }

  message = (msg, timeout) => this.#send(msg, 'message', timeout ?? 1000);
  info = (msg, timeout) => this.#send(msg, 'info', timeout ?? 1000);
  warning = (msg, timeout) => this.#send(msg, 'warning', timeout ?? 1000);
  success = (msg, timeout) => this.#send(msg, 'success', timeout ?? 1000);
  error = (msg, timeout) => this.#send(msg, 'error', timeout ?? 1000);
}


// =============================================================================


/* Create a notification state object to be used for our toast mechanism and
 * export it for the layout to use. */
export const toast = new NotificationState()

window.toast = toast;


// =============================================================================
