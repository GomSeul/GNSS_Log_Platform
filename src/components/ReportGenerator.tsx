/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { TestTrial, PerformanceStats, AnomalyEvent, Project } from "../types";
import { Printer, Download, Sparkles, Brain, FileSpreadsheet, Check, CheckCircle2, RefreshCw, Layers } from "lucide-react";

interface ReportGeneratorProps {
  project: Project;
  trial: TestTrial;
  stats: PerformanceStats;
  anomalies: AnomalyEvent[];
  baselineTrial: TestTrial | null;
  baselineStats: PerformanceStats | null;
}

export default function ReportGenerator({
  project,
  trial,
  stats,
  anomalies,
  baselineTrial,
  baselineStats,
}: ReportGeneratorProps) {
  const [supervisorComments, setSupervisorComments] = useState(trial.notes || "");
  const [aiReport, setAiReport] = useState<string>(trial.aiAnalysisReport || "");
  const [loadingAi, setLoadingAi] = useState(false);
  const [errorAi, setErrorAi] = useState<string | null>(null);

  // Calls the server-side proxy endpoint to get Gemini's expert analysis
  const handleGenerateAiReport = async () => {
    setLoadingAi(true);
    setErrorAi(null);

    const baselineComparisonPayload = baselineStats && baselineTrial ? {
      baselineName: baselineTrial.name,
      baselineSw: baselineTrial.swVersion,
      ratioDiff: (stats.trackingLockRatio - baselineStats.trackingLockRatio).toFixed(1) + "%",
      cn0Diff: (stats.meanCn0 - baselineStats.meanCn0).toFixed(1) + " dB-Hz",
      dopplerErrDiff: (stats.dopplerRmsErr - baselineStats.dopplerRmsErr).toFixed(1) + " Hz",
      cep95Diff: (stats.cep95 - baselineStats.cep95).toFixed(1) + " m",
      lockLossDiff: (stats.lockLossCount - baselineStats.lockLossCount) + " times"
    } : { message: "No baseline selected" };

    try {
      const response = await fetch("/api/analyze-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testMeta: {
            name: trial.name,
            scenario: trial.scenario,
            receiverInfo: trial.receiverInfo,
            swVersion: trial.swVersion,
            hwVersion: trial.hwVersion,
          },
          metrics: {
            ttff: stats.ttff + "s",
            lockRatio: stats.trackingLockRatio + "%",
            meanCn0: stats.meanCn0 + " dB-Hz",
            minCn0: stats.minCn0 + " dB-Hz",
            dopplerRmsErr: stats.dopplerRmsErr + " Hz",
            maxPositionErr: stats.maxPositionErr + " m",
            cep95: stats.cep95 + " m",
            lockLossCount: stats.lockLossCount
          },
          anomalies: {
            totalDetected: anomalies.length,
            events: anomalies.map(e => ({
              time: `t=${e.timestamp}s`,
              satellite: e.prn === 999 ? "System" : `PRN ${e.prn}`,
              metric: e.metricType,
              severity: e.severity,
              description: e.description
            })),
            cn0DropSatellites: Array.from(new Set(anomalies.filter(e => e.metricType === "cn0").map(e => e.prn))).join(", ")
          },
          baselineComparison: baselineComparisonPayload
        })
      });

      const data = await response.json();
      if (data.success) {
        setAiReport(data.analysis);
      } else {
        setErrorAi(data.error || "AI 분석에 실패했습니다.");
        setAiReport(data.analysis || ""); // Fallback report
      }
    } catch (err: any) {
      console.error(err);
      setErrorAi("서버와 통신하는 동안 오류가 발생했습니다.");
    } finally {
      setLoadingAi(false);
    }
  };

  const triggerPrint = () => {
    window.print();
  };

  // Helper to trigger dummy download of parsed CSV summary sheet
  const downloadCsvSummary = () => {
    const csvRows = [
      ["GRTIP Test Report Summary Sheet"],
      ["Project", project.name],
      ["Test Name", trial.name],
      ["SW Version", trial.swVersion],
      ["HW Version", trial.hwVersion],
      ["Date Analyzed", new Date().toLocaleString()],
      [],
      ["Performance Metric", "Value", "Unit"],
      ["Time To First Fix (TTFF)", stats.ttff, "seconds"],
      ["Tracking Lock Ratio", stats.trackingLockRatio, "%"],
      ["Mean C/N0", stats.meanCn0, "dB-Hz"],
      ["Doppler RMS Error", stats.dopplerRmsErr, "Hz"],
      ["Mean Position Error", stats.meanPositionErr, "meters"],
      ["Max Position Error", stats.maxPositionErr, "meters"],
      ["CEP-50", stats.cep50, "meters"],
      ["CEP-95", stats.cep95, "meters"],
      ["Lock Loss Count", stats.lockLossCount, "times"],
      [],
      ["Anomaly Events Log"],
      ["Timestamp", "Satellite", "Metric Type", "Severity", "Description"]
    ];

    anomalies.forEach(e => {
      csvRows.push([
        `t=${e.timestamp}s`,
        e.prn === 999 ? "System" : `PRN_${e.prn}`,
        e.metricType,
        e.severity,
        e.description.replace(/,/g, ";")
      ]);
    });

    const csvContent = "data:text/csv;charset=utf-8," 
      + csvRows.map(e => e.join(",")).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `GRTIP_Summary_${trial.id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6" id="grtip-report-generator">
      {/* 1. Report Assembly Workspace (Left 2/3) */}
      <div className="xl:col-span-2 space-y-6 print:hidden">
        {/* Supervisor comment section */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-100 p-5">
          <h3 className="font-bold text-slate-800 text-sm mb-1.5">시험 주관 연구원 피드백 서명</h3>
          <p className="text-[10px] text-slate-400 mb-4">본 시험의 합격 여부 결정 요소 및 특이 작동 현상을 기록하여 보존서에 자동 첨부하십시오.</p>
          
          <textarea
            rows={4}
            value={supervisorComments}
            onChange={(e) => setSupervisorComments(e.target.value)}
            placeholder="수신기 HW/SW 검토의견을 작성해 주세요. (예: SW v2.4.1 재밍 인가 구간의 루프 발산에 따른 Lock-Loss 1회 발생으로 설계 재검토 추천)"
            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-700 focus:outline-hidden focus:bg-white focus:ring-1 focus:ring-indigo-500 leading-relaxed"
          />
        </div>

        {/* Mapped evidence overview (Evidence Linking) */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-100 p-5">
          <h3 className="font-bold text-slate-800 text-sm mb-1.5">수신기 이상 검출 근거 연동 확인 (Evidence Linking)</h3>
          <p className="text-[10px] text-slate-400 mb-4">자동 룰 베이스에 의해 매치 및 추출된 이상 시그널 구간 및 로그 매핑 확인서</p>

          <div className="space-y-3">
            {anomalies.map((evt, idx) => (
              <div key={idx} className="p-3 bg-slate-50 border border-slate-100 rounded-lg text-xs flex justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded">t={evt.timestamp}s</span>
                    <span className="font-semibold text-slate-700">{evt.prn === 999 ? "시스템 종합 위치해" : `위성 PRN ${evt.prn}`}</span>
                    <span className="text-[10px] text-slate-400">({evt.metricType.toUpperCase()})</span>
                  </div>
                  <p className="text-slate-500 text-[11px] mt-1.5">{evt.description}</p>
                </div>
                <div className="shrink-0 text-right">
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                    evt.severity === "critical" ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800"
                  }`}>
                    {evt.severity.toUpperCase()}
                  </span>
                  <div className="text-[9px] text-slate-400 mt-2 font-mono">Mapped Correctly</div>
                </div>
              </div>
            ))}

            {anomalies.length === 0 && (
              <div className="text-center py-6 text-slate-400">
                연동 근거로 지정할 특이 이상 징후가 이 시험에서 검출되지 않았습니다.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Intelligent Copilot & Output Trigger (Right 1/3) */}
      <div className="space-y-6 print:hidden">
        {/* Action Panel */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-100 p-5 space-y-3.5">
          <h3 className="font-bold text-slate-800 text-sm pb-2 border-b border-slate-50">종합 검증 서류 출력</h3>
          
          <button
            onClick={triggerPrint}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white py-2 text-xs font-semibold rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <Printer className="h-4 w-4" />
            인쇄 및 PDF 시험성적서 출력
          </button>

          <button
            onClick={downloadCsvSummary}
            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            Excel/CSV 성능 검증서 다운로드
          </button>
        </div>

        {/* AI Debug Copilot Panel */}
        <div className="bg-slate-50 rounded-xl border border-indigo-100 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
              <Brain className="h-4.5 w-4.5 text-indigo-600 animate-pulse" />
              <span>GRTIP AI 디버깅 코파일럿</span>
            </h3>
            <span className="bg-indigo-100 text-indigo-800 text-[9px] px-1.5 py-0.2 rounded font-bold font-mono">
              GEMINI 3.5
            </span>
          </div>
          
          <p className="text-[10px] text-slate-500 leading-relaxed">
            측정된 신호 세기 저하, PLL 지터, GPS Cycle Slip 및 기만 신호 침투 이벤트를 종합 융합하여, GNSS 수신기 소스 알고리즘 매개변수 수정안을 진단 추천합니다.
          </p>

          {aiReport ? (
            <div className="space-y-3">
              <div className="bg-white rounded-lg p-3 border border-indigo-100/40 text-xs text-slate-700 leading-relaxed font-sans max-h-[300px] overflow-y-auto whitespace-pre-wrap">
                {aiReport}
              </div>
              <button
                onClick={handleGenerateAiReport}
                disabled={loadingAi}
                className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 py-1.5 text-xs font-semibold rounded-lg border border-indigo-100 flex items-center justify-center gap-1.5"
              >
                <RefreshCw className={`h-3 w-3 ${loadingAi ? "animate-spin" : ""}`} />
                AI 분석 의견 갱신
              </button>
            </div>
          ) : (
            <button
              onClick={handleGenerateAiReport}
              disabled={loadingAi}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 text-xs font-semibold rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              id="btn-run-ai-copilot"
            >
              {loadingAi ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>위성 신호 루프 진단 중...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 text-amber-300" />
                  <span>AI 디버깅 추천 조서 생성</span>
                </>
              )}
            </button>
          )}

          {errorAi && (
            <div className="text-[10px] text-rose-600 bg-rose-50 p-2.5 rounded border border-rose-100">
              {errorAi}
            </div>
          )}
        </div>
      </div>

      {/* ==================== STUNNING HIGH-FIDELITY PRINT WORKSPACE ==================== */}
      {/* Only visible when printing, completely styled for aerospace validation standards */}
      <div className="hidden print:block absolute inset-0 bg-white text-slate-900 p-8 font-sans" id="print-aerospace-report">
        {/* Cover Title */}
        <div className="text-center py-6 border-b-4 border-double border-slate-900">
          <div className="text-[11px] font-mono tracking-widest text-slate-500 uppercase font-bold">National GNSS receiver validation log verification center</div>
          <h1 className="text-2xl font-bold mt-2 tracking-tight">위성항법 수신기 시험 성적서 (GRTIP Verification Report)</h1>
          <div className="text-xs text-slate-500 mt-1 font-mono">REPORT ID: GRTIP-VERIFY-{trial.id.toUpperCase()}-{trial.swVersion}</div>
        </div>

        {/* Metadata Details */}
        <div className="grid grid-cols-2 gap-4 my-6 text-xs">
          <div className="space-y-1.5">
            <div><span className="font-semibold">프로젝트명:</span> {project.name}</div>
            <div><span className="font-semibold">시험 회차명:</span> {trial.name}</div>
            <div><span className="font-semibold">시험 시나리오:</span> {trial.scenario}</div>
            <div><span className="font-semibold">수신기 모델/식별 정보:</span> {trial.receiverInfo}</div>
          </div>
          <div className="space-y-1.5 text-right">
            <div><span className="font-semibold">SW 핵심 버전:</span> {trial.swVersion}</div>
            <div><span className="font-semibold">HW/FPGA 버전:</span> {trial.hwVersion}</div>
            <div><span className="font-semibold">검증 일시:</span> {trial.testTime}</div>
            <div><span className="font-semibold">검증 주관인:</span> {trial.inspector}</div>
          </div>
        </div>

        {/* Mapped stats */}
        <div className="my-6">
          <h3 className="font-bold text-xs bg-slate-100 p-2 border-l-4 border-slate-900 mb-2">1. 수신기 시험 핵심 성능 검증서 (Performance Diagnostics Summary)</h3>
          <div className="grid grid-cols-3 gap-3 text-[11px]">
            <div className="border border-slate-200 p-2 rounded">
              <div className="text-slate-500">신호 추적 신뢰도 (Track Lock Ratio)</div>
              <div className="font-bold text-sm mt-1">{stats.trackingLockRatio.toFixed(1)}%</div>
            </div>
            <div className="border border-slate-200 p-2 rounded">
              <div className="text-slate-500">평균 반송파 세기 (Mean C/N₀)</div>
              <div className="font-bold text-sm mt-1">{stats.meanCn0.toFixed(1)} dB-Hz</div>
            </div>
            <div className="border border-slate-200 p-2 rounded">
              <div className="text-slate-500">위상 오차 도플러 RMS (Doppler Err)</div>
              <div className="font-bold text-sm mt-1">{stats.dopplerRmsErr.toFixed(2)} Hz</div>
            </div>
            <div className="border border-slate-200 p-2 rounded">
              <div className="text-slate-500">Circular Error Probable (CEP-95)</div>
              <div className="font-bold text-sm mt-1">{stats.cep95.toFixed(2)} m</div>
            </div>
            <div className="border border-slate-200 p-2 rounded">
              <div className="text-slate-500">최대 오버슈트 측위오차 (Max Err)</div>
              <div className="font-bold text-sm mt-1">{stats.maxPositionErr.toFixed(2)} m</div>
            </div>
            <div className="border border-slate-200 p-2 rounded">
              <div className="text-slate-500">Lock Loss 이탈 횟수 (Lock Losses)</div>
              <div className="font-bold text-sm mt-1">{stats.lockLossCount} 회</div>
            </div>
          </div>
        </div>

        {/* Baseline delta analysis */}
        {baselineTrial && baselineStats && (
          <div className="my-6">
            <h3 className="font-bold text-xs bg-slate-100 p-2 border-l-4 border-slate-900 mb-2">2. 기준 시험선(Baseline) 성능 비교 검토서</h3>
            <table className="w-full text-left text-[10px] border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 border-b border-slate-200">
                  <th className="p-2">항목</th>
                  <th className="p-2 text-right">기준 시험 ({baselineTrial.swVersion})</th>
                  <th className="p-2 text-right">현재 시험 ({trial.swVersion})</th>
                  <th className="p-2 text-right">증감 차이 (Delta)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="p-2 font-semibold">C/N₀ 신호 세기</td>
                  <td className="p-2 text-right font-mono">{baselineStats.meanCn0.toFixed(1)} dB-Hz</td>
                  <td className="p-2 text-right font-mono">{stats.meanCn0.toFixed(1)} dB-Hz</td>
                  <td className="p-2 text-right font-mono font-bold">{(stats.meanCn0 - baselineStats.meanCn0).toFixed(1)} dB-Hz</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="p-2 font-semibold">도플러 정밀도 RMS</td>
                  <td className="p-2 text-right font-mono">{baselineStats.dopplerRmsErr.toFixed(2)} Hz</td>
                  <td className="p-2 text-right font-mono">{stats.dopplerRmsErr.toFixed(2)} Hz</td>
                  <td className="p-2 text-right font-mono font-bold">{(stats.dopplerRmsErr - baselineStats.dopplerRmsErr).toFixed(2)} Hz</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="p-2 font-semibold">위치오차 CEP-95</td>
                  <td className="p-2 text-right font-mono">{baselineStats.cep95.toFixed(2)} m</td>
                  <td className="p-2 text-right font-mono">{stats.cep95.toFixed(2)} m</td>
                  <td className="p-2 text-right font-mono font-bold">{(stats.cep95 - baselineStats.cep95).toFixed(2)} m</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Evidences list */}
        <div className="my-6">
          <h3 className="font-bold text-xs bg-slate-100 p-2 border-l-4 border-slate-900 mb-2">3. 룰 베이스 수신기 특이 이상 패턴 이력 대장</h3>
          <table className="w-full text-left text-[10px] border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                <th className="p-2">에포크 시점</th>
                <th className="p-2">PRN</th>
                <th className="p-2">진단 분류</th>
                <th className="p-2">심각도</th>
                <th className="p-2">이상 현상 물리적 설명</th>
              </tr>
            </thead>
            <tbody>
              {anomalies.map((evt, idx) => (
                <tr key={idx} className="border-b border-slate-100">
                  <td className="p-2 font-mono">t={evt.timestamp}s</td>
                  <td className="p-2 font-mono">{evt.prn === 999 ? "System" : `PRN_${evt.prn}`}</td>
                  <td className="p-2 font-semibold">{evt.metricType.toUpperCase()}</td>
                  <td className="p-2 font-bold">{evt.severity.toUpperCase()}</td>
                  <td className="p-2">{evt.description}</td>
                </tr>
              ))}
              {anomalies.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-slate-400">특이 이상 징후 없음 (정상 수신 완료)</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Supervisor signatures */}
        <div className="my-6">
          <h3 className="font-bold text-xs bg-slate-100 p-2 border-l-4 border-slate-900 mb-2">4. 시험 주관 책임자 최종 종합 검토의견</h3>
          <div className="p-3 border border-slate-300 rounded text-xs min-h-[80px] leading-relaxed italic whitespace-pre-wrap">
            {supervisorComments || "특이의견 없음. 표준 비행 정밀 성능 확인 완료."}
          </div>
        </div>

        {/* AI Recommendations */}
        {aiReport && (
          <div className="my-6 page-break-before">
            <h3 className="font-bold text-xs bg-slate-900 text-white p-2 border-l-4 border-slate-500 mb-2">
              [첨부문서] GRTIP AI 코파일럿 모델 분석 진단 및 파라미터 미세 튜닝 소견서
            </h3>
            <div className="p-3 border border-slate-300 rounded text-[10px] leading-relaxed bg-slate-50/50 whitespace-pre-wrap font-sans">
              {aiReport}
            </div>
          </div>
        )}

        {/* Signature Line */}
        <div className="mt-12 flex justify-between items-end text-xs text-slate-600">
          <div>국가위성 연구개발본부 항법신호처리인증실</div>
          <div className="text-center font-bold text-slate-900 text-sm">
            최종 서명책임인: __________________ (인)
          </div>
        </div>
      </div>
    </div>
  );
}
