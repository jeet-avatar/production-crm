module.exports = {
  apps: [
    {
      name: 'crm-backend',
      script: 'dist/server.js',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'video-worker',
      script: 'dist/workers/videoGenerationWorker.js',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      autorestart: true,
      max_restarts: 10,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
