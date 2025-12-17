// postcss.config.cjs
module.exports = {
  plugins: {
    'tailwindcss/nesting': {},
    '@tailwindcss/postcss': {}, // Esta linha é a correção crucial
    autoprefixer: {},
  },
};