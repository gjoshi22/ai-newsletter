import { generatedArticles } from "@/generated/articles";
import { getContentDateTime } from "@/lib/date";

export type ArticleCategory = "News" | "Resources";
export type ArticleSubCategory = "Development" | "Design";

export interface Article {
  id: string;
  title: string;
  slug: string;
  date: string;
  category: ArticleCategory;
  subCategory: ArticleSubCategory;
  excerpt: string;
  isNew?: boolean;
  asciiType: number;
  image?: string;
  tags?: string[];
  status?: "draft" | "published" | "archived";
  body?: string;
  readingTime?: number;
  sourceUrl?: string;
  authorName?: string;
  showAuthor?: boolean;
}

const fallbackArticles: Article[] = [
  {
    id: "1",
    slug: "gpt-5-architecture-leaked-benchmarks",
    title: "GPT-5 Architecture: What the Leaked Benchmarks Actually Mean",
    date: "2025-05-14",
    category: "News",
    subCategory: "Development",
    excerpt: "Forget the hype. Here is what the parameter count and MoE routing actually mean for production latency and inference cost at scale.",
    isNew: true,
    asciiType: 1,
  },
  {
    id: "2",
    slug: "ai-native-design-systems",
    title: "AI-Native Design Systems: Figma Meets the Model",
    date: "2025-05-10",
    category: "News",
    subCategory: "Design",
    excerpt: "Design tokens are dead. How the next generation of interfaces will be generated at runtime, and what that means for the role of the designer.",
    isNew: true,
    asciiType: 5,
  },
  {
    id: "3",
    slug: "rag-implementation-checklist",
    title: "The Definitive RAG Implementation Checklist",
    date: "2025-05-02",
    category: "Resources",
    subCategory: "Development",
    excerpt: "Stop building toy retrieval apps. This is the 40-point checklist used by top AI engineering teams before shipping retrieval pipelines to production.",
    isNew: true,
    asciiType: 7,
  },
  {
    id: "4",
    slug: "ai-assisted-prototyping-workflow",
    title: "AI-Assisted Prototyping: A Workflow That Actually Works",
    date: "2025-04-28",
    category: "Resources",
    subCategory: "Design",
    excerpt: "Rough sketch to functional prototype in under 2 hours using Claude, v0, and raw CSS. My exact workflow, with no fluff.",
    asciiType: 6,
  },
  {
    id: "5",
    slug: "hidden-cost-of-rag",
    title: "The Hidden Cost of RAG: Memory, Latency, and When to Skip It",
    date: "2025-04-15",
    category: "News",
    subCategory: "Development",
    excerpt: "Everyone reaches for RAG first. Here is the math on why that is often a mistake, and when long-context windows win on total cost.",
    asciiType: 4,
  },
  {
    id: "6",
    slug: "copilot-workspace-review",
    title: "When Your AI Writes the CSS: Copilot Workspace Review",
    date: "2025-04-05",
    category: "News",
    subCategory: "Design",
    excerpt: "A brutally honest review of building a design system entirely within Copilot Workspace. The good, the bad, and the hallucinated z-indexes.",
    asciiType: 2,
  },
  {
    id: "7",
    slug: "prompt-engineering-patterns",
    title: "Prompt Engineering Patterns: A Field Guide",
    date: "2025-03-22",
    category: "Resources",
    subCategory: "Development",
    excerpt: "A structured taxonomy of the 12 prompt patterns that actually matter for system instructions. Chain-of-thought is just the beginning.",
    asciiType: 9,
  },
  {
    id: "8",
    slug: "anthropic-constitutional-ai-v2",
    title: "Anthropic Constitutional AI v2: A Technical Breakdown",
    date: "2025-03-10",
    category: "News",
    subCategory: "Development",
    excerpt: "Deconstructing the paper. How Claude's safety architecture manages to reduce refusals while maintaining boundary adherence across adversarial prompts.",
    asciiType: 1,
  },
  {
    id: "9",
    slug: "design-tokens-for-llm-interfaces",
    title: "Design Tokens for LLM Interfaces",
    date: "2025-02-28",
    category: "Resources",
    subCategory: "Design",
    excerpt: "Standardizing how we talk about streaming states, generation errors, and thinking indicators. A token system for the AI-native UI era.",
    asciiType: 3,
  },
  {
    id: "10",
    slug: "llm-fine-tuning-2025",
    title: "LLM Fine-Tuning in 2025: LoRA vs Full vs GRPO",
    date: "2025-02-14",
    category: "News",
    subCategory: "Development",
    excerpt: "A comparative benchmark of fine-tuning techniques on Llama 3 8B. Spoiler: GRPO is changing the economics of alignment.",
    asciiType: 10,
  },
  {
    id: "11",
    slug: "production-llm-pipelines-langgraph",
    title: "Building Production LLM Pipelines with LangGraph",
    date: "2025-01-30",
    category: "Resources",
    subCategory: "Development",
    excerpt: "Moving beyond simple chains. A guide to building stateful, multi-actor agent systems that actually hold up in production.",
    asciiType: 7,
  },
  {
    id: "12",
    slug: "typography-generative-ui",
    title: "Typography in the Age of Generative UI",
    date: "2025-01-12",
    category: "News",
    subCategory: "Design",
    excerpt: "When the interface can be anything, typography becomes the only constant. Why monospace and brutalist design are dominating AI-native tools.",
    asciiType: 8,
  },
  {
    id: "13",
    slug: "evaluating-llm-outputs",
    title: "Evaluating LLM Outputs: A Statistical Approach",
    date: "2024-12-05",
    category: "Resources",
    subCategory: "Development",
    excerpt: "Vibes are not a metric. How to build rigorous, automated evaluation pipelines for your language models using statistical methods.",
    asciiType: 4,
  },
  {
    id: "14",
    slug: "death-of-chat-interface",
    title: "The Death of the Chat Interface",
    date: "2024-11-20",
    category: "News",
    subCategory: "Design",
    excerpt: "Chat is the command line of the AI era — powerful but primitive. A look at the next generation of ambient and canvas-based interactions.",
    asciiType: 5,
  },
  {
    id: "15",
    slug: "local-models-apple-silicon",
    title: "Local Models on Apple Silicon: A Setup Guide",
    date: "2024-11-02",
    category: "Resources",
    subCategory: "Development",
    excerpt: "Squeezing every drop of performance out of MLX and Llama.cpp on M3 Max for local inference without cloud costs.",
    asciiType: 3,
  },
];

const generatedSlugs = new Set(generatedArticles.map((article) => article.slug));
export const articles: Article[] = [
  ...generatedArticles,
  ...fallbackArticles.filter((article) => !generatedSlugs.has(article.slug)),
].sort((a, b) => getContentDateTime(b.date) - getContentDateTime(a.date));

// ─── ASCII ART LIBRARY ────────────────────────────────────────────────────────
// Each piece is exactly 10 lines, using consistent 28-char width

export const asciiArts: string[] = [

  // 1 — Neural Network
  `   ●───●───●
   │╲  │╲  │╲
   │ ╲ │ ╲ │ ╲
   ●───●───●───●
   │╲  │╲  │╲  │
   │ ╲ │ ╲ │ ╲ │
   ●───●───●───●
   │╲  │╲  │╲
   ╰───╰───╰──▸out`,

  // 2 — Terminal Session
  `╭─────────────────────╮
│ $ xd-ai --model=gpt │
│ > loading context.. │
│ > tokens: 8192 / ok │
│ > ██████████ 100%   │
│ > inference: 312ms  │
│                     │
│ response ready ▸    │
╰─────────────────────╯`,

  // 3 — Circuit Board
  `┌──◯──┐  ┌──◯──┐
│      │  │      │
◯  ▣   ┼──┼   ▣  ◯
│      │  │      │
└──┬───┘  └───┬──┘
   │           │
   ├──▣──┬──▣──┤
   │     │     │
   ◯     ◯     ◯`,

  // 4 — Data Stream
` ┊  1  0  1  1  0  ┊
 ┊  ↓  ↓  ↓  ↓  ↓  ┊
 ┊ [embed vectors]  ┊
 ┊        ↓         ┊
 ┊  ┌──────────┐    ┊
 ┊  │ kNN rank │    ┊
 ┊  └────┬─────┘    ┊
 ┊       ↓          ┊
 ┊  [top-k chunks]  ┊`,

  // 5 — AI Face
`     ╔═══════════╗
     ║  ◉     ◉  ║
     ║           ║
     ║  ───────  ║
     ║  ⎸ ≈≈≈ ⎸  ║
     ║  ───────  ║
     ╚═════╤═════╝
           │
      ╔════╧════╗
      ║  model  ║`,

  // 6 — Code Window
`┌──[  main.ts  ]────┐
│                    │
│  const llm = new   │
│    LLMPipeline({   │
│      ctx: 128_000, │
│      temp: 0.7,    │
│    });             │
│                    │
│  ▸ compiled  ✓     │
└────────────────────┘`,

  // 7 — Data Pipeline
`  ╔═[SOURCE]═╗
  ║  .jsonl   ║
  ╚═════╤═════╝
        │ chunk
        ▼
  ╔═[EMBED]══╗
  ║  ada-003  ║
  ╚═════╤═════╝
        │ index
        ▼
  ╔═[VECTOR]═╗
  ║  pgvector ║`,

  // 8 — Radar
`    ·  ·  ·  ·  ·
  ·   ╭────────╮  ·
  ·   │ ╲   ╱  │  ·
  ·   │  ╲ ╱   │  ·
  ·   │  (●)   │  ·
  ·   │  ╱ ╲   │  ·
  ·   ╰────────╯  ·
    ·  ·  ·  ·  ·`,

  // 9 — Binary Tree
`      ╔═[root]═╗
      ║  score  ║
      ╚═══╤══╤══╝
        ╱     ╲
  ╔══[L]══╗  ╔══[R]══╗
  ║ ≤ 0.5 ║  ║ > 0.5 ║
  ╚═══╤═══╝  ╚═══╤═══╝
    ╱   ╲       leaf
 [LL]  [LR]`,

  // 10 — Waveform
`  amplitude
  │  ╭─╮      ╭─╮
  │ ╱   ╲    ╱   ╲
  │╱     ╲  ╱     ╲
──┼────────╲╱───────▸ t
  │                
  │        ╭──╮
  │       ╱    ╲
  │──────╱──────▸
  └──────────── 0`,
];

export function getAsciiArt(index: number): string {
  return asciiArts[(index - 1) % asciiArts.length];
}
