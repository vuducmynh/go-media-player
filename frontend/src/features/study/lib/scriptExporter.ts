import { Lesson, Sentence } from '../../../entities/study/types';
import { formatTime } from '../../../shared/lib/formatters';

/**
 * Format milliseconds into SRT timestamp: HH:MM:SS,mmm
 */
export function formatSRTTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const milliseconds = Math.max(0, Math.floor(ms % 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number, z = 2) => String(n).padStart(z, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)},${pad(milliseconds, 3)}`;
}

/**
 * Parses SRT / VTT timestamp (HH:MM:SS,mmm or MM:SS.mmm) into milliseconds
 */
export function parseSRTTime(timeStr: string): number {
  const clean = timeStr.trim().replace('.', ',');
  const parts = clean.split(':');
  if (parts.length === 3) {
    const hours = parseInt(parts[0], 10) || 0;
    const minutes = parseInt(parts[1], 10) || 0;
    const [secStr, msStr] = parts[2].split(',');
    const seconds = parseInt(secStr, 10) || 0;
    const ms = parseInt((msStr || '0').padEnd(3, '0').slice(0, 3), 10) || 0;
    return (hours * 3600 + minutes * 60 + seconds) * 1000 + ms;
  }
  if (parts.length === 2) {
    const minutes = parseInt(parts[0], 10) || 0;
    const [secStr, msStr] = parts[1].split(',');
    const seconds = parseInt(secStr, 10) || 0;
    const ms = parseInt((msStr || '0').padEnd(3, '0').slice(0, 3), 10) || 0;
    return (minutes * 60 + seconds) * 1000 + ms;
  }
  return 0;
}

const COMMON_STANDALONE_WORDS = new Set(['and', 'or', 'but', 'to', 'in', 'on', 'at', 'for', 'with', 'is', 'are', 'was', 'were', 'it', 'the', 'a', 'an', 'all', 'of']);

/**
 * Cleans up spacing, punctuation, contractions, and ordinal artifacts from transcript text
 */
export function cleanTranscriptTypography(text: string): string {
  if (!text) return '';
  let cleaned = text
    // 1. Remove spaces before punctuation (, . ? ! ; : )
    .replace(/\s+([,.:;?!])/g, '$1')
    // 2. Fix spaces around contractions (e.g. "I 'm" -> "I'm", "don 't" -> "don't")
    .replace(/\b([A-Za-z]+)\s+['’]([A-Za-z]+)\b/g, "$1'$2")
    // 3. Fix ordinal numbers (e.g. "21 st" -> "21st", "28 th" -> "28th")
    .replace(/\b(\d+)\s+(st|nd|rd|th)\b/gi, '$1$2')
    // 4. Fix hyphenated compound words (e.g. "flip - flops" -> "flip-flops")
    .replace(/\b([A-Za-z]+)\s+-\s+([A-Za-z]+)\b/g, '$1-$2')
    // 5a. Fix special known word fragment splits first (e.g. CE FR -> CEFR, Circle Kand -> Circle K and)
    .replace(/\bhes\s+itating\b/gi, 'hesitating')
    .replace(/\bcan\s+adian\b/gi, 'Canadian')
    .replace(/\bc\s*e\s*f\s*r\s*(level)?\b/gi, (_, p1) => p1 ? 'CEFR level' : 'CEFR')
    .replace(/\bCircle\s+Kand\b/gi, 'Circle K and')
    // 5a2. Fix spaced acronyms (e.g. "U S A" -> "USA", "P D F" -> "PDF") and split acronyms stuck to nouns (e.g. "CEFRlevel" -> "CEFR level")
    .replace(/\b([A-Z])\s+([A-Z])\s+([A-Z])\s+([A-Z])\b/g, '$1$2$3$4')
    .replace(/\b([A-Z])\s+([A-Z])\s+([A-Z])\b/g, '$1$2$3')
    .replace(/\b([A-Z]{2,})([a-z]{2,})\b/g, '$1 $2')
    // 5b. Clean dangling possessives/articles with accidental periods (e.g. "my. Hair" -> "my hair", "with the." -> "with the...")
    .replace(/\b(my|your|our|their|his|her|its|a|an|the|and|or|but|to|of|with|for|in|at|on|so)\.\s+([a-zA-Z])/gi, (_, p1, p2) => `${p1} ${p2.toLowerCase()}`)
    .replace(/\b(my|your|our|their|his|her|its|a|an|the|and|or|but|to|of|with|for|in|at|on|so)\.$/gi, '$1...')
    // 5c. Fix detached consonant clusters and single consonant prefixes (e.g. "wr inkly", "kn uckles", "cl ippers", "tr inkets", "m owing", "r ake", "ch ores")
    .replace(/(^|\s)(wr|kn|cl|cr|tr|bl|br|fl|fr|gl|gr|pl|pr|sc|sk|sl|sm|sn|sp|sw|wh|ch|Wr|Kn|Cl|Cr|Tr|Bl|Br|Fl|Fr|Gl|Gr|Pl|Pr|Sc|Sk|Sl|Sm|Sn|Sp|Sw|Wh|Ch|[b-hj-z])\s+([a-z]{2,})\b/g, (m, p1, p2, p3) => {
      if (COMMON_STANDALONE_WORDS.has(p3.toLowerCase())) return m;
      return p1 + p2 + p3;
    })
    .replace(/(^|\s)(wr|kn|cl|cr|tr|bl|br|fl|fr|gl|gr|pl|pr|sc|sk|sl|sm|sn|sp|sw|wh|ch|Wr|Kn|Cl|Cr|Tr|Bl|Br|Fl|Fr|Gl|Gr|Pl|Pr|Sc|Sk|Sl|Sm|Sn|Sp|Sw|Wh|Ch|[b-hj-z])\s+([a-z]{2,})\b/g, (m, p1, p2, p3) => {
      if (COMMON_STANDALONE_WORDS.has(p3.toLowerCase())) return m;
      return p1 + p2 + p3;
    })
    // 5d. Fix bound-morpheme suffix detachment (e.g. "budget ed" -> "budgeted", "vacuum ing" -> "vacuuming", "spong es" -> "sponges")
    .replace(/\b([a-zA-Z]{2,})\s+(ing|ed|ly|es|tion|sion|ment|ness|ible|ables|ish|ful|less|ize|ise)\b/gi, '$1$2')
    // 5e. Fix fused adverbs, conjunctions and separated compounds (must run after bound suffixes)
    .replace(/\b([a-zA-Z]+ly)(less)\b/g, '$1 $2')
    .replace(/\b(supply)(less)\s+(than)\b/g, '$1 $2 $3')
    .replace(/\b(much|so|far|even)(less)\b/gi, '$1 $2')
    .replace(/\b(an|the|this|recent|latest|our|their|a)\s+up\s+date\b/gi, '$1 update')
    .replace(/\b(a\s+no)\s+brainer\b/gi, '$1-brainer')
    // 6. Ensure single space after punctuation (selective: do not insert space in numbers or decimals)
    .replace(/([;?!])([A-Za-z0-9])/g, '$1 $2')
    .replace(/([:,])([A-Za-z])/g, '$1 $2')
    .replace(/(\.)([A-Za-z])/g, '$1 $2')
    // 7. Fix currency and numbers spacing (e.g. "3, 000" -> "3,000", "$10, 000" -> "$10,000", "$ 50" -> "$50", "Yeah,$15" -> "Yeah, $15", "$2.$2?" -> "$2. $2?")
    .replace(/([a-zA-Z0-9])([$€£¥₫])/g, '$1 $2')
    .replace(/([$€£¥₫])\s+(\d)/g, '$1$2')
    .replace(/([,;:])\s*([$€£¥₫])/g, '$1 $2')
    .replace(/\b(\d{1,3}),\s+(\d{3})\b/g, '$1,$2')
    .replace(/\b(\d{1,3}),\s+(\d{3})\b/g, '$1,$2')
    .replace(/\b(\d+)\.\s+(\d+[a-zA-Z]*)\b/g, '$1.$2')
    .replace(/(\.)\s*([$€£¥₫])/g, '$1 $2')
    // 8. Fix domain names (e.g. "volcaenglish. Com" -> "volcaenglish.com")
    .replace(/\b([a-z0-9_-]+)\.\s*(com|net|org|io|edu|gov|co|uk|us|vn)\b/gi, (_, p1, p2) => `${p1}.${p2.toLowerCase()}`)
    // 9. Fix lowercase English pronoun "I" and its contractions
    .replace(/\bi\b/g, 'I')
    .replace(/\bi(['’](?:m|ve|ll|d))\b/gi, (_, p1) => 'I' + p1.toLowerCase())
    // 10. Capitalize common proper nouns, tech entities and AI models
    .replace(/\b(england|america|american|english|spanish|french|german|colorado|chicago|britain|british|hanoi|vietnam|vietnamese|barack|obama|wellington|auckland|christchurch|queenstown|transcoastal|narahoe|ruapehu|tongariro|zapier|cursor|nvidia|samsung|dropbox|shopify|anthropic)\b/gi, (m) => m.charAt(0).toUpperCase() + m.slice(1).toLowerCase())
    .replace(/\bopen\s+ai\b/gi, 'OpenAI')
    .replace(/\bcloud\s+code\b/gi, 'Cloud Code')
    .replace(/\bgrok\s*bot\b/gi, 'Grokbot')
    .replace(/\belon('s|\s+musk)\b/gi, (m) => m.toLowerCase().startsWith("elon's") ? "Elon's" : "Elon Musk")
    .replace(/\b(kimi|kimmy)\s+([kK]\d)\b/gi, (_, _p1, p2) => `Kimi ${p2.toUpperCase()}`)
    .replace(/\b(grok|fable|opus|astra)\s+(\d+\.\d+|\bmax\b)/gi, (_, p1, p2) => {
      const name = p1.charAt(0).toUpperCase() + p1.slice(1).toLowerCase();
      const ver = p2.toLowerCase() === 'max' ? 'Max' : p2;
      return `${name} ${ver}`;
    })
    // 11. Capitalize letter following sentence punctuation (. ? !)
    .replace(/([.!?]\s+)([a-z])/g, (_, p1, p2) => p1 + p2.toUpperCase())
    // 12. Split run-on clauses before strong sentence transitions
    .replace(/\b([a-z0-9]+)\s+and\s+speaking\s+of\s+([a-zA-Z]+)\b/gi, '$1. And speaking of $2')
    .replace(/\b(that's\s+(?:his\s+job|her\s+job|fine|great|good|true|right|okay))\s+that's\b/gi, "$1. That's")
    .replace(/\b([a-z]{2,})\s+((?:Now|It's|Then|So|Today|Here|We're|You're|Let's|This|That|There|Get|Tell|Start)\b)/g, '$1. $2')
    // 13. Collapse multiple spaces
    .replace(/\s{2,}/g, ' ')
    .trim();

  // 14. Ensure first letter is capitalized
  if (cleaned.length > 0 && cleaned.charAt(0) >= 'a' && cleaned.charAt(0) <= 'z') {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }

  return cleaned;
}

/**
 * Exports lesson script to Markdown (.md):
 * Supports continuous reading prose for easy reading, as well as timestamped view.
 */
export function exportToMarkdown(
  lesson: Lesson,
  mode: 'reading' | 'timestamps' | 'both' = 'both'
): string {
  const lines: string[] = [];

  lines.push(`# ${lesson.title || 'Audio Script'}`);
  lines.push('');
  lines.push(
    `> **Tổng số câu:** ${lesson.sentences.length} • **Thời lượng:** ${formatTime(
      lesson.durationMs / 1000
    )} • **Nguồn:** ${lesson.source === 'youtube' ? 'YouTube' : 'Audio/Video'}`
  );
  lines.push('');

  // 1. Reading Prose Section (Continuous paragraphs)
  if (mode === 'reading' || mode === 'both') {
    lines.push('## 📖 Bài Đọc Liền Mạch (Reading Transcript)');
    lines.push('');

    let currentParagraph: string[] = [];
    for (let i = 0; i < lesson.sentences.length; i++) {
      const s = lesson.sentences[i];
      const prev = lesson.sentences[i - 1];

      // If gap between sentences is > 2.5s or previous sentence ends with strong punctuation, break paragraph
      if (prev && s.startMs - prev.endMs > 2500 && currentParagraph.length >= 2) {
        lines.push(cleanTranscriptTypography(currentParagraph.join(' ')));
        lines.push('');
        currentParagraph = [];
      }
      let sentText = cleanTranscriptTypography(s.transcript);
      if (sentText && !/[.!?]["']?$/.test(sentText)) {
        sentText += '.';
      }
      currentParagraph.push(sentText);
    }

    if (currentParagraph.length > 0) {
      lines.push(cleanTranscriptTypography(currentParagraph.join(' ')));
      lines.push('');
    }
  }

  // 2. Timestamped breakdown
  if (mode === 'timestamps' || mode === 'both') {
    if (mode === 'both') {
      lines.push('---');
      lines.push('');
    }
    lines.push('## ⏱ Chi Tiết Từng Câu Kèm Mốc Thời Gian');
    lines.push('');

    lesson.sentences.forEach((s) => {
      const timeRange = `[${formatTime(s.startMs / 1000)} - ${formatTime(s.endMs / 1000)}]`;
      lines.push(`- **${String(s.index).padStart(2, '0')}** \`${timeRange}\`: ${cleanTranscriptTypography(s.transcript)}`);
    });
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Exports complete lesson to JSON for 100% preservation & backup
 */
export function exportToJSON(lesson: Lesson): string {
  return JSON.stringify(lesson, null, 2);
}

/**
 * Exports lesson sentences to standard SRT subtitle file
 */
export function exportToSRT(lesson: Lesson): string {
  return lesson.sentences
    .map((s, idx) => {
      const index = idx + 1;
      const start = formatSRTTime(s.startMs);
      const end = formatSRTTime(s.endMs);
      return `${index}\n${start} --> ${end}\n${s.transcript.trim()}\n`;
    })
    .join('\n');
}

/**
 * Parses imported script from JSON, SRT, VTT, or plain text
 */
export function parseImportedScript(
  rawContent: string,
  fileName = ''
): { sentences: Partial<Sentence>[]; title?: string } | null {
  const trimmed = rawContent.trim();
  if (!trimmed) return null;

  // 1. Try parsing JSON
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.sentences && Array.isArray(parsed.sentences)) {
        return {
          sentences: parsed.sentences,
          title: parsed.title,
        };
      }
      if (Array.isArray(parsed)) {
        return {
          sentences: parsed,
        };
      }
    } catch {
      // Fall through to other parsers
    }
  }

  // 2. Try parsing SRT / VTT subtitle format
  if (
    fileName.endsWith('.srt') ||
    fileName.endsWith('.vtt') ||
    trimmed.includes('-->')
  ) {
    const blocks = trimmed.split(/\n\s*\n/).filter(Boolean);
    const sentences: Partial<Sentence>[] = [];
    let counter = 1;

    for (const block of blocks) {
      const lines = block.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      if (lines.length === 0) continue;

      let timeLineIdx = -1;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('-->')) {
          timeLineIdx = i;
          break;
        }
      }

      if (timeLineIdx >= 0) {
        const timeLine = lines[timeLineIdx];
        const [startPart, endPart] = timeLine.split('-->');
        if (startPart && endPart) {
          const startMs = parseSRTTime(startPart.trim());
          const endMs = parseSRTTime(endPart.trim().split(/\s+/)[0]);
          const text = lines.slice(timeLineIdx + 1).join(' ').trim();

          if (text) {
            sentences.push({
              id: `sent_import_${counter}_${Date.now()}`,
              index: counter,
              startMs,
              endMs: Math.max(startMs + 500, endMs),
              transcript: text,
              starred: false,
              markedDifficult: false,
              transcriptRevealed: false,
              shadowCompleted: false,
            });
            counter++;
          }
        }
      }
    }

    if (sentences.length > 0) {
      return { sentences };
    }
  }

  // 3. Fallback: Parse plain text / markdown lines as sentences
  const rawLines = trimmed
    .split(/\r?\n/)
    .map((l) => l.replace(/^#+\s*/, '').replace(/^[-*]\s*/, '').trim())
    .filter(Boolean);

  if (rawLines.length > 0) {
    let currentMs = 0;
    const avgSentenceDurationMs = 4000;
    const sentences: Partial<Sentence>[] = rawLines.map((line, idx) => {
      const startMs = currentMs;
      const endMs = startMs + avgSentenceDurationMs;
      currentMs = endMs;
      return {
        id: `sent_import_${idx + 1}_${Date.now()}`,
        index: idx + 1,
        startMs,
        endMs,
        transcript: line,
        starred: false,
        markedDifficult: false,
        transcriptRevealed: false,
        shadowCompleted: false,
      };
    });

    return { sentences };
  }

  return null;
}

/**
 * Triggers a client-side file download
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
