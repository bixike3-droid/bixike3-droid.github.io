import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({root:'aliyun/ui',publicDir:false,plugins:[react()],build:{outDir:'../dist',emptyOutDir:true}});
