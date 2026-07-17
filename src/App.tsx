/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from "react";
import { Project, TestTrial, GNSSDataRow, AnomalyEvent, PerformanceStats, RuleConfig } from "./types";
import {
  getSavedProjects,
  saveProjects,
  getSavedTrials,
  saveTrials,
  generateBaselineData,
  generateInterferenceData,
  getMockAnomalies,
  MOCK_STATS,
  DEFAULT_RULE_CONFIG,
} from "./data/mockData";
import ProjectManager from "./components/ProjectManager";
import LogParser from "./components/LogParser";
import AnalyzerDashboard from "./components/AnalyzerDashboard";
import AnomalyDetector from "./components/AnomalyDetector";
import BaselineComparator from "./components/BaselineComparator";
import ReportGenerator from "./components/ReportGenerator";
import { motion, AnimatePresence } from "motion/react";
import {
  FolderLock,
  GitCompare,
  Terminal,
  Activity,
  AlertTriangle,
  FileCheck,
  Cpu,
  Layers,
  HelpCircle,
} from "lucide-react";

export default function App() {
  // 1. Core Databases
  const [projects, setProjects] = useState<Project[]>([]);
  const [trials, setTrials] = useState<TestTrial[]>([]);

  // 2. Active selections
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedTrial, setSelectedTrial] = useState<TestTrial | null>(null);

  // 3. Loaded log data & anomalies
  const [currentLogs, setCurrentLogs] = useState<GNSSDataRow[]>([]);
  const [currentAnomalies, setCurrentAnomalies] = useState<AnomalyEvent[]>([]);
  const [currentStats, setCurrentStats] = useState<PerformanceStats | null>(null);

  // 4. Navigation tabs
  const [activeTab, setActiveTab] = useState<
    "projects" | "parser" | "analyzer" | "detector" | "comparator" | "report"
  >("projects");

  // Load from database on mount
  useEffect(() => {
    const projs = getSavedProjects();
    const trs = getSavedTrials();
    setProjects(projs);
    setTrials(trs);

    if (projs.length > 0) {
      setSelectedProject(projs[0]);
      // Set default trial to Trial 2 (Jamming scenario) for stunning initial visualization
      const trial2 = trs.find((t) => t.id === "test-trial-jamming");
      if (trial2) {
        setSelectedTrial(trial2);
        setCurrentLogs(generateInterferenceData());
        setCurrentAnomalies(getMockAnomalies("test-trial-jamming"));
        setCurrentStats(MOCK_STATS["test-trial-jamming"]);
      }
    }
  }, []);

  // Update logs, anomalies, and stats automatically when active trial is selected
  const handleSelectTrial = (trial: TestTrial) => {
    setSelectedTrial(trial);
    
    // Check if the trial has logs analyzed already
    if (trial.id === "test-trial-baseline") {
      setCurrentLogs(generateBaselineData());
      setCurrentAnomalies([]);
      setCurrentStats(MOCK_STATS["test-trial-baseline"]);
      setActiveTab("analyzer");
    } else if (trial.id === "test-trial-jamming") {
      setCurrentLogs(generateInterferenceData());
      setCurrentAnomalies(getMockAnomalies("test-trial-jamming"));
      setCurrentStats(MOCK_STATS["test-trial-jamming"]);
      setActiveTab("analyzer");
    } else {
      // Custom trial, needs parsing
      if (trial.logsCount > 0) {
        // Already parsed
        setCurrentLogs(generateInterferenceData());
        setCurrentAnomalies(getMockAnomalies("test-trial-jamming"));
        setCurrentStats(MOCK_STATS["test-trial-jamming"]);
        setActiveTab("analyzer");
      } else {
        // Needs upload
        setCurrentLogs([]);
        setCurrentAnomalies([]);
        setCurrentStats(null);
        setActiveTab("parser");
      }
    }
  };

  // Projects logic
  const handleCreateProject = (name: string, description: string) => {
    const newProj: Project = {
      id: `proj-${Date.now()}`,
      name,
      description,
      createdAt: new Date().toISOString(),
      testIds: [],
    };
    const updated = [...projects, newProj];
    setProjects(updated);
    saveProjects(updated);
    setSelectedProject(newProj);
    setSelectedTrial(null);
    setCurrentLogs([]);
    setCurrentStats(null);
    setCurrentAnomalies([]);
    setActiveTab("projects");
  };

  const handleDeleteProject = (projectId: string) => {
    const updated = projects.filter((p) => p.id !== projectId);
    setProjects(updated);
    saveProjects(updated);
    if (selectedProject?.id === projectId) {
      setSelectedProject(updated[0] || null);
      setSelectedTrial(null);
    }
  };

  // Trials logic
  const handleCreateTrial = (trialData: Partial<TestTrial>) => {
    const newTrial: TestTrial = {
      ...(trialData as TestTrial),
      id: `trial-${Date.now()}`,
    };
    const updated = [...trials, newTrial];
    setTrials(updated);
    saveTrials(updated);

    // Update project trials list
    const updatedProjects = projects.map((p) => {
      if (p.id === selectedProject?.id) {
        return { ...p, testIds: [...p.testIds, newTrial.id] };
      }
      return p;
    });
    setProjects(updatedProjects);
    saveProjects(updatedProjects);

    setSelectedTrial(newTrial);
    setCurrentLogs([]);
    setCurrentStats(null);
    setCurrentAnomalies([]);
    setActiveTab("parser");
  };

  const handleDeleteTrial = (trialId: string) => {
    const updated = trials.filter((t) => t.id !== trialId);
    setTrials(updated);
    saveTrials(updated);
    if (selectedTrial?.id === trialId) {
      setSelectedTrial(null);
      setCurrentLogs([]);
      setCurrentStats(null);
      setCurrentAnomalies([]);
    }
  };

  const handleUpdateRuleConfig = (config: RuleConfig) => {
    if (!selectedTrial) return;
    const updatedTrial = { ...selectedTrial, ruleConfig: config };
    const updatedTrials = trials.map((t) => (t.id === selectedTrial.id ? updatedTrial : t));
    setTrials(updatedTrials);
    saveTrials(updatedTrials);
    setSelectedTrial(updatedTrial);
  };

  const handleUpdateAnomalyStatus = (id: string, status: AnomalyEvent["status"], notes: string) => {
    const updatedAnoms = currentAnomalies.map((a) => {
      if (a.id === id) {
        return { ...a, status, reviewNotes: notes };
      }
      return a;
    });
    setCurrentAnomalies(updatedAnoms);
  };

  // Triggered when log parsing and manual mapping completes
  const handleAnalysisComplete = (stats: PerformanceStats, logs: GNSSDataRow[], anomalies: AnomalyEvent[]) => {
    if (!selectedTrial) return;

    // Update trial status to processed
    const updatedTrial: TestTrial = {
      ...selectedTrial,
      logsCount: logs.length,
      status: anomalies.some((a) => a.severity === "critical" || a.severity === "error") ? "failed" : "passed",
    };

    const updatedTrials = trials.map((t) => (t.id === selectedTrial.id ? updatedTrial : t));
    setTrials(updatedTrials);
    saveTrials(updatedTrials);
    setSelectedTrial(updatedTrial);

    setCurrentLogs(logs);
    setCurrentAnomalies(anomalies);
    setCurrentStats(stats);
    setActiveTab("analyzer");
  };

  // Precomputed baseline details
  const baselineTrial = useMemo(() => {
    if (!selectedProject) return null;
    return trials.find((t) => t.projectId === selectedProject.id && t.isBaseline) || null;
  }, [trials, selectedProject]);

  const baselineStats = useMemo(() => {
    if (!baselineTrial) return null;
    return MOCK_STATS[baselineTrial.id] || MOCK_STATS["test-trial-baseline"];
  }, [baselineTrial]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased flex flex-col">
      {/* 1. Header (Standard Aerospace Grade Aesthetic) */}
      <header
        className="bg-white border-b border-slate-200/80 px-6 py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 print:hidden"
        id="grtip-main-header"
      >
        <div className="flex items-center gap-3">
          <FolderLock className="h-9 w-9 text-indigo-600 bg-indigo-50 p-2 rounded-xl border border-indigo-100" />
          <div>
            <h1 className="font-display font-bold text-slate-900 tracking-tight text-lg flex items-center gap-2">
              <span>위성항법 수신기 시험 로그 지능형 분석 플랫폼</span>
              <span className="text-[10px] bg-indigo-100/70 text-indigo-800 px-2 py-0.5 rounded font-mono font-bold uppercase tracking-wider">
                GRTIP v1.0
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              국가용 위성항법 장비의 반송파 신호 추적 정확도 검증, 복합 RF 재밍 및 동기 기만(Spoofing) 내성 진단 워크스테이션
            </p>
          </div>
        </div>

        {/* System Online Badge */}
        <div className="flex items-center gap-3 self-stretch md:self-auto justify-between md:justify-start border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>LOCAL SECURE RUNTIME</span>
          </div>
        </div>
      </header>

      {/* 2. Platform Navigation Panel */}
      {selectedProject && (
        <nav className="bg-white border-b border-slate-100 px-6 py-2 flex gap-1 overflow-x-auto print:hidden" id="grtip-main-nav">
          <button
            onClick={() => setActiveTab("projects")}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "projects" ? "bg-slate-100 text-indigo-600" : "hover:bg-slate-50 text-slate-600"
            }`}
          >
            <Cpu className="h-4 w-4" />
            <span>시험 프로젝트 제어</span>
          </button>
          
          <button
            onClick={() => {
              if (selectedTrial) setActiveTab("parser");
            }}
            disabled={!selectedTrial}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
              !selectedTrial ? "opacity-40 cursor-not-allowed" : ""
            } ${activeTab === "parser" ? "bg-slate-100 text-indigo-600" : "hover:bg-slate-50 text-slate-600"}`}
          >
            <Terminal className="h-4 w-4" />
            <span>로그 파서 & 매퍼</span>
          </button>

          <button
            onClick={() => {
              if (currentLogs.length > 0) setActiveTab("analyzer");
            }}
            disabled={currentLogs.length === 0}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
              currentLogs.length === 0 ? "opacity-40 cursor-not-allowed" : ""
            } ${activeTab === "analyzer" ? "bg-slate-100 text-indigo-600" : "hover:bg-slate-50 text-slate-600"}`}
          >
            <Activity className="h-4 w-4" />
            <span>수신기 정밀 성능 분석기</span>
          </button>

          <button
            onClick={() => {
              if (currentLogs.length > 0) setActiveTab("detector");
            }}
            disabled={currentLogs.length === 0}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
              currentLogs.length === 0 ? "opacity-40 cursor-not-allowed" : ""
            } ${activeTab === "detector" ? "bg-slate-100 text-indigo-600" : "hover:bg-slate-50 text-slate-600"}`}
          >
            <AlertTriangle className="h-4 w-4" />
            <span>이상구간 탐지기</span>
          </button>

          <button
            onClick={() => {
              if (currentLogs.length > 0) setActiveTab("comparator");
            }}
            disabled={currentLogs.length === 0}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
              currentLogs.length === 0 ? "opacity-40 cursor-not-allowed" : ""
            } ${activeTab === "comparator" ? "bg-slate-100 text-indigo-600" : "hover:bg-slate-50 text-slate-600"}`}
          >
            <GitCompare className="h-4 w-4" />
            <span>기준선 비교 분석기</span>
          </button>

          <button
            onClick={() => {
              if (currentLogs.length > 0) setActiveTab("report");
            }}
            disabled={currentLogs.length === 0}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
              currentLogs.length === 0 ? "opacity-40 cursor-not-allowed" : ""
            } ${activeTab === "report" ? "bg-slate-100 text-indigo-600" : "hover:bg-slate-50 text-slate-600"}`}
          >
            <FileCheck className="h-4 w-4" />
            <span>검증 성적서 & AI 소견</span>
          </button>
        </nav>
      )}

      {/* 3. Main Dynamic Content Workspace */}
      <main className="flex-1 p-6 print:p-0">
        <AnimatePresence mode="wait">
          {activeTab === "projects" && (
            <motion.div
              key="projects-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.18 }}
            >
              <ProjectManager
                projects={projects}
                selectedProject={selectedProject}
                trials={trials}
                selectedTrial={selectedTrial}
                onSelectProject={setSelectedProject}
                onSelectTrial={handleSelectTrial}
                onCreateProject={handleCreateProject}
                onDeleteProject={handleDeleteProject}
                onCreateTrial={handleCreateTrial}
                onDeleteTrial={handleDeleteTrial}
              />
            </motion.div>
          )}

          {activeTab === "parser" && selectedTrial && (
            <motion.div
              key="parser-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.18 }}
            >
              <LogParser selectedTrial={selectedTrial} onAnalysisComplete={handleAnalysisComplete} />
            </motion.div>
          )}

          {activeTab === "analyzer" && currentStats && (
            <motion.div
              key="analyzer-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.18 }}
            >
              <AnalyzerDashboard logs={currentLogs} stats={currentStats} />
            </motion.div>
          )}

          {activeTab === "detector" && selectedTrial && (
            <motion.div
              key="detector-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.18 }}
            >
              <AnomalyDetector
                anomalies={currentAnomalies}
                ruleConfig={selectedTrial.ruleConfig}
                onUpdateRuleConfig={handleUpdateRuleConfig}
                onUpdateAnomalyStatus={handleUpdateAnomalyStatus}
              />
            </motion.div>
          )}

          {activeTab === "comparator" && selectedTrial && currentStats && (
            <motion.div
              key="comparator-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.18 }}
            >
              <BaselineComparator
                currentTrial={selectedTrial}
                currentStats={currentStats}
                currentLogs={currentLogs}
                trials={trials}
              />
            </motion.div>
          )}

          {activeTab === "report" && selectedTrial && currentStats && selectedProject && (
            <motion.div
              key="report-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.18 }}
            >
              <ReportGenerator
                project={selectedProject}
                trial={selectedTrial}
                stats={currentStats}
                anomalies={currentAnomalies}
                baselineTrial={baselineTrial}
                baselineStats={baselineStats}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* 4. Footer (Aerospace Branding Credit lines) */}
      <footer className="bg-white border-t border-slate-200/80 py-4 px-6 text-center text-slate-400 text-[10px] print:hidden">
        <div>
          위성항법 수신기 시험 로그 지능형 분석 플랫폼 (GRTIP) • 국가 위성항법 검증 규격 준수
        </div>
        <div className="mt-1 font-mono">
          AEROSPACE VALIDATION SECURE RUNTIME 환경 • ythwang.cas@gmail.com
        </div>
      </footer>
    </div>
  );
}
