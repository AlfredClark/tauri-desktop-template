import { toast as sonnerToast, type ExternalToast } from "svelte-sonner";

/** 全局默认停留时长：统一各业务提示的消失节奏，避免各处散落魔数。 */
const DEFAULT_DURATION = 3000;

/** 补齐默认时长，调用方显式传入的选项优先。 */
function withDefaults(options?: ExternalToast): ExternalToast {
  return { duration: DEFAULT_DURATION, ...options };
}

/** 全局通用提示：收敛 svelte-sonner 入口，统一默认时长。 */
export const toast = {
  /** 普通消息提示。 */
  message(message: string, options?: ExternalToast): string | number {
    return sonnerToast.message(message, withDefaults(options));
  },

  /** 成功提示。 */
  success(message: string, options?: ExternalToast): string | number {
    return sonnerToast.success(message, withDefaults(options));
  },

  /** 信息提示。 */
  info(message: string, options?: ExternalToast): string | number {
    return sonnerToast.info(message, withDefaults(options));
  },

  /** 警告提示。 */
  warning(message: string, options?: ExternalToast): string | number {
    return sonnerToast.warning(message, withDefaults(options));
  },

  /** 错误提示。 */
  error(message: string, options?: ExternalToast): string | number {
    return sonnerToast.error(message, withDefaults(options));
  },

  /** 加载中提示，需配合关闭。 */
  loading(message: string, options?: ExternalToast): string | number {
    return sonnerToast.loading(message, withDefaults(options));
  },

  /** 异步任务提示：按结算状态自动切换成功 / 失败文案。 */
  promise: sonnerToast.promise,

  /** 关闭指定或全部提示。 */
  dismiss: sonnerToast.dismiss,
};
