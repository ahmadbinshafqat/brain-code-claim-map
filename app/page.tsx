"use client";

import { useMemo, useState } from "react";
import type { Finding, ScanResult } from "../lib/types";

const sampleCode = `export async function createInvoice(user, items, token) {
  // TODO: validate tax and currency rules before launch
  if (!user || !token) {
    throw new Error("Missing auth context");
  }

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const response = await fetch("/api/invoices", {
    method: "POST",
    headers: { Authorization: "Bearer " + token },
    body: JSON.stringify({ userId: user.id, subtotal })
  });

  if (!response.ok) {
    return null;
  }

  return response.json();
}`;

function riskBucket(score: number): number {
  if (score >= 75) return 4;
  if (score >= 50) return 3;
  if (score >= 30) return 2;
  if (score > 0) return 1;
  return 0;
}

function reportMarkdown(result: ScanResult): string {
  const rows = result.findings
    .map((f) => `| ${f.lineStart}-${f.lineEnd} | ${f.score} | ${f.label} | ${f.reason.replace(/\|/g, "-")} |`)
    .join("\n");

  return `# Code Claim Map Report\n\nProject: ${result.project.name}\n\nScan: ${result.scan.id}\n\nCreated: ${result.scan.createdAt}\n\n## Summary\n\n- Lines scanned: ${result.scan.inputText.split("\n").length}\n- Findings: ${result.findings.length}\n- Highest score: ${result.findings[0]?.score ?? 0}\n\n## Findings\n\n| Lines | Score | Label | Reason |\n| --- | ---: | --- | --- |\n${rows || "| - | 0 | Clean | No findings |"}\n`;
}

export default function Home() {
  const [projectName, setProjectName] = useState("Demo Checkout Service");
  const [inputText, setInputText] = useState(sampleCode);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const lines = useMemo(() => inputText.replace(/\r\n/g, "\n").split("\n"), [inputText]);
  const highest = result?.findings[0]?.score ?? 0;

  async function scan() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectName, inputText })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Scan failed");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed");
    } finally {
      setLoading(false);
    }
  }

  function downloadReport() {
    if (!result) return;
    const blob = new Blob([reportMarkdown(result)], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${result.project.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "code-claim-map"}-report.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function findingForLine(lineNumber: number): Finding | undefined {
    return result?.findings.find((finding) => finding.lineStart === lineNumber);
  }

  return (
    <main className="page">
      <section className="hero">
        <div>
          <h1>Code Claim Map</h1>
          <p className="subtitle">
            Paste a snippet and get a prioritized maintenance-risk heatmap. Find lines that probably need tests,
            documentation, or follow-up before they surprise you later.
          </p>
        </div>
        <div className="card stats" aria-label="Scan summary">
          <div className="stat"><b>{result ? lines.length : "—"}</b><span>lines scanned</span></div>
          <div className="stat"><b>{result?.findings.length ?? "—"}</b><span>findings</span></div>
          <div className="stat"><b>{result ? highest : "—"}</b><span>top risk</span></div>
        </div>
      </section>

      <section className="workspace">
        <div className="card">
          <label htmlFor="projectName">Project name</label>
          <input id="projectName" value={projectName} onChange={(event) => setProjectName(event.target.value)} />
          <div style={{ height: 14 }} />
          <label htmlFor="code">Code snippet</label>
          <textarea id="code" value={inputText} onChange={(event) => setInputText(event.target.value)} spellCheck={false} />
          <div className="actions">
            <button className="primary" onClick={scan} disabled={loading}>{loading ? "Scanning…" : "Scan Code"}</button>
            <button className="secondary" onClick={() => setInputText(sampleCode)}>Load sample</button>
            <button className="secondary" onClick={downloadReport} disabled={!result}>Download report</button>
          </div>
          {error ? <div className="error">{error}</div> : null}
        </div>

        <div className="card">
          <div className="finding-head">
            <div>
              <label style={{ marginBottom: 2 }}>Annotated heatmap</label>
              <div className="small">Darker lines indicate higher likely maintenance risk.</div>
            </div>
          </div>

          <div className="heatmap" aria-label="Annotated line heatmap">
            {lines.map((line, index) => {
              const lineNumber = index + 1;
              const score = result?.lineScores[lineNumber] ?? 0;
              const finding = findingForLine(lineNumber);
              return (
                <div key={lineNumber} className={`line risk-${riskBucket(score)}`} title={finding?.reason || "No finding"}>
                  <span className="line-number">{lineNumber}</span>
                  <span className="code">{line || " "}</span>
                  <span className="badge">{score ? `${score}` : ""}</span>
                </div>
              );
            })}
          </div>

          <div className="findings">
            {(result?.findings ?? []).slice(0, 10).map((finding) => (
              <article className="finding" key={finding.id}>
                <div className="finding-head">
                  <span className="finding-title">Line {finding.lineStart}: {finding.label}</span>
                  <span className="badge risk-3">{finding.score}</span>
                </div>
                <p>{finding.reason}</p>
              </article>
            ))}
            {result && result.findings.length === 0 ? <p className="small">No risky lines found. This snippet looks calm.</p> : null}
            {!result ? <p className="small">Run a scan to see ranked findings and explanations.</p> : null}
          </div>
        </div>
      </section>
    </main>
  );
}
