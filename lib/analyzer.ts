import { Finding, Project, Scan, ScanResult } from "./types";

function makeId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

function labelForScore(score: number): string {
  if (score >= 75) return "High risk";
  if (score >= 50) return "Needs tests";
  if (score >= 30) return "Needs docs";
  return "Follow-up";
}

function hasNearbyDoc(lines: string[], index: number): boolean {
  const prev = lines.slice(Math.max(0, index - 3), index).join("\n");
  return /\/\*\*|'''|\"\"\"|^\s*#\s+|^\s*\/\//m.test(prev);
}

export function analyzeCode(inputText: string, projectName = "Untitled Project"): ScanResult {
  const now = new Date().toISOString();
  const project: Project = { id: makeId("project"), name: projectName.trim() || "Untitled Project", createdAt: now };
  const scan: Scan = { id: makeId("scan"), projectId: project.id, inputText, createdAt: now };
  const lines = inputText.replace(/\r\n/g, "\n").split("\n");
  const findings: Finding[] = [];
  const lineScores: Record<number, number> = {};

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    const trimmed = line.trim();
    let score = 0;
    const reasons: string[] = [];

    if (!trimmed) {
      lineScores[lineNumber] = 0;
      return;
    }

    if (/\b(if|else if|for|while|switch|case|catch|except|try)\b/.test(trimmed)) {
      score += 22;
      reasons.push("control flow branch raises test-path complexity");
    }

    if (/\b(async|await|fetch|axios|http|request|query|execute|connect|readFile|writeFile|open\()\b/i.test(trimmed)) {
      score += 20;
      reasons.push("external I/O or async behavior can fail in production");
    }

    if (/\b(throw|raise|panic|return\s+null|return\s+undefined|reject)\b/i.test(trimmed)) {
      score += 18;
      reasons.push("error or empty-result path should be tested");
    }

    if (/\b(eval|exec|innerHTML|dangerouslySetInnerHTML|SELECT|INSERT|UPDATE|DELETE|password|secret|token)\b/i.test(trimmed)) {
      score += 30;
      reasons.push("security-sensitive operation or data deserves review");
    }

    if (/TODO|FIXME|HACK|XXX/i.test(trimmed)) {
      score += 34;
      reasons.push("explicit follow-up marker found");
    }

    if (trimmed.length > 100) {
      score += 14;
      reasons.push("long dense line may be underexplained");
    }

    if (/\b(function|class|export\s+function|export\s+default|def\s+|public\s+|private\s+|const\s+\w+\s*=\s*(async\s*)?\()/.test(trimmed)) {
      score += hasNearbyDoc(lines, index) ? 8 : 24;
      reasons.push(hasNearbyDoc(lines, index) ? "public definition has some nearby docs" : "definition lacks nearby explanatory docs");
    }

    if (/\b(return|setState|useState|dispatch|push\(|splice\(|delete\s+)\b/.test(trimmed)) {
      score += 10;
      reasons.push("state or output-changing line affects behavior");
    }

    score = Math.min(100, score);
    lineScores[lineNumber] = score;

    if (score > 0) {
      findings.push({
        id: makeId("finding"),
        scanId: scan.id,
        lineStart: lineNumber,
        lineEnd: lineNumber,
        score,
        label: labelForScore(score),
        reason: reasons.join("; ")
      });
    }
  });

  findings.sort((a, b) => b.score - a.score || a.lineStart - b.lineStart);
  return { project, scan, findings, lineScores };
}
