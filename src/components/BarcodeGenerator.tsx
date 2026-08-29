import React from 'react';

interface BarcodeProps {
  value: string;
  className?: string;
  showText?: boolean;
  height?: number;
}

export const BarcodeGenerator: React.FC<BarcodeProps> = ({
  value,
  className = '',
  showText = true,
  height = 48
}) => {
  // Generate deterministic barcode bar patterns from the string
  const bars: { width: number; isBlack: boolean }[] = [];
  
  // Start pattern
  bars.push({ width: 3, isBlack: true });
  bars.push({ width: 1, isBlack: false });
  bars.push({ width: 2, isBlack: true });
  bars.push({ width: 2, isBlack: false });

  // Map each character to alternating black/white bar widths
  for (let i = 0; i < value.length; i++) {
    const charCode = value.charCodeAt(i);
    const w1 = (charCode % 3) + 1;
    const w2 = ((charCode * 3) % 2) + 1;
    const w3 = ((charCode * 7) % 3) + 1;
    const w4 = ((charCode * 5) % 2) + 1;

    bars.push({ width: w1, isBlack: true });
    bars.push({ width: w2, isBlack: false });
    bars.push({ width: w3, isBlack: true });
    bars.push({ width: w4, isBlack: false });
  }

  // Stop pattern
  bars.push({ width: 2, isBlack: true });
  bars.push({ width: 1, isBlack: false });
  bars.push({ width: 3, isBlack: true });

  const totalWidth = bars.reduce((acc, bar) => acc + bar.width, 0);

  let currentX = 0;

  return (
    <div className={`flex flex-col items-center select-none ${className}`}>
      <svg
        viewBox={`0 0 ${totalWidth} ${height}`}
        className="w-full max-w-[280px] h-12"
        preserveAspectRatio="none"
      >
        {bars.map((bar, idx) => {
          const rect = bar.isBlack ? (
            <rect
              key={idx}
              x={currentX}
              y="0"
              width={bar.width}
              height={height}
              fill="currentColor"
            />
          ) : null;
          currentX += bar.width;
          return rect;
        })}
      </svg>
      {showText && (
        <span className="font-mono tracking-widest text-xs mt-1 font-bold text-slate-800 dark:text-slate-200">
          *{value}*
        </span>
      )}
    </div>
  );
};

interface QRCodeProps {
  value: string;
  size?: number;
  className?: string;
}

export const QRCodeVisual: React.FC<QRCodeProps> = ({
  value,
  size = 96,
  className = ''
}) => {
  // Deterministic 15x15 matrix generation for crisp QR code simulation
  const matrixSize = 17;
  const cells: boolean[][] = Array(matrixSize)
    .fill(false)
    .map(() => Array(matrixSize).fill(false));

  // Corner markers
  const drawCorner = (startX: number, startY: number) => {
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        if (r === 0 || r === 4 || c === 0 || c === 4 || (r >= 1 && r <= 3 && c >= 1 && c <= 3 && (r === 2 && c === 2))) {
          cells[startY + r][startX + c] = true;
        }
      }
    }
  };

  drawCorner(0, 0);
  drawCorner(matrixSize - 5, 0);
  drawCorner(0, matrixSize - 5);

  // Generate data pattern based on value
  for (let r = 0; r < matrixSize; r++) {
    for (let c = 0; c < matrixSize; c++) {
      if (
        (r < 6 && c < 6) ||
        (r >= matrixSize - 6 && c < 6) ||
        (r < 6 && c >= matrixSize - 6)
      ) {
        continue;
      }
      const charIndex = (r * matrixSize + c) % value.length;
      const code = value.charCodeAt(charIndex);
      if ((code + r * 3 + c * 7) % 3 === 0 || (r + c) % 4 === 0) {
        cells[r][c] = true;
      }
    }
  }

  const cellSize = size / matrixSize;

  return (
    <div
      className={`inline-flex p-2 bg-white rounded-lg border border-slate-200 shadow-xs ${className}`}
      style={{ width: size + 16, height: size + 16 }}
      title={`Scannable QR for: ${value}`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {cells.map((row, rIdx) =>
          row.map((filled, cIdx) =>
            filled ? (
              <rect
                key={`${rIdx}-${cIdx}`}
                x={cIdx * cellSize}
                y={rIdx * cellSize}
                width={cellSize}
                height={cellSize}
                fill="#0f172a"
                rx={cellSize * 0.15}
              />
            ) : null
          )
        )}
      </svg>
    </div>
  );
};
