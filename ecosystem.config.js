module.exports = {
    apps: [
        {
            name: 'fence-web',
            script: 'npm',
            args: 'start',
            cwd: './', // Run from the root directory
            env: {
                NODE_ENV: 'production',
                PORT: 3000
            }
        },
        {
            name: 'fence-bot',
            script: 'scripts/telegramTP_checker_td_tp4_eco.py',
            interpreter: process.platform === 'win32' ? 'python' : 'python3', // 'python' on Windows, 'python3' on Mac/Linux
            cwd: './',
            restart_delay: 5000, // Wait 5s before restarting if it crashes
            env: {
                PYTHONUNBUFFERED: '1' // Ensure logs are shown immediately
            }
        }
    ]
};
