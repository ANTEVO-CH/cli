// `antevo tremor` prints this week's reading from the structured answer.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { tremorText } from '../dist/format.js';
import { SERVERS, NEEDS_AUTH } from '../dist/config.js';

const ANSWER = {
  status: 'ok',
  week: '2026-10-23',
  reading: { status: 'Elevated', times_normal: 2.89, rank_since_2001: 211, fridays_since_2001: 1347,
             pairs_breaking: 56, pairs_read: 697 },
  families: [
    { family: 'Equity regions', breaking: 21, pairs: 120, times_normal: 3.31 },
    { family: 'Bonds', breaking: 8, pairs: 140, times_normal: 0.85 },
  ],
  last_week: { times_normal: 3.36, status: 'Elevated' },
  provisional: '697 of the 753 pairs were read this week because a source was late.',
  disclaimer: 'Descriptive, not a forecast, and not investment advice.',
  read_more: 'https://antevo.ch/tremor-watch/',
};

test('the reading, the families above twice normal, last week and the boundary', () => {
  const text = tremorText(ANSWER);
  assert.match(text, /^Antevo Tremor Index, week of 2026-10-23: Elevated, 2\.89x a normal Friday \(211 of 1347 Fridays since 2001\)/);
  assert.match(text, /56 of 697 pairs breaking/);
  assert.match(text, /Above normal: Equity regions 21\/120 \(3\.31x\)$/m);
  assert.doesNotMatch(text, /Bonds/);
  assert.match(text, /Last week: 3\.36x, Elevated/);
  assert.match(text, /source was late/);
  assert.match(text, /not a forecast/);
});

test('no reading falls back to the server text', () => {
  assert.equal(tremorText({ status: 'unavailable', note: 'Tremor Watch is not available right now.' }), null);
  assert.equal(tremorText(undefined), null);
});

test('Tremor Watch is public, on the api host', () => {
  assert.equal(SERVERS.tremor, 'https://api.antevo.ch/mcp/tremor/mcp');
  assert.equal(NEEDS_AUTH.tremor, false);
});
