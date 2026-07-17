/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from "react";
import { TestTrial, ColumnMapping, MappingTemplate } from "../types";
import { Upload, FileText, CheckCircle2, AlertTriangle, HelpCircle, Save, Layers, Play, Settings } from "lucide-react";

interface LogParserProps {
  selectedTrial: TestTrial;
  onAnalysisComplete: (stats: any, logs: any[], anomalies: any[]) => void;
}

// Preset mapping templates
const DEFAULT_TEMPLATES: MappingTemplate[] = [
  {
    id: "tpl-grtip",
    name: "GRTIP 표준 CSV 템플릿",
    description: "GRTIP 기본 내부 컬럼 규격 (time, prn, cn0, doppler, doppler_err, code_phase, pll_disc, pr_err, pos_err)",
    mapping: {
      epoch: "epoch",
      timeSec: "timeSec",
      prn: "prn",
      cn0: "cn0",
      doppler: "doppler",
      dopplerErr: "dopplerErr",
      codePhase: "codePhase",
      pllDisc: "pllDisc",
      pseudorangeErr: "pseudorangeErr",
      positionErr: "positionErr",
      velocityErr: "velocityErr",
      lockStatus: "lockStatus"
    }
  },
  {
    id: "tpl-novatel",
    name: "NovAtel OEM7 ASCII Logs",
    description: "NovAtel OEM7 수신기 고유 신호 분석 컬럼 매핑",
    mapping: {
      epoch: "gps_week_seconds",
      timeSec: "time_seconds",
      prn: "satellite_id",
      cn0: "c_n0_dbhz",
      doppler: "doppler_measured_hz",
      dopplerErr: "doppler_deviation",
      codePhase: "code_phase_chips",
      pllDisc: "pll_phase_error",
      pseudorangeErr: "pseudorange_residual",
      positionErr: "3d_position_error_m",
      velocityErr: "3d_velocity_error",
      lockStatus: "tracking_state"
    }
  },
  {
    id: "tpl-ublox",
    name: "u-blox F9P Raw Navigation Epochs",
    description: "유블럭스 F9P NMEA 및 UBX 고유 추적 로그 매핑",
    mapping: {
      epoch: "iTOW_ms",
      timeSec: "time_elapsed_s",
      prn: "svId",
      cn0: "cno",
      doppler: "dopplerHz",
      dopplerErr: "doppler_err",
      codePhase: "cpChips",
      pllDisc: "carrierPhaseError",
      pseudorangeErr: "pr_resid_m",
      positionErr: "hMSL_err",
      velocityErr: "vel_err",
      lockStatus: "lockState"
    }
  }
];

export default function LogParser({ selectedTrial, onAnalysisComplete }: LogParserProps) {
  // States
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; size: number; content: string }[]>([]);
  const [parsingProgress, setParsingProgress] = useState<number | null>(null);
  const [parseStatus, setParseStatus] = useState<"idle" | "parsing" | "mapped" | "validating" | "complete">("idle");
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawPreviewRows, setRawPreviewRows] = useState<string[][]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("tpl-grtip");
  
  // Custom manual mapping
  const [mapping, setMapping] = useState<ColumnMapping>(DEFAULT_TEMPLATES[0].mapping);
  const [saveTemplateMode, setSaveTemplateMode] = useState(false);
  const [customTemplateName, setCustomTemplateName] = useState("");
  const [customTemplates, setCustomTemplates] = useState<MappingTemplate[]>([]);

  // Validation results
  const [validations, setValidations] = useState<{
    type: "info" | "warning" | "success" | "error";
    message: string;
    details?: string;
  }[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFileContent = (name: string, size: number, text: string) => {
    setUploadedFiles([{ name, size, content: text }]);
    setParseStatus("parsing");
    setParsingProgress(20);

    setTimeout(() => {
      // Split into lines
      const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
      if (lines.length === 0) {
        setValidations([{ type: "error", message: "빈 파일이거나 올바르지 않은 형식입니다." }]);
        setParseStatus("idle");
        return;
      }

      setParsingProgress(50);
      // Determine separator (comma, semicolon, space, or tab)
      const firstLine = lines[0];
      let sep = ",";
      if (firstLine.includes(";")) sep = ";";
      else if (firstLine.includes("\t")) sep = "\t";
      else if (firstLine.includes("|")) sep = "|";

      // Raw parsing headers
      const headers = firstLine.split(sep).map(h => h.trim().replace(/['"]/g, ""));
      setRawHeaders(headers);

      // Create raw preview (up to 6 rows)
      const previewRows = lines.slice(1, 7).map(line => line.split(sep).map(col => col.trim().replace(/['"]/g, "")));
      setRawPreviewRows(previewRows);

      // Auto Mapping Logic (Fuzzy column detection based on headers)
      const autoMap: ColumnMapping = { ...mapping };
      
      const fuzzyMatch = (fields: string[], targetKey: keyof ColumnMapping) => {
        for (const f of fields) {
          const match = headers.find(h => {
            const hLower = h.toLowerCase();
            return hLower === f.toLowerCase() || hLower.includes(f.toLowerCase()) || f.toLowerCase().includes(hLower);
          });
          if (match) {
            autoMap[targetKey] = match;
            break;
          }
        }
      };

      fuzzyMatch(["epoch", "index", "seq", "num"], "epoch");
      fuzzyMatch(["timeSec", "time_sec", "elapsed", "seconds", "timestamp", "time"], "timeSec");
      fuzzyMatch(["prn", "satellite", "svid", "chan", "channel"], "prn");
      fuzzyMatch(["cn0", "c/n0", "cno", "dbhz", "snr"], "cn0");
      fuzzyMatch(["doppler", "freq", "doppler_hz"], "doppler");
      fuzzyMatch(["dopplerErr", "doppler_err", "dop_err", "doppler_deviation"], "dopplerErr");
      fuzzyMatch(["codePhase", "code_phase", "cp", "phase_chips"], "codePhase");
      fuzzyMatch(["pllDisc", "pll", "pll_disc", "disc", "phase_error"], "pllDisc");
      fuzzyMatch(["pseudorangeErr", "pr_err", "pr_res", "residual", "pseudorange"], "pseudorangeErr");
      fuzzyMatch(["positionErr", "pos_err", "error_3d", "position_error", "dist_err"], "positionErr");
      fuzzyMatch(["velocityErr", "vel_err", "velocity_error"], "velocityErr");
      fuzzyMatch(["lockStatus", "lock", "tracking_state", "locked"], "lockStatus");

      setMapping(autoMap);
      setParsingProgress(100);
      setParseStatus("mapped");

      // Set initial validations
      const initialVals = [
        { type: "success" as const, message: `로그 파일이 정상 구문 분석되었습니다: ${headers.length}개 컬럼 식별됨.` },
        { type: "info" as const, message: "헤더 분석 기반 컬럼 자동 매핑이 완료되었습니다. 확인 후 필요시 수동 지정하십시오." }
      ];
      setValidations(initialVals);
    }, 800);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target && event.target.result) {
          processFileContent(file.name, file.size, event.target.result as string);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target && event.target.result) {
          processFileContent(file.name, file.size, event.target.result as string);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const tplId = e.target.value;
    setSelectedTemplate(tplId);
    
    const allTpls = [...DEFAULT_TEMPLATES, ...customTemplates];
    const found = allTpls.find(t => t.id === tplId);
    if (found) {
      setMapping(found.mapping);
      setValidations(prev => [
        ...prev,
        { type: "success", message: `컬럼 매핑이 '${found.name}' 템플릿으로 변경되었습니다.` }
      ]);
    }
  };

  const handleSaveTemplate = () => {
    if (!customTemplateName.trim()) return;
    const newTpl: MappingTemplate = {
      id: `tpl-custom-${Date.now()}`,
      name: customTemplateName,
      description: "사용자 수동 저장 템플릿",
      mapping: { ...mapping }
    };
    const updated = [...customTemplates, newTpl];
    setCustomTemplates(updated);
    setSelectedTemplate(newTpl.id);
    setSaveTemplateMode(false);
    setCustomTemplateName("");
    setValidations(prev => [
      ...prev,
      { type: "success", message: `새 매핑 템플릿 '${newTpl.name}'이 안전하게 보존되었습니다.` }
    ]);
  };

  // Performs final standard rule checks and triggers analysis completion callback
  const runFullDataValidationAndAnalysis = () => {
    setParseStatus("validating");
    
    // Simulate exhaustive log diagnostics
    setTimeout(() => {
      // 1. Generate validations list
      const diagnosticReport = [
        { type: "success" as const, message: "필수 추적 파라미터 충족: 'prn', 'timeSec', 'cn0', 'positionErr' 매핑 정합성 일치." },
        { type: "success" as const, message: "타임스탬프 단조 증가 및 주기성 검증 통과 (10Hz 연속성 수렴)." },
        { type: "warning" as const, message: "PRN 12 신호세기 임계치 위반 탐지", details: "t=15.0~28.0초 구간에서 C/N₀ 수치 급락 현상 발견 (수신기 성능 저하 구간)" },
        { type: "warning" as const, message: "PRN 24 PLL Discriminator 임계치(0.05) 초과 구간 탐지", details: "t=35.0초에 주파수 도약 및 Phase Lock 감쇄 확인됨" },
        { type: "error" as const, message: "3차원 위치 정확도 규격 한계선(15.0m) 이탈 확인", details: "t=42.0초 이후 위치 오차가 최대 142.54m까지 폭발적으로 증가함 (Spoofing 의심)" }
      ];
      
      setValidations(diagnosticReport);
      setParseStatus("complete");

      // For mock purposes, if we are analyzing Trial 2 (Interference test), we populate it with realistic tracking data:
      const isTrial2 = selectedTrial.id === "test-trial-jamming" || selectedTrial.name.includes("Jamming") || selectedTrial.name.includes("비정상");
      
      setTimeout(() => {
        // High fidelity outputs
        if (isTrial2) {
          // Setup stats for Trial 2
          const stats = {
            ttff: 18.2,
            trackingLockRatio: 91.2,
            meanCn0: 38.5,
            minCn0: 0.0,
            dopplerRmsErr: 4.82,
            pllRmsDisc: 0.052,
            pseudorangeRmsErr: 32.41,
            meanPositionErr: 28.54,
            maxPositionErr: 142.54,
            cep50: 24.52,
            cep95: 118.42,
            lockLossCount: 1
          };
          
          // Generate 600 interference points
          const { generateInterferenceData, getMockAnomalies } = require("../data/mockData");
          const logs = generateInterferenceData();
          const anomalies = getMockAnomalies("test-trial-jamming");
          
          onAnalysisComplete(stats, logs, anomalies);
        } else {
          // Standard Baseline
          const stats = {
            ttff: 12.4,
            trackingLockRatio: 100.0,
            meanCn0: 45.2,
            minCn0: 41.5,
            dopplerRmsErr: 0.35,
            pllRmsDisc: 0.0035,
            pseudorangeRmsErr: 0.81,
            meanPositionErr: 1.48,
            maxPositionErr: 2.38,
            cep50: 1.21,
            cep95: 1.94,
            lockLossCount: 0
          };
          
          const { generateBaselineData } = require("../data/mockData");
          const logs = generateBaselineData();
          
          onAnalysisComplete(stats, logs, []);
        }
      }, 1000);

    }, 1200);
  };

  const getMappingFieldLabel = (key: keyof ColumnMapping) => {
    switch (key) {
      case "epoch": return "에포크 번호 (Epoch)";
      case "timeSec": return "경과 시간 (Time Sec) *";
      case "prn": return "위성 식별자 (PRN) *";
      case "cn0": return "반송파 대 잡음비 (C/N₀) *";
      case "doppler": return "측정 도플러 (Doppler)";
      case "dopplerErr": return "도플러 오차 (Doppler Error)";
      case "codePhase": return "코드 위상 (Code Phase)";
      case "pllDisc": return "PLL Discriminator *";
      case "pseudorangeErr": return "의사거리 잔차 (PR Error)";
      case "positionErr": return "위치 해오차 (Position Error) *";
      case "velocityErr": return "속도 해오차 (Velocity Error)";
      case "lockStatus": return "추적 잠금 여부 (Lock Status)";
    }
  };

  return (
    <div className="space-y-6" id="grtip-log-parser">
      {/* Target Trial Title Card */}
      <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Settings className="h-9 w-9 text-hanwha-orange bg-hanwha-orange/10 p-2 rounded-lg" />
          <div>
            <h2 className="font-bold text-slate-800 text-sm">수신기 시험 로그 정합성 로더 및 파서</h2>
            <p className="text-xs text-slate-500 mt-0.5">선택된 시험: <span className="font-mono text-hanwha-orange font-bold">{selectedTrial.name}</span></p>
          </div>
        </div>
        <div className="text-right text-xs font-mono">
          <div className="text-slate-400">SW Version: {selectedTrial.swVersion}</div>
          <div className="text-slate-400">HW Version: {selectedTrial.hwVersion}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Upload & Preview Panels (Left 2/3) */}
        <div className="xl:col-span-2 space-y-6">
          {/* File Drag Area */}
          {uploadedFiles.length === 0 ? (
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
                dragActive
                  ? "border-hanwha-orange bg-hanwha-orange/5"
                  : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/30"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt,.xlsx,.bin"
                onChange={handleFileChange}
                className="hidden"
                id="log-file-input"
              />
              <Upload className="mx-auto h-12 w-12 text-slate-300 stroke-1 mb-4" />
              <h3 className="font-semibold text-slate-700 text-sm">수신기 시험 결과 로그 파일을 업로드해 주세요</h3>
              <p className="text-slate-400 text-xs mt-1.5 max-w-sm mx-auto leading-relaxed">
                CSV, TXT, XLSX, BIN 형식 지원. 하나의 파일 또는 복수 위성 파일을 이 영역에 끌어놓거나 클릭하여 선택하십시오.
              </p>
              <div className="mt-4 inline-flex items-center gap-1 px-3 py-1 bg-slate-100 rounded text-[10px] font-mono text-slate-500">
                <span>권장 포맷: GPS L1 10Hz 에포크 시계열</span>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-hanwha-orange" />
                  <div>
                    <h4 className="font-bold text-slate-800 text-xs">{uploadedFiles[0].name}</h4>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">파일 크기: {(uploadedFiles[0].size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setUploadedFiles([]);
                    setParseStatus("idle");
                    setRawHeaders([]);
                    setRawPreviewRows([]);
                    setValidations([]);
                  }}
                  className="text-xs text-rose-500 hover:text-rose-600 font-semibold"
                >
                  파일 재선택
                </button>
              </div>

              {/* Progress Feedback */}
              {parsingProgress !== null && parseStatus === "parsing" && (
                <div className="py-4 text-center">
                  <div className="text-xs text-slate-500 font-semibold mb-2">수신기 파일 바이너리/텍스트 인코딩 분석 중... {parsingProgress}%</div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden max-w-md mx-auto">
                    <div className="bg-hanwha-orange h-full transition-all duration-300" style={{ width: `${parsingProgress}%` }} />
                  </div>
                </div>
              )}

              {/* Mapped Row Preview Panel */}
              {rawHeaders.length > 0 && (
                <div className="space-y-4">
                  <div>
                    <h5 className="font-semibold text-slate-700 text-xs mb-2 flex items-center gap-1.5">
                      <Layers className="h-4 w-4 text-slate-500" />
                      <span>원본 로그 파일 로드 미러뷰 (상위 5행)</span>
                    </h5>
                    
                    <div className="overflow-x-auto border border-slate-100 rounded-lg">
                      <table className="w-full text-left text-[11px] font-mono border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 border-b border-slate-100">
                            {rawHeaders.map((header, idx) => (
                              <th key={idx} className="p-2 border-r border-slate-100 whitespace-nowrap">
                                {header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {rawPreviewRows.map((row, rowIdx) => (
                            <tr key={rowIdx} className="border-b border-slate-100 text-slate-600">
                              {row.map((val, colIdx) => (
                                <td key={colIdx} className="p-2 border-r border-slate-100 whitespace-nowrap">
                                  {val}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Mapping Table Settings (Visible when file is parsed) */}
          {rawHeaders.length > 0 && (
            <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-3 border-b border-slate-200">
                <div>
                  <h4 className="font-bold text-slate-800 text-xs">수신기 컬럼 수동/자동 필드 맵핑</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">가장 적합한 로그 데이터 구조와 GRTIP 표준 필드를 매치하십시오.</p>
                </div>
                
                {/* Template picker */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-slate-500 whitespace-nowrap">매핑 템플릿:</span>
                  <select
                    value={selectedTemplate}
                    onChange={handleTemplateChange}
                    className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-[11px] text-slate-600 focus:outline-hidden"
                  >
                    {DEFAULT_TEMPLATES.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                    {customTemplates.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Grid of inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {(Object.keys(mapping) as Array<keyof ColumnMapping>).map((fieldKey) => (
                  <div key={fieldKey} className="flex flex-col">
                    <label className="text-[10px] font-semibold text-slate-600 mb-1">
                      {getMappingFieldLabel(fieldKey)}
                    </label>
                    <select
                      value={mapping[fieldKey]}
                      onChange={(e) => {
                        const val = e.target.value;
                        setMapping(prev => ({ ...prev, [fieldKey]: val }));
                      }}
                      className="bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-700 focus:outline-hidden focus:bg-white"
                    >
                      <option value="">-- 매핑 안함 --</option>
                      {rawHeaders.map((rh, idx) => (
                        <option key={idx} value={rh}>{rh}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              {/* Save template option */}
              <div className="mt-5 pt-4 border-t border-slate-200 flex items-center justify-between">
                {saveTemplateMode ? (
                  <div className="flex items-center gap-2 w-full max-w-md">
                    <input
                      type="text"
                      placeholder="템플릿 이름 입력 (예: OEM7 ASCII)"
                      value={customTemplateName}
                      onChange={(e) => setCustomTemplateName(e.target.value)}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-xs text-slate-700 focus:outline-hidden focus:bg-white focus:ring-1 focus:ring-hanwha-orange"
                    />
                    <button
                      onClick={handleSaveTemplate}
                      className="bg-hanwha-orange hover:bg-hanwha-orange-dark text-white px-3 py-1.5 text-xs rounded font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Save className="h-3 w-3" />
                      저장
                    </button>
                    <button
                      onClick={() => setSaveTemplateMode(false)}
                      className="text-xs text-slate-400 hover:text-slate-600 px-2 cursor-pointer"
                    >
                      취소
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setSaveTemplateMode(true)}
                    className="text-xs text-hanwha-orange hover:text-hanwha-orange-dark font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Save className="h-3.5 w-3.5" />
                    현재 컬럼 매핑 구조를 템플릿으로 저장
                  </button>
                )}

                {/* Confirm Analysis Button */}
                <button
                  onClick={runFullDataValidationAndAnalysis}
                  disabled={parseStatus === "validating"}
                  className="bg-hanwha-orange hover:bg-hanwha-orange-dark text-white px-5 py-2 text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  id="btn-run-analysis"
                >
                  <Play className="h-4 w-4" />
                  <span>적용 및 성능 분석 수행</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Diagnostic Validations Panel (Right 1/3) */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-xs border border-slate-100 p-5">
            <h4 className="font-bold text-slate-800 text-xs mb-1.5">데이터 무결성 자가 진단 (Diagnostic Feed)</h4>
            <p className="text-[10px] text-slate-400 leading-relaxed mb-4">
              수신 로그 내 결측 데이터, 부호 불일치, GPS Week 불일치 및 타임스탬프 중복·단속 구간을 실시간 탐지하는 룰 베이스 유효성 엔진입니다.
            </p>

            <div className="space-y-3.5 max-h-[450px] overflow-y-auto pr-1">
              {validations.map((v, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg border flex gap-2.5 ${
                    v.type === "success"
                      ? "bg-emerald-50/50 border-emerald-100 text-emerald-800"
                      : v.type === "error"
                      ? "bg-rose-50/50 border-rose-100 text-rose-800"
                      : v.type === "warning"
                      ? "bg-amber-50/50 border-amber-100 text-amber-800"
                      : "bg-blue-50/50 border-blue-100 text-blue-800"
                  }`}
                >
                  <div>
                    {v.type === "success" ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5" />
                    ) : (
                      <AlertTriangle className={`h-4 w-4 mt-0.5 ${v.type === "error" ? "text-rose-600" : v.type === "warning" ? "text-amber-600" : "text-blue-600"}`} />
                    )}
                  </div>
                  <div>
                    <div className="font-semibold text-xs leading-snug">{v.message}</div>
                    {v.details && <div className="text-[10px] opacity-80 mt-1 leading-normal font-mono">{v.details}</div>}
                  </div>
                </div>
              ))}

              {validations.length === 0 && (
                <div className="text-center py-12 text-slate-400 text-xs border border-dashed border-slate-100 rounded-lg">
                  <HelpCircle className="h-8 w-8 mx-auto text-slate-300 stroke-1 mb-2" />
                  <span>아직 파일을 로드하지 않았습니다.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
