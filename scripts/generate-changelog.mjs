#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const cwd = join(__dirname, '..');
const outputPath = join(__dirname, '../src/gadgets/Changelog/changelog.json');

// Use SOH (\x01) as field sep and STX (\x02) as record sep — safe in commit messages
const raw = execSync(
  "git log --no-merges --format='%x02%H%x01%as%x01%s%x01%aN%x01%b'",
  { encoding: 'utf8', cwd },
);

const commits = raw
  .split('\x02')
  .filter(Boolean)
  .map((record) => {
    const [hash, date, subject, author, ...rest] = record.split('\x01');
    const body = rest.join('\x01').trim() || null;
    return {
      hash: hash.trim().slice(0, 7),
      date: date?.trim() ?? '',
      subject: subject?.trim() ?? '',
      author: author?.trim() ?? '',
      body,
    };
  });

writeFileSync(outputPath, `${JSON.stringify(commits, null, 2)}\n`);
console.log(`changelog: ${commits.length} commits → ${outputPath}`);
