#!/usr/bin/env node

/**
 * Production Build Script for OfficeXpress
 * This script builds the client-side React app for deployment to hosting
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';

console.log('🏗️  Building OfficeXpress for production deployment...');

try {
  // Build the client application
  console.log('📦 Building React client application...');
  execSync('vite build', { stdio: 'inherit' });
  
  // Update index.html to use absolute paths for production
  console.log('🔧 Configuring paths for production...');
  const indexPath = path.join(process.cwd(), 'dist', 'index.html');
  let indexContent = readFileSync(indexPath, 'utf8');
  
  // Ensure all asset paths are relative to root
  indexContent = indexContent.replace(/href="\/assets/g, 'href="./assets');
  indexContent = indexContent.replace(/src="\/assets/g, 'src="./assets');
  
  writeFileSync(indexPath, indexContent);
  
  console.log('✅ Production build completed successfully!');
  console.log('📁 Built files are in the ./dist directory');
  console.log('🚀 Ready for deployment to officexpress.org');
  
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}