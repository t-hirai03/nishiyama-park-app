import { PIN_GLYPH } from '../../constants/glyphs';
import type { GlyphId } from '../../types/ui';

interface SpotIconProps {
  readonly glyph: GlyphId;
  /** 色は text-* クラスで currentColor として渡す */
  readonly className?: string;
}

/** グリフは自分で書いた定数なので、dangerouslySetInnerHTML でもSVGの断片をそのまま流し込める */
export const SpotIcon = ({ glyph, className = 'h-5 w-5' }: SpotIconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className={className}
    dangerouslySetInnerHTML={{ __html: PIN_GLYPH[glyph] }}
  />
);
