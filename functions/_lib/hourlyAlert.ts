export const HOURLY_ALERT_KEY = 'settings/hourly-alert'

export const isHourlyAlertEnabled = async (kv: KVNamespace) => (await kv.get(HOURLY_ALERT_KEY)) !== 'off'

export const setHourlyAlertEnabled = async (kv: KVNamespace, enabled: boolean) => {
  await kv.put(HOURLY_ALERT_KEY, enabled ? 'on' : 'off')
  return enabled
}
