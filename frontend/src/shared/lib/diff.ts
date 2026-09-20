import { WordDiff } from '../../entities/study/types';

export interface DiffResult {
  diff: WordDiff[];
  score: number;
  matchedWords: number;
  totalWords: number;
}

const NUMBER_WORDS: Record<string, string> = {
  '0': 'zero',
  '1': 'one',
  '2': 'two',
  '3': 'three',
  '4': 'four',
  '5': 'five',
  '6': 'six',
  '7': 'seven',
  '8': 'eight',
  '9': 'nine',
  '10': 'ten',
  '11': 'eleven',
  '12': 'twelve',
  '13': 'thirteen',
  '14': 'fourteen',
  '15': 'fifteen',
  '16': 'sixteen',
  '17': 'seventeen',
  '18': 'eighteen',
  '19': 'nineteen',
  '20': 'twenty',
  'zero': '0',
  'one': '1',
  'two': '2',
  'three': '3',
  'four': '4',
  'five': '5',
  'six': '6',
  'seven': '7',
  'eight': '8',
  'nine': '9',
  'ten': '10',
};

const CONTRACTION_CANONICAL: Record<string, string> = {
  "it's": 'it is',
  "don't": 'do not',
  "can't": 'cannot',
  "won't": 'will not',
  "i'm": 'i am',
  "you're": 'you are',
  "they're": 'they are',
  "we're": 'we are',
  "i've": 'i have',
  "you've": 'you have',
  "we've": 'we have',
  "they've": 'they have',
  "isn't": 'is not',
  "aren't": 'are not',
  "wasn't": 'was not',
  "weren't": 'were not',
  "hasn't": 'has not',
  "haven't": 'have not',
  "hadn't": 'had not',
  "doesn't": 'does not',
  "didn't": 'did not',
  "shouldn't": 'should not',
  "wouldn't": 'would not',
  "couldn't": 'could not',
  "let's": 'let us',
  "that's": 'that is',
  "there's": 'there is',
  "what's": 'what is',
  "who's": 'who is',
};

/**
 * Normalizes a word token for fair linguistic comparison in listening practice:
 * - Lowercases.
 * - Strips leading/trailing punctuation (. , ! ? " ' : ; -).
 * - Unifies curly quotes.
 * - Maps numbers (1 <-> one).
 * - Maps contractions if single token.
 */
export function normalizeToken(word: string): string {
  if (!word) return '';
  let norm = word
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/^[^\w\s']+|[^\w\s']+$/g, '')
    .trim();

  // If word is a number
  if (NUMBER_WORDS[norm]) {
    norm = NUMBER_WORDS[norm];
  }

  // If word is a simple contraction
  if (CONTRACTION_CANONICAL[norm]) {
    norm = CONTRACTION_CANONICAL[norm];
  }

  return norm;
}

/**
 * Checks if a token contains actual word/number characters (not just punctuation).
 */
export function isRealWordToken(token: string): boolean {
  if (!token) return false;
  return /[a-zA-Z0-9]/.test(token);
}

/**
 * Splits text into tokens suitable for listening practice:
 * - Glues isolated punctuation (e.g. "Test .") to the preceding word ("Test.").
 * - Filters out standalone punctuation that has no word characters.
 */
export function tokenizeWords(text: string): string[] {
  if (!text) return [];
  const rawTokens = text.trim().split(/\s+/).filter(Boolean);
  const result: string[] = [];

  for (let i = 0; i < rawTokens.length; i++) {
    const tok = rawTokens[i];
    if (!isRealWordToken(tok)) {
      // If token is just punctuation (like "." or ","), attach it to the previous token if available
      if (result.length > 0) {
        result[result.length - 1] += tok;
      }
      // Do NOT create an isolated token for punctuation
    } else {
      result.push(tok);
    }
  }

  return result;
}

/**
 * Computes word-level alignment using Levenshtein Dynamic Programming with
 * Prefix / Chronological Bias (so earlier occurrences are matched first when ambiguous).
 */
export function computeWordDiff(referenceText: string, userText: string): DiffResult {
  const refTokens = tokenizeWords(referenceText);
  const userTokens = tokenizeWords(userText);

  const n = refTokens.length;
  const m = userTokens.length;

  if (n === 0 && m === 0) {
    return { diff: [], score: 100, matchedWords: 0, totalWords: 0 };
  }
  if (n === 0) {
    return {
      diff: userTokens.map((w) => ({ type: 'insertion', answer: w })),
      score: 0,
      matchedWords: 0,
      totalWords: 0,
    };
  }
  if (m === 0) {
    return {
      diff: refTokens.map((w) => ({ type: 'deletion', reference: w })),
      score: 0,
      matchedWords: 0,
      totalWords: n,
    };
  }

  // Cost matrix: dp[i][j]
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));

  for (let i = 0; i <= n; i++) dp[i][0] = i;
  for (let j = 0; j <= m; j++) dp[0][j] = j;

  for (let i = 1; i <= n; i++) {
    const refNorm = normalizeToken(refTokens[i - 1]);
    for (let j = 1; j <= m; j++) {
      const userNorm = normalizeToken(userTokens[j - 1]);
      const match = refNorm === userNorm;

      if (match) {
        // Prefix / chronological bias: penalize matching later in reference text (i * 0.001)
        // so that earlier matches in reference are strictly favored over later occurrences!
        const matchCost = dp[i - 1][j - 1] + i * 0.001;
        const delCost = dp[i - 1][j] + 1;
        const insCost = dp[i][j - 1] + 1;
        dp[i][j] = Math.min(matchCost, delCost, insCost);
      } else {
        const substituteCost = dp[i - 1][j - 1] + 1;
        const deleteCost = dp[i - 1][j] + 1; // Word in ref missing in user
        const insertCost = dp[i][j - 1] + 1; // Extra word in user
        dp[i][j] = Math.min(substituteCost, deleteCost, insertCost);
      }
    }
  }

  // Backtrack to assemble aligned diff
  let i = n;
  let j = m;
  const reversedDiff: WordDiff[] = [];
  let matchedCount = 0;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0) {
      const refNorm = normalizeToken(refTokens[i - 1]);
      const userNorm = normalizeToken(userTokens[j - 1]);
      const currentCost = dp[i][j];

      // 1. Check if came from match
      if (refNorm === userNorm) {
        const matchCost = dp[i - 1][j - 1] + i * 0.001;
        if (Math.abs(currentCost - matchCost) < 0.0001) {
          reversedDiff.push({
            type: 'correct',
            reference: refTokens[i - 1],
            answer: userTokens[j - 1],
          });
          matchedCount++;
          i--;
          j--;
          continue;
        }
      }

      // 2. Check if came from deletion (word in reference was skipped / missing)
      const delCost = dp[i - 1][j] + 1;
      if (Math.abs(currentCost - delCost) < 0.0001) {
        reversedDiff.push({
          type: 'deletion',
          reference: refTokens[i - 1],
        });
        i--;
        continue;
      }

      // 3. Check if came from insertion (extra word typed by user)
      const insCost = dp[i][j - 1] + 1;
      if (Math.abs(currentCost - insCost) < 0.0001) {
        reversedDiff.push({
          type: 'insertion',
          answer: userTokens[j - 1],
        });
        j--;
        continue;
      }

      // 4. Check if came from substitution (word was misspelled)
      const subCost = dp[i - 1][j - 1] + 1;
      if (Math.abs(currentCost - subCost) < 0.0001) {
        reversedDiff.push({
          type: 'substitution',
          reference: refTokens[i - 1],
          answer: userTokens[j - 1],
        });
        i--;
        j--;
        continue;
      }
    }

    if (i > 0) {
      reversedDiff.push({
        type: 'deletion',
        reference: refTokens[i - 1],
      });
      i--;
      continue;
    }

    if (j > 0) {
      reversedDiff.push({
        type: 'insertion',
        answer: userTokens[j - 1],
      });
      j--;
      continue;
    }
  }

  const diff = reversedDiff.reverse();
  const rawPercentage = (matchedCount / n) * 100;
  const score = Math.max(0, Math.min(100, Math.round(rawPercentage)));

  return {
    diff,
    score,
    matchedWords: matchedCount,
    totalWords: n,
  };
}
