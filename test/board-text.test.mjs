// `antevo board` prints the day's business board from the structured answer.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { boardText } from '../dist/format.js';
import { SERVERS, NEEDS_AUTH } from '../dist/config.js';

const ANSWER = {
  status: 'ok',
  as_of: '2026-11-22',
  counts: { risks: 1, opportunities: 1 },
  entries: [
    { kind: 'risk', theme: 'shipping_chokepoints', title: 'Attacks near Hormuz continue',
      impact: 'severe', likelihood: 'medium', trend: 'rising', mornings_on_board: 54,
      watch: 'War-risk insurance rates for the Gulf of Oman.' },
    { kind: 'opportunity', theme: 'funding_rates', title: 'Long-term money for grid projects stays available',
      impact: 'medium', likelihood: 'high', trend: 'steady', mornings_on_board: 1 },
  ],
  credit: 'Antevo Executive Brief, 2026-11-22',
  disclosures: { not_advice: 'Not advice. The options are possible responses with their reasons, for you to decide on.' },
};

test('counts, entries with grades in words, tenure, watch and the boundary', () => {
  const text = boardText(ANSWER);
  assert.match(text, /^Antevo business board, 2026-11-22: 1 risks, 1 opportunities/);
  assert.match(text, /^RISK · SHIPPING CHOKEPOINTS$/m);
  assert.match(text, /severe impact · medium likelihood · rising · on the board 54 mornings/);
  assert.match(text, /^Watch: War-risk insurance/m);
  assert.match(text, /^OPPORTUNITY · FUNDING RATES$/m);
  assert.match(text, /steady · new today/);
  assert.match(text, /Antevo Executive Brief, 2026-11-22 — Not advice\./);
  assert.doesNotMatch(text, /\d+ ?%/);
  assert.match(boardText({ ...ANSWER, entries: [{ ...ANSWER.entries[1], trend: 'new' }] }), /high likelihood · new$/m);
});

test('no board falls back to the server text', () => {
  assert.equal(boardText({ status: 'unavailable' }), null);
  assert.equal(boardText(undefined), null);
});

test('Strategy Radar is public, on the api host', () => {
  assert.equal(SERVERS.strategy, 'https://api.antevo.ch/mcp/strategy/mcp');
  assert.equal(NEEDS_AUTH.strategy, false);
});
