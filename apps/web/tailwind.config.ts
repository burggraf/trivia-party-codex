import type { Config } from 'tailwindcss';
import animatePlugin from 'tailwindcss-animate';

const config: Config = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-display)', 'Inter', 'system-ui'],
        body: ['var(--font-body)', 'Inter', 'system-ui']
      }
    }
  },
  plugins: [animatePlugin]
};

export default config;
