# 🔮 Crypto Alpha Feed

Automated crypto intelligence aggregator. Monitors blogs, RSS feeds, and on-chain data for airdrop announcements, protocol launches, and alpha signals.

## Features

- **RSS/Blog monitoring** — Tracks 12+ project blogs for airdrop-related posts
- **Airdrop aggregator** — Pulls from Airdrops.io, DeFiLlama, and other sources
- **On-chain signals** — Monitors new token deployments and protocol launches
- **Telegram-ready output** — Formatted for instant delivery

## Setup

```bash
npm install
cp config.example.json config.json
# Edit config.json with your settings
node feed.js | node format.js
```

## Monitored Sources

| Source | Type | URL |
|--------|------|-----|
| Ether.fi | Blog RSS | blog.ether.fi/rss |
| EigenLayer | Blog RSS | blog.eigenlayer.xyz/rss |
| Uniswap | Blog RSS | blog.uniswap.org/feed |
| Hyperliquid | Mirror | hyperliquid.mirror.xyz |
| zkSync | Mirror | zksync.mirror.xyz/feed/atom |
| Airdrops.io | RSS | airdrops.io/feed |

## License

MIT
