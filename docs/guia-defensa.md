# Guía de defensa

Para cada pregunta típica del profe: **dónde está** en el código y **qué decir**.
Se completa hito por hito.

---

## Mapa del proyecto (memorizá esto primero)

```text
src/
├── db/
│   ├── schema.ts        ← TODAS las tablas (Drizzle)
│   ├── index.ts         ← conexión a la base (local o Turso)
│   ├── seed.ts          ← datos de prueba (usa los servicios)
│   └── reset.ts         ← borra la base local
├── lib/                 ← código que usan servidor Y navegador
│   ├── esquemas.ts      ← validaciones Zod (las MISMAS en form y servidor)
│   ├── formato.ts       ← formato de moneda, fechas, numeración
│   ├── fechas.ts        ← días en hora de Argentina
│   └── cliente-api.ts   ← fetch a la API desde el navegador
├── server/              ← solo servidor
│   ├── servicios/       ← ⭐ REGLAS DE NEGOCIO (único lugar)
│   ├── api.ts           ← envoltorio común de las rutas (sesión + errores)
│   ├── errores.ts       ← ApiError y códigos de error
│   ├── sesion.ts        ← usuario conectado (lee la base en cada pedido)
│   ├── token.ts         ← firma de la cookie (JWT)
│   └── permisos.ts      ← exigirRol()
├── app/
│   ├── api/**/route.ts  ← API REST (31 rutas, cada una de pocas líneas)
│   ├── (sistema)/       ← páginas con panel lateral (layout.tsx)
│   └── login/           ← única página pública
├── components/
│   ├── ui/              ← componentes de shadcn/ui
│   ├── comunes/         ← piezas reutilizables (estados, campos, paginador…)
│   └── layout/          ← panel lateral y barra superior
└── proxy.ts             ← primera barrera: redirige al login sin cookie
```

**La idea central (sección 10):** cada regla de negocio vive en **un solo lugar**: `src/server/servicios/`.
Las rutas (`app/api/.../route.ts`) solo llaman a un servicio y responden.

Todo servicio sigue siempre el mismo orden:

1. `validar(esquema, entrada)`: valida con Zod.
2. `exigirRol(usuario, "admin")`: verifica el permiso.
3. Aplica las reglas (dentro de una transacción si toca varias tablas).
4. Devuelve los datos con la forma pública de la API.

---

## Hito 1: base, sesión, usuarios, productos y stock

### Base de datos

**¿Dónde se definen las tablas?**
→ `src/db/schema.ts`. Cada `sqliteTable(...)` es una tabla. Están las 9 del modelo mínimo.

**¿Dónde se conecta la aplicación con la base? ¿Cómo sabe si usar la local o Turso?**
→ `src/db/index.ts`. Lee la variable de entorno `DATABASE_URL`:
- `file:local.db` → archivo SQLite en la compu (desarrollo).
- `libsql://...turso.io` + `DATABASE_AUTH_TOKEN` → Turso (producción).

Es el mismo driver (libSQL) para los dos casos; solo cambia la URL.

**¿Cómo se agrega un campo o una tabla? ¿Qué es una migración?**
→ Se modifica `schema.ts`, se corre `pnpm run db:generate` (genera un archivo SQL en `drizzle/`)
y después `pnpm run db:migrate` (lo aplica). Una migración es ese archivo SQL con el cambio:
queda versionado en Git y se aplica igual en la base local y en Turso.

**¿Dónde se cargan los datos de prueba?**
→ `src/db/seed.ts`. Crea los datos **llamando a los servicios** (`crearProducto`, etc.),
no con INSERT directos. Así cumplen todas las reglas (por ejemplo, el stock inicial
deja un movimiento).

**¿Cómo se guardan los importes? ¿Por qué no coma flotante?**
→ En **centavos, como enteros** (`precio: 1250000` = $ 12.500,00). La coma flotante
tiene errores de redondeo: `0.1 + 0.2` da `0.30000000000000004`. Con enteros la suma siempre es exacta.
Se formatean recién al mostrarlos, en `src/lib/formato.ts` → `moneda()`.

**¿La existencia de un producto se guarda o se calcula?**
→ Se **guarda** en `productos.existencia`, pero **solo la modifica `moverStock()`**
(`src/server/servicios/stock.ts`), que en la misma transacción graba el movimiento.
Por eso la suma de los movimientos de un producto siempre da su existencia.

### Stock (reglas 1 y 2)

**¿Dónde se verifica que el stock no quede negativo?**
→ `moverStock()` en `src/server/servicios/stock.ts`. El descuento es un UPDATE con condición:

```sql
UPDATE productos SET existencia = existencia + ?   -- ? es negativo al sacar
WHERE id = ? AND existencia >= ?
```

Si no actualizó ninguna fila, no alcanzaba: lanza `409 STOCK_INSUFICIENTE`.

**¿Qué pasa si dos personas sacan la última unidad al mismo tiempo?**
→ La condición `existencia >= ?` se evalúa **en la base, en el mismo UPDATE**. SQLite procesa
las escrituras de a una, así que la segunda ya ve la existencia descontada y la condición falla.
**Probado:** 4 egresos simultáneos de 3 unidades sobre una existencia de 4 → uno pasó (201) y tres recibieron 409.

**¿Dónde queda registrado cada movimiento de stock?**
→ Tabla `movimientos_stock`. Lo graba `moverStock()` con tipo, cantidad con signo,
existencia resultante, motivo, usuario y factura (si viene de una venta).

**¿Por qué el producto nuevo no acepta "existencia"?**
→ RF-P2: el stock inicial entra como un **ingreso**. En `crearProducto()` se crea con
existencia 0 y, si viene `stockInicial`, se llama a `moverStock()` dentro de la misma transacción.

### API REST

**¿Dónde se expone la API para agregar un producto?**
→ `src/app/api/productos/route.ts`, función `POST`. Solo llama a `crearProducto()`.

**¿Qué responde si se carga un código que ya existe?**
→ `409 CODIGO_DUPLICADO`, con el detalle en el campo `codigo`. El índice único de la
base (`codigo: text().unique()`) es la garantía; el servicio traduce ese error.

**¿Dónde se arma la respuesta de error?**
→ `src/server/api.ts`, función `respuestaDeError()`. Si el error es un `ApiError`, devuelve
`{ error: { code, message, details } }` con su código HTTP. Si es otra cosa (un error inesperado),
lo escribe en el log del servidor y responde 500 sin mostrar el detalle.

**¿Dónde se verifica que el usuario inició sesión antes de atender un pedido?**
→ `src/server/api.ts`, función `ruta()`: llama a `obtenerUsuarioActual()`; si no hay
usuario, responde `401 NO_AUTENTICADO`. Todas las rutas usan `ruta()` (salvo el login, que es `publica: true`).

**¿Qué pasa si un vendedor llama directamente a una ruta de administrador?**
→ Recibe `403 SIN_PERMISO`. Lo decide el servicio con `exigirRol(usuario, "admin")`
(`src/server/permisos.ts`). Para mostrarlo:

```bash
# logueado como vendedor
curl -X POST http://localhost:3000/api/productos -H "Content-Type: application/json" -d "{}"
```

**¿Alcanza con ocultar el botón?** No. Ocultarlo es solo visual: cualquiera puede llamar a la
API con curl o Postman. Por eso cada servicio verifica el rol.

### Sesión y seguridad

**¿Cómo se guardan las contraseñas?**
→ Con **hash bcrypt** (`src/server/servicios/auth.ts`, `hashPassword()`). Nunca en texto plano.
Al iniciar sesión se compara con `bcrypt.compare()`.

**¿Cómo funciona la sesión?**
→ Al iniciar sesión se crea un token JWT firmado con `SESSION_SECRET` (`src/server/token.ts`)
que guarda solo el id del usuario. Va en una cookie `httpOnly` (JavaScript no puede leerla)
y `SameSite=Lax` (`src/server/sesion.ts` → `abrirSesion()`).

**¿Dónde está el secreto que firma la sesión? ¿Por qué no está en el repositorio?**
→ En la variable de entorno `SESSION_SECRET` (archivo `.env`, que está en `.gitignore`).
Si estuviera en el repo, cualquiera podría fabricar una cookie válida y entrar como admin.
En el repo solo está `.env.example`, con valores de ejemplo.

**Si se desactiva a un usuario que tiene la sesión abierta, ¿qué pasa?**
→ Pierde el acceso **en el siguiente pedido**. `obtenerUsuarioActual()` busca el usuario en
la base cada vez y si `activo` es falso devuelve null, así que la página manda al login y la API responde 401.

**¿Dónde se verifica el rol?** Hay tres barreras:
1. `src/proxy.ts`: sin cookie válida, redirige al login.
2. Cada página: `exigirUsuarioPagina()` y, en pantallas de admin, `esAdmin()`.
3. Cada servicio: `exigirRol()`. **Esta es la que decide.**

**¿Por qué el login responde el mismo error si el email no existe o la contraseña está mal?**
→ Para no darle pistas a quien prueba emails para adivinar cuentas.

### Interfaz

**¿Dónde se define el panel lateral que comparten todas las pantallas?**
→ `src/app/(sistema)/layout.tsx` (el layout) y `src/components/layout/barra-lateral.tsx`.
La carpeta `(sistema)` entre paréntesis es un *route group*: agrupa las páginas que llevan
panel lateral sin agregar nada a la URL. El login está afuera, así que no lo lleva.

**¿Dónde se da formato a importes y fechas?**
→ Solo en `src/lib/formato.ts`: `moneda()`, `fecha()`, `fechaHora()`, `numeroFactura()`.

**¿Dónde se validan los formularios? ¿Son las mismas reglas que en el servidor?**
→ Sí, son las mismas. Los esquemas están en `src/lib/esquemas.ts`. El formulario los usa
en `src/hooks/use-formulario.ts` (antes de enviar) y el servicio los usa en `validar()`.
Si el servidor rechaza algo igual, el hook muestra su error junto al campo.

**¿Qué muestra un listado mientras carga, vacío o con error?**
→ `src/components/comunes/estados.tsx`: `CargandoListado`, `EstadoVacio`, `EstadoError`.
`loading.tsx` y `error.tsx` en `(sistema)/` los usan para todas las páginas.

### Cambios chicos que te pueden pedir (Hito 1)

| Pedido | Dónde se toca |
| --- | --- |
| Agregar el campo «marca» a productos | `schema.ts` (columna) → `pnpm db:generate` y `pnpm db:migrate` → `esquemas.ts` (`productoBase`) → `productos.ts` (en `seleccion` y `aPublico`) → `dialogo-producto.tsx` (campo) → columna en `productos/page.tsx` |
| Un motivo de egreso nuevo | `esquemas.ts` → `MOTIVOS_EGRESO` (el formulario y el servidor lo toman solos) |
| Cambiar el largo mínimo de la contraseña | `esquemas.ts` → `password` (cambia en el formulario y en el servidor a la vez) |
| Una categoría nueva en los datos de prueba | `seed.ts` → `CATEGORIAS` |

---

## Hito 2: clientes, cuenta corriente y pagos

**¿El saldo de un cliente se guarda o se calcula?**
→ Se **calcula**. No hay columna `saldo` en la tabla `clientes`. Sale de `movimientos_cuenta`:
suma de débitos menos suma de créditos (regla 7). Está en `src/server/servicios/clientes.ts`:
- `saldoSql`: la misma cuenta escrita como subconsulta SQL, para listar todos los clientes con su saldo.
- `saldoCliente(tx, id)`: el saldo de un cliente, dentro de una transacción.

¿Por qué calcularlo? Porque así nunca puede quedar desfasado: hay una sola fuente de verdad.

**¿Qué movimientos tiene la cuenta corriente?**
- **Débito**: una venta en cuenta corriente (aumenta la deuda).
- **Crédito**: un pago, o la anulación de una venta a cuenta (disminuye la deuda).

**¿Dónde se impide registrar un pago mayor que la deuda?**
→ `registrarPago()` en `src/server/servicios/pagos.ts`: si `importe > saldo` lanza
`422 PAGO_SUPERA_DEUDA` (regla 8: no se admiten saldos a favor).

**¿Qué hace el sistema al registrar un pago?** Todo dentro de `db.transaction(...)`:
1. Verifica que el cliente esté activo y tenga cuenta corriente.
2. Calcula el saldo y controla que el pago no lo supere.
3. Asigna el número de recibo (`max(numero) + 1`).
4. Graba el pago en `pagos`.
5. Graba el crédito en `movimientos_cuenta`.

Si algo falla en el medio, no se graba nada.

**¿Cómo se numeran los recibos sin repetir ni saltear?**
→ El número se calcula como el último más uno **dentro de la transacción de escritura**. SQLite
procesa las escrituras de a una, así que dos pagos simultáneos no pueden tomar el mismo número.
Además, `pagos.numero` tiene índice único en la base. Si la transacción falla, el número no se usa:
no quedan huecos.

**¿Dónde se busca por documento "sin importar puntos ni guiones"?**
→ El cliente guarda dos columnas: `nroDoc` (como se muestra, "28.456.123") y `nroDocNormalizado`
(solo dígitos, "28456123", con índice único). La búsqueda quita los no-dígitos de lo que escribe
el usuario (`soloDigitos()` en `formato.ts`) y busca en `nroDocNormalizado`.

**¿Por qué no se puede dar de baja un cliente con saldo?**
→ `editarCliente()`: si se intenta `activo: false` o quitar la cuenta corriente y el saldo no es 0,
lanza `422 SALDO_PENDIENTE`. Si no, quedaría una deuda colgada sin poder cobrarse.

**¿Por qué los clientes no se borran?** Baja lógica (regla 12 y RF-C7): tienen facturas y pagos
asociados; borrarlos rompería el historial. Se marcan `activo = false`.

**¿Dónde está el recibo imprimible?**
→ `src/app/(sistema)/clientes/recibos/[id]/page.tsx`, armado con el componente común
`src/components/comprobantes/comprobante.tsx`, que también usa la factura. Al imprimir se ocultan
el panel lateral y los botones (bloque `@media print` en `globals.css`).

### Cambios chicos que te pueden pedir (Hito 2)

| Pedido | Dónde se toca |
| --- | --- |
| Agregar «Mercado Pago» como medio de pago | `schema.ts` → enum de `pagos.medio` · `esquemas.ts` → `pagoSchema` (medio) · `formato.ts` → `etiquetaMedioPago`. El select del formulario se arma solo con esa lista. No hace falta migración: en SQLite el enum es solo un control de TypeScript. |
| El teléfono debe tener al menos 8 dígitos (form y servidor) | `esquemas.ts` → en `clienteCampos.telefono`, agregar `.refine(v => !v \|\| v.replace(/\D/g, "").length >= 8, "Mínimo 8 dígitos.")`. Se aplica en los dos lados porque es el mismo esquema. |
| Mostrar el email en el listado de clientes | `clientes/page.tsx` → agregar `TableHead` y `TableCell` con `c.email` |

---

## Hito 3: ventas, comprobante, listado y anulación

Todo está en `src/server/servicios/facturas.ts`. La pantalla es `src/components/ventas/nueva-venta.tsx`.

**¿Qué pasa, en orden, cuando se confirma una factura?** (`emitirFactura()`, todo dentro de `db.transaction`)
1. Valida el cuerpo con `facturaSchema` y verifica que los productos existan y estén activos.
2. Si hay cliente, que esté activo. Si es a cuenta corriente, que la tenga habilitada.
3. Controla que la existencia alcance para cada renglón.
4. Toma el **precio actual** de cada producto y calcula subtotales y total.
5. Contado: que el monto recibido cubra el total. Cuenta corriente: que no supere el límite.
6. Asigna el número correlativo.
7. Graba la factura y los renglones (copiando descripción y precio).
8. Descuenta el stock con `moverStock()`, que graba un movimiento de venta por renglón.
9. Si es a cuenta corriente, graba el débito en `movimientos_cuenta`.

**¿Qué tablas se modifican al confirmar una factura?**
→ `facturas`, `factura_items`, `productos` (existencia), `movimientos_stock` y, si es a cuenta,
`movimientos_cuenta`. Son 4 o 5 tablas en una sola transacción.

**¿Dónde se asegura que una factura se grabe completa o no se grabe nada?**
→ En `db.transaction(async (tx) => { ... })`. Si cualquier paso lanza un error (por ejemplo,
falta stock en el último renglón), la base deshace todo lo que se hizo dentro (*rollback*).

**¿Por qué el cliente no manda el precio ni el total?**
→ Porque cualquiera puede llamar a la API con curl y mandar el precio que quiera. El servidor
toma el precio del catálogo en el momento (paso 4). El esquema es estricto: si llega un campo
`precio`, responde 422.

**Si cambia el precio de un producto, ¿qué pasa con las facturas ya emitidas?**
→ Nada. `factura_items` guarda **una copia** del precio unitario y de la descripción (regla 3).
Las facturas no leen el precio del catálogo, así que el importe facturado no cambia.

**¿Dónde se asigna el número de factura? ¿Cómo se evita que queden números salteados?**
→ `proximoNumero()`: último número + 1, calculado **dentro de la transacción y al confirmar**,
no al empezar la venta. La transacción de libSQL es de escritura (`BEGIN IMMEDIATE`): dos ventas
no pueden calcular el número a la vez. Si la venta falla, se deshace y el número no se consume.
El índice único `(punto_venta, numero)` es la garantía final.
Para comprobarlo: `pnpm run db:verificar`.

**¿Qué pasa si dos vendedores venden la última unidad al mismo tiempo?**
→ Solo una factura se confirma. Hay dos controles: el paso 3 (que lee la existencia) y, sobre todo,
el UPDATE condicional de `moverStock()` en el paso 8. La segunda venta encuentra la existencia
ya descontada, recibe `409 STOCK_INSUFICIENTE` y su transacción se deshace entera.
**Probado:** 5 ventas simultáneas de 1 unidad sobre una existencia de 2 → 2 facturas (números
53 y 54, sin huecos) y 3 rechazos. La existencia quedó en 0.

**¿Dónde se impide vender en cuenta corriente a un consumidor final?**
→ Paso 2 de `emitirFactura()`: si la forma es `cuenta_corriente` y no hay cliente o no tiene la
cuenta habilitada, lanza `422 CUENTA_CORRIENTE_NO_HABILITADA` (regla 6).
En la pantalla, el botón "Cta. cte." está deshabilitado, pero el control real está en el servidor.

**¿Dónde se controla el límite de crédito?**
→ Paso 5: si `saldoActual + total > limiteCredito`, lanza `422 LIMITE_CREDITO_EXCEDIDO`
con `saldoActual`, `limite` y `excedente` (regla 7).

**¿Qué datos de la tarjeta se guardan? ¿Dónde se ingresa el número completo?**
→ En ningún lado. Solo se guardan tipo, marca y últimos 4 dígitos (regla 9). El esquema
`tarjetaSchema` es estricto: si alguien manda un campo `numero`, la API responde 422.

**¿Qué hace el sistema cuando se anula una factura?** (`anularFactura()`, solo admin, en una transacción)
1. Marca la factura como `anulada`, con motivo, fecha y usuario. Usa un UPDATE condicional
   (`WHERE estado = 'emitida'`): si ya estaba anulada, responde `409 FACTURA_ANULADA`.
2. Reingresa el stock de cada renglón con `moverStock()`, con movimientos de tipo "anulacion".
3. Si fue a cuenta corriente, graba un **crédito** por el total.

La factura **nunca se borra** (regla 5): queda visible con el sello ANULADA.

**¿Cómo se agrega un producto a la venta usando solo el teclado?**
→ Al entrar, el foco ya está en el buscador de productos (o se vuelve con **F2**). Se escribe el
código o la descripción y se presiona **Enter**. Con las flechas se elige entre los resultados.
**F4** va al buscador de clientes y **F9** confirma la venta.
Si se agrega un producto que ya está, se suma la cantidad al renglón (RF-V3).

**¿Qué pasa si el vendedor pide más unidades de las que hay?**
→ La pantalla no lo deja (RF-V4) y muestra la existencia disponible. Pero eso es solo ayuda:
el control que vale es el del servidor.

### Guion de la demo (10 minutos, sobre la URL pública)

Antes de empezar, abrí en otra pestaña la ficha del producto que vas a vender, para mostrar cómo cambia el stock.

1. **Venta a consumidor final, en efectivo:** Nueva venta → escribí `HE-001` + Enter → Contado →
   monto recibido mayor al total (se ve el vuelto) → F9. Mostrá la factura y después la ficha del
   producto: bajó la existencia y aparece el movimiento "Venta 0001-…".
2. **Venta a un cliente nuevo, en cuenta corriente:** Nueva venta → "Nuevo cliente" (el modal no
   pierde la venta) → tildá "Habilitado para cuenta corriente" → guardar → agregá productos →
   Cta. cte. → F9. Mostrá la ficha del cliente: saldo = total de la factura.
3. **Pago de ese cliente:** en su ficha → "Registrar pago" → importe → se abre el recibo. Volvé a
   la pestaña Cuenta corriente: aparece el crédito y el saldo bajó.
4. **Anulación (entrá como admin):** Facturas → abrí la de la venta 2 → Anular → motivo. Mostrá
   que el stock volvió (movimiento "Anulación") y que el cliente tiene un crédito por el total.
5. Opcional: en la terminal, `pnpm run db:verificar` → todos los ✓.

### Cambios chicos que te pueden pedir (Hito 3)

| Pedido | Dónde se toca |
| --- | --- |
| Impedir más de 50 unidades de un mismo producto por venta | `esquemas.ts` → en `facturaSchema`, a `cantidad` agregarle `.max(50, "Máximo 50 unidades por producto.")`. Vale en el formulario y en el servidor. |
| Cambiar el punto de venta a 0002 | `src/lib/comercio.ts` → `puntoVenta: 2`. La numeración arranca de nuevo en 1 para ese punto de venta (el índice único es por punto de venta y número). |
| Agregar una columna al listado de facturas (por ejemplo, la cantidad de ítems) | `listarFacturas()` en `facturas.ts` (agregar el dato a la consulta y a la respuesta) → `ventas/page.tsx` (`TableHead` + `TableCell`) |
| Una marca de tarjeta nueva | `nueva-venta.tsx` → lista `MARCAS` |

---

## Hito 4: tablero, datos de prueba y publicación

**¿De dónde salen los números del tablero?**
→ `src/server/servicios/tablero.ts`, función `obtenerTablero()`. Está expuesto en `GET /api/tablero`
y la página `src/app/(sistema)/page.tsx` lo llama directamente (es un Server Component).
Solo cuenta facturas **emitidas**: las anuladas no suman.

**¿Cómo se calcula "hoy" y "el mes" si las fechas están en UTC?**
→ Argentina es UTC−3 todo el año. `src/lib/fechas.ts` traduce el día argentino a un rango UTC:
el 29/10 en Argentina va de `2026-10-29T03:00Z` a `2026-10-30T03:00Z`. Para agrupar por día se usa
`date(datetime(fecha, '-3 hours'))` en SQL.

**¿Por qué el gráfico de ventas diarias siempre tiene 30 barras?**
→ Porque los días sin ventas no aparecen en la consulta agrupada. El servicio arma los 30 días
y completa con 0 los que faltan, así el gráfico no tiene huecos.

**¿Dónde están los gráficos?**
→ `src/components/tablero/graficos.tsx`, con Chart.js y `react-chartjs-2`. Es un Client Component
(`"use client"`) porque Chart.js dibuja en un `<canvas>` del navegador.

**¿Cómo se crean los datos de prueba?**
→ `src/db/seed.ts`. Las 50 facturas se emiten con `emitirFactura()`, el mismo servicio que usa la
pantalla: descuentan stock, graban movimientos y débitos. El único extra es `fechaForzada`, para
repartirlas en los últimos 30 días; ese parámetro **no llega desde la API** (la ruta no lo pasa).
Usa un generador pseudoaleatorio con semilla fija: siempre genera los mismos datos.

### Publicación

**¿Qué variables de entorno necesita el sistema en producción y dónde se cargan?**
→ `DATABASE_URL`, `DATABASE_AUTH_TOKEN` y `SESSION_SECRET`. Se cargan en Vercel, en
*Settings → Environment Variables*. Nunca van en el repositorio: `.env` y `.env.produccion` están
en `.gitignore`.

**¿Cómo se crearon las tablas en Turso?**
→ Con las mismas migraciones de `drizzle/`, apuntando a Turso: `pnpm run db:migrate:prod`. Ese comando
lee `.env.produccion` (con `dotenv-cli`) y corre `drizzle-kit migrate`. Los datos se cargaron con
`pnpm run db:seed:prod`.

**¿Cómo se comprueba que el sitio publicado usa Turso y no una base local?**
→ Tres formas:
1. Entrar como admin a `/perfil` en la URL pública: muestra `Turso (nombre-de-la-base...turso.io)`.
   Sale de `origenBaseDeDatos` en `src/db/index.ts`.
2. Hacer una venta en el sitio publicado y verla en el panel de Turso (o con `pnpm run db:verificar:prod`).
3. En Vercel no hay disco permanente: una base SQLite local se perdería en cada despliegue.

---

## Lista de control 10.8 (la verifica el profe)

| # | Qué se verifica | Dónde / cómo mostrarlo |
| --- | --- | --- |
| 1 | Ninguna ruta tiene reglas de negocio | Abrí cualquier `src/app/api/**/route.ts`: son 3 o 4 líneas que llaman a un servicio. |
| 2 | Un vendedor que llama a una ruta de admin recibe 403 | `exigirRol()` en cada servicio. Demo: logueado como vendedor, `POST /api/productos` → `403 SIN_PERMISO`. |
| 3 | Una operación que falla a mitad de camino no deja datos parciales | `db.transaction()` en `emitirFactura`, `anularFactura`, `registrarPago`, `crearProducto` y `registrarMovimientoManual`. Si falla `moverStock` en el último renglón, se deshace también la factura ya insertada (por eso no quedan huecos en la numeración). |
| 4 | Dos ventas simultáneas de la última unidad → una sola factura | UPDATE condicional en `moverStock()`. Probado con 5 ventas simultáneas sobre 2 unidades: 2 facturas y 3 rechazos. |
| 5 | Existencia = suma de movimientos; saldo = débitos − créditos | `pnpm run db:verificar` (todo ✓). El saldo ni siquiera se guarda: se calcula siempre. |
| 6 | El mismo esquema Zod valida en el formulario y en el servidor | `src/lib/esquemas.ts`, importado por `use-formulario.ts` (navegador) y por cada servicio (`validar()`). |
| 7 | Ubicar una regla y modificarla en un solo lugar | Toda regla está en `src/server/servicios/` y su validación en `esquemas.ts`. Ver las tablas "Cambios chicos" de cada hito. |

## Preguntas sobre el uso de IA

**¿Qué agente usaron y para qué?**
→ Respondé con la verdad de tu grupo: qué partes generó el asistente y cuáles revisaron, probaron y
ajustaron ustedes.

**Algo que el agente hizo mal y cómo se corrigió:** dos casos reales de este proyecto:
1. **Saldo mal calculado en los listados.** La subconsulta del saldo usaba columnas sin el nombre de
   la tabla. En consultas de una sola tabla, Drizzle escribe `"id"` en lugar de `"clientes"."id"`,
   así que dentro de la subconsulta `"id"` se tomaba como el id del movimiento. Con los primeros datos
   de prueba el resultado coincidía de casualidad. Se detectó comparando el saldo del listado con el
   de la ficha, y se corrigió calificando las columnas (`mc.cliente_id = "clientes"."id"`) en
   `saldoSql` (`clientes.ts`).
2. **La búsqueda no ignoraba acentos.** El `LIKE` de SQLite solo ignora mayúsculas en letras sin tilde:
   "lampara" no encontraba "Lámpara". Se agregó `src/server/busqueda.ts`, que normaliza el texto
   buscado y la columna.
