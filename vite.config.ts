import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import viteImagemin from 'vite-plugin-imagemin'


// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    viteImagemin({
      gifsicle: { optimizationLevel: 7 },
      optipng: { optimizationLevel: 7 },
      mozjpeg: { quality: 80 },
      pngquant: { quality: [0.8, 0.9] },
      svgo: {
        plugins: [{ name: 'removeViewBox' }, { name: 'removeEmptyAttrs', active: false }],
      },
    })
  ],
  base: './',
  build: {
    // 使用 esbuild 压缩（更快，默认开启）
    minify: 'esbuild',
    // 或者使用 terser（压缩效果更好，但更慢）
    // minify: 'terser',
    
    // 代码分割配置
    rollupOptions: {
      output: {
        // 手动分包，将大库单独打包
        manualChunks: {
          // Three.js 单独打包（体积较大）
          'three': ['three'],
          // GSAP 单独打包
          'gsap': ['gsap'],
          // React 相关库单独打包
          'react-vendor': ['react', 'react-dom'],
        },
        // 优化 chunk 文件名
        chunkFileNames: 'js/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          // 图片资源单独目录
          if (assetInfo.name && /\.(jpg|jpeg|png|gif|svg|webp)$/.test(assetInfo.name)) {
            return 'images/[name]-[hash][extname]'
          }
          // 其他资源
          return 'assets/[name]-[hash][extname]'
        },
      },
    },
    
    // 资源内联阈值（小于 4KB 的图片转为 base64）
    assetsInlineLimit: 4096,
    
    // 启用 CSS 代码分割
    cssCodeSplit: true,
    
    // 构建后是否生成 source map（生产环境建议关闭）
    sourcemap: false,
    
    // 提高构建时的 chunk 大小警告阈值（你的项目图片多，需要提高）
    chunkSizeWarningLimit: 1000,
    
    // 压缩选项
    // terserOptions: {
    //   compress: {
    //     // 生产环境移除 console 和 debugger
    //     drop_console: true,
    //     drop_debugger: true,
    //     // 移除未使用的代码
    //     dead_code: true,
    //     // 移除未使用的变量
    //     unused: true,
    //   },
    // },
  },
  
  // 优化依赖预构建
  optimizeDeps: {
    include: ['three', 'gsap', 'react', 'react-dom'],
  },
})
