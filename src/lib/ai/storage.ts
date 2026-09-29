import type { ProviderConfigInput } from './providers';

const STORAGE_KEY = 'mahjong-ai-providers';

export interface AiSettings {
  activeProviderId: string;
  configs: Record<string, ProviderConfigInput>;
}

export const DEFAULT_AI_SETTINGS: AiSettings = {
  activeProviderId: 'coze',
  configs: {},
};

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

export function loadAiSettings(): AiSettings {
  if (!isBrowser()) return DEFAULT_AI_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_AI_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<AiSettings>;
    return {
      activeProviderId: parsed.activeProviderId || DEFAULT_AI_SETTINGS.activeProviderId,
      configs: parsed.configs && typeof parsed.configs === 'object' ? parsed.configs : {},
    };
  } catch {
    return DEFAULT_AI_SETTINGS;
  }
}

export function saveAiSettings(settings: AiSettings): boolean {
  if (!isBrowser()) return false;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    return true;
  } catch {
    // 隐私模式或配额不足
    return false;
  }
}

/** 取当前启用厂商的配置；未配置过时返回只有 providerId 的空配置 */
export function getActiveProviderConfig(settings: AiSettings): ProviderConfigInput {
  return settings.configs[settings.activeProviderId] ?? { providerId: settings.activeProviderId };
}

export function upsertProviderConfig(
  settings: AiSettings,
  providerId: string,
  patch: Omit<ProviderConfigInput, 'providerId'>,
): AiSettings {
  return {
    ...settings,
    configs: {
      ...settings.configs,
      [providerId]: { providerId, ...patch },
    },
  };
}

export function removeProviderConfig(settings: AiSettings, providerId: string): AiSettings {
  const rest = { ...settings.configs };
  delete rest[providerId];
  return {
    activeProviderId: settings.activeProviderId === providerId ? 'coze' : settings.activeProviderId,
    configs: rest,
  };
}

export function isProviderConfigured(settings: AiSettings, providerId: string): boolean {
  const config = settings.configs[providerId];
  if (!config) return false;
  return Boolean(config.apiKey || providerId === 'coze');
}
