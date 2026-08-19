function calculateSccQC(x, W, Z, T) {

  const R = 8.314;

  // Calculate eta squared
  const etaSquared = Math.exp(
      (2 * W) / (Z * R * T)
  );

  const results = [];

  for (let i = 0; i < x.length; i++) {

      const c = x[i];

      let scc;

      // Pure substances
      if (c === 0 || c === 1) {

          scc = 0;

      } else {

          // Beta
          const beta = Math.sqrt(
              1 + 4 * c * (1 - c) * (etaSquared - 1)
          );

          // Scc(0)
          scc =
              (c * (1 - c)) /
              (
                  1 +
                  (Z / 2) *
                  ((1 - beta) / beta)
              );
      }

      results.push(scc);
  }

  return {
      scc: results,
      etaSquared: etaSquared
  };
}


function calculate() {

  // Read input parameters

  const T = Number(
      document.getElementById("temperature").value
  );

  const Z = Number(
      document.getElementById("coordination").value
  );

  const W = Number(
      document.getElementById("energy").value
  );

  const step = Number(
      document.getElementById("step").value
  );


  // Generate concentrations

  const xAu = [];

  for (
      let x = step;
      x <= 1.000001;
      x += step
  ) {

      xAu.push(
          Number(x.toFixed(10))
      );
  }


  // Calculate Scc

  const result = calculateSccQC(
      xAu,
      W,
      Z,
      T
  );


  // Create table

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
          ${result.etaSquared.toFixed(6)}
      </p>

      <table>

          <tr>
              <th>Au Mole Fraction</th>
              <th>Scc(0) — QC</th>
              <th>Scc(0) — Ideal</th>
          </tr>
  `;


  for (let i = 0; i < xAu.length; i++) {

      const x = xAu[i];

      const scc = result.scc[i];

      const ideal =
          x * (1 - x);

      html += `
          <tr>
              <td>${x.toFixed(2)}</td>
              <td>${scc.toFixed(6)}</td>
              <td>${ideal.toFixed(6)}</td>
          </tr>
      `;
  }


  html += `</table>`;


  document.getElementById("results").innerHTML = html;


  // Draw graph

  drawGraph(
      xAu,
      result.scc,
      T,
      W,
      Z
  );
}


function drawGraph(
  x,
  scc,
  T,
  W,
  Z
) {

  const canvas =
      document.getElementById("chart");

  const ctx =
      canvas.getContext("2d");


  // Clear canvas

  ctx.clearRect(
      0,
      0,
      canvas.width,
      canvas.height
  );


  const width = canvas.width;

  const height = canvas.height;


  // Graph margins

  const left = 80;
  const right = 30;
  const top = 60;
  const bottom = 70;


  const graphWidth =
      width - left - right;

  const graphHeight =
      height - top - bottom;


  // Maximum Y

  const maxScc =
      Math.max(
          ...scc,
          0.25
      );


  function xPixel(value) {

      return left +
          value * graphWidth;
  }


  function yPixel(value) {

      return height -
          bottom -
          (value / maxScc) *
          graphHeight;
  }


  // Background

  ctx.fillStyle = "white";

  ctx.fillRect(
      0,
      0,
      width,
      height
  );


  // Grid

  ctx.strokeStyle = "#dddddd";

  ctx.lineWidth = 1;


  for (let i = 0; i <= 10; i++) {

      const px =
          xPixel(i / 10);

      ctx.beginPath();

      ctx.moveTo(
          px,
          top
      );

      ctx.lineTo(
          px,
          height - bottom
      );

      ctx.stroke();
  }


  for (let i = 0; i <= 5; i++) {

      const value =
          (maxScc / 5) * i;

      const py =
          yPixel(value);

      ctx.beginPath();

      ctx.moveTo(
          left,
          py
      );

      ctx.lineTo(
          width - right,
          py
      );

      ctx.stroke();
  }


  // Axes

  ctx.strokeStyle = "#222";

  ctx.lineWidth = 2;


  ctx.beginPath();

  ctx.moveTo(
      left,
      top
  );

  ctx.lineTo(
      left,
      height - bottom
  );

  ctx.lineTo(
      width - right,
      height - bottom
  );

  ctx.stroke();


  // QC curve

  ctx.strokeStyle = "#008080";

  ctx.lineWidth = 3;

  ctx.beginPath();


  for (let i = 0; i < x.length; i++) {

      const px =
          xPixel(x[i]);

      const py =
          yPixel(scc[i]);


      if (i === 0) {

          ctx.moveTo(
              px,
              py
          );

      } else {

          ctx.lineTo(
              px,
              py
          );
      }
  }

  ctx.stroke();


  // QC points

  ctx.fillStyle = "#008080";


  for (let i = 0; i < x.length; i++) {

      const px =
          xPixel(x[i]);

      const py =
          yPixel(scc[i]);


      ctx.beginPath();

      ctx.arc(
          px,
          py,
          5,
          0,
          Math.PI * 2
      );

      ctx.fill();
  }


  // Ideal solution curve

  ctx.strokeStyle = "#777";

  ctx.lineWidth = 2;

  ctx.setLineDash([8, 6]);

  ctx.beginPath();


  for (let i = 0; i <= 100; i++) {

      const fraction =
          i / 100;

      const ideal =
          fraction * (1 - fraction);

      const px =
          xPixel(fraction);

      const py =
          yPixel(ideal);


      if (i === 0) {

          ctx.moveTo(
              px,
              py
          );

      } else {

          ctx.lineTo(
              px,
              py
          );
      }
  }

  ctx.stroke();

  ctx.setLineDash([]);


  // Title

  ctx.fillStyle = "#222";

  ctx.font =
      "bold 18px Arial";

  ctx.textAlign =
      "center";

  ctx.fillText(
      `Au-Cu Scc(0) at ${T} K`,
      width / 2,
      30
  );


  // X axis label

  ctx.font =
      "14px Arial";

  ctx.fillText(
      "Mole Fraction of Au (xAu)",
      width / 2,
      height - 20
  );


  // Y axis label

  ctx.save();

  ctx.translate(
      20,
      height / 2
  );

  ctx.rotate(-Math.PI / 2);

  ctx.fillText(
      "Scc(0)",
      0,
      0
  );

  ctx.restore();


  // Legend

  ctx.textAlign =
      "left";

  ctx.fillStyle =
      "#008080";

  ctx.fillText(
      "● Quasi-Chemical Model",
      width - 270,
      30
  );

  ctx.fillStyle =
      "#777";

  ctx.fillText(
      "– – Ideal Solution",
      width - 270,
      50
  );
}


// Calculate automatically when page loads

window.onload = function() {

  calculate();

};