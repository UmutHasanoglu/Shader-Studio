import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'studio-bg': '#0a0a0f',
        'studio-panel': '#12121a',
        'studio-border': '#1e1e2e',
        'studio-accent': '#6366f1',
        'studio-accent-hover': '#818cf8',
        'studio-text': '#e2e8f0',
        'studio-text-dim': '#64748b',
        'studio-success': '#22c55e',
        'studio-warning': '#f59e0b',
        'studio-error': '#ef4444',
      },
    },
  },
  plugins: [],
};

export default config;
