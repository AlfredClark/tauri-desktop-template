<script lang="ts">
  // 设置页：通用（界面语言，后端持久化）与外观（主题色，mode-watcher 前端持久化）两分组。
  // 语言切换是“先落盘后端、再重载前端”的两段提交，期间禁用下拉并给出 loading 提示。
  import { setMode, userPrefersMode } from "mode-watcher";
  import type { Locale } from "$libs/commands/types";
  import { configState, updateConfig } from "$hooks/config.svelte";
  import { ScrollArea } from "$components/shadcn-svelte/scroll-area";
  import { Switch } from "$components/shadcn-svelte/switch";
  import SettingRow from "$components/widget/settings/setting-row.svelte";
  import SettingSection from "$components/widget/settings/setting-section.svelte";
  import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from "$components/shadcn-svelte/select";
  import { m } from "$libs/i18n/paraglide/messages";
  import { getLocale, setLocale } from "$libs/i18n/paraglide/runtime";
  import { toast } from "$libs/utils/toast";

  /** 语言下拉的候选项：`items` 让触发器在下拉关闭时也能解析出展示文案。 */
  const localeItems: { value: Locale; label: string }[] = [
    { value: "en", label: m.settings_language_option_en() },
    { value: "zh-CN", label: m.settings_language_option_zh() },
  ];

  /** 主题下拉的候选项，同上。 */
  const themeItems: { value: "light" | "dark" | "system"; label: string }[] = [
    { value: "light", label: m.settings_theme_option_light() },
    { value: "dark", label: m.settings_theme_option_dark() },
    { value: "system", label: m.settings_theme_option_system() },
  ];

  /** 语言切换进行中时禁用下拉，避免重复提交。 */
  let switchingLocale = $state(false);

  /** 自启切换进行中时禁用开关，避免重复提交。 */
  let switchingAutostart = $state(false);

  /** 窗口记忆切换进行中时禁用开关，避免重复提交。 */
  let switchingRememberWindow = $state(false);

  /** 更新检查切换进行中时禁用开关，避免重复提交。 */
  let switchingAutoCheckUpdate = $state(false);

  // 后端配置是语言的唯一真值；水合完成前用 Paraglide 当前语言兜底，避免首帧闪空。
  const currentLocale = $derived<Locale>(configState.value?.locale ?? getLocale());

  // 开机自启同样以后端配置为真值；水合前按默认值关闭渲染。
  const autoStart = $derived(configState.value?.auto_start ?? false);

  // 记住窗口同样以后端配置为真值；水合前按默认值关闭渲染。
  const rememberWindow = $derived(configState.value?.remember_window ?? false);

  // 自动检查更新同样以后端配置为真值；水合前按默认值关闭渲染。
  const autoCheckUpdate = $derived(configState.value?.auto_check_update ?? false);

  /** 主题即时生效，仅前端持久化，不经过后端。 */
  function handleThemeChange(value: string): void {
    const theme = themeItems.find((item) => item.value === value)?.value;
    if (theme) setMode(theme);
  }

  /** 语言先经命令落盘后端，成功后再用 Paraglide 默认重载生效；失败则回滚并提示。 */
  async function handleLocaleChange(value: string): Promise<void> {
    const locale = localeItems.find((item) => item.value === value)?.value;
    if (!locale || locale === currentLocale || switchingLocale) return;
    switchingLocale = true;
    const toastId = toast.loading(m.settings_language_switching());
    await updateConfig({ locale });
    toast.dismiss(toastId);
    if (configState.value?.locale === locale) {
      toast.success(m.settings_language_updated());
      setLocale(locale);
    } else {
      toast.error(m.settings_language_update_failed());
    }
    switchingLocale = false;
  }

  /** 开机自启经命令落盘后端并同步操作系统；失败不乐观更新，开关自动回滚。 */
  async function handleAutostartChange(checked: boolean): Promise<void> {
    if (checked === autoStart || switchingAutostart) return;
    switchingAutostart = true;
    await updateConfig({ auto_start: checked });
    if (configState.value?.auto_start === checked) {
      toast.success(m.settings_autostart_updated());
    } else {
      toast.error(m.settings_autostart_update_failed());
    }
    switchingAutostart = false;
  }

  /** 记住窗口经命令落盘后端，次启动生效；失败不乐观更新，开关自动回滚。 */
  async function handleRememberWindowChange(checked: boolean): Promise<void> {
    if (checked === rememberWindow || switchingRememberWindow) return;
    switchingRememberWindow = true;
    await updateConfig({ remember_window: checked });
    if (configState.value?.remember_window === checked) {
      toast.success(m.settings_remember_window_updated());
    } else {
      toast.error(m.settings_remember_window_update_failed());
    }
    switchingRememberWindow = false;
  }

  /** 自动检查更新经命令落盘后端，次启动生效；失败不乐观更新，开关自动回滚。 */
  async function handleAutoCheckUpdateChange(checked: boolean): Promise<void> {
    if (checked === autoCheckUpdate || switchingAutoCheckUpdate) return;
    switchingAutoCheckUpdate = true;
    await updateConfig({ auto_check_update: checked });
    if (configState.value?.auto_check_update === checked) {
      toast.success(m.settings_auto_check_update_updated());
    } else {
      toast.error(m.settings_auto_check_update_failed());
    }
    switchingAutoCheckUpdate = false;
  }
</script>

<!-- 页面级纵向滚动：内容超高时在视口内滚动；内层保持水平居中、垂直置顶 -->
<ScrollArea class="h-full w-full">
  <div class="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6">
    <h1 class="text-2xl font-medium">{m.page_settings_title()}</h1>

    <SettingSection
      title={m.settings_general_title()}
      description={m.settings_general_description()}
    >
      <SettingRow
        label={m.settings_language_label()}
        description={m.settings_language_description()}
      >
        {#snippet control()}
          <Select
            type="single"
            value={currentLocale}
            items={localeItems}
            onValueChange={handleLocaleChange}
            disabled={switchingLocale}
          >
            <SelectTrigger class="w-44" aria-label={m.settings_language_label()}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">{m.settings_language_option_en()}</SelectItem>
              <SelectItem value="zh-CN">{m.settings_language_option_zh()}</SelectItem>
            </SelectContent>
          </Select>
        {/snippet}
      </SettingRow>
      <SettingRow
        label={m.settings_autostart_label()}
        description={m.settings_autostart_description()}
      >
        {#snippet control()}
          <Switch
            checked={autoStart}
            onCheckedChange={handleAutostartChange}
            disabled={switchingAutostart}
            aria-label={m.settings_autostart_label()}
          />
        {/snippet}
      </SettingRow>
      <SettingRow
        label={m.settings_remember_window_label()}
        description={m.settings_remember_window_description()}
      >
        {#snippet control()}
          <Switch
            checked={rememberWindow}
            onCheckedChange={handleRememberWindowChange}
            disabled={switchingRememberWindow}
            aria-label={m.settings_remember_window_label()}
          />
        {/snippet}
      </SettingRow>
      <SettingRow
        label={m.settings_auto_check_update_label()}
        description={m.settings_auto_check_update_description()}
      >
        {#snippet control()}
          <Switch
            checked={autoCheckUpdate}
            onCheckedChange={handleAutoCheckUpdateChange}
            disabled={switchingAutoCheckUpdate}
            aria-label={m.settings_auto_check_update_label()}
          />
        {/snippet}
      </SettingRow>
    </SettingSection>

    <SettingSection
      title={m.settings_appearance_title()}
      description={m.settings_appearance_description()}
    >
      <SettingRow label={m.settings_theme_label()} description={m.settings_theme_description()}>
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
      </SettingRow>
    </SettingSection>
  </div>
</ScrollArea>
