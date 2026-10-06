export type Project = {
  id: string;
  name: string;
  createdAt: string;
};

export type Scan = {
  id: string;
  projectId: string;
  inputText: string;
  createdAt: string;
};

export type Finding = {
  id: string;
  scanId: string;
  lineStart: number;
  lineEnd: number;
  score: number;
  label: string;
  reason: string;
};

export type ScanResult = {
  project: Project;
  scan: Scan;
  findings: Finding[];
  lineScores: Record<number, number>;
};
