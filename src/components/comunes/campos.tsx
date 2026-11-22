"use client";

/**
 * Campos de formulario con etiqueta y mensaje de error junto al campo
 * (sección 8: validación en ambos lados).
 */
import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { centavosATexto, pesosACentavos } from "@/lib/formato";

type Base = {
  etiqueta: string;
  error?: string;
  ayuda?: string;
  id: string;
};

export function CampoTexto({
  etiqueta,
  error,
  ayuda,
  id,
  ...props
}: Base & React.ComponentProps<typeof Input>) {
  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor={id}>{etiqueta}</FieldLabel>
      <Input id={id} aria-invalid={!!error} {...props} />
      {ayuda && !error && <FieldDescription>{ayuda}</FieldDescription>}
      <FieldError>{error}</FieldError>
    </Field>
  );
}

export function CampoAreaTexto({
  etiqueta,
  error,
  ayuda,
  id,
  ...props
}: Base & React.ComponentProps<typeof Textarea>) {
  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor={id}>{etiqueta}</FieldLabel>
      <Textarea id={id} aria-invalid={!!error} {...props} />
      {ayuda && !error && <FieldDescription>{ayuda}</FieldDescription>}
      <FieldError>{error}</FieldError>
    </Field>
  );
}

/** Número entero (cantidades, stock). */
export function CampoNumero({
  etiqueta,
  error,
  ayuda,
  id,
  valor,
  alCambiar,
  ...props
}: Base & {
  valor: number | undefined;
  alCambiar: (v: number | undefined) => void;
} & Omit<React.ComponentProps<typeof Input>, "value" | "onChange">) {
  return (
    <CampoTexto
      id={id}
      etiqueta={etiqueta}
      error={error}
      ayuda={ayuda}
      type="number"
      inputMode="numeric"
      step={1}
      value={valor ?? ""}
      onChange={(e) => alCambiar(e.target.value === "" ? undefined : Number(e.target.value))}
      {...props}
    />
  );
}

/**
 * Campo de importe: el usuario escribe en pesos ("12.345,50") y el
 * formulario recibe CENTAVOS (1234550), que es lo que espera la API.
 */
export function CampoImporte({
  etiqueta,
  error,
  ayuda,
  id,
  valor,
  alCambiar,
  ...props
}: Base & {
  valor: number | null | undefined;
  alCambiar: (centavos: number | null) => void;
} & Omit<React.ComponentProps<typeof Input>, "value" | "onChange">) {
  const [texto, setTexto] = useState(centavosATexto(valor));
  const [valorPrevio, setValorPrevio] = useState(valor);

  // Si el valor cambia desde afuera (p. ej. se reinicia el formulario), sincronizar el texto.
  if (valor !== valorPrevio) {
    setValorPrevio(valor);
    if (pesosACentavos(texto) !== (valor ?? null)) setTexto(centavosATexto(valor));
  }

  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor={id}>{etiqueta}</FieldLabel>
      <div className="relative">
        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">
          $
        </span>
        <Input
          id={id}
          inputMode="decimal"
          aria-invalid={!!error}
          className="pl-7 text-right tabular-nums"
          value={texto}
          placeholder="0,00"
          onChange={(e) => {
            setTexto(e.target.value);
            alCambiar(pesosACentavos(e.target.value));
          }}
          {...props}
        />
      </div>
      {ayuda && !error && <FieldDescription>{ayuda}</FieldDescription>}
      <FieldError>{error}</FieldError>
    </Field>
  );
}

export function CampoSelect({
  etiqueta,
  error,
  ayuda,
  id,
  valor,
  alCambiar,
  opciones,
  placeholder = "Elegí una opción",
  disabled,
}: Base & {
  valor: string | undefined;
  alCambiar: (v: string) => void;
  opciones: { valor: string; etiqueta: string }[];
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor={id}>{etiqueta}</FieldLabel>
      <Select value={valor ?? ""} onValueChange={alCambiar} disabled={disabled}>
        <SelectTrigger id={id} aria-invalid={!!error} className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {opciones.map((o) => (
            <SelectItem key={o.valor} value={o.valor}>
              {o.etiqueta}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {ayuda && !error && <FieldDescription>{ayuda}</FieldDescription>}
      <FieldError>{error}</FieldError>
    </Field>
  );
}

export function CampoCasilla({
  etiqueta,
  id,
  valor,
  alCambiar,
  ayuda,
}: {
  etiqueta: string;
  id: string;
  valor: boolean;
  alCambiar: (v: boolean) => void;
  ayuda?: string;
}) {
  return (
    <Field orientation="horizontal">
      <Checkbox id={id} checked={valor} onCheckedChange={(v) => alCambiar(v === true)} />
      <div className="flex flex-col gap-0.5">
        <FieldLabel htmlFor={id} className="font-normal">
          {etiqueta}
        </FieldLabel>
        {ayuda && <FieldDescription>{ayuda}</FieldDescription>}
      </div>
    </Field>
  );
}
