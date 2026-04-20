const isNode = typeof window === 'undefined';
const windowObj = isNode ? { localStorage: new Map() } : window;
const storage = windowObj.localStorage;

const toSnakeCase = (str) => str.replace(/([A-Z])/g, '_$1').toLowerCase();

const getAppParamValue = (paramName, { defaultValue = undefined } = {}) => {
  if (isNode) return defaultValue;
  const storageKey = `base44_${toSnakeCase(paramName)}`;
  const urlParams = new URLSearchParams(window.location.search);
  const searchParam = urlParams.get(paramName);
  if (searchParam) { storage.setItem(storageKey, searchParam); return searchParam; }
  if (defaultValue) { storage.setItem(storageKey, defaultValue); return defaultValue; }
  const storedValue = storage.getItem(storageKey);
  if (storedValue) return storedValue;
  return null;
};

export const appParams = {
  appId: getAppParamValue("app_id", { defaultValue: import.meta.env.VITE_BASE44_APP_ID }),
  token: getAppParamValue("access_token"),
  functionsVersion: getAppParamValue("functions_version", { defaultValue: import.meta.env.VITE_BASE44_FUNCTIONS_VERSION }),
  appBaseUrl: getAppParamValue("app_base_url", { defaultValue: import.meta.env.VITE_BASE44_APP_BASE_URL }),
};
