const constants = {
  /* The predefined name of the system bundle; this is used by various internals
   * that are used to transmit messages along the same communications lines as
   * user defined messages to direct them specifically to the system only. */
  SYSTEM_BUNDLE: '__omphalos_system__',

  /* This message is transmitted from the server to an overlay when the user
   * uses the dashboard to ask an overlay to reload itself. */
  MSG_RELOAD: '__sys_reload',

  /* This message is transmitted between the server code and the dashboard to
   * provide updates about what panels and overlays are currently connected so
   * that the dashboard can display appropriate status.*/
  MSG_CONNECTIONS_UPDATE: '__sys_socket_upd',

  /* This message is transmitted between the server code and client side panels
   * and graphics whenever they connect to the server to give them a complete
   * picture of what their bundle's shared persistent storage looks like.
   *
   * This message always conveys a complete set of key-value pairs for the
   * bundle in question. */
  MSG_STORAGE_REFRESH: '__sys_storage_refresh',

  /* This message is a two way message between the client and the server code
   * that transmits details on changes to stored settings, conveying a
   * key that has changed and the new value (which can be undefined if the key
   * was removed).
   *
   * Client code sends this to the system bundle, which handles the update and
   * propagates it out to everyone else in the bundle. */
  MSG_STORAGE_UPDATE: '__sys_storage_update',
}

export default constants;