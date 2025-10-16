module.exports = {
  apps: [{
    name: 'crm-backend',
    script: './dist/server.js',
    cwd: '/var/www/crm-backend/backend',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
    },
  }]
};
