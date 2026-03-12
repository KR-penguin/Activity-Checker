module.exports = {
  globDirectory: 'dist',
  globPatterns: [
    '**/*.{html,js,css,json,ico,png,svg,txt}'
  ],
  swDest: 'dist/sw.js',
  clientsClaim: true,
  skipWaiting: true,
  navigateFallback: '/index.html',
};