<script lang="ts">
  import LayoutContainer from "$components/layouts/LayoutContainer.svelte";
  let { children } = $props();
</script>

<LayoutContainer>
  {@render children()}
</LayoutContainer>
