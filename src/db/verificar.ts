/**
 * Verifica los invariantes del sistema (lista de control 10.8, punto 5):
 *   - la existencia de cada producto = suma de sus movimientos de stock,
 *   - ninguna existencia es negativa,
 *   - la numeración de facturas y recibos es correlativa y sin huecos.
 * (El saldo de cada cliente no se guarda: siempre es débitos − créditos.)
 *
 * Uso: pnpm run db:verificar
 */
import "dotenv/config";
import { sql } from "drizzle-orm";
import { db } from "./index";

async function main() {
  let ok = true;

  const stock = await db.all<{ codigo: string; existencia: number; suma: number }>(sql`
    select p.codigo, p.existencia, coalesce(sum(m.cantidad), 0) as suma
    from productos p left join movimientos_stock m on m.producto_id = p.id
    group by p.id
    having p.existencia <> coalesce(sum(m.cantidad), 0) or p.existencia < 0`);
  if (stock.length) {
    ok = false;
    console.log("✗ Productos con existencia distinta de la suma de movimientos:", stock);
  } else {
    console.log("✓ Existencia = suma de movimientos en todos los productos (y ninguna negativa)");
  }

  for (const [tabla, columna, etiqueta] of [
    ["facturas", "numero", "facturas"],
    ["pagos", "numero", "recibos"],
  ] as const) {
    const [r] = await db.all<{ cantidad: number; maximo: number | null }>(
      sql.raw(`select count(*) as cantidad, max(${columna}) as maximo from ${tabla}`),
    );
    if ((r.maximo ?? 0) !== r.cantidad) {
      ok = false;
      console.log(`✗ La numeración de ${etiqueta} tiene huecos: ${r.cantidad} registros, último número ${r.maximo}`);
    } else {
      console.log(`✓ Numeración de ${etiqueta} correlativa y sin huecos (1 a ${r.cantidad})`);
    }
  }

  const saldos = await db.all<{ nombre: string; saldo: number }>(sql`
    select c.nombre,
      coalesce(sum(case when m.tipo = 'debito' then m.importe else -m.importe end), 0) as saldo
    from clientes c left join movimientos_cuenta m on m.cliente_id = c.id
    group by c.id having saldo < 0`);
  if (saldos.length) {
    ok = false;
    console.log("✗ Clientes con saldo a favor (no permitido):", saldos);
  } else {
    console.log("✓ Ningún cliente tiene saldo a favor (débitos − créditos ≥ 0)");
  }

  process.exit(ok ? 0 : 1);
}

main();
