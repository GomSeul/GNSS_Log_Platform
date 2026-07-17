/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  testIds: string[];
}

export interface RuleConfig {
  cn0DropThreshold: number; // dB-Hz (e.g. drop by 10 dB-Hz / threshold below 30 dB-Hz)
  dopplerJumpThreshold: number; // Hz (e.g. sudden jump of 150 Hz)
  pllThreshold: number; // radians or unitless output (e.g. PLL discriminator > 0.05)
  positionErrorLimit: number; // meters (e.g. 3D error > 15m)
  missingTimeThreshold: number; // seconds (e.g. gaps > 1.5s)
}

export interface TestTrial {
  id: string;
  projectId: string;
  name: string;
  testTime: string;
  swVersion: string;
  hwVersion: string;
  scenario: string;
  receiverInfo: string;
  inspector: string;
  isBaseline: boolean;
  logsCount: number;
  status: 'passed' | 'failed' | 'warning';
  version: number;
  notes: string;
  ruleConfig: RuleConfig;
  analysisDate?: string;
  aiAnalysisReport?: string;
}

export interface GNSSDataRow {
  epoch: number;
  timeSec: number; // elapsed seconds or absolute
  prn: number;
  cn0: number; // dB-Hz
  doppler: number; // Hz (measured)
  dopplerErr: number; // Hz (compared to simulator)
  codePhase: number; // chips
  pllDisc: number; // PLL discriminator value
  pseudorangeErr: number; // meters
  positionErr: number; // meters
  velocityErr: number; // m/s
  lockStatus: boolean; // false if tracking loss occurred
}

export interface AnomalyEvent {
  id: string;
  testId: string;
  timestamp: number; // timeSec
  prn: number;
  metricType: 'cn0' | 'doppler' | 'pll' | 'position' | 'tracking_loss' | 'integrity';
  severity: 'info' | 'warning' | 'error' | 'critical';
  description: string;
  status: 'unreviewed' | 'investigating' | 'false_alarm' | 'suspected_bug' | 'hardware_issue';
  reviewNotes: string;
  contextData: GNSSDataRow[]; // Window of data around the event (e.g. -5s to +5s)
}

export interface ColumnMapping {
  epoch: string;
  timeSec: string;
  prn: string;
  cn0: string;
  doppler: string;
  dopplerErr: string;
  codePhase: string;
  pllDisc: string;
  pseudorangeErr: string;
  positionErr: string;
  velocityErr: string;
  lockStatus: string;
}

export interface MappingTemplate {
  id: string;
  name: string;
  description: string;
  mapping: ColumnMapping;
}

export interface PerformanceStats {
  ttff: number; // Time To First Fix in seconds
  trackingLockRatio: number; // % of time tracking is locked
  meanCn0: number; // dB-Hz
  minCn0: number; // dB-Hz
  dopplerRmsErr: number; // Hz
  pllRmsDisc: number;
  pseudorangeRmsErr: number; // m
  meanPositionErr: number; // m
  maxPositionErr: number; // m
  cep50: number; // Circular Error Probable 50%
  cep95: number; // Circular Error Probable 95%
  lockLossCount: number;
}
