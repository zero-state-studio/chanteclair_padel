import { EventEmitter } from "events";

class SSEEmitter extends EventEmitter {}

const globalForSSE = globalThis as unknown as { sseEmitter: SSEEmitter };

export const sseEmitter = globalForSSE.sseEmitter ?? new SSEEmitter();
globalForSSE.sseEmitter = sseEmitter;

sseEmitter.setMaxListeners(100);
