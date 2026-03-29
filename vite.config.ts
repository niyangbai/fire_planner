import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const githubRepo = process.env.GITHUB_REPOSITORY?.split('/')[1];
const githubPagesBase = githubRepo ? `/${githubRepo}/` : '/';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: process.env.GITHUB_ACTIONS ? githubPagesBase : '/',
})
