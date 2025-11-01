# Skill Lab Web Application - Production Deployment Guide

## 🎯 **Goal: Always-On 24/7 Availability**

This guide will help you deploy the Skill Lab web application to a production environment where it will be available 24/7 for all users.

---

## 📍 **Important: Project Directory Navigation**

### **When You NEED to Navigate to Project Directory:**

**YES, navigate first** for these commands:
```bash
# Step 1: Always navigate to your project directory first
cd "C:\Users\ahmed\Documents\python app\skill lab web"

# Then run these commands:
npm run build           # Build the application
npm install            # Install dependencies
npm start              # Start development server
vercel                 # Deploy to Vercel
vercel --prod          # Production deploy
```

**Why?** These commands need access to:
- `package.json` file
- `src/` folder with your code
- `node_modules/` folder
- Other project files

### **When You DON'T Need to Navigate:**

**NO navigation needed** for these:
```bash
# These work from anywhere (global installations):
npm install -g vercel          # Install globally
npm install -g pm2             # Install globally
vercel login                   # Global command
```

**Why?** These are global commands installed on your system, not project-specific.

### **Quick Reference:**

| Command | Need to Navigate? | Example |
|---------|-------------------|---------|
| `npm run build` | ✅ YES | `cd "path\to\project"` first |
| `npm install` | ✅ YES | `cd "path\to\project"` first |
| `vercel` (deploy) | ✅ YES | `cd "path\to\project"` first |
| `npm install -g vercel` | ❌ NO | Works from anywhere |
| `vercel login` | ❌ NO | Works from anywhere |

### **Easy Way - Use Your Project Location:**

**Windows (PowerShell/CMD):**
```powershell
# Navigate to your project (copy this exact path)
cd "C:\Users\ahmed\Documents\python app\skill lab web"

# Now you're in the project directory - run commands here
npm run build
```

**Windows (Quick Access):**
1. Open File Explorer
2. Navigate to: `C:\Users\ahmed\Documents\python app\skill lab web`
3. Right-click in empty space → "Open in Terminal" or "Open PowerShell here"
4. You're automatically in the right directory!

**Pro Tip:** After navigating once, keep that terminal window open for all your commands.

---

## 📋 **Table of Contents**
1. [Deployment Options](#deployment-options)
2. [Option 1: Cloud Hosting (Recommended)](#option-1-cloud-hosting-recommended)
3. [Option 2: VPS/Server Deployment](#option-2-vpsserver-deployment)
4. [Option 3: Static Hosting with Backend](#option-3-static-hosting-with-backend)
5. [Process Management](#process-management)
6. [Domain & SSL Setup](#domain--ssl-setup)
7. [Monitoring & Maintenance](#monitoring--maintenance)
8. [Backup Strategy](#backup-strategy)
9. [Security Hardening](#security-hardening)
10. [Troubleshooting](#troubleshooting)

---

## 🌐 **Deployment Options**

### **Quick Comparison:**

| Option | Cost/Month | Difficulty | Best For |
|--------|-----------|------------|----------|
| **Vercel/Netlify** | Free-$20 | Easy | Small teams, quick deployment |
| **AWS/GCP/Azure** | $10-$50 | Medium | Scalable, enterprise-ready |
| **VPS (DigitalOcean/Linode)** | $5-$40 | Medium | Full control, cost-effective |
| **Dedicated Server** | $50-$200 | Hard | Large scale, maximum control |

---

## ☁️ **Option 1: Cloud Hosting (Recommended)**

### **1.1 Deploy to Vercel (Easiest)**

#### **Step 1: Prepare for Deployment**
```bash
# First, navigate to your project directory
cd "C:\Users\ahmed\Documents\python app\skill lab web"

# Ensure build is successful
npm run build

# Test the build locally (optional)
npx serve -s build
```

#### **Step 2: Deploy to Vercel**
```bash
# Install Vercel CLI (works from anywhere - one time only)
npm install -g vercel

# Login to Vercel (works from anywhere)
vercel login

# Navigate to project directory (if not already there)
cd "C:\Users\ahmed\Documents\python app\skill lab web"

# Deploy (must be in project directory)
vercel

# For production deployment (must be in project directory)
vercel --prod
```

#### **Step 3: Automatic Deployments (Optional)**
1. **Connect GitHub Repository:**
   - Go to vercel.com
   - Click "New Project"
   - Import your GitHub repository
   - Vercel will auto-deploy on every push

2. **Configure Auto-Deploy:**
   - Settings → Git
   - Enable "Production Branch" (usually `main`)
   - Every push to main = automatic production deployment

#### **Step 4: Set Up Custom Domain**
1. In Vercel Dashboard → Settings → Domains
2. Add your domain (e.g., `skilllab.yourdomain.com`)
3. Follow DNS configuration instructions
4. SSL certificate is automatic (free)

#### **Step 5: Environment Variables**
1. In Vercel Dashboard → Settings → Environment Variables
2. Add any needed variables:
   ```
   REACT_APP_API_URL=https://api.skilllab.com
   REACT_APP_VERSION=1.0.0
   ```

**Benefits:**
- ✅ Always online (99.9% uptime)
- ✅ Free SSL certificates
- ✅ Global CDN
- ✅ Automatic deployments
- ✅ Free tier available
- ✅ Auto-scaling

---

### **1.2 Deploy to Netlify**

#### **Step 1: Build Configuration**
Create `netlify.toml` in project root:
```toml
[build]
  command = "npm run build"
  publish = "build"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[build.environment]
  NODE_VERSION = "18"
```

#### **Step 2: Deploy via Netlify Dashboard**
1. Go to netlify.com and sign up/login
2. Click "Add new site" → "Deploy manually"
3. Drag and drop your `build` folder
4. Site will be live instantly!

#### **Step 3: Continuous Deployment**
1. Click "Site settings" → "Build & deploy"
2. Connect to GitHub/GitLab
3. Set build command: `npm run build`
4. Set publish directory: `build`
5. Enable "Deploy on push"

#### **Step 4: Custom Domain**
1. Site settings → Domain management
2. Add custom domain
3. Configure DNS as instructed
4. SSL is automatic

**Benefits:**
- ✅ Free tier with good limits
- ✅ Easy drag-and-drop deployment
- ✅ Auto HTTPS
- ✅ Form handling (if needed later)

---

### **1.3 Deploy to AWS Amplify**

#### **Step 1: Prepare Application**
```bash
# Build the application
npm run build
```

#### **Step 2: Deploy via AWS Console**
1. Go to AWS Amplify Console
2. Click "New app" → "Host web app"
3. Connect to GitHub or upload build folder
4. Configure build settings:
   ```yaml
   version: 1
   frontend:
     phases:
       preBuild:
         commands:
           - npm install
       build:
         commands:
           - npm run build
     artifacts:
       baseDirectory: build
       files:
         - '**/*'
     cache:
       paths:
         - node_modules/**/*
   ```

#### **Step 3: Custom Domain**
1. App settings → Domain management
2. Add domain
3. AWS manages SSL automatically

**Benefits:**
- ✅ Enterprise-grade reliability
- ✅ Integrated with AWS services
- ✅ Good for scaling
- ✅ Pay-as-you-go pricing

---

## 🖥️ **Option 2: VPS/Server Deployment**

This option gives you full control and is cost-effective for always-on hosting.

### **2.1 Set Up VPS (DigitalOcean Example)**

#### **Step 1: Create Droplet**
1. Sign up at digitalocean.com
2. Create new Droplet:
   - **OS**: Ubuntu 22.04 LTS
   - **Plan**: Basic $6/month (1GB RAM) or $12/month (2GB RAM)
   - **Region**: Choose closest to users
   - **Add SSH Key** (recommended)

#### **Step 2: Initial Server Setup**
```bash
# SSH into your server
ssh root@your_server_ip

# Update system
apt update && apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Install Nginx (web server)
apt install -y nginx

# Install PM2 (process manager)
npm install -g pm2

# Install Git
apt install -y git
```

#### **Step 3: Deploy Application**
```bash
# Create application directory
mkdir -p /var/www/skilllab
cd /var/www/skilllab

# Clone your repository (or upload files)
git clone https://github.com/yourusername/skilllab-web.git .

# Or upload via SCP
# scp -r build/* root@your_server_ip:/var/www/skilllab/

# Install dependencies
npm install

# Build the application
npm run build
```

#### **Step 4: Configure Nginx**
```bash
# Create Nginx configuration
nano /etc/nginx/sites-available/skilllab
```

Add this configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    root /var/www/skilllab/build;
    index index.html;

    # Serve static files
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location /static {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
}
```

Enable the site:
```bash
# Create symbolic link
ln -s /etc/nginx/sites-available/skilllab /etc/nginx/sites-enabled/

# Test configuration
nginx -t

# Restart Nginx
systemctl restart nginx
```

#### **Step 5: Set Up SSL with Let's Encrypt**
```bash
# Install Certbot
apt install -y certbot python3-certbot-nginx

# Get SSL certificate (free)
certbot --nginx -d your-domain.com -d www.your-domain.com

# Auto-renewal is automatic, but test it:
certbot renew --dry-run
```

#### **Step 6: Set Up Process Management (PM2) for Backend API (If Needed)**
If you add a backend API later:
```bash
# Create ecosystem file
nano ecosystem.config.js
```

```javascript
module.exports = {
  apps: [{
    name: 'skilllab-api',
    script: './server/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm Z',
    merge_logs: true,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G'
  }]
};
```

Start with PM2:
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

---

### **2.2 Set Up Automatic Updates**

#### **Create Update Script**
```bash
nano /usr/local/bin/update-skilllab.sh
```

```bash
#!/bin/bash
cd /var/www/skilllab
git pull origin main
npm install
npm run build
pm2 restart all  # If using PM2
systemctl reload nginx
echo "Update completed at $(date)"
```

Make executable:
```bash
chmod +x /usr/local/bin/update-skilllab.sh
```

#### **Set Up Cron for Auto-Updates (Optional)**
```bash
crontab -e
```

Add (update daily at 2 AM):
```
0 2 * * * /usr/local/bin/update-skilllab.sh >> /var/log/skilllab-update.log 2>&1
```

---

### **2.3 Set Up Monitoring**

#### **Install Monitoring Tools**
```bash
# PM2 Monitoring (built-in)
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7

# Uptime monitoring (optional)
# Use external service like UptimeRobot (free) or Pingdom
```

#### **Set Up UptimeRobot (Free)**
1. Sign up at uptimerobot.com
2. Add new monitor:
   - **Monitor Type**: HTTP(s)
   - **URL**: https://your-domain.com
   - **Check Interval**: 5 minutes
3. Configure alerts (email/SMS)

---

## 🔄 **Option 3: Static Hosting with Backend**

### **3.1 Hybrid Approach**

**Frontend**: Static hosting (Vercel/Netlify)  
**Backend**: Separate server (Heroku/Railway/Fly.io)

#### **Architecture:**
```
User Browser
    ↓
Static Frontend (Vercel) ← Always available
    ↓
Backend API (Heroku/Fly.io) ← Always available
    ↓
Database (PostgreSQL) ← Managed service
```

#### **Benefits:**
- ✅ Frontend scales automatically
- ✅ Backend can scale independently
- ✅ Cost-effective
- ✅ High availability

---

## 🛡️ **Process Management**

### **PM2 Configuration (Recommended)**

Install PM2 globally:
```bash
npm install -g pm2
```

Create PM2 configuration:
```bash
nano ecosystem.config.js
```

```javascript
module.exports = {
  apps: [{
    name: 'skilllab-web',
    script: 'serve',
    args: '-s build -l 3000',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
```

Start application:
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # Auto-start on server reboot
```

**PM2 Commands:**
```bash
pm2 list              # View running processes
pm2 logs              # View logs
pm2 restart skilllab-web  # Restart app
pm2 stop skilllab-web     # Stop app
pm2 delete skilllab-web   # Remove from PM2
pm2 monit             # Monitor dashboard
```

---

## 🌍 **Domain & SSL Setup**

### **Step 1: Purchase Domain**
- Namecheap.com
- GoDaddy.com
- Google Domains
- Cloudflare Registrar

### **Step 2: Configure DNS**

#### **For Vercel/Netlify:**
1. Add domain in hosting dashboard
2. Get nameservers or DNS records
3. Update DNS at domain registrar

#### **For VPS:**
Update DNS records at registrar:
```
Type    Name    Value              TTL
A       @       your_server_ip      3600
A       www     your_server_ip      3600
```

### **Step 3: SSL Certificate**

#### **Automatic (Vercel/Netlify):**
- SSL is automatic and free
- No configuration needed

#### **Manual (VPS with Let's Encrypt):**
```bash
# Install Certbot
apt install -y certbot python3-certbot-nginx

# Get certificate
certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal
systemctl enable certbot.timer
```

---

## 📊 **Monitoring & Maintenance**

### **Set Up Monitoring**

#### **1. Server Monitoring**
```bash
# Install monitoring tools
apt install -y htop iotop

# Check server resources
htop
free -h
df -h
```

#### **2. Application Monitoring**
- **PM2 Monitoring**: Built-in
- **UptimeRobot**: Free uptime monitoring
- **Google Analytics**: User analytics (optional)

#### **3. Log Monitoring**
```bash
# View application logs
pm2 logs

# View Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# View system logs
journalctl -u nginx -f
```

### **Regular Maintenance Tasks**

#### **Weekly:**
- [ ] Check server disk space
- [ ] Review error logs
- [ ] Check uptime status
- [ ] Verify backups

#### **Monthly:**
- [ ] Update system packages
- [ ] Review security logs
- [ ] Update application dependencies
- [ ] Review and optimize performance

#### **Maintenance Script**
```bash
nano /usr/local/bin/maintenance.sh
```

```bash
#!/bin/bash
echo "=== Maintenance Started at $(date) ==="

# Update system
apt update && apt upgrade -y

# Clean old logs
pm2 flush
journalctl --vacuum-time=30d

# Check disk space
df -h

# Check memory
free -h

echo "=== Maintenance Completed at $(date) ==="
```

Make executable:
```bash
chmod +x /usr/local/bin/maintenance.sh
```

---

## 💾 **Backup Strategy**

### **Automated Backup Script**

```bash
nano /usr/local/bin/backup-skilllab.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/skilllab"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Backup application files
tar -czf $BACKUP_DIR/skilllab_$DATE.tar.gz /var/www/skilllab

# Backup database (if you have one)
# pg_dump skilllab_db > $BACKUP_DIR/db_$DATE.sql

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete

# Upload to cloud storage (optional)
# aws s3 cp $BACKUP_DIR/skilllab_$DATE.tar.gz s3://your-backup-bucket/

echo "Backup completed: skilllab_$DATE.tar.gz"
```

Make executable:
```bash
chmod +x /usr/local/bin/backup-skilllab.sh
```

### **Schedule Backups**
```bash
crontab -e
```

Add (daily backup at 3 AM):
```
0 3 * * * /usr/local/bin/backup-skilllab.sh >> /var/log/skilllab-backup.log 2>&1
```

---

## 🔒 **Security Hardening**

### **1. Firewall Configuration**
```bash
# Install UFW (Uncomplicated Firewall)
apt install -y ufw

# Allow SSH
ufw allow 22/tcp

# Allow HTTP and HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Enable firewall
ufw enable

# Check status
ufw status
```

### **2. Fail2Ban (Protection against brute force)**
```bash
apt install -y fail2ban

# Configure
systemctl enable fail2ban
systemctl start fail2ban
```

### **3. SSH Hardening**
```bash
nano /etc/ssh/sshd_config
```

Add/Modify:
```
PermitRootLogin no
PasswordAuthentication no  # Use SSH keys only
PubkeyAuthentication yes
```

Restart SSH:
```bash
systemctl restart sshd
```

### **4. Nginx Security Headers**
```bash
nano /etc/nginx/sites-available/skilllab
```

Add to server block:
```nginx
# Security headers
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "no-referrer-when-downgrade" always;
add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
```

Reload Nginx:
```bash
nginx -t && systemctl reload nginx
```

---

## 🚨 **Troubleshooting**

### **Application Not Starting**
```bash
# Check PM2 status
pm2 list

# Check logs
pm2 logs skilllab-web

# Restart
pm2 restart skilllab-web

# Check if port is in use
netstat -tulpn | grep 3000
```

### **Nginx Not Working**
```bash
# Test configuration
nginx -t

# Check status
systemctl status nginx

# View error log
tail -f /var/log/nginx/error.log

# Restart
systemctl restart nginx
```

### **SSL Certificate Issues**
```bash
# Check certificate status
certbot certificates

# Renew manually
certbot renew

# Test renewal
certbot renew --dry-run
```

### **High Server Load**
```bash
# Check running processes
top
htop

# Check disk usage
df -h
du -sh /var/www/*

# Check memory
free -h

# Restart if needed
pm2 restart all
```

### **Database Connection Issues** (If using database)
```bash
# Check if database is running
systemctl status postgresql

# Check connection
psql -U username -d database_name

# View database logs
tail -f /var/log/postgresql/postgresql-*.log
```

---

## 📋 **Quick Setup Checklist**

### **For Cloud Hosting (Vercel/Netlify):**
- [ ] Build application successfully (`npm run build`)
- [ ] Create account on hosting platform
- [ ] Deploy application
- [ ] Set up custom domain
- [ ] Configure environment variables
- [ ] Enable automatic deployments
- [ ] Set up monitoring (UptimeRobot)
- [ ] Test from different locations

### **For VPS Deployment:**
- [ ] Create VPS instance
- [ ] Initial server setup (Node.js, Nginx)
- [ ] Deploy application files
- [ ] Configure Nginx
- [ ] Set up SSL certificate
- [ ] Configure firewall
- [ ] Set up PM2 for process management
- [ ] Configure automatic backups
- [ ] Set up monitoring
- [ ] Test domain and SSL
- [ ] Document server credentials securely

---

## 💡 **Best Practices**

### **Always-On Checklist:**
1. ✅ **Use Process Manager**: PM2 or systemd to auto-restart
2. ✅ **Set Up Monitoring**: UptimeRobot or similar
3. ✅ **Configure Auto-Updates**: Keep system packages updated
4. ✅ **Regular Backups**: Automated daily backups
5. ✅ **SSL Certificates**: Always use HTTPS
6. ✅ **Firewall**: Configure properly
7. ✅ **Logging**: Monitor error logs regularly
8. ✅ **Resource Monitoring**: Watch CPU, memory, disk

### **Performance Tips:**
- Use CDN for static assets (Vercel/Netlify provide this)
- Enable gzip compression (Nginx config included)
- Cache static files appropriately
- Monitor and optimize bundle size
- Use lazy loading for routes

### **Cost Optimization:**
- Start with free tiers (Vercel/Netlify)
- Upgrade only when needed
- Use reserved instances for VPS (if long-term)
- Monitor usage and optimize resources

---

## 🎯 **Recommended Setup (Quick Start)**

### **Easiest & Most Reliable: Vercel**

1. **Navigate to project directory:**
   ```bash
   cd "C:\Users\ahmed\Documents\python app\skill lab web"
   ```

2. **Build your app:**
   ```bash
   npm run build
   ```

3. **Install Vercel CLI** (one time only, from anywhere):
   ```bash
   npm install -g vercel
   ```

4. **Login to Vercel** (from anywhere):
   ```bash
   vercel login
   ```

5. **Deploy** (must be in project directory):
   ```bash
   cd "C:\Users\ahmed\Documents\python app\skill lab web"
   vercel --prod
   ```

6. **Add domain in Vercel dashboard**

7. **Done!** Your app is now always online ✨

**Cost**: Free for most use cases, scales automatically

---

## 📞 **Support Resources**

- **Vercel Docs**: https://vercel.com/docs
- **Netlify Docs**: https://docs.netlify.com
- **DigitalOcean Guides**: https://www.digitalocean.com/community/tags/nginx
- **PM2 Docs**: https://pm2.keymetrics.io/docs/
- **Let's Encrypt**: https://letsencrypt.org/docs/

---

**Last Updated**: December 2024  
**Version**: 1.0  
**For Questions**: Refer to troubleshooting section or hosting provider documentation
