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

}

export default constants;