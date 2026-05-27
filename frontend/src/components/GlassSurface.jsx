import LiquidGlass from 'liquid-glass-react';
import { useTheme } from '../contexts/ThemeContext';

export default function GlassSurface({ children, className, style, cornerRadius = 16, as: As = 'div', ...props }) {
  const { glassStyle } = useTheme();

  if (glassStyle === 'liquid') {
    const { as: _, ...liquidProps } = { cornerRadius, blurAmount: 0, displacementScale: 30, elasticity: 0, ...props };
    return (
      <LiquidGlass
        className={className}
        style={style}
        {...liquidProps}
      >
        {children}
      </LiquidGlass>
    );
  }

  return <As className={className} style={style}>{children}</As>;
}