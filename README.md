# Mostrador: sistema de gestión comercial

2º parcial de Programación IV (TUP 2026). Sistema para un comercio minorista de un solo local:
factura ventas, controla las existencias del catálogo y lleva la cuenta corriente de los clientes.

**Integrantes (grupo 15):**

| Legajo | Nombre |
| --- | --- |
| 63392 | Juan Ignacio Andina |
| 64052 | Máximo Isaías Romano |
| 54652 | Fernando Sebastián Cabrera |

**URL pública:** <https://sistema-comercial-alpha.vercel.app>

**Repositorio:** <https://github.com/SebastianCabrera1902/sistema-comercial>

## Funcionalidad

- **Ventas:** nueva venta en una sola pantalla (comprador, ítems y forma de pago), operable con
  teclado; contado con vuelto, tarjeta (solo tipo, marca y últimos 4 dígitos) y cuenta corriente con
  control de límite; comprobante imprimible; listado con filtros; anulación con motivo.
- **Productos:** catálogo con búsqueda y marca de bajo mínimo; altas, edición y baja lógica;
  ingresos y egresos de stock; historial de movimientos; categorías.
- **Clientes:** listado con saldo; ficha con cuenta corriente y saldo acumulado; pagos con recibo
  numerado; listado de saldos deudores.
- **Usuarios:** inicio de sesión, roles (administrador y vendedor), alta, edición, desactivación y
  restablecimiento de contraseña; cada usuario cambia la suya desde su perfil.
- **Inicio:** indicadores del día y del mes, deuda total, productos para reponer, gráficos de ventas
  diarias y por forma de pago, y los 5 productos más vendidos.

## Tecnologías

| Capa | Tecnología |
| --- | --- |
| Lenguaje | TypeScript |
| Framework | Next.js 16 (App Router, Route Handlers) |
| Interfaz | React 19, shadcn/ui, Tailwind CSS 4 |
| Gráficos | Chart.js con react-chartjs-2 |
| Base de datos | SQLite (desarrollo) y Turso / libSQL (producción) |
| Acceso a datos | Drizzle ORM con migraciones de drizzle-kit |
| Validación | Zod, mismos esquemas en cliente y servidor |
| Sesión | Cookie `httpOnly` con JWT firmado (jose); contraseñas con bcrypt |
| Hosting | Vercel |

## Puesta en marcha local

Requisitos: Node.js 20 o superior y pnpm (`npm install -g pnpm`).

```bash
pnpm install
cp .env.example .env
pnpm run db:migrate
pnpm run db:seed
pnpm run dev
```

Abrir <http://localhost:3000>.

Otros comandos:

| Comando | Para qué |
| --- | --- |
| `pnpm run db:reset` | Borra la base local, la migra y vuelve a cargar los datos de prueba |
| `pnpm run db:verificar` | Comprueba los invariantes: stock = suma de movimientos, numeración sin huecos, sin saldos a favor |
| `pnpm run db:generate` | Genera una migración nueva después de cambiar `src/db/schema.ts` |
| `pnpm run db:studio` | Abre Drizzle Studio para ver las tablas |

## Usuarios de prueba

| Rol | Email | Contraseña |
| --- | --- | --- |
| Administrador | admin@mostrador.test | admin1234 |
| Vendedor | vendedor@mostrador.test | vendedor1234 |

Los datos de prueba incluyen 5 categorías, 30 productos, 10 clientes y 50 facturas repartidas en
los últimos 30 días, además de pagos y una factura anulada. Se cargan con los mismos servicios que
usa la aplicación.

## Variables de entorno

Ver [`.env.example`](.env.example).

| Variable | Desarrollo | Producción (Vercel) |
| --- | --- | --- |
| `DATABASE_URL` | `file:local.db` | `libsql://<base>.turso.io` |
| `DATABASE_AUTH_TOKEN` | vacío | token de la base de Turso |
| `SESSION_SECRET` | cualquier texto de 32 caracteres o más | secreto propio, distinto al de desarrollo |

## Publicación (Vercel + Turso)

1. Crear la base en Turso y obtener su URL (`libsql://...`) y un token.
2. Crear el archivo `.env.produccion` (no se sube al repositorio) con `DATABASE_URL`,
   `DATABASE_AUTH_TOKEN` y `SESSION_SECRET` de producción.
3. Crear las tablas y cargar los datos de prueba en Turso:
   ```bash
   pnpm run db:migrate:prod
   pnpm run db:seed:prod
   ```
4. Importar el repositorio en Vercel y cargar las tres variables de entorno en
   *Settings → Environment Variables*.
5. Para comprobar que el sitio usa Turso: entrar como administrador a `/perfil` (muestra la base en uso).

## Organización del código

```text
src/
├── db/            esquema, conexión, datos de prueba y verificación
├── lib/           esquemas Zod, formatos, fechas (compartido con el navegador)
├── server/
│   ├── servicios/ reglas de negocio: un módulo por parte del dominio
│   ├── api.ts     envoltorio común de las rutas (sesión, cuerpo JSON, errores)
│   └── ...        sesión, permisos, errores
├── app/
│   ├── api/       API REST (31 rutas)
│   ├── (sistema)/ páginas con panel lateral
│   └── login/     única página pública
├── components/    componentes de shadcn/ui, comunes y de cada módulo
└── proxy.ts       redirige al login si no hay sesión
```

**Cada regla de negocio vive en un solo lugar: `src/server/servicios/`.** Las rutas de la API y las
páginas solo llaman a esos servicios. Cada servicio valida con Zod, verifica el rol, aplica las
reglas dentro de una transacción si toca varias tablas y devuelve la forma pública de la API.
Cada función cita en un comentario el requerimiento o la regla que implementa.

Las mutaciones desde la interfaz se hacen con la API REST (no con Server Actions), para que haya un
único adaptador hacia los servicios.

La explicación detallada, pregunta por pregunta, está en [`docs/guia-defensa.md`](docs/guia-defensa.md).
