#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const DEFAULT_LINES_PER_SEC = 200;
const DEFAULT_DURATION_SEC = 30;
const DEFAULT_DIR = path.resolve(".wix/debug-logs");
const LEVELS = ["error", "warn", "info", "debug"];
const DEFAULT_PRODUCERS = ["cli", "code_gen", "auth"];

function parseArgs(argv) {
  const args = {
    producers: DEFAULT_PRODUCERS,
    lps: DEFAULT_LINES_PER_SEC,
    durationSec: DEFAULT_DURATION_SEC,
    dir: DEFAULT_DIR,
    malformedRate: 0.03
  };

  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    const next = argv[i + 1];

    if (token === "--producers" && next) {
      const parsed = next
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean);
      args.producers = parsed.length > 0 ? parsed : DEFAULT_PRODUCERS;
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
  --producers <list>     Comma-separated producers (default: ${DEFAULT_PRODUCERS.join(",")})
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

function nextLine(lineNo, malformedRate, ts) {
  const level = randomPick(LEVELS);
  const message = `Synthetic log line ${lineNo} pid=${process.pid} rand=${Math.floor(Math.random() * 100000)}`;

  if (Math.random() < malformedRate) {
    return `${ts} ${level} ${message}`;
  }

  return `[${ts}] [${level}] ${message}`;
}

async function main() {
  const cfg = parseArgs(process.argv);
  fs.mkdirSync(cfg.dir, { recursive: true });

  const fileNames = cfg.producers.map((producer) => `${producer}-debug.log`);
  const filePaths = fileNames.map((name) => path.join(cfg.dir, name));
  filePaths.forEach((p) => fs.closeSync(fs.openSync(p, "a")));
  const producerState = cfg.producers.map((producer, index) => ({
    producer,
    filePath: filePaths[index],
    lineCounter: 0
  }));

  const intervalMs = 100;
  const ticksPerSec = 1000 / intervalMs;
  const linesPerTick = cfg.lps / ticksPerSec;
  const endAt = Date.now() + cfg.durationSec * 1000;

  let globalLineCounter = 0;
  let carry = 0;
  let nextProducerIndex = 0;

  console.log(`Writing logs to ${cfg.dir}`);
  console.log(`producers=${cfg.producers.join(",")}, files=${cfg.producers.length}, lps=${cfg.lps}, duration=${cfg.durationSec}s, malformedRate=${cfg.malformedRate}`);

  const timer = setInterval(() => {
    if (Date.now() >= endAt) {
      clearInterval(timer);
      console.log(`Done. Wrote ${globalLineCounter} lines.`);
      return;
    }

    const withCarry = linesPerTick + carry;
    const count = Math.floor(withCarry);
    carry = withCarry - count;
    const tickTimestamp = new Date().toISOString();

    for (let i = 0; i < count; i += 1) {
      const state = producerState[nextProducerIndex];
      nextProducerIndex = (nextProducerIndex + 1) % producerState.length;
      state.lineCounter += 1;
      globalLineCounter += 1;
      fs.appendFileSync(
        state.filePath,
        `${nextLine(state.lineCounter, cfg.malformedRate, tickTimestamp)}\n`,
        "utf8"
      );
    }
  }, intervalMs);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
