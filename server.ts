import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Create a shared Gemini client utility on the server with recommended User-Agent for AI Studio Build telemetry
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON parser with sufficient limit for uploading log data analyses
  app.use(express.json({ limit: "50mb" }));

  // AI-Powered Receiver Test Intelligence API
  app.post("/api/analyze-test", async (req, res) => {
    try {
      const { testMeta, metrics, anomalies, baselineComparison } = req.body;

      if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "MY_GEMINI_API_KEY") {
        return res.json({
          success: false,
          error: "GEMINI_API_KEY가 설정되지 않았습니다. AI 분석 기능을 사용하려면 'Settings > Secrets'에서 API 키를 등록해주세요.",
          analysis: `### 📡 GRTIP 시스템 수동 디버깅 피드백 (API 키 누락)

현재 AI 분석 엔진의 라이선스 키가 입력되지 않아 로컬 룰 베이스 분석 결과만 보존되었습니다.
'Settings > Secrets'에서 \`GEMINI_API_KEY\`를 입력해주시면 즉시 위성항법 전문 SW 수신기 신호처리 분석 및 파라미터 미세 조정 추천 가이드를 생성할 수 있습니다.

**[현재 기준 발견된 주요 문제 요약]**
1. **신호 레벨 불안정성**: 특정 위성(PRN ${anomalies.cn0DropSatellites || '일부 위성'})에서 C/N₀ 급격한 저하(최저 ${metrics.minCn0 || '22'} dB-Hz)가 확인되었습니다.
2. **추적 루프 요동**: 반송파 추적 루프(PLL) 판별기 출력이 임계치를 초과하여 Lock-Loss 및 재획득이 반복 발생했습니다.
3. **위치 오차 오버슈트**: 다중 위성 신호 장애로 인해 위치오차(CEP-95)가 기준 범위를 크게 벗어나 최대 ${metrics.maxPosError || '140'}m를 초과했습니다.
`
        });
      }

      const prompt = `
당신은 위성항법(GNSS) 수신기 설계 및 항법 신호처리 알고리즘(DSP) 분야의 세계 최고 권위자이자 수신기 SW 디버깅 전문가입니다.
다음은 위성항법 수신기 시험 중 획득된 성능 지표, 탐지된 이상 이벤트 및 과거 기준 시험(Baseline)과의 비교 데이터입니다.
이 정보를 철저히 분석하여 이상 현상의 정확한 물리적 원인(RF 노이즈, 다중경로, 스푸핑 기만 신호, 루프 필터 불안정 등)을 진단하고, 수신기 SW 알고리즘 수정 매개변수나 HW 대책을 구체적으로 제시하십시오.

### 1. 시험 메타데이터
- 프로젝트/시험명: ${testMeta.name}
- 시나리오: ${testMeta.scenario}
- 수신기 정보: ${testMeta.receiverInfo}
- SW 버전: ${testMeta.swVersion}
- HW/FPGA 버전: ${testMeta.hwVersion}

### 2. 주요 성능 지표 요약 (GNSS Performance Analysis)
${JSON.stringify(metrics, null, 2)}

### 3. 탐지된 이상 이벤트 목록 및 통계 (Rule-based Anomaly Report)
${JSON.stringify(anomalies, null, 2)}

### 4. 기준 시험(Baseline) 대비 성능 저하 및 차이 비교 (Baseline Comparison)
${JSON.stringify(baselineComparison, null, 2)}

### [요청 분석 항목]
다음 항목들을 포함하여 기술적으로 매우 상세하고 실무적인 분석 보고서를 작성해 주세요. 전문 용어(PLL/DLL/FLL, Lock-on, Carrier-to-Noise Ratio, Lock Detector, Loop Bandwidth Bn, Discriminator, Multipath mitigation, Spoofing detection 등)를 적극적으로 사용하되, 가독성을 위해 한글 마크다운 문서 형식으로 출력해 주십시오.

1. **이상 현상 원인 물리적 추정 (Anomalous Physical Root Cause Analysis)**
   - C/N0 급락, 도플러 도약, 루프 판별기 요동 및 위치 오차 급증 간의 시간적 상관관계를 분석하여, 이것이 단순 전파 감쇄(Attenuation), 다중경로(Multipath), 외부 Jamming 간섭, 의도적인 Spoofing 기만 신호, 혹은 수신기 내부 루프 필터 발산 알고리즘 결함인지 정확하게 규명하십시오.
2. **수신기 SW 알고리즘 미세조정(Tuning) 가이드**
   - 루프 노이즈 대역폭(Loop Noise Bandwidth, Bn), 상관기 간격(Correlator Spacing), 반송파 추적 루프(PLL) lock detector 임계값 제어, Cycle Slip 검출 상수 등 구체적인 SW 파라미터 조정안과 수신기 알고리즘 수정 가이드를 기술적으로 명시하십시오.
3. **추가 확인 및 하드웨어 점검 조치사항**
   - 안테나 이득, RF Front-end 결합, LNA 성능 저하 여부, 시뮬레이터 시나리오 확인 및 HW 디버깅 지침을 제안해 주십시오.
`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          temperature: 0.2,
        }
      });

      res.json({
        success: true,
        analysis: response.text
      });
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      res.status(500).json({
        success: false,
        error: error.message || "AI 분석 도중 오류가 발생했습니다."
      });
    }
  });

  // Serve static assets via Vite in Development or raw express serve in Production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite development middleware integrated successfully.");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Static files directory served in production mode.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`GRTIP Server is running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start GRTIP backend server:", err);
});
