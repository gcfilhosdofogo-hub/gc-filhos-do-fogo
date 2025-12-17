// postcss.config.cjs
module.exports = {
  plugins: {
    'tailwindcss/nesting': {},
    '@tailwindcss/postcss': {}, // Corrigido para usar o plugin oficial do PostCSS para Tailwind CSS
    autoprefixer: {},
  },
};