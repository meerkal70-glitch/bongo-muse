// Content safety for AI-generated content (Google Play AI-Generated Content +
// Sexual Content policies): block unsafe prompts, and let users report anything
// offensive without leaving the app.
import { supabase } from './supabase';

// English + Swahili terms that must never reach the image/music generators.
const BLOCKED_TERMS = [
  // English
  'nude', 'nudity', 'naked', 'nsfw', 'topless', 'bottomless', 'nipple', 'nipples', 'breast', 'breasts',
  'boob', 'boobs', 'tits', 'titties', 'cleavage', 'butt', 'buttocks', 'booty', 'ass', 'genital', 'genitals',
  'penis', 'vagina', 'pussy', 'dick', 'cock', 'porn', 'porno', 'pornographic', 'xxx', 'sex', 'sexy',
  'sexual', 'erotic', 'erotica', 'hentai', 'fetish', 'lingerie', 'bikini', 'underwear', 'panties', 'thong',
  'stripper', 'striptease', 'seductive', 'sensual', 'orgasm', 'horny', 'onlyfans', 'undressed',
  'unclothed', 'see-through', 'see through', 'transparent clothes', 'bdsm', 'bondage', 'milf', 'lewd',
  'gore', 'beheaded', 'decapitated',
  // Swahili
  'uchi', 'matiti', 'titi', 'makalio', 'tako', 'matako', 'ngono', 'kutombana', 'tomba', 'kuma', 'mboo',
  'malaya', 'uchafu', 'chupi', 'sidiria', 'kujamiiana',
  // People (covers are people-free; models can undress people unprompted)
  'woman', 'women', 'girl', 'girls', 'lady', 'ladies', 'female', 'model', 'models', 'portrait', 'selfie',
  'body', 'bodies', 'skin', 'figure', 'man', 'men', 'boy', 'boys', 'person', 'people', 'face', 'faces',
  'mwanamke', 'wanawake', 'msichana', 'wasichana', 'mrembo', 'warembo', 'mwanaume', 'kijana', 'mtu', 'watu',
];

const BLOCKED_RE = new RegExp(
  `(^|[^a-z])(${BLOCKED_TERMS.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})(?=$|[^a-z])`,
  'i',
);

/** True if the prompt asks for sexual / explicit / gory content. */
export const isUnsafePrompt = (text: string): boolean => BLOCKED_RE.test((text || '').toLowerCase());

export const UNSAFE_PROMPT_MESSAGE =
  'Covers can\'t include people or adult content. Try describing a scene, objects, colours or symbols instead (e.g. "golden cross in sunrise clouds").';

/**
 * Added to every image prompt. Google rejected the app because the model drew a
 * nude woman from an innocent auto-prompt ("i love you lord, album cover art"),
 * so covers are forced to be people-free artwork — no bodies means no nudity.
 */
export const SAFE_IMAGE_SUFFIX =
  'abstract artwork, landscape or objects or symbols only, no people, no humans, no person, no woman, no man, no faces, no bodies, no skin, safe for work, family friendly';

export type ReportKind = 'ai_cover' | 'ai_song' | 'track';

/**
 * Report offensive content from inside the app. Saved to `copyright_reports`
 * (the table the admin Reports screen already reads), tagged so admins can tell
 * offensive-content reports apart from copyright ones.
 */
export const reportContent = async (opts: {
  kind: ReportKind;
  reason: string;
  trackId?: string | null;
  imageUrl?: string | null;
  prompt?: string | null;
}): Promise<{ ok: boolean; error?: string }> => {
  try {
    const { data } = await supabase.auth.getSession();
    const reporterId = data?.session?.user?.id ?? null;
    const parts = [
      `[Offensive ${opts.kind === 'ai_cover' ? 'AI cover' : opts.kind === 'ai_song' ? 'AI song' : 'content'}] ${opts.reason}`,
      opts.prompt ? `Prompt: ${opts.prompt.slice(0, 300)}` : '',
      opts.imageUrl && /^https?:/.test(opts.imageUrl) ? `Image: ${opts.imageUrl}` : '',
    ].filter(Boolean);

    const { error } = await supabase.from('copyright_reports').insert({
      track_id: opts.trackId ?? null,
      reporter_id: reporterId,
      reason: parts.join('\n'),
    });
    if (error && opts.trackId) {
      // Song not in `tracks` yet (e.g. unsaved AI song) → keep its id in the text instead
      const retry = await supabase.from('copyright_reports').insert({
        track_id: null,
        reporter_id: reporterId,
        reason: [...parts, `Track id: ${opts.trackId}`].join('\n'),
      });
      if (retry.error) return { ok: false, error: retry.error.message };
      return { ok: true };
    }
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Unknown error' };
  }
};

/** Reasons offered in report menus. */
export const REPORT_REASONS = [
  'Sexual or nude content',
  'Violent or disturbing',
  'Hateful or abusive',
  'Other offensive content',
];
