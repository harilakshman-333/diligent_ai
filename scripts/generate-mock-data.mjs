#!/usr/bin/env node
/**
 * Generate mock pitch deck PDF + financials CSV for NexaRobotics
 * A Series B surgical robotics startup.
 *
 * Competitors (real public tickers for Yahoo Finance / Alpha Vantage):
 *   ISRG - Intuitive Surgical
 *   ROK  - Rockwell Automation
 *   ABB  - ABB Ltd
 */

import PDFDocument from "pdfkit";
import { createWriteStream, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "public", "mock-data");
mkdirSync(outDir, { recursive: true });

// ─────────────────────────────────────────────
// 1. Pitch Deck PDF
// ─────────────────────────────────────────────

function generatePitchDeck() {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 60 });
    const pdfPath = join(outDir, "NexaRobotics_PitchDeck.pdf");
    const stream = createWriteStream(pdfPath);
    doc.pipe(stream);

    const blue = "#1e40af";
    const dark = "#1e293b";
    const gray = "#64748b";

    // ── Cover ──
    doc.fontSize(36).fillColor(blue).text("NexaRobotics", { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(16).fillColor(gray).text("Adaptive Surgical Robotics for the Next Generation", { align: "center" });
    doc.moveDown(0.3);
    doc.fontSize(12).fillColor(dark).text("Series B Pitch Deck  •  June 2025  •  Confidential", { align: "center" });
    doc.moveDown(3);

    // ── Company Overview ──
    doc.fontSize(22).fillColor(blue).text("Company Overview");
    doc.moveDown(0.5);
    doc.fontSize(11).fillColor(dark).text(
      "NexaRobotics is building AI-powered surgical robotic systems that enable minimally invasive procedures " +
      "with sub-millimetre precision. Our flagship product, the NexaSurgeon™ platform, combines real-time " +
      "computer vision, haptic feedback, and reinforcement-learning-based motion planning to assist surgeons " +
      "in orthopaedic, cardiac, and neurosurgical procedures.\n\n" +
      "Founded in 2021 by a team of robotics PhDs from MIT and surgeons from Massachusetts General Hospital, " +
      "NexaRobotics has received FDA 510(k) clearance for its orthopaedic module and is in clinical trials " +
      "for cardiac applications."
    );
    doc.moveDown(1.5);

    // ── Sector & Market ──
    doc.fontSize(22).fillColor(blue).text("Market Opportunity");
    doc.moveDown(0.5);
    doc.fontSize(11).fillColor(dark).text(
      "Sector: Medical Robotics / HealthTech\n\n" +
      "Total Addressable Market (TAM): $75B by 2030\n" +
      "Serviceable Addressable Market (SAM): $18B (surgical robotics segment)\n" +
      "Serviceable Obtainable Market (SOM): $2.4B (orthopaedic + cardiac sub-segments)\n\n" +
      "The global surgical robotics market is projected to grow at 17.4% CAGR from 2024-2030, " +
      "driven by an ageing population, surgeon shortages, and demand for precision minimally " +
      "invasive surgery."
    );
    doc.moveDown(1.5);

    // ── Competitive Landscape ──
    doc.addPage();
    doc.fontSize(22).fillColor(blue).text("Competitive Landscape");
    doc.moveDown(0.5);
    doc.fontSize(11).fillColor(dark).text(
      "Our main competitors include:\n\n" +
      "• Intuitive Surgical (ISRG) — da Vinci system, dominant in general surgery. Market cap ~$180B. " +
      "However, their platform lacks AI-native motion planning and costs $2M+ per unit.\n\n" +
      "• Rockwell Automation (ROK) — Industrial robotics leader expanding into medical. Strong in " +
      "manufacturing automation but limited surgical domain expertise.\n\n" +
      "• ABB Ltd (ABB) — Global robotics and automation. Primarily industrial, but their collaborative " +
      "robot (cobot) technology is being adapted for surgical assistance.\n\n" +
      "NexaRobotics differentiates through:\n" +
      "  1. AI-first architecture with real-time learning during procedures\n" +
      "  2. 60% lower unit cost ($800K vs $2M+)\n" +
      "  3. Modular design — same platform for ortho, cardiac, neuro\n" +
      "  4. Haptic feedback with sub-millimetre force sensing"
    );
    doc.moveDown(1.5);

    // ── Traction & Metrics ──
    doc.fontSize(22).fillColor(blue).text("Traction & Key Metrics");
    doc.moveDown(0.5);
    doc.fontSize(11).fillColor(dark).text(
      "• Annual Recurring Revenue (ARR): $12.4M (up from $3.1M in 2023 — 300% YoY growth)\n" +
      "• Procedures completed: 2,800+ across 14 hospital systems\n" +
      "• Gross Margin: 72%\n" +
      "• Net Revenue Retention: 145%\n" +
      "• Pipeline: $47M in signed LOIs from 23 additional hospital networks\n" +
      "• Clinical outcomes: 34% reduction in surgical complications vs. manual procedures\n" +
      "• FDA 510(k) cleared for orthopaedic module; cardiac module in Phase II trials"
    );
    doc.moveDown(1.5);

    // ── Team ──
    doc.fontSize(22).fillColor(blue).text("Founding Team");
    doc.moveDown(0.5);
    doc.fontSize(11).fillColor(dark).text(
      "• Dr. Sarah Chen, CEO — PhD Robotics (MIT), former Principal Engineer at Boston Dynamics. " +
      "15 years in robotic systems design.\n\n" +
      "• Dr. James Okafor, CTO — PhD Computer Science (Stanford), ex-Google DeepMind. " +
      "Led reinforcement learning research for robotic manipulation.\n\n" +
      "• Dr. Priya Sharma, CMO — MD (Harvard Medical School), 20 years cardiac surgery at Mass General. " +
      "Published 85+ peer-reviewed papers on surgical innovation.\n\n" +
      "• Marcus Torres, VP Engineering — MS Mechanical Engineering (Caltech), ex-Intuitive Surgical. " +
      "Built da Vinci's next-gen instrument tracking system."
    );
    doc.moveDown(1.5);

    // ── Funding Ask ──
    doc.addPage();
    doc.fontSize(22).fillColor(blue).text("Series B — $65M Raise");
    doc.moveDown(0.5);
    doc.fontSize(11).fillColor(dark).text(
      "Raising: $65M Series B at $420M pre-money valuation\n\n" +
      "Use of Funds:\n" +
      "• 40% — R&D: Complete cardiac module trials, begin neuro module development\n" +
      "• 25% — Commercial expansion: Scale sales team from 12 to 45, enter EU market\n" +
      "• 20% — Manufacturing: Build dedicated assembly facility in Boston\n" +
      "• 15% — G&A and working capital\n\n" +
      "Previous Funding:\n" +
      "• Seed: $4M (2021) — led by Khosla Ventures\n" +
      "• Series A: $22M (2023) — led by Andreessen Horowitz, with Lux Capital\n\n" +
      "Target Investors: Growth-stage healthcare/deep-tech funds\n" +
      "Expected Close: Q3 2025"
    );
    doc.moveDown(1.5);

    // ── Financial Projections ──
    doc.fontSize(22).fillColor(blue).text("Financial Projections");
    doc.moveDown(0.5);
    doc.fontSize(11).fillColor(dark).text(
      "                    2023A      2024A      2025E      2026E      2027E\n" +
      "Revenue ($M)         3.1       12.4       38.0       95.0      210.0\n" +
      "Gross Margin          68%        72%        74%        76%        78%\n" +
      "EBITDA ($M)         (8.2)      (5.1)       2.8       28.5       75.6\n" +
      "Headcount              32         78        145        280        450\n\n" +
      "Path to profitability expected in Q2 2025. Targeting $1B+ revenue by 2029."
    );
    doc.moveDown(2);

    doc.fontSize(10).fillColor(gray).text(
      "NexaRobotics Inc.  •  245 Innovation Drive, Cambridge, MA 02142  •  hello@nexarobotics.ai",
      { align: "center" }
    );

    doc.end();
    stream.on("finish", () => {
      console.log(`✅ Pitch deck PDF created: ${pdfPath}`);
      resolve(pdfPath);
    });
    stream.on("error", reject);
  });
}

// ─────────────────────────────────────────────
// 2. Financial Spreadsheet (CSV)
// ─────────────────────────────────────────────

function generateFinancials() {
  const csvPath = join(outDir, "NexaRobotics_Financials.csv");

  const header = [
    "Period", "Revenue ($K)", "COGS ($K)", "Gross Profit ($K)", "Gross Margin (%)",
    "R&D ($K)", "Sales & Marketing ($K)", "G&A ($K)", "Total OpEx ($K)",
    "EBITDA ($K)", "Net Income ($K)", "Cash ($K)", "Headcount",
    "Procedures Completed", "Avg Revenue Per Procedure ($K)"
  ];

  const rows = [
    ["Q1 2023","420","134","286","68.1","980","310","220","1510","-1224","-1340","18200","28","85","4.9"],
    ["Q2 2023","580","186","394","67.9","1020","340","230","1590","-1196","-1310","16890","30","120","4.8"],
    ["Q3 2023","890","276","614","69.0","1100","380","240","1720","-1106","-1220","15670","33","190","4.7"],
    ["Q4 2023","1210","375","835","69.0","1150","420","250","1820","-985","-1098","14572","38","265","4.6"],
    ["Q1 2024","1840","515","1325","72.0","1200","480","270","1950","-625","-738","13834","48","380","4.8"],
    ["Q2 2024","2650","742","1908","72.0","1280","560","290","2130","-222","-330","21504","58","520","5.1"],
    ["Q3 2024","3480","940","2540","73.0","1350","640","310","2300","240","128","21632","68","680","5.1"],
    ["Q4 2024","4430","1152","3278","74.0","1400","720","330","2450","828","710","22342","78","870","5.1"],
    ["Q1 2025E","6200","1612","4588","74.0","1500","850","350","2700","1888","1620","23962","95","1150","5.4"],
    ["Q2 2025E","8400","2184","6216","74.0","1600","960","370","2930","3286","2850","26812","110","1480","5.7"],
    ["Q3 2025E","11000","2860","8140","74.0","1700","1100","390","3190","4950","4350","31162","125","1820","6.0"],
    ["Q4 2025E","12400","3224","9176","74.0","1800","1200","410","3410","5766","5100","36262","145","2050","6.0"],
  ];

  const csv = [header.join(","), ...rows.map(r => r.join(","))].join("\n");
  writeFileSync(csvPath, csv);
  console.log(`✅ Financials CSV created: ${csvPath}`);
  return csvPath;
}

// ── Run ──
async function main() {
  await generatePitchDeck();
  generateFinancials();
  console.log("\n🎉 Mock data ready in public/mock-data/");
  console.log("   → NexaRobotics_PitchDeck.pdf");
  console.log("   → NexaRobotics_Financials.csv");
}

main().catch(console.error);
