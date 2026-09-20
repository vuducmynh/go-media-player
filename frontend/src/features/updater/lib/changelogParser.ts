/**
 * changelogParser.ts
 * Parser for release notes and changelog markdown strings.
 * Extracts Title, Date, Description, and the 3 categorized change lists:
 * 1. Improvements (Cải tiến)
 * 2. Fixes (Sửa lỗi)
 * 3. Patches (Bản vá)
 */

export interface ParsedReleaseNotes {
  version: string;
  date: string;
  title: string;
  description: string;
  improvements: string[];
  fixes: string[];
  patches: string[];
  rawMarkdown?: string;
}

export function formatVietnameseDate(dateStr?: string | null): string {
  if (!dateStr) {
    const now = new Date();
    return `${now.getDate()} tháng ${now.getMonth() + 1}, ${now.getFullYear()}`;
  }

  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return `${d.getDate()} tháng ${d.getMonth() + 1}, ${d.getFullYear()}`;
  } catch {
    return dateStr;
  }
}

export function parseChangelog(
  markdown?: string | null,
  version: string = 'v1.3.0',
  publishedAt?: string | null
): ParsedReleaseNotes {
  const date = formatVietnameseDate(publishedAt);

  // Fallback defaults if markdown is completely empty
  const defaultTitle = `Bản cập nhật ${version}`;
  const defaultDescription = `Bản cập nhật mới mang lại nhiều cải tiến về hiệu năng, bổ sung tính năng và nâng cao trải nghiệm học tập.`;

  if (!markdown || !markdown.trim()) {
    return {
      version,
      date,
      title: defaultTitle,
      description: defaultDescription,
      improvements: [
        'Tối ưu giao diện và hiệu năng ứng dụng.',
        'Cải thiện độ mượt mà khi xử lý âm thanh và video.',
      ],
      fixes: ['Sửa các lỗi nhỏ được báo cáo từ phiên bản trước.'],
      patches: [],
    };
  }

  const lines = markdown.split(/\r?\n/);

  let title = '';
  const descLines: string[] = [];
  const improvements: string[] = [];
  const fixes: string[] = [];
  const patches: string[] = [];

  type Section = 'none' | 'desc' | 'improvements' | 'fixes' | 'patches' | 'other';
  let currentSection: Section = 'none';

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    if (!line) {
      if (currentSection === 'desc') {
        descLines.push('');
      }
      continue;
    }

    // Check for Title: first line starting with '# ' (single hash)
    if (!title && /^#\s+/.test(line)) {
      title = line.replace(/^#\s+/, '').trim();
      currentSection = 'desc';
      continue;
    }

    // Check for section headers: '## ' or '### '
    const headerMatch = line.match(/^#{2,3}\s+(.*)$/);
    if (headerMatch) {
      const headerText = headerMatch[1].toLowerCase();

      if (
        headerText.includes('improvement') ||
        headerText.includes('cải tiến') ||
        headerText.includes('tính năng mới') ||
        headerText.includes('feature')
      ) {
        currentSection = 'improvements';
      } else if (
        headerText.includes('fix') ||
        headerText.includes('sửa lỗi') ||
        headerText.includes('bug')
      ) {
        currentSection = 'fixes';
      } else if (
        headerText.includes('patch') ||
        headerText.includes('bản vá') ||
        headerText.includes('hotfix')
      ) {
        currentSection = 'patches';
      } else {
        currentSection = 'other';
      }
      continue;
    }

    // Check for bullet items: starts with '-', '*', or '•'
    const isBullet = /^[-*•]\s+/.test(line);

    if (currentSection === 'improvements' && isBullet) {
      improvements.push(line.replace(/^[-*•]\s+/, '').trim());
    } else if (currentSection === 'fixes' && isBullet) {
      fixes.push(line.replace(/^[-*•]\s+/, '').trim());
    } else if (currentSection === 'patches' && isBullet) {
      patches.push(line.replace(/^[-*•]\s+/, '').trim());
    } else if (currentSection === 'desc' || currentSection === 'none') {
      // If we haven't hit a section header yet
      if (isBullet) {
        // Uncategorized bullet: auto-categorize based on conventional commit prefix
        const lower = line.toLowerCase();
        const cleanBullet = line.replace(/^[-*•]\s+/, '').trim();
        if (lower.includes('fix:') || lower.includes('fix(') || lower.includes('sửa:')) {
          fixes.push(cleanBullet);
        } else if (lower.includes('patch:') || lower.includes('perf:') || lower.includes('refactor:')) {
          patches.push(cleanBullet);
        } else {
          improvements.push(cleanBullet);
        }
      } else {
        descLines.push(line);
      }
    } else if (currentSection === 'other' && isBullet) {
      // Bullets under other headings
      improvements.push(line.replace(/^[-*•]\s+/, '').trim());
    }
  }

  // Clean up description
  const description = descLines
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim() || defaultDescription;

  return {
    version,
    date,
    title: title || defaultTitle,
    description,
    improvements,
    fixes,
    patches,
    rawMarkdown: markdown,
  };
}
