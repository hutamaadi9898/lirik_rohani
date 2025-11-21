/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{astro,html,js,jsx,ts,tsx,mdx}',
    './public/**/*.html',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter var"', 'Inter', 'ui-sans-serif', 'system-ui'],
      },
      colors: {
        surface: '#0c1116',
        card: '#111820',
        accent: '#7dd3fc',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
