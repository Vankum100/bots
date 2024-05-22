cd ~/monitor-bot
git pull origin && npm run build && pm2 flush
pm2 delete monitor-bot-api && pm2 delete monitor-bot-consumers
pm2 start dist/main.js --name monitor-bot-api && pm2 start dist/cluster_consumers.js --name monitor-bot-consumers
pm2 logs --lines 155
