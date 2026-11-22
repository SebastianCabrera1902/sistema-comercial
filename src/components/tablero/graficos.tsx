"use client";

/**
 * Gráficos del tablero (RF-T2) con Chart.js + react-chartjs-2.
 * Una serie por gráfico, en el color de marca; los importes van en centavos
 * y se muestran con el formato argentino del módulo de formatos.
 */
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  LinearScale,
  Tooltip,
  type ChartOptions,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { etiquetaFormaPago, moneda } from "@/lib/formato";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

const MARCA = "#1f7a78"; // verde petróleo de --primary
const GRILLA = "rgba(0, 0, 0, 0.06)";
const TEXTO = "#6b7280";

/** Ejes y tooltip comunes: grilla tenue, montos abreviados en el eje. */
function opciones(horizontal = false): ChartOptions<"bar"> {
  const ejeMonto = {
    grid: { color: GRILLA },
    border: { display: false },
    ticks: {
      color: TEXTO,
      maxTicksLimit: horizontal ? 4 : 6,
      maxRotation: 0,
      callback: (v: string | number) => {
        const pesos = Number(v) / 100;
        return pesos >= 1000 ? `$ ${Math.round(pesos / 1000)} mil` : `$ ${pesos}`;
      },
    },
  };
  const ejeCategoria = { grid: { display: false }, border: { display: false }, ticks: { color: TEXTO } };
  return {
    indexAxis: horizontal ? "y" : "x",
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false }, // una sola serie: el título de la tarjeta la nombra
      tooltip: {
        callbacks: { label: (ctx) => ` ${moneda(Number(ctx.raw))}` },
      },
    },
    scales: horizontal ? { x: ejeMonto, y: ejeCategoria } : { x: ejeCategoria, y: ejeMonto },
  };
}

/** Ventas diarias de los últimos 30 días (30 barras, con 0 los días sin ventas). */
export function GraficoVentasDiarias({ datos }: { datos: { fecha: string; importe: number }[] }) {
  return (
    <div className="h-64" role="img" aria-label="Ventas diarias de los últimos 30 días">
      <Bar
        options={opciones()}
        data={{
          labels: datos.map((d) => `${d.fecha.slice(8, 10)}/${d.fecha.slice(5, 7)}`),
          datasets: [
            {
              data: datos.map((d) => d.importe),
              backgroundColor: MARCA,
              borderRadius: 4,
              maxBarThickness: 18,
            },
          ],
        }}
      />
    </div>
  );
}

/** Ventas del mes por forma de pago. */
export function GraficoFormasDePago({ datos }: { datos: { forma: string; importe: number }[] }) {
  return (
    <div className="h-48" role="img" aria-label="Ventas del mes por forma de pago">
      <Bar
        options={opciones(true)}
        data={{
          labels: datos.map((d) => etiquetaFormaPago[d.forma]),
          datasets: [
            {
              data: datos.map((d) => d.importe),
              backgroundColor: MARCA,
              borderRadius: 4,
              maxBarThickness: 28,
            },
          ],
        }}
      />
    </div>
  );
}
