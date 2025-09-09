module.exports = {
  apps: [
    {
      name: 'm1-villa-backend',
      script: './dist/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 4001,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 4001,
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_file: './logs/pm2-combined.log',
      time: true,
      max_memory_restart: '1G',
      max_restarts: 10,
      min_uptime: '10s',
      watch: false,
      ignore_watch: ['node_modules', 'logs', '.git'],
      autorestart: true,
      vizion: true,
      post_update: ['npm install', 'npm run build'],
    },
    {
      name: 'm1-electric-sync',
      script: 'npx',
      args: 'electric-sql start',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
      },
      error_file: './logs/electric-error.log',
      out_file: './logs/electric-out.log',
      log_file: './logs/electric-combined.log',
      time: true,
      autorestart: true,
    },
  ],

  deploy: {
    production: {
      user: 'deploy',
      host: 'your-server-ip',
      ref: 'origin/main',
      repo: 'git@github.com:your-org/ils-backoffice.git',
      path: '/var/www/m1-backend',
      'post-deploy': 'cd microservices/m1/backend-postgres && npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-deploy-local': 'echo "Deploying M1 Backend to production"',
    },
  },
};