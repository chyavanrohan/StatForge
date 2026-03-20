
import React, { useRef } from 'react';

interface Props {
  children: React.ReactNode;
  className?: string;
  maxTilt?: number;
}

export const MagneticTiltCard: React.FC<Props> = ({ children, className = '' }) => {
  return (
    <div className={className}>
        {children}
    </div>
  );
};
