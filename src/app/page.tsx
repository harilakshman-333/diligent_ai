"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Upload,
  FileText,
  FileSpreadsheet,
  X,
  BrainCircuit,
  TrendingUp,
  Shield,
  CheckCircle2,
  Zap,
  Clock,
  MessageCircle,
  Send,
  Bot,
  User,
  Sun,
  Moon,
  Monitor,
  Globe,
  Database,
  BarChart3,
  Search,
  Mail,
  RefreshCw,
  Inbox,
  AlertCircle,
  CheckCircle,
  Timer,
  Newspaper,
  ExternalLink,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Sparkles,
  Loader2,
  Activity,
  UserCheck,
  ShieldAlert,
  Building,
  Flag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

type UploadedFile = {
  file: File;
  name: string;
  type: "pdf" | "spreadsheet";
};

type SourceData = {
  pitchData: {
    companyName: string;
    sector: string;
    stage: string;
    mainCompetitors: string[];
    [key: string]: unknown;
  } | null;
  marketData: {
    competitors: Array<{
      ticker: string;
      companyName: string;
      currentPrice: number | null;
      marketCap: string;
      peRatio: string;
      sector: string;
      revenueGrowth: string;
      fiftyTwoWeekRange: string;
    }>;
    alphaVantageData: Array<{
      ticker: string;
      annualRevenue: string;
      annualNetIncome: string;
      quarterlyRevenueGrowth: string;
      earningsPerShare: string;
    }>;
  } | null;
  hasFinancials: boolean;
  founderIntel: FounderIntelData | null;
  legalScan: LegalScanData | null;
};

type LegalScanData = {
  ipFlags: Array<{
    issue: string;
    severity: "critical" | "warning" | "info";
    detail: string;
  }>;
  financialDiscrepancies: Array<{
    field: string;
    deckValue: string;
    spreadsheetValue: string;
    severity: "critical" | "warning" | "info";
    explanation: string;
  }>;
  capTableFlags: Array<{
    issue: string;
    severity: "critical" | "warning" | "info";
    detail: string;
  }>;
  missingDocuments: Array<{
    document: string;
    importance: "required" | "recommended" | "nice-to-have";
    reason: string;
  }>;
  overallRiskLevel: "low" | "medium" | "high";
  summary: string;
};

type FounderIntelData = {
  founders: Array<{
    name: string;
    linkedinSummary: string;
    priorVentures: string[];
    notableAchievements: string[];
    redFlags: string[];
    overallAssessment: "green" | "yellow" | "red";
  }>;
  companyCheck: {
    companiesHouse: string;
    secEdgar: string;
    incorporationStatus: string;
    filingFlags: string[];
  };
  adverseMedia: string[];
  inconsistencies: string[];
  overallRiskLevel: "low" | "medium" | "high";
  summary: string;
  sources: string[];
};

type Deal = {
  id: number;
  companyName: string;
  memo: string;
  verdict: string;
  timestamp: Date;
  mode: "full" | "pitch-only";
  chatHistory: ChatMessage[];
  sourceData: SourceData;
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type GmailScan = {
  id: string;
  timestamp: string;
  totalEmails: number;
  pitchDecksFound: number;
  analyzed: number;
  emails: Array<{
    uid: number;
    from: string;
    subject: string;
    date: string;
    hasPdf: boolean;
    pdfFilenames: string[];
    isPitch: boolean;
  }>;
  analyses: Array<{
    companyName: string;
    sender: string;
    subject: string;
    verdict: string;
    sector: string;
    summary: string;
  }>;
  status: "success" | "error";
  error?: string;
};

type GmailDeal = {
  filename: string;
  companyName: string;
  sender: string;
  sector: string;
  verdict: string;
  date: string;
  summary: string;
};

type ActiveTab = "memo" | "gmail" | "research" | "monitor";

type ResearchCompany = {
  name: string;
  ticker: string;
  price: number | null;
  change: string;
  changePercent: string;
  marketCap: string;
  peRatio: string;
  sector: string;
  fiftyTwoWeekRange: string;
  volume: string;
  avgVolume: string;
};

type ResearchNews = {
  id: string;
  title: string;
  summary: string;
  source: string;
  timestamp: string;
  url: string;
  category: "market" | "company" | "analysis" | "insight";
  sentiment: "positive" | "negative" | "neutral";
  ticker?: string;
};

type ResearchResult = {
  id: string;
  query: string;
  timestamp: string;
  companies: ResearchCompany[];
  news: ResearchNews[];
  aiSummary: string;
  status: "success" | "error";
  error?: string;
};

/* ===== MONITOR AI CANVAS COMPONENT ===== */
type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  nodeIdx: number; // which process node it orbits
};

type ProcessNode = {
  label: string;
  icon: string;
  x: number;
  y: number;
  color: string;
  glowColor: string;
  active: boolean;
  pulsePhase: number;
};

function MonitorAICanvas({
  isGenerating,
  isCrawling,
  isResearching,
  isChatting,
  autoScan,
  dealsCount,
  gmailScansCount,
  researchCount,
}: {
  isGenerating: boolean;
  isCrawling: boolean;
  isResearching: boolean;
  isChatting: boolean;
  autoScan: boolean;
  dealsCount: number;
  gmailScansCount: number;
  researchCount: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const nodesRef = useRef<ProcessNode[]>([]);
  const animFrameRef = useRef<number>(0);
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);

      // Recalculate node positions on resize
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const radius = Math.min(rect.width, rect.height) * 0.3;
      const nodeLabels = [
        { label: "Claude AI", icon: "🧠", color: "#8b5cf6", glowColor: "rgba(139,92,246,0.3)" },
        { label: "PDF Parser", icon: "📄", color: "#ef4444", glowColor: "rgba(239,68,68,0.3)" },
        { label: "Market Data", icon: "📊", color: "#3b82f6", glowColor: "rgba(59,130,246,0.3)" },
        { label: "Gmail Crawl", icon: "📧", color: "#10b981", glowColor: "rgba(16,185,129,0.3)" },
        { label: "Founder Intel", icon: "🔍", color: "#f43f5e", glowColor: "rgba(244,63,94,0.3)" },
        { label: "News Feed", icon: "📰", color: "#f59e0b", glowColor: "rgba(245,158,11,0.3)" },
        { label: "Chatbot", icon: "💬", color: "#06b6d4", glowColor: "rgba(6,182,212,0.3)" },
        { label: "Telegram", icon: "✈️", color: "#0ea5e9", glowColor: "rgba(14,165,233,0.3)" },
      ];

      nodesRef.current = nodeLabels.map((n, i) => {
        const angle = (i / nodeLabels.length) * Math.PI * 2 - Math.PI / 2;
        return {
          ...n,
          x: cx + Math.cos(angle) * radius,
          y: cy + Math.sin(angle) * radius,
          active: false,
          pulsePhase: Math.random() * Math.PI * 2,
        };
      });
    };

    resize();
    window.addEventListener("resize", resize);

    // Initialize particles
    const rect = canvas.getBoundingClientRect();
    particlesRef.current = [];
    for (let i = 0; i < 120; i++) {
      const nodeIdx = Math.floor(Math.random() * 8);
      particlesRef.current.push({
        x: Math.random() * rect.width,
        y: Math.random() * rect.height,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        size: Math.random() * 3 + 1.5,
        color: ["#8b5cf6", "#3b82f6", "#10b981", "#f43f5e", "#f59e0b", "#06b6d4", "#ef4444", "#0ea5e9"][nodeIdx],
        alpha: Math.random() * 0.6 + 0.2,
        life: Math.random() * 300,
        maxLife: 300 + Math.random() * 200,
        nodeIdx,
      });
    }

    const animate = () => {
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      timeRef.current += 0.016;
      const t = timeRef.current;

      ctx.clearRect(0, 0, w, h);

      // Draw subtle grid
      ctx.strokeStyle = "rgba(100, 130, 200, 0.04)";
      ctx.lineWidth = 1;
      const gridSize = 50;
      for (let x = 0; x < w; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      const nodes = nodesRef.current;
      const cx = w / 2;
      const cy = h / 2;

      // Draw connections between nodes (data flow lines)
      for (let i = 0; i < nodes.length; i++) {
        // Connect each node to center hub
        const grad = ctx.createLinearGradient(nodes[i].x, nodes[i].y, cx, cy);
        grad.addColorStop(0, nodes[i].color + "30");
        grad.addColorStop(1, "rgba(139,92,246,0.05)");
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(nodes[i].x, nodes[i].y);
        ctx.lineTo(cx, cy);
        ctx.stroke();

        // Connect to next neighbor
        const next = nodes[(i + 1) % nodes.length];
        const lineAlpha = 0.08 + Math.sin(t * 2 + i) * 0.04;
        ctx.strokeStyle = `rgba(140, 160, 220, ${lineAlpha})`;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(nodes[i].x, nodes[i].y);
        ctx.lineTo(next.x, next.y);
        ctx.stroke();
      }

      // Draw center hub
      const hubPulse = 1 + Math.sin(t * 3) * 0.15;
      const hubGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 55 * hubPulse);
      hubGlow.addColorStop(0, "rgba(139,92,246,0.25)");
      hubGlow.addColorStop(0.5, "rgba(139,92,246,0.08)");
      hubGlow.addColorStop(1, "rgba(139,92,246,0)");
      ctx.fillStyle = hubGlow;
      ctx.beginPath();
      ctx.arc(cx, cy, 55 * hubPulse, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "rgba(139,92,246,0.15)";
      ctx.beginPath();
      ctx.arc(cx, cy, 32, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "rgba(139,92,246,0.4)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, 32, 0, Math.PI * 2);
      ctx.stroke();

      ctx.font = "24px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("⚡", cx, cy);

      ctx.font = "bold 11px sans-serif";
      ctx.fillStyle = "rgba(139,92,246,0.8)";
      ctx.fillText("DILIGENT-AI", cx, cy + 46);

      // Draw process nodes
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const pulse = 1 + Math.sin(t * 2.5 + node.pulsePhase) * 0.12;
        const nodeRadius = 28 * pulse;

        // Glow
        const glow = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, nodeRadius * 1.8);
        glow.addColorStop(0, node.active ? node.glowColor : node.glowColor.replace("0.3", "0.1"));
        glow.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(node.x, node.y, nodeRadius * 1.8, 0, Math.PI * 2);
        ctx.fill();

        // Circle bg
        ctx.fillStyle = node.active
          ? node.color + "25"
          : "rgba(30, 40, 70, 0.4)";
        ctx.beginPath();
        ctx.arc(node.x, node.y, nodeRadius, 0, Math.PI * 2);
        ctx.fill();

        // Border
        ctx.strokeStyle = node.active
          ? node.color + "80"
          : node.color + "30";
        ctx.lineWidth = node.active ? 2.5 : 1.5;
        ctx.beginPath();
        ctx.arc(node.x, node.y, nodeRadius, 0, Math.PI * 2);
        ctx.stroke();

        // Spinning arc for active nodes
        if (node.active) {
          ctx.strokeStyle = node.color + "90";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(node.x, node.y, nodeRadius + 6, t * 3 + i, t * 3 + i + Math.PI * 0.6);
          ctx.stroke();
        }

        // Icon
        ctx.font = "20px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(node.icon, node.x, node.y);

        // Label
        ctx.font = "bold 11px sans-serif";
        ctx.fillStyle = node.active
          ? node.color
          : "rgba(160, 170, 200, 0.6)";
        ctx.fillText(node.label, node.x, node.y + nodeRadius + 16);
      }

      // Update and draw particles
      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        const targetNode = nodes[p.nodeIdx];
        if (targetNode) {
          // Slight gravitational pull toward their node
          const dx = targetNode.x - p.x;
          const dy = targetNode.y - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 60) {
            p.vx += (dx / dist) * 0.03;
            p.vy += (dy / dist) * 0.03;
          } else if (dist < 30) {
            // Repel if too close
            p.vx -= (dx / dist) * 0.05;
            p.vy -= (dy / dist) * 0.05;
          }
          // Also pull toward center hub sometimes
          const cdx = cx - p.x;
          const cdy = cy - p.y;
          const cdist = Math.sqrt(cdx * cdx + cdy * cdy);
          p.vx += (cdx / cdist) * 0.005;
          p.vy += (cdy / cdist) * 0.005;
        }

        // Damping
        p.vx *= 0.99;
        p.vy *= 0.99;
        p.x += p.vx;
        p.y += p.vy;
        p.life++;

        // Wrap around
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;
        if (p.y < -10) p.y = h + 10;
        if (p.y > h + 10) p.y = -10;

        // Respawn if expired
        if (p.life > p.maxLife) {
          p.life = 0;
          p.nodeIdx = Math.floor(Math.random() * 8);
          p.color = ["#8b5cf6", "#3b82f6", "#10b981", "#f43f5e", "#f59e0b", "#06b6d4", "#ef4444", "#0ea5e9"][p.nodeIdx];
          p.x = nodes[p.nodeIdx]?.x || Math.random() * w;
          p.y = nodes[p.nodeIdx]?.y || Math.random() * h;
          p.vx = (Math.random() - 0.5) * 2;
          p.vy = (Math.random() - 0.5) * 2;
        }

        const fadeIn = Math.min(p.life / 30, 1);
        const fadeOut = Math.max((p.maxLife - p.life) / 30, 0);
        const alpha = p.alpha * Math.min(fadeIn, fadeOut);

        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Draw traveling data packets along connections
      for (let i = 0; i < nodes.length; i++) {
        if (!nodes[i].active) continue;
        const progress = (t * 0.5 + i * 0.3) % 1;
        const px = nodes[i].x + (cx - nodes[i].x) * progress;
        const py = nodes[i].y + (cy - nodes[i].y) * progress;

        ctx.fillStyle = nodes[i].color;
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.arc(px, py, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.arc(px, py, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  // Update node active states reactively
  useEffect(() => {
    const nodes = nodesRef.current;
    if (nodes.length < 8) return;
    nodes[0].active = isGenerating || isChatting; // Claude AI
    nodes[1].active = isGenerating; // PDF Parser
    nodes[2].active = isGenerating || isResearching; // Market Data
    nodes[3].active = isCrawling || autoScan; // Gmail Crawl
    nodes[4].active = isGenerating; // Founder Intel
    nodes[5].active = isResearching; // News Feed
    nodes[6].active = isChatting; // Chatbot
    nodes[7].active = autoScan; // Telegram
  }, [isGenerating, isCrawling, isResearching, isChatting, autoScan]);

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
      />
      {/* Status overlay cards */}
      <div className="absolute bottom-6 left-6 right-6 flex gap-4 pointer-events-none">
        <div className="rounded-xl border border-violet-500/20 bg-background/80 backdrop-blur-md px-5 py-4 flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className={`h-3 w-3 rounded-full ${isGenerating ? "bg-violet-400 animate-pulse" : "bg-violet-400/30"}`} />
            <span className="text-base font-semibold">Memo Engine</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {isGenerating ? "Generating analysis..." : `${dealsCount} deal${dealsCount !== 1 ? "s" : ""} analyzed`}
          </p>
        </div>
        <div className="rounded-xl border border-emerald-500/20 bg-background/80 backdrop-blur-md px-5 py-4 flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className={`h-3 w-3 rounded-full ${isCrawling ? "bg-emerald-400 animate-pulse" : autoScan ? "bg-emerald-400/60 animate-pulse" : "bg-emerald-400/30"}`} />
            <span className="text-base font-semibold">Gmail Agent</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {isCrawling ? "Scanning inbox..." : autoScan ? `Auto-scan ON · ${gmailScansCount} scans` : `${gmailScansCount} scan${gmailScansCount !== 1 ? "s" : ""} completed`}
          </p>
        </div>
        <div className="rounded-xl border border-blue-500/20 bg-background/80 backdrop-blur-md px-5 py-4 flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className={`h-3 w-3 rounded-full ${isResearching ? "bg-blue-400 animate-pulse" : "bg-blue-400/30"}`} />
            <span className="text-base font-semibold">Research Feed</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {isResearching ? "Querying sources..." : `${researchCount} search${researchCount !== 1 ? "es" : ""} cached`}
          </p>
        </div>
        <div className="rounded-xl border border-cyan-500/20 bg-background/80 backdrop-blur-md px-5 py-4 flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className={`h-3 w-3 rounded-full ${isChatting ? "bg-cyan-400 animate-pulse" : "bg-cyan-400/30"}`} />
            <span className="text-base font-semibold">Live Chatbot</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {isChatting ? "Thinking..." : "Ready for questions"}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [pdfFile, setPdfFile] = useState<UploadedFile | null>(null);
  const [spreadsheetFile, setSpreadsheetFile] = useState<UploadedFile | null>(
    null
  );
  const [deals, setDeals] = useState<Deal[]>([]);
  const [activeDealIndex, setActiveDealIndex] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [isChatting, setIsChatting] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark" | "system">("dark");
  const [activeTab, setActiveTab] = useState<ActiveTab>("memo");
  const [isCrawling, setIsCrawling] = useState(false);
  const [gmailScans, setGmailScans] = useState<GmailScan[]>([]);
  const [gmailDeals, setGmailDeals] = useState<GmailDeal[]>([]);
  const [gmailConfigured, setGmailConfigured] = useState(false);
  const [gmailUser, setGmailUser] = useState<string | null>(null);
  const [activeScanIndex, setActiveScanIndex] = useState<number | null>(null);
  const [autoScan, setAutoScan] = useState(false);
  const autoScanRef = useRef(false);
  const isCrawlingRef = useRef(false);

  // Stay Tuned / Research state
  const [researchQuery, setResearchQuery] = useState("");
  const [isResearching, setIsResearching] = useState(false);
  const [researchResults, setResearchResults] = useState<ResearchResult[]>([]);
  const [activeResearchIndex, setActiveResearchIndex] = useState<number | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [generalChatHistory, setGeneralChatHistory] = useState<ChatMessage[]>([]);

  // Keep refs in sync so the interval callback sees latest values
  useEffect(() => { autoScanRef.current = autoScan; }, [autoScan]);
  useEffect(() => { isCrawlingRef.current = isCrawling; }, [isCrawling]);

  useEffect(() => {
    const saved = localStorage.getItem("theme") as "light" | "dark" | "system" | null;
    if (saved) setTheme(saved);
    else setTheme("system");
  }, []);

  useEffect(() => {
    const apply = (mode: "light" | "dark" | "system") => {
      if (mode === "dark") {
        document.documentElement.classList.add("dark");
      } else if (mode === "light") {
        document.documentElement.classList.remove("dark");
      } else {
        if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
      }
      localStorage.setItem("theme", mode);
    };
    apply(theme);

    if (theme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = () => apply("system");
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }
  }, [theme]);

  // Load Gmail history on mount and when switching to Gmail tab
  const loadGmailHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/openclaw/history");
      if (res.ok) {
        const data = await res.json();
        setGmailScans(data.scans || []);
        setGmailDeals(data.deals || []);
        setGmailConfigured(data.gmailConfigured || false);
        setGmailUser(data.gmailUser || null);
      }
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    if (activeTab === "gmail") {
      loadGmailHistory();
    }
  }, [activeTab, loadGmailHistory]);

  // Auto-scan Gmail every 2 minutes
  useEffect(() => {
    if (!autoScan || !gmailConfigured) return;
    const intervalId = setInterval(async () => {
      if (!autoScanRef.current || isCrawlingRef.current) return;
      try {
        isCrawlingRef.current = true;
        setIsCrawling(true);
        const res = await fetch("/api/openclaw/crawl", { method: "POST" });
        const data = await res.json();
        setGmailScans((prev) => [data, ...prev]);
        setActiveScanIndex(0);
        await loadGmailHistory();
      } catch {
        // silently fail
      } finally {
        setIsCrawling(false);
        isCrawlingRef.current = false;
      }
    }, 2 * 60 * 1000); // 2 minutes
    return () => clearInterval(intervalId);
  }, [autoScan, gmailConfigured, loadGmailHistory]);

  const handleGmailCrawl = async () => {
    if (isCrawling) return;
    setIsCrawling(true);
    try {
      const res = await fetch("/api/openclaw/crawl", { method: "POST" });
      const data = await res.json();
      // Prepend new scan to history
      setGmailScans((prev) => [data, ...prev]);
      setActiveScanIndex(0);
      // Reload full history to get updated deals
      await loadGmailHistory();
    } catch {
      // handle error
    } finally {
      setIsCrawling(false);
    }
  };

  const handleResearch = async () => {
    if (!researchQuery.trim() || isResearching) return;
    setIsResearching(true);
    try {
      const res = await fetch("/api/openclaw/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: researchQuery.trim() }),
      });
      const data = await res.json();
      setResearchResults((prev) => [data, ...prev]);
      setActiveResearchIndex(0);
      setResearchQuery("");
    } catch {
      // silently fail
    } finally {
      setIsResearching(false);
    }
  };

  const activeDeal = activeDealIndex !== null ? deals[activeDealIndex] : null;
  const activeMemo = activeDeal?.memo ?? null;

  const handleChat = async () => {
    if (!chatInput.trim() || isChatting) return;

    const userMessage = chatInput.trim();
    setChatInput("");
    setIsChatting(true);

    const isDealChat = !!activeDeal && !!activeMemo;

    // Add user message immediately
    if (isDealChat) {
      setDeals((prev) =>
        prev.map((deal, i) =>
          i === activeDealIndex
            ? { ...deal, chatHistory: [...deal.chatHistory, { role: "user" as const, content: userMessage }] }
            : deal
        )
      );
    } else {
      setGeneralChatHistory((prev) => [...prev, { role: "user" as const, content: userMessage }]);
    }

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          ...(isDealChat
            ? {
                memo: activeDeal!.memo,
                companyName: activeDeal!.companyName,
                history: activeDeal!.chatHistory,
              }
            : {
                history: generalChatHistory,
              }),
        }),
      });

      const data = await res.json();
      const reply = res.ok
        ? (data.reply || "Sorry, I couldn't generate a response.")
        : (data.error || "Sorry, something went wrong. Please try again.");

      if (isDealChat) {
        setDeals((prev) =>
          prev.map((deal, i) =>
            i === activeDealIndex
              ? { ...deal, chatHistory: [...deal.chatHistory, { role: "assistant" as const, content: reply }] }
              : deal
          )
        );
      } else {
        setGeneralChatHistory((prev) => [...prev, { role: "assistant" as const, content: reply }]);
      }
    } catch {
      const errorMsg = "Network error. Please try again.";
      if (isDealChat) {
        setDeals((prev) =>
          prev.map((deal, i) =>
            i === activeDealIndex
              ? { ...deal, chatHistory: [...deal.chatHistory, { role: "assistant" as const, content: errorMsg }] }
              : deal
          )
        );
      } else {
        setGeneralChatHistory((prev) => [...prev, { role: "assistant" as const, content: errorMsg }]);
      }
    } finally {
      setIsChatting(false);
    }
  };

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>, type: "pdf" | "spreadsheet") => {
      e.preventDefault();
      e.stopPropagation();

      const droppedFile = e.dataTransfer.files[0];
      if (!droppedFile) return;

      if (type === "pdf" && droppedFile.type !== "application/pdf") return;
      if (
        type === "spreadsheet" &&
        !droppedFile.name.match(/\.(csv|xlsx?|xls)$/i)
      )
        return;

      const uploaded: UploadedFile = {
        file: droppedFile,
        name: droppedFile.name,
        type,
      };

      if (type === "pdf") setPdfFile(uploaded);
      else setSpreadsheetFile(uploaded);
    },
    []
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>, type: "pdf" | "spreadsheet") => {
      const selectedFile = e.target.files?.[0];
      if (!selectedFile) return;

      const uploaded: UploadedFile = {
        file: selectedFile,
        name: selectedFile.name,
        type,
      };

      if (type === "pdf") setPdfFile(uploaded);
      else setSpreadsheetFile(uploaded);
    },
    []
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleGenerate = async () => {
    if (!pdfFile) return;
    setIsGenerating(true);
    setActiveDealIndex(null);

    try {
      const formData = new FormData();
      formData.append("pitchDeck", pdfFile.file);
      if (spreadsheetFile) {
        formData.append("financials", spreadsheetFile.file);
      } else {
        formData.append("mode", "pitch-only");
      }

      const res = await fetch("/api/generate-memo", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        const errorMemo = `## Error\n\n${data.error || "Failed to generate memo."}`;
        const newDeal: Deal = {
          id: Date.now(),
          companyName: pdfFile.name.replace(/\.pdf$/i, ""),
          memo: errorMemo,
          verdict: "ERROR",
          timestamp: new Date(),
          mode: spreadsheetFile ? "full" : "pitch-only",
          chatHistory: [],
          sourceData: { pitchData: null, marketData: null, hasFinancials: false, founderIntel: null, legalScan: null },
        };
        setDeals((prev) => [...prev, newDeal]);
        setActiveDealIndex(deals.length);
      } else {
        // Extract company name and verdict from the memo
        const companyMatch = data.memo.match(/^#\s+(?:Investment Memo|Quick Memo):\s*(.+)/m);
        const verdictMatch = data.memo.match(/\b(STRONG BUY|BUY|HOLD|PASS)\b/);
        const newDeal: Deal = {
          id: Date.now(),
          companyName: companyMatch?.[1]?.trim() || data.pitchData?.companyName || pdfFile.name.replace(/\.pdf$/i, ""),
          memo: data.memo,
          verdict: verdictMatch?.[1] || "ANALYZED",
          timestamp: new Date(),
          mode: data.mode || (spreadsheetFile ? "full" : "pitch-only"),
          chatHistory: [],
          sourceData: {
            pitchData: data.pitchData || null,
            marketData: data.marketData || null,
            hasFinancials: !!data.financials,
            founderIntel: data.founderIntel || null,
            legalScan: data.legalScan || null,
          },
        };
        setDeals((prev) => [...prev, newDeal]);
        setActiveDealIndex(deals.length);
      }

      // Clear files for next deal
      setPdfFile(null);
      setSpreadsheetFile(null);
    } catch {
      const errorMemo = "## Error\n\nNetwork error. Please try again.";
      const newDeal: Deal = {
        id: Date.now(),
        companyName: pdfFile.name.replace(/\.pdf$/i, ""),
        memo: errorMemo,
        verdict: "ERROR",
        timestamp: new Date(),
        mode: spreadsheetFile ? "full" : "pitch-only",
        chatHistory: [],
        sourceData: { pitchData: null, marketData: null, hasFinancials: false, founderIntel: null, legalScan: null },
      };
      setDeals((prev) => [...prev, newDeal]);
      setActiveDealIndex(deals.length);
      setPdfFile(null);
      setSpreadsheetFile(null);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background font-sans text-base">
      {/* ===== TOP BAR ===== */}
      <header className="flex h-[72px] shrink-0 items-center justify-between border-b border-border/20 panel px-8 z-10 relative">
        <div className="flex items-center gap-4">
          {/* Logo mark */}
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-blue-600 shadow-[0_0_20px_rgba(124,58,237,0.3)]">
            <BrainCircuit className="h-7 w-7 text-white" />
          </div>
          <div className="flex items-baseline gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Diligent<span className="gradient-text">-AI</span>
            </h1>
            <span className="font-mono text-xs font-semibold uppercase tracking-widest text-[#a78bfa] hidden sm:inline ml-2">VC Analyst</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* Theme Toggle — icon only */}
          <div className="flex items-center rounded-full border border-border/30 bg-muted/10 p-1 gap-0.5">
            {[
              { mode: "light" as const, icon: Sun },
              { mode: "system" as const, icon: Monitor },
              { mode: "dark" as const, icon: Moon },
            ].map(({ mode, icon: Icon }) => (
              <button
                key={mode}
                onClick={() => setTheme(mode)}
                title={mode.charAt(0).toUpperCase() + mode.slice(1)}
                className={`flex items-center justify-center rounded-full p-2 transition-all ${
                  theme === mode
                    ? "bg-primary/90 text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                }`}
              >
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>
          <div className="h-5 w-px bg-border/40" />
          <div className="flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/8 px-3 py-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="text-sm font-medium text-emerald-400">Live Data</span>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-violet-500/25 bg-violet-500/8 px-3 py-1.5">
            <Zap className="h-3.5 w-3.5 text-violet-400" />
            <span className="text-sm font-medium text-violet-400">Claude Sonnet</span>
          </div>
        </div>
      </header>

      {/* ===== 3-PANEL LAYOUT ===== */}
      <div className="flex flex-1 overflow-hidden">

        {/* ===== LEFT SIDEBAR: Upload + Deal History ===== */}
        <aside className="flex w-[380px] shrink-0 flex-col border-r border-border/20 panel z-0">
          {/* Upload Section */}
          <div className="flex-1 overflow-y-auto p-6 space-y-0">

            {/* ── SECTION: Pitch Deck ── */}
            <div className="pb-6">
              <h3 className="text-sm font-bold uppercase tracking-widest text-[#a78bfa] mb-4 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Pitch Deck
              </h3>
              {pdfFile ? (
                <div className="flex items-center justify-between rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-4 backdrop-blur-md">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/20">
                      <FileText className="h-5 w-5 text-red-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate">{pdfFile.name}</p>
                      <p className="text-xs text-red-200/70">Pitch Deck · PDF</p>
                    </div>
                  </div>
                  <button onClick={() => setPdfFile(null)} className="shrink-0 rounded-lg p-2 text-muted-foreground hover:bg-red-500/20 hover:text-white transition-colors">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div
                  onDrop={(e) => handleDrop(e, "pdf")}
                  onDragOver={handleDragOver}
                  className="drop-zone flex flex-col items-center justify-center px-5 py-12 cursor-pointer"
                >
                  <Upload className="mb-4 h-8 w-8 text-[#6b7fa3] transition-colors group-hover:text-[#a78bfa]" />
                  <p className="text-base font-semibold text-[#e8eaf2]">Drop pitch deck PDF</p>
                  <label className="mt-2 block cursor-pointer text-sm font-bold text-[#a78bfa] hover:underline">
                    or browse files
                    <input type="file" accept=".pdf" className="hidden" onChange={(e) => handleFileSelect(e, "pdf")} />
                  </label>
                </div>
              )}
            </div>

            {/* ── DIVIDER ── */}
            <div className="border-t border-border/20 my-2" />

            {/* ── SECTION: Financials ── */}
            <div className="py-6">
              <h3 className="text-sm font-bold uppercase tracking-widest text-[#a78bfa] mb-4 flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                Financials
              </h3>
              {spreadsheetFile ? (
                <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-4 backdrop-blur-md">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20">
                      <FileSpreadsheet className="h-5 w-5 text-emerald-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate">{spreadsheetFile.name}</p>
                      <p className="text-xs text-emerald-200/70">Financials · CSV/Excel</p>
                    </div>
                  </div>
                  <button onClick={() => setSpreadsheetFile(null)} className="shrink-0 rounded-lg p-2 text-muted-foreground hover:bg-emerald-500/20 hover:text-white transition-colors">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div
                  onDrop={(e) => handleDrop(e, "spreadsheet")}
                  onDragOver={handleDragOver}
                  className="drop-zone flex flex-col items-center justify-center px-5 py-10 cursor-pointer"
                >
                  <Upload className="mb-4 h-8 w-8 text-[#6b7fa3] transition-colors group-hover:text-emerald-400" />
                  <p className="text-base font-semibold text-[#e8eaf2]">Drop CSV / Excel</p>
                  <label className="mt-2 block cursor-pointer text-sm font-bold text-emerald-400 hover:underline">
                    or browse files
                    <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={(e) => handleFileSelect(e, "spreadsheet")} />
                  </label>
                </div>
              )}
            </div>

            {/* ── DIVIDER ── */}
            <div className="border-t border-border/20 my-2" />

            {/* ── SECTION: Generate ── */}
            <div className="py-6">
              <h3 className="text-sm font-bold uppercase tracking-widest text-[#a78bfa] mb-4 flex items-center gap-2">
                <BrainCircuit className="h-4 w-4" />
                Analyze
              </h3>
              <button
                className={`w-full py-4 text-lg flex items-center justify-center gap-3 ${
                  !pdfFile || isGenerating
                    ? "rounded-xl border border-border/30 bg-muted/20 text-muted-foreground/50 cursor-not-allowed"
                    : "btn-gradient"
                }`}
                disabled={!pdfFile || isGenerating}
                onClick={handleGenerate}
              >
                {isGenerating ? (
                  <>
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Generating AI Memo...
                  </>
                ) : (
                  <>
                    <BrainCircuit className="h-5 w-5" />
                    {spreadsheetFile ? "Full Analysis" : pdfFile ? "Quick Analysis" : "Generate Memo"}
                  </>
                )}
              </button>

              {pdfFile && !isGenerating && !activeMemo && (
                <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-3 mt-4 backdrop-blur-sm">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
                  <p className="text-sm font-semibold text-emerald-400">
                    {spreadsheetFile ? "Ready for full analysis" : "Ready — add CSV for full memo"}
                  </p>
                </div>
              )}
            </div>

            {/* ── SECTION: Deal History ── */}
            {deals.length > 0 && (
              <>
                {/* ── DIVIDER ── */}
                <div className="border-t border-border/20 my-0" />

                <div className="py-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5" />
                      Deals
                    </h3>
                    <span className="rounded-full border border-border/30 bg-muted/20 px-2 py-0.5 text-xs font-semibold text-muted-foreground">{deals.length}</span>
                  </div>
                  <div className="space-y-2">
                    {deals.map((deal, index) => (
                      <button
                        key={deal.id}
                        onClick={() => setActiveDealIndex(index)}
                        className={`w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all hover:bg-muted/20 ${
                          activeDealIndex === index
                            ? "border-violet-500/30 bg-violet-500/8"
                            : "border-border/15 bg-transparent"
                        }`}
                      >
                        {/* Verdict accent bar */}
                        <div className={`h-8 w-1 shrink-0 rounded-full ${
                          deal.verdict === "STRONG BUY" ? "bg-emerald-400"
                            : deal.verdict === "BUY" ? "bg-green-400"
                            : deal.verdict === "HOLD" ? "bg-amber-400"
                            : deal.verdict === "PASS" ? "bg-red-400"
                            : "bg-muted-foreground/30"
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{deal.companyName}</p>
                          <p className="text-xs text-muted-foreground">
                            {deal.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {deal.mode === "full" ? "Full" : "Pitch"}
                          </p>
                        </div>
                        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-bold ${
                          deal.verdict === "STRONG BUY" ? "border-emerald-500/40 text-emerald-400"
                            : deal.verdict === "BUY" ? "border-green-500/40 text-green-400"
                            : deal.verdict === "HOLD" ? "border-amber-500/40 text-amber-400"
                            : deal.verdict === "PASS" ? "border-red-500/40 text-red-400"
                            : "border-border/40 text-muted-foreground"
                        }`}>
                          {deal.verdict}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Sidebar Footer */}
          <div className="border-t border-border/20 px-6 py-3">
            <p className="text-xs text-muted-foreground/30 text-center tracking-wider">Edinburgh AI Hackathon 2026</p>
          </div>
        </aside>

        {/* ===== CENTER: Tabbed Content ===== */}
        <main className="flex flex-1 flex-col overflow-hidden relative z-0">
          
          {/* Tab Bar Container */}
          <div className="panel border-x-0 border-t-0 bg-background/50 backdrop-blur-xl">
            {/* Tabs */}
            <div className="flex items-center gap-2 px-8 pt-5 pb-1">
              <button
                onClick={() => setActiveTab("memo")}
                className={`flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-full transition-all ${
                  activeTab === "memo"
                    ? "tab-active"
                    : "tab-inactive"
                }`}
              >
                <FileText className="h-4 w-4" />
                Investment Memo
              </button>
              <button
                onClick={() => setActiveTab("gmail")}
                className={`flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-full transition-all ${
                  activeTab === "gmail"
                    ? "tab-active"
                    : "tab-inactive"
                }`}
              >
                <Mail className="h-4 w-4" />
                Gmail Updates
                {gmailScans.length > 0 && (
                  <span className="ml-1 rounded-full bg-blue-500/20 px-2 py-0.5 text-[11px] font-black text-blue-400">{gmailScans.length}</span>
                )}
              </button>
              <button
                onClick={() => setActiveTab("research")}
                className={`flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-full transition-all ${
                  activeTab === "research"
                    ? "tab-active"
                    : "tab-inactive"
                }`}
              >
                <Newspaper className="h-4 w-4" />
                Stay Tuned
                {researchResults.length > 0 && (
                  <span className="ml-1 rounded-full bg-blue-500/20 px-2 py-0.5 text-[11px] font-black text-blue-400">{researchResults.length}</span>
                )}
              </button>
              <button
                onClick={() => setActiveTab("monitor")}
                className={`flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-full transition-all ${
                  activeTab === "monitor"
                    ? "tab-active"
                    : "tab-inactive"
                }`}
              >
                <Activity className="h-4 w-4" />
                Monitor AI
              </button>
            </div>

            {/* Contextual Header */}
            <div className="flex items-center justify-between px-6 py-3">
              {activeTab === "memo" ? (
                <>
                  <div>
                    <h2 className="text-lg font-bold tracking-tight">
                      {activeDeal ? activeDeal.companyName : "Investment Memo"}
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {activeDeal
                        ? `${activeDeal.verdict} · ${activeDeal.mode === "full" ? "Full Analysis" : "Pitch-Only"}`
                        : "Upload a pitch deck to generate a memo"}
                    </p>
                  </div>
                  {deals.length > 0 && !isGenerating && (
                    <span className="text-xs font-semibold text-muted-foreground/60 border border-border/20 rounded-full px-2.5 py-1">
                      {deals.length} deal{deals.length !== 1 ? "s" : ""}
                    </span>
                  )}
                </>
              ) : activeTab === "research" ? (
                <>
                  <div>
                    <h2 className="text-lg font-bold tracking-tight">Stay Tuned</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Live market data &amp; news for any company or topic</p>
                  </div>
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-violet-400 border border-violet-500/20 rounded-full px-2.5 py-1">
                    <Sparkles className="h-3 w-3" />
                    {researchResults.length} search{researchResults.length !== 1 ? "es" : ""}
                  </span>
                </>
              ) : activeTab === "monitor" ? (
                <>
                  <div>
                    <h2 className="text-lg font-bold tracking-tight">Monitor AI</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Live view of AI agents &amp; background processes</p>
                  </div>
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-cyan-400 border border-cyan-500/20 rounded-full px-2.5 py-1">
                    <Activity className="h-3 w-3 animate-pulse" />
                    Live
                  </span>
                </>
              ) : (
                <>
                  <div>
                    <h2 className="text-lg font-bold tracking-tight">Gmail Updates</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {gmailConfigured
                        ? `Connected as ${gmailUser} · ${gmailDeals.length} deals found`
                        : "Configure Gmail in .env.local to enable inbox crawling"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                        isCrawling || !gmailConfigured
                          ? "bg-muted/20 text-muted-foreground/40 cursor-not-allowed"
                          : "bg-gradient-to-r from-violet-600 to-blue-600 text-white hover:scale-[1.02] active:scale-[0.98] shadow-md shadow-violet-500/20"
                      }`}
                      disabled={isCrawling || !gmailConfigured}
                      onClick={handleGmailCrawl}
                    >
                      {isCrawling ? (
                        <><RefreshCw className="h-3.5 w-3.5 animate-spin" />Scanning...</>
                      ) : (
                        <><Inbox className="h-3.5 w-3.5" />Scan Now</>
                      )}
                    </button>
                    <button
                      className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition-all ${
                        autoScan
                          ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                          : "border-border/30 text-muted-foreground hover:bg-muted/20"
                      } ${!gmailConfigured ? "opacity-40 cursor-not-allowed" : ""}`}
                      disabled={!gmailConfigured}
                      onClick={() => setAutoScan((prev) => !prev)}
                    >
                      <Timer className={`h-3.5 w-3.5 ${autoScan ? "animate-pulse" : ""}`} />
                      {autoScan ? "Auto: ON" : "Auto: OFF"}
                    </button>
                    {autoScan && (
                      <span className="text-[10px] text-emerald-400 font-medium">every 2 min</span>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Memo Content */}
          {activeTab === "memo" && (
          <div className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-4xl px-10 py-10">
              {activeMemo ? (
                <>
                <article className="prose dark:prose-invert prose-base max-w-none prose-headings:font-bold prose-headings:text-white prose-h1:text-4xl prose-h1:border-b prose-h1:border-border/30 prose-h1:pb-5 prose-h1:mb-8 prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-5 prose-h3:text-xl prose-p:text-base prose-p:leading-relaxed prose-p:text-[#e8eaf2] prose-li:text-base prose-li:text-[#e8eaf2] prose-strong:text-white prose-table:text-sm prose-th:text-left prose-th:p-4 prose-th:bg-white/5 prose-td:p-4 prose-td:border-t prose-td:border-white/10 prose-hr:border-white/10 prose-blockquote:border-l-[#a78bfa] prose-blockquote:bg-white/5 prose-blockquote:py-2 prose-blockquote:px-8 prose-blockquote:rounded-r-lg prose-code:bg-white/10 prose-code:px-2 prose-code:py-1 prose-code:rounded prose-code:text-sm prose-code:font-mono">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {activeMemo}
                  </ReactMarkdown>
                </article>

                {/* ===== DATA SOURCES SECTION ===== */}
                {activeDeal?.sourceData && (
                  <div className="mt-16 border-t-2 border-border/30 pt-10">
                    <h2 className="text-2xl font-bold tracking-tight flex items-center gap-3 mb-8">
                      <Search className="h-7 w-7 text-violet-400" />
                      Data Sources & Research
                    </h2>
                    <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                      Below is a summary of the external data we queried to inform the analysis above.
                    </p>

                    <div className="grid gap-6">

                      {/* Claude AI - Pitch Deck Parsing */}
                      <div className="rounded-xl panel p-6">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/20 shadow-[0_0_15px_rgba(139,92,246,0.2)]">
                            <BrainCircuit className="h-6 w-6 text-violet-400" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-white">Claude AI — Pitch Deck Analysis</h3>
                            <p className="text-sm text-[#8b9fc4]">Extracted structured data from the uploaded PDF</p>
                          </div>
                        </div>
                        {activeDeal.sourceData.pitchData ? (
                          <div className="grid grid-cols-2 gap-4 mt-5">
                            <div className="rounded-xl bg-black/20 border border-white/5 px-5 py-4">
                              <p className="text-sm font-medium text-[#8b9fc4]">Company</p>
                              <p className="text-lg font-bold text-white mt-1">{activeDeal.sourceData.pitchData.companyName}</p>
                            </div>
                            <div className="rounded-xl bg-black/20 border border-white/5 px-5 py-4">
                              <p className="text-sm font-medium text-[#8b9fc4]">Sector</p>
                              <p className="text-lg font-bold text-white mt-1">{activeDeal.sourceData.pitchData.sector || "N/A"}</p>
                            </div>
                            <div className="rounded-xl bg-black/20 border border-white/5 px-5 py-4">
                              <p className="text-sm font-medium text-[#8b9fc4]">Stage</p>
                              <p className="text-lg font-bold text-white mt-1">{activeDeal.sourceData.pitchData.stage || "N/A"}</p>
                            </div>
                            <div className="rounded-xl bg-black/20 border border-white/5 px-5 py-4">
                              <p className="text-sm font-medium text-[#8b9fc4]">Competitors Identified</p>
                              <p className="text-lg font-bold text-white mt-1">{activeDeal.sourceData.pitchData.mainCompetitors?.join(", ") || "None"}</p>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-[#8b9fc4] italic mt-4">Pitch data not available</p>
                        )}
                      </div>

                      {/* Yahoo Finance */}
                      <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-6">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/15">
                            <BarChart3 className="h-5 w-5 text-blue-400" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold">Yahoo Finance — Market Comps</h3>
                            <p className="text-base text-muted-foreground">Real-time stock quotes, valuations & sector data</p>
                          </div>
                        </div>
                        {activeDeal.sourceData.marketData?.competitors && activeDeal.sourceData.marketData.competitors.length > 0 ? (
                          <div className="overflow-x-auto mt-4">
                            <table className="w-full text-left">
                              <thead>
                                <tr className="border-b border-border/30">
                                  <th className="pb-3 pr-4 text-base font-semibold text-muted-foreground">Ticker</th>
                                  <th className="pb-3 pr-4 text-base font-semibold text-muted-foreground">Company</th>
                                  <th className="pb-3 pr-4 text-base font-semibold text-muted-foreground">Price</th>
                                  <th className="pb-3 pr-4 text-base font-semibold text-muted-foreground">Market Cap</th>
                                  <th className="pb-3 pr-4 text-base font-semibold text-muted-foreground">P/E</th>
                                  <th className="pb-3 text-base font-semibold text-muted-foreground">52W Range</th>
                                </tr>
                              </thead>
                              <tbody>
                                {activeDeal.sourceData.marketData.competitors.map((comp) => (
                                  <tr key={comp.ticker} className="border-b border-border/20">
                                    <td className="py-3 pr-4 text-base font-mono font-bold text-blue-400">{comp.ticker}</td>
                                    <td className="py-3 pr-4 text-base">{comp.companyName}</td>
                                    <td className="py-3 pr-4 text-base">{comp.currentPrice ? `$${comp.currentPrice.toFixed(2)}` : "N/A"}</td>
                                    <td className="py-3 pr-4 text-base">{comp.marketCap}</td>
                                    <td className="py-3 pr-4 text-base">{comp.peRatio}</td>
                                    <td className="py-3 text-base">{comp.fiftyTwoWeekRange}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="text-base text-muted-foreground/60 italic">No competitor tickers were identified to query</p>
                        )}
                      </div>

                      {/* Alpha Vantage */}
                      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-6">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/15">
                            <Database className="h-5 w-5 text-amber-400" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold">Alpha Vantage — Financial Statements</h3>
                            <p className="text-base text-muted-foreground">Annual income statements, revenue growth & EPS</p>
                          </div>
                        </div>
                        {activeDeal.sourceData.marketData?.alphaVantageData && activeDeal.sourceData.marketData.alphaVantageData.length > 0 ? (
                          <div className="overflow-x-auto mt-4">
                            <table className="w-full text-left">
                              <thead>
                                <tr className="border-b border-border/30">
                                  <th className="pb-3 pr-4 text-base font-semibold text-muted-foreground">Ticker</th>
                                  <th className="pb-3 pr-4 text-base font-semibold text-muted-foreground">Annual Revenue</th>
                                  <th className="pb-3 pr-4 text-base font-semibold text-muted-foreground">Net Income</th>
                                  <th className="pb-3 pr-4 text-base font-semibold text-muted-foreground">Revenue Growth</th>
                                  <th className="pb-3 text-base font-semibold text-muted-foreground">EPS</th>
                                </tr>
                              </thead>
                              <tbody>
                                {activeDeal.sourceData.marketData.alphaVantageData.map((av) => (
                                  <tr key={av.ticker} className="border-b border-border/20">
                                    <td className="py-3 pr-4 text-base font-mono font-bold text-amber-400">{av.ticker}</td>
                                    <td className="py-3 pr-4 text-base">{av.annualRevenue}</td>
                                    <td className="py-3 pr-4 text-base">{av.annualNetIncome}</td>
                                    <td className="py-3 pr-4 text-base">{av.quarterlyRevenueGrowth}</td>
                                    <td className="py-3 text-base">{av.earningsPerShare}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="text-base text-muted-foreground/60 italic">No competitor tickers were identified to query</p>
                        )}
                      </div>

                      {/* Uploaded Financials */}
                      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-6">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/15">
                            <Globe className="h-5 w-5 text-emerald-400" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold">Uploaded Financials</h3>
                            <p className="text-base text-muted-foreground">
                              {activeDeal.sourceData.hasFinancials
                                ? "CSV/Excel financials were parsed by Claude and included in the analysis"
                                : "No financial spreadsheet was uploaded — pitch-only analysis"}
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={`mt-3 text-sm px-3 py-1 ${
                            activeDeal.sourceData.hasFinancials
                              ? "border-emerald-500/40 text-emerald-400"
                              : "border-amber-500/40 text-amber-400"
                          }`}
                        >
                          {activeDeal.sourceData.hasFinancials ? "Included" : "Not provided"}
                        </Badge>
                      </div>

                    </div>
                  </div>
                )}

                </>
              ) : isGenerating ? (
                <div className="space-y-8 py-4">
                  {[
                    { color: "violet", label: "Parsing pitch deck with Claude..." },
                    { color: "emerald", label: "Analyzing financial spreadsheet..." },
                    { color: "blue", label: "Fetching market comps..." },
                    { color: "rose", label: "Running Founder Intel background check..." },
                    { color: "amber", label: "Drafting investment memo..." },
                  ].map((step) => (
                    <div key={step.color} className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-full bg-${step.color}-500/15`}>
                          <span className={`h-4 w-4 animate-spin rounded-full border-2 border-${step.color}-400 border-t-transparent`} />
                        </div>
                        <span className="text-lg font-medium text-foreground">{step.label}</span>
                      </div>
                      <div className="ml-11 space-y-2">
                        <Skeleton className="h-4 w-3/4 rounded" />
                        <Skeleton className="h-4 w-1/2 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center text-center mb-10 pt-8">
                  <div className="relative mb-8">
                    {/* Animated gradient orb */}
                    <div className="absolute inset-0 -m-8 rounded-full bg-gradient-to-r from-violet-600/30 to-blue-600/30 blur-3xl animate-[glow-pulse_3s_ease-in-out_infinite]" />
                    <div className="relative rounded-2xl panel p-6 border border-white/10 shadow-[0_0_30px_rgba(139,92,246,0.3)]">
                      <FileText className="h-12 w-12 text-[#a78bfa]" />
                    </div>
                  </div>
                  <h3 className="text-3xl font-bold text-white tracking-tight">No memo yet</h3>
                  <p className="mt-4 max-w-sm text-base leading-relaxed text-[#8b9fc4]">
                    Upload a pitch deck on the left, then click <span className="text-white font-semibold">Generate</span> to create your AI-powered investment memo.
                  </p>
                  <div className="mt-8 flex items-center gap-6 text-sm font-medium text-[#6b7fa3]">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/5">
                      <Shield className="h-4 w-4 text-emerald-400" />
                      Secure
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/5">
                      <TrendingUp className="h-4 w-4 text-blue-400" />
                      Real-time
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/5">
                      <BrainCircuit className="h-4 w-4 text-violet-400" />
                      AI-powered
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ── DATA SOURCE CAPABILITIES ── */}
                <div className="max-w-3xl mx-auto">
                  <div className="border-t-2 border-border/20 pt-10 mb-6">
                    <h3 className="text-xl font-bold flex items-center gap-3 mb-2">
                      <Search className="h-6 w-6 text-violet-400" />
                      What We Query For Each Deal
                    </h3>
                    <p className="text-base text-muted-foreground leading-relaxed">
                      Competitor tickers extracted from the pitch deck are queried against two live data sources:
                    </p>
                  </div>

                  <div className="grid gap-6">
                    {/* Yahoo Finance */}
                    <div className="rounded-xl panel p-6">
                      <div className="flex items-center gap-3 mb-5">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                          <BarChart3 className="h-6 w-6 text-blue-400" />
                        </div>
                        <div>
                          <h4 className="text-lg font-bold text-white">Yahoo Finance</h4>
                          <p className="text-sm text-[#8b9fc4]">Real-time market quotes</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        {[
                          { label: "Company Name & Sector", desc: "Industry classification" },
                          { label: "Current Stock Price", desc: "Live market price" },
                          { label: "Market Cap", desc: "e.g. $2.1T" },
                          { label: "P/E Ratio", desc: "Trailing, e.g. 32.5x" },
                          { label: "Revenue Growth", desc: "Percentage change" },
                          { label: "52-Week Range", desc: "Price high / low" },
                        ].map((item) => (
                          <div key={item.label} className="rounded-xl bg-black/20 border border-white/5 px-4 py-3">
                            <p className="text-sm font-bold text-white">{item.label}</p>
                            <p className="text-xs text-[#8b9fc4] mt-1">{item.desc}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Alpha Vantage */}
                    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/15">
                          <Database className="h-5 w-5 text-amber-400" />
                        </div>
                        <div>
                          <h4 className="text-lg font-bold">Alpha Vantage</h4>
                          <p className="text-base text-muted-foreground">Income statement fundamentals</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { label: "Annual Revenue", desc: "Latest fiscal year" },
                          { label: "Annual Net Income", desc: "Profit / loss" },
                          { label: "YoY Revenue Growth", desc: "Comparing last 2 annual reports" },
                          { label: "Earnings Per Share", desc: "Reported EPS" },
                        ].map((item) => (
                          <div key={item.label} className="rounded-lg bg-background/50 px-4 py-3">
                            <p className="text-base font-semibold">{item.label}</p>
                            <p className="text-sm text-muted-foreground">{item.desc}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Claude AI */}
                    <div className="rounded-xl panel p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/20 shadow-[0_0_15px_rgba(139,92,246,0.2)]">
                          <BrainCircuit className="h-6 w-6 text-violet-400" />
                        </div>
                        <div>
                          <h4 className="text-lg font-bold text-white">Claude AI (Sonnet)</h4>
                          <p className="text-sm text-[#8b9fc4]">Pitch deck parsing &amp; memo generation</p>
                        </div>
                      </div>
                      <p className="text-base text-[#6b7fa3] leading-relaxed mt-2">
                        Extracts company name, product, sector, competitors (as tickers), TAM, funding ask, team highlights, and key metrics. Then combines all data sources into a structured investment memo with a <strong className="text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded">BUY</strong> / <strong className="text-amber-400 font-semibold bg-amber-500/10 px-2 py-0.5 rounded">HOLD</strong> / <strong className="text-red-400 font-semibold bg-red-500/10 px-2 py-0.5 rounded">PASS</strong> verdict.
                      </p>
                    </div>
                  </div>
                  </div>
                </div>
              )}
          {/* Gmail Updates Content */}
          {activeTab === "gmail" && (
          <div className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-5xl px-10 py-8">

              {/* Live Crawl Status */}
              {isCrawling && (
                <div className="mb-8 rounded-xl border border-blue-500/30 bg-blue-500/10 p-6">
                  <div className="flex items-center gap-4">
                    <RefreshCw className="h-6 w-6 text-blue-400 animate-spin" />
                    <div>
                      <p className="text-lg font-semibold text-blue-300">Scanning Gmail Inbox...</p>
                      <p className="text-base text-blue-300/60">Connecting to IMAP, searching for unread emails with PDFs</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="rounded-xl panel p-5">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/15">
                      <Mail className="h-5 w-5 text-blue-400" />
                    </div>
                    <p className="text-sm font-medium text-[#8b9fc4] uppercase tracking-wider">Total Scans</p>
                  </div>
                  <p className="text-4xl font-bold text-white">{gmailScans.length}</p>
                </div>
                <div className="rounded-xl panel p-5">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/15">
                      <CheckCircle className="h-5 w-5 text-emerald-400" />
                    </div>
                    <p className="text-sm font-medium text-[#8b9fc4] uppercase tracking-wider">Deals Found</p>
                  </div>
                  <p className="text-4xl font-bold text-white">{gmailDeals.length}</p>
                </div>
                <div className="rounded-xl panel p-5">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/15">
                      <Inbox className="h-5 w-5 text-violet-400" />
                    </div>
                    <p className="text-sm font-medium text-[#8b9fc4] uppercase tracking-wider">Gmail</p>
                  </div>
                  <p className="text-xl font-bold text-white truncate">{gmailConfigured ? gmailUser : "Not configured"}</p>
                </div>
              </div>

              {/* Scan History */}
              <div className="mb-8">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  Scan History
                </h3>
                {gmailScans.length === 0 ? (
                  <div className="rounded-xl drop-zone border-dashed p-10 text-center">
                    <Mail className="mx-auto h-12 w-12 text-[#6b7fa3] mb-4" />
                    <p className="text-lg font-medium text-white">No scans yet</p>
                    <p className="text-base text-[#8b9fc4] mt-2">
                      Click <span className="text-[#a78bfa] font-bold">Scan Now</span> to crawl your Gmail for pitch decks
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {gmailScans.map((scan, idx) => (
                      <button
                        key={scan.id}
                        onClick={() => setActiveScanIndex(activeScanIndex === idx ? null : idx)}
                        className={`w-full text-left rounded-xl border px-5 py-4 transition-all hover:bg-muted/20 ${
                          activeScanIndex === idx
                            ? "border-blue-500/40 bg-blue-500/10"
                            : "border-border/20 bg-card/30"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                              scan.status === "success" ? "bg-emerald-500/15" : "bg-red-500/15"
                            }`}>
                              {scan.status === "success" ? (
                                <CheckCircle className="h-5 w-5 text-emerald-400" />
                              ) : (
                                <AlertCircle className="h-5 w-5 text-red-400" />
                              )}
                            </div>
                            <div>
                              <p className="text-base font-semibold">
                                {new Date(scan.timestamp).toLocaleString()}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {scan.totalEmails} emails · {scan.pitchDecksFound} pitch decks · {scan.analyzed} analyzed
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {scan.analyzed > 0 && (
                              <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 text-sm">
                                {scan.analyzed} deal{scan.analyzed !== 1 ? "s" : ""}
                              </Badge>
                            )}
                            <Badge variant="outline" className={`text-sm ${
                              scan.status === "success"
                                ? "border-emerald-500/30 text-emerald-400"
                                : "border-red-500/30 text-red-400"
                            }`}>
                              {scan.status}
                            </Badge>
                          </div>
                        </div>

                        {/* Expanded scan details */}
                        {activeScanIndex === idx && (
                          <div className="mt-4 border-t border-border/20 pt-4">
                            {scan.error && (
                              <div className="mb-3 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-base text-red-400">
                                Error: {scan.error}
                              </div>
                            )}
                            {scan.analyses.length > 0 && (
                              <div className="space-y-2 mb-3">
                              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Analyzed Decks</p>
                                {scan.analyses.map((a, i) => (
                                  <div key={i} className="flex items-center justify-between rounded-lg bg-background/50 px-4 py-3">
                                    <div>
                                      <p className="text-base font-semibold">{a.companyName}</p>
                                      <p className="text-sm text-muted-foreground">{a.sector} · from {a.sender}</p>
                                    </div>
                                    <Badge
                                      variant="outline"
                                      className={`text-sm font-bold ${
                                        a.verdict === "STRONG BUY" ? "border-emerald-500/40 text-emerald-400"
                                          : a.verdict === "BUY" ? "border-green-500/40 text-green-400"
                                          : a.verdict === "HOLD" ? "border-amber-500/40 text-amber-400"
                                          : a.verdict === "PASS" ? "border-red-500/40 text-red-400"
                                          : "border-border/40 text-muted-foreground"
                                      }`}
                                    >
                                      {a.verdict}
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            )}
                            {scan.emails.length > 0 && (
                              <div>
                  <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Emails Scanned ({scan.emails.length})</p>
                                <div className="max-h-[300px] overflow-y-auto space-y-1">
                                  {scan.emails.map((email) => (
                                    <div key={email.uid} className="flex items-center gap-3 rounded-lg px-3 py-2 text-base">
                                      <div className={`h-2 w-2 rounded-full ${email.isPitch ? "bg-emerald-400" : email.hasPdf ? "bg-amber-400" : "bg-muted-foreground/30"}`} />
                                      <span className="text-muted-foreground min-w-[180px] truncate">{email.from}</span>
                                      <span className="truncate flex-1">{email.subject}</span>
                                      {email.hasPdf && <Badge variant="outline" className="text-xs shrink-0">PDF</Badge>}
                                      {email.isPitch && <Badge variant="outline" className="text-xs shrink-0 border-emerald-500/30 text-emerald-400">Pitch</Badge>}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Deal Memory */}
              {gmailDeals.length > 0 && (
                <div>
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Database className="h-5 w-5 text-muted-foreground" />
                    Deal Memory
                  </h3>
                  <div className="grid gap-3">
                    {gmailDeals.map((deal) => (
                      <div key={deal.filename} className="rounded-xl panel p-5">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-lg font-bold text-white">{deal.companyName}</h4>
                          <div className="flex items-center gap-2">
                            <span className="text-xs bg-white/10 px-2 py-1 rounded text-white">{deal.sector}</span>
                            <span
                              className={`text-xs font-bold px-2 py-1 rounded ${
                                deal.verdict === "STRONG BUY" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                  : deal.verdict === "BUY" ? "bg-green-500/20 text-green-400 border border-green-500/30"
                                  : deal.verdict === "HOLD" ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                  : deal.verdict === "PASS" ? "bg-red-500/20 text-red-400 border border-red-500/30"
                                  : "bg-white/10 text-[#8b9fc4]"
                              }`}
                            >
                              {deal.verdict}
                            </span>
                          </div>
                        </div>
                        <p className="text-base text-[#e8eaf2]">{deal.summary}</p>
                        <p className="text-sm text-[#8b9fc4] mt-3 border-t border-white/5 pt-3">
                          {deal.date} · from {deal.sender}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          )}

          {/* Stay Tuned / Research Content */}
          {activeTab === "research" && (
          <div className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-5xl px-10 py-8">

              {/* Search Bar */}
              <div className="mb-8">
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <input
                      type="text"
                      value={researchQuery}
                      onChange={(e) => setResearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleResearch()}
                      placeholder="Search a company, ticker, or topic... (e.g. Tesla, AAPL, AI startups)"
                      className="w-full rounded-xl border border-border/40 bg-background/50 pl-12 pr-4 py-4 text-base placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50"
                      disabled={isResearching}
                    />
                  </div>
                  <Button
                    size="lg"
                    className="gap-3 rounded-xl text-base font-bold px-8 py-5"
                    onClick={handleResearch}
                    disabled={isResearching || !researchQuery.trim()}
                  >
                    {isResearching ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Searching...
                      </>
                    ) : (
                      <>
                        <Search className="h-5 w-5" />
                        Research
                      </>
                    )}
                  </Button>
                </div>
                <div className="flex gap-2 mt-3">
                  {["AAPL", "TSLA", "NVDA", "MSFT", "ISRG", "AI startups"].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => { setResearchQuery(suggestion); }}
                      className="rounded-lg border border-border/30 bg-muted/20 px-4 py-2 text-base text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>

              {/* Loading State */}
              {isResearching && (
                <div className="mb-8 rounded-xl border border-violet-500/30 bg-violet-500/10 p-6">
                  <div className="flex items-center gap-4">
                    <Loader2 className="h-6 w-6 text-violet-400 animate-spin" />
                    <div>
                      <p className="text-lg font-semibold text-violet-300">Researching &quot;{researchQuery}&quot;...</p>
                      <p className="text-base text-violet-300/60">Querying Yahoo Finance, Alpha Vantage, and Claude AI</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Results */}
              {researchResults.length === 0 && !isResearching ? (
                <div className="rounded-xl drop-zone border-dashed p-16 text-center">
                  <Newspaper className="mx-auto h-12 w-12 text-[#6b7fa3] mb-4" />
                  <p className="text-xl font-bold text-white">No research yet</p>
                  <p className="text-base text-[#8b9fc4] mt-2">
                    Search for any company or topic to get live market data, news, and AI analysis
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {researchResults.map((result, idx) => (
                    <div
                      key={result.id}
                      className={`rounded-xl transition-all ${
                        activeResearchIndex === idx
                          ? "panel border-violet-500/40 shadow-[0_0_20px_rgba(139,92,246,0.1)]"
                          : "panel opacity-80 hover:opacity-100"
                      }`}
                    >
                      {/* Result Header */}
                      <button
                        onClick={() => setActiveResearchIndex(activeResearchIndex === idx ? null : idx)}
                        className="w-full text-left px-6 py-5"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-violet-500/15">
                              <Search className="h-5 w-5 text-violet-400" />
                            </div>
                            <div>
                              <h3 className="text-lg font-bold">&quot;{result.query}&quot;</h3>
                              <p className="text-sm text-muted-foreground">
                                {new Date(result.timestamp).toLocaleString()} · {result.companies.length} companies · {result.news.length} articles
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {result.companies.length > 0 && (
                              <Badge variant="outline" className="border-blue-500/40 text-blue-400 text-sm">
                                {result.companies.length} ticker{result.companies.length !== 1 ? "s" : ""}
                              </Badge>
                            )}
                            <Badge
                              variant="outline"
                              className={`text-sm ${
                                result.status === "success"
                                  ? "border-emerald-500/30 text-emerald-400"
                                  : "border-red-500/30 text-red-400"
                              }`}
                            >
                              {result.status}
                            </Badge>
                          </div>
                        </div>
                      </button>

                      {/* Expanded Result */}
                      {activeResearchIndex === idx && (
                        <div className="px-6 pb-6 space-y-6">
                          <Separator className="opacity-30" />

                          {/* Company Ticker Cards */}
                          {result.companies.length > 0 && (
                            <div>
                              <h4 className="text-sm font-bold text-[#8b9fc4] uppercase tracking-wider mb-3">Market Data</h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {result.companies.map((company) => {
                                  const isPositive = company.change.startsWith("+");
                                  const isNegative = company.change.startsWith("-");
                                  return (
                                    <div key={company.ticker} className="rounded-xl bg-black/20 border border-white/5 p-5">
                                      <div className="flex items-center justify-between mb-3">
                                        <div>
                                          <p className="text-lg font-bold text-white">{company.ticker}</p>
                                          <p className="text-sm text-[#8b9fc4] truncate max-w-[150px]">{company.name}</p>
                                        </div>
                                        <div className={`flex items-center gap-1 text-base font-bold ${
                                          isPositive ? "text-emerald-400" : isNegative ? "text-red-400" : "text-[#8b9fc4]"
                                        }`}>
                                          {isPositive ? <ArrowUpRight className="h-4 w-4" /> : isNegative ? <ArrowDownRight className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
                                          {company.changePercent}
                                        </div>
                                      </div>
                                      <p className="text-3xl font-bold text-white mb-4">
                                        {company.price != null ? `$${company.price.toFixed(2)}` : "N/A"}
                                      </p>
                                      <div className="grid grid-cols-2 gap-3 text-sm">
                                        <div>
                                          <p className="text-[#8b9fc4]">Mkt Cap</p>
                                          <p className="font-bold text-white">{company.marketCap}</p>
                                        </div>
                                        <div>
                                          <p className="text-[#8b9fc4]">P/E</p>
                                          <p className="font-bold text-white">{company.peRatio}</p>
                                        </div>
                                        <div>
                                          <p className="text-[#8b9fc4]">Volume</p>
                                          <p className="font-bold text-white">{company.volume}</p>
                                        </div>
                                        <div>
                                          <p className="text-[#8b9fc4]">Sector</p>
                                          <p className="font-bold text-white truncate">{company.sector}</p>
                                        </div>
                                      </div>
                                      <div className="mt-3 text-sm border-t border-white/5 pt-3">
                                        <p className="text-[#8b9fc4]">52-Wk Range</p>
                                        <p className="font-bold text-white">{company.fiftyTwoWeekRange}</p>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* AI Summary */}
                          {result.aiSummary && (
                            <div>
                              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                                <Sparkles className="h-4 w-4 text-violet-400" />
                                AI Analysis
                              </h4>
                              <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-5">
                                <article className="prose dark:prose-invert prose-base max-w-none prose-headings:font-bold prose-headings:text-foreground prose-p:text-foreground/80 prose-strong:text-foreground prose-li:text-foreground/80">
                                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {result.aiSummary}
                                  </ReactMarkdown>
                                </article>
                              </div>
                            </div>
                          )}

                          {/* News Feed */}
                          {result.news.length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                                <Newspaper className="h-4 w-4 text-blue-400" />
                                News Feed ({result.news.length})
                              </h4>
                              <div className="space-y-3">
                                {result.news.map((article) => (
                                  <a
                                    key={article.id}
                                    href={article.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block rounded-xl border border-border/20 bg-background/50 p-4 hover:bg-muted/20 transition-colors group"
                                  >
                                    <div className="flex items-start justify-between gap-4">
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1.5">
                                          <Badge
                                            variant="outline"
                                            className={`text-sm ${
                                              article.sentiment === "positive"
                                                ? "border-emerald-500/30 text-emerald-400"
                                                : article.sentiment === "negative"
                                                ? "border-red-500/30 text-red-400"
                                                : "border-border/40 text-muted-foreground"
                                            }`}
                                          >
                                            {article.sentiment === "positive" ? "Bullish" : article.sentiment === "negative" ? "Bearish" : "Neutral"}
                                          </Badge>
                                          <span className="text-sm text-muted-foreground">{article.source}</span>
                                          {article.ticker && (
                                            <Badge variant="outline" className="text-sm border-blue-500/30 text-blue-400">
                                              {article.ticker}
                                            </Badge>
                                          )}
                                        </div>
                                        <h5 className="text-lg font-semibold group-hover:text-primary transition-colors line-clamp-2">
                                          {article.title}
                                        </h5>
                                        <p className="text-base text-muted-foreground mt-1 line-clamp-2">
                                          {article.summary}
                                        </p>
                                        <p className="text-sm text-muted-foreground/50 mt-2">
                                          {new Date(article.timestamp).toLocaleString()}
                                        </p>
                                      </div>
                                      <ExternalLink className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary shrink-0 mt-1 transition-colors" />
                                    </div>
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Error */}
                          {result.error && (
                            <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-base text-red-400">
                              Error: {result.error}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          )}

          {/* Monitor AI Content */}
          {activeTab === "monitor" && (
          <div className="flex-1 overflow-hidden relative bg-background">
            <MonitorAICanvas
              isGenerating={isGenerating}
              isCrawling={isCrawling}
              isResearching={isResearching}
              isChatting={isChatting}
              autoScan={autoScan}
              dealsCount={deals.length}
              gmailScansCount={gmailScans.length}
              researchCount={researchResults.length}
            />
          </div>
          )}
        </main>

      {/* ===== RIGHT SIDEBAR: Founder Intel ===== */}
        <aside className={`flex w-[440px] shrink-0 flex-col panel rounded-none border-y-0 border-r-0 border-l border-white/10 z-0 transition-all ${activeDeal && activeMemo ? "" : "hidden xl:flex"}`}>
          {activeDeal && activeMemo ? (
            <>
              {/* Founder Intel Header */}
              <div className="flex items-center gap-4 border-b border-white/5 px-6 py-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.2)]">
                  <ShieldAlert className="h-6 w-6 text-rose-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-xl font-bold text-white truncate">Founder Intel</h3>
                  <p className="text-sm text-[#8b9fc4]">Background check &amp; verification</p>
                </div>
                {activeDeal.sourceData?.founderIntel && (
                  <span
                    className={`text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap border ${
                      activeDeal.sourceData.founderIntel.overallRiskLevel === "low"
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                        : activeDeal.sourceData.founderIntel.overallRiskLevel === "medium"
                          ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                          : "bg-rose-500/10 border-rose-500/30 text-rose-400"
                    }`}
                  >
                    {activeDeal.sourceData.founderIntel.overallRiskLevel === "low" ? "🟢" : activeDeal.sourceData.founderIntel.overallRiskLevel === "medium" ? "🟡" : "🔴"}{" "}
                    {activeDeal.sourceData.founderIntel.overallRiskLevel.toUpperCase()} RISK
                  </span>
                )}
              </div>

              {/* Founder Intel Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {activeDeal.sourceData?.founderIntel ? (
                  <>
                    {/* Summary */}
                    <div className="rounded-xl bg-white/5 border border-white/5 p-5">
                      <p className="text-sm text-[#e8eaf2] leading-relaxed">{activeDeal.sourceData.founderIntel.summary}</p>
                    </div>

                    {/* Founder Profiles */}
                    {activeDeal.sourceData.founderIntel.founders.length > 0 && (
                      <div className="space-y-4">
                        <h4 className="text-xs font-bold text-[#8b9fc4] uppercase tracking-wider">Founder Profiles</h4>
                        {activeDeal.sourceData.founderIntel.founders.map((founder, idx) => (
                          <div key={idx} className={`rounded-xl bg-black/20 border p-5 ${
                            founder.overallAssessment === "green"
                              ? "border-emerald-500/20"
                              : founder.overallAssessment === "yellow"
                                ? "border-amber-500/20"
                                : "border-rose-500/20"
                          }`}>
                            <div className="flex items-center gap-3 mb-4">
                              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                                founder.overallAssessment === "green"
                                  ? "bg-emerald-500/10"
                                  : founder.overallAssessment === "yellow"
                                    ? "bg-amber-500/10"
                                    : "bg-rose-500/10"
                              }`}>
                                <UserCheck className={`h-5 w-5 ${
                                  founder.overallAssessment === "green"
                                    ? "text-emerald-400"
                                    : founder.overallAssessment === "yellow"
                                      ? "text-amber-400"
                                      : "text-rose-400"
                                }`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="text-base font-bold text-white truncate">{founder.name}</h3>
                              </div>
                              <span
                                className={`text-[10px] font-bold px-2 py-1 rounded border ${
                                  founder.overallAssessment === "green"
                                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                                    : founder.overallAssessment === "yellow"
                                      ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                                      : "bg-rose-500/10 border-rose-500/30 text-rose-400"
                                }`}
                              >
                                {founder.overallAssessment === "green" ? "✓ CLEAR" : founder.overallAssessment === "yellow" ? "⚠ CAUTION" : "✗ FLAG"}
                              </span>
                            </div>
                            <p className="text-sm text-[#8b9fc4] mb-4 leading-relaxed">{founder.linkedinSummary}</p>

                            {/* Prior Ventures */}
                            {founder.priorVentures.length > 0 && (
                              <div className="mb-3">
                                <p className="text-[10px] font-bold text-[#6b7fa3] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                                  <Building className="h-3.5 w-3.5" /> Prior Ventures
                                </p>
                                <ul className="space-y-1">
                                  {founder.priorVentures.map((v, i) => (
                                    <li key={i} className="text-sm text-white">{v}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Achievements */}
                            {founder.notableAchievements.length > 0 && (
                              <div className="mb-2">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1.5">
                                  <Sparkles className="h-4 w-4" /> Achievements
                                </p>
                                <ul className="space-y-0.5">
                                  {founder.notableAchievements.map((a, i) => (
                                    <li key={i} className="text-sm text-foreground/80">{a}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Red Flags */}
                            {founder.redFlags.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-rose-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                                  <Flag className="h-4 w-4" /> Red Flags
                                </p>
                                <ul className="space-y-0.5">
                                  {founder.redFlags.map((f, i) => (
                                    <li key={i} className="text-sm text-rose-300">{f}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Company Registry Check */}
                    <div>
                      <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Company Registry</h4>
                      <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-5">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-lg bg-background/50 px-4 py-3">
                            <p className="text-xs font-medium text-muted-foreground">Companies House (UK)</p>
                            <p className="text-sm">{activeDeal.sourceData.founderIntel.companyCheck.companiesHouse}</p>
                          </div>
                          <div className="rounded-lg bg-background/50 px-4 py-3">
                            <p className="text-xs font-medium text-muted-foreground">SEC EDGAR (US)</p>
                            <p className="text-sm">{activeDeal.sourceData.founderIntel.companyCheck.secEdgar}</p>
                          </div>
                          <div className="rounded-lg bg-background/50 px-4 py-3 col-span-2">
                            <p className="text-xs font-medium text-muted-foreground">Incorporation Status</p>
                            <p className="text-sm font-semibold">{activeDeal.sourceData.founderIntel.companyCheck.incorporationStatus}</p>
                          </div>
                          {activeDeal.sourceData.founderIntel.companyCheck.filingFlags.length > 0 && (
                            <div className="rounded-lg bg-background/50 px-4 py-3 col-span-2">
                              <p className="text-xs font-medium text-amber-400">Filing Flags</p>
                              <ul className="space-y-0.5 mt-1">
                                {activeDeal.sourceData.founderIntel.companyCheck.filingFlags.map((f, i) => (
                                  <li key={i} className="text-sm text-amber-300">{f}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Adverse Media & Inconsistencies */}
                    {activeDeal.sourceData.founderIntel.adverseMedia.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-rose-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <AlertCircle className="h-4 w-4" /> Adverse Media
                        </h4>
                        <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-5">
                          <ul className="space-y-2">
                            {activeDeal.sourceData.founderIntel.adverseMedia.map((item, i) => (
                              <li key={i} className="text-sm text-rose-300/90 flex items-start gap-2">
                                <span className="mt-1.5 h-1 w-1 rounded-full bg-rose-400 shrink-0" />
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}

                    {activeDeal.sourceData.founderIntel.inconsistencies.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <Flag className="h-4 w-4" /> Inconsistencies
                        </h4>
                        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
                          <ul className="space-y-2">
                            {activeDeal.sourceData.founderIntel.inconsistencies.map((item, i) => (
                              <li key={i} className="text-sm text-amber-300/90 flex items-start gap-2">
                                <span className="mt-1.5 h-1 w-1 rounded-full bg-amber-400 shrink-0" />
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}

                    {/* All clear message */}
                    {activeDeal.sourceData.founderIntel.adverseMedia.length === 0 && activeDeal.sourceData.founderIntel.inconsistencies.length === 0 && (
                      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
                        <p className="text-base text-emerald-400 flex items-center gap-2">
                          <CheckCircle className="h-5 w-5" />
                          No adverse media or inconsistencies found
                        </p>
                      </div>
                    )}

                    {/* Sources */}
                    {activeDeal.sourceData.founderIntel.sources.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Sources</h4>
                        <div className="flex flex-wrap gap-2">
                          {activeDeal.sourceData.founderIntel.sources.map((src, i) => (
                            <a
                              key={i}
                              href={src}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-400 hover:text-blue-300 underline underline-offset-2 break-all"
                            >
                              {src.length > 50 ? src.slice(0, 50) + "…" : src}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : isGenerating ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="mb-4 rounded-full bg-rose-500/10 p-5">
                      <Loader2 className="h-10 w-10 text-rose-400 animate-spin" />
                    </div>
                    <p className="text-lg font-medium text-muted-foreground/60">
                      Running background check...
                    </p>
                    <p className="text-base text-muted-foreground/40 mt-2">
                      Searching web for founder history,<br />registry records &amp; adverse media
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="mb-4 rounded-full bg-muted/20 p-5">
                      <ShieldAlert className="h-10 w-10 text-muted-foreground/20" />
                    </div>
                    <p className="text-lg font-medium text-muted-foreground/50">
                      No founder intel yet
                    </p>
                    <p className="text-base text-muted-foreground/30 mt-2">
                      Background check will appear here<br />after analysis completes
                    </p>
                  </div>
                )}

                {/* ===== LEGAL & CAP TABLE SCAN ===== */}
                {activeDeal.sourceData?.legalScan && (
                  <div className="border-t border-white/10 mt-6 pt-6 mb-6">
                    <div className="flex items-center gap-4 mb-5">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                        <Shield className="h-6 w-6 text-amber-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xl font-bold text-white">Legal &amp; Cap Table</h3>
                      </div>
                      <span
                        className={`text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap border ${
                          activeDeal.sourceData.legalScan.overallRiskLevel === "low"
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                            : activeDeal.sourceData.legalScan.overallRiskLevel === "medium"
                              ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                              : "bg-rose-500/10 border-rose-500/30 text-rose-400"
                        }`}
                      >
                        {activeDeal.sourceData.legalScan.overallRiskLevel === "low" ? "🟢" : activeDeal.sourceData.legalScan.overallRiskLevel === "medium" ? "🟡" : "🔴"}{" "}
                        {activeDeal.sourceData.legalScan.overallRiskLevel.toUpperCase()} RISK
                      </span>
                    </div>

                    {/* Summary */}
                    <div className="rounded-xl bg-white/5 border border-white/5 p-5 mb-5">
                      <p className="text-sm text-[#e8eaf2] leading-relaxed">{activeDeal.sourceData.legalScan.summary}</p>
                    </div>

                      {/* IP Flags */}
                      {activeDeal.sourceData.legalScan.ipFlags.length > 0 && (
                        <div className="mb-4">
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            🔒 IP &amp; Patent Flags
                          </h4>
                          <div className="space-y-2">
                            {activeDeal.sourceData.legalScan.ipFlags.map((flag, i) => (
                              <div key={i} className={`rounded-lg border p-3 ${
                                flag.severity === "critical"
                                  ? "border-rose-500/30 bg-rose-500/5"
                                  : flag.severity === "warning"
                                    ? "border-amber-500/30 bg-amber-500/5"
                                    : "border-blue-500/30 bg-blue-500/5"
                              }`}>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={`text-xs font-bold uppercase ${
                                    flag.severity === "critical" ? "text-rose-400" : flag.severity === "warning" ? "text-amber-400" : "text-blue-400"
                                  }`}>{flag.severity}</span>
                                  <span className="text-sm font-semibold">{flag.issue}</span>
                                </div>
                                <p className="text-xs text-muted-foreground leading-relaxed">{flag.detail}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Financial Discrepancies */}
                      {activeDeal.sourceData.legalScan.financialDiscrepancies.length > 0 && (
                        <div className="mb-4">
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            📊 Financial Discrepancies
                          </h4>
                          <div className="space-y-2">
                            {activeDeal.sourceData.legalScan.financialDiscrepancies.map((disc, i) => (
                              <div key={i} className={`rounded-lg border p-3 ${
                                disc.severity === "critical"
                                  ? "border-rose-500/30 bg-rose-500/5"
                                  : disc.severity === "warning"
                                    ? "border-amber-500/30 bg-amber-500/5"
                                    : "border-blue-500/30 bg-blue-500/5"
                              }`}>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={`text-xs font-bold uppercase ${
                                    disc.severity === "critical" ? "text-rose-400" : disc.severity === "warning" ? "text-amber-400" : "text-blue-400"
                                  }`}>{disc.severity}</span>
                                  <span className="text-sm font-semibold">{disc.field}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 my-2">
                                  <div className="rounded bg-background/50 px-3 py-1.5">
                                    <p className="text-[10px] text-muted-foreground">Pitch Deck</p>
                                    <p className="text-xs font-medium">{disc.deckValue}</p>
                                  </div>
                                  <div className="rounded bg-background/50 px-3 py-1.5">
                                    <p className="text-[10px] text-muted-foreground">Spreadsheet</p>
                                    <p className="text-xs font-medium">{disc.spreadsheetValue}</p>
                                  </div>
                                </div>
                                <p className="text-xs text-muted-foreground leading-relaxed">{disc.explanation}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Cap Table Flags */}
                      {activeDeal.sourceData.legalScan.capTableFlags.length > 0 && (
                        <div className="mb-5">
                          <h4 className="text-xs font-bold text-[#8b9fc4] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                            📋 Cap Table Red Flags
                          </h4>
                          <div className="space-y-3">
                            {activeDeal.sourceData.legalScan.capTableFlags.map((flag, i) => (
                              <div key={i} className={`rounded-lg bg-black/20 border p-4 ${
                                flag.severity === "critical"
                                  ? "border-rose-500/30"
                                  : flag.severity === "warning"
                                    ? "border-amber-500/30"
                                    : "border-blue-500/30"
                              }`}>
                                <div className="flex items-center gap-2 mb-2">
                                  <span className={`text-[10px] font-bold uppercase ${
                                    flag.severity === "critical" ? "text-rose-400" : flag.severity === "warning" ? "text-amber-400" : "text-blue-400"
                                  }`}>{flag.severity}</span>
                                  <span className="text-sm font-bold text-white">{flag.issue}</span>
                                </div>
                                <p className="text-sm text-[#8b9fc4] leading-relaxed">{flag.detail}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Missing Documents Checklist */}
                      {activeDeal.sourceData.legalScan.missingDocuments.length > 0 && (
                        <div className="mb-5">
                          <h4 className="text-xs font-bold text-[#8b9fc4] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                            📝 Missing Documents Checklist
                          </h4>
                          <div className="space-y-2">
                            {activeDeal.sourceData.legalScan.missingDocuments.map((doc, i) => (
                              <div key={i} className="flex items-start gap-3 rounded-lg bg-white/5 border border-white/5 px-4 py-3">
                                <span className={`mt-0.5 text-xs font-bold uppercase shrink-0 ${
                                  doc.importance === "required" ? "text-rose-400" : doc.importance === "recommended" ? "text-amber-400" : "text-blue-400"
                                }`}>
                                  {doc.importance === "required" ? "⬜" : doc.importance === "recommended" ? "◻️" : "○"}
                                </span>
                                <div className="min-w-0">
                                  <p className="text-sm font-bold text-white mb-0.5">{doc.document}</p>
                                  <p className="text-xs text-[#8b9fc4]">{doc.reason}</p>
                                  <span className={`text-[10px] font-bold uppercase mt-2 inline-block px-1.5 py-0.5 rounded border ${
                                    doc.importance === "required" ? "bg-rose-500/10 border-rose-500/30 text-rose-400" : doc.importance === "recommended" ? "bg-amber-500/10 border-amber-500/30 text-amber-400" : "bg-blue-500/10 border-blue-500/30 text-blue-400"
                                  }`}>{doc.importance}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* All clear */}
                      {activeDeal.sourceData.legalScan.ipFlags.length === 0 &&
                        activeDeal.sourceData.legalScan.financialDiscrepancies.length === 0 &&
                        activeDeal.sourceData.legalScan.capTableFlags.length === 0 &&
                        activeDeal.sourceData.legalScan.missingDocuments.length === 0 && (
                        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-5">
                          <p className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                            <CheckCircle className="h-5 w-5" />
                            No legal or financial red flags detected
                          </p>
                        </div>
                      )}
                    </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
              <div className="mb-6 rounded-full bg-white/5 border border-white/10 p-6">
                <ShieldAlert className="h-12 w-12 text-[#6b7fa3]" />
              </div>
              <h3 className="text-xl font-bold text-white">Founder Intel</h3>
              <p className="mt-4 text-base leading-relaxed text-[#6b7fa3]">
                Generate a memo to run<br />founder background checks
              </p>
            </div>
          )}
        </aside>
    </div>

    {/* ===== FLOATING CHATBOT ===== */}
      {/* Chat Toggle Button — gradient with glow */}
      <button
        onClick={() => setChatOpen(!chatOpen)}
        className={`fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full transition-all duration-200 hover:scale-105 ${
          chatOpen
            ? "panel opacity-100 shadow-xl border-white/10"
            : "btn-gradient shadow-xl text-white hover:shadow-[0_0_20px_rgba(139,92,246,0.5)]"
        }`}
      >
        {chatOpen ? <X className="h-6 w-6 text-white" /> : <MessageCircle className="h-6 w-6 text-white" />}
      </button>

      {/* Chat Popup — glassmorphism panel */}
      {chatOpen && (
        <div className="fixed bottom-24 right-6 z-50 flex w-[400px] max-h-[600px] flex-col rounded-2xl panel shadow-[0_10px_40px_rgba(0,0,0,0.5)] border-white/10 overflow-hidden">
          {/* Chat Popup Header */}
          <div className="flex items-center gap-3 border-b border-white/5 px-5 py-4 bg-black/20">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/20 border border-violet-500/20 shadow-[0_0_10px_rgba(139,92,246,0.2)]">
              <Bot className="h-5 w-5 text-violet-400" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-bold text-white truncate">
                {activeDeal && activeMemo ? `Ask about ${activeDeal?.companyName}` : "Diligent-AI Assistant"}
              </h3>
              <p className="text-xs text-[#8b9fc4]">
                {activeDeal && activeMemo ? "Deal-specific Q&A" : "Finance, trading & company research"}
              </p>
            </div>
            <button onClick={() => setChatOpen(false)} className="text-[#6b7fa3] hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-2 rounded-lg">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[260px] max-h-[430px]">
            {(() => {
              const chatHistory = activeDeal && activeMemo ? activeDeal?.chatHistory : generalChatHistory;
              const isEmpty = !chatHistory || chatHistory.length === 0;
              return (
                <>
                  {isEmpty && !isChatting && (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <div className="mb-4 rounded-full bg-violet-500/10 p-4">
                        <Bot className="h-10 w-10 text-violet-400/50" />
                      </div>
                      <p className="text-base font-medium text-muted-foreground/60">
                        {activeDeal && activeMemo
                          ? `Ask anything about ${activeDeal?.companyName}`
                          : "Ask me anything about finance, trading, or companies"}
                      </p>
                      <div className="mt-4 flex flex-wrap justify-center gap-2">
                        {(activeDeal && activeMemo
                          ? ["Key risks?", "Market size?", "Should I invest?"]
                          : ["What is a DCF?", "NVDA vs AMD?", "Explain P/E ratio", "Top AI stocks?"]
                        ).map((q) => (
                          <button
                            key={q}
                            onClick={() => { setChatInput(q); }}
                            className="rounded-full border border-border/40 bg-muted/20 px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-violet-500/10 hover:text-violet-400 hover:border-violet-500/30"
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {chatHistory?.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      {msg.role === "assistant" && (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-500/15">
                          <Bot className="h-5 w-5 text-violet-400" />
                        </div>
                      )}
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-3 text-base leading-relaxed ${
                          msg.role === "user"
                            ? "bg-violet-600 text-white"
                            : "bg-muted/40 text-foreground"
                        }`}
                      >
                        {msg.role === "assistant" ? (
                          <div className="prose dark:prose-invert prose-base max-w-none prose-p:my-1 prose-p:text-base prose-p:leading-relaxed prose-li:text-base">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {msg.content}
                            </ReactMarkdown>
                          </div>
                        ) : (
                          msg.content
                        )}
                      </div>
                      {msg.role === "user" && (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted/40">
                          <User className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  ))}
                  {isChatting && (
                    <div className="flex gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-500/15">
                        <Bot className="h-5 w-5 text-violet-400" />
                      </div>
                      <div className="flex items-center gap-2 rounded-2xl bg-muted/40 px-4 py-3">
                        <span className="h-2 w-2 animate-bounce rounded-full bg-violet-400" style={{ animationDelay: "0ms" }} />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-violet-400" style={{ animationDelay: "150ms" }} />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-violet-400" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>

          {/* Chat Input — always visible */}
          <div className="border-t border-white/10 p-4 bg-black/20">
            <form
              onSubmit={(e) => { e.preventDefault(); handleChat(); }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={activeDeal && activeMemo ? `Ask about ${activeDeal?.companyName}...` : "Ask about finance, stocks, trading..."}
                className="flex-1 rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white placeholder:text-[#6b7fa3] focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/20"
                disabled={isChatting}
              />
              <button
                type="submit"
                className="flex items-center justify-center gap-2 rounded-xl px-4 py-3 btn-gradient text-white shadow-[0_4px_15px_rgba(139,92,246,0.3)] hover:shadow-[0_6px_20px_rgba(139,92,246,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!chatInput.trim() || isChatting}
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
