/** 
 * @type {import('tailwindcss').Config} 
 * 
 * Tailwind CSS v4 配置
 * 注意：颜色和圆角已在 index.css 的 @theme 中定义
 * 此文件仅保留动画等无法在 CSS 中定义的配置
 */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // 动画配置（无法在 CSS @theme 中定义）
      animation: {
        shimmer: 'shimmer 2s linear infinite',
        "fade-in": "fade-in 0.2s ease-out",
        "slide-up": "slide-up 0.3s ease-out",
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
}
