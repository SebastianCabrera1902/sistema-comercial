"use client";

/**
 * RF-V1 a RF-V6. Pantalla de Nueva venta: comprador, ítems y forma de pago.
 *
 * Todo lo que se calcula acá (precios, total, vuelto, existencia) es para
 * mostrar y adelantar errores. El servidor vuelve a validar y a calcular todo
 * al confirmar: el cliente solo manda productos, cantidades y forma de pago.
 *
 * Teclado: F2 buscar producto · Enter agregar · F4 buscar cliente · F9 confirmar.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BanknoteIcon,
  CreditCardIcon,
  Trash2Icon,
  UserPlusIcon,
  UserRoundIcon,
  WalletIcon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";
import { DialogoCliente } from "@/components/clientes/dialogo-cliente";
import { CampoImporte, CampoSelect, CampoTexto } from "@/components/comunes/campos";
import { EstadoVacio } from "@/components/comunes/estados";
import { Cifra, Fila, Pila, Texto } from "@/components/comunes/primitivas";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ventas/kbd";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useFormulario } from "@/hooks/use-formulario";
import { api, ErrorApi } from "@/lib/cliente-api";
import { facturaSchema } from "@/lib/esquemas";
import { moneda } from "@/lib/formato";
import { cn } from "@/lib/utils";
import type { ClientePublico } from "@/server/servicios/clientes";
import type { ProductoPublico } from "@/server/servicios/productos";
import { BuscadorCliente, BuscadorProducto, type BuscadorRef } from "./buscadores";

type Forma = "contado" | "tarjeta" | "cuenta_corriente";
type Renglon = { producto: ProductoPublico; cantidad: number };

const MARCAS = ["Visa", "Mastercard", "American Express", "Naranja", "Cabal", "Maestro"];

export function NuevaVenta({ proximoNumero }: { proximoNumero: string }) {
  const router = useRouter();
  const buscadorProducto = useRef<BuscadorRef>(null);
  const buscadorCliente = useRef<BuscadorRef>(null);
  const formulario = useRef<HTMLFormElement>(null);

  const [cliente, setCliente] = useState<ClientePublico | null>(null);
  const [renglones, setRenglones] = useState<Renglon[]>([]);
  const [formaElegida, setForma] = useState<Forma>("contado");
  const [montoRecibido, setMontoRecibido] = useState<number | null>(null);
  const [tarjeta, setTarjeta] = useState({ tipo: "debito", marca: "Visa", ultimos4: "" });

  const total = useMemo(
    () => renglones.reduce((s, r) => s + r.producto.precio * r.cantidad, 0),
    [renglones],
  );
  const vuelto = montoRecibido !== null ? montoRecibido - total : null;
  const puedeCuenta = !!cliente?.cuentaCorriente;

  // Si se quita el cliente (o no tiene cuenta corriente), no se puede vender a cuenta.
  const forma: Forma = !puedeCuenta && formaElegida === "cuenta_corriente" ? "contado" : formaElegida;

  /** RF-V3 y RF-V4. Agrega un producto; si ya está, suma la cantidad sin superar la existencia. */
  function agregar(producto: ProductoPublico, cantidad = 1) {
    const actual = renglones.find((r) => r.producto.id === producto.id);
    const nueva = (actual?.cantidad ?? 0) + cantidad;
    if (nueva > producto.existencia) {
      toast.error(
        producto.existencia === 0
          ? `"${producto.descripcion}" no tiene existencia.`
          : `Solo hay ${producto.existencia} unidad(es) de "${producto.descripcion}".`,
      );
      return;
    }
    setRenglones((rs) =>
      actual
        ? rs.map((r) => (r.producto.id === producto.id ? { ...r, cantidad: nueva } : r))
        : [...rs, { producto, cantidad }],
    );
  }

  function cambiarCantidad(id: number, valor: number) {
    setRenglones((rs) =>
      rs.map((r) => {
        if (r.producto.id !== id) return r;
        if (valor > r.producto.existencia) {
          toast.error(`Solo hay ${r.producto.existencia} unidad(es) disponibles.`);
          return { ...r, cantidad: r.producto.existencia };
        }
        return { ...r, cantidad: Math.max(1, Math.floor(valor) || 1) };
      }),
    );
  }

  const { errores, enviando, manejarEnvio } = useFormulario(
    facturaSchema,
    async (datos) => {
      try {
        return await api<{ id: number; numeroFormateado: string }>("/api/facturas", { body: datos });
      } catch (e) {
        // Si otro vendedor se llevó stock, se actualiza lo disponible en pantalla.
        if (e instanceof ErrorApi && e.code === "STOCK_INSUFICIENTE" && Array.isArray(e.details)) {
          const disp = new Map(e.details.map((d) => [d.productoId as number, d.disponible as number]));
          setRenglones((rs) =>
            rs.map((r) =>
              disp.has(r.producto.id)
                ? { ...r, producto: { ...r.producto, existencia: disp.get(r.producto.id)! } }
                : r,
            ),
          );
          const nombres = renglones
            .filter((r) => disp.has(r.producto.id))
            .map((r) => `${r.producto.descripcion} (disponible: ${disp.get(r.producto.id)})`);
          throw new ErrorApi(e.status, e.code, `Sin existencia suficiente: ${nombres.join(", ")}.`);
        }
        throw e;
      }
    },
    {
      alTerminar: (r) => {
        const f = r as { id: number; numeroFormateado: string };
        toast.success(`Factura ${f.numeroFormateado} emitida.`);
        router.push(`/ventas/${f.id}`);
      },
    },
  );

  function confirmar() {
    const pago =
      forma === "contado"
        ? { forma, ...(montoRecibido !== null && { montoRecibido }) }
        : forma === "tarjeta"
          ? { forma, tarjeta }
          : { forma };
    manejarEnvio({
      clienteId: cliente?.id ?? null,
      items: renglones.map((r) => ({ productoId: r.producto.id, cantidad: r.cantidad })),
      pago,
    });
  }

  // Atajos de teclado.
  useEffect(() => {
    function atajo(e: KeyboardEvent) {
      if (e.key === "F2") {
        e.preventDefault();
        buscadorProducto.current?.enfocar();
      } else if (e.key === "F4") {
        e.preventDefault();
        buscadorCliente.current?.enfocar();
      } else if (e.key === "F9") {
        e.preventDefault();
        formulario.current?.requestSubmit();
      }
    }
    window.addEventListener("keydown", atajo);
    return () => window.removeEventListener("keydown", atajo);
  }, []);

  const saldoNuevo = cliente ? cliente.saldo + total : 0;
  const superaLimite =
    forma === "cuenta_corriente" && cliente?.limiteCredito != null && saldoNuevo > cliente.limiteCredito;

  return (
    <form
      ref={formulario}
      onSubmit={(e) => {
        e.preventDefault();
        confirmar();
      }}
      className="grid gap-6 lg:grid-cols-[1fr_380px]"
    >
      <Pila className="min-w-0 gap-6">
        {/* ---------------------------------------------------- comprador */}
        <Card>
          <CardHeader>
            <CardTitle>Comprador</CardTitle>
            <CardDescription>Por defecto, consumidor final.</CardDescription>
          </CardHeader>
          <CardContent>
            {cliente ? (
              <Fila className="justify-between gap-3 rounded-lg border bg-muted/40 p-3">
                <Fila className="gap-3">
                  <UserRoundIcon className="size-5 text-muted-foreground" />
                  <Pila className="gap-0">
                    <Texto variante="fuerte">{cliente.nombre}</Texto>
                    <Texto variante="chico">
                      {cliente.tipoDoc} {cliente.nroDoc}
                      {cliente.cuentaCorriente &&
                        ` · Saldo ${moneda(cliente.saldo)} · ${
                          cliente.disponible === null ? "sin límite" : `disponible ${moneda(cliente.disponible)}`
                        }`}
                    </Texto>
                  </Pila>
                </Fila>
                <Button type="button" variant="ghost" size="sm" onClick={() => setCliente(null)}>
                  <XIcon /> Consumidor final
                </Button>
              </Fila>
            ) : (
              <Pila className="gap-3">
                <Fila className="gap-2">
                  <Badge variant="secondary">Consumidor final</Badge>
                  <Texto variante="chico">o elegí un cliente registrado:</Texto>
                </Fila>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <div className="flex-1">
                    <BuscadorCliente ref={buscadorCliente} alElegir={setCliente} />
                  </div>
                  <DialogoCliente alCrear={(c) => setCliente(c)}>
                    <Button type="button" variant="outline">
                      <UserPlusIcon /> Nuevo cliente
                    </Button>
                  </DialogoCliente>
                </div>
              </Pila>
            )}
          </CardContent>
        </Card>

        {/* -------------------------------------------------------- ítems */}
        <Card>
          <CardHeader>
            <CardTitle>Ítems</CardTitle>
            <CardDescription>
              Buscá por código o descripción y presioná <Kbd>Enter</Kbd> para agregar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Pila>
              <BuscadorProducto ref={buscadorProducto} alElegir={(p) => agregar(p)} />
              {errores.items && <Texto variante="error">{errores.items}</Texto>}
              {renglones.length === 0 ? (
                <EstadoVacio titulo="Todavía no agregaste productos" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead className="w-28 text-right">Cantidad</TableHead>
                      <TableHead className="hidden text-right sm:table-cell">Precio</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {renglones.map((r) => (
                      <TableRow key={r.producto.id}>
                        <TableCell>
                          <Texto variante="fuerte" className="whitespace-normal">
                            {r.producto.descripcion}
                          </Texto>
                          <Texto variante="chico">
                            <span className="font-mono">{r.producto.codigo}</span> · disponible{" "}
                            {r.producto.existencia}
                          </Texto>
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            min={1}
                            max={r.producto.existencia}
                            value={r.cantidad}
                            aria-label={`Cantidad de ${r.producto.descripcion}`}
                            onChange={(e) => cambiarCantidad(r.producto.id, Number(e.target.value))}
                            className="ml-auto w-20 text-right tabular-nums"
                          />
                        </TableCell>
                        <TableCell className="hidden text-right sm:table-cell">
                          <Cifra>{moneda(r.producto.precio)}</Cifra>
                        </TableCell>
                        <TableCell className="text-right">
                          <Cifra className="font-medium">{moneda(r.producto.precio * r.cantidad)}</Cifra>
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label="Quitar"
                            onClick={() =>
                              setRenglones((rs) => rs.filter((x) => x.producto.id !== r.producto.id))
                            }
                          >
                            <Trash2Icon className="text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Pila>
          </CardContent>
        </Card>
      </Pila>

      {/* --------------------------------------------------------- pago */}
      <Pila className="gap-6 lg:sticky lg:top-20 lg:self-start">
        <Card>
          <CardHeader>
            <Fila className="justify-between">
              <CardTitle>Forma de pago</CardTitle>
              <Texto variante="chico" title="Informativo: el número real se asigna al confirmar">
                Próx. {proximoNumero}
              </Texto>
            </Fila>
          </CardHeader>
          <CardContent>
            <Pila>
              <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Forma de pago">
                {(
                  [
                    { valor: "contado", etiqueta: "Contado", icono: BanknoteIcon },
                    { valor: "tarjeta", etiqueta: "Tarjeta", icono: CreditCardIcon },
                    { valor: "cuenta_corriente", etiqueta: "Cta. cte.", icono: WalletIcon },
                  ] as const
                ).map((o) => {
                  const deshabilitada = o.valor === "cuenta_corriente" && !puedeCuenta;
                  return (
                    <button
                      key={o.valor}
                      type="button"
                      role="radio"
                      aria-checked={forma === o.valor}
                      disabled={deshabilitada}
                      title={deshabilitada ? "Solo para clientes registrados con cuenta corriente" : undefined}
                      onClick={() => setForma(o.valor)}
                      className={cn(
                        "flex flex-col items-center gap-1 rounded-lg border p-3 text-xs font-medium transition-colors",
                        forma === o.valor
                          ? "border-primary bg-primary/10 text-primary"
                          : "hover:bg-accent",
                        deshabilitada && "cursor-not-allowed opacity-40 hover:bg-transparent",
                      )}
                    >
                      <o.icono className="size-5" />
                      {o.etiqueta}
                    </button>
                  );
                })}
              </div>

              {forma === "contado" && (
                <>
                  <CampoImporte
                    id="v-recibido"
                    etiqueta="Monto recibido"
                    valor={montoRecibido}
                    alCambiar={setMontoRecibido}
                    error={errores["pago.montoRecibido"] ?? errores.montoRecibido}
                    ayuda="Vacío = el importe exacto."
                  />
                  {vuelto !== null && (
                    <Fila className="justify-between rounded-md bg-muted px-3 py-2">
                      <Texto variante="suave">{vuelto < 0 ? "Falta" : "Vuelto"}</Texto>
                      <Cifra className={cn("text-lg font-semibold", vuelto < 0 && "text-destructive")}>
                        {moneda(Math.abs(vuelto))}
                      </Cifra>
                    </Fila>
                  )}
                </>
              )}

              {forma === "tarjeta" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <CampoSelect
                      id="v-tipo"
                      etiqueta="Tipo"
                      valor={tarjeta.tipo}
                      alCambiar={(v) => setTarjeta((t) => ({ ...t, tipo: v }))}
                      opciones={[
                        { valor: "debito", etiqueta: "Débito" },
                        { valor: "credito", etiqueta: "Crédito" },
                      ]}
                    />
                    <CampoSelect
                      id="v-marca"
                      etiqueta="Marca"
                      valor={tarjeta.marca}
                      alCambiar={(v) => setTarjeta((t) => ({ ...t, marca: v }))}
                      opciones={MARCAS.map((m) => ({ valor: m, etiqueta: m }))}
                    />
                  </div>
                  <CampoTexto
                    id="v-ultimos4"
                    etiqueta="Últimos 4 dígitos"
                    inputMode="numeric"
                    maxLength={4}
                    value={tarjeta.ultimos4}
                    onChange={(e) =>
                      setTarjeta((t) => ({ ...t, ultimos4: e.target.value.replace(/\D/g, "") }))
                    }
                    error={errores["pago.tarjeta.ultimos4"]}
                    ayuda="Nunca se pide ni se guarda el número completo."
                  />
                </>
              )}

              {forma === "cuenta_corriente" && cliente && (
                <Pila className="gap-1 rounded-md bg-muted px-3 py-2 text-sm">
                  <Fila className="justify-between">
                    <Texto variante="suave">Saldo actual</Texto>
                    <Cifra>{moneda(cliente.saldo)}</Cifra>
                  </Fila>
                  <Fila className="justify-between">
                    <Texto variante="suave">Saldo con esta venta</Texto>
                    <Cifra className="font-semibold">{moneda(saldoNuevo)}</Cifra>
                  </Fila>
                  <Fila className="justify-between">
                    <Texto variante="suave">Límite</Texto>
                    <Cifra>{cliente.limiteCredito === null ? "Sin límite" : moneda(cliente.limiteCredito)}</Cifra>
                  </Fila>
                  {superaLimite && (
                    <Texto variante="error">La venta supera el límite de crédito.</Texto>
                  )}
                </Pila>
              )}
            </Pila>
          </CardContent>
        </Card>

        <Card className="border-primary/30">
          <CardContent>
            <Pila>
              <Fila className="justify-between">
                <Texto variante="suave">
                  Total · {renglones.reduce((s, r) => s + r.cantidad, 0)} unidad(es)
                </Texto>
                <Cifra className="text-3xl font-semibold">{moneda(total)}</Cifra>
              </Fila>
              <Button
                type="submit"
                size="lg"
                disabled={enviando || renglones.length === 0 || superaLimite}
              >
                {enviando ? "Emitiendo…" : "Confirmar venta"} <Kbd className="ml-1">F9</Kbd>
              </Button>
              <Texto variante="chico" className="text-center">
                <Kbd>F2</Kbd> producto · <Kbd>F4</Kbd> cliente · <Kbd>F9</Kbd> confirmar
              </Texto>
            </Pila>
          </CardContent>
        </Card>
      </Pila>
    </form>
  );
}
