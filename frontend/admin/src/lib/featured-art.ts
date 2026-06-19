export type FeaturedArtOption = {
  value: number;
  label: string;
  preview: string;
};

export const FEATURED_ART_OPTIONS: FeaturedArtOption[] = [
  { value: 1, label: "Neural network", preview: "●───●───●" },
  { value: 2, label: "Terminal", preview: "$ xd-ai --model=gpt" },
  { value: 3, label: "Circuit board", preview: "┌──◯──┐  ┌──◯──┐" },
  { value: 4, label: "Data stream", preview: "┊  1  0  1  1  0  ┊" },
  { value: 5, label: "AI portrait", preview: "╔═══════════╗" },
  { value: 6, label: "Code window", preview: "┌──[  main.ts  ]────┐" },
  { value: 7, label: "Data pipeline", preview: "╔═[SOURCE]═╗" },
  { value: 8, label: "Radar", preview: "·  ·  ·  ·  ·" },
  { value: 9, label: "Decision tree", preview: "╔═[root]═╗" },
  { value: 10, label: "Waveform", preview: "│  ╭─╮      ╭─╮" },
];
