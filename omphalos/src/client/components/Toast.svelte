<script>
  import Icon from './Icon.svelte';
  import { toast } from '$lib/toast.svelte.js';

  let { id, type, message } = $props();

  const style = {
    "message": ["",              "circle-check:solid"],
    "error":   ["alert-error",   "circle-xmark:regular"],
    "warning": ["alert-warning", "triangle-exclamation:solid"],
    "info":    ["alert-info",    "circle-info:solid"],
    "success": ["alert-success", "circle-check:regular"],
  }
</script>

<div class="alert {style[type][0]} shadow-lg relative pr-10 pointer-events-auto">
  <div>
    <Icon name={style[type][1]} size="1rem" />
    <span>{message}</span>
  </div>
  <button
    onclick={() => toast.dismiss(id)}
    class="btn btn-ghost btn-xs btn-circle absolute top-2 right-2 text-inherit hover:bg-black/20"
    aria-label="Dismiss"
  >
    <Icon name="xmark:solid" size="1rem" />
  </button>
</div>
