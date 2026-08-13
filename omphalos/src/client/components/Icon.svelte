<script>
  let { name, size } = $props();

  let { icon, base } = $derived.by(() => {
    const [icon, base = "solid"] = (name || "").split(":");
    return { icon, base };
  });
</script>

<font-awesome-icon style="font-size: {size};" class="fa-{base} fa-{icon}"></font-awesome-icon>