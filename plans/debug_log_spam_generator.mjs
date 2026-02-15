#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const DEFAULT_FILES = 10;
const DEFAULT_LINES_PER_SEC = 200;
const DEFAULT_DURATION_SEC = 30;
const DEFAULT_DIR = path.resolve(".wix/debug-logs");
const LEVELS = ["error", "warn", "info", "debug"];
const PRODUCERS = [
  "cli",
  "dev-server",
  "linter",
  "builder",
  "router",
  "auth",
  "unknown"
];

function parseArgs(argv) {
  const args = {
    files: DEFAULT_FILES,
    lps: DEFAULT_LINES_PER_SEC,
    durationSec: DEFAULT_DURATION_SEC,
    dir: DEFAULT_DIR,
    malformedRate: 0.03
  };

  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    const next = argv[i + 1];

    if (token === "--files" && next) {
      args.files = Math.max(1, Number(next));
      i += 1;
    } else if (token === "--lps" && next) {
      args.lps = Math.max(1, Number(next));
      i += 1;
    } else if (token === "--duration" && next) {
      args.durationSec = Math.max(1, Number(next));
      i += 1;
    } else if (token === "--dir" && next) {
      args.dir = path.resolve(next);
      i += 1;
    } else if (token === "--malformed-rate" && next) {
      const parsed = Number(next);
      args.malformedRate = Math.min(1, Math.max(0, parsed));
      i += 1;
    } else if (token === "--help") {
      printHelp();
      process.exit(0);
    }
  }

  return args;
}

function printHelp() {
  console.log(`Wix debug log generator

Usage:
  node debug_log_spam_generator.mjs [options]

Options:
  --files <n>            Number of files to write (default: ${DEFAULT_FILES})
  --lps <n>              Total lines per second across all files (default: ${DEFAULT_LINES_PER_SEC})
  --duration <seconds>   Duration to run (default: ${DEFAULT_DURATION_SEC})
  --dir <path>           Target directory (default: .wix/debug-logs)
  --malformed-rate <0-1> Fraction of malformed lines (default: 0.03)
  --help                 Show this help
`);
}

function randomPick(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function nextLine(lineNo, malformedRate) {
  const ts = new Date().toISOString();
  const producer = randomPick(PRODUCERS);
  const level = randomPick(LEVELS);
  const message = `Synthetic log line ${lineNo} pid=${process.pid} rand=${Math.floor(Math.random() * 100000)}`;

  if (Math.random() < malformedRate) {
    return `${ts} ${producer} ${level} ${message}`;
  }

  return `[${ts}] [${producer}] [${level}] ${message}`;
}

async function main() {
  const cfg = parseArgs(process.argv);
  fs.mkdirSync(cfg.dir, { recursive: true });

  const fileNames = Array.from({ length: cfg.files }, (_, idx) => `source-${idx + 1}.log`);
  const filePaths = fileNames.map((name) => path.join(cfg.dir, name));
  filePaths.forEach((p) => fs.closeSync(fs.openSync(p, "a")));

  const intervalMs = 100;
  const ticksPerSec = 1000 / intervalMs;
  const linesPerTick = cfg.lps / ticksPerSec;
  const endAt = Date.now() + cfg.durationSec * 1000;

  let lineCounter = 0;
  let carry = 0;

  console.log(`Writing logs to ${cfg.dir}`);
  console.log(`files=${cfg.files}, lps=${cfg.lps}, duration=${cfg.durationSec}s, malformedRate=${cfg.malformedRate}`);

  const timer = setInterval(() => {
    if (Date.now() >= endAt) {
      clearInterval(timer);
      console.log(`Done. Wrote ${lineCounter} lines.`);
      return;
    }

    const withCarry = linesPerTick + carry;
    const count = Math.floor(withCarry);
    carry = withCarry - count;

    for (let i = 0; i < count; i += 1) {
      const filePath = filePaths[Math.floor(Math.random() * filePaths.length)];
      lineCounter += 1;
      fs.appendFileSync(filePath, `${nextLine(lineCounter, cfg.malformedRate)}\n`, "utf8");
    }
  }, intervalMs);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
