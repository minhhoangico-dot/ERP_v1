module.exports = {
    apps: [
        {
            name: "fdc-lan-bridge",
            script: "dist/index.js", // Start the compiled JS
            instances: 1, // Single instance to prevent duplicate cron jobs
            autorestart: true,
            watch: false,
            max_memory_restart: "500M",
            env: {
                NODE_ENV: "development",
            },
            env_production: {
                NODE_ENV: "production",
            },
            log_date_format: "YYYY-MM-DD HH:mm:ss Z",
            error_file: "logs/pm2-err.log",
            out_file: "logs/pm2-out.log",
            merge_logs: true,
        },
    ],
};
