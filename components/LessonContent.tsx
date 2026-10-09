import type { ReactNode } from "react";

/**
 * Contenido de una lección de lectura con formato.
 *
 * El texto se guarda en `lecciones.contenido` con un Markdown acotado, para que
 * un curso pueda tener títulos, tablas, recuadros e imágenes sin guardar HTML.
 * No se inserta HTML crudo: todo se arma como elementos de React, y los
 * enlaces e imágenes solo aceptan rutas propias (/...) o https.
 *
 * Bloques:
 *   ## Título            ### Subtítulo
 *   - viñeta             1. paso numerado
 *   | a | b |  (tabla; la segunda fila |---| separa la cabecera)
 *   > [!clave] Título    (también !ojo, !frase, !ejemplo; las líneas "> " siguientes son el cuerpo)
 *   ![pie de imagen](/ruta/imagen.svg)
 *   ::: cifras           (cada línea "valor | etiqueta", cierra con :::)
 * En línea: **negrita** y [texto](https://...).
 *
 * Un texto sin nada de esto se ve como antes: párrafos con sus saltos de línea.
 */

type Bloque =
  | { tipo: "h2" | "h3" | "p"; texto: string }
  | { tipo: "ul" | "ol"; items: string[] }
  | { tipo: "tabla"; cabecera: string[]; filas: string[][] }
  | { tipo: "recuadro"; variante: Variante; titulo: string; cuerpo: string }
  | { tipo: "imagen"; src: string; alt: string }
  | { tipo: "cifras"; items: { valor: string; etiqueta: string }[] };

type Variante = "clave" | "ojo" | "frase" | "ejemplo";

const VARIANTES: Record<Variante, { etiqueta: string; color: string; fondo: string }> = {
  clave: { etiqueta: "Clave", color: "var(--primary)", fondo: "var(--primary-dim)" },
  ojo: { etiqueta: "Ojo", color: "#c27803", fondo: "color-mix(in srgb, #f5a524 14%, transparent)" },
  frase: { etiqueta: "Dilo así", color: "var(--accent)", fondo: "var(--accent-dim)" },
  ejemplo: { etiqueta: "Ejemplo", color: "var(--text)", fondo: "var(--surface-2)" },
};

function esVariante(valor: string): valor is Variante {
  return valor in VARIANTES;
}

const celdas = (linea: string) =>
  linea
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((celda) => celda.trim());

export function parsearLeccion(texto: string): Bloque[] {
  const lineas = texto.replace(/\r\n?/g, "\n").split("\n");
  const bloques: Bloque[] = [];
  let i = 0;

  while (i < lineas.length) {
    const linea = lineas[i];
    const limpia = linea.trim();

    if (!limpia) {
      i += 1;
      continue;
    }

    if (limpia.startsWith("### ")) {
      bloques.push({ tipo: "h3", texto: limpia.slice(4) });
      i += 1;
      continue;
    }
    if (limpia.startsWith("## ")) {
      bloques.push({ tipo: "h2", texto: limpia.slice(3) });
      i += 1;
      continue;
    }

    const imagen = /^!\[([^\]]*)\]\(([^)\s]+)\)$/.exec(limpia);
    if (imagen) {
      bloques.push({ tipo: "imagen", alt: imagen[1], src: imagen[2] });
      i += 1;
      continue;
    }

    if (/^:::\s*cifras/.test(limpia)) {
      const items: { valor: string; etiqueta: string }[] = [];
      i += 1;
      while (i < lineas.length && lineas[i].trim() !== ":::") {
        const [valor, ...resto] = lineas[i].split("|");
        if (valor?.trim()) items.push({ valor: valor.trim(), etiqueta: resto.join("|").trim() });
        i += 1;
      }
      i += 1;
      bloques.push({ tipo: "cifras", items });
      continue;
    }

    if (limpia.startsWith(">")) {
      const cuerpo: string[] = [];
      while (i < lineas.length && lineas[i].trim().startsWith(">")) {
        cuerpo.push(lineas[i].trim().replace(/^>\s?/, ""));
        i += 1;
      }
      const cabecera = /^\[!(\w+)\]\s*(.*)$/.exec(cuerpo[0] ?? "");
      const variante = cabecera && esVariante(cabecera[1].toLowerCase()) ? (cabecera[1].toLowerCase() as Variante) : "clave";
      bloques.push({
        tipo: "recuadro",
        variante,
        titulo: cabecera ? cabecera[2] : "",
        cuerpo: (cabecera ? cuerpo.slice(1) : cuerpo).join("\n"),
      });
      continue;
    }

    if (limpia.startsWith("|")) {
      const filas: string[][] = [];
      while (i < lineas.length && lineas[i].trim().startsWith("|")) {
        const fila = lineas[i].trim();
        if (!/^\|[\s:|-]+\|?$/.test(fila)) filas.push(celdas(fila));
        i += 1;
      }
      const [cabecera = [], ...resto] = filas;
      bloques.push({ tipo: "tabla", cabecera, filas: resto });
      continue;
    }

    if (/^[-•]\s+/.test(limpia)) {
      const items: string[] = [];
      while (i < lineas.length && /^[-•]\s+/.test(lineas[i].trim())) {
        items.push(lineas[i].trim().replace(/^[-•]\s+/, ""));
        i += 1;
      }
      bloques.push({ tipo: "ul", items });
      continue;
    }

    if (/^\d+[.)]\s+/.test(limpia)) {
      const items: string[] = [];
      while (i < lineas.length && /^\d+[.)]\s+/.test(lineas[i].trim())) {
        items.push(lineas[i].trim().replace(/^\d+[.)]\s+/, ""));
        i += 1;
      }
      bloques.push({ tipo: "ol", items });
      continue;
    }

    // Párrafo: líneas seguidas hasta una vacía o el inicio de otro bloque.
    const parrafo: string[] = [];
    while (i < lineas.length) {
      const actual = lineas[i].trim();
      if (!actual || /^(#{2,3} |[-•]\s|\d+[.)]\s|>|\||!\[|:::)/.test(actual)) break;
      parrafo.push(actual);
      i += 1;
    }
    bloques.push({ tipo: "p", texto: parrafo.join("\n") });
  }

  return bloques;
}

function urlSegura(url: string): string | null {
  if (url.startsWith("/") && !url.startsWith("//")) return url;
  if (/^https:\/\//i.test(url)) return url;
  return null;
}

/** **negrita**, [enlace](https://...) y saltos de línea. */
function enLinea(texto: string): ReactNode[] {
  const nodos: ReactNode[] = [];
  const patron = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)\s]+)\)|\n/g;
  let ultimo = 0;
  let match: RegExpExecArray | null;
  let k = 0;
  while ((match = patron.exec(texto)) !== null) {
    if (match.index > ultimo) nodos.push(texto.slice(ultimo, match.index));
    if (match[1] !== undefined) {
      nodos.push(
        <strong key={k++} style={{ color: "var(--text)", fontWeight: 600 }}>
          {match[1]}
        </strong>,
      );
    } else if (match[2] !== undefined) {
      const href = urlSegura(match[3]);
      nodos.push(
        href ? (
          <a key={k++} href={href} target="_blank" rel="noopener noreferrer" className="font-medium underline underline-offset-2" style={{ color: "var(--primary)" }}>
            {match[2]}
          </a>
        ) : (
          match[2]
        ),
      );
    } else {
      nodos.push(<br key={k++} />);
    }
    ultimo = patron.lastIndex;
  }
  if (ultimo < texto.length) nodos.push(texto.slice(ultimo));
  return nodos;
}

function BloqueVista({ bloque }: { bloque: Bloque }) {
  switch (bloque.tipo) {
    case "h2":
      return (
        <h2 className="mt-9 font-serif-brand text-[1.3rem] font-bold tracking-tight first:mt-0" style={{ color: "var(--text)" }}>
          {enLinea(bloque.texto)}
        </h2>
      );
    case "h3":
      return (
        <h3 className="mt-6 text-[1.02rem] font-semibold" style={{ color: "var(--text)" }}>
          {enLinea(bloque.texto)}
        </h3>
      );
    case "p":
      return <p className="mt-3 first:mt-0">{enLinea(bloque.texto)}</p>;
    case "ul":
      return (
        <ul className="mt-3 space-y-2">
          {bloque.items.map((item, i) => (
            <li key={i} className="flex gap-3">
              <span aria-hidden="true" className="mt-[0.6em] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "var(--primary)" }} />
              <span className="min-w-0">{enLinea(item)}</span>
            </li>
          ))}
        </ul>
      );
    case "ol":
      return (
        <ol className="mt-4 space-y-3">
          {bloque.items.map((item, i) => (
            <li key={i} className="flex gap-3">
              <span
                aria-hidden="true"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums"
                style={{ background: "var(--primary-dim)", color: "var(--primary)" }}
              >
                {i + 1}
              </span>
              <span className="min-w-0 pt-0.5">{enLinea(item)}</span>
            </li>
          ))}
        </ol>
      );
    case "tabla":
      return (
        <div className="mt-5 overflow-x-auto rounded-xl" style={{ border: "1px solid var(--border)" }}>
          <table className="w-full border-collapse text-left text-[0.88rem]">
            <thead>
              <tr style={{ background: "var(--surface-2)" }}>
                {bloque.cabecera.map((celda, i) => (
                  <th key={i} className="whitespace-nowrap px-4 py-2.5 font-semibold" style={{ color: "var(--text)" }}>
                    {enLinea(celda)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bloque.filas.map((fila, i) => (
                <tr key={i} style={{ borderTop: "1px solid var(--border)" }}>
                  {fila.map((celda, j) => (
                    <td key={j} className="px-4 py-2.5 align-top tabular-nums">
                      {enLinea(celda)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "recuadro": {
      const v = VARIANTES[bloque.variante];
      return (
        <aside
          className="mt-5 rounded-xl px-5 py-4"
          style={{ background: v.fondo, borderLeft: `4px solid ${v.color}` }}
        >
          <p className="text-[0.7rem] font-bold uppercase tracking-wider" style={{ color: v.color }}>
            {v.etiqueta}
            {bloque.titulo ? ` · ${bloque.titulo}` : ""}
          </p>
          <div className={`mt-1.5 [&>*:first-child]:mt-0 ${bloque.variante === "frase" ? "italic" : ""}`} style={{ color: "var(--text)" }}>
            {parsearLeccion(bloque.cuerpo).map((hijo, i) => (
              <BloqueVista key={i} bloque={hijo} />
            ))}
          </div>
        </aside>
      );
    }
    case "imagen": {
      const src = urlSegura(bloque.src);
      if (!src) return null;
      return (
        <figure className="mt-6">
          {/* En el celular el diagrama queda chico: tocarlo lo abre completo. */}
          <a href={src} target="_blank" rel="noopener noreferrer" className="block" aria-label={`Ampliar: ${bloque.alt || "imagen"}`}>
            {/* eslint-disable-next-line @next/next/no-img-element -- ilustraciones SVG propias del curso */}
            <img src={src} alt={bloque.alt} loading="lazy" className="w-full rounded-xl" style={{ border: "1px solid var(--border)", background: "#fff" }} />
          </a>
          <figcaption className="mt-2 text-center text-xs" style={{ color: "var(--text-faint)" }}>
            {bloque.alt}
            <span className="sm:hidden">{bloque.alt ? " · " : ""}Toca para ampliar</span>
          </figcaption>
        </figure>
      );
    }
    case "cifras":
      return (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {bloque.items.map((item, i) => (
            <div key={i} className="rounded-xl px-4 py-3" style={{ background: "var(--surface-2)" }}>
              <p className="font-serif-brand text-[1.45rem] font-bold leading-tight tabular-nums" style={{ color: "var(--primary)" }}>
                {item.valor}
              </p>
              <p className="mt-1 text-xs leading-snug" style={{ color: "var(--text-muted)" }}>
                {item.etiqueta}
              </p>
            </div>
          ))}
        </div>
      );
  }
}

export function LessonContent({ texto }: { texto: string }) {
  return (
    <div className="text-[0.95rem] leading-relaxed" style={{ color: "var(--text-muted)" }}>
      {parsearLeccion(texto).map((bloque, i) => (
        <BloqueVista key={i} bloque={bloque} />
      ))}
    </div>
  );
}
