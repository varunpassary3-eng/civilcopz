module.exports = {
  apps: [
    {
      name: 'civilcopz-api',
      script: 'server.js',
      cwd: '/var/app/civilcopz/backend',
      instances: 3,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 4000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 4000
      },
      error_file: '/var/log/civilcopz/api-error.log',
      out_file: '/var/log/civilcopz/api-out.log',
      log_file: '/var/log/civilcopz/api.log',
      merge_logs: true,
      time: true,
      max_memory_restart: '1G',
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s',
      watch: false,
      ignore_watch: [
        'node_modules',
        'logs',
        '*.log'
      ],
      env_file: '/var/app/civilcopz/.env.prod'
    },
    {
      name: 'civilcopz-ai-worker',
      script: 'workers/aiWorker.js',
      cwd: '/var/app/civilcopz/backend',
      instances: 2,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        WORKER_MODE: 'ai'
      },
      env_production: {
        NODE_ENV: 'production',
        WORKER_MODE: 'ai'
      },
      error_file: '/var/log/civilcopz/ai-worker-error.log',
      out_file: '/var/log/civilcopz/ai-worker-out.log',
      log_file: '/var/log/civilcopz/ai-worker.log',
      merge_logs: true,
      time: true,
      max_memory_restart: '2G',
      restart_delay: 5000,
      max_restarts: 5,
      min_uptime: '30s',
      watch: false,
      env_file: '/var/app/civilcopz/.env.prod'
    }
  ],

  deploy: {
    production: {
      user: 'civilcopz',
      host: 'your-production-server.com',
      ref: 'origin/main',
      repo: 'https://github.com/your-org/civilcopz.git',
      path: '/var/app/civilcopz',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};