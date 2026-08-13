<script>
  import { toast } from '$lib/toast.svelte.js'
  import { flip } from 'svelte/animate';
  import { fly } from 'svelte/transition';

  import Toast from './Toast.svelte';
</script>

<div class="flex flex-col justify-start items-center z-50 fixed top-[80px] left-0 right-0 p-0 m-0 pointer-events-none">
  {#each toast.list as notification (notification.id)}
    <div animate:flip class="mb-2 min-w-[50%]">
      <div transition:fly={{ y: 30 }}>
        <Toast type={notification.type} message={notification.message} />
      </div>
    </div>
  {/each}
</div>
