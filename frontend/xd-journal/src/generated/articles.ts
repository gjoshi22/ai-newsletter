import type { Article } from "@/lib/data";

export const generatedArticles = [
  {
    "id": "gpt-5-architecture-leaked-benchmarks",
    "slug": "gpt-5-architecture-leaked-benchmarks",
    "title": "GPT-5 Architecture: What the Leaked Benchmarks Actually Mean",
    "date": "2025-05-14",
    "category": "News",
    "subCategory": "Development",
    "excerpt": "Forget the hype. Here is what the parameter count and MoE routing actually mean for production latency and inference cost at scale.",
    "isNew": true,
    "asciiType": 1,
    "tags": [
      "models",
      "benchmarks",
      "inference"
    ],
    "status": "published",
    "body": "The useful question is not whether the benchmark number is impressive. The useful question is what kind of system behavior it implies when the model is asked to do real production work.\n\nFor engineering teams, the biggest signal is routing. If the architecture leans harder on sparse expert activation, then latency, memory pressure, and batch economics matter more than the headline parameter count.\n\nWatch the second-order effects:\n\n- Does quality improve consistently across long-context tasks?\n- Does tool use become more reliable under noisy instructions?\n- Does inference cost scale predictably at peak traffic?\n- Does the model hold up when the prompt is full of product-specific constraints?\n\nThe benchmark leak is interesting. The deployment math is the part worth caring about.",
    "readingTime": 1
  },
  {
    "id": "ai-native-design-systems",
    "slug": "ai-native-design-systems",
    "title": "AI-Native Design Systems: Figma Meets the Model",
    "date": "2025-05-10",
    "category": "News",
    "subCategory": "Design",
    "excerpt": "Design tokens are dead. How the next generation of interfaces will be generated at runtime, and what that means for the role of the designer.",
    "isNew": true,
    "asciiType": 5,
    "tags": [
      "design-systems",
      "figma",
      "generative-ui"
    ],
    "status": "published",
    "body": "The next design system is not just a library of components. It is a set of rules that a model can understand, remix, and enforce.\n\nThat changes the center of gravity. Designers still define the visual language, but they also define constraints: density, rhythm, states, hierarchy, interaction patterns, accessibility expectations, and where automation is allowed to improvise.\n\nThe strongest AI-native systems will have three layers:\n\n- Tokens for visual consistency.\n- Components for repeatable interaction patterns.\n- Instructions for how generated interfaces should behave when the exact component does not exist yet.\n\nThe design system becomes less like a shelf of parts and more like a living grammar.",
    "readingTime": 1
  },
  {
    "id": "rag-implementation-checklist",
    "slug": "rag-implementation-checklist",
    "title": "The Definitive RAG Implementation Checklist",
    "date": "2025-05-02",
    "category": "Resources",
    "subCategory": "Development",
    "excerpt": "Stop building toy retrieval apps. This is the 40-point checklist used by top AI engineering teams before shipping retrieval pipelines to production.",
    "isNew": true,
    "asciiType": 7,
    "tags": [
      "rag",
      "retrieval",
      "llmops"
    ],
    "status": "published",
    "body": "Most RAG demos stop exactly where production begins. The hard part is not retrieving a document. The hard part is retrieving the right evidence, at the right granularity, with enough observability to know when the system is wrong.\n\nStart here:\n\n- Define the unit of truth before chunking.\n- Track source freshness and document ownership.\n- Evaluate retrieval separately from answer quality.\n- Log empty, low-confidence, and conflicting retrieval sets.\n- Treat citations as part of the product contract.\n\nA retrieval system is only useful when it makes failure visible.",
    "readingTime": 1
  },
  {
    "id": "ai-assisted-prototyping-workflow",
    "slug": "ai-assisted-prototyping-workflow",
    "title": "AI-Assisted Prototyping: A Workflow That Actually Works",
    "date": "2025-04-28",
    "category": "Resources",
    "subCategory": "Design",
    "excerpt": "Rough sketch to functional prototype in under 2 hours using Claude, v0, and raw CSS. My exact workflow, with no fluff.",
    "isNew": false,
    "asciiType": 6,
    "tags": [
      "prototyping",
      "workflow",
      "ux"
    ],
    "status": "published",
    "body": "The fastest prototypes start with constraints, not prompts.\n\nBefore opening a model, write down the user, the task, the available data, the primary action, and what must never happen. That gives the model something sharper than a vibe to work with.\n\nMy preferred loop:\n\n- Sketch the screen in words.\n- Generate the first interactive version.\n- Remove anything that feels like a landing page.\n- Tighten the data states.\n- Test the workflow in the browser.\n- Only then polish the visual layer.\n\nThe goal is not to get the model to design for you. The goal is to make iteration cheap enough that better ideas survive.",
    "readingTime": 1
  }
] satisfies Article[];
