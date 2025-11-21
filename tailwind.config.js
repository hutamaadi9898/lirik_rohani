/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{astro,html,js,jsx,ts,tsx,mdx}',
    './public/**/*.html',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Space Grotesk"', 'Inter', 'ui-sans-serif', 'system-ui'],
        display: ['"Space Grotesk"', 'Inter', 'ui-sans-serif', 'system-ui'],
      },
      colors: {
        surface: '#080c12',
        card: '#0f1724',
        accent: '#67e8f9',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
