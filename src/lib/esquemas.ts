/**
 * Esquemas de validación compartidos (pautas 10.4).
 *
 * El MISMO esquema lo usan:
 *   - el servidor (servicios) para validar lo que llega a la API, y
 *   - los formularios, para mostrar los mismos mensajes antes de enviar.
 *
 * Los esquemas de edición son estrictos (z.strictObject): rechazan campos no
 * previstos. Por eso un PATCH con "existencia" o una tarjeta con el número
 * completo se rechazan sin código extra.
 *
 * Los importes siempre van en CENTAVOS (enteros).
 */
import { z } from "zod";

z.config(z.locales.es());

// ----------------------------------------------------------------- comunes
const texto = (campo: string, max = 120) =>
  z
    .string({ error: `${campo} es obligatorio.` })
    .trim()
    .min(1, `${campo} es obligatorio.`)
    .max(max, `${campo} admite hasta ${max} caracteres.`);

const textoOpcional = (max = 200) =>
  z
    .string()
    .trim()
    .max(max, `Admite hasta ${max} caracteres.`)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));

const centavos = (campo: string) =>
  z
    .number({ error: `${campo} es obligatorio.` })
    .int(`${campo} debe ser un importe en centavos.`)
    .min(0, `${campo} no puede ser negativo.`);

const idEntero = (campo: string) =>
  z.number({ error: `Elegí ${campo}.` }).int().positive(`Elegí ${campo}.`);

const email = z
  .string({ error: "El email es obligatorio." })
  .trim()
  .toLowerCase()
  .email("El email no es válido.");

const password = z
  .string({ error: "La contraseña es obligatoria." })
  .min(8, "La contraseña debe tener al menos 8 caracteres.")
  .max(100);

export const paginacionSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce.number().int().min(1).max(100).catch(20),
});

export const fechaDiaSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha debe tener formato AAAA-MM-DD.");

// ------------------------------------------------------ sesión y usuarios
export const loginSchema = z.object({
  email,
  password: z.string({ error: "La contraseña es obligatoria." }).min(1, "La contraseña es obligatoria."),
});

export const cambiarPasswordSchema = z.strictObject({
  actual: z.string({ error: "Ingresá tu contraseña actual." }).min(1, "Ingresá tu contraseña actual."),
  nueva: password,
});

export const rolSchema = z.enum(["admin", "vendedor"], { error: "Elegí un rol." });

export const usuarioAltaSchema = z.strictObject({
  nombre: texto("El nombre", 80),
  email,
  rol: rolSchema,
  password,
});

export const usuarioEdicionSchema = z.strictObject({
  nombre: texto("El nombre", 80).optional(),
  email: email.optional(),
  rol: rolSchema.optional(),
  activo: z.boolean().optional(),
});

// ------------------------------------------------- categorías y productos
export const categoriaAltaSchema = z.strictObject({
  nombre: texto("El nombre", 60),
});

export const categoriaEdicionSchema = z.strictObject({
  nombre: texto("El nombre", 60).optional(),
  activa: z.boolean().optional(),
});

const productoBase = {
  codigo: texto("El código", 30).transform((v) => v.toUpperCase()),
  descripcion: texto("La descripción", 120),
  categoriaId: idEntero("una categoría"),
  precio: centavos("El precio").positive("El precio debe ser mayor que cero."),
  stockMinimo: z
    .number({ error: "El stock mínimo es obligatorio." })
    .int("El stock mínimo debe ser un número entero.")
    .min(0, "El stock mínimo no puede ser negativo."),
};

/** RF-P2: la existencia NO se acepta; el stock inicial entra como un ingreso. */
export const productoAltaSchema = z.strictObject({
  ...productoBase,
  stockInicial: z
    .number()
    .int("El stock inicial debe ser un número entero.")
    .min(0, "El stock inicial no puede ser negativo.")
    .optional(),
});

export const productoEdicionSchema = z.strictObject({
  codigo: productoBase.codigo.optional(),
  descripcion: productoBase.descripcion.optional(),
  categoriaId: productoBase.categoriaId.optional(),
  precio: productoBase.precio.optional(),
  stockMinimo: productoBase.stockMinimo.optional(),
  activo: z.boolean().optional(),
});

export const MOTIVOS_INGRESO = ["Reposición", "Stock inicial", "Devolución de cliente"] as const;
export const MOTIVOS_EGRESO = ["Rotura", "Vencimiento", "Ajuste de inventario", "Uso interno"] as const;

/** RF-P4 / RF-P5: ingreso o egreso manual. El signo lo pone el servidor. */
export const movimientoManualSchema = z
  .strictObject({
    tipo: z.enum(["ingreso", "egreso"], { error: "Elegí el tipo de movimiento." }),
    cantidad: z
      .number({ error: "La cantidad es obligatoria." })
      .int("La cantidad debe ser un número entero.")
      .positive("La cantidad debe ser mayor que cero."),
    motivo: z.string({ error: "El motivo es obligatorio." }).min(1, "El motivo es obligatorio."),
    observacion: textoOpcional(200),
  })
  .superRefine((m, ctx) => {
    const validos: readonly string[] = m.tipo === "ingreso" ? MOTIVOS_INGRESO : MOTIVOS_EGRESO;
    if (!validos.includes(m.motivo)) {
      ctx.addIssue({
        code: "custom",
        path: ["motivo"],
        message: `Motivo inválido para un ${m.tipo}.`,
      });
    }
  });

// ------------------------------------------------- clientes y cuenta corriente
const tipoDocSchema = z.enum(["DNI", "CUIT"], { error: "Elegí el tipo de documento." });

const clienteCampos = {
  tipoDoc: tipoDocSchema,
  nroDoc: texto("El número de documento", 20),
  nombre: texto("El nombre", 120),
  domicilio: textoOpcional(160),
  telefono: textoOpcional(40),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("El email no es válido.")
    .optional()
    .nullable()
    .or(z.literal("").transform(() => null)),
  cuentaCorriente: z.boolean().optional(),
  limiteCredito: centavos("El límite de crédito").nullable().optional(),
};

/** Valida el largo del documento según su tipo (DNI 7-8 dígitos, CUIT 11). */
function validarDocumento(
  c: { tipoDoc?: "DNI" | "CUIT"; nroDoc?: string },
  ctx: z.RefinementCtx,
) {
  if (!c.tipoDoc || !c.nroDoc) return;
  const digitos = c.nroDoc.replace(/\D/g, "");
  const ok = c.tipoDoc === "DNI" ? /^\d{7,8}$/.test(digitos) : /^\d{11}$/.test(digitos);
  if (!ok) {
    ctx.addIssue({
      code: "custom",
      path: ["nroDoc"],
      message: c.tipoDoc === "DNI" ? "El DNI debe tener 7 u 8 dígitos." : "El CUIT debe tener 11 dígitos.",
    });
  }
}

export const clienteAltaSchema = z.strictObject(clienteCampos).superRefine(validarDocumento);

export const clienteEdicionSchema = z
  .strictObject({
    tipoDoc: tipoDocSchema.optional(),
    nroDoc: clienteCampos.nroDoc.optional(),
    nombre: clienteCampos.nombre.optional(),
    domicilio: clienteCampos.domicilio,
    telefono: clienteCampos.telefono,
    email: clienteCampos.email,
    cuentaCorriente: z.boolean().optional(),
    limiteCredito: clienteCampos.limiteCredito,
    activo: z.boolean().optional(),
  })
  .superRefine(validarDocumento);

/** RF-C5: pago a cuenta. */
export const pagoSchema = z.strictObject({
  importe: centavos("El importe").positive("El importe debe ser mayor que cero."),
  medio: z.enum(["efectivo", "transferencia", "tarjeta_debito"], { error: "Elegí el medio de pago." }),
  observacion: textoOpcional(200),
});

// ---------------------------------------------------------------- facturas
const tarjetaSchema = z.strictObject({
  tipo: z.enum(["debito", "credito"], { error: "Elegí débito o crédito." }),
  marca: texto("La marca", 30),
  // Regla 9: solo los últimos 4 dígitos. Un campo con el número completo se rechaza.
  ultimos4: z
    .string({ error: "Ingresá los últimos 4 dígitos." })
    .regex(/^\d{4}$/, "Ingresá exactamente los últimos 4 dígitos."),
});

export const pagoFacturaSchema = z.discriminatedUnion(
  "forma",
  [
    z.strictObject({
      forma: z.literal("contado"),
      montoRecibido: centavos("El monto recibido").optional(),
    }),
    z.strictObject({ forma: z.literal("tarjeta"), tarjeta: tarjetaSchema }),
    z.strictObject({ forma: z.literal("cuenta_corriente") }),
  ],
  { error: "Elegí una forma de pago válida." },
);

/** RF-V1 a RF-V6. El cliente manda productos y cantidades: NUNCA precios ni totales. */
export const facturaSchema = z.strictObject({
  clienteId: z.number().int().positive().nullable(),
  items: z
    .array(
      z.strictObject({
        productoId: idEntero("un producto"),
        cantidad: z
          .number({ error: "La cantidad es obligatoria." })
          .int("La cantidad debe ser un número entero.")
          .positive("La cantidad debe ser mayor que cero."),
      }),
      { error: "Agregá al menos un producto." },
    )
    .min(1, "Agregá al menos un producto.")
    .refine(
      (items) => new Set(items.map((i) => i.productoId)).size === items.length,
      "Hay productos repetidos en la factura.",
    ),
  pago: pagoFacturaSchema,
});

export const anulacionSchema = z.strictObject({
  motivo: texto("El motivo", 200),
});

export type FacturaEntrada = z.infer<typeof facturaSchema>;
