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

type ActiveTab = "memo" | "gmail";

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

  const activeDeal = activeDealIndex !== null ? deals[activeDealIndex] : null;
  const activeMemo = activeDeal?.memo ?? null;

  const handleChat = async () => {
    if (!chatInput.trim() || !activeDeal || isChatting) return;

    const userMessage = chatInput.trim();
    setChatInput("");
    setIsChatting(true);

    // Add user message immediately
    setDeals((prev) =>
      prev.map((deal, i) =>
        i === activeDealIndex
          ? { ...deal, chatHistory: [...deal.chatHistory, { role: "user" as const, content: userMessage }] }
          : deal
      )
    );

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          memo: activeDeal.memo,
          companyName: activeDeal.companyName,
          history: activeDeal.chatHistory,
        }),
      });

      const data = await res.json();
      const reply = data.reply || "Sorry, I couldn't generate a response.";

      setDeals((prev) =>
        prev.map((deal, i) =>
          i === activeDealIndex
            ? { ...deal, chatHistory: [...deal.chatHistory, { role: "assistant" as const, content: reply }] }
            : deal
        )
      );
    } catch {
      setDeals((prev) =>
        prev.map((deal, i) =>
          i === activeDealIndex
            ? { ...deal, chatHistory: [...deal.chatHistory, { role: "assistant" as const, content: "Network error. Please try again." }] }
            : deal
        )
      );
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
          sourceData: { pitchData: null, marketData: null, hasFinancials: false },
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
        sourceData: { pitchData: null, marketData: null, hasFinancials: false },
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
      <header className="flex h-[72px] shrink-0 items-center justify-between border-b-2 border-border/50 bg-card/50 px-10">
        <div className="flex items-center gap-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white dark:bg-white">
            <BrainCircuit className="h-7 w-7 text-black" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Diligent<span className="text-foreground/40">-AI</span>
          </h1>
          <Separator orientation="vertical" className="mx-3 h-7" />
          <span className="text-base font-semibold uppercase tracking-wider text-muted-foreground">Automated VC Analyst</span>
        </div>
        <div className="flex items-center gap-4">
          {/* Theme Toggle */}
          <div className="flex items-center rounded-full border border-border/40 bg-muted/20 p-1">
            {[
              { mode: "light" as const, icon: Sun, label: "Light" },
              { mode: "system" as const, icon: Monitor, label: "System" },
              { mode: "dark" as const, icon: Moon, label: "Dark" },
            ].map(({ mode, icon: Icon, label }) => (
              <button
                key={mode}
                onClick={() => setTheme(mode)}
                title={label}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-all ${
                  theme === mode
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
          <Badge variant="outline" className="gap-2 rounded-full border-emerald-500/30 bg-emerald-500/5 px-4 py-2 text-base font-medium text-emerald-400">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
            Live Data
          </Badge>
          <Badge variant="outline" className="gap-2 rounded-full border-violet-500/30 bg-violet-500/5 px-4 py-2 text-base font-medium text-violet-400">
            <Zap className="h-5 w-5" />
            Claude Sonnet
          </Badge>
        </div>
      </header>

      {/* ===== 3-PANEL LAYOUT ===== */}
      <div className="flex flex-1 overflow-hidden">

        {/* ===== LEFT SIDEBAR: Upload + Deal History ===== */}
        <aside className="flex w-[400px] shrink-0 flex-col border-r-2 border-border/50 bg-card/30">
          {/* Upload Section */}
          <div className="flex-1 overflow-y-auto p-7 space-y-0">

            {/* ── SECTION: Pitch Deck ── */}
            <div className="pb-6">
              <h3 className="text-lg font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Pitch Deck
              </h3>
              {pdfFile ? (
                <div className="flex items-center justify-between rounded-xl border border-red-500/20 bg-red-500/5 px-5 py-5">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-red-500/15">
                      <FileText className="h-6 w-6 text-red-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-lg font-semibold truncate">{pdfFile.name}</p>
                      <p className="text-base text-muted-foreground">Pitch Deck</p>
                    </div>
                  </div>
                  <button onClick={() => setPdfFile(null)} className="shrink-0 rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground">
                    <X className="h-5 w-5" />
                  </button>
                </div>
              ) : (
                <div
                  onDrop={(e) => handleDrop(e, "pdf")}
                  onDragOver={handleDragOver}
                  className="group cursor-pointer rounded-xl border-2 border-dashed border-border/50 bg-muted/10 px-5 py-12 text-center transition-all hover:border-red-400/40 hover:bg-red-500/5"
                >
                  <Upload className="mx-auto mb-4 h-8 w-8 text-muted-foreground/50 transition-colors group-hover:text-red-400" />
                  <p className="text-lg font-medium text-muted-foreground">Drop pitch deck PDF</p>
                  <label className="mt-2 block cursor-pointer text-base font-medium text-red-400 hover:underline">
                    or browse
                    <input type="file" accept=".pdf" className="hidden" onChange={(e) => handleFileSelect(e, "pdf")} />
                  </label>
                </div>
              )}
            </div>

            {/* ── DIVIDER ── */}
            <div className="border-t-2 border-border/30 my-0" />

            {/* ── SECTION: Financials ── */}
            <div className="py-6">
              <h3 className="text-lg font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                Financials
              </h3>
              {spreadsheetFile ? (
                <div className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-5 py-5">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15">
                      <FileSpreadsheet className="h-6 w-6 text-emerald-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-lg font-semibold truncate">{spreadsheetFile.name}</p>
                      <p className="text-base text-muted-foreground">Financials</p>
                    </div>
                  </div>
                  <button onClick={() => setSpreadsheetFile(null)} className="shrink-0 rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground">
                    <X className="h-5 w-5" />
                  </button>
                </div>
              ) : (
                <div
                  onDrop={(e) => handleDrop(e, "spreadsheet")}
                  onDragOver={handleDragOver}
                  className="group cursor-pointer rounded-xl border-2 border-dashed border-border/50 bg-muted/10 px-5 py-12 text-center transition-all hover:border-emerald-400/40 hover:bg-emerald-500/5"
                >
                  <Upload className="mx-auto mb-4 h-8 w-8 text-muted-foreground/50 transition-colors group-hover:text-emerald-400" />
                  <p className="text-lg font-medium text-muted-foreground">Drop CSV / Excel</p>
                  <label className="mt-2 block cursor-pointer text-base font-medium text-emerald-400 hover:underline">
                    or browse
                    <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={(e) => handleFileSelect(e, "spreadsheet")} />
                  </label>
                </div>
              )}
            </div>

            {/* ── DIVIDER ── */}
            <div className="border-t-2 border-border/30 my-0" />

            {/* ── SECTION: Generate ── */}
            <div className="py-6">
              <h3 className="text-lg font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                <BrainCircuit className="h-5 w-5" />
                Analyze
              </h3>
              <Button
                size="lg"
                className="w-full gap-3 rounded-xl text-lg font-bold py-8 shadow-md shadow-primary/10"
                disabled={!pdfFile || isGenerating}
                onClick={handleGenerate}
              >
                {isGenerating ? (
                  <>
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                    Generating...
                  </>
                ) : (
                  <>
                    <BrainCircuit className="h-6 w-6" />
                    {spreadsheetFile ? "Full Analysis" : pdfFile ? "Quick Analysis" : "Generate Memo"}
                  </>
                )}
              </Button>

              {pdfFile && !isGenerating && !activeMemo && (
                <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-5 py-4 mt-4">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
                  <p className="text-base font-medium text-emerald-400">
                    {spreadsheetFile ? "Ready for full analysis" : "Ready — add CSV for full memo"}
                  </p>
                </div>
              )}
            </div>

            {/* ── SECTION: Deal History ── */}
            {deals.length > 0 && (
              <>
                {/* ── DIVIDER ── */}
                <div className="border-t-2 border-border/30 my-0" />

                <div className="py-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Deals
                    </h3>
                    <Badge variant="outline" className="text-sm px-3 py-1">{deals.length}</Badge>
                  </div>
                  <div className="space-y-3">
                    {deals.map((deal, index) => (
                      <button
                        key={deal.id}
                        onClick={() => setActiveDealIndex(index)}
                        className={`w-full flex items-center justify-between rounded-xl border px-5 py-4 text-left transition-all hover:bg-muted/40 ${
                          activeDealIndex === index
                            ? "border-violet-500/40 bg-violet-500/10"
                            : "border-border/20 bg-transparent"
                        }`}
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-muted/40">
                            <FileText className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-base font-semibold truncate">{deal.companyName}</p>
                            <p className="text-sm text-muted-foreground">
                              {deal.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {deal.mode === "full" ? "Full" : "Pitch"}
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={`shrink-0 text-sm font-bold px-3 py-1 ${
                            deal.verdict === "STRONG BUY" ? "border-emerald-500/40 text-emerald-400"
                              : deal.verdict === "BUY" ? "border-green-500/40 text-green-400"
                              : deal.verdict === "HOLD" ? "border-amber-500/40 text-amber-400"
                              : deal.verdict === "PASS" ? "border-red-500/40 text-red-400"
                              : "border-border/40 text-muted-foreground"
                          }`}
                        >
                          {deal.verdict}
                        </Badge>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Sidebar Footer */}
          <div className="border-t-2 border-border/40 px-6 py-4">
            <p className="text-sm text-muted-foreground/50 text-center">Edinburgh AI Hackathon 2026</p>
          </div>
        </aside>

        {/* ===== CENTER: Tabbed Content ===== */}
        <main className="flex flex-1 flex-col overflow-hidden">
          {/* Tab Bar + Header */}
          <div className="border-b-2 border-border/40">
            {/* Tabs */}
            <div className="flex items-center gap-0 px-10 pt-4">
              <button
                onClick={() => setActiveTab("memo")}
                className={`flex items-center gap-2 px-6 py-3 text-base font-semibold border-b-2 transition-all -mb-[2px] ${
                  activeTab === "memo"
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border/60"
                }`}
              >
                <FileText className="h-5 w-5" />
                Investment Memo
              </button>
              <button
                onClick={() => setActiveTab("gmail")}
                className={`flex items-center gap-2 px-6 py-3 text-base font-semibold border-b-2 transition-all -mb-[2px] ${
                  activeTab === "gmail"
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border/60"
                }`}
              >
                <Mail className="h-5 w-5" />
                Gmail Updates
                {gmailScans.length > 0 && (
                  <Badge variant="outline" className="ml-1 text-xs px-2 py-0.5">{gmailScans.length}</Badge>
                )}
              </button>
            </div>

            {/* Contextual Header */}
            <div className="flex items-center justify-between px-10 py-5">
              {activeTab === "memo" ? (
                <>
                  <div>
                    <h2 className="text-3xl font-bold tracking-tight">
                      {activeDeal ? activeDeal.companyName : "Investment Memo"}
                    </h2>
                    <p className="text-base text-muted-foreground mt-1">
                      {activeDeal
                        ? `${activeDeal.verdict} · ${activeDeal.mode === "full" ? "Full Analysis" : "Pitch-Only Analysis"}`
                        : "Upload a pitch deck to generate a memo"}
                    </p>
                  </div>
                  {deals.length > 0 && !isGenerating && (
                    <Badge variant="outline" className="gap-2 text-base px-4 py-2">
                      {deals.length} deal{deals.length !== 1 ? "s" : ""}
                    </Badge>
                  )}
                </>
              ) : (
                <>
                  <div>
                    <h2 className="text-3xl font-bold tracking-tight">Gmail Updates</h2>
                    <p className="text-base text-muted-foreground mt-1">
                      {gmailConfigured
                        ? `Connected as ${gmailUser} · ${gmailDeals.length} deals found`
                        : "Configure Gmail in .env.local to enable inbox crawling"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      size="lg"
                      className="gap-3 rounded-xl text-base font-bold px-6 py-5"
                      disabled={isCrawling || !gmailConfigured}
                      onClick={handleGmailCrawl}
                    >
                      {isCrawling ? (
                        <>
                          <RefreshCw className="h-5 w-5 animate-spin" />
                          Scanning...
                        </>
                      ) : (
                        <>
                          <Inbox className="h-5 w-5" />
                          Scan Inbox Now
                        </>
                      )}
                    </Button>
                    <Button
                      size="lg"
                      variant={autoScan ? "default" : "outline"}
                      className={`gap-2 rounded-xl text-base font-bold px-5 py-5 ${
                        autoScan
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                          : ""
                      }`}
                      disabled={!gmailConfigured}
                      onClick={() => setAutoScan((prev) => !prev)}
                    >
                      <Timer className={`h-5 w-5 ${autoScan ? "animate-pulse" : ""}`} />
                      {autoScan ? "Auto: ON" : "Auto: OFF"}
                    </Button>
                    {autoScan && (
                      <span className="text-sm text-emerald-400 font-medium">every 2 min</span>
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
                <article className="prose dark:prose-invert prose-xl max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-h1:text-4xl prose-h1:border-b-2 prose-h1:border-border/30 prose-h1:pb-5 prose-h1:mb-8 prose-h2:text-3xl prose-h2:mt-12 prose-h2:mb-5 prose-h3:text-2xl prose-p:text-xl prose-p:leading-relaxed prose-p:text-foreground/90 prose-li:text-xl prose-li:text-foreground/90 prose-strong:text-foreground prose-table:text-lg prose-th:text-left prose-th:p-4 prose-th:bg-muted/50 prose-td:p-4 prose-td:border-t prose-td:border-border/30 prose-hr:border-border/30 prose-blockquote:border-l-violet-500 prose-blockquote:bg-violet-500/5 prose-blockquote:py-2 prose-blockquote:px-8 prose-blockquote:rounded-r-lg prose-code:bg-muted prose-code:px-2 prose-code:py-1 prose-code:rounded prose-code:text-lg prose-code:font-mono">
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
                      <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-6">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/15">
                            <BrainCircuit className="h-5 w-5 text-violet-400" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold">Claude AI — Pitch Deck Analysis</h3>
                            <p className="text-base text-muted-foreground">Extracted structured data from the uploaded PDF</p>
                          </div>
                        </div>
                        {activeDeal.sourceData.pitchData ? (
                          <div className="grid grid-cols-2 gap-4 mt-4">
                            <div className="rounded-lg bg-background/50 px-4 py-3">
                              <p className="text-sm font-medium text-muted-foreground">Company</p>
                              <p className="text-lg font-semibold">{activeDeal.sourceData.pitchData.companyName}</p>
                            </div>
                            <div className="rounded-lg bg-background/50 px-4 py-3">
                              <p className="text-sm font-medium text-muted-foreground">Sector</p>
                              <p className="text-lg font-semibold">{activeDeal.sourceData.pitchData.sector || "N/A"}</p>
                            </div>
                            <div className="rounded-lg bg-background/50 px-4 py-3">
                              <p className="text-sm font-medium text-muted-foreground">Stage</p>
                              <p className="text-lg font-semibold">{activeDeal.sourceData.pitchData.stage || "N/A"}</p>
                            </div>
                            <div className="rounded-lg bg-background/50 px-4 py-3">
                              <p className="text-sm font-medium text-muted-foreground">Competitors Identified</p>
                              <p className="text-lg font-semibold">{activeDeal.sourceData.pitchData.mainCompetitors?.join(", ") || "None"}</p>
                            </div>
                          </div>
                        ) : (
                          <p className="text-base text-muted-foreground/60 italic">Pitch data not available</p>
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
                                  <th className="pb-3 pr-4 text-sm font-semibold text-muted-foreground">Ticker</th>
                                  <th className="pb-3 pr-4 text-sm font-semibold text-muted-foreground">Company</th>
                                  <th className="pb-3 pr-4 text-sm font-semibold text-muted-foreground">Price</th>
                                  <th className="pb-3 pr-4 text-sm font-semibold text-muted-foreground">Market Cap</th>
                                  <th className="pb-3 pr-4 text-sm font-semibold text-muted-foreground">P/E</th>
                                  <th className="pb-3 text-sm font-semibold text-muted-foreground">52W Range</th>
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
                                  <th className="pb-3 pr-4 text-sm font-semibold text-muted-foreground">Ticker</th>
                                  <th className="pb-3 pr-4 text-sm font-semibold text-muted-foreground">Annual Revenue</th>
                                  <th className="pb-3 pr-4 text-sm font-semibold text-muted-foreground">Net Income</th>
                                  <th className="pb-3 pr-4 text-sm font-semibold text-muted-foreground">Revenue Growth</th>
                                  <th className="pb-3 text-sm font-semibold text-muted-foreground">EPS</th>
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
                <>
                <div className="flex flex-col items-center text-center mb-12">
                  <div className="mb-6 rounded-2xl bg-muted/30 p-6">
                    <FileText className="h-12 w-12 text-muted-foreground/30" />
                  </div>
                  <h3 className="text-3xl font-bold text-foreground/80">No memo yet</h3>
                  <p className="mt-4 max-w-md text-lg leading-relaxed text-muted-foreground">
                    Upload a pitch deck on the left, then click Generate to create your investment memo.
                  </p>
                  <div className="mt-8 flex items-center gap-8 text-base text-muted-foreground/40">
                    <div className="flex items-center gap-2.5">
                      <Shield className="h-5 w-5" />
                      Secure
                    </div>
                    <div className="flex items-center gap-2.5">
                      <TrendingUp className="h-5 w-5" />
                      Real-time
                    </div>
                    <div className="flex items-center gap-2.5">
                      <BrainCircuit className="h-5 w-5" />
                      AI-powered
                    </div>
                  </div>
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

                  <div className="grid gap-5">
                    {/* Yahoo Finance */}
                    <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/15">
                          <BarChart3 className="h-5 w-5 text-blue-400" />
                        </div>
                        <div>
                          <h4 className="text-lg font-bold">Yahoo Finance</h4>
                          <p className="text-sm text-muted-foreground">Real-time market quotes</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { label: "Company Name & Sector", desc: "Industry classification" },
                          { label: "Current Stock Price", desc: "Live market price" },
                          { label: "Market Cap", desc: "e.g. $2.1T" },
                          { label: "P/E Ratio", desc: "Trailing, e.g. 32.5x" },
                          { label: "Revenue Growth", desc: "Percentage change" },
                          { label: "52-Week Range", desc: "Price high / low" },
                        ].map((item) => (
                          <div key={item.label} className="rounded-lg bg-background/50 px-4 py-3">
                            <p className="text-sm font-semibold">{item.label}</p>
                            <p className="text-xs text-muted-foreground">{item.desc}</p>
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
                          <p className="text-sm text-muted-foreground">Income statement fundamentals</p>
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
                            <p className="text-sm font-semibold">{item.label}</p>
                            <p className="text-xs text-muted-foreground">{item.desc}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Claude AI */}
                    <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/15">
                          <BrainCircuit className="h-5 w-5 text-violet-400" />
                        </div>
                        <div>
                          <h4 className="text-lg font-bold">Claude AI (Sonnet)</h4>
                          <p className="text-sm text-muted-foreground">Pitch deck parsing &amp; memo generation</p>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Extracts company name, product, sector, competitors (as tickers), TAM, funding ask, team highlights, and key metrics. Then combines all data sources into a structured investment memo with a BUY / HOLD / PASS verdict.
                      </p>
                    </div>
                  </div>
                </div>
                </>
              )}
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
                <div className="rounded-xl border border-border/30 bg-card/50 p-5">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/15">
                      <Mail className="h-5 w-5 text-blue-400" />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Scans</p>
                  </div>
                  <p className="text-3xl font-bold">{gmailScans.length}</p>
                </div>
                <div className="rounded-xl border border-border/30 bg-card/50 p-5">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/15">
                      <CheckCircle className="h-5 w-5 text-emerald-400" />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Deals Found</p>
                  </div>
                  <p className="text-3xl font-bold">{gmailDeals.length}</p>
                </div>
                <div className="rounded-xl border border-border/30 bg-card/50 p-5">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/15">
                      <Inbox className="h-5 w-5 text-violet-400" />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Gmail</p>
                  </div>
                  <p className="text-lg font-bold truncate">{gmailConfigured ? gmailUser : "Not configured"}</p>
                </div>
              </div>

              {/* Scan History */}
              <div className="mb-8">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  Scan History
                </h3>
                {gmailScans.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border/40 bg-muted/10 p-10 text-center">
                    <Mail className="mx-auto h-10 w-10 text-muted-foreground/30 mb-4" />
                    <p className="text-lg font-medium text-muted-foreground/60">No scans yet</p>
                    <p className="text-base text-muted-foreground/40 mt-2">
                      Click &quot;Scan Inbox Now&quot; to crawl your Gmail for pitch decks
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
                                    <div key={email.uid} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm">
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
                      <div key={deal.filename} className="rounded-xl border border-border/20 bg-card/30 p-5">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-lg font-bold">{deal.companyName}</h4>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-sm">{deal.sector}</Badge>
                            <Badge
                              variant="outline"
                              className={`text-sm font-bold ${
                                deal.verdict === "STRONG BUY" ? "border-emerald-500/40 text-emerald-400"
                                  : deal.verdict === "BUY" ? "border-green-500/40 text-green-400"
                                  : deal.verdict === "HOLD" ? "border-amber-500/40 text-amber-400"
                                  : deal.verdict === "PASS" ? "border-red-500/40 text-red-400"
                                  : "border-border/40 text-muted-foreground"
                              }`}
                            >
                              {deal.verdict}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-base text-muted-foreground">{deal.summary}</p>
                        <p className="text-sm text-muted-foreground/50 mt-2">
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
        </main>

        {/* ===== RIGHT SIDEBAR: Chatbot ===== */}
        <aside className={`flex w-[440px] shrink-0 flex-col border-l-2 border-border/50 bg-card/20 transition-all ${activeDeal && activeMemo ? "" : "hidden xl:flex"}`}>
          {activeDeal && activeMemo ? (
            <>
              {/* Chat Header */}
              <div className="flex items-center gap-4 border-b-2 border-border/40 px-6 py-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/15">
                  <MessageCircle className="h-6 w-6 text-violet-400" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-bold truncate">Ask about {activeDeal.companyName}</h3>
                  <p className="text-base text-muted-foreground">AI-powered Q&A on this deal</p>
                </div>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {(!activeDeal.chatHistory || activeDeal.chatHistory.length === 0) && !isChatting && (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="mb-5 rounded-full bg-violet-500/10 p-5">
                      <Bot className="h-10 w-10 text-violet-400/50" />
                    </div>
                    <p className="text-lg font-medium text-muted-foreground/60">
                      Ask anything about<br />{activeDeal.companyName}
                    </p>
                    <div className="mt-6 flex flex-wrap justify-center gap-3">
                      {["Key risks?", "Market size?", "Should I invest?"].map((q) => (
                        <button
                          key={q}
                          onClick={() => { setChatInput(q); }}
                          className="rounded-full border border-border/40 bg-muted/20 px-5 py-2.5 text-base text-muted-foreground transition-colors hover:bg-violet-500/10 hover:text-violet-400 hover:border-violet-500/30"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {activeDeal.chatHistory?.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {msg.role === "assistant" && (
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-500/15">
                        <Bot className="h-5 w-5 text-violet-400" />
                      </div>
                    )}
                    <div
                      className={`max-w-[85%] rounded-2xl px-5 py-4 text-base leading-relaxed ${
                        msg.role === "user"
                          ? "bg-violet-600 text-white"
                          : "bg-muted/40 text-foreground"
                      }`}
                    >
                      {msg.role === "assistant" ? (
                        <div className="prose dark:prose-invert prose-base max-w-none prose-p:my-1.5 prose-p:text-base prose-p:leading-relaxed prose-li:text-base">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        msg.content
                      )}
                    </div>
                    {msg.role === "user" && (
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted/40">
                        <User className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                ))}
                {isChatting && (
                  <div className="flex gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-500/15">
                      <Bot className="h-5 w-5 text-violet-400" />
                    </div>
                    <div className="flex items-center gap-2 rounded-2xl bg-muted/40 px-5 py-4">
                      <span className="h-2 w-2 animate-bounce rounded-full bg-violet-400" style={{ animationDelay: "0ms" }} />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-violet-400" style={{ animationDelay: "150ms" }} />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-violet-400" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <div className="border-t-2 border-border/40 p-6">
                <form
                  onSubmit={(e) => { e.preventDefault(); handleChat(); }}
                  className="flex gap-3"
                >
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask a question..."
                    className="flex-1 rounded-xl border border-border/40 bg-muted/10 px-5 py-4 text-lg text-foreground placeholder:text-muted-foreground/40 focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/20"
                    disabled={isChatting}
                  />
                  <Button
                    type="submit"
                    size="lg"
                    className="gap-2 rounded-xl px-5 py-4"
                    disabled={!chatInput.trim() || isChatting}
                  >
                    <Send className="h-5 w-5" />
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
              <div className="mb-4 rounded-full bg-muted/20 p-5">
                <MessageCircle className="h-8 w-8 text-muted-foreground/20" />
              </div>
              <h3 className="text-lg font-semibold text-muted-foreground/40">Deal Assistant</h3>
              <p className="mt-3 text-base leading-relaxed text-muted-foreground/30">
                Generate a memo to start<br />chatting about the deal
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
