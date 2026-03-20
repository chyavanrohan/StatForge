import React, { useMemo } from 'react';
import katex from 'katex';

interface FormulaProps {
  tex: string;
  className?: string;
  block?: boolean;
  style?: React.CSSProperties;
}

export const Formula = React.memo<FormulaProps>(({ tex, className = "", block = false, style }) => {
  const renderedHtml = useMemo(() => {
    try {
      return katex.renderToString(tex, {
        throwOnError: false,
        displayMode: block,
      });
    } catch (e) {
      console.error("KaTeX error:", e);
      return tex;
    }
  }, [tex, block]);

  return (
    <span 
      style={style} 
      className={`inline-block ${className}`} 
      dangerouslySetInnerHTML={{ __html: renderedHtml }}
      aria-label={`Mathematical formula: ${tex}`}
    />
  );
});