/**
 * Esquema de la base de datos (Drizzle ORM sobre SQLite / libSQL).
 *
 * Convenciones:
 * - Todas las tablas tienen `id` autoincremental y fecha de creación.
 * - Los importes se guardan en CENTAVOS como enteros (regla 10): nunca coma flotante.
 * - Las fechas se guardan como texto ISO 8601 en UTC.
 * - Productos, clientes y usuarios no se borran: tienen `activo` (regla 12).
 */
import { sql } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

const ahora = sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`;

const id = () => integer("id").primaryKey({ autoIncrement: true });
const creadoEn = () => text("creado_en").notNull().default(ahora);
const activo = (nombre = "activo") =>
  integer(nombre, { mode: "boolean" }).notNull().default(true);

// ---------------------------------------------------------------- usuarios
export const usuarios = sqliteTable("usuarios", {
  id: id(),
  email: text("email").notNull().unique(),
  nombre: text("nombre").notNull(),
  passwordHash: text("password_hash").notNull(),
  rol: text("rol", { enum: ["admin", "vendedor"] }).notNull(),
  activo: activo(),
  creadoEn: creadoEn(),
});

// -------------------------------------------------------------- categorias
export const categorias = sqliteTable("categorias", {
  id: id(),
  nombre: text("nombre").notNull().unique(),
  activa: activo("activa"),
  creadoEn: creadoEn(),
});

// --------------------------------------------------------------- productos
export const productos = sqliteTable(
  "productos",
  {
    id: id(),
    codigo: text("codigo").notNull().unique(),
    descripcion: text("descripcion").notNull(),
    categoriaId: integer("categoria_id")
      .notNull()
      .references(() => categorias.id),
    /** Precio de venta final en centavos. */
    precio: integer("precio").notNull(),
    /**
     * Existencia actual. Solo la modifica `moverStock()` (services/stock.ts),
     * que en la misma transacción graba el movimiento (regla 2).
     */
    existencia: integer("existencia").notNull().default(0),
    stockMinimo: integer("stock_minimo").notNull().default(0),
    activo: activo(),
    creadoEn: creadoEn(),
  },
  (t) => [index("productos_categoria_idx").on(t.categoriaId)],
);

// ------------------------------------------------------- movimientos_stock
export const movimientosStock = sqliteTable(
  "movimientos_stock",
  {
    id: id(),
    productoId: integer("producto_id")
      .notNull()
      .references(() => productos.id),
    usuarioId: integer("usuario_id")
      .notNull()
      .references(() => usuarios.id),
    /** Factura de origen (solo en ventas y anulaciones). */
    facturaId: integer("factura_id").references(() => facturas.id),
    tipo: text("tipo", {
      enum: ["venta", "anulacion", "ingreso", "egreso"],
    }).notNull(),
    /** Con signo: positivo entra, negativo sale. */
    cantidad: integer("cantidad").notNull(),
    existenciaResultante: integer("existencia_resultante").notNull(),
    motivo: text("motivo").notNull(),
    observacion: text("observacion"),
    fecha: creadoEn(),
  },
  (t) => [index("mov_stock_producto_idx").on(t.productoId)],
);

// ---------------------------------------------------------------- clientes
export const clientes = sqliteTable("clientes", {
  id: id(),
  tipoDoc: text("tipo_doc", { enum: ["DNI", "CUIT"] }).notNull(),
  /** Documento tal como se muestra (con puntos o guiones). */
  nroDoc: text("nro_doc").notNull(),
  /** Solo dígitos: sirve para buscar y para garantizar que sea único. */
  nroDocNormalizado: text("nro_doc_normalizado").notNull().unique(),
  nombre: text("nombre").notNull(),
  domicilio: text("domicilio"),
  telefono: text("telefono"),
  email: text("email"),
  cuentaCorriente: integer("cuenta_corriente", { mode: "boolean" })
    .notNull()
    .default(false),
  /** En centavos. Nulo = sin límite. */
  limiteCredito: integer("limite_credito"),
  activo: activo(),
  creadoEn: creadoEn(),
});

// ---------------------------------------------------------------- facturas
export const facturas = sqliteTable(
  "facturas",
  {
    id: id(),
    puntoVenta: integer("punto_venta").notNull(),
    numero: integer("numero").notNull(),
    fecha: creadoEn(),
    /** Nulo = consumidor final. */
    clienteId: integer("cliente_id").references(() => clientes.id),
    usuarioId: integer("usuario_id")
      .notNull()
      .references(() => usuarios.id),
    total: integer("total").notNull(),
    formaPago: text("forma_pago", {
      enum: ["contado", "tarjeta", "cuenta_corriente"],
    }).notNull(),
    // De la tarjeta solo se guarda tipo, marca y últimos 4 dígitos (regla 9).
    tarjetaTipo: text("tarjeta_tipo", { enum: ["debito", "credito"] }),
    tarjetaMarca: text("tarjeta_marca"),
    tarjetaUltimos4: text("tarjeta_ultimos4"),
    montoRecibido: integer("monto_recibido"),
    estado: text("estado", { enum: ["emitida", "anulada"] })
      .notNull()
      .default("emitida"),
    motivoAnulacion: text("motivo_anulacion"),
    anuladaEn: text("anulada_en"),
    anuladaPorId: integer("anulada_por_id").references(() => usuarios.id),
  },
  (t) => [
    // La numeración nunca se repite dentro del punto de venta (regla 4).
    uniqueIndex("facturas_numero_unq").on(t.puntoVenta, t.numero),
    index("facturas_fecha_idx").on(t.fecha),
    index("facturas_cliente_idx").on(t.clienteId),
  ],
);

// ----------------------------------------------------------- factura_items
export const facturaItems = sqliteTable(
  "factura_items",
  {
    id: id(),
    facturaId: integer("factura_id")
      .notNull()
      .references(() => facturas.id),
    productoId: integer("producto_id")
      .notNull()
      .references(() => productos.id),
    // Código, descripción y precio se COPIAN del catálogo (regla 3).
    codigo: text("codigo").notNull(),
    descripcion: text("descripcion").notNull(),
    cantidad: integer("cantidad").notNull(),
    precioUnitario: integer("precio_unitario").notNull(),
    subtotal: integer("subtotal").notNull(),
    creadoEn: creadoEn(),
  },
  (t) => [index("items_factura_idx").on(t.facturaId)],
);

// ------------------------------------------------------------------- pagos
export const pagos = sqliteTable("pagos", {
  id: id(),
  /** Numeración propia de los recibos (regla 4). */
  numero: integer("numero").notNull().unique(),
  fecha: creadoEn(),
  clienteId: integer("cliente_id")
    .notNull()
    .references(() => clientes.id),
  usuarioId: integer("usuario_id")
    .notNull()
    .references(() => usuarios.id),
  importe: integer("importe").notNull(),
  medio: text("medio", {
    enum: ["efectivo", "transferencia", "tarjeta_debito"],
  }).notNull(),
  observacion: text("observacion"),
});

// ------------------------------------------------------ movimientos_cuenta
/**
 * Cuenta corriente. El saldo del cliente NO se guarda: se calcula como
 * débitos − créditos de esta tabla (regla 7). Es la única fuente de verdad.
 */
export const movimientosCuenta = sqliteTable(
  "movimientos_cuenta",
  {
    id: id(),
    clienteId: integer("cliente_id")
      .notNull()
      .references(() => clientes.id),
    tipo: text("tipo", { enum: ["debito", "credito"] }).notNull(),
    /** Siempre positivo; el tipo indica si suma o resta. */
    importe: integer("importe").notNull(),
    fecha: creadoEn(),
    descripcion: text("descripcion").notNull(),
    facturaId: integer("factura_id").references(() => facturas.id),
    pagoId: integer("pago_id").references(() => pagos.id),
  },
  (t) => [index("mov_cuenta_cliente_idx").on(t.clienteId)],
);

export type Rol = (typeof usuarios.$inferSelect)["rol"];
