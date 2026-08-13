<script>
  let { children } = $props();
</script>

<div class="bg-base-100 m-4 w-full">
  <div class="container w-full text-base-content mx-auto flex items-center justify-center">
    {@render children?.()}
  </div>
</div>