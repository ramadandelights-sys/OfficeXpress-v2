// Vercel build script for OfficeXpress
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🏗️  Building OfficeXpress for Vercel...');

try {
  // Build frontend
  console.log('📦 Building frontend with Vite...');
  execSync('vite build', { stdio: 'inherit' });

  // Build backend for serverless
  console.log('🔧 Building backend for serverless...');
  execSync('esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outfile=api/index.js --external:@neondatabase/serverless --external:ws', { stdio: 'inherit' });

  console.log('✅ Build completed successfully!');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}