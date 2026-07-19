import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const MOJIBAKE_PATTERN = /(?:Ã.|Â.|â.|�)/

export function repairTextDecoding(value: string | null | undefined) {
  if (value == null || !MOJIBAKE_PATTERN.test(value)) {
    return value
  }

  let nextValue = value

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const bytes = Uint8Array.from(Array.from(nextValue), (char) => char.charCodeAt(0))
      const decoded = new TextDecoder("utf-8").decode(bytes)
      if (!decoded || decoded === nextValue) {
        break
      }
      nextValue = decoded
      if (!MOJIBAKE_PATTERN.test(nextValue)) {
        break
      }
    } catch {
      break
    }
  }

  return nextValue
}
