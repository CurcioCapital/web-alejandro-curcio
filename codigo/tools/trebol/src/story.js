/* ------------------------------------------------------------------
   STORY — texto de «La historia del trébol» dividido en 4 actos (= 4 hojas).
   Forma: { title, subtitle, signature, acts:[{ leaf:1..4, label,
            beats:[{ text, kind:"read"|"big" }] }] }
   · kind "read": párrafo que se lee en el carrusel (pausa ~45–70vh según largo).
   · kind "big":  frase sola, display enorme en serif itálica (pausa ~95vh).
   · El ÚLTIMO beat del último acto es el cierre: trébol completo + firma.
   Para reemplazar: pegar acá el contenido de editorial.json.
   ------------------------------------------------------------------ */
const STORY = {
  title: 'La historia del trébol.',
  subtitle: 'Un legado que nació en una familia y hoy pertenece a todos.',
  signature: 'Alejandro Curcio',
  acts: [
    {
      leaf: 1,
      label: 'El cajón',
      beats: [
        { kind: 'read', text: 'Hay símbolos que se eligen. Y hay otros que la vida nos entrega, casi sin que nos demos cuenta, para recordarnos de dónde venimos y qué queremos dejar.' },
        { kind: 'read', text: 'La historia de nuestro trébol de cuatro hojas comienza mucho antes de que existiera este equipo solidario. Comienza con mi abuelo, con mi padre y con un pequeño objeto que atravesó generaciones.' },
        { kind: 'read', text: 'Cuando mi padre falleció, a los 96 años, encontré algo muy especial en uno de los cajones de su escritorio. Guardaba tres cosas: una nuez, una pequeña imagen de la Virgen y un trébol de cuatro hojas disecado, acompañado de una inscripción.' },
        { kind: 'big', text: 'Aquel trébol había sido un regalo de su padre cuando él nació.' }
      ]
    },
    {
      leaf: 2,
      label: 'Tres generaciones',
      beats: [
        { kind: 'read', text: 'Mi abuelo falleció víctima de la gripe española cuando mi padre tenía apenas un año y medio. Prácticamente no tuvo la oportunidad de conocerlo.' },
        { kind: 'read', text: 'Sin embargo, aquel pequeño trébol lo acompañó durante toda su vida. Lo conservó por más de nueve décadas, como quien guarda algo cuyo valor no puede medirse.' },
        { kind: 'read', text: 'Cuando lo encontré, me emocionó profundamente pensar en todo lo que representaba. Mi padre había tenido el privilegio de vivir una vida larga, con alegrías, dificultades, aciertos y desafíos. Una vida plena, como son las vidas verdaderas. Y si algo lo caracterizaba era su generosidad.' },
        { kind: 'read', text: 'Comprendí entonces que aquel trébol era mucho más que un recuerdo. Era una manera de mantener presente a su padre, a quien había perdido siendo apenas un niño.' },
        { kind: 'read', text: 'Y, de alguna forma, sentí que ese pequeño símbolo estaba llegando también a mis manos como un legado de mi abuelo.' },
        { kind: 'big', text: 'Tres generaciones unidas por un trébol de cuatro hojas.' }
      ]
    },
    {
      leaf: 3,
      label: 'Compartirlo',
      beats: [
        { kind: 'read', text: 'Podría haberlo guardado entre mis recuerdos más íntimos. Pero sentí que su verdadero valor estaba en hacer exactamente lo contrario: compartirlo.' },
        { kind: 'read', text: 'Porque los legados más importantes no son los bienes materiales. Son los valores, los principios, los gestos y, sobre todo, lo que hacemos por los demás.' },
        { kind: 'big', text: 'Así nació nuestro trébol solidario.' },
        { kind: 'read', text: 'Quise transformar aquel recuerdo familiar en un símbolo colectivo. Que dejara de representar solamente nuestra historia para acompañar nuevas historias. Que no estuviera asociado al dinero, al éxito económico ni al reconocimiento personal, sino a algo mucho más importante: la solidaridad, la generosidad y la contribución a la sociedad.' },
        { kind: 'read', text: 'Con el tiempo, se fueron sumando personas extraordinarias, amigos que comparten esa misma manera de entender la vida: Fernando Montero, Nico Acosta, Andrés Garófalo y el padre Juan Andrés, nuestro querido Gordo Verde, entre tantos otros que nos han acompañado.' },
        { kind: 'read', text: 'Juntos formamos un equipo que encuentra en cada proyecto una nueva oportunidad para ayudar.' },
        { kind: 'read', text: 'Nuestro trébol estuvo presente en la construcción de viviendas, en la entrega de platos de comida, en iniciativas vinculadas a la Teletón y en numerosas acciones solidarias. También acompañó proyectos que, a primera vista, podrían parecer muy distintos: automóviles de drift, encuentros multitudinarios y desafíos que combinan creatividad, trabajo, pasión y compromiso social.' },
        { kind: 'read', text: 'Y llegó incluso a formar parte de algo tan especial como la construcción de un Papamóvil, un proyecto que nos llenó de orgullo y que llevó nuestro pequeño símbolo a una dimensión que jamás hubiéramos imaginado.' }
      ]
    },
    {
      leaf: 4,
      label: 'De mano en mano',
      beats: [
        { kind: 'read', text: 'Porque detrás de cada uno de esos proyectos hay una misma convicción: cuando tenemos la posibilidad de hacer algo por los demás, tenemos también la oportunidad de darle un sentido más profundo a lo que hacemos. A veces contribuimos con recursos. Otras veces, con trabajo, conocimiento, tiempo, creatividad o simplemente estando presentes.' },
        { kind: 'big', text: 'No importa la magnitud del gesto. Importa la intención con la que se hace.' },
        { kind: 'read', text: 'Hoy, cuando veo nuestro trébol en un vehículo, en una vivienda, en un evento o en cualquier iniciativa solidaria, vuelvo mentalmente a aquel cajón del escritorio de mi padre. Y pienso en lo extraordinario que resulta que algo tan pequeño, que mi abuelo regaló hace casi un siglo, pueda seguir generando cosas buenas tantos años después.' },
        { kind: 'big', text: 'Mi padre lo conservó durante toda su vida. Yo elegí compartirlo.' },
        { kind: 'read', text: 'Y mi mayor deseo es que ese trébol continúe pasando de mano en mano, inspirando a otros a ayudar, a construir, a acompañar y a devolverle a la sociedad algo de todo lo que la vida nos ha dado.' },
        { kind: 'read', text: 'Porque, al final, el verdadero legado de una persona no está solamente en lo que consiguió, sino en lo que fue capaz de compartir.' },
        { kind: 'big', text: 'Nuestro trébol tiene cuatro hojas. Pero su verdadero valor está en todo lo que podemos hacer juntos.' }
      ]
    }
  ]
};
