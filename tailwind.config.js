export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      boxShadow: {
        'soft-glow': '0 20px 60px rgba(20, 184, 166, 0.12)',
      },
      colors: {
        'teal': '#14b8a6',
        'cyan': '#06b6d4',
        'light-cyan': '#22d3ee'
      }
    }
  },
  plugins: [],
};
