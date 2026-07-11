<script>
  import { useLocation } from "svelte-navigator";
  import { link } from 'svelte-navigator';

  const location = useLocation();

  // Active state follows the URL of the current location.
  const isActive = (location) => {
    if (href === location.pathname) {
      return 'tab-bordered tab-active';
    }

    return '';
  }

  export let href='/';
  export let label='No Label';
</script>


<a {href} use:link class="tab tab-lg {isActive($location)}" aria-label={label}>
  <slot></slot>
</a>