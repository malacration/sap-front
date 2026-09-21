import 'zone.js';

// Mesmo alias usado no bundle web, necessario ao SockJS no Chrome.
(globalThis as any).global = globalThis;
