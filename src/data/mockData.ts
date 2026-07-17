/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Project, TestTrial, GNSSDataRow, AnomalyEvent, PerformanceStats, RuleConfig } from "../types";

// Standard Rule Configurations
export const DEFAULT_RULE_CONFIG: RuleConfig = {
  cn0DropThreshold: 12, // dB-Hz
  dopplerJumpThreshold: 150, // Hz
  pllThreshold: 0.05, // Unitless discriminator threshold
  positionErrorLimit: 15, // meters
  missingTimeThreshold: 1.5, // seconds
};

// Generates high-fidelity GNSS receiver dataset for Trial 1 (Baseline - Standard Flight)
export function generateBaselineData(): GNSSDataRow[] {
  const data: GNSSDataRow[] = [];
  const satellites = [12, 15, 18, 24, 29];
  
  // 60 seconds at 10Hz = 600 epochs
  for (let epoch = 0; epoch < 600; epoch++) {
    const timeSec = epoch / 10;
    
    for (const prn of satellites) {
      // Base C/N0 (PRN specific)
      const baseCn0 = prn === 12 ? 45.5 : prn === 15 ? 42.1 : prn === 18 ? 47.8 : prn === 24 ? 44.3 : 46.2;
      // Slight noise
      const cn0Noise = Math.sin(timeSec / 5) * 0.5 + (Math.random() - 0.5) * 0.4;
      const cn0 = parseFloat((baseCn0 + cn0Noise).toFixed(1));
      
      // Doppler follows a smooth flight trajectory profile (Doppler shift due to relative satellite motion)
      // PRN 12 starts at 1500Hz, goes down. PRN 18 starts at -800Hz, goes up.
      let baseDoppler = 0;
      if (prn === 12) baseDoppler = 1500 - timeSec * 1.5;
      else if (prn === 15) baseDoppler = 2200 - timeSec * 0.8;
      else if (prn === 18) baseDoppler = -800 + timeSec * 2.1;
      else if (prn === 24) baseDoppler = 120 + timeSec * 0.5;
      else baseDoppler = -1900 - timeSec * 1.1;
      
      const dopplerNoise = (Math.random() - 0.5) * 0.2;
      const doppler = parseFloat((baseDoppler + dopplerNoise).toFixed(2));
      
      // Doppler error compared to simulator reference (highly stable on baseline)
      const dopplerErr = parseFloat(((Math.random() - 0.5) * 0.4).toFixed(2));
      
      // Code phase slowly changing smoothly
      const codePhase = parseFloat((120.4 + timeSec * 0.03 + Math.sin(timeSec / 10) * 0.1).toFixed(4));
      
      // PLL discriminator output: very stable, small values
      const pllDisc = parseFloat((Math.abs(Math.random() - 0.5) * 0.005 + 0.001).toFixed(5));
      
      // Pseudorange error: small noise around 0.8m
      const pseudorangeErr = parseFloat((0.8 + (Math.random() - 0.5) * 0.3).toFixed(2));
      
      // Position error: stable standard GPS accuracy (CEP-50 ~ 1.2m)
      const positionErrNoise = Math.sin(timeSec / 12) * 0.3 + Math.cos(timeSec / 25) * 0.2 + 1.2;
      const positionErr = parseFloat((positionErrNoise + (Math.random() - 0.5) * 0.15).toFixed(2));
      
      // Velocity error: very small
      const velocityErr = parseFloat((0.03 + Math.random() * 0.02).toFixed(2));
      
      data.push({
        epoch,
        timeSec,
        prn,
        cn0,
        doppler,
        dopplerErr,
        codePhase,
        pllDisc,
        pseudorangeErr,
        positionErr,
        velocityErr,
        lockStatus: true
      });
    }
  }
  
  return data;
}

// Generates high-fidelity GNSS receiver dataset for Trial 2 (SW v2.4.1 - Jamming & Spoofing Active)
export function generateInterferenceData(): GNSSDataRow[] {
  const data: GNSSDataRow[] = [];
  const satellites = [12, 15, 18, 24, 29];
  
  for (let epoch = 0; epoch < 600; epoch++) {
    const timeSec = epoch / 10;
    
    // Injected Broadband Jamming between t=15.0s and t=28.0s
    const isJammingActive = timeSec >= 15.0 && timeSec <= 28.0;
    
    // Spoofing Injection starts at t=42.0s
    const isSpoofingActive = timeSec >= 42.0;
    
    for (const prn of satellites) {
      let lockStatus = true;
      let cn0 = 0;
      let doppler = 0;
      let dopplerErr = 0;
      let codePhase = 0;
      let pllDisc = 0;
      let pseudorangeErr = 0;
      
      // 1. BASE C/N0 & SIGNAL STRENGTH DROPS (JAMMING STAGE)
      const normalCn0 = prn === 12 ? 45.5 : prn === 15 ? 42.1 : prn === 18 ? 47.8 : prn === 24 ? 44.3 : 46.2;
      
      if (isJammingActive) {
        if (prn === 12) {
          // PRN 12 drops severely and loses lock between t=18.0s and t=24.0s
          if (timeSec >= 18.0 && timeSec < 24.0) {
            lockStatus = false;
            cn0 = 0; // Lost signal
          } else if (timeSec < 18.0) {
            // Ramping down C/N0
            const progress = (timeSec - 15.0) / 3.0; // 0 to 1
            cn0 = parseFloat((normalCn0 - progress * 24.5 + (Math.random() - 0.5) * 2).toFixed(1));
          } else {
            // Re-acquisition ramping up
            const progress = (timeSec - 24.0) / 4.0; // 0 to 1
            cn0 = parseFloat((22.0 + progress * 18.0 + (Math.random() - 0.5) * 1).toFixed(1));
          }
        } else if (prn === 15) {
          // PRN 15 experiences severe drop but barely survives (low lock margins)
          const jamDrop = Math.sin((timeSec - 15) * Math.PI / 13) * 19.0;
          cn0 = parseFloat((normalCn0 - jamDrop + (Math.random() - 0.5) * 3).toFixed(1));
        } else {
          // Other satellites experience mild RF jamming attenuation (-4dB to -8dB)
          const jamDrop = 5.0 + Math.random() * 2.0;
          cn0 = parseFloat((normalCn0 - jamDrop + (Math.random() - 0.5) * 1).toFixed(1));
        }
      } else {
        // Normal state
        const cn0Noise = Math.sin(timeSec / 5) * 0.5 + (Math.random() - 0.5) * 0.4;
        cn0 = parseFloat((normalCn0 + cn0Noise).toFixed(1));
      }
      
      // 2. DOPPLER SHIFTS & JUMPS
      let baseDoppler = 0;
      if (prn === 12) baseDoppler = 1500 - timeSec * 1.5;
      else if (prn === 15) baseDoppler = 2200 - timeSec * 0.8;
      else if (prn === 18) baseDoppler = -800 + timeSec * 2.1;
      else if (prn === 24) baseDoppler = 120 + timeSec * 0.5;
      else baseDoppler = -1900 - timeSec * 1.1;
      
      if (lockStatus) {
        doppler = parseFloat((baseDoppler + (Math.random() - 0.5) * 0.5).toFixed(2));
        
        // Doppler jump on PRN 24 at t=35.0s (Cycle Slip simulated)
        if (prn === 24 && timeSec >= 35.0 && timeSec <= 35.8) {
          doppler += 280.0; // Sudden step change
        }
        
        // Doppler Error
        if (prn === 24 && timeSec >= 35.0 && timeSec <= 35.8) {
          dopplerErr = 280.0 + (Math.random() - 0.5) * 1.5;
        } else if (isJammingActive) {
          dopplerErr = (Math.random() - 0.5) * 3.5; // tracking loops jittering
        } else {
          dopplerErr = (Math.random() - 0.5) * 0.5;
        }
        dopplerErr = parseFloat(dopplerErr.toFixed(2));
      } else {
        doppler = 0;
        dopplerErr = 0;
      }
      
      // 3. CODE PHASE & LOOP FILTER DISCRIMINATOR
      if (lockStatus) {
        codePhase = parseFloat((120.4 + timeSec * 0.03 + Math.sin(timeSec / 10) * 0.1).toFixed(4));
        
        // Discriminator spikes
        if (isJammingActive && prn === 15) {
          // PLL loop Jitter in low C/N0
          pllDisc = parseFloat((Math.abs(Math.random() - 0.5) * 0.065 + 0.015).toFixed(5));
        } else if (prn === 24 && timeSec >= 35.0 && timeSec <= 35.8) {
          // Cycle slip spike
          pllDisc = parseFloat((0.085 + Math.random() * 0.012).toFixed(5));
        } else {
          pllDisc = parseFloat((Math.abs(Math.random() - 0.5) * 0.005 + 0.001).toFixed(5));
        }
      } else {
        codePhase = 0;
        pllDisc = 0.5; // High out-of-lock discriminator value
      }
      
      // 4. MEASUREMENT ERRORS (PSEUDORANGE)
      if (lockStatus) {
        let baseErr = 0.8;
        if (isJammingActive) {
          baseErr = prn === 15 ? 12.5 : 4.5; // tracking jitter error
        } else if (isSpoofingActive) {
          // Spoofing pulls code phase away on tracked signals
          const spoofTime = timeSec - 42.0;
          baseErr = 0.8 + Math.pow(spoofTime, 1.8) * 4.5;
        }
        pseudorangeErr = parseFloat((baseErr + (Math.random() - 0.5) * 1.5).toFixed(2));
      } else {
        pseudorangeErr = 999.0; // Invalid measurement
      }
      
      // 5. POSITION ERROR PROFILE (SPOOFING ESCALATION)
      let positionErr = 1.3;
      if (isJammingActive) {
        // Position error degrades slightly during jamming due to poor geometry (PRN 12 lost)
        positionErr = 4.2 + (Math.random() - 0.5) * 1.0;
      } else if (isSpoofingActive) {
        // Position error explodes as coherent spoofer pulls receiver trajectory
        const spoofTime = timeSec - 42.0;
        positionErr = 1.3 + Math.pow(spoofTime, 1.7) * 8.5; // Ramps up quickly to ~142.5m
      } else {
        // Normal drift
        positionErr = 1.3 + Math.sin(timeSec / 10) * 0.3 + (Math.random() - 0.5) * 0.2;
      }
      positionErr = parseFloat(positionErr.toFixed(2));
      
      const velocityErr = isJammingActive ? 0.45 : isSpoofingActive ? 12.4 : 0.04;
      
      data.push({
        epoch,
        timeSec,
        prn,
        cn0,
        doppler,
        dopplerErr,
        codePhase,
        pllDisc,
        pseudorangeErr,
        positionErr,
        velocityErr,
        lockStatus
      });
    }
  }
  
  return data;
}

// Default pre-populated projects
export const DEFAULT_PROJECTS: Project[] = [
  {
    id: "proj-k-sat-2",
    name: "한국형 군사위성 항법수신기(K-Sat v2.4) 검증 프로젝트",
    description: "K-Sat v2.4 수신기의 극고 동적 비행 프로파일 시뮬레이터 연동 정밀 신호 추적 능력 및 복합 RF 재밍/기만 신호 내성 평가용 시험 세트",
    createdAt: "2026-05-12T14:30:00-07:00",
    testIds: ["test-trial-baseline", "test-trial-jamming"]
  }
];

// Default pre-populated test trials
export const DEFAULT_TRIALS: TestTrial[] = [
  {
    id: "test-trial-baseline",
    projectId: "proj-k-sat-2",
    name: "[정상 기준] 시뮬레이터 표준 비행 시나리오 정적 연동 시험 (Baseline)",
    testTime: "2026-07-10 10:00:00",
    swVersion: "SW_V2.4.0_STABLE",
    hwVersion: "HW_REV_C_FPGA_V1.1",
    scenario: "SIM_STABLE_FLIGHT_ALT_30KM_100SEC",
    receiverInfo: "K-Sat GNSS Core Receiver Block-II #1",
    inspector: "황용태 수석연구원",
    isBaseline: true,
    logsCount: 3000,
    status: 'passed',
    version: 1,
    notes: "항법 수신기가 이상 없이 GPS L1 위성 5기를 100% 안정한 신호 레벨(42~48 dB-Hz)로 연속 추적함. 수신기 위치 오차는 평균 1.5m, 최대 2.4m로 지상 검증 요구규격을 충족함. 신규 SW 버전 비교 분석용 기준선으로 설정함.",
    ruleConfig: DEFAULT_RULE_CONFIG,
    analysisDate: "2026-07-10 11:20:00",
    aiAnalysisReport: `### 📡 수동 분석 리포트 완료 (정상선 등록)

본 시험은 시뮬레이터를 이용한 GPS L1 표준 연동 시험으로, 수신 상태가 극히 안정적입니다.
- **신호세기**: 평균 C/N₀ 45.2 dB-Hz로 반송파 추적 마진 30 dB-Hz를 여유 있게 확보함.
- **추적 및 도플러**: 도플러 주파수 오차 RMS 0.35 Hz로 루프 필터 안정도 유지. Lock-Loss 발생율 0%.
- **정밀도**: horizontal CEP-95는 1.9m로 정밀 항법 정밀도 요구사항을 충족합니다.`
  },
  {
    id: "test-trial-jamming",
    projectId: "proj-k-sat-2",
    name: "[비정상 시험] SW v2.4.1 GPS L1 Jamming & Spoofing 능동 인가 시험",
    testTime: "2026-07-15 14:45:00",
    swVersion: "SW_V2.4.1_BETA",
    hwVersion: "HW_REV_C_FPGA_V1.1",
    scenario: "SIM_JAMMING_ATT_25DB_AND_COHERENT_SPOOFING",
    receiverInfo: "K-Sat GNSS Core Receiver Block-II #1",
    inspector: "김민혁 선임연구원",
    isBaseline: false,
    logsCount: 3000,
    status: 'failed',
    version: 1,
    notes: "SW v2.4.1 버전의 RF 간섭 저항 특성 검증을 위해 15~28초 구간에 광대역 L1 재밍(25dB 강도) 및 42초 이후 동기식 기만(Spoofing) 신호를 인가함. PRN 12 위성에서 Lock-Loss 발생, PRN 24에서 Cycle Slip이 확인되었으며, 42초 기만 인가 시 위치 오차가 140m 이상으로 폭증하여 시험 실패 판정.",
    ruleConfig: DEFAULT_RULE_CONFIG,
    analysisDate: "2026-07-16 18:05:00"
  }
];

// Simulates checking and running the default DB initialization on client-side
export function getSavedProjects(): Project[] {
  const data = localStorage.getItem("grtip_projects");
  if (!data) {
    localStorage.setItem("grtip_projects", JSON.stringify(DEFAULT_PROJECTS));
    return DEFAULT_PROJECTS;
  }
  return JSON.parse(data);
}

export function saveProjects(projects: Project[]) {
  localStorage.setItem("grtip_projects", JSON.stringify(projects));
}

export function getSavedTrials(): TestTrial[] {
  const data = localStorage.getItem("grtip_trials");
  if (!data) {
    localStorage.setItem("grtip_trials", JSON.stringify(DEFAULT_TRIALS));
    return DEFAULT_TRIALS;
  }
  return JSON.parse(data);
}

export function saveTrials(trials: TestTrial[]) {
  localStorage.setItem("grtip_trials", JSON.stringify(trials));
}

// Pre-computed Stats for default trials to avoid heavy client calculation every load
export const MOCK_STATS: Record<string, PerformanceStats> = {
  "test-trial-baseline": {
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
  },
  "test-trial-jamming": {
    ttff: 18.2,
    trackingLockRatio: 91.2,
    meanCn0: 38.5,
    minCn0: 0.0, // Because of loss of lock
    dopplerRmsErr: 4.82,
    pllRmsDisc: 0.052,
    pseudorangeRmsErr: 32.41,
    meanPositionErr: 28.54,
    maxPositionErr: 142.54,
    cep50: 24.52,
    cep95: 118.42,
    lockLossCount: 1
  }
};

// Generate anomaly list automatically for Trial 2 based on thresholds
export function getMockAnomalies(testId: string): AnomalyEvent[] {
  if (testId === "test-trial-baseline") {
    return [];
  }
  
  if (testId === "test-trial-jamming") {
    // Return high-fidelity static events matching our generated logs
    const trialData = generateInterferenceData();
    
    const getContextData = (timeSec: number, prn: number) => {
      // Return window of data: timeSec - 3s to timeSec + 3s
      return trialData.filter(d => d.prn === prn && Math.abs(d.timeSec - timeSec) <= 3);
    };
    
    return [
      {
        id: "evt-1",
        testId: "test-trial-jamming",
        timestamp: 15.0,
        prn: 12,
        metricType: "cn0",
        severity: "warning",
        description: "GPS L1 수신세기 급감 감지: PRN 12 신호가 RF Jamming 인가 즉시 45.1 dB-Hz에서 26.2 dB-Hz로 수직 하강함 (변화 속도 > 6.0 dB/s).",
        status: "unreviewed",
        reviewNotes: "",
        contextData: getContextData(15.0, 12)
      },
      {
        id: "evt-2",
        testId: "test-trial-jamming",
        timestamp: 18.0,
        prn: 12,
        metricType: "tracking_loss",
        severity: "error",
        description: "반송파 추적 루프(PLL) Lock Loss 발생: C/N₀ 수치가 최저 임계치(30 dB-Hz) 이하로 연속 2초 이상 저하되면서 수신기가 위성 추적 상태를 소실함.",
        status: "unreviewed",
        reviewNotes: "",
        contextData: getContextData(18.0, 12)
      },
      {
        id: "evt-3",
        testId: "test-trial-jamming",
        timestamp: 20.0,
        prn: 15,
        metricType: "pll",
        severity: "warning",
        description: "PLL 루프 판별기 출력 임계치 초과 (Jitter 급증): RF 노이즈 영향으로 PRN 15 PLL 판별기 진폭이 0.076을 기록하여 위상 잠금 오류 가능성이 매우 높음.",
        status: "unreviewed",
        reviewNotes: "",
        contextData: getContextData(20.0, 15)
      },
      {
        id: "evt-4",
        testId: "test-trial-jamming",
        timestamp: 24.0,
        prn: 12,
        metricType: "tracking_loss",
        severity: "info",
        description: "PRN 12 위성 신호 재획득(Re-acquisition) 성공: Jamming 전력이 감쇄됨에 따라 SW 고속 탐색 알고리즘이 동작하여 24.0초 시점에 반송파 동기를 재확보함.",
        status: "unreviewed",
        reviewNotes: "",
        contextData: getContextData(24.0, 12)
      },
      {
        id: "evt-5",
        testId: "test-trial-jamming",
        timestamp: 35.0,
        prn: 24,
        metricType: "doppler",
        severity: "warning",
        description: "순시 도플러 오차 도약(Cycle Slip) 발생: PRN 24의 반송파 추적 위상에서 순간적으로 280 Hz의 주파수 오차 도약이 발생하여 측정치 데이터 정합성 깨짐.",
        status: "unreviewed",
        reviewNotes: "",
        contextData: getContextData(35.0, 24)
      },
      {
        id: "evt-6",
        testId: "test-trial-jamming",
        timestamp: 45.0,
        prn: 999, // 999 stands for Position Anomaly (Combined)
        metricType: "position",
        severity: "critical",
        description: "의도적인 coherent Co-phase GPS 기만(Spoofing) 공격 수신 의심: 위치 오차가 42초 1.3m 수준에서 시작하여 지수 함수적으로 폭증하여 최대 142.5m 돌파. (가속도 오차 급증 동반)",
        status: "unreviewed",
        reviewNotes: "",
        contextData: getContextData(45.0, 24) // Show standard PRN 24 context
      }
    ];
  }
  
  return [];
}
