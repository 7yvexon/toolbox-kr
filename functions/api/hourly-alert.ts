import { isHourlyAlertEnabled } from '../_lib/hourlyAlert'

interface Env {
  ANALYTICS_KV?: KVNamespace
}

export const onRequestGet = async ({ env }: { env: Env }) => {
  const enabled = env.ANALYTICS_KV ? await isHourlyAlertEnabled(env.ANALYTICS_KV) : true
  return new Response(JSON.stringify({ enabled }), {
    status: 200,
    headers: {
      'cache-control': 'no-store',
      'content-type': 'application/json; charset=utf-8',
      'content-security-policy': "default-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
      'cross-origin-opener-policy': 'same-origin',
      'cross-origin-resource-policy': 'same-origin',
      'referrer-policy': 'no-referrer',
      'strict-transport-security': 'max-age=31536000; includeSubDomains',
      'x-content-type-options': 'nosniff',
      'x-frame-options': 'DENY',
    },
  })
}
