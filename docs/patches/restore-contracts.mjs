#!/usr/bin/env node
/**
 * Restores full multi-agency Contracts.tsx from compressed payload.
 * Usage: node docs/patches/restore-contracts.mjs
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const root = path.resolve(__dirname, '../..');
const b64Path = path.join(__dirname, 'Contracts.tsx.zlib.b64');
const outPath = path.join(root, 'src/pages/Contracts.tsx');

const b64 = fs.readFileSync(b64Path, 'utf8').trim();
const buf = Buffer.from(b64, 'base64');
const text = zlib.inflateSync(buf).toString('utf8');
fs.writeFileSync(outPath, text, 'utf8');
console.log('Restored', outPath, '(' + text.length + ' chars)');
