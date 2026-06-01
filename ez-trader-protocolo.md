# Protocolo de Trabajo - EZ Trader

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
- Si descubres una tarea nueva, agrega un número al final de su fase
- Ejemplo: si tienes hasta 1.5 y necesitas agregar una, la nueva es 1.6
- Coloca la nueva tarea al **FINAL** de su fase correspondiente
- **NO cambies los números de tareas existentes** (causa confusión)

### 4. Cuándo reordenar tareas
- Si una tarea debe hacerse **ANTES** de otra, puedes reordenarlas
- Pero **MANTÉN los números igual**
- Simplemente mueve la fila (el número no cambia)
- Ejemplo: mover 2.3 antes de 2.2 está bien

### 5. Subtareas - Cuándo y cómo
- Una subtarea es algo que **DEBE hacerse** como parte de una tarea principal
- Si agregas subtarea, usa formato: `2.3.a`, `2.3.b`, `2.3.c`
- **IMPORTANTE**: Las subtareas van **INMEDIATAMENTE** después de su tarea padre
- Si terminas la tarea padre, las subtareas no tienen sentido (elimínalas o termínalas)
- Evita nesting profundo (máximo 2 niveles: `2.3` → `2.3.a`)

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
3. Marcar tareas completadas en `ez-trader-programa.md` apenas se terminen (no al final)

---

## Restricciones del entorno

- **PowerShell está bloqueado** en este equipo. Para comandos de terminal usar siempre **Git Bash Portable**.
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
