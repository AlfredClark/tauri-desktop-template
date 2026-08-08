<script lang="ts">
  import AppearanceSettings from "$components/pages/settings/AppearanceSettings.svelte";
  import SystemSettings from "$components/pages/settings/SystemSettings.svelte";
  import { m } from "$libs/i18n/paraglide/messages";
</script>

<div class="mx-auto w-full max-w-2xl space-y-8 p-6">
  <section class="space-y-3">
    <h2 class="text-lg font-semibold">{m.settings_section_appearance()}</h2>
    <div class="divide-y rounded-lg border">
      <AppearanceSettings />
    </div>
  </section>

  <section class="space-y-3">
    <h2 class="text-lg font-semibold">{m.settings_section_system()}</h2>
    <div class="divide-y rounded-lg border">
      <SystemSettings />
    </div>
  </section>
</div>
