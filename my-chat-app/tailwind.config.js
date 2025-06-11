// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      // This is where you customize the styles for the 'typography' feature.
      // This part remains similar to how you would define it in v3's typography plugin config,
      // but it's nested under 'theme.extend' in the main v4 config.
      typography: {
        DEFAULT: {
          css: {
            // color: '#111', // General text color
            h1: {
              fontSize: '1.875em', // Your custom font size for h1
              marginTop: '1.5em',
              marginBottom: '0.75em'
            },
            p: {
              marginTop: '0.5em',
              marginBottom: '0.5em',
            },
            code: {
                padding: '0.2em 0.4em',
                borderRadius: '0.3em',
                fontWeight: 'normal',
            },
            pre: {
                padding: '0.75em 1em',
                borderRadius: '0.5rem',
                overflowX: 'auto',
                lineHeight: '1.4',
                fontSize: '0.875em',
                code: {
                    backgroundColor: 'transparent',
                    color: 'inherit',
                },
            },
          },
        },
        dark: {
          css: {
            color: '#111',
            h1: {
              color: '#222',
            },
          },
        },
      },
      // You should still define your custom colors or other theme extensions here
      // if you're using them in your CSS variables.
    },
  },
  // <<< IMPORTANT: For Tailwind CSS v4, this array should be EMPTY for built-in features.
  // Do NOT put require('@tailwindcss/typography') here.
  plugins: [],
};