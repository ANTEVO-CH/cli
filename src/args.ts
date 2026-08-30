/** `--arg k=v` parsing. Values are JSON when they parse as JSON, else strings. */
export function parseArgs(argv: string[]): {
  positional: string[];
  args: Record<string, unknown>;
  flags: Set<string>;
} {
  const positional: string[] = [];
  const args: Record<string, unknown> = {};
  const flags = new Set<string>();

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--arg') {
      const pair = argv[++i] ?? '';
      const eq = pair.indexOf('=');
      if (eq < 0) throw new Error(`--arg expects key=value, got "${pair}"`);
      const k = pair.slice(0, eq);
      const raw = pair.slice(eq + 1);
      // A bare `5` should reach the server as a number and `true` as a boolean;
      // tool schemas are typed and a string where an int belongs is rejected.
      // Anything that is not valid JSON stays a string, which is what a user
      // typing --arg mark=NOVARA means.
      try { args[k] = JSON.parse(raw); } catch { args[k] = raw; }
    } else if (a.startsWith('--')) {
      flags.add(a.slice(2));
    } else {
      positional.push(a);
    }
  }
  return { positional, args, flags };
}
