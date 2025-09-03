# 🚀 OfficeXpress Deployment Guide

## Overview
This guide will help you deploy your OfficeXpress website to your hosting server (hostseba.com) and connect your domain (officexpress.org) while keeping Replit as your development environment.

## 📋 Prerequisites
- ✅ Hosting account at hostseba.com
- ✅ Domain officexpress.org from Hostinger
- ✅ GitHub account (for automated deployment)
- ✅ FTP access to your hosting server

---

## 🔧 Step 1: Set Up GitHub Repository

### 1.1 Connect Replit to GitHub
1. In your Replit project, click the **Git** tab (version control icon)
2. Click **Connect to GitHub** 
3. Create a new repository or connect to existing one
4. Name it something like `officexpress-website`
5. Push your current code to GitHub

### 1.2 Verify Repository Structure
Your GitHub repo should have:
- `.github/workflows/deploy.yml` ✅ (Already created)
- `client/public/.htaccess` ✅ (Already created)
- All your project files ✅

---

## 🗝️ Step 2: Get FTP Credentials from Your Hosting

### 2.1 Access cPanel
1. Log into your hostseba.com account
2. Go to cPanel (hosting control panel)
3. Look for **FTP Accounts** or **File Manager**

### 2.2 Create/Get FTP Details
You'll need these 3 pieces of information:
- **FTP Server**: Usually `ftp.officexpress.org` or `ftp.yourhostingserver.com`
- **FTP Username**: Your hosting username or create a new FTP user
- **FTP Password**: Your hosting password or create a new FTP password

📝 **Write these down - you'll need them for GitHub!**

---

## 🔐 Step 3: Configure GitHub Secrets

### 3.1 Add Deployment Secrets
1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret** and add these **3 secrets**:

| Secret Name | Value | Example |
|-------------|-------|---------|
| `FTP_SERVER` | Your FTP server address | `ftp.officexpress.org` |
| `FTP_USERNAME` | Your FTP username | `officexpress_user` |
| `FTP_PASSWORD` | Your FTP password | `your_secure_password` |

⚠️ **Important**: Keep these credentials secure and never share them!

---

## 🌐 Step 4: Configure Domain (officexpress.org)

### 4.1 Update Nameservers (at Hostinger)
1. Log into your Hostinger account
2. Go to **Domain** → **DNS Zone**
3. Update nameservers to point to your hostseba.com hosting:
   - Get nameserver details from hostseba.com (usually in welcome email)
   - Update NS records at Hostinger

### 4.2 Add Domain to Hosting (at hostseba.com)
1. In hostseba.com cPanel, go to **Addon Domains** or **Subdomains**
2. Add `officexpress.org` as your primary domain
3. Point it to `/public_html/` directory

---

## 🚀 Step 5: Deploy Your Website

### 5.1 Automatic Deployment
1. Push any changes from Replit to GitHub
2. GitHub Actions will automatically:
   - Build your React app
   - Upload files to your hosting server
   - Your website goes live at officexpress.org!

### 5.2 Manual Deployment (if needed)
If automatic deployment doesn't work:
1. Run `npm run build` in Replit terminal
2. Download the `dist/public/` folder
3. Upload contents to your hosting's `/public_html/` folder via FTP

---

## 🔄 Your Development Workflow

### Daily Development:
1. **Code in Replit** (as you do now)
2. **Test locally** using the Replit preview
3. **Push to GitHub** when ready to deploy
4. **Automatic deployment** updates your live site

### Going Live:
- Development site: `your-replit-url.replit.app`
- Production site: `https://officexpress.org`

---

## 🛠️ Testing Your Deployment

### Test These Features:
1. **Homepage loads** at officexpress.org
2. **All pages accessible** (Corporate, Rental, Vendor, Contact)
3. **Forms submit properly** and show success messages
4. **Navigation works** without 404 errors
5. **Mobile responsive** design displays correctly

---

## 🚨 Troubleshooting

### Common Issues:
- **404 on page refresh**: Check `.htaccess` file is uploaded correctly
- **CSS/JS not loading**: Verify file paths in built files
- **Forms not working**: Database connections won't work on static hosting
- **Images missing**: Ensure all assets are included in build

### Solutions:
- For form submissions, you may need to set up a contact form service or keep using Replit's backend for API calls
- Consider using services like Formspree or Netlify Forms for contact forms

---

## 📞 Support

If you encounter issues:
1. Check GitHub Actions logs for build errors
2. Verify FTP credentials are correct
3. Contact hostseba.com support for hosting-specific issues
4. Contact Hostinger support for domain-related issues

---

**🎉 Once deployed, your professional OfficeXpress website will be live at officexpress.org while you continue developing on Replit!**