<script lang="ts">
  import { Label } from "$components/ui/label";
  import { Select, SelectContent, SelectItem, SelectTrigger } from "$components/ui/select";
  import { changeLocale, getLocale, type Locale } from "$libs/i18n";
  import { m } from "$libs/i18n/paraglide/messages";
  import { settings, type ColorScheme, type LayoutName, type ThemeName } from "$libs/stores";

  const { colorScheme, layout, theme } = settings;

  /** 语言选项：value 即后端 locale 标签（Locale 校验域） */
  const localeOptions = [
    { value: "en", label: m.language_en },
    { value: "zh-CN", label: m.language_zh_cn },
  ] as const;

  /** 颜色模式选项：value 即 ColorScheme 值域 */
  const colorOptions = [
    { value: "system", label: m.theme_system },
    { value: "light", label: m.theme_light },
    { value: "dark", label: m.theme_dark },
  ] as const;

  /** 布局选项：value 即 LayoutName 值域 */
  const layoutOptions = [
    { value: "default", label: m.layout_default },
    { value: "baseline", label: m.layout_baseline },
  ] as const;

  /** 主题选项：value 即 ThemeName 值域，与官方主题一一对应 */
  const themeOptions = [
    { value: "neutral", label: m.theme_neutral },
    { value: "stone", label: m.theme_stone },
    { value: "zinc", label: m.theme_zinc },
    { value: "mauve", label: m.theme_mauve },
    { value: "olive", label: m.theme_olive },
    { value: "mist", label: m.theme_mist },
    { value: "taupe", label: m.theme_taupe },
    { value: "amber", label: m.theme_amber },
    { value: "blue", label: m.theme_blue },
    { value: "cyan", label: m.theme_cyan },
    { value: "emerald", label: m.theme_emerald },
    { value: "fuchsia", label: m.theme_fuchsia },
    { value: "green", label: m.theme_green },
    { value: "indigo", label: m.theme_indigo },
    { value: "lime", label: m.theme_lime },
    { value: "orange", label: m.theme_orange },
    { value: "pink", label: m.theme_pink },
    { value: "purple", label: m.theme_purple },
    { value: "red", label: m.theme_red },
    { value: "rose", label: m.theme_rose },
    { value: "sky", label: m.theme_sky },
    { value: "teal", label: m.theme_teal },
    { value: "violet", label: m.theme_violet },
    { value: "yellow", label: m.theme_yellow },
  ] as const;

  // 语言真相源为 config.json：启动时经 initLocale 与 paraglide 同步，此处以 getLocale 为初始值
  let locale = $state<Locale>(getLocale());

  // 选中项文本（Select.Trigger 需调用方渲染；未知值回退首个选项）
  const localeLabel = $derived(localeOptions.find((opt) => opt.value === locale)?.label() ?? localeOptions[0].label());
  const colorLabel = $derived(colorOptions.find((opt) => opt.value === $colorScheme)?.label() ?? colorOptions[0].label());
  const layoutLabel = $derived(layoutOptions.find((opt) => opt.value === $layout)?.label() ?? layoutOptions[0].label());
  const themeLabel = $derived(themeOptions.find((opt) => opt.value === $theme)?.label() ?? themeOptions[0].label());

  /** 语言切换：乐观更新选中态 → changeLocale（后端落盘成功才切前端并 reload）；失败回滚 */
  async function handleLocaleChange(value: string | undefined) {
    if (!value || value === locale) return;
    const previous = locale;
    locale = value as Locale;
    const ok = await changeLocale(value as Locale);
    if (!ok) locale = previous;
  }

  /** 颜色模式切换：直接写前端偏好 store，主题应用已由 storeDef subscribe 声明式注入 */
  function handleColorChange(value: string | undefined) {
    if (value && value !== $colorScheme) colorScheme.set(value as ColorScheme);
  }

  /** 布局切换：直接写前端偏好 store，布局容器订阅自动切换 */
  function handleLayoutChange(value: string | undefined) {
    if (value && value !== $layout) layout.set(value as LayoutName);
  }

  /** 主题切换：直接写前端偏好 store，data-theme 应用由 storeDef subscribe 声明式注入 */
  function handleThemeChange(value: string | undefined) {
    if (value && value !== $theme) theme.set(value as ThemeName);
  }
</script>

<div class="flex items-center justify-between gap-4 px-4 py-4">
  <div class="space-y-1">
    <Label>{m.settings_language()}</Label>
    <p class="text-sm text-muted-foreground">{m.settings_language_description()}</p>
  </div>
  <Select type="single" value={locale} onValueChange={handleLocaleChange}>
    <SelectTrigger class="w-40">
      {localeLabel}
    </SelectTrigger>
    <SelectContent>
      {#each localeOptions as opt (opt.value)}
        <SelectItem value={opt.value}>{opt.label()}</SelectItem>
      {/each}
    </SelectContent>
  </Select>
</div>

<div class="flex items-center justify-between gap-4 px-4 py-4">
  <div class="space-y-1">
    <Label>{m.settings_color_scheme()}</Label>
    <p class="text-sm text-muted-foreground">{m.settings_color_scheme_description()}</p>
  </div>
  <Select type="single" value={$colorScheme} onValueChange={handleColorChange}>
    <SelectTrigger class="w-40">
      {colorLabel}
    </SelectTrigger>
    <SelectContent>
      {#each colorOptions as opt (opt.value)}
        <SelectItem value={opt.value}>{opt.label()}</SelectItem>
      {/each}
    </SelectContent>
  </Select>
</div>

<div class="flex items-center justify-between gap-4 px-4 py-4">
  <div class="space-y-1">
    <Label>{m.settings_theme()}</Label>
    <p class="text-sm text-muted-foreground">{m.settings_theme_description()}</p>
  </div>
  <Select type="single" value={$theme} onValueChange={handleThemeChange}>
    <SelectTrigger class="w-40">
      {themeLabel}
    </SelectTrigger>
    <SelectContent class="max-h-72">
      {#each themeOptions as opt (opt.value)}
        <SelectItem value={opt.value}>{opt.label()}</SelectItem>
      {/each}
    </SelectContent>
  </Select>
</div>

<div class="flex items-center justify-between gap-4 px-4 py-4">
  <div class="space-y-1">
    <Label>{m.settings_layout()}</Label>
    <p class="text-sm text-muted-foreground">{m.settings_layout_description()}</p>
  </div>
  <Select type="single" value={$layout} onValueChange={handleLayoutChange}>
    <SelectTrigger class="w-40">
      {layoutLabel}
    </SelectTrigger>
    <SelectContent>
      {#each layoutOptions as opt (opt.value)}
        <SelectItem value={opt.value}>{opt.label()}</SelectItem>
      {/each}
    </SelectContent>
  </Select>
</div>
