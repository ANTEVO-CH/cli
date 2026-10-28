/** Plain-text renderings of structured answers, for the commands that print one. */

/**
 * This week's reading in a few lines, from the structured answer. Anything the
 * server did not send is left out; with no reading at all the caller falls
 * back to the server's own text.
 */
export function tremorText(s: any): string | null {
  const r = s?.reading;
  if (s?.status !== 'ok' || !r) return null;
  const lines = [
    `Antevo Tremor Index, week of ${s.week}: ${r.status}, ${r.times_normal}x a normal Friday`
      + (r.rank_since_2001 ? ` (${r.rank_since_2001} of ${r.fridays_since_2001} Fridays since 2001)` : ''),
  ];
  if (r.pairs_breaking != null && r.pairs_read != null) {
    lines.push(`${r.pairs_breaking} of ${r.pairs_read} pairs breaking`);
  }
  const hot = (s.families ?? [])
    .filter((f: any) => f.times_normal >= 2)
    .map((f: any) => `${f.family} ${f.breaking}/${f.pairs} (${f.times_normal}x)`);
  if (hot.length) lines.push(`Above normal: ${hot.join(', ')}`);
  if (s.last_week) lines.push(`Last week: ${s.last_week.times_normal}x, ${s.last_week.status}`);
  if (s.provisional) lines.push(s.provisional);
  lines.push(`${s.disclaimer ?? ''} ${s.read_more ?? ''}`.trim());
  return lines.join('\n');
}
