module.exports = {
    apps: [
        {
            name: 'fence-web',
            script: 'node_modules/next/dist/bin/next',
            args: 'dev',
            cwd: './', // Run from the root directory
            env: {
                NODE_ENV: 'development',
                PORT: 3000,
                HOSTNAME: '0.0.0.0'
            }
        },
        {
            name: 'fence-bot',
            script: 'scripts/fence_relay_v3.py',
            interpreter: process.platform === 'win32' ? 'python' : 'python3', // 'python' on Windows, 'python3' on Mac/Linux
            cwd: './',
            restart_delay: 5000, // Wait 5s before restarting if it crashes
            env: {
                PYTHONUNBUFFERED: '1' // Ensure logs are shown immediately
            }
        },
        {
            name: 'fence-affiliate',
            script: 'scripts/affiliate_verifier.py',
            interpreter: process.platform === 'win32' ? 'python' : 'python3',
            cwd: './',
            cwd: './',
            env: {
                PYTHONUNBUFFERED: '1'
            }
        }
    ]
};
