import type { Config } from 'tailwindcss';

export default {
  content: ['./popup.html', './src/**/*.{ts,tsx,html}'],
  theme: {
    extend: {},
  },
  corePlugins: {
    preflight: false,
  },
} satisfies Config;
