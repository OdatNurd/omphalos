<script>
  import { link } from 'svelte-spa-router';
  import active from 'svelte-spa-router/active';

  let { href = '/', label = 'No Label', children } = $props();
</script>


<a {href} role="tab" use:link use:active={{ path: href, className: 'tab-active' }} class="tab tab-lg" aria-label={label}>
  {@render children?.()}
</a>