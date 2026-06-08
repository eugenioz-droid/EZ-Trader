# Protocolo de Trabajo - EZ Trader

## Jerarquia de reglas
- Este archivo es especifico de EZ Trader.
- Las reglas generales para todos los proyectos viven en [../PROTOCOLO_GENERAL_REP.md](../PROTOCOLO_GENERAL_REP.md).
- Si hay conflicto, manda el protocolo general salvo que el usuario indique una excepcion explicita para EZ Trader.

## Cómo usar este programa

### 1. Estructura general
- Las tareas están organizadas en **FASES** (1, 2, 3... etc)
- Cada **FASE** agrupa tareas relacionadas por tema o etapa del proyecto
- Dentro de cada fase, las tareas están numeradas (1.1, 1.2, 2.1, 2.2... etc)
- El primer número indica la FASE, el segundo es el orden dentro de esa fase

### 2. Cómo marcar una tarea como realizada
- Cambia el símbolo `☐` por `☑` cuando termines
- Ejemplo: `☐` → `☑`
- Siempre marca una sola tarea por vez (es más claro ver el progreso)

### 3. Cuándo agregar tareas nuevas
- Si descubres una tarea nueva, agrégala dentro de la fase que corresponda por lógica de ejecución.
- Si una tarea depende de otra, la dependiente debe quedar después.
- Mantener descripciones cortas (1 línea) y accionables.

### 4. Cuándo reordenar tareas
- Reordenar siempre que mejore la secuencia real de trabajo.
- Luego de reordenar, **renumerar** para mantener la lectura simple (1.1, 1.2, 1.3...).
- Evitar huecos, duplicados o numeración confusa.

### 5. Subtareas - Cuándo y cómo
- Usar subtareas solo si son estrictamente necesarias.
- Máximo recomendado: 2 subtareas por tarea principal.
- Si aparecen muchas subtareas, convertirlas en tareas normales de la fase y renumerar.
- Objetivo: evitar listas gigantes con nesting profundo.

### 6. Reglas importantes (para mantener orden)
- Una tarea debe ser **INDEPENDIENTE** de otra (no depender de otra)
- Si la tarea A depende de B, entonces B debe venir **primero** en la lista
- Todas las tareas comienzan con **VERBO** (Crear, Configurar, Integrar, Testing)
- Descripción clara en **máximo 1 línea**
- Nombres consistentes: usa "Crear", "Configurar", "Integrar", "Testing", "Verificar"

### 7. Quién hace qué
- Algunas tareas las haces **TÚ** (crear cuentas, tomar decisiones)
- Otras las hacemos **JUNTOS** (programar, debugging)
- Ejemplo: "Crear cuenta Supabase" = TÚ | "Crear estructura de carpetas" = YO
- Si no está claro, pregunta antes de hacerla

### 8. Cuándo terminar una fase
- Una fase está **TERMINADA** cuando **TODAS** sus tareas tienen `☑`
- No pases a la siguiente fase hasta no terminar la anterior
- (Excepción: si tienes bloqueos, puedes pasar pero dejando una nota)

---

## Al inicio de cada sesión de trabajo

1. **Dile al agente:** "revisa el protocolo y el programa" antes de empezar
2. El agente NO lee estos archivos automáticamente — debe hacerlo manualmente
3. Marcar tareas completadas en el programa activo de la versión vigente dentro de `docs/programa-versiones/` apenas se terminen (no al final)
4. Para cualquier cambio de código: el agente debe indicar siempre los comandos Git exactos (copiar/pegar) y esperar confirmación antes de push/merge
5. Cada sesión/chat trabaja un solo proyecto. No mezclar tareas de otro proyecto en la misma sesión.
6. Si EZ Trader aún no está ordenado según el protocolo general (estructura, versión activa, nombres, referencias), la sesión parte corrigiendo eso antes de tocar producto o código.

---

## Protocolo General por versiones (programa de trabajo)

Objetivo: mantener orden histórico sin perder pendientes.

### Estructura recomendada
- Crear una carpeta de versiones del programa de trabajo por proyecto.
- Ejemplo sugerido en este repo: `docs/programa-versiones/`.
- Guardar ahí los archivos del programa por versión (uno por versión).
- Estándar de nombre: `programa_vX.YY.md` (ejemplo: `programa_v1.00.md`, `programa_v1.01.md`).

### Regla de cambio de versión
- Cuando el usuario indique cierre de versión, congelar el archivo actual (no seguir editándolo para nuevas tareas).
- Crear un nuevo archivo para la siguiente versión.
- Hacer barrido de pendientes (`☐`) y pasarlos al nuevo archivo.
- Reordenar por prioridad/dependencia y renumerar limpio.

### Reglas de limpieza al abrir nueva versión
- Reducir subtareas innecesarias.
- Unificar tareas duplicadas o muy similares.
- Mantener cada tarea en formato verbo + resultado esperado.
- Si una tarea antigua ya no aplica, marcarla como descartada y no arrastrarla.

---

## Flujo Git guiado (obligatorio en este proyecto)

Objetivo: trabajar ordenados sin dejar la embarrada.

### Regla principal
- El agente debe dar instrucciones de Git paso a paso en cada sesión, asumiendo que el usuario no domina Git.

### Terminal a usar
- Preferir **terminal integrada de VS Code** (Command Prompt o PowerShell 7) dentro de la carpeta del proyecto.
- Git Bash ya no es requisito para este repo; usarlo solo como respaldo si el terminal de VS Code falla.

### Checklist mínimo por cambio
1. Revisar estado: `git status`
2. Traer últimos cambios: `git pull origin main` (si estás en `main`)
3. Si el cambio es mediano/grande, crear rama
4. Hacer cambios y validar
5. Commit con mensaje claro
6. Push y luego integrar a `main`

### ¿Cuándo crear rama?
- **Sí crear rama** si el cambio toca lógica, UI importante, APIs, migraciones, o dura más de 20-30 min.
- **Se puede trabajar en main** si es ajuste mínimo y de bajo riesgo (texto, typo, README, comentario corto).

### Comandos base (plantilla)
- Crear rama: `git checkout -b feat/nombre-corto`
- Ver cambios: `git status`
- Agregar cambios: `git add .`
- Commit: `git commit -m "feat: descripcion corta"`
- Subir rama: `git push -u origin feat/nombre-corto`

### Convención rápida de ramas
- `feat/...` nueva funcionalidad
- `fix/...` corrección de bug
- `docs/...` documentación
- `chore/...` mantenimiento

---

## Restricciones del entorno

- **Preferir terminal integrada de VS Code** para comandos Git y del proyecto.
- Si un perfil de terminal falla, cambiar de perfil (Command Prompt/PowerShell 7) antes de usar Git Bash.
- **Netlify puede estar bloqueado por el firewall corporativo.** Confirmar con TI (pedir excepción para `*.netlify.app`). Si no es posible, migrar a Render (ya hay cuenta activa con ArmaHUB).
- **Sin permisos de administrador.** No se pueden instalar programas con instalador (.msi, .exe con UAC). Usar siempre versiones portables (.zip) o instalación por npm/pip.
- **Node.js portable** en `C:\Users\ezalazar\Tools\node\node-v24.16.0-win-x64`. Agregar al PATH en cada sesión de Git Bash con: `export PATH=$PATH:/c/Users/ezalazar/Tools/node/node-v24.16.0-win-x64` (o está en `.bashrc` si ya se configuró).
- Rutas con espacios en Git Bash deben ir entre comillas: `cd "/c/EZ Developer/Rep/EZ Trader"`

---

## Cuándo cambiar de agente

Usar el modelo correcto evita gastar tokens innecesariamente y obtiene mejores resultados:

| Modelo | Cuándo usarlo |
|--------|--------------|
| **Haiku** | Conversación general, preguntas simples, actualizaciones del programa, comandos Git |
| **Sonnet** | Programar features, debugging, arquitectura, decisiones de diseño |
| **Opus** | Diseño de base de datos, decisiones críticas de arquitectura, lógica compleja que no se puede rehacer fácil |

**Regla:** Yo te aviso cuándo conviene cambiar. Antes de recomendar cambiar de plataforma o herramienta, investigar con datos concretos — no opinar sin evidencia. No cambies por tu cuenta salvo que lo veas necesario.

**Indicación visual:** Cuando escriba `→ CAMBIAR A OPUS` o `→ CAMBIAR A SONNET` es momento de cambiar modelo antes de continuar.

---

## Formato visual de la tabla

```
| N°  | Descripción                          | Realizado | Quién |
|-----|--------------------------------------|-----------|-------|
| 1.1 | Crear cuenta Vercel                  | ☐        | TÚ    |
| 1.2 | Crear cuenta Supabase                | ☐        | TÚ    |
```

---

## Preguntas frecuentes

**P: ¿Puedo hacer tareas de diferentes fases al mismo tiempo?**  
R: No. Termina la fase actual antes de pasar a la siguiente. Mantiene el orden.

**P: ¿Qué pasa si me trabo en una tarea?**  
R: Marca como `☑` con una nota "(bloqueado)" y avanza. Lo volvemos después.

**P: ¿Puedo cambiar la descripción de una tarea?**  
R: Sí, si necesita aclaración. Pero no cambies el número.

**P: ¿Qué es una "tarea" vs "subtarea"?**  
R: Tarea = tiene sentido por sí sola | Subtarea = necesita la tarea padre para funcionar
