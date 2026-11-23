// Cloudflare Workers KV types used by the Pages Functions in this directory.
// Only the members these functions actually call are declared so that
// `npm run typecheck` can check the production code without adding
// @cloudflare/workers-types as a dependency. The runtime contract is from
// https://developers.cloudflare.com/kv/api/

interface KVNamespaceListKey<Metadata = unknown> {
  name: string
  expiration?: number
  metadata?: Metadata
}

interface KVNamespaceListResult<Metadata = unknown> {
  keys: KVNamespaceListKey<Metadata>[]
  list_complete: boolean
  cursor?: string
}

interface KVNamespacePutOptions {
  expiration?: number
  expirationTtl?: number
  metadata?: unknown
}

interface KVNamespace {
  get(key: string): Promise<string | null>
  get<ExpectedValue = unknown>(key: string, type: 'json'): Promise<ExpectedValue | null>
  getWithMetadata<Metadata = unknown>(key: string): Promise<{ value: string | null; metadata: Metadata | null }>
  put(key: string, value: string, options?: KVNamespacePutOptions): Promise<void>
  delete(key: string): Promise<void>
  list<Metadata = unknown>(options?: { prefix?: string; cursor?: string; limit?: number }): Promise<KVNamespaceListResult<Metadata>>
}
