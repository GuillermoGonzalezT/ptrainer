# PTrainer — Requisitos funcionales

Versión 0.1 · 2026-09-21

## 1. Propósito

PTrainer es una webapp para que un personal trainer planifique y siga el trabajo de sus clientes, y para que cada cliente sepa qué le toca entrenar, cómo se hace cada ejercicio y cómo viene progresando.

La primera versión la usa **un solo entrenador**. El objetivo a mediano plazo es venderla a varios entrenadores, primero como webapp y después como app en Play Store y App Store. Por eso todo lo que se construya ahora tiene que funcionar el día que haya más de un entrenador (ver [RNF-01](#rnf-01)).

## 2. Contexto y decisiones de base

| Tema | Decisión |
|---|---|
| Hosting del frontend | GitHub Pages (solo archivos estáticos). |
| Backend | Supabase: autenticación, base de datos Postgres, Storage para videos y fotos. |
| Diseño | Mobile-first. Tiene que ser cómodo con una mano en el gimnasio; en escritorio se adapta, no al revés. |
| Instalación | PWA instalable (ícono en la pantalla de inicio, pantalla completa). |
| Modalidad de entrenamiento | Presencial y online. Una sesión la puede registrar el cliente solo o el entrenador durante una clase. |
| Idioma | Español. |
| Fuera de alcance | Nutrición, hábitos (agua, pasos, sueño) y chat. Ver [sección 7](#7-fuera-de-alcance). |

## 3. Actores

- **Entrenador**: arma ejercicios, rutinas y métricas, gestiona clientes y revisa lo que hacen.
- **Cliente**: ve su plan, registra lo que entrena y consulta su progreso. Solo ve sus propios datos y el material de su entrenador.
- **Administrador de la plataforma** (fase 3): gestiona las cuentas de entrenadores cuando la app sea multi-entrenador.

## 4. Fases

| Fase | Contenido |
|---|---|
| **Fase 1 — MVP** | Lo mínimo para que el entrenador trabaje con clientes reales: cuentas, clientes, ejercicios con video propio, rutinas, registro de sesiones, métricas y progreso. |
| **Fase 2** | Lo que ahorra tiempo o da más seguimiento: programas por semanas, agenda, offline, fotos, check-ins, pagos, notificaciones. |
| **Fase 3 — Comercial** | Varios entrenadores, suscripción y apps nativas en las tiendas. |

Cada requisito indica su fase entre corchetes: **[F1]**, **[F2]** o **[F3]**.

## 5. Requisitos funcionales

### 5.1 Cuentas y acceso

- **RF-01 [F1] Login con roles.** Registro e inicio de sesión con email y contraseña. Cada cuenta es de tipo entrenador o cliente, y la app muestra una interfaz distinta según el rol.
- **RF-02 [F1] Invitación de clientes.** El entrenador genera un link o código de invitación. Quien se registra con él queda vinculado como cliente de ese entrenador. En la fase 1 no hay registro libre de clientes: solo por invitación.
- **RF-03 [F1] Recuperar contraseña** por email.
- **RF-04 [F1] App instalable (PWA)** con ícono, nombre y pantalla completa.
- **RF-05 [F1] Tema claro y oscuro**, siguiendo el del sistema.
- **RF-06 [F3] Registro de entrenadores.** Cualquier entrenador puede crear su cuenta y empezar a invitar clientes.
- **RF-07 [F3] Un cliente con varios entrenadores** (por ejemplo, uno de fuerza y otro de movilidad). Cada entrenador ve solo lo que él asignó.

### 5.2 Gestión de clientes

- **RF-10 [F1] Lista de clientes** con búsqueda por nombre y filtro por estado: activo, pausado o baja.
- **RF-11 [F1] Ficha del cliente**: nombre, foto, fecha de nacimiento, contacto, objetivos, nivel, lesiones y restricciones, modalidad (presencial, online o mixta).
- **RF-12 [F1] Notas privadas del entrenador** sobre cada cliente. El cliente no las ve.
- **RF-13 [F2] Cuestionario inicial.** Al sumarse, el cliente completa un formulario de antecedentes (salud tipo PAR-Q, lesiones, experiencia, disponibilidad). Las respuestas quedan en su ficha.
- **RF-14 [F1] Cambiar el estado de un cliente.** Un cliente en baja no puede entrar a la app, pero su historial se conserva.

### 5.3 Biblioteca de ejercicios

- **RF-20 [F1] Biblioteca de ejercicios** con nombre, grupo muscular, equipamiento, descripción y consejos técnicos. Se busca por nombre y se filtra por grupo muscular y equipamiento.
- **RF-21 [F1] Ejercicios propios.** El entrenador crea, edita y archiva ejercicios. Un ejercicio archivado no aparece al armar rutinas nuevas, pero sigue visible en el historial.
- **RF-22 [F1] Videos propios del entrenador.** El entrenador puede adjuntar a un ejercicio uno o más videos grabados por él:
  - Los graba con la cámara del teléfono desde la app o sube un archivo de la galería.
  - Los videos se guardan en Supabase Storage, no en YouTube ni en otro servicio externo.
  - Duración máxima: 60 segundos por video (a confirmar, ver [P-02](#8-preguntas-abiertas)).
  - Formatos aceptados: MP4 y MOV. Se rechaza cualquier otro tipo de archivo y cualquier archivo que supere el tamaño máximo.
  - Puede marcar uno como principal, reordenarlos y borrarlos.
- **RF-23 [F1] Ver el video desde el cliente.** Desde la rutina, el cliente abre un ejercicio y reproduce los videos del entrenador en la misma pantalla, sin salir de la app. Solo pueden verlos los clientes de ese entrenador.
- **RF-24 [F2] Biblioteca base precargada.** La app trae un conjunto de ejercicios comunes (sin video) para que el entrenador no arranque de cero.

### 5.4 Rutinas y programas

- **RF-30 [F1] Armar una rutina** como lista ordenada de ejercicios. Para cada uno se define: series, repeticiones (número o rango) o tiempo (para ejercicios como la plancha), carga (kg o % de 1RM), descanso, RPE o RIR, tempo y notas. Todos los campos menos el ejercicio y las series son opcionales.
- **RF-31 [F1] Plantillas.** Una rutina se puede guardar como plantilla y asignarse a uno o varios clientes. Al asignarla se crea una copia, así que cambiarla para un cliente no afecta a los demás.
- **RF-32 [F1] Asignar rutinas a un cliente** con los días de la semana en que le tocan, o sin días fijos (el cliente elige cuál hacer).
- **RF-33 [F2] Superseries y circuitos.** Agrupar dos o más ejercicios que se hacen seguidos, con descanso al final del grupo.
- **RF-34 [F2] Programas por semanas.** Un programa agrupa rutinas en semanas o bloques, con progresión definida (por ejemplo, subir la carga un 2,5 % por semana). El cliente ve en qué semana está.
- **RF-35 [F2] Duplicar** una rutina o un programa, para uno mismo o para otro cliente.

### 5.5 Entrenamiento (cliente)

- **RF-40 [F1] Pantalla "Hoy".** Al entrar, el cliente ve la rutina que le toca ese día o, si no tiene días fijos, sus rutinas para elegir.
- **RF-41 [F1] Modo entrenamiento.** El cliente recorre la rutina ejercicio por ejercicio y registra, por serie, lo que hizo realmente: peso, repeticiones y, si el entrenador lo pidió, RPE. Puede saltar ejercicios, agregar series y dejar la sesión a medias.
- **RF-42 [F1] Temporizador de descanso** que arranca solo al marcar una serie como hecha, con el tiempo que definió el entrenador, y avisa con vibración o sonido.
- **RF-43 [F1] "La última vez".** Al lado de cada ejercicio se muestra lo que el cliente hizo en su sesión anterior de ese ejercicio.
- **RF-44 [F1] Cierre de sesión.** Al terminar, el cliente puede dejar su sensación (esfuerzo percibido de 1 a 10) y un comentario (dolor, energía, lo que quiera).
- **RF-45 [F1] Registro en clase presencial.** El entrenador puede abrir el modo entrenamiento en nombre de un cliente y registrar la sesión desde su propio teléfono. La sesión queda en el historial del cliente igual que si la hubiera registrado él.
- **RF-46 [F1] Historial de sesiones** del cliente, con fecha, rutina, detalle por serie y comentarios.
- **RF-47 [F2] Uso sin conexión.** El cliente puede ver su rutina y registrar la sesión sin internet; los datos se sincronizan cuando vuelve la conexión.
- **RF-48 [F2] Calculadoras**: 1RM estimado, porcentajes de carga y discos por lado de la barra.

### 5.6 Métricas personalizadas

Una métrica es cualquier cosa que el entrenador quiera medir cada tanto y seguir en el tiempo: salto vertical, tiempo en 5 km, dominadas máximas, flexibilidad, etc.

- **RF-50 [F1] Crear métricas.** El entrenador define una métrica con:
  - nombre (por ejemplo, "Salto vertical"),
  - unidad (cm, kg, segundos, repeticiones, etc.),
  - sentido: si un valor mayor o menor es mejor,
  - protocolo opcional: cómo se toma la medición, en texto y opcionalmente con un video propio (mismas reglas que [RF-22](#53-biblioteca-de-ejercicios)).
- **RF-51 [F1] Asignar métricas a clientes.** Una misma métrica se puede asignar a varios clientes. Cada cliente ve solo las suyas.
- **RF-52 [F1] Registrar mediciones** con fecha, valor y nota opcional. Si en una misma toma hay varios intentos, se cargan todos y cuenta el mejor.
- **RF-53 [F1] Quién mide.** Por defecto registra el entrenador. Para cada métrica asignada a un cliente, puede habilitar que ese cliente también cargue sus propias mediciones (así funciona también con las predefinidas). Cada medición indica quién la cargó, y el cliente solo puede editar o borrar las suyas.
- **RF-54 [F1] Ver la evolución** de cada métrica: gráfica en el tiempo, mejor marca, última medición y diferencia con la anterior.
- **RF-55 [F1] Medidas corporales como métricas.** Peso, perímetros y porcentaje de grasa vienen como métricas predefinidas, con el mismo funcionamiento que el resto.
- **RF-56 [F2] Objetivo por métrica.** El entrenador puede fijar un valor objetivo por cliente, que se muestra en la gráfica.

### 5.7 Progreso y seguimiento

- **RF-60 [F1] Gráficas de ejercicios**: carga máxima y volumen por ejercicio a lo largo del tiempo, a partir de las sesiones registradas.
- **RF-61 [F1] Comentarios del entrenador sobre una sesión.** El entrenador puede dejar una devolución en una sesión registrada, y el cliente la ve en su historial. No es un chat: un comentario por sesión, sin respuestas.
- **RF-62 [F2] Récords personales** detectados automáticamente en ejercicios y métricas, y destacados al cliente cuando los logra.
- **RF-63 [F2] Adherencia**: sesiones hechas contra sesiones planificadas, por semana y por mes.
- **RF-64 [F2] Fotos de progreso** (frente, perfil, espalda) con fecha. Solo las ven el cliente y su entrenador, y se pueden comparar dos fechas lado a lado.
- **RF-65 [F2] Check-in semanal.** Formulario corto que el cliente completa una vez por semana (sueño, estrés, cumplimiento, comentarios). El entrenador ve los pendientes y los respondidos.

### 5.8 Panel del entrenador

- **RF-70 [F1] Panel de inicio** del entrenador con:
  - sesiones registradas recientemente, sin comentario suyo todavía,
  - clientes que no entrenan hace más de X días (X configurable),
  - mediciones de métricas cargadas por clientes.
- **RF-71 [F2]** Se suman al panel: check-ins pendientes, pagos vencidos y turnos del día.

### 5.9 Agenda

- **RF-80 [F2] Calendario de sesiones presenciales** del entrenador, con vista de día y de semana.
- **RF-81 [F2] Disponibilidad y reservas.** El entrenador define sus horarios disponibles y el cliente reserva un turno dentro de ellos. El entrenador puede aceptar, cancelar o mover un turno.
- **RF-82 [F2] Exportar a calendario** (.ics o Google Calendar).

### 5.10 Planes y pagos

No hay cobro online en la app: los pagos se registran a mano.

- **RF-90 [F2] Planes.** El entrenador define planes (por ejemplo, "8 clases por mes" u "online mensual") con precio y duración.
- **RF-91 [F2] Asignar un plan a un cliente** y llevar la cuenta de clases usadas y restantes.
- **RF-92 [F2] Registrar pagos** con fecha, monto y medio. La app muestra cuándo vence cada plan y avisa al entrenador.

### 5.11 Notificaciones y exportación

- **RF-100 [F2] Notificaciones push**: recordatorio de entrenar al cliente, aviso al entrenador cuando un cliente registra una sesión, aviso al cliente cuando el entrenador comenta. En iPhone solo funcionan con la PWA instalada.
- **RF-101 [F2] Exportar** una rutina a PDF (para imprimir) y el historial de un cliente a CSV.

### 5.12 Comercial

- **RF-110 [F3] Suscripción de entrenadores** con planes según cantidad de clientes.
- **RF-111 [F3] Apps nativas** para Android y iOS con las mismas funciones, sobre el mismo backend.
- **RF-112 [F3] Marca del entrenador**: logo y color propio que ven sus clientes.
- **RF-113 [F3] Varios idiomas.**

## 6. Requisitos no funcionales

- <a id="rnf-01"></a>**RNF-01 Multi-entrenador desde el día uno.** Aunque la fase 1 tenga un solo entrenador, todos los datos (clientes, ejercicios, rutinas, métricas, videos) pertenecen a un entrenador y el acceso se controla con Row Level Security de Supabase. Pasar a varios entrenadores no puede requerir migrar datos ni rehacer permisos.
- **RNF-02 Privacidad.** Un cliente nunca puede leer datos de otro cliente, ni siquiera consultando la API de Supabase directamente. Los videos y fotos se guardan en buckets privados y se sirven con URLs firmadas de corta duración.
- **RNF-03 Límites en Storage.** Cada bucket define tipos de archivo permitidos y tamaño máximo. No se acepta ningún archivo que no sea el esperado.
- **RNF-04 Mobile-first.** Todas las pantallas se diseñan primero para 360 px de ancho, con botones cómodos para usar con el pulgar. Sin scroll horizontal.
- **RNF-05 Compatible con GitHub Pages.** La app es 100 % estática; las rutas funcionan sin configuración de servidor (por ejemplo, con rutas por hash).
- **RNF-06 Reutilizable para las apps nativas.** La lógica de datos y las reglas de negocio viven en la base (Postgres, RLS, funciones) o en código separado de la interfaz, para que las apps de la fase 3 las reutilicen.
- **RNF-07 Rendimiento.** La pantalla "Hoy" y el modo entrenamiento cargan en menos de 2 segundos con una conexión 4G.

## 7. Fuera de alcance

- Nutrición: macros, calorías, planes de comidas.
- Seguimiento de hábitos: agua, pasos, sueño (salvo como pregunta del check-in semanal).
- Chat entre entrenador y cliente. Los comentarios sobre sesiones ([RF-61](#57-progreso-y-seguimiento)) cubren la devolución puntual.
- Cobro online dentro de la app.
- Videos de YouTube u otras plataformas externas en los ejercicios.

## 8. Preguntas abiertas

- **P-01 Espacio de Storage.** El plan gratis de Supabase trae 1 GB de almacenamiento y 5 GB de transferencia por mes. Un video de 60 s grabado con el teléfono pesa entre 20 y 100 MB, así que entran pocas decenas de videos, y cada vez que un cliente mira uno se consume transferencia. Opciones: comprimir el video en el teléfono antes de subirlo, bajar la resolución a 720p, pasar a Supabase Pro, o guardar los videos en otro servicio (por ejemplo, Cloudflare R2, sin costo de transferencia). Hay que decidirlo antes de construir RF-22.
- **P-02 Duración máxima de los videos.** Propuesta: 60 segundos. ¿Alcanza para los ejercicios que tenés en mente?
- **P-03 Nombre y dominio.** "PTrainer" es provisional. Con GitHub Pages la dirección sería `guillermogonzalezt.github.io/ptrainer` salvo que se compre un dominio.
- **P-04 Datos de salud.** Lesiones, cuestionario PAR-Q y fotos son datos sensibles. Antes de abrir a otros entrenadores (fase 3) hace falta política de privacidad y términos de uso.
