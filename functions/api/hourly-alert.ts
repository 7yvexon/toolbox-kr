import { isHourlyAlertEnabled } from '../_lib/hourlyAlert'

interface Env {
  ANALYTICS_KV?: KVNamespace
}

export const onRequestGet = async ({ env }: { env: Env }) => {
  const enabled = env.ANALYTICS_KV ? await isHourlyAlertEnabled(env.ANALYTICS_KV) : true
  return new Response(JSON.stringify({ enabled }), {
    status: 200,
    headers: { 'cache-control': 'no-store', 'content-type': 'application/json; charset=utf-8' },
  })
}
