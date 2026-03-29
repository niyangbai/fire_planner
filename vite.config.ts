import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

function getGithubPagesBase() {
  const repoSlug = process.env.GITHUB_REPOSITORY;
  if (!repoSlug) return '/';

  const [, repoName] = repoSlug.split('/');
  if (!repoName || repoName.endsWith('.github.io')) return '/';
  return `/${repoName}/`;
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: process.env.GITHUB_ACTIONS ? getGithubPagesBase() : '/',
})
