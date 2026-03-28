#!/usr/bin/env node
/**
 * Crypto Alpha Feed — RSS/Atom aggregator for crypto intelligence.
 * Fetches feeds, filters by keywords, persists state to avoid duplicates.
 *
 * Usage: node feed.js [--once] [--config path/to/config.json]
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { parseString } = require('xml2js') || {};

// ── Config ──────────────────────────────────────────────────────────
const CONFIG_PATH = path.resolve(
  process.argv.find(a => a.startsWith('--config='))?.split('=')[1] || 'config.json'
);
const RUN_ONCE = process.argv.includes('--once');

function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error(`Config not found: ${CONFIG_PATH}`);
    console.error('Copy config.example.json to config.json and edit it.');
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
}

// ── State persistence ───────────────────────────────────────────────
function loadState(stateFile) {
  const p = path.resolve(stateFile);
  if (fs.existsSync(p)) {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  }
  return { seenIds: {}, lastCheck: {} };
}

function saveState(stateFile, state) {
  // Prune entries older than 7 days
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  for (const [id, ts] of Object.entries(state.seenIds)) {
    if (ts < cutoff) delete state.seenIds[id];
  }
  fs.writeFileSync(path.resolve(stateFile), JSON.stringify(state, null, 2));
}

// ── HTTP fetch with timeout & retry ─────────────────────────────────
function fetch(url, timeoutMs = 15000, maxRedirects = 3) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, { timeout: timeoutMs, headers: { 'User-Agent': 'CryptoAlphaFeed/1.0' } }, (res) => {
      if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location && maxRedirects > 0) {
        return fetch(res.headers.location, timeoutMs, maxRedirects - 1).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error(`Timeout: ${url}`)); });
  });
}

// ── Simple XML parser (no dependencies) ─────────────────────────────
function extractItems(xml, feedType) {
  const items = [];

  // RSS: <item> entries
  if (feedType === 'rss') {
    const itemRegex = /<item[\s>]([\s\S]*?)<\/item>/gi;
    let match;
    while ((match = itemRegex.exec(xml)) !== null) {
      const block = match[1];
      items.push({
        title: extractTag(block, 'title'),
        link: extractTag(block, 'link'),
        pubDate: extractTag(block, 'pubDate') || extractTag(block, 'pubdate'),
        description: extractTag(block, 'description'),
        guid: extractTag(block, 'guid') || extractTag(block, 'link'),
      });
    }
  }

  // Atom: <entry> entries
  if (feedType === 'atom') {
    const entryRegex = /<entry[\s>]([\s\S]*?)<\/entry>/gi;
    let match;
    while ((match = entryRegex.exec(xml)) !== null) {
      const block = match[1];
      const linkMatch = block.match(/<link[^>]*href=["']([^"']+)["']/i);
      items.push({
        title: extractTag(block, 'title'),
        link: linkMatch ? linkMatch[1] : '',
        pubDate: extractTag(block, 'published') || extractTag(block, 'updated'),
        description: extractTag(block, 'content') || extractTag(block, 'summary'),
        guid: extractTag(block, 'id') || (linkMatch ? linkMatch[1] : ''),
      });
    }
  }

  return items.filter(i => i.title);
}

function extractTag(xml, tag) {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
  const m = xml.match(re);
  if (!m) return '';
  return m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim();
}

// ── Keyword scoring ─────────────────────────────────────────────────
function scoreItem(item, keywords) {
  const text = `${item.title} ${item.description}`.toLowerCase();
  let score = 0;
  for (const kw of keywords.high_priority || []) {
    if (text.includes(kw.toLowerCase())) score += 3;
  }
  for (const kw of keywords.medium_priority || []) {
    if (text.includes(kw.toLowerCase())) score += 2;
  }
  for (const kw of keywords.low_priority || []) {
    if (text.includes(kw.toLowerCase())) score += 1;
  }
  return score;
}

function priorityLabel(score) {
  if (score >= 5) return '🔥 HIGH';
  if (score >= 3) return '⚡ MED';
  return '📡 LOW';
}

// ── Rate limiter ────────────────────────────────────────────────────
async function rateLimitedFetch(urls, delayMs = 500) {
  const results = [];
  for (const item of urls) {
    try {
      const xml = await fetch(item.url);
      results.push({ ...item, xml, error: null });
    } catch (err) {
      results.push({ ...item, xml: null, error: err.message });
    }
    if (delayMs > 0 && urls.indexOf(item) < urls.length - 1) {
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
  return results;
}

// ── Main ────────────────────────────────────────────────────────────
async function main() {
  const config = loadConfig();
  const state = loadState(config.stateFile || 'state.json');
  const keywords = config.keywords || {};
  const newItems = [];

  const feedSources = config.feeds.map(f => ({ url: f.url, name: f.name, type: f.type || 'rss' }));
  console.error(`Fetching ${feedSources.length} feeds...`);

  const results = await rateLimitedFetch(feedSources);

  for (const result of results) {
    if (result.error) {
      console.error(`⚠ ${result.name}: ${result.error}`);
      continue;
    }

    const items = extractItems(result.xml, result.type);
    let newCount = 0;

    for (const item of items) {
      const id = item.guid || item.link || item.title;
      if (state.seenIds[id]) continue;

      const score = scoreItem(item, keywords);
      state.seenIds[id] = Date.now();
      newCount++;

      newItems.push({
        source: result.name,
        title: item.title.replace(/<[^>]+>/g, '').trim(),
        link: item.link,
        date: item.pubDate,
        score,
        priority: priorityLabel(score),
        description: (item.description || '').replace(/<[^>]+>/g, '').substring(0, 200).trim(),
      });
    }

    state.lastCheck[result.name] = Date.now();
    console.error(`  ${result.name}: ${items.length} items, ${newCount} new`);
  }

  // Sort by score descending, then by source
  newItems.sort((a, b) => b.score - a.score || a.source.localeCompare(b.source));

  // Output as JSON lines for piping to formatter
  for (const item of newItems) {
    console.log(JSON.stringify(item));
  }

  saveState(config.stateFile || 'state.json', state);
  console.error(`\nDone. ${newItems.length} new items across ${results.filter(r => !r.error).length} feeds.`);

  if (!RUN_ONCE) {
    const interval = (config.checkIntervalMinutes || 30) * 60 * 1000;
    console.error(`Next check in ${config.checkIntervalMinutes || 30} minutes...`);
    setTimeout(() => main().catch(console.error), interval);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
