/**
 * Datos iniciales (sección 8 y pautas 10.7).
 *
 * Crea los datos de prueba USANDO LOS MISMOS SERVICIOS que la aplicación.
 * Así el stock, los saldos y la numeración cumplen todas las reglas, y el
 * script funciona además como prueba de los servicios.
 *
 * Uso: pnpm run db:seed  (con la base recién migrada)
 */
import "dotenv/config";
import { count, eq } from "drizzle-orm";
import { db } from "./index";
import { productos as productosTabla, usuarios } from "./schema";
import { hashPassword } from "@/server/servicios/auth";
import { crearCategoria } from "@/server/servicios/categorias";
import { crearCliente, saldoCliente } from "@/server/servicios/clientes";
import { anularFactura, emitirFactura } from "@/server/servicios/facturas";
import { registrarPago } from "@/server/servicios/pagos";
import { crearProducto } from "@/server/servicios/productos";
import { crearUsuario } from "@/server/servicios/usuarios";
import type { UsuarioSesion } from "@/server/permisos";

const CATEGORIAS = ["Herramientas", "Electricidad", "Plomería", "Pinturería", "Bulonería"];

// [código, descripción, categoría (índice), precio en pesos, stock mínimo, stock inicial]
const PRODUCTOS: [string, string, number, number, number, number][] = [
  ["HE-001", "Martillo carpintero 500 g", 0, 12500, 5, 24],
  ["HE-002", "Destornillador Phillips N° 2", 0, 3900, 10, 40],
  ["HE-003", "Pinza universal 8\"", 0, 9800, 5, 18],
  ["HE-004", "Cinta métrica 5 m", 0, 6200, 8, 30],
  ["HE-005", "Llave ajustable 10\"", 0, 14300, 4, 12],
  ["HE-006", "Serrucho 20\"", 0, 17600, 3, 9],
  ["HE-007", "Nivel de aluminio 60 cm", 0, 11200, 3, 4],
  ["EL-001", "Cinta aisladora 20 m", 1, 1900, 20, 80],
  ["EL-002", "Lámpara LED 12 W", 1, 3200, 25, 120],
  ["EL-003", "Toma corriente doble", 1, 4500, 10, 35],
  ["EL-004", "Cable unipolar 2,5 mm (por metro)", 1, 950, 100, 600],
  ["EL-005", "Interruptor termomagnético 20 A", 1, 18900, 4, 10],
  ["EL-006", "Zapatilla 5 tomas con cable", 1, 12800, 6, 3],
  ["PL-001", "Cinta de teflón 3/4\"", 2, 850, 30, 150],
  ["PL-002", "Llave de paso 1/2\"", 2, 9600, 6, 20],
  ["PL-003", "Flexible para canilla 40 cm", 2, 4700, 10, 28],
  ["PL-004", "Sellador de silicona transparente", 2, 6900, 8, 22],
  ["PL-005", "Codo PVC 110 mm", 2, 3300, 10, 6],
  ["PL-006", "Canilla monocomando cocina", 2, 68500, 2, 5],
  ["PI-001", "Látex interior blanco 4 L", 3, 32500, 6, 25],
  ["PI-002", "Esmalte sintético negro 1 L", 3, 18700, 5, 14],
  ["PI-003", "Rodillo de lana 22 cm", 3, 8900, 6, 20],
  ["PI-004", "Pincel N° 20", 3, 4200, 10, 35],
  ["PI-005", "Lija al agua grano 120", 3, 900, 40, 30],
  ["PI-006", "Diluyente aguarrás 1 L", 3, 7600, 6, 16],
  ["BU-001", "Tornillo autoperforante x100", 4, 5400, 10, 45],
  ["BU-002", "Tarugo N° 8 x100", 4, 3100, 10, 50],
  ["BU-003", "Bulón cabeza hexagonal 1/4\" x10", 4, 2600, 15, 60],
  ["BU-004", "Clavo punta París 2\" (kg)", 4, 6800, 8, 25],
  ["BU-005", "Arandela plana 1/4\" x50", 4, 1700, 15, 12],
];

// [tipo, documento, nombre, domicilio, teléfono, email, cuenta corriente, límite en pesos o null]
const CLIENTES: [
  "DNI" | "CUIT",
  string,
  string,
  string,
  string,
  string | null,
  boolean,
  number | null,
][] = [
  ["DNI", "28456123", "Mariana López", "Las Heras 455", "381 455-2210", "mariana.lopez@correo.test", true, 400000],
  ["CUIT", "30712345671", "Constructora Norte S.A.", "Av. Roca 1200", "381 421-9988", "compras@cnorte.test", true, null],
  ["DNI", "31222333", "Jorge Medina", "San Juan 870", "381 566-1020", null, true, 150000],
  ["DNI", "25987654", "Silvia Paz", "Córdoba 233", "381 401-7788", "silvia.paz@correo.test", true, 250000],
  ["CUIT", "20301112223", "Héctor Gómez (plomero)", "Bolívar 1550", "381 512-4433", null, true, 300000],
  ["DNI", "35111222", "Lucía Fernández", "Lamadrid 640", "381 333-2211", "lucia.f@correo.test", false, null],
  ["DNI", "40123456", "Tomás Herrera", "Junín 1020", "381 600-1122", null, false, null],
  ["CUIT", "30698765432", "Escuela Técnica N° 2", "Av. Sarmiento 400", "381 422-5566", "administracion@et2.test", true, 500000],
  ["DNI", "29876543", "Carlos Ruiz", "Mendoza 1311", "381 455-9090", null, false, null],
  ["DNI", "33444555", "Natalia Sosa", "Santiago 780", "381 577-3344", "natalia.sosa@correo.test", true, 120000],
];

async function main() {
  const [{ total }] = await db.select({ total: count() }).from(usuarios);
  if (total > 0) {
    console.log("La base ya tiene datos. Para empezar de cero: pnpm run db:reset");
    return;
  }

  // RF-U3: el primer administrador lo crea este script.
  const [admin] = await db
    .insert(usuarios)
    .values({
      nombre: "Laura Méndez",
      email: "admin@mostrador.test",
      rol: "admin",
      passwordHash: await hashPassword("admin1234"),
    })
    .returning();
  const sesionAdmin: UsuarioSesion = { id: admin.id, nombre: admin.nombre, email: admin.email, rol: "admin" };

  await crearUsuario(sesionAdmin, {
    nombre: "Pablo Ruiz",
    email: "vendedor@mostrador.test",
    rol: "vendedor",
    password: "vendedor1234",
  });
  console.log("✓ Usuarios: admin@mostrador.test / admin1234 · vendedor@mostrador.test / vendedor1234");

  const idsCategorias: number[] = [];
  for (const nombre of CATEGORIAS) {
    idsCategorias.push((await crearCategoria(sesionAdmin, { nombre })).id);
  }
  console.log(`✓ ${CATEGORIAS.length} categorías`);

  for (const [codigo, descripcion, cat, precio, stockMinimo, stockInicial] of PRODUCTOS) {
    await crearProducto(sesionAdmin, {
      codigo,
      descripcion,
      categoriaId: idsCategorias[cat],
      precio: precio * 100, // a centavos
      stockMinimo,
      stockInicial,
    });
  }
  console.log(`✓ ${PRODUCTOS.length} productos con su stock inicial`);

  for (const [tipoDoc, nroDoc, nombre, domicilio, telefono, email, cc, limite] of CLIENTES) {
    await crearCliente(sesionAdmin, {
      tipoDoc,
      nroDoc,
      nombre,
      domicilio,
      telefono,
      email,
      cuentaCorriente: cc,
      limiteCredito: limite === null ? null : limite * 100,
    });
  }
  console.log(`✓ ${CLIENTES.length} clientes`);

  await cargarVentas(sesionAdmin);
}

/** Generador pseudoaleatorio con semilla: siempre produce los mismos datos. */
function aleatorio(semilla: number) {
  return () => {
    semilla = (semilla * 1103515245 + 12345) % 2147483648;
    return semilla / 2147483648;
  };
}

/**
 * 50 facturas repartidas en los últimos 30 días, emitidas con emitirFactura():
 * descuentan stock, graban movimientos y débitos igual que una venta real.
 */
async function cargarVentas(admin: UsuarioSesion) {
  const [vendedorFila] = await db.select().from(usuarios).where(eq(usuarios.rol, "vendedor"));
  const vendedor: UsuarioSesion = { id: vendedorFila.id, nombre: vendedorFila.nombre, email: vendedorFila.email, rol: "vendedor" };
  const azar = aleatorio(2026);
  const ahora = Date.now();

  // Fechas ordenadas de la más vieja a la más nueva, así la numeración acompaña.
  const fechas = Array.from({ length: 50 }, (_, i) => {
    const diasAtras = 29 - Math.floor((i * 30) / 50);
    const hora = 9 + Math.floor(azar() * 10); // de 9 a 18 hs de Argentina
    const d = new Date(ahora - diasAtras * 86_400_000);
    d.setUTCHours(hora + 3, Math.floor(azar() * 60), 0, 0);
    return d.getTime() > ahora ? new Date(ahora - 60_000) : d;
  });

  const conCuenta = [1, 2, 3, 4, 5, 8, 10]; // ids de clientes con cuenta corriente
  const sinCuenta = [6, 7, 9];
  let emitidas = 0;

  for (const [i, fecha] of fechas.entries()) {
    const productos = await db.select().from(productosTabla);
    const disponibles = productos.filter((p) => p.existencia >= 3);
    const cantidadRenglones = 1 + Math.floor(azar() * 3);
    const elegidos = new Map<number, number>();
    while (elegidos.size < cantidadRenglones) {
      const p = disponibles[Math.floor(azar() * disponibles.length)];
      elegidos.set(p.id, 1 + Math.floor(azar() * 2));
    }

    const tirada = azar();
    let clienteId: number | null = null;
    let pago: Record<string, unknown> = { forma: "contado" };
    if (tirada < 0.2) {
      clienteId = conCuenta[Math.floor(azar() * conCuenta.length)];
      pago = { forma: "cuenta_corriente" };
    } else if (tirada < 0.55) {
      const marcas = ["Visa", "Mastercard", "Naranja", "Cabal"];
      pago = {
        forma: "tarjeta",
        tarjeta: {
          tipo: azar() < 0.5 ? "debito" : "credito",
          marca: marcas[Math.floor(azar() * marcas.length)],
          ultimos4: String(1000 + Math.floor(azar() * 9000)),
        },
      };
      if (azar() < 0.4) clienteId = sinCuenta[Math.floor(azar() * sinCuenta.length)];
    }

    try {
      await emitirFactura(
        i % 3 === 0 ? admin : vendedor,
        {
          clienteId,
          items: [...elegidos].map(([productoId, cantidad]) => ({ productoId, cantidad })),
          pago,
        },
        { fechaForzada: fecha.toISOString() },
      );
      emitidas++;
    } catch {
      // Si una venta a cuenta supera el límite del cliente, se emite de contado.
      await emitirFactura(
        vendedor,
        { clienteId: null, items: [...elegidos].map(([productoId, cantidad]) => ({ productoId, cantidad })), pago: { forma: "contado" } },
        { fechaForzada: fecha.toISOString() },
      );
      emitidas++;
    }
  }
  console.log(`✓ ${emitidas} facturas en los últimos 30 días`);

  // Algunos pagos a cuenta y una anulación, también con los servicios.
  let pagos = 0;
  for (const clienteId of [1, 2, 4]) {
    const saldo = await saldoCliente(db, clienteId);
    if (saldo > 0) {
      await registrarPago(vendedor, clienteId, {
        importe: Math.floor(saldo / 2),
        medio: clienteId === 2 ? "transferencia" : "efectivo",
        observacion: "Pago parcial",
      });
      pagos++;
    }
  }
  console.log(`✓ ${pagos} pagos a cuenta corriente`);

  await anularFactura(admin, 5, { motivo: "Error en la carga de cantidades" });
  console.log("✓ 1 factura anulada");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
