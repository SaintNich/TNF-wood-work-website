// postcss.config.cjs
const autoprefixer = require('autoprefixer');
const cssnano = require('cssnano');

// Handle both export shapes: {default: fn} or fn
const purgecssModule = require('@fullhuman/postcss-purgecss');
const PurgeCSS = purgecssModule.default || purgecssModule;

const isProd = process.env.NODE_ENV === 'production';

module.exports = {
  plugins: [
    autoprefixer,

    ...(isProd
      ? [
          PurgeCSS({
            content: [
              './*.html',
              './**/*.html',
              './js/**/*.js',
            ],
            defaultExtractor: (content) =>
              content.match(/[A-Za-z0-9-_:/.%]+/g) || [],
            safelist: {
              standard: [
                'open',
                'active',
                'hidden',
                'is-active',
                'no-scroll',
                'is-checkout',
                'sr-only',
                'button',
                'btn',
                'btn-primary',
              ],
              deep: [
                /^mini-cart-/,
                /^cart-/,
                /^header-/,
                /^filters?$/,
                /^overlay$/,
                /^panel$/,
              ],
            },
            keyframes: true,
            fontFace: true,
          }),
        ]
      : []),

    cssnano({ preset: 'default' }),
  ],
};
