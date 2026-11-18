import { useEffect, useState } from 'react';

/** 설정에서 켜고 끄는 기능 스위치. 이 브라우저(기기)에만 저장된다. */
export const FEATURE_FLAG_EVENT = 'prism-feature-flags-changed';

export type FeatureFlagKey = 'browser_control';

const DEFAULTS: Record<FeatureFlagKey, boolean> = {
  browser_control: false,
};

const storageKey = (key: FeatureFlagKey) => `prism_feature_${key}`;

export function getFeatureFlag(key: FeatureFlagKey): boolean {
  try {
    const raw = localStorage.getItem(storageKey(key));
    return raw === null ? DEFAULTS[key] : raw === '1';
  } catch {
    return DEFAULTS[key];
  }
}

export function setFeatureFlag(key: FeatureFlagKey, value: boolean): void {
  try {
    localStorage.setItem(storageKey(key), value ? '1' : '0');
  } catch {
    /* 저장이 막혀 있어도 이번 실행 동안에는 화면에 반영한다 */
  }
  window.dispatchEvent(new Event(FEATURE_FLAG_EVENT));
}

/** 설정 값이 바뀌면 사이드바 같은 다른 화면도 바로 갱신된다. */
export function useFeatureFlag(key: FeatureFlagKey): [boolean, (value: boolean) => void] {
  const [value, setValue] = useState(() => getFeatureFlag(key));
  useEffect(() => {
    const sync = () => setValue(getFeatureFlag(key));
    window.addEventListener(FEATURE_FLAG_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(FEATURE_FLAG_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, [key]);
  return [value, (next: boolean) => setFeatureFlag(key, next)];
}
