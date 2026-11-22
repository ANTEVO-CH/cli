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

const words = (id: string): string => String(id ?? '').replace(/_/g, ' ');

/**
 * The day's business board in a few lines per entry, from the structured
 * answer: kind and theme, title, grades in words, watch. Grades stay words.
 * With no board the caller falls back to the server's own text.
 */
export function boardText(s: any): string | null {
  if (s?.status !== 'ok' || !Array.isArray(s.entries)) return null;
  const c = s.counts ?? {};
  const lines = [
    `Antevo business board, ${s.as_of}: ${c.risks ?? 0} risks, ${c.opportunities ?? 0} opportunities`,
  ];
  for (const e of s.entries) {
    const tenure = e.mornings_on_board > 1 ? `on the board ${e.mornings_on_board} mornings` : 'new today';
    lines.push(
      '',
      `${String(e.kind).toUpperCase()} · ${words(e.theme).toUpperCase()}`,
      e.title,
      // A first-morning entry graded "new" needs no second "new today".
      [`${e.impact} impact`, `${e.likelihood} likelihood`, e.trend, e.trend === 'new' && tenure === 'new today' ? null : tenure]
        .filter(Boolean).join(' · '),
    );
    if (e.watch) lines.push(`Watch: ${e.watch}`);
  }
  const d = s.disclosures ?? {};
  lines.push('', [s.credit, d.not_advice].filter(Boolean).join(' — '));
  return lines.join('\n');
}
