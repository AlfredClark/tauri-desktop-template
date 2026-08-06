<script lang="ts">
  import LayoutContainer from "$components/layout/LayoutContainer.svelte";
  let { children } = $props();
</script>

<LayoutContainer>
  {@render children()}
</LayoutContainer>
