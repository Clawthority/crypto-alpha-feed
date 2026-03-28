#!/usr/bin/env node
/**
 * Crypto Alpha Feed — Telegram formatter.
 * Reads JSON lines from stdin (feed.js output) and formats for Telegram.
 *
 * Usage: node feed.js --once | node format.js [--group-by-source] [--min-score N]
 */

const GROUP_BY_SOURCE = process.argv.includes('--group-by-source');
const MIN_SCORE = parseInt(process.argv.find(a => a.startsWith('--min-score='))?.split('=')[1] || '0', 10);

const PRIORITY_EMOJI = {
  '🔥 HIGH': '🔴',
  '⚡ MED': '🟡',
  '📡 LOW': '🟢',
};

function formatItem(item) {
  const emoji = PRIORITY_EMOJI[item.priority] || '•';
  const source = `**${esc(item.source)}**`;
  const title = item.link ? `[${esc(item.title)}](${item.link})` : esc(item.title);
  const date = item.date ? ` _${formatDate(item.date)}_` : '';

  let lines = [`${emoji} ${source}${date}`, `  ${title}`];

  if (item.description && item.score >= 3) {
    lines.push(`  _${esc(item.description.substring(0, 120))}_`);
  }

  return lines.join('\n');
}

function formatDate(dateStr) {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return dateStr;
  }
}

function esc(text) {
  return (text || '').replace(/([_*\[\]()~`>#+\-=|{}.!])/g, '\\$1');
}

function groupBySource(items) {
  const groups = {};
  for (const item of items) {
    (groups[item.source] ||= []).push(item);
  }
  return groups;
}

function formatBatch(items) {
  if (items.length === 0) return '';

  if (GROUP_BY_SOURCE) {
    const groups = groupBySource(items);
    const parts = [];
    for (const [source, sourceItems] of Object.entries(groups)) {
      parts.push(`━━━ **${esc(source)}** (${sourceItems.length}) ━━━`);
      parts.push(sourceItems.map(formatItem).join('\n\n'));
    }
    return parts.join('\n\n');
  }

  return items.map(formatItem).join('\n\n');
}

// ── Main: read JSON lines from stdin ────────────────────────────────
let buffer = '';

process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => {
  buffer += chunk;
  const lines = buffer.split('\n');
  buffer = lines.pop(); // keep incomplete line
});

process.stdin.on('end', () => {
  if (buffer.trim()) {
    try { items.push(JSON.parse(buffer.trim())); } catch {}
  }

  const filtered = items.filter(i => i.score >= MIN_SCORE);

  if (filtered.length === 0) {
    console.log('✅ No new alpha signals. All quiet.');
    return;
  }

  const header = `🔮 **Crypto Alpha Feed** — ${filtered.length} new signal${filtered.length > 1 ? 's' : ''}\n`;
  console.log(header);
  console.log(formatBatch(filtered));
});

const items = [];

// Handle lines as they arrive (streaming)
process.stdin.on('readable', () => {
  let line;
  while ((line = process.stdin.read()) !== null) {
    for (const l of line.split('\n')) {
      const trimmed = l.trim();
      if (!trimmed) continue;
      try {
        items.push(JSON.parse(trimmed));
      } catch {}
    }
  }
});
