# repoget — Documentación completa (Español)

> ← [Volver al README principal](../../README.md) · [🇺🇸 Read in English](../en/README.md)

---

## ¿Qué es?

`repoget` es una herramienta de línea de comandos que te permite descargar archivos específicos de cualquier repositorio público de GitHub — sin clonar el proyecto completo. Navegás el árbol de archivos de forma interactiva, seleccionás solo lo que necesitás, y la herramienta descarga todo preservando la estructura de carpetas original.

---

## Requisitos

- Node.js **18.0.0 o superior** (usa `fetch` nativo)
- Funciona en **macOS, Linux y Windows**

---

## Instalación

### Global (recomendado)

```bash
npm install -g repoget
```

Una vez instalado, el comando `repoget` está disponible en cualquier parte de tu terminal.

### Desde el código fuente

```bash
git clone https://github.com/cdramirez25/repoget.git
cd repoget
npm install
npm install -g .
```

---

## Uso

```bash
# Modo interactivo — solo corrés repoget y seguís los pasos
repoget

# Pasar la URL directamente para saltear el prompt
repoget https://github.com/owner/repo

# Navegar una rama específica
repoget https://github.com/owner/repo/tree/develop

# Navegar solo una subcarpeta
repoget https://github.com/owner/repo/tree/main/src/components

# Con token de GitHub (repos privados o uso intensivo)
repoget https://github.com/owner/repo --token ghp_xxxxxxxxxxxx

# Ver ayuda
repoget --help
```

---

## Paso a paso

### 1. Iniciá la herramienta

```bash
repoget
```

Vas a ver la pantalla de bienvenida con ejemplos de uso y un campo para pegar la URL del repositorio.

### 2. Pegá la URL de GitHub

Cualquiera de estos formatos funciona:

```
https://github.com/owner/repo
https://github.com/owner/repo/tree/branch
https://github.com/owner/repo/tree/branch/alguna/subcarpeta
```

### 3. Navegá el explorador de archivos

Se abre el navegador interactivo. Vas a ver las carpetas y archivos en la raíz del repositorio (o de la subcarpeta si la incluiste en la URL).

```
  📁 /
  ────────────────────────────────────────────
  [ Show all files ]
▶ 📁 src/
  📁 docs/
  📄 README.md                   3.2 KB
  📄 package.json                0.8 KB
  ────────────────────────────────────────────
  No files selected yet
  Space=select/enter  A=select all  Q=back  Enter=download
```

### 4. Seleccioná tus archivos

Entrá a las carpetas con `Space`, seleccioná archivos con `Space`, y volvé atrás con `Q`. Cuando terminaste, presioná `Enter`.

### 5. Elegí dónde guardar

Te va a preguntar en qué carpeta guardar los archivos. Por defecto es tu Escritorio. Se crea automáticamente una carpeta con el nombre del repositorio adentro.

```
Save inside (folder "repoget" will be created here): C:\Users\vos\Desktop
```

Resultado: `C:\Users\vos\Desktop\repoget\`

### 6. Descarga y resumen

Los archivos se descargan con una barra de progreso. Al final te muestra un resumen con la cantidad de archivos, el tamaño total y la ruta absoluta a la carpeta.

---

## Controles del navegador

| Tecla | Acción |
|-------|--------|
| `↑` `↓` | Mover el cursor arriba y abajo |
| `Space` | Entrar a una carpeta / seleccionar o deseleccionar un archivo |
| `A` | Seleccionar todos los archivos visibles — volver a presionar para deseleccionar |
| `Q` | Volver a la carpeta anterior |
| `Enter` | Confirmar selección e iniciar descarga |
| `Ctrl+C` | Cancelar y salir |

**[ Show all files ]** — seleccionar esta opción cambia a una vista plana de todos los archivos del repo, agrupados por carpeta. Útil cuando sabés exactamente qué estás buscando. Presioná `Q` para volver al árbol de carpetas.

---

## Token de GitHub

### ¿Lo necesito?

**No**, para repositorios públicos. `repoget` funciona sin token.

Solo lo necesitás si:

| Situación | ¿Necesita token? |
|-----------|-----------------|
| Repo público, uso normal | ❌ No |
| Repo público, muchas descargas seguidas | ✔ Recomendado |
| Repo privado | ✔ Requerido |

El límite anónimo de la API de GitHub es **60 requests por hora por IP**. Con token sube a **5,000 por hora**. Como `repoget` solo hace 1–2 llamadas a la API por ejecución, es muy difícil llegar al límite con uso normal.

### Cómo obtener uno

1. Entrá a [github.com](https://github.com) con tu cuenta
2. Click en tu foto de perfil → **Settings**
3. Bajá al fondo → **Developer settings**
4. **Personal access tokens** → **Tokens (classic)** → **Generate new token**
5. Ponele un nombre (ej. `repoget`)
6. Para **repos públicos**: no hace falta marcar ningún permiso — generá y copiá
7. Para **repos privados**: marcá el scope `repo`

### Cómo usarlo

```bash
repoget https://github.com/owner/repo --token ghp_xxxxxxxxxxxx
```

El token **nunca se guarda en disco** — solo existe durante la ejecución del comando.

---

## Estructura de la carpeta de salida

Los archivos siempre se guardan dentro de una carpeta con el nombre del repositorio, preservando la estructura de directorios original:

```
Escritorio/
└── repoget/               ← nombre del repo
    ├── src/
    │   ├── index.js
    │   └── browser.js
    └── README.md
```

Esto significa que los archivos nunca van a quedar dispersos en la carpeta destino, sin importar qué ruta elijas.

---

## Estructura del proyecto

```
repoget/
├── .github/
│   └── PULL_REQUEST_TEMPLATE.md  ← Template para PRs de colaboradores
├── bin/
│   └── repoget.js                ← Punto de entrada del CLI (shebang)
├── docs/
│   ├── en/
│   │   └── README.md             ← Documentación en inglés
│   └── es/
│       └── README.md             ← Este archivo
├── src/
│   ├── index.js                  ← Orquestación y parseo de argumentos
│   ├── github.js                 ← Llamadas a la API de GitHub y parseo de URLs
│   ├── downloader.js             ← Descarga de archivos y escritura en disco
│   ├── browser.js                ← Navegador interactivo de archivos (terminal raw)
│   └── ui.js                     ← Prompts, barra de progreso y resumen final
├── .gitignore
├── CONTRIBUTING.md
├── package.json
└── README.md
```

---

## Detalles técnicos

| Aspecto | Solución |
|---------|----------|
| Peticiones HTTP | `fetch` nativo (Node.js 18+) — sin axios ni node-fetch |
| Archivos | `fs` / `path` nativos |
| Sistema de módulos | ES Modules (`"type": "module"`) |
| Escaneo del árbol | Una sola llamada a `/repos/{owner}/{repo}/git/trees/{branch}?recursive=1` |
| Repos privados | Fallback de URL raw a GitHub Contents API (decodificación base64) |
| Repos grandes | Se detecta y avisa si el árbol fue truncado por GitHub |
| UI de terminal | Raw mode con `process.stdin.setRawMode` — sin dependencia de ncurses |
| Carpeta de salida | Siempre `<ruta-elegida>/<nombre-del-repo>/` — los archivos nunca se dispersan |

---

## Contribuir

¿Querés ayudar a mejorar repoget? Revisá [CONTRIBUTING.md](../../CONTRIBUTING.md) para ver cómo enviar un PR.

---

## Licencia

MIT — © Cristian Ramirez