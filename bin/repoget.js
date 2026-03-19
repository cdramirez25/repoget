#!/usr/bin/env node
import { run } from '../src/index.js';

const args = process.argv.slice(2);

run(args).catch((err) => {
  console.error('\x1b[31m✖  Fatal error:\x1b[0m', err.message);
  process.exit(1);
});