/// <reference types="vite/client" />

declare module 'heic2any' {
  interface Heic2AnyOptions {
    blob: Blob
    toType?: string
    quality?: number
    multiple?: boolean
  }
  export default function heic2any(options: Heic2AnyOptions): Promise<Blob | Blob[]>
}
