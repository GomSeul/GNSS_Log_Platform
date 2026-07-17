/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { GNSSDataRow, PerformanceStats } from "../types";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine } from "recharts";
import { Activity, ShieldCheck, Zap, Navigation, Crosshair, BarChart3, Radio, HelpCircle } from "lucide-react";

interface AnalyzerDashboardProps {
  logs: GNSSDataRow[];
  stats: PerformanceStats;
}

export default function AnalyzerDashboard({ logs, stats }: AnalyzerDashboardProps) {
  // Filters
  const satellites = useMemo(() => {
    return Array.from(new Set(logs.map(l => l.prn))).sort((a, b) => a - b);
  }, [logs]);

  const [selectedPrn, setSelectedPrn] = useState<number>(satellites[0] || 12);
  const [timeRange, setTimeRange] = useState<[number, number]>([0, 60]);

  // Filter logs based on PRN and Time range
  const filteredLogs = useMemo(() => {
    return logs.filter(l => l.prn === selectedPrn && l.timeSec >= timeRange[0] && l.timeSec <= timeRange[1]);
  }, [logs, selectedPrn, timeRange]);

  // Combined position error data (position error is identical across PRNs for each epoch, so we filter by first PRN for position calculations)
  const positionLogs = useMemo(() => {
    return logs.filter(l => l.prn === satellites[0] && l.timeSec >= timeRange[0] && l.timeSec <= timeRange[1]);
  }, [logs, satellites, timeRange]);

  return (
    <div className="space-y-6" id="grtip-analyzer-dashboard">
      {/* 1. Control & Filter Panel */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-100 p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Satellite Selection */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">분석 대상 위성 (PRN 채널 선택):</span>
          <div className="flex flex-wrap gap-1">
            {satellites.map(prn => (
              <button
                key={prn}
                onClick={() => setSelectedPrn(prn)}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  selectedPrn === prn
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                }`}
                id={`btn-prn-${prn}`}
              >
                PRN {prn}
              </button>
            ))}
          </div>
        </div>

        {/* Time Slider */}
        <div className="flex items-center gap-3 w-full md:w-auto flex-1 max-w-md">
          <span className="text-xs font-semibold text-slate-500 whitespace-nowrap font-mono">구간 필터: {timeRange[0]}s - {timeRange[1]}s</span>
          <input
            type="range"
            min="0"
            max="60"
            step="1"
            value={timeRange[1]}
            onChange={(e) => setTimeRange([0, parseFloat(e.target.value)])}
            className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
        </div>
      </div>

      {/* 2. GNSS Performance Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Tracker C/N0 Card */}
        <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">평균 신호 세기 (C/N₀)</span>
            <Radio className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="mt-2.5 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold tracking-tight text-slate-800 font-mono">{stats.meanCn0.toFixed(1)}</span>
            <span className="text-xs text-slate-400 font-semibold">dB-Hz</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-2 flex items-center justify-between">
            <span>최소: {stats.minCn0.toFixed(1)} dB-Hz</span>
            <span className="text-emerald-500 font-semibold font-mono">Lock-on 상태</span>
          </div>
        </div>

        {/* Doppler Error RMS Card */}
        <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">도플러 오차 (RMS)</span>
            <Zap className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2.5 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold tracking-tight text-slate-800 font-mono">{stats.dopplerRmsErr.toFixed(2)}</span>
            <span className="text-xs text-slate-400 font-semibold">Hz</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-2 flex items-center justify-between">
            <span>PLL Lock 마진 확보</span>
            <span className={`${stats.dopplerRmsErr > 2.0 ? "text-rose-500" : "text-emerald-500"} font-semibold font-mono`}>
              {stats.dopplerRmsErr > 2.0 ? "요동 감지" : "정상"}
            </span>
          </div>
        </div>

        {/* Circular Error Probable Card */}
        <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">위치 정확도 CEP-95</span>
            <Navigation className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2.5 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold tracking-tight text-slate-800 font-mono">{stats.cep95.toFixed(2)}</span>
            <span className="text-xs text-slate-400 font-semibold">m</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-2 flex items-center justify-between">
            <span>CEP-50: {stats.cep50.toFixed(2)}m</span>
            <span className={`${stats.cep95 > 15.0 ? "text-rose-500" : "text-emerald-500"} font-semibold font-mono`}>
              {stats.cep95 > 15.0 ? "한계선 이탈" : "양호"}
            </span>
          </div>
        </div>

        {/* Lock Ratio Card */}
        <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">추적 유지율 (Lock Ratio)</span>
            <ShieldCheck className="h-4 w-4 text-blue-500" />
          </div>
          <div className="mt-2.5 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold tracking-tight text-slate-800 font-mono">{stats.trackingLockRatio.toFixed(1)}</span>
            <span className="text-xs text-slate-400 font-semibold">%</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-2 flex items-center justify-between">
            <span>TTFF: {stats.ttff.toFixed(1)}s</span>
            <span className="text-slate-500">이탈횟수: {stats.lockLossCount}회</span>
          </div>
        </div>
      </div>

      {/* 3. Linked Graph Workspace (2x2 Grid) */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Card 1: C/N0 Time Series */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-100 p-5">
          <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-2">
            <h4 className="text-xs font-bold text-slate-800">반송파 대 잡음비 (C/N₀) 시계열 지표</h4>
            <span className="text-[10px] text-slate-400 font-mono">단위: dB-Hz</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={filteredLogs} syncId="grtipSync" margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="timeSec" type="number" domain={["auto", "auto"]} stroke="#94a3b8" fontSize={10} tickFormatter={(v) => `${v}s`} />
                <YAxis domain={[0, 55]} stroke="#94a3b8" fontSize={10} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1e293b", borderRadius: "8px", border: "none", color: "#f8fafc", fontSize: "11px", fontFamily: "monospace" }}
                  labelFormatter={(v) => `Time: ${v}s`}
                />
                <Legend wrapperStyle={{ fontSize: "10px" }} />
                {/* 30 dB-Hz Minimum Limit line */}
                <ReferenceLine y={30} stroke="#f43f5e" strokeDasharray="3 3" label={{ value: "추적 한계선 (30 dB-Hz)", fill: "#f43f5e", fontSize: 9, position: "top" }} />
                <Line name="C/N₀ (Measured)" type="monotone" dataKey="cn0" stroke="#4f46e5" strokeWidth={1.8} dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Card 2: Doppler Error */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-100 p-5">
          <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-2">
            <h4 className="text-xs font-bold text-slate-800">측정 도플러 잔차 오차 (Doppler Shift Error)</h4>
            <span className="text-[10px] text-slate-400 font-mono">단위: Hz</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={filteredLogs} syncId="grtipSync" margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="timeSec" type="number" domain={["auto", "auto"]} stroke="#94a3b8" fontSize={10} tickFormatter={(v) => `${v}s`} />
                <YAxis stroke="#94a3b8" fontSize={10} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1e293b", borderRadius: "8px", border: "none", color: "#f8fafc", fontSize: "11px", fontFamily: "monospace" }}
                  labelFormatter={(v) => `Time: ${v}s`}
                />
                <Legend wrapperStyle={{ fontSize: "10px" }} />
                <Line name="도플러 오차 (FLL/PLL 오차)" type="monotone" dataKey="dopplerErr" stroke="#eab308" strokeWidth={1.5} dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Card 3: PLL Loop Discriminator */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-100 p-5">
          <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-2">
            <h4 className="text-xs font-bold text-slate-800">반송파 추적루프(PLL) 판별기 출력 (Discriminator Output)</h4>
            <span className="text-[10px] text-slate-400 font-mono">단위: chips / radians</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={filteredLogs} syncId="grtipSync" margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="timeSec" type="number" domain={["auto", "auto"]} stroke="#94a3b8" fontSize={10} tickFormatter={(v) => `${v}s`} />
                <YAxis domain={[0, 0.2]} stroke="#94a3b8" fontSize={10} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1e293b", borderRadius: "8px", border: "none", color: "#f8fafc", fontSize: "11px", fontFamily: "monospace" }}
                  labelFormatter={(v) => `Time: ${v}s`}
                />
                <Legend wrapperStyle={{ fontSize: "10px" }} />
                <ReferenceLine y={0.05} stroke="#f43f5e" strokeDasharray="3 3" label={{ value: "PLL 불안정 임계치 (0.05)", fill: "#f43f5e", fontSize: 9, position: "top" }} />
                <Line name="PLL 판별기 크기" type="monotone" dataKey="pllDisc" stroke="#06b6d4" strokeWidth={1.5} dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Card 4: Navigation Domain 3D Position Error */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-100 p-5">
          <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-2">
            <h4 className="text-xs font-bold text-slate-800">항법 연산 위치해 누적 오차 (3D Position Error)</h4>
            <span className="text-[10px] text-slate-400 font-mono">단위: m</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={positionLogs} syncId="grtipSync" margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="timeSec" type="number" domain={["auto", "auto"]} stroke="#94a3b8" fontSize={10} tickFormatter={(v) => `${v}s`} />
                <YAxis stroke="#94a3b8" fontSize={10} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1e293b", borderRadius: "8px", border: "none", color: "#f8fafc", fontSize: "11px", fontFamily: "monospace" }}
                  labelFormatter={(v) => `Time: ${v}s`}
                />
                <Legend wrapperStyle={{ fontSize: "10px" }} />
                <ReferenceLine y={15} stroke="#ef4444" strokeDasharray="3 3" label={{ value: "요구 정밀도 한계선 (15m)", fill: "#ef4444", fontSize: 9, position: "top" }} />
                <Line name="위치 해오차" type="monotone" dataKey="positionErr" stroke="#10b981" strokeWidth={1.8} dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
