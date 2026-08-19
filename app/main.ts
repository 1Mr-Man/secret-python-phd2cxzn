/**
 * DOM controller for the Au–Cu Quasi-Chemical calculator page
 * (index.html). This file replaces the original script.js: it reads the
 * same input fields, builds the same results table, and draws the same
 * chart — but every number in them comes from the engine via
 * `app/qcAdapter.ts` instead of being computed here.
 *
 * This file contains no scientific equations. If you're about to write
 * one here, it belongs in an engine model instead (see
 * engine/README.md § "Adding a new model" and ARCHITECTURE.md).
 */
import { computeIdealCurve, runQcSweep, type QcSweepPoint } from "./qcAdapter.js";

declare global {
  interface Window {
    calculate: () => void;
  }
}

function readNumber(id: string): number {
  const element = document.getElementById(id) as HTMLInputElement | null;
  if (!element) throw new Error(`Missing input element #${id}`);
  return Number(element.value);
}

export function calculate(): void {
  const T = readNumber("temperature");
  const Z = readNumber("coordination");
  const W = readNumber("energy");
  const step = readNumber("step");

  const { etaSquared, points } = runQcSweep(T, Z, W, step);

  let html = `
      <p>
          <strong>Temperature:</strong> ${T} K
          &nbsp;&nbsp;
          <strong>Z:</strong> ${Z}
          &nbsp;&nbsp;
          <strong>W:</strong> ${W} J/mol
      </p>

      <p>
          <strong>η²:</strong>
          ${etaSquared.toFixed(6)}
      </p>

      <table>

          <tr>
              <th>Au Mole Fraction</th>
              <th>Scc(0) — QC</th>
              <th>Scc(0) — Ideal</th>
          </tr>
  `;

  for (const point of points) {
    html += `
          <tr>
              <td>${point.x.toFixed(2)}</td>
              <td>${point.scc0.toFixed(6)}</td>
              <td>${point.scc0Ideal.toFixed(6)}</td>
          </tr>
      `;
  }

  html += `</table>`;

  const resultsElement = document.getElementById("results");
  if (resultsElement) resultsElement.innerHTML = html;

  const idealCurve = computeIdealCurve(T, Z, W);
  drawGraph(points, idealCurve, T);
}

// Only T is used for display (the chart title); the original prototype's
// drawGraph() also accepted W and Z but never read them.
function drawGraph(qcPoints: QcSweepPoint[], idealCurve: QcSweepPoint[], T: number): void {
  const canvas = document.getElementById("chart") as HTMLCanvasElement | null;
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const width = canvas.width;
  const height = canvas.height;

  // Graph margins
  const left = 80;
  const right = 30;
  const top = 60;
  const bottom = 70;

  const graphWidth = width - left - right;
  const graphHeight = height - top - bottom;

  // Maximum Y
  const maxScc = Math.max(...qcPoints.map((point) => point.scc0), 0.25);

  function xPixel(value: number): number {
    return left + value * graphWidth;
  }

  function yPixel(value: number): number {
    return height - bottom - (value / maxScc) * graphHeight;
  }

  // Background
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, width, height);

  // Grid
  ctx.strokeStyle = "#dddddd";
  ctx.lineWidth = 1;

  for (let i = 0; i <= 10; i++) {
    const px = xPixel(i / 10);
    ctx.beginPath();
    ctx.moveTo(px, top);
    ctx.lineTo(px, height - bottom);
    ctx.stroke();
  }

  for (let i = 0; i <= 5; i++) {
    const value = (maxScc / 5) * i;
    const py = yPixel(value);
    ctx.beginPath();
    ctx.moveTo(left, py);
    ctx.lineTo(width - right, py);
    ctx.stroke();
  }

  // Axes
  ctx.strokeStyle = "#222";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(left, top);
  ctx.lineTo(left, height - bottom);
  ctx.lineTo(width - right, height - bottom);
  ctx.stroke();

  // QC curve
  ctx.strokeStyle = "#008080";
  ctx.lineWidth = 3;
  ctx.beginPath();

  qcPoints.forEach((point, i) => {
    const px = xPixel(point.x);
    const py = yPixel(point.scc0);
    if (i === 0) {
      ctx.moveTo(px, py);
    } else {
      ctx.lineTo(px, py);
    }
  });

  ctx.stroke();

  // QC points
  ctx.fillStyle = "#008080";

  for (const point of qcPoints) {
    const px = xPixel(point.x);
    const py = yPixel(point.scc0);
    ctx.beginPath();
    ctx.arc(px, py, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Ideal solution curve
  ctx.strokeStyle = "#777";
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 6]);
  ctx.beginPath();

  idealCurve.forEach((point, i) => {
    const px = xPixel(point.x);
    const py = yPixel(point.scc0Ideal);
    if (i === 0) {
      ctx.moveTo(px, py);
    } else {
      ctx.lineTo(px, py);
    }
  });

  ctx.stroke();
  ctx.setLineDash([]);

  // Title
  ctx.fillStyle = "#222";
  ctx.font = "bold 18px Arial";
  ctx.textAlign = "center";
  ctx.fillText(`Au-Cu Scc(0) at ${T} K`, width / 2, 30);

  // X axis label
  ctx.font = "14px Arial";
  ctx.fillText("Mole Fraction of Au (xAu)", width / 2, height - 20);

  // Y axis label
  ctx.save();
  ctx.translate(20, height / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText("Scc(0)", 0, 0);
  ctx.restore();

  // Legend
  ctx.textAlign = "left";
  ctx.fillStyle = "#008080";
  ctx.fillText("● Quasi-Chemical Model", width - 270, 30);
  ctx.fillStyle = "#777";
  ctx.fillText("– – Ideal Solution", width - 270, 50);
}

window.calculate = calculate;

// Calculate automatically when the page loads, same as the original.
window.onload = function () {
  calculate();
};
