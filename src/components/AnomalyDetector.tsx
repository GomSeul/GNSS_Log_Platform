/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { RuleConfig, AnomalyEvent, GNSSDataRow } from "../types";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from "recharts";
import { ShieldAlert, AlertCircle, Info, Flame, Settings, Save, CheckSquare, MessageSquare, ChevronRight, Play } from "lucide-react";

interface AnomalyDetectorProps {
  anomalies: AnomalyEvent[];
  ruleConfig: RuleConfig;
  onUpdateRuleConfig: (config: RuleConfig) => void;
  onUpdateAnomalyStatus: (id: string, status: AnomalyEvent["status"], notes: string) => void;
}

export default function AnomalyDetector({
  anomalies,
  ruleConfig,
  onUpdateRuleConfig,
  onUpdateAnomalyStatus,
}: AnomalyDetectorProps) {
  // Config States
  const [cn0Drop, setCn0Drop] = useState(ruleConfig.cn0DropThreshold);
  const [dopplerJump, setDopplerJump] = useState(ruleConfig.dopplerJumpThreshold);
  const [pllThresh, setPllThresh] = useState(ruleConfig.pllThreshold);
  const [posLimit, setPosLimit] = useState(ruleConfig.positionErrorLimit);

  // Selected event state
  const [selectedEventId, setSelectedEventId] = useState<string | null>(anomalies[0]?.id || null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [reviewStatus, setReviewStatus] = useState<AnomalyEvent["status"]>("unreviewed");

  const selectedEvent = useMemo(() => {
    return anomalies.find(e => e.id === selectedEventId) || anomalies[0] || null;
  }, [anomalies, selectedEventId]);

  // Sync state when event selection changes
  React.useEffect(() => {
    if (selectedEvent) {
      setReviewNotes(selectedEvent.reviewNotes || "");
      setReviewStatus(selectedEvent.status || "unreviewed");
    }
  }, [selectedEvent]);

  const handleSaveConfig = () => {
    onUpdateRuleConfig({
      cn0DropThreshold: cn0Drop,
      dopplerJumpThreshold: dopplerJump,
      pllThreshold: pllThresh,
      positionErrorLimit: posLimit,
      missingTimeThreshold: ruleConfig.missingTimeThreshold
    });
  };

  const handleUpdateStatus = () => {
    if (selectedEvent) {
      onUpdateAnomalyStatus(selectedEvent.id, reviewStatus, reviewNotes);
    }
  };

  const getSeverityIcon = (sev: AnomalyEvent["severity"]) => {
    switch (sev) {
      case "critical": return <Flame className="h-4 w-4 text-rose-600 animate-pulse" />;
      case "error": return <ShieldAlert className="h-4 w-4 text-rose-500" />;
      case "warning": return <AlertCircle className="h-4 w-4 text-amber-500" />;
      case "info": return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getSeverityClass = (sev: AnomalyEvent["severity"]) => {
    switch (sev) {
      case "critical": return "bg-rose-50 text-rose-800 border-rose-100";
      case "error": return "bg-rose-50/50 text-rose-700 border-rose-100/50";
      case "warning": return "bg-amber-50 text-amber-800 border-amber-100";
      case "info": return "bg-blue-50 text-blue-800 border-blue-100";
    }
  };

  const getStatusLabel = (st: AnomalyEvent["status"]) => {
    switch (st) {
      case "unreviewed": return "미검토";
      case "investigating": return "분석 중";
      case "false_alarm": return "정상 현상 (오탐)";
      case "suspected_bug": return "SW 결함 의심";
      case "hardware_issue": return "HW 원인 판정";
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="grtip-anomaly-detector">
      {/* 1. Rule Configuration Sidebar (1/3 width) */}
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-xs border border-slate-100 p-5">
          <h3 className="font-bold text-slate-800 text-sm mb-1.5 flex items-center gap-2 pb-2 border-b border-slate-50">
            <Settings className="h-4 w-4 text-indigo-600" />
            <span>이상탐지 진단 알고리즘 임계값 설정</span>
          </h3>
          <p className="text-[10px] text-slate-400 leading-relaxed mb-4">
            GNSS 수신기 획득·추적 루프의 불안정성을 분류하기 위한 룰 베이스 파라미터입니다. (JSON/YAML 설정 연동 가능)
          </p>

          <div className="space-y-4">
            {/* C/N0 Drop */}
            <div>
              <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                반송파 대 잡음비 급락 임계값 (C/N₀ Drop Rate)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={cn0Drop}
                  onChange={(e) => setCn0Drop(parseFloat(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-700 font-mono"
                />
                <span className="text-[10px] text-slate-400 font-semibold whitespace-nowrap">dB-Hz/s</span>
              </div>
            </div>

            {/* Doppler Jump */}
            <div>
              <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                도플러 순시 점프 허용치 (Doppler Jump Limit)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={dopplerJump}
                  onChange={(e) => setDopplerJump(parseFloat(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-700 font-mono"
                />
                <span className="text-[10px] text-slate-400 font-semibold whitespace-nowrap">Hz/s</span>
              </div>
            </div>

            {/* PLL Discriminator threshold */}
            <div>
              <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                반송파 추적루프 판별기 허용 임계치 (PLL Thresh)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.01"
                  value={pllThresh}
                  onChange={(e) => setPllThresh(parseFloat(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-700 font-mono"
                />
                <span className="text-[10px] text-slate-400 font-semibold whitespace-nowrap">chips</span>
              </div>
            </div>

            {/* Position Error limit */}
            <div>
              <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                최대 위치 해오차 안전 범위 (Position Error Limit)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={posLimit}
                  onChange={(e) => setPosLimit(parseFloat(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-700 font-mono"
                />
                <span className="text-[10px] text-slate-400 font-semibold whitespace-nowrap">meters</span>
              </div>
            </div>

            <button
              onClick={handleSaveConfig}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 text-xs font-semibold rounded-lg shadow-2xs flex items-center justify-center gap-1.5 transition-all mt-3"
            >
              <Save className="h-3.5 w-3.5" />
              임계값 적용 및 재검출
            </button>
          </div>
        </div>
      </div>

      {/* 2. Interactive Anomaly Timeline & Review Panel (2/3 width) */}
      <div className="lg:col-span-2 space-y-6">
        {/* Anomaly Timeline Summary Row */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-100 p-5">
          <h3 className="font-bold text-slate-800 text-sm mb-1.5">이상 이벤트 검출 타임라인</h3>
          <p className="text-[10px] text-slate-400 mb-4">60초의 연동 시험 시간축에서 발생한 이상 물리적 징후의 시점 분포</p>

          {/* Graphical timeline */}
          <div className="relative h-14 bg-slate-50 border border-slate-100 rounded-xl mb-4 p-2 flex items-center">
            {/* Timeline base line */}
            <div className="absolute left-4 right-4 h-0.5 bg-slate-200" />
            
            {/* Markers */}
            {anomalies.map((evt) => {
              const positionPercent = (evt.timestamp / 60) * 100;
              const isSelected = selectedEventId === evt.id;
              
              return (
                <button
                  key={evt.id}
                  onClick={() => setSelectedEventId(evt.id)}
                  style={{ left: `calc(${positionPercent}% - 8px)` }}
                  className={`absolute h-4.5 w-4.5 rounded-full border-2 flex items-center justify-center transition-all ${
                    isSelected
                      ? "bg-indigo-600 border-white ring-2 ring-indigo-500 scale-125 z-10 shadow-sm"
                      : evt.severity === "critical"
                      ? "bg-rose-500 border-white hover:scale-110"
                      : evt.severity === "error"
                      ? "bg-red-400 border-white hover:scale-110"
                      : "bg-amber-400 border-white hover:scale-110"
                  }`}
                  title={`[t=${evt.timestamp}s] ${evt.description}`}
                />
              );
            })}

            {/* Start / End Markers */}
            <span className="absolute left-2 bottom-1 text-[9px] font-mono text-slate-400">0s</span>
            <span className="absolute right-2 bottom-1 text-[9px] font-mono text-slate-400">60s</span>
          </div>

          {/* List of anomalies */}
          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
            {anomalies.map((evt) => {
              const isSelected = selectedEventId === evt.id;
              return (
                <div
                  key={evt.id}
                  onClick={() => setSelectedEventId(evt.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between gap-3 ${
                    isSelected
                      ? "bg-indigo-50/40 border-indigo-200 shadow-2xs"
                      : "border-slate-100 hover:border-slate-200 hover:bg-slate-50/50"
                  }`}
                  id={`anomaly-item-${evt.id}`}
                >
                  <div className="flex items-center gap-2.5">
                    {getSeverityIcon(evt.severity)}
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[10px] font-bold text-slate-400">t={evt.timestamp.toFixed(1)}s</span>
                        {evt.prn !== 999 && (
                          <span className="bg-slate-100 text-slate-600 text-[9px] px-1.5 py-0.2 rounded font-mono font-bold">
                            PRN {evt.prn}
                          </span>
                        )}
                        <span className={`text-[9px] px-1 rounded font-semibold ${
                          evt.status === "unreviewed" ? "bg-slate-100 text-slate-600" :
                          evt.status === "investigating" ? "bg-blue-100 text-blue-700" :
                          evt.status === "false_alarm" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                        }`}>
                          {getStatusLabel(evt.status)}
                        </span>
                      </div>
                      <p className="text-slate-700 text-xs font-semibold line-clamp-1 mt-1">{evt.description}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </div>
              );
            })}

            {anomalies.length === 0 && (
              <div className="text-center py-10 text-slate-400 text-xs">
                현재 임계값 세팅을 초과하는 이상 징후가 검출되지 않았습니다.
              </div>
            )}
          </div>
        </div>

        {/* Selected Anomaly Diagnostics (Context Window Zoom & Logs) */}
        {selectedEvent && (
          <div className="bg-white rounded-xl shadow-xs border border-slate-100 p-5 space-y-6">
            <div className="flex items-start justify-between border-b border-slate-50 pb-3">
              <div>
                <span className="bg-slate-100 text-slate-500 font-mono text-[10px] px-1.5 py-0.5 rounded font-bold">
                  EVENT {selectedEvent.id.toUpperCase()}
                </span>
                <h4 className="font-bold text-slate-800 text-sm mt-1.5">{selectedEvent.description}</h4>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getSeverityClass(selectedEvent.severity)}`}>
                {selectedEvent.severity.toUpperCase()}
              </span>
            </div>

            {/* Context zoom graph */}
            <div>
              <h5 className="text-[11px] font-bold text-slate-600 mb-2">이상 발생 전후 ±3초 정밀 Context Window 지표 분석</h5>
              <div className="h-44 bg-slate-50 rounded-lg p-2 border border-slate-100">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={selectedEvent.contextData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="timeSec" type="number" domain={["auto", "auto"]} stroke="#94a3b8" fontSize={9} tickFormatter={(v) => `${v}s`} />
                    <YAxis stroke="#94a3b8" fontSize={9} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#1e293b", borderRadius: "6px", border: "none", color: "#f8fafc", fontSize: "10px", fontFamily: "monospace" }}
                    />
                    <ReferenceLine x={selectedEvent.timestamp} stroke="#ef4444" strokeDasharray="3 3" label={{ value: "이상 탐지 시점", fill: "#ef4444", fontSize: 8, position: "top" }} />
                    
                    {/* Render different metric depending on event type */}
                    {selectedEvent.metricType === "cn0" && (
                      <Area name="C/N0" type="monotone" dataKey="cn0" stroke="#4f46e5" fillOpacity={1} fill="url(#colorMetric)" />
                    )}
                    {selectedEvent.metricType === "doppler" && (
                      <Area name="Doppler Err" type="monotone" dataKey="dopplerErr" stroke="#eab308" fillOpacity={1} fill="url(#colorMetric)" />
                    )}
                    {selectedEvent.metricType === "pll" && (
                      <Area name="PLL Disc" type="monotone" dataKey="pllDisc" stroke="#06b6d4" fillOpacity={1} fill="url(#colorMetric)" />
                    )}
                    {selectedEvent.metricType === "position" && (
                      <Area name="Position Err" type="monotone" dataKey="positionErr" stroke="#ef4444" fillOpacity={1} fill="url(#colorMetric)" />
                    )}
                    {selectedEvent.metricType === "tracking_loss" && (
                      <Area name="C/N0 Loss Window" type="monotone" dataKey="cn0" stroke="#f43f5e" fillOpacity={1} fill="url(#colorMetric)" />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Context raw logs segment */}
            <div>
              <h5 className="text-[11px] font-bold text-slate-600 mb-2">사고 구간 국소 원본 로그 스니펫</h5>
              <div className="bg-slate-950 text-slate-300 rounded-lg p-3 font-mono text-[10px] leading-relaxed max-h-[140px] overflow-y-auto border border-slate-900">
                <div className="text-slate-500 border-b border-slate-800 pb-1 mb-1.5 flex justify-between font-semibold">
                  <span>EPOCH | TIME | PRN | C/N₀ | DOPPLER_ERR | PLL_DISC | POS_ERR | LOCK</span>
                  <span>GRTIP RAW STREAM</span>
                </div>
                {selectedEvent.contextData.map((row, idx) => {
                  const isCurrentTrigger = Math.abs(row.timeSec - selectedEvent.timestamp) < 0.05;
                  return (
                    <div
                      key={idx}
                      className={`py-0.5 px-1.5 rounded ${
                        isCurrentTrigger ? "bg-rose-950/70 text-rose-300 font-bold border-l-2 border-rose-500" : ""
                      }`}
                    >
                      {`${row.epoch.toString().padStart(4, "0")} | ${row.timeSec.toFixed(1)}s | PRN_${row.prn.toString().padStart(2, "0")} | ${row.cn0.toFixed(1)} dB-Hz | ${row.dopplerErr.toFixed(1)} Hz | ${row.pllDisc.toFixed(4)} | ${row.positionErr.toFixed(1)}m | ${row.lockStatus ? "LOCK_ON" : "LOCK_LOSS"}`}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Review Status modification form */}
            <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1 space-y-3 w-full">
                <div className="flex items-center gap-1.5">
                  <CheckSquare className="h-4 w-4 text-indigo-600" />
                  <span className="text-[11px] font-bold text-slate-700">검토 현황 판정 및 피드백 기록</span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-semibold text-slate-500 mb-1">판정 분류</label>
                    <select
                      value={reviewStatus}
                      onChange={(e) => setReviewStatus(e.target.value as AnomalyEvent["status"])}
                      className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-xs text-slate-700 focus:outline-hidden"
                    >
                      <option value="unreviewed">미검토</option>
                      <option value="investigating">분석 중</option>
                      <option value="false_alarm">정상 현상 (오탐)</option>
                      <option value="suspected_bug">SW 결함 의심</option>
                      <option value="hardware_issue">HW 원인 판정</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] font-semibold text-slate-500 mb-1">작성자 의견 및 원인 메모</label>
                    <input
                      type="text"
                      placeholder="예: 기만 시나리오 시작에 따른 의도적 이탈"
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-700 focus:outline-hidden focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={handleUpdateStatus}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-xs font-semibold rounded-lg shadow-2xs flex items-center justify-center gap-1 shrink-0 w-full md:w-auto"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                피드백 보존
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
