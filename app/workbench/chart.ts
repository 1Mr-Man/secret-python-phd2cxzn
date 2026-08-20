/**
 * A generic reusable line-chart renderer for an arbitrary number of
 * (x, y) series on a `<canvas>` — vanilla Canvas 2D, no charting
 * dependency, matching the rest of this repo's no-framework convention.
 *
 * This generalizes the axis/grid/legend drawing logic that used to live,
 * hardcoded to exactly two named Scc(0) curves, in `app/main.ts`'s
 * `drawGraph()` — that function still exists unchanged for the classic
 * Au-Cu calculator page; this is the same drawing approach, but driven by
 * caller-supplied series instead of two fixed curves.
 */

export interface ChartPoint {
  x: number;
  y: number;
}

export interface ChartSeries {
  label: string;
  color: string;
  points: ChartPoint[];
  /** Dashed line, no point markers — used for a smooth reference curve. */
  dashed?: boolean;
}

export interface ChartOptions {
  title: string;
  xLabel: string;
  yLabel: string;
}

function extent(values: number[], fallback: [number, number]): [number, number] {
  if (values.length === 0) return fallback;
  const min = Math.min(...values);
  const max = Math.max(...values);
  return min === max ? [min - 1, max + 1] : [min, max];
}

export function drawLineChart(canvas: HTMLCanvasElement, series: ChartSeries[], options: ChartOptions): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;

  ctx.clearRect(0, 0, width, height);

  const left = 80;
  const right = 30;
  const top = 60;
  const bottom = 70;
  const graphWidth = width - left - right;
  const graphHeight = height - top - bottom;

  const allX = series.flatMap((s) => s.points.map((p) => p.x));
  const allY = series.flatMap((s) => s.points.map((p) => p.y));
  const [xMin, xMax] = extent(allX, [0, 1]);
  const [yMin, yMax] = extent(allY, [0, 1]);

  function xPixel(value: number): number {
    return left + ((value - xMin) / (xMax - xMin)) * graphWidth;
  }
  function yPixel(value: number): number {
    return height - bottom - ((value - yMin) / (yMax - yMin)) * graphHeight;
  }

  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "#dddddd";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 10; i++) {
    const px = xPixel(xMin + (i / 10) * (xMax - xMin));
    ctx.beginPath();
    ctx.moveTo(px, top);
    ctx.lineTo(px, height - bottom);
    ctx.stroke();
  }
  for (let i = 0; i <= 5; i++) {
    const py = yPixel(yMin + (i / 5) * (yMax - yMin));
    ctx.beginPath();
    ctx.moveTo(left, py);
    ctx.lineTo(width - right, py);
    ctx.stroke();
  }

  ctx.strokeStyle = "#222";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(left, top);
  ctx.lineTo(left, height - bottom);
  ctx.lineTo(width - right, height - bottom);
  ctx.stroke();

  for (const s of series) {
    ctx.strokeStyle = s.color;
    ctx.lineWidth = s.dashed ? 2 : 3;
    if (s.dashed) ctx.setLineDash([8, 6]);
    ctx.beginPath();
    s.points.forEach((point, i) => {
      const px = xPixel(point.x);
      const py = yPixel(point.y);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();
    ctx.setLineDash([]);

    if (!s.dashed) {
      ctx.fillStyle = s.color;
      for (const point of s.points) {
        ctx.beginPath();
        ctx.arc(xPixel(point.x), yPixel(point.y), 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  ctx.fillStyle = "#222";
  ctx.font = "bold 18px Arial";
  ctx.textAlign = "center";
  ctx.fillText(options.title, width / 2, 30);

  ctx.font = "14px Arial";
  ctx.fillText(options.xLabel, width / 2, height - 20);

  ctx.save();
  ctx.translate(20, height / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(options.yLabel, 0, 0);
  ctx.restore();

  // Anchored inside the plot area's top-left corner (not the top margin,
  // where the centered title lives) so it never collides with the title —
  // regardless of label length or how many series are plotted.
  ctx.font = "12px Arial";
  ctx.textAlign = "left";
  const legendX = left + 10;
  const legendRowHeight = 16;
  const legendWidth = Math.max(...series.map((s) => ctx.measureText(`${s.dashed ? "– –" : "●"} ${s.label}`).width), 0) + 20;
  ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
  ctx.fillRect(left + 4, top + 4, legendWidth, series.length * legendRowHeight + 8);
  series.forEach((s, i) => {
    ctx.fillStyle = s.color;
    ctx.fillText(`${s.dashed ? "– –" : "●"} ${s.label}`, legendX, top + 16 + i * legendRowHeight);
  });
}
