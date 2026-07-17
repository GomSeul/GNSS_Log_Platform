/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Project, TestTrial, RuleConfig } from "../types";
import { DEFAULT_RULE_CONFIG } from "../data/mockData";
import { FolderOpen, Plus, Trash2, Edit3, Calendar, Cpu, Layers, User, ChevronRight, Info, Search, ShieldAlert, CheckCircle2 } from "lucide-react";

interface ProjectManagerProps {
  projects: Project[];
  selectedProject: Project | null;
  trials: TestTrial[];
  selectedTrial: TestTrial | null;
  onSelectProject: (project: Project) => void;
  onSelectTrial: (trial: TestTrial) => void;
  onCreateProject: (name: string, description: string) => void;
  onDeleteProject: (projectId: string) => void;
  onCreateTrial: (trialData: Partial<TestTrial>) => void;
  onDeleteTrial: (trialId: string) => void;
}

export default function ProjectManager({
  projects,
  selectedProject,
  trials,
  selectedTrial,
  onSelectProject,
  onSelectTrial,
  onCreateProject,
  onDeleteProject,
  onCreateTrial,
  onDeleteTrial,
}: ProjectManagerProps) {
  // States
  const [showNewProjModal, setShowNewProjModal] = useState(false);
  const [newProjName, setNewProjName] = useState("");
  const [newProjDesc, setNewProjDesc] = useState("");

  const [showNewTrialModal, setShowNewTrialModal] = useState(false);
  const [newTrialName, setNewTrialName] = useState("");
  const [newTrialSw, setNewTrialSw] = useState("");
  const [newTrialHw, setNewTrialHw] = useState("HW_REV_C_FPGA_V1.1");
  const [newTrialScenario, setNewTrialScenario] = useState("");
  const [newTrialReceiver, setNewTrialReceiver] = useState("");
  const [newTrialInspector, setNewTrialInspector] = useState("");
  const [newTrialNotes, setNewTrialNotes] = useState("");
  const [newTrialIsBaseline, setNewTrialIsBaseline] = useState(false);

  // Search filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [swFilter, setSwFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const handleCreateProjectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjName.trim()) return;
    onCreateProject(newProjName, newProjDesc);
    setNewProjName("");
    setNewProjDesc("");
    setShowNewProjModal(false);
  };

  const handleCreateTrialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTrialName.trim()) return;

    const newTrial: Partial<TestTrial> = {
      name: newTrialName,
      projectId: selectedProject?.id,
      testTime: new Date().toISOString().replace("T", " ").substring(0, 19),
      swVersion: newTrialSw || "SW_V2.4.2_BETA",
      hwVersion: newTrialHw,
      scenario: newTrialScenario || "SIM_DYNAMIC_CUSTOM",
      receiverInfo: newTrialReceiver || "K-Sat GNSS Core Receiver Block-II #1",
      inspector: newTrialInspector || "검증 담당자",
      isBaseline: newTrialIsBaseline,
      notes: newTrialNotes,
      status: "passed", // Default to passed, will update upon file upload/analysis
      logsCount: 0,
      version: 1,
      ruleConfig: DEFAULT_RULE_CONFIG,
    };

    onCreateTrial(newTrial);
    setShowNewTrialModal(false);

    // Reset fields
    setNewTrialName("");
    setNewTrialSw("");
    setNewTrialScenario("");
    setNewTrialReceiver("");
    setNewTrialInspector("");
    setNewTrialNotes("");
    setNewTrialIsBaseline(false);
  };

  // Filtered trials for the selected project
  const projectTrials = trials.filter((t) => t.projectId === selectedProject?.id);

  const filteredTrials = projectTrials.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.scenario.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.swVersion.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSw = swFilter === "" || t.swVersion === swFilter;
    const matchesStatus = statusFilter === "" || t.status === statusFilter;
    return matchesSearch && matchesSw && matchesStatus;
  });

  // Unique SW versions for filtering
  const swVersions = Array.from(new Set(projectTrials.map((t) => t.swVersion)));

  const baselineTrial = projectTrials.find((t) => t.isBaseline);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6" id="grtip-project-manager">
      {/* 1. Projects Sidebar (1/4 Width) */}
      <div className="lg:col-span-1 bg-white rounded-xl shadow-xs border border-slate-200 p-5 flex flex-col h-[calc(100vh-140px)] min-h-[500px]">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-base">
            <FolderOpen className="h-5 w-5 text-hanwha-orange" />
            <span>시험 프로젝트 목록</span>
          </div>
          <button
            onClick={() => setShowNewProjModal(true)}
            className="p-1.5 hover:bg-slate-50 text-hanwha-orange rounded-lg border border-slate-200 transition-all flex items-center justify-center cursor-pointer"
            title="새 프로젝트 생성"
            id="btn-create-project"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {/* Project List */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {projects.map((proj) => {
            const isSelected = selectedProject?.id === proj.id;
            const projTrialsCount = trials.filter((t) => t.projectId === proj.id).length;

            return (
              <div
                key={proj.id}
                onClick={() => onSelectProject(proj)}
                id={`project-item-${proj.id}`}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? "bg-hanwha-orange-light border-hanwha-orange shadow-2xs"
                    : "border-slate-200 hover:border-hanwha-orange/40 hover:bg-slate-50"
                }`}
              >
                <div className="font-semibold text-sm text-slate-800 line-clamp-1">{proj.name}</div>
                <div className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">{proj.description}</div>
                <div className="flex items-center justify-between mt-3 text-[10px] text-slate-400 font-mono">
                  <span>등록 시험: {projTrialsCount}건</span>
                  <span>{new Date(proj.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            );
          })}

          {projects.length === 0 && (
            <div className="text-center py-10 text-slate-400 text-xs">
              프로젝트가 없습니다. <br />우측 상단 + 버튼을 눌러 생성해주세요.
            </div>
          )}
        </div>
      </div>

      {/* 2. Project Details & Trials list (3/4 Width) */}
      <div className="lg:col-span-3 flex flex-col gap-6">
        {selectedProject ? (
          <>
            {/* Project Cover Block */}
            <div className="bg-gradient-to-r from-hanwha-black to-slate-900 text-white rounded-xl p-6 shadow-sm border border-slate-800 relative overflow-hidden">
              <div className="relative z-10">
                <div className="text-xs font-mono tracking-widest text-hanwha-orange uppercase font-bold">Active Project Workstation</div>
                <h1 className="text-2xl font-bold mt-1 tracking-tight text-white">{selectedProject.name}</h1>
                <p className="text-sm text-slate-300 mt-2 max-w-3xl leading-relaxed">{selectedProject.description}</p>
                
                <div className="flex flex-wrap gap-4 mt-5 pt-4 border-t border-slate-800 text-xs text-slate-300">
                  <div className="flex items-center gap-1.5 font-mono">
                    <Calendar className="h-3.5 w-3.5 text-hanwha-orange" />
                    <span>생성일: {new Date(selectedProject.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono">
                    <Cpu className="h-3.5 w-3.5 text-emerald-400" />
                    <span>기준 시험(Baseline): {baselineTrial ? baselineTrial.name.substring(0, 30) + "..." : "미지정"}</span>
                  </div>
                </div>
              </div>
              <div className="absolute top-0 right-0 h-full w-1/3 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-hanwha-orange/10 via-transparent to-transparent pointer-events-none" />
            </div>

            {/* Test Trials Section */}
            <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-200">
                <div>
                  <h3 className="font-bold text-slate-800 text-base">수신기 시험 로그 회차 목록</h3>
                  <p className="text-xs text-slate-400 mt-0.5">등록된 개별 수신기 시험 데이터 및 성능 평가 리스트</p>
                </div>
                <button
                  onClick={() => setShowNewTrialModal(true)}
                  className="bg-hanwha-orange hover:bg-hanwha-orange-dark text-white px-3.5 py-1.5 text-xs font-semibold rounded-lg shadow-2xs transition-all flex items-center justify-center gap-1.5 self-start cursor-pointer"
                  id="btn-register-trial"
                >
                  <Plus className="h-4 w-4" />
                  <span>시험 로그 등록</span>
                </button>
              </div>

              {/* Filters Panel */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
                {/* Search query */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="시험명, 시나리오, SW버전 검색..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white pl-8 pr-3 py-1.5 text-xs rounded-md border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-hanwha-orange text-slate-700"
                  />
                </div>
                {/* SW Version Filter */}
                <div>
                  <select
                    value={swFilter}
                    onChange={(e) => setSwFilter(e.target.value)}
                    className="w-full bg-white px-3 py-1.5 text-xs rounded-md border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-hanwha-orange text-slate-700"
                  >
                    <option value="">모든 SW 버전</option>
                    {swVersions.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
                {/* Status Filter */}
                <div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full bg-white px-3 py-1.5 text-xs rounded-md border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-hanwha-orange text-slate-700"
                  >
                    <option value="">모든 판정 결과</option>
                    <option value="passed">충족 (Passed)</option>
                    <option value="failed">불충족 (Failed)</option>
                    <option value="warning">주의 (Warning)</option>
                  </select>
                </div>
              </div>

              {/* Trials Table/Cards */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                      <th className="p-3">시험명 / 식별 정보</th>
                      <th className="p-3">SW / HW 버전</th>
                      <th className="p-3">수신 시나리오</th>
                      <th className="p-3">기록 일시</th>
                      <th className="p-3 text-center">동작 판정</th>
                      <th className="p-3 text-right">기능선택</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTrials.map((trial) => {
                      const isTrialSelected = selectedTrial?.id === trial.id;
                      return (
                        <tr
                          key={trial.id}
                          className={`border-b border-slate-200 hover:bg-slate-50/50 transition-all ${
                            isTrialSelected ? "bg-hanwha-orange/5" : ""
                          }`}
                          id={`trial-row-${trial.id}`}
                        >
                          <td className="p-3 max-w-xs">
                            <div className="flex items-center gap-1.5">
                              {trial.isBaseline && (
                                <span className="bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0.5 rounded font-mono font-bold">
                                  BASELINE
                                </span>
                              )}
                              <span
                                onClick={() => onSelectTrial(trial)}
                                className="font-semibold text-slate-800 hover:text-hanwha-orange cursor-pointer line-clamp-1 text-sm"
                              >
                                {trial.name}
                              </span>
                            </div>
                            <div className="text-slate-400 mt-1 flex items-center gap-2 text-[10px]">
                              <span>담당: {trial.inspector}</span>
                              <span>•</span>
                              <span>{trial.receiverInfo}</span>
                            </div>
                          </td>
                          <td className="p-3 font-mono text-[11px] text-slate-600">
                            <div className="font-semibold">{trial.swVersion}</div>
                            <div className="text-slate-400 text-[10px] mt-0.5">{trial.hwVersion}</div>
                          </td>
                          <td className="p-3 text-slate-600 max-w-[150px] truncate" title={trial.scenario}>
                            {trial.scenario}
                          </td>
                          <td className="p-3 font-mono text-slate-500">{trial.testTime}</td>
                          <td className="p-3 text-center">
                            {trial.status === "passed" ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold font-mono text-[10px]">
                                <CheckCircle2 className="h-3 w-3" /> PASSED
                              </span>
                            ) : trial.status === "failed" ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-semibold font-mono text-[10px]">
                                <ShieldAlert className="h-3 w-3" /> FAILED
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold font-mono text-[10px]">
                                <Info className="h-3 w-3" /> WARNING
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => onSelectTrial(trial)}
                                className={`px-2.5 py-1 text-xs rounded-md transition-all font-semibold cursor-pointer ${
                                  isTrialSelected
                                    ? "bg-hanwha-black text-white"
                                    : "bg-slate-100 hover:bg-slate-250 text-slate-700"
                                }`}
                              >
                                분석 진입
                              </button>
                              <button
                                onClick={() => onDeleteTrial(trial.id)}
                                className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                                title="시험 삭제"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {filteredTrials.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center py-12 text-slate-400">
                          이 프로젝트에 등록된 부합 시험이 없습니다.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-16 text-center text-slate-500 h-[calc(100vh-140px)] min-h-[500px] flex flex-col justify-center items-center">
            <FolderOpen className="h-16 w-16 text-slate-300 stroke-1 mb-4" />
            <h3 className="font-bold text-slate-800 text-lg">프로젝트를 선택해 주세요</h3>
            <p className="text-sm text-slate-400 mt-1 max-w-md">
              좌측 사이드바에서 항법 수신기 시험 프로젝트를 선택하거나 새 프로젝트를 추가하여 위성 추적 정밀 성능 진단 업무를 시작하십시오.
            </p>
          </div>
        )}
      </div>

      {/* 3. New Project Modal */}
      {showNewProjModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl border border-slate-100 max-w-md w-full p-6 relative">
            <h3 className="font-bold text-slate-800 text-lg mb-1">새 검증 프로젝트 생성</h3>
            <p className="text-slate-400 text-xs mb-4">GNSS 수신기 모델 또는 요구도에 맞춰 신규 관리 공간을 만듭니다.</p>

            <form onSubmit={handleCreateProjectSubmit} className="space-y-4">
              <div>
                <label className="block text-slate-700 text-xs font-semibold mb-1">프로젝트명 *</label>
                <input
                  type="text"
                  required
                  placeholder="예: 위성 탑재체 GNSS 수신기 v3.0 평가"
                  value={newProjName}
                  onChange={(e) => setNewProjName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-hanwha-orange focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-slate-700 text-xs font-semibold mb-1">상세 설명 / 평가 목적</label>
                <textarea
                  rows={3}
                  placeholder="프로젝트 목표, 검증할 SW/HW 특징, 적용할 시뮬레이션 환경 등을 기술하십시오."
                  value={newProjDesc}
                  onChange={(e) => setNewProjDesc(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-hanwha-orange focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowNewProjModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="bg-hanwha-orange hover:bg-hanwha-orange-dark text-white px-4 py-1.5 text-xs font-semibold rounded-lg shadow-sm cursor-pointer"
                >
                  생성 완료
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Register Trial Modal */}
      {showNewTrialModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl border border-slate-100 max-w-lg w-full p-6 relative overflow-y-auto max-h-[90vh]">
            <h3 className="font-bold text-slate-800 text-lg mb-1">수신기 시험 회차 등록</h3>
            <p className="text-slate-400 text-xs mb-4">로그 데이터를 매핑하고 핵심 성능 지표를 분석하기 전에 장치 메타데이터를 기입하십시오.</p>

            <form onSubmit={handleCreateTrialSubmit} className="space-y-4">
              <div>
                <label className="block text-slate-700 text-xs font-semibold mb-1">시험 회차명 *</label>
                <input
                  type="text"
                  required
                  placeholder="예: SW v2.4.2 베타-1 정밀 비행 궤적 모사 시험"
                  value={newTrialName}
                  onChange={(e) => setNewTrialName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-hanwha-orange focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 text-xs font-semibold mb-1">수신기 SW 버전 *</label>
                  <input
                    type="text"
                    required
                    placeholder="SW_V2.4.2_BETA"
                    value={newTrialSw}
                    onChange={(e) => setNewTrialSw(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-hanwha-orange focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 text-xs font-semibold mb-1">HW 및 FPGA 버전</label>
                  <input
                    type="text"
                    placeholder="HW_REV_C_FPGA_V1.1"
                    value={newTrialHw}
                    onChange={(e) => setNewTrialHw(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-hanwha-orange focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 text-xs font-semibold mb-1">시험 시나리오명</label>
                  <input
                    type="text"
                    placeholder="SIM_DYNAMIC_CUSTOM"
                    value={newTrialScenario}
                    onChange={(e) => setNewTrialScenario(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-hanwha-orange focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 text-xs font-semibold mb-1">검증 담당 연구원</label>
                  <input
                    type="text"
                    placeholder="예: 김민혁 선임"
                    value={newTrialInspector}
                    onChange={(e) => setNewTrialInspector(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-hanwha-orange focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 text-xs font-semibold mb-1">수신기 모델 및 설정</label>
                <input
                  type="text"
                  placeholder="K-Sat GNSS Core Receiver Block-II #1"
                  value={newTrialReceiver}
                  onChange={(e) => setNewTrialReceiver(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-hanwha-orange focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 text-xs font-semibold mb-1">시험 관련 특이사항 / 종합 요약</label>
                <textarea
                  rows={2}
                  placeholder="시험 중 발생한 이벤트나 수신 장비 작동 상태 메모..."
                  value={newTrialNotes}
                  onChange={(e) => setNewTrialNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-hanwha-orange focus:bg-white"
                />
              </div>

              <div className="flex items-center gap-2 py-1 bg-hanwha-orange/5 p-3 rounded-lg border border-hanwha-orange/20">
                <input
                  type="checkbox"
                  id="chk-baseline"
                  checked={newTrialIsBaseline}
                  onChange={(e) => setNewTrialIsBaseline(e.target.checked)}
                  className="h-4 w-4 text-hanwha-orange focus:ring-hanwha-orange border-slate-300 rounded"
                />
                <label htmlFor="chk-baseline" className="text-slate-700 text-xs font-semibold select-none cursor-pointer">
                  이 시험 회차를 프로젝트의 기준 시험(Baseline)으로 지정합니다.
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewTrialModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="bg-hanwha-orange hover:bg-hanwha-orange-dark text-white px-4 py-1.5 text-xs font-semibold rounded-lg shadow-sm cursor-pointer"
                >
                  시험 등록 완료
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
