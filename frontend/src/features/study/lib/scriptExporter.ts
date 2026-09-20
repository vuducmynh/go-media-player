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
    // 5. Fix detached single consonants (e.g. "m owing" -> "mowing", "r ake" -> "rake", "w aved" -> "waved")
    .replace(/(^|\s)([b-hj-zB-HJ-Z])\s+([a-z]{2,})\b/g, '$1$2$3')
    .replace(/(^|\s)([b-hj-zB-HJ-Z])\s+([a-z]{2,})\b/g, '$1$2$3')
    // 6. Ensure single space after punctuation if immediately followed by letter/number
    .replace(/([,.:;?!])([A-Za-z0-9])/g, '$1 $2')
    // 7. Fix lowercase English pronoun "I" and its contractions
    .replace(/\bi\b/g, 'I')
    .replace(/\bi(['’](?:m|ve|ll|d))\b/gi, (_, p1) => 'I' + p1.toLowerCase())
    // 8. Capitalize common proper nouns
    .replace(/\b(england|america|american|english|spanish|french|german|colorado|chicago|britain|british)\b/gi, (m) => m.charAt(0).toUpperCase() + m.slice(1).toLowerCase())
    // 9. Capitalize letter following sentence punctuation (. ? !)
    .replace(/([.!?]\s+)([a-z])/g, (_, p1, p2) => p1 + p2.toUpperCase())
    // 10. Split run-on clauses before strong sentence transitions
    .replace(/\b([a-z]{2,})\s+((?:Now|It's|Then|So|Today|Here|We're|You're|Let's|This|That|There)\b)/g, '$1. $2')
    // 11. Collapse multiple spaces
    .replace(/\s{2,}/g, ' ')
    .trim();

  // 12. Ensure first letter is capitalized
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
