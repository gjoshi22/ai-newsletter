import { FEATURED_ART_OPTIONS } from "@/lib/featured-art";

type FeaturedArtPickerProps = {
  value: number;
  onChange: (value: number) => void;
};

export function FeaturedArtPicker({ value, onChange }: FeaturedArtPickerProps) {
  return (
    <div className="featured-art-grid" role="radiogroup" aria-label="Featured card illustration">
      {FEATURED_ART_OPTIONS.map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            className={`featured-art-option${selected ? " is-selected" : ""}`}
            onClick={() => onChange(option.value)}
            role="radio"
            aria-checked={selected}
          >
            <pre className="featured-art-preview">{option.preview}</pre>
            <span className="featured-art-label">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
