<script lang="ts">
  // 外观设置分组：主题/布局/字重/字号简单行 + 字体选择器，纯前端持久化，零 props。
  // 主题经 mode-watcher、布局与字体经外观 hook 即时生效，均不经过后端。
  import { setMode, userPrefersMode } from "mode-watcher";
  import type { LayoutName } from "$hooks/appearance.svelte";
  import {
    FONT_SIZE_OPTIONS,
    FONT_WEIGHT_STEP,
    fontState,
    layoutState,
    MAX_FONT_WEIGHT,
    MIN_FONT_WEIGHT,
    setFontSize,
    setFontWeight,
    setLayoutName,
  } from "$hooks/appearance.svelte";
  import { Slider } from "$components/shadcn-svelte/slider";
  import CardRow from "$components/common/card-row.svelte";
  import CardSection from "$components/common/card-section.svelte";
  import FontFamilyPicker from "$components/widget/settings/font-family-picker.svelte";
  import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from "$components/shadcn-svelte/select";
  import { m } from "$libs/i18n/paraglide/messages";

  /** 主题下拉的候选项：`items` 让触发器在下拉关闭时也能解析出展示文案。 */
  const themeItems: { value: "light" | "dark" | "system"; label: string }[] = [
    { value: "light", label: m.settings_theme_option_light() },
    { value: "dark", label: m.settings_theme_option_dark() },
    { value: "system", label: m.settings_theme_option_system() },
  ];

  /** 布局下拉的候选项，同上。 */
  const layoutItems: { value: LayoutName; label: string }[] = [
    { value: "tabs", label: m.settings_layout_option_tabs() },
    { value: "sidebar", label: m.settings_layout_option_sidebar() },
  ];

  /** 字号下拉的候选项，同上；取值存字符串，提交时收窄为数值。 */
  const fontSizeItems: { value: string; label: string }[] = FONT_SIZE_OPTIONS.map((size) => ({
    value: String(size),
    label: `${size}%`,
  }));

  /** 主题即时生效，仅前端持久化，不经过后端。 */
  // 入参用 `string` 是 `bits-ui` 的 `onValueChange` 约束，内部经候选项收窄后才生效，无类型断言
  function handleThemeChange(value: string): void {
    const theme = themeItems.find((item) => item.value === value)?.value;
    if (theme) setMode(theme);
  }

  /** 布局即时生效，仅前端 `localStorage` 持久化，不经过后端。 */
  // 同上：`bits-ui` 给 `string`，经 `layoutItems` 收窄为 `LayoutName` 后才提交
  function handleLayoutChange(value: string): void {
    const layout = layoutItems.find((item) => item.value === value)?.value;
    if (layout) setLayoutName(layout);
  }

  /** 字重即时生效，同上；单值滑块直接给数值。 */
  function handleFontWeightChange(value: number): void {
    setFontWeight(value);
  }

  /** 字号即时生效，同上；下拉给字符串，经候选项收窄为数值后提交。 */
  function handleFontSizeChange(value: string): void {
    const size = fontSizeItems.find((item) => item.value === value)?.value;
    if (size !== undefined) setFontSize(Number(size));
  }
</script>

<CardSection
  title={m.settings_appearance_title()}
  description={m.settings_appearance_description()}
>
  <CardRow label={m.settings_theme_label()} description={m.settings_theme_description()}>
    {#snippet control()}
      <Select
        type="single"
        value={userPrefersMode.current}
        items={themeItems}
        onValueChange={handleThemeChange}
      >
        <SelectTrigger class="w-44" aria-label={m.settings_theme_label()}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="light">{m.settings_theme_option_light()}</SelectItem>
          <SelectItem value="dark">{m.settings_theme_option_dark()}</SelectItem>
          <SelectItem value="system">{m.settings_theme_option_system()}</SelectItem>
        </SelectContent>
      </Select>
    {/snippet}
  </CardRow>
  <CardRow label={m.settings_layout_label()} description={m.settings_layout_description()}>
    {#snippet control()}
      <Select
        type="single"
        value={layoutState.name}
        items={layoutItems}
        onValueChange={handleLayoutChange}
      >
        <SelectTrigger class="w-44" aria-label={m.settings_layout_label()}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="tabs">{m.settings_layout_option_tabs()}</SelectItem>
          <SelectItem value="sidebar">{m.settings_layout_option_sidebar()}</SelectItem>
        </SelectContent>
      </Select>
    {/snippet}
  </CardRow>
  <FontFamilyPicker />
  <CardRow
    label={m.settings_font_weight_label()}
    description={m.settings_font_weight_description()}
  >
    {#snippet control()}
      <div
        class="flex w-44 items-center gap-3"
        role="group"
        aria-label={m.settings_font_weight_label()}
      >
        <Slider
          type="single"
          value={fontState.weight}
          min={MIN_FONT_WEIGHT}
          max={MAX_FONT_WEIGHT}
          step={FONT_WEIGHT_STEP}
          onValueChange={handleFontWeightChange}
        />
        <span class="w-8 shrink-0 text-right text-sm text-muted-foreground tabular-nums">
          {fontState.weight}
        </span>
      </div>
    {/snippet}
  </CardRow>
  <CardRow label={m.settings_font_size_label()} description={m.settings_font_size_description()}>
    {#snippet control()}
      <Select
        type="single"
        value={String(fontState.size)}
        items={fontSizeItems}
        onValueChange={handleFontSizeChange}
      >
        <SelectTrigger class="w-44" aria-label={m.settings_font_size_label()}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {#each fontSizeItems as item (item.value)}
            <SelectItem value={item.value}>{item.label}</SelectItem>
          {/each}
        </SelectContent>
      </Select>
    {/snippet}
  </CardRow>
</CardSection>
