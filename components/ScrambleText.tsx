
import React from 'react';

interface Props {
  value: string | number;
  className?: string;
}

/**
 * ScrambleText Component
 * Renders the text immediately without any scramble effect.
 */
export const ScrambleText: React.FC<Props> = ({ value, className = '' }) => {
  const display = typeof value === 'number' 
    ? (Math.abs(value) < 0.000001 ? "0.0000" : value.toFixed(4)) 
    : String(value);

  return (
    <span className={`${className} inline-block text-skin-accent`}>
      {display}
    </span>
  );
};
