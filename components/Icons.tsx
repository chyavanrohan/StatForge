import React from 'react';

export const Sigma: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth="8">
    <path d="M 80 15 L 25 15 L 60 50 L 25 85 L 80 85" />
  </svg>
);
