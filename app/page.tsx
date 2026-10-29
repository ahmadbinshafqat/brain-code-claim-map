"use client";

import { useEffect, useMemo, useState } from "react";
import type { AnnotatedLine, Finding, ScanHistoryItem, ScanResponse } from "@/lib/types";

const sampleCode = `async function updateUserProfile(userId, input, db) {
  // TODO: validate role transitions before launch
  const user = await db.query("select * from users where id = " + userId);

  if (!user) {
    throw new Error("Missing user");
  }

  if (input.password) {
    await fetch("/api/audit", { method: "POST", body: JSON.stringify(input) });
  }

  for (const key of Object.keys(input)) {
    user[key] = input[key];
  }

  return db.save(user);
}`;

const historyStorageKey = "code-claim-map.scan-history.v1";
const maxHistoryItems = 12;

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function findingClass(score: number) {
  if (score >= 75) return "risk-high";
  if (score >= 50) return "risk-test";
  if (score >= 30) return "risk-docs";
  if (score > 0) return "risk-follow";
  return "risk-none";
}

function buildHistoryTitle(code: string, response: ScanResponse) {
  const firstMeaningfulLine = code
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.length > 0);

  if (firstMeaningfulLine) {
    return firstMeaningfulLine.length > 52
      ? `${firstMeaningfulLine.slice(0, 49)}...`
      : firstMeaningfulLine;
  }

  return `Scan with ${response.findings.length} finding${response.findings.length === 1 ? "" : "s"}`;
}

function downloadMarkdown(markdown: string, scanId: string) {
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `code-claim-map-${scanId}.md`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export default function HomePage() {
  const [code, setCode] = useState(sampleCode);
  const [result, setResult] = useState<ScanResponse | null>(null);
  const [history, setHistory] = useState<ScanHistoryItem[]>([]);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(historyStorageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as ScanHistoryItem[];
      if (Array.isArray(parsed)) {
        setHistory(parsed.filter((item) => item && item.id && item.response && item.code));
      }
    } catch {
      window.localStorage.removeItem(historyStorageKey);
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(historyStorageKey, JSON.stringify(history));
    } catch {
      setError("Scan history could not be saved because browser storage is full or unavailable.");
    }
  }, [history]);

  const topFinding = useMemo<Finding | null>(() => {
    if (!result || result.findings.length === 0) return null;
    return result.findings[0];
  }, [result]);

  async function handleScan() {
    setIsScanning(true);
    setError(null);

    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code })
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Scan failed");
      }

      const data = (await response.json()) as ScanResponse;
      setResult(data);

      const historyItem: ScanHistoryItem = {
        id: data.scan.id,
        title: buildHistoryTitle(code, data),
        createdAt: data.scan.createdAt,
        code,
        response: data
      };

      setActiveHistoryId(historyItem.id);
      setHistory((current) => {
        const withoutDuplicate = current.filter((item) => item.id !== historyItem.id);
        return [historyItem, ...withoutDuplicate].slice(0, maxHistoryItems);
      });
    } catch (scanError) {
      setError(scanError instanceof Error ? scanError.message : "Something went wrong while scanning.");
    } finally {
      setIsScanning(false);
    }
  }

  function loadHistoryItem(item: ScanHistoryItem) {
    setCode(item.code);
    setResult(item.response);
    setActiveHistoryId(item.id);
    setError(null);
  }

  function clearHistory() {
    setHistory([]);
    setActiveHistoryId(null);
    window.localStorage.removeItem(historyStorageKey);
  }

  return (
    <main className="app-shell">
      <section className="hero-card">
        <p className="eyebrow">Code Claim Map</p>
        <h1>Find the lines most likely to need tests, docs, or follow-up work.</h1>
        <p className="hero-copy">
          Paste code, run a deterministic local scan, and get a prioritized maintenance-risk heatmap with short explanations.
        </p>
      </section>

      <div className="workspace-layout">
        <aside className="history-sidebar" aria-label="Recent scans">
          <div className="history-header">
            <div>
              <p className="eyebrow">History</p>
              <h2>Recent scans</h2>
            </div>
            {history.length > 0 ? (
              <button className="ghost-button small-button" type="button" onClick={clearHistory}>
                Clear
              </button>
            ) : null}
          </div>

          {history.length === 0 ? (
            <div className="empty-history">
              <p>No saved scans yet.</p>
              <span>Run a scan and it will stay here in this browser for quick revisits.</span>
            </div>
          ) : (
            <ol className="history-list">
              {history.map((item) => (
                <li key={item.id}>
                  <button
                    className={`history-item ${activeHistoryId === item.id ? "active" : ""}`}
                    type="button"
                    onClick={() => loadHistoryItem(item)}
                  >
                    <span className="history-title">{item.title}</span>
                    <span className="history-meta">
                      {formatDate(item.createdAt)} · {item.response.scan.findingCount} finding
                      {item.response.scan.findingCount === 1 ? "" : "s"}
                    </span>
                    <span className={`history-score ${findingClass(item.response.scan.maxScore)}`}>
                      Max {item.response.scan.maxScore}
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          )}
        </aside>

        <div className="main-column">
          <section className="panel input-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Input</p>
                <h2>Source code</h2>
              </div>
              <button className="ghost-button" type="button" onClick={() => setCode(sampleCode)}>
                Load sample
              </button>
            </div>

            <textarea
              value={code}
              onChange={(event) => {
                setCode(event.target.value);
                setActiveHistoryId(null);
              }}
              spellCheck={false}
              aria-label="Code to scan"
            />

            <div className="actions-row">
              <button className="primary-button" type="button" onClick={handleScan} disabled={isScanning || code.trim().length === 0}>
                {isScanning ? "Scanning..." : "Scan Code"}
              </button>
              {result ? (
                <button className="secondary-button" type="button" onClick={() => downloadMarkdown(result.markdownReport, result.scan.id)}>
                  Download Markdown Report
                </button>
              ) : null}
            </div>

            {error ? <p className="error-message">{error}</p> : null}
          </section>

          {result ? (
            <>
              <section className="stats-grid" aria-label="Scan summary">
                <div className="stat-card">
                  <span>Total lines</span>
                  <strong>{result.scan.totalLines}</strong>
                </div>
                <div className="stat-card">
                  <span>Findings</span>
                  <strong>{result.scan.findingCount}</strong>
                </div>
                <div className="stat-card">
                  <span>Max score</span>
                  <strong>{result.scan.maxScore}</strong>
                </div>
                <div className="stat-card">
                  <span>Top priority</span>
                  <strong>{topFinding ? topFinding.label : "Clean"}</strong>
                </div>
              </section>

              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">Heatmap</p>
                    <h2>Annotated lines</h2>
                  </div>
                  <p className="scan-summary">{result.scan.summary}</p>
                </div>
                <div className="heatmap" role="list">
                  {result.annotatedLines.map((line: AnnotatedLine) => (
                    <div className={`code-line ${findingClass(line.score)}`} key={line.lineNumber} role="listitem">
                      <span className="line-number">{line.lineNumber}</span>
                      <code>{line.text || " "}</code>
                      <span className="line-score">{line.score > 0 ? line.score : ""}</span>
                      {line.reasons.length > 0 ? <span className="line-reason">{line.reasons.join("; ")}</span> : null}
                    </div>
                  ))}
                </div>
              </section>

              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">Prioritized</p>
                    <h2>Ranked findings</h2>
                  </div>
                </div>

                {result.findings.length === 0 ? (
                  <p className="empty-state">No risky lines found by the current heuristics.</p>
                ) : (
                  <ol className="findings-list">
                    {result.findings.map((finding) => (
                      <li className="finding-card" key={finding.id}>
                        <div className="finding-topline">
                          <strong>Line {finding.lineNumber}</strong>
                          <span className={`badge ${findingClass(finding.score)}`}>
                            {finding.label} · {finding.score}
                          </span>
                        </div>
                        <p>{finding.reason}</p>
                        <code>{finding.snippet}</code>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            </>
          ) : (
            <section className="panel empty-results">
              <h2>Your scan results will appear here.</h2>
              <p>Run the sample or paste your own code to generate a heatmap, ranked findings, and a downloadable report.</p>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
