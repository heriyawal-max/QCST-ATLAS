import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // 1. FITUR BARU: Izinkan akses dari HP (Network)
  server: {
    host: true
  },

  build: {
    // 2. Settingan Chunking (Agar tidak warning 500kb)
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('recharts')) return 'recharts';
          if (id.includes('lucide-react')) return 'lucide';
          if (id.includes('@supabase')) return 'supabase';
          if (id.includes('node_modules')) return 'vendor';
        }
      }
    }
  }
})