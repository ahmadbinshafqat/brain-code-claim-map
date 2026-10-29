export type RiskLabel = "High risk" | "Needs tests" | "Needs docs" | "Follow-up";

export type Finding = {
  id: string;
  lineNumber: number;
  score: number;
  label: RiskLabel;
  reason: string;
  snippet: string;
};

export type ProjectRecord = {
  id: string;
  name: string;
  createdAt: string;
};

export type ScanRecord = {
  id: string;
  projectId: string;
  createdAt: string;
  totalLines: number;
  findingCount: number;
  maxScore: number;
  summary: string;
};

export type ScanResponse = {
  project: ProjectRecord;
  scan: ScanRecord;
  findings: Finding[];
  annotatedLines: AnnotatedLine[];
  markdownReport: string;
};

export type AnnotatedLine = {
  lineNumber: number;
  text: string;
  score: number;
  label: RiskLabel | "None";
  reasons: string[];
};

export type ScanHistoryItem = {
  id: string;
  title: string;
  createdAt: string;
  code: string;
  response: ScanResponse;
};
