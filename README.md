# 🔮 Crypto Alpha Feed

**Automated crypto intelligence that surfaces airdrop opportunities, protocol launches, and alpha signals — before they go mainstream.**

The best crypto opportunities get crowded fast. By the time airdrops hit Twitter, the early allocations are gone. Crypto Alpha Feed monitors project blogs, RSS feeds, and on-chain data to catch alpha signals early — then delivers them to Telegram so you can act fast.

## How It Works

```
1. Monitors 12+ project blogs, RSS feeds, and airdrop aggregators
2. Detects airdrop announcements, protocol launches, and token signals
3. Scores each signal by relevance and freshness
4. Formats and delivers to Telegram instantly
5. Deduplicates so you never see the same signal twice
```

## What It Tracks

### Blog & RSS Monitoring
- **Project blogs** — Ether.fi, EigenLayer, Uniswap, Hyperliquid, zkSync, and more
- **Airdrop aggregators** — Airdrops.io, DeFiLlama airdrop candidates
- **Mirror blogs** — Protocol announcements on Mirror.xyz

### On-Chain Signals
- **New token deployments** — Fresh contract deployments on major chains
- **Protocol launches** — TVL appearing on new protocols
- **Airdrop patterns** — High TVL + no token = likely future airdrop

## Monitored Sources

| Source | Type | Signal |
|--------|------|--------|
| Ether.fi | Blog RSS | Restaking updates, airdrop rounds |
| EigenLayer | Blog RSS | AVS launches, point programs |
| Uniswap | Blog RSS | Governance, fee switches, v4 hooks |
| Hyperliquid | Mirror | Trading incentives, token updates |
| zkSync | Mirror | Ecosystem grants, airdrop phases |
| Airdrops.io | RSS | Curated airdrop listings |
| DeFiLlama | API | Tokenless high-TVL protocols |

## Prerequisites

- Node.js 18+
- npm
- A Telegram bot token (for delivery) — create one via [@BotFather](https://t.me/BotFather)

## Quick Start

```bash
npm install
cp config.example.json config.json
# Edit config.json with your monitored sources and Telegram settings

# Single run
node feed.js | node format.js

# Continuous monitoring (checks every 30 min by default)
node feed.js
```

### Output

```
🔮 Alpha Feed — 3 new signals

━━━ 🪂 Airdrop Signals ━━━
💎 **EigenLayer Season 2**
  📰 Source: blog.eigenlayer.xyz
  ⏰ 12 min ago
  🔗 https://blog.eigenlayer.xyz/season-2/
  📝 Additional staker rewards confirmed. Snapshot date TBA.

💎 **zkSync Ecosystem Grants**
  📰 Source: zksync.mirror.xyz
  ⏰ 2h ago
  🔗 https://zksync.mirror.xyz/...
  📝 New grant round for DeFi protocols. Build-to-earn eligible.
```

## Architecture

```
feed.js (poller) ──► format.js ──► Telegram output
```

- `feed.js` — Polls configured sources, deduplicates, outputs JSONL
- `format.js` — Reads JSONL, renders Telegram-ready messages
- State tracked in `state.json` to avoid duplicate alerts

## Who It's For

- **Airdrop hunters** — Catch announcements before they hit Twitter timelines
- **DeFi researchers** — Track protocol launches and ecosystem shifts
- **Crypto traders** — Early signals on token launches and governance changes
- **Alpha groups** — Share curated feeds with your community

## Configuration

Edit `config.json` to customize:

```json
{
  "sources": ["ether.fi", "eigenlayer", "uniswap"],
  "checkIntervalMs": 1800000,
  "telegram": {
    "enabled": true,
    "chatId": "your-chat-id"
  }
}
```

## Related Products

- **[DeFi Money Engine](../defi-money-engine)** — Yield scanner and protocol intelligence. Complements Alpha Feed with deeper on-chain analysis.

## License

MIT
