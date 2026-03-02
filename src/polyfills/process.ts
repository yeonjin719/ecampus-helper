type ProcessLike = {
  env?: Record<string, string>;
};

type GlobalWithProcess = typeof globalThis & {
  process?: ProcessLike;
};

const globalRef = globalThis as GlobalWithProcess;

if (!globalRef.process) {
  globalRef.process = { env: { NODE_ENV: 'production' } };
} else {
  globalRef.process.env = globalRef.process.env || {};
  if (typeof globalRef.process.env.NODE_ENV === 'undefined') {
    globalRef.process.env.NODE_ENV = 'production';
  }
}
