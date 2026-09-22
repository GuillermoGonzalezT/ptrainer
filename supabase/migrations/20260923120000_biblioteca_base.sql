-- Biblioteca base de ejercicios (RF-24): un punto de partida para que un
-- entrenador nuevo no arranque de cero.
--
-- Son ejercicios sin entrenador (entrenador_id null): los ve todo el mundo y
-- nadie los edita (lo impiden las policies de `ejercicios`). No traen video:
-- el video es lo propio de cada entrenador, que puede copiar el ejercicio a
-- su biblioteca y grabarse.

-- Para poder correr la carga más de una vez sin duplicar.
create unique index ejercicios_base_nombre on public.ejercicios (lower(nombre)) where entrenador_id is null;

insert into public.ejercicios (entrenador_id, nombre, grupo_muscular, equipamiento, descripcion, consejos) values
  (null, 'Sentadilla con barra', 'Piernas', 'Barra', 'Con la barra apoyada en la espalda alta, bajás flexionando caderas y rodillas hasta que los muslos queden al menos paralelos al piso, y subís empujando el piso con los pies.', 'Rodillas en la misma dirección que las puntas de los pies. Bajá controlado y mantené el pecho arriba.'),
  (null, 'Sentadilla goblet', 'Piernas', 'Mancuernas', 'Sostenés una mancuerna contra el pecho con las dos manos y hacés la sentadilla manteniendo el torso erguido.', 'Es la mejor forma de aprender el movimiento: el peso adelante ayuda a mantener la espalda derecha.'),
  (null, 'Sentadilla búlgara', 'Piernas', 'Mancuernas', 'Con un pie apoyado atrás sobre un banco, bajás con la pierna de adelante hasta que la rodilla de atrás casi toque el piso.', 'Separá bien el pie de adelante del banco para que la rodilla no se vaya más allá de la punta del pie.'),
  (null, 'Prensa de piernas', 'Piernas', 'Máquina', 'Sentado en la máquina, empujás la plataforma con los pies hasta casi estirar las rodillas y volvés controlando.', 'No estires las rodillas del todo ni dejes que la cadera se despegue del respaldo.'),
  (null, 'Zancadas', 'Piernas', 'Mancuernas', 'Das un paso al frente y bajás hasta que las dos rodillas queden en 90 grados; volvés empujando con la pierna de adelante.', 'Si te cuesta el equilibrio, hacelas en el lugar antes de hacerlas caminando.'),
  (null, 'Peso muerto', 'Piernas', 'Barra', 'Con la barra en el piso, la levantás estirando caderas y rodillas, manteniendo la espalda firme y la barra pegada al cuerpo.', 'Empezá el movimiento empujando el piso, no tirando con la espalda.'),
  (null, 'Peso muerto rumano', 'Piernas', 'Barra', 'Desde parado, llevás la cadera atrás bajando la barra pegada a las piernas hasta sentir tensión atrás del muslo, y volvés.', 'Las rodillas quedan casi estiradas: el movimiento es de cadera, no de rodilla.'),
  (null, 'Extensión de cuádriceps', 'Piernas', 'Máquina', 'Sentado en la máquina, estirás las rodillas contra la resistencia y volvés controlando.', 'Pausá un segundo arriba y bajá despacio.'),
  (null, 'Curl femoral', 'Piernas', 'Máquina', 'Flexionás las rodillas contra la resistencia, acostado o sentado según la máquina.', 'Evitá que la cadera se levante: el movimiento es solo de rodilla.'),
  (null, 'Elevación de gemelos', 'Piernas', 'Peso corporal', 'Parado, subís los talones lo más alto posible y bajás controlando hasta estirar.', 'Hacelo con el rango completo, mejor lento que con impulso.'),
  (null, 'Hip thrust', 'Glúteos', 'Barra', 'Con la espalda alta apoyada en un banco y la barra sobre la cadera, subís la cadera hasta alinear el cuerpo y bajás.', 'Apretá los glúteos arriba y evitá arquear la zona lumbar.'),
  (null, 'Puente de glúteos', 'Glúteos', 'Peso corporal', 'Acostado boca arriba con las rodillas flexionadas, subís la cadera hasta alinear rodillas, cadera y hombros.', 'Es el paso previo al hip thrust, ideal para empezar.'),
  (null, 'Patada de glúteo en polea', 'Glúteos', 'Polea', 'Con el tobillo atado a la polea baja, llevás la pierna hacia atrás manteniendo el torso quieto.', 'Movimiento corto y controlado; no compenses arqueando la espalda.'),
  (null, 'Abducción de cadera', 'Glúteos', 'Máquina', 'Sentado en la máquina, separás las rodillas contra la resistencia y volvés despacio.', 'Inclinar un poco el torso hacia adelante trabaja más el glúteo.'),
  (null, 'Press de banca', 'Pecho', 'Barra', 'Acostado en el banco, bajás la barra al pecho controlando y la empujás hasta estirar los brazos.', 'Omóplatos juntos y pies firmes en el piso. Con cargas altas, entrená con alguien al lado.'),
  (null, 'Press inclinado con mancuernas', 'Pecho', 'Mancuernas', 'En un banco inclinado, empujás las mancuernas desde los hombros hasta arriba y bajás controlando.', 'No choques las mancuernas arriba: la tensión se pierde.'),
  (null, 'Aperturas en polea', 'Pecho', 'Polea', 'Con una polea en cada mano y los codos apenas flexionados, juntás las manos adelante del cuerpo.', 'Pensá en abrazar, no en empujar.'),
  (null, 'Flexiones de brazos', 'Pecho', 'Peso corporal', 'Con el cuerpo en línea recta, bajás el pecho hasta cerca del piso y empujás para volver.', 'Si te cuesta, apoyá las manos en un banco; si sobran, subí los pies.'),
  (null, 'Fondos en paralelas', 'Pecho', 'Peso corporal', 'Suspendido en las paralelas, bajás flexionando los codos y subís empujando.', 'Con el torso inclinado adelante trabaja más el pecho; erguido, más el tríceps.'),
  (null, 'Dominadas', 'Espalda', 'Peso corporal', 'Colgado de la barra, subís hasta pasar el mentón y bajás controlando hasta estirar los brazos.', 'Si todavía no salen, hacelas con banda elástica o en máquina asistida.'),
  (null, 'Jalón al pecho', 'Espalda', 'Polea', 'Sentado, llevás la barra al pecho tirando con la espalda y volvés controlando.', 'Llevá los codos hacia abajo y atrás, sin tirar con las manos.'),
  (null, 'Remo con barra', 'Espalda', 'Barra', 'Con el torso inclinado y la espalda firme, tirás la barra hacia el abdomen y bajás controlando.', 'Mantené el mismo ángulo de torso durante toda la serie.'),
  (null, 'Remo con mancuerna', 'Espalda', 'Mancuernas', 'Con una rodilla y una mano apoyadas en el banco, tirás la mancuerna hacia la cadera.', 'Llevá el codo pegado al cuerpo y no gires el torso.'),
  (null, 'Remo en polea baja', 'Espalda', 'Polea', 'Sentado, tirás el agarre hacia el abdomen juntando los omóplatos y volvés estirando.', 'El torso queda casi quieto: no te balancees.'),
  (null, 'Press militar', 'Hombros', 'Barra', 'De pie, empujás la barra desde los hombros hasta arriba de la cabeza y bajás controlando.', 'Apretá glúteos y abdomen para no arquear la espalda.'),
  (null, 'Press de hombros con mancuernas', 'Hombros', 'Mancuernas', 'Sentado o de pie, empujás las mancuernas desde los hombros hasta estirar los brazos.', 'Bajá hasta que los codos queden a la altura de los hombros.'),
  (null, 'Elevaciones laterales', 'Hombros', 'Mancuernas', 'Con los brazos al costado, subís las mancuernas hasta la altura de los hombros y bajás despacio.', 'Poco peso y mucho control: si tenés que tirar con impulso, está pesado.'),
  (null, 'Pájaros', 'Hombros', 'Mancuernas', 'Con el torso inclinado adelante, abrís los brazos a los costados hasta la altura de los hombros.', 'Trabaja la parte de atrás del hombro: bajá el peso y priorizá la técnica.'),
  (null, 'Face pull', 'Hombros', 'Polea', 'Con la polea a la altura de la cara, tirás el agarre hacia la frente separando las manos.', 'Excelente para compensar tanto trabajo de empuje.'),
  (null, 'Curl con barra', 'Bíceps', 'Barra', 'De pie, flexionás los codos subiendo la barra y bajás controlando hasta estirar.', 'Codos pegados al cuerpo y sin balancear el torso.'),
  (null, 'Curl con mancuernas', 'Bíceps', 'Mancuernas', 'Flexionás los codos girando las palmas hacia arriba, de a una mano o las dos a la vez.', 'Bajá siempre hasta estirar del todo.'),
  (null, 'Curl martillo', 'Bíceps', 'Mancuernas', 'Igual que el curl, pero con las palmas enfrentadas durante todo el movimiento.', 'Trabaja más el antebrazo y suele molestar menos el codo.'),
  (null, 'Extensión de tríceps en polea', 'Tríceps', 'Polea', 'Con los codos pegados al cuerpo, estirás los brazos hacia abajo y volvés controlando.', 'Lo único que se mueve es el antebrazo.'),
  (null, 'Press francés', 'Tríceps', 'Barra', 'Acostado, bajás la barra hacia la frente flexionando los codos y estirás para volver.', 'Si te molestan los codos, probá con barra Z o con mancuernas.'),
  (null, 'Fondos en banco', 'Tríceps', 'Peso corporal', 'Con las manos en el borde de un banco, bajás flexionando los codos y empujás para subir.', 'Cuanto más lejos los pies, más difícil.'),
  (null, 'Plancha', 'Core', 'Peso corporal', 'Apoyado en antebrazos y puntas de pies, sostenés el cuerpo en línea recta.', 'Apretá glúteos y abdomen; mejor 20 segundos firmes que un minuto con la cadera caída.'),
  (null, 'Plancha lateral', 'Core', 'Peso corporal', 'De costado, apoyado en un antebrazo, sostenés la cadera arriba con el cuerpo alineado.', 'Si te cuesta, apoyá la rodilla de abajo.'),
  (null, 'Crunch abdominal', 'Core', 'Peso corporal', 'Acostado boca arriba, despegás los hombros del piso llevando las costillas hacia la cadera.', 'No tires del cuello con las manos.'),
  (null, 'Elevación de piernas colgado', 'Core', 'Peso corporal', 'Colgado de la barra, subís las piernas al frente controlando la bajada.', 'Empezá con las rodillas flexionadas; sin balanceo.'),
  (null, 'Rueda abdominal', 'Core', 'Otro', 'De rodillas, rodás la rueda hacia adelante lo más lejos que puedas sin arquear la espalda, y volvés.', 'Llegá solo hasta donde puedas mantener la zona lumbar firme.'),
  (null, 'Pallof press', 'Core', 'Polea', 'De costado a la polea, estirás los brazos al frente resistiendo el giro del torso.', 'El objetivo es no girar: cuanto más lejos de la polea, más difícil.'),
  (null, 'Burpees', 'Cuerpo completo', 'Peso corporal', 'Desde parado bajás a la plancha, hacés una flexión, volvés y saltás.', 'Para bajar el impacto, hacelo sin salto y con pasos en lugar de salto atrás.'),
  (null, 'Kettlebell swing', 'Cuerpo completo', 'Kettlebell', 'Balanceás la pesa rusa entre las piernas y la impulsás al frente estirando la cadera con fuerza.', 'El impulso sale de la cadera, no de los brazos ni de la sentadilla.'),
  (null, 'Thruster', 'Cuerpo completo', 'Barra', 'Hacés una sentadilla frontal y, al subir, aprovechás el envión para empujar la barra arriba.', 'Un solo movimiento continuo: sentadilla y press.'),
  (null, 'Caminata en cinta', 'Cardio', 'Máquina', 'Caminata continua, con o sin inclinación, al ritmo que permita hablar con dificultad.', 'Buena opción para sumar actividad sin cansancio acumulado.'),
  (null, 'Bicicleta fija', 'Cardio', 'Máquina', 'Pedaleo continuo o por intervalos, ajustando la resistencia.', 'Ajustá el asiento: la rodilla queda apenas flexionada abajo.'),
  (null, 'Remo en máquina', 'Cardio', 'Máquina', 'Remada completa: primero empujás con las piernas, después tirás con la espalda y los brazos.', 'El orden importa: piernas, espalda, brazos, y al revés para volver.'),
  (null, 'Salto a la cuerda', 'Cardio', 'Otro', 'Saltos continuos con la cuerda, en series cortas.', 'Saltos bajos y muñecas sueltas.'),
  (null, 'Movilidad de cadera 90/90', 'Movilidad', 'Peso corporal', 'Sentado con las dos rodillas en 90 grados, girás de un lado al otro sin usar las manos.', 'Movimiento lento, sin dolor, respirando.'),
  (null, 'Gato-camello', 'Movilidad', 'Peso corporal', 'En cuatro apoyos, alternás entre arquear y redondear la espalda.', 'Acompañá con la respiración: inhalás al arquear, exhalás al redondear.'),
  (null, 'Estiramiento de isquiotibiales', 'Movilidad', 'Peso corporal', 'Con una pierna estirada adelante, llevás la cadera atrás hasta sentir tensión atrás del muslo.', 'Tensión sí, dolor no. Sostené entre 20 y 30 segundos.')
on conflict do nothing;
