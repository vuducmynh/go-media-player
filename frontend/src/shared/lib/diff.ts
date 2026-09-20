import { WordDiff } from '../../entities/study/types';

export interface DiffResult {
  diff: WordDiff[];
  score: number;
  matchedWords: number;
  totalWords: number;
}

/**
 * Normalizes a word token for fair linguistic comparison:
 * Lowercases, strips edge punctuation, unifies curly quotes.
 */
export function normalizeToken(word: string): string {
  if (!word) return '';
  return word
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/^[^\w\s']+|[^\w\s']+$/g, '')
    .trim();
}

/**
 * Splits text into individual words preserving visual representation
 */
export function tokenizeWords(text: string): string[] {
  if (!text) return [];
  return text.trim().split(/\s+/).filter(Boolean);
}

/**
 * Computes word-level alignment using Levenshtein Dynamic Programming.
 * Yields exact classifications: 'correct', 'substitution', 'deletion', 'insertion'.
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
        dp[i][j] = dp[i - 1][j - 1]; // No cost for exact match
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

      if (refNorm === userNorm && dp[i][j] === dp[i - 1][j - 1]) {
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

      if (dp[i][j] === dp[i - 1][j - 1] + 1) {
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

    if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
      reversedDiff.push({
        type: 'deletion',
        reference: refTokens[i - 1],
      });
      i--;
      continue;
    }

    if (j > 0 && dp[i][j] === dp[i][j - 1] + 1) {
      reversedDiff.push({
        type: 'insertion',
        answer: userTokens[j - 1],
      });
      j--;
      continue;
    }

    // Safety fallback
    if (i > 0 && j > 0) {
      reversedDiff.push({
        type: 'substitution',
        reference: refTokens[i - 1],
        answer: userTokens[j - 1],
      });
      i--;
      j--;
    } else if (i > 0) {
      reversedDiff.push({ type: 'deletion', reference: refTokens[i - 1] });
      i--;
    } else if (j > 0) {
      reversedDiff.push({ type: 'insertion', answer: userTokens[j - 1] });
      j--;
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
