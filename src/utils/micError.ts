import type { MicError } from "@/types/domain";

export function micErrorBodyKey(error: MicError): string {
  if (error.type !== "denied" || error.canAskAgain == null) {
    return `sentence.micError.${error.type}.body`;
  }
  return error.canAskAgain
    ? "sentence.micError.denied.retryBody"
    : "sentence.micError.denied.blockedBody";
}
