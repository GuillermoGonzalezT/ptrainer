-- Empareja las series dentro de cada superserie o circuito (RF-33).
--
-- En un bloque se hace una vuelta de todos los ejercicios, uno atrás del
-- otro, así que no puede haber uno con 3 series y otro con 4: el modo
-- entrenamiento avanza por vueltas igual. Las rutinas armadas antes de que
-- el editor emparejara el bloque pueden haber quedado disparejas.
--
-- Cada bloque toma las series de su primer ejercicio, que es lo mismo que
-- muestra el editor al abrirlo. Correrla de nuevo no cambia nada.

update public.rutina_ejercicios re
set series = primero.series
from (
  select distinct on (rutina_id, superserie) rutina_id, superserie, series
  from public.rutina_ejercicios
  where superserie is not null
  order by rutina_id, superserie, orden
) as primero
where re.superserie is not null
  and re.rutina_id = primero.rutina_id
  and re.superserie = primero.superserie
  and re.series is distinct from primero.series;
