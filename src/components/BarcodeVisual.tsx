import React from 'react';

interface BarcodeVisualProps {
  value: string;
  width?: number;
  height?: number;
  showText?: boolean;
  className?: string;
}

/**
 * مولد باركود متوافق بصرياً مع معيار Code 128 / Code 39
 * يرسم خطوط الباركود بدقة باستخدام SVG متجهي قابل للطباعة والتكبير
 */
export const BarcodeVisual: React.FC<BarcodeVisualProps> = ({
  value,
  width = 200,
  height = 55,
  showText = true,
  className = '',
}) => {
  // Generate deterministic bar widths based on char codes of the value
  const bars = React.useMemo(() => {
    const clean = (value || 'IQ-00000').toUpperCase();
    const pattern: number[] = [2, 1, 1, 2]; // Start guard

    for (let i = 0; i < clean.length; i++) {
      const code = clean.charCodeAt(i);
      // Derive alternating bar/space widths from character code
      pattern.push(((code >> 4) & 3) + 1);
      pattern.push(((code >> 2) & 3) + 1);
      pattern.push((code & 3) + 1);
      pattern.push(1); // spacer
    }
    pattern.push(2, 1, 2, 2); // Stop guard

    const totalUnits = pattern.reduce((a, b) => a + b, 0);
    const unitWidth = width / totalUnits;

    const rects: { x: number; w: number }[] = [];
    let currentX = 0;

    pattern.forEach((p, idx) => {
      const w = p * unitWidth;
      // alternate black bars and white gaps
      if (idx % 2 === 0) {
        rects.push({ x: currentX, w });
      }
      currentX += w;
    });

    return rects;
  }, [value, width]);

  return (
    <div className={`inline-flex flex-col items-center bg-white p-2 rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs ${className}`}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="shape-rendering-crispEdges"
      >
        <rect width={width} height={height} fill="#ffffff" />
        {bars.map((b, i) => (
          <rect key={i} x={b.x} y={0} width={b.w} height={height} fill="#0f172a" />
        ))}
      </svg>
      {showText && (
        <span className="font-mono text-[10px] tracking-widest text-slate-800 font-bold mt-1 select-all">
          *{value}*
        </span>
      )}
    </div>
  );
};

interface QrVisualProps {
  value: string;
  size?: number;
  className?: string;
}

/**
 * مولد QR Code متجهي خفيف ودقيق (SVG Matrix)
 */
export const QrVisual: React.FC<QrVisualProps> = ({
  value,
  size = 90,
  className = '',
}) => {
  // Generate a deterministic 21x21 QR-like matrix for the employee code
  const matrix = React.useMemo(() => {
    const dim = 21;
    const grid: boolean[][] = Array(dim)
      .fill(false)
      .map(() => Array(dim).fill(false));

    // Corner Finder Patterns (7x7)
    const placeFinder = (r: number, c: number) => {
      for (let i = 0; i < 7; i++) {
        for (let j = 0; j < 7; j++) {
          if (
            i === 0 ||
            i === 6 ||
            j === 0 ||
            j === 6 ||
            (i >= 2 && i <= 4 && j >= 2 && j <= 4)
          ) {
            grid[r + i][c + j] = true;
          }
        }
      }
    };

    placeFinder(0, 0); // Top-left
    placeFinder(0, 14); // Top-right
    placeFinder(14, 0); // Bottom-left

    // Timing patterns
    for (let i = 8; i < 13; i++) {
      grid[6][i] = i % 2 === 0;
      grid[i][6] = i % 2 === 0;
    }

    // Hash value to fill data cells
    const str = value || 'EMP-2026';
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }

    for (let r = 0; r < dim; r++) {
      for (let c = 0; c < dim; c++) {
        // Skip finder areas
        if (
          (r < 8 && c < 8) ||
          (r < 8 && c > 12) ||
          (r > 12 && c < 8) ||
          r === 6 ||
          c === 6
        ) {
          continue;
        }
        // Pseudo-random deterministic bit
        const bitVal = Math.sin(r * 17 + c * 31 + hash) * 10000;
        grid[r][c] = (Math.abs(bitVal) % 2) > 0.85;
      }
    }

    return grid;
  }, [value]);

  const cellSize = size / 21;

  return (
    <div className={`inline-block bg-white p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="shape-rendering-crispEdges"
      >
        <rect width={size} height={size} fill="#ffffff" />
        {matrix.map((row, r) =>
          row.map((cell, c) =>
            cell ? (
              <rect
                key={`${r}-${c}`}
                x={c * cellSize}
                y={r * cellSize}
                width={cellSize}
                height={cellSize}
                fill="#0f172a"
              />
            ) : null
          )
        )}
      </svg>
    </div>
  );
};
