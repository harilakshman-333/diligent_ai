import { genAI } from "./gemini";

export type FounderProfile = {
  name: string;
  linkedinSummary: string;
  priorVentures: string[];
  notableAchievements: string[];
  redFlags: string[];
  overallAssessment: "green" | "yellow" | "red";
};

export type CompanyRegistryCheck = {
  companiesHouse: string;
  secEdgar: string;
  incorporationStatus: string;
  filingFlags: string[];
};

export type FounderIntelResult = {
  founders: FounderProfile[];
  companyCheck: CompanyRegistryCheck;
  adverseMedia: string[];
  inconsistencies: string[];
  overallRiskLevel: "low" | "medium" | "high";
  summary: string;
  sources: string[];
};

/**
 * Run "Founder Intel" enrichment using Gemini with Google Search grounding.
 *
 * Searches the web for founder backgrounds, prior ventures,
 * adverse media, and cross-references against public registries.
 */
export async function runFounderIntel(
  companyName: string,
  teamHighlights: string,
  sector: string
): Promise<FounderIntelResult> {
  // Use Gemini with Google Search grounding tool
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    tools: [{ googleSearch: {} } as never],
  });

  const result = await model.generateContent({
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `You are a VC due diligence analyst performing a "Founder Intel" background check. Use web search extensively to research the following startup and its founders.

## TARGET COMPANY
- Company Name: ${companyName}
- Sector: ${sector}
- Team Info from Pitch Deck: ${teamHighlights}

## YOUR INVESTIGATION TASKS

### 1. Founder Background Checks
For each founder mentioned in the team info:
- Search for their professional history, LinkedIn profiles, and prior companies
- Look for news articles about them (positive AND negative)
- Check for prior startup outcomes (exits, failures, shutdowns)
- Look for any investor disputes, lawsuits, or regulatory issues

### 2. Company Registry Verification  
- Search Companies House (UK) for "${companyName}" incorporation status and filing history
- Search SEC EDGAR (US) for any "${companyName}" filings
- Check if the company is actually registered where the deck claims

### 3. Adverse Media Screening
- Search for "${companyName}" + fraud, lawsuit, controversy, complaint
- Search for each founder name + scandal, dispute, investigation
- Look for Glassdoor or employee complaints about the company

### 4. Consistency Check
- Compare what the pitch deck claims about the team vs. what public records show
- Flag any discrepancies in titles, roles, prior experience, or company history

---

After completing your research, return ONLY valid JSON (no markdown, no code fences) in this format:

{
  "founders": [
    {
      "name": "Founder Name",
      "linkedinSummary": "Brief career history from public sources",
      "priorVentures": ["Company A (acquired 2020)", "Company B (shut down 2018)"],
      "notableAchievements": ["Forbes 30 Under 30", "Published 3 patents"],
      "redFlags": ["Company B had investor dispute in 2019"],
      "overallAssessment": "green|yellow|red"
    }
  ],
  "companyCheck": {
    "companiesHouse": "Found/Not found — registration details or N/A",
    "secEdgar": "Found/Not found — filing details or N/A",
    "incorporationStatus": "Active/Dissolved/Not found/Verified",
    "filingFlags": ["Any concerning filing patterns"]
  },
  "adverseMedia": ["List of concerning articles or media mentions found"],
  "inconsistencies": ["List of discrepancies between deck claims and public records"],
  "overallRiskLevel": "low|medium|high",
  "summary": "2-3 sentence executive summary of founder/company background check findings",
  "sources": ["URLs of key sources used in the investigation"]
}

Guidelines:
- "green" = clean background, verified claims, strong track record
- "yellow" = some gaps or minor concerns, needs follow-up
- "red" = serious red flags found (fraud, disputes, false claims)
- If you cannot find information about a founder, flag that as a yellow concern (unverifiable claims)
- Be thorough but fair — not finding negative info is a good sign
- Include actual URLs in the sources array`,
          },
        ],
      },
    ],
    generationConfig: { maxOutputTokens: 4096 },
  });

  const resultText = result.response.text();

  // Parse the JSON response
  const cleaned = resultText
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();

  try {
    return JSON.parse(cleaned) as FounderIntelResult;
  } catch {
    // If Gemini didn't return clean JSON, build a minimal result
    return {
      founders: [],
      companyCheck: {
        companiesHouse: "Unable to verify",
        secEdgar: "Unable to verify",
        incorporationStatus: "Unknown",
        filingFlags: [],
      },
      adverseMedia: [],
      inconsistencies: [],
      overallRiskLevel: "medium",
      summary: resultText.slice(0, 500) || "Founder intel check could not be completed.",
      sources: [],
    };
  }
}
