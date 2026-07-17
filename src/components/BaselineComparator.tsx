/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { TestTrial, GNSSDataRow, PerformanceStats } from "../types";
import { generateBaselineData, generateInterferenceData, MOCK_STATS } from "../data/mockData";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { Scale, TrendingDown, TrendingUp, Sparkles, Check, AlertTriangle, Layers, GitCompare } from "lucide-react";

interface BaselineComparatorProps {
  currentTrial: TestTrial;
  currentStats: PerformanceStats;
  currentLogs: GNSSDataRow[];
  trials: TestTrial[];
}

export default function BaselineComparator({
  currentTrial,
  currentStats,
  currentLogs,
  trials,
}: BaselineComparatorProps) {
  // Find baseline designated trial or default to the baseline trial
  const baselineTrials = useMemo(() => {
    return trials.filter(t => t.projectId === currentTrial.projectId && t.id !== currentTrial.id);
  }, [trials, currentTrial]);

  const [selectedBaselineId, setSelectedBaselineId] = useState<string>(
    baselineTrials.find(t => t.isBaseline)?.id || baselineTrials[0]?.id || ""
  );

  const selectedBaseline = useMemo(() => {
    return trials.find(t => t.id === selectedBaselineId) || null;
  }, [trials, selectedBaselineId]);

  // Load baseline statistics and logs
  const baselineStats = useMemo(() => {
    if (!selectedBaseline) return null;
    return MOCK_STATS[selectedBaseline.id] || MOCK_STATS["test-trial-baseline"];
  }, [selectedBaseline]);

  const baselineLogs = useMemo(() => {
    if (!selectedBaseline) return [];
    // Generate baseline logs
    return selectedBaseline.id === "test-trial-baseline" ? generateBaselineData() : generateInterferenceData();
  }, [selectedBaseline]);

  // Selection for overlay metric
  const [overlayMetric, setOverlayMetric] = useState<"cn0" | "positionErr" | "dopplerErr">("cn0");

  // Create merged logs for overlapping graph (by matching epochs / seconds)
  const overlayChartData = useMemo(() => {
    if (!selectedBaseline || currentLogs.length === 0 || baselineLogs.length === 0) return [];

    const merged: { timeSec: number; current: number; baseline: number }[] = [];
    const step = 5; // Downsample for smoother charts (10Hz is 600 pts, step of 5 gives 120 points)
    
    // For single satellite view on overlay (e.g., PRN 12)
    const currentPrnLogs = currentLogs.filter(l => l.prn === 12);
    const baselinePrnLogs = baselineLogs.filter(l => l.prn === 12);

    for (let i = 0; i < currentPrnLogs.length; i += step) {
      const curRow = currentPrnLogs[i];
      const baseRow = baselinePrnLogs.find(b => Math.abs(b.timeSec - curRow.timeSec) < 0.05);

      if (curRow && baseRow) {
        merged.push({
          timeSec: curRow.timeSec,
          current: overlayMetric === "cn0" ? curRow.cn0 : overlayMetric === "positionErr" ? curRow.positionErr : Math.abs(curRow.dopplerErr),
          baseline: overlayMetric === "cn0" ? baseRow.cn0 : overlayMetric === "positionErr" ? baseRow.positionErr : Math.abs(baseRow.dopplerErr)
        });
      }
    }
    return merged;
  }, [currentLogs, baselineLogs, selectedBaseline, overlayMetric]);

  // Delta calculation helper
  const calcDelta = (cur: number, base: number, lowerIsBetter: boolean = true) => {
    const diff = cur - base;
    const isBetter = lowerIsBetter ? diff < 0 : diff > 0;
    const isUnchanged = Math.abs(diff) < 0.01;
    return {
      diff: diff.toFixed(2),
      percent: base !== 0 ? `${((diff / base) * 100).toFixed(1)}%` : "N/A",
      isBetter,
      isUnchanged
    };
  };

  const deltaReport = useMemo(() => {
    if (!baselineStats) return [];
    return [
      {
        name: "추적 유지율 (Tracking Lock Ratio)",
        unit: "%",
        base: baselineStats.trackingLockRatio,
        curr: currentStats.trackingLockRatio,
        delta: calcDelta(currentStats.trackingLockRatio, baselineStats.trackingLockRatio, false),
        desc: "수신기가 위상 Lock을 상실하지 않고 데이터를 정상 수신한 비율"
      },
      {
        name: "평균 신호 세기 (Mean C/N₀)",
        unit: "dB-Hz",
        base: baselineStats.meanCn0,
        curr: currentStats.meanCn0,
        delta: calcDelta(currentStats.meanCn0, baselineStats.meanCn0, false),
        desc: "항법 메시지 복조를 위한 전파 감쇄 여부 판정 기준선"
      },
      {
        name: "도플러 오차 분산 (Doppler RMS Error)",
        unit: "Hz",
        base: baselineStats.dopplerRmsErr,
        curr: currentStats.dopplerRmsErr,
        delta: calcDelta(currentStats.dopplerRmsErr, baselineStats.dopplerRmsErr, true),
        desc: "반송파 추적 필터 루프의 신호 동기 안정도 수준"
      },
      {
        name: "위치 해오차 평균 (Mean Position Error)",
        unit: "m",
        base: baselineStats.meanPositionErr,
        curr: currentStats.meanPositionErr,
        delta: calcDelta(currentStats.meanPositionErr, baselineStats.meanPositionErr, true),
        desc: "기준 위치 대비 실시간 계산된 항법 좌표의 평균 편차"
      },
      {
        name: "최대 위치 해오차 (Max Position Error)",
        unit: "m",
        base: baselineStats.maxPositionErr,
        curr: currentStats.maxPositionErr,
        delta: calcDelta(currentStats.maxPositionErr, baselineStats.maxPositionErr, true),
        desc: "시험 시간 내 발생한 최악의 측위 오버슈트 오차값"
      },
      {
        name: "Circular Error Probable (CEP-95)",
        unit: "m",
        base: baselineStats.cep95,
        curr: currentStats.cep95,
        delta: calcDelta(currentStats.cep95, baselineStats.cep95, true),
        desc: "시험 데이터 중 오차 반경이 95% 확률 이내로 수렴한 정밀 신뢰도"
      },
      {
        name: "Lock Loss 이탈 건수",
        unit: "회",
        base: baselineStats.lockLossCount,
        curr: currentStats.lockLossCount,
        delta: calcDelta(currentStats.lockLossCount, baselineStats.lockLossCount, true),
        desc: "RF 단절 등으로 인한 위성 반송파 소실 및 재추적 회수"
      }
    ];
  }, [currentStats, baselineStats]);

  // Overall Regression Judgment
  const overallJudgment = useMemo(() => {
    if (!baselineStats) return "N/A";
    const degradations = deltaReport.filter(d => !d.delta.isBetter && !d.delta.isUnchanged).length;
    if (degradations >= 4) return "degraded";
    if (degradations > 0) return "warning";
    return "passed";
  }, [deltaReport, baselineStats]);

  return (
    <div className="space-y-6" id="grtip-baseline-comparator">
      {/* Target Baseline Selector Bar */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-100 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <GitCompare className="h-5 w-5 text-indigo-600" />
          <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">비교 대상 기준 시험선 (Baseline Selection):</span>
          <select
            value={selectedBaselineId}
            onChange={(e) => setSelectedBaselineId(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-xs text-slate-700 font-semibold focus:outline-hidden"
          >
            {baselineTrials.length === 0 ? (
              <option value="">-- 비교 가능한 타 시험 없음 --</option>
            ) : (
              baselineTrials.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.swVersion})
                </option>
              ))
            )}
          </select>
        </div>

        {/* Overall Status Badge */}
        {selectedBaseline && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-400">종합 회귀 판정:</span>
            {overallJudgment === "degraded" ? (
              <span className="bg-rose-100 text-rose-800 text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
                <TrendingDown className="h-3.5 w-3.5" /> 성능 저하 발생
              </span>
            ) : overallJudgment === "warning" ? (
              <span className="bg-amber-100 text-amber-800 text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" /> 국소성 오차 검토필요
              </span>
            ) : (
              <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5 text-emerald-500" /> 회귀 적합 (Passed)
              </span>
            )}
          </div>
        )}
      </div>

      {selectedBaseline ? (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Delta Metrics Table (Left 2/3) */}
          <div className="xl:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-xs border border-slate-100 p-5">
              <h3 className="font-bold text-slate-800 text-xs mb-1.5">핵심 성능 변화율 분석 (Delta Report Table)</h3>
              <p className="text-[10px] text-slate-400 mb-4">지정된 기준선 시험 대비 주요 위성항법 성능 지표의 절대적/상대적 변동량</p>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-medium">
                      <th className="p-3">성능 지표 항목</th>
                      <th className="p-3 font-mono">기준선 (Baseline)</th>
                      <th className="p-3 font-mono">현재 시험 (Current)</th>
                      <th className="p-3 font-mono">변동량 (Delta)</th>
                      <th className="p-3 text-right">상태 판정</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deltaReport.map((row, idx) => (
                      <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50/50 transition-all">
                        <td className="p-3">
                          <div className="font-semibold text-slate-800">{row.name}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{row.desc}</div>
                        </td>
                        <td className="p-3 font-mono text-slate-600 font-semibold">{row.base.toFixed(2)} {row.unit}</td>
                        <td className="p-3 font-mono text-slate-800 font-bold">{row.curr.toFixed(2)} {row.unit}</td>
                        <td className="p-3 font-mono">
                          <span className={`font-bold ${
                            row.delta.isUnchanged ? "text-slate-400" :
                            row.delta.isBetter ? "text-emerald-600" : "text-rose-600"
                          }`}>
                            {parseFloat(row.delta.diff) > 0 ? `+${row.delta.diff}` : row.delta.diff} ({row.delta.percent})
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          {row.delta.isUnchanged ? (
                            <span className="inline-flex items-center gap-1 text-slate-400 font-semibold">유사</span>
                          ) : row.delta.isBetter ? (
                            <span className="inline-flex items-center gap-0.5 text-emerald-600 font-bold">
                              개선 <TrendingUp className="h-3 w-3" />
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 text-rose-600 font-bold">
                              저하 <TrendingDown className="h-3 w-3" />
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Overlay Graph (Right 1/3) */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-xs border border-slate-100 p-5">
              <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-2">
                <h4 className="text-xs font-bold text-slate-800">지표 중첩 비교 차이 분석 (Overlay Plot)</h4>
                
                {/* Metric selector */}
                <select
                  value={overlayMetric}
                  onChange={(e) => setOverlayMetric(e.target.value as any)}
                  className="bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-[10px] text-slate-600 focus:outline-hidden font-semibold"
                >
                  <option value="cn0">신호세기 C/N₀ (PRN 12)</option>
                  <option value="positionErr">위치 정확도 해오차 (3D)</option>
                  <option value="dopplerErr">도플러 지터 절대값 (PRN 12)</option>
                </select>
              </div>

              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={overlayChartData} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="timeSec" type="number" stroke="#94a3b8" fontSize={9} tickFormatter={(v) => `${v}s`} />
                    <YAxis stroke="#94a3b8" fontSize={9} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#1e293b", borderRadius: "6px", border: "none", color: "#f8fafc", fontSize: "10px", fontFamily: "monospace" }}
                    />
                    <Legend wrapperStyle={{ fontSize: "10px" }} />
                    <Line name="현재 시험 (Current Run)" type="monotone" dataKey="current" stroke="#4f46e5" strokeWidth={1.8} dot={false} />
                    <Line name="기준 시험 (Baseline)" type="monotone" dataKey="baseline" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="3 3" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-start gap-2">
                <Layers className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  회색 점선(Baseline)과 청색 실선(Current)의 궤적을 겹쳐 비교하여 SW 알고리즘 수정 시점이나 특정 타임라인의 환경 저하를 시각적으로 빠르게 포착할 수 있습니다.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-16 text-center text-slate-500">
          비교 분석할 타 시험 로그가 현재 프로젝트 내에 존재하지 않습니다. 추가 시험 회차를 먼저 등록해 주십시오.
        </div>
      )}
    </div>
  );
}
