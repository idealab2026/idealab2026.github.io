/* Expedientes F11/F12: identificación biográfica y declaraciones atribuidas a cada fuente. Verificar homónimos, especialmente Jesús Hernández Tomás, distinto del historiador. */
(function(){
const extra={
  "version": 1,
  "updatedAt": "2026-11-10",
  "sourceIds": {
    "11": "idealab-f11-source",
    "12": "idealab-f12-source"
  },
  "sourceUrls": {
    "11": "https://www.youtube.com/watch?v=ifklD4aJXv8",
    "12": "https://www.youtube.com/watch?v=TuWoahXCal0"
  },
  "sourceLabels": {
    "11": "Fernando Paz · Secretos de la Guerra Civil",
    "12": "Juan Manuel de Prada · España y el mundo"
  },
  "profiles": {
    "Fernando Paz": {
      "who": "Historiador, escritor y divulgador español dedicado a la historia contemporánea, especialmente a la Guerra Civil y la Segunda Guerra Mundial.",
      "portrait": null,
      "sources": {
        "11": [
          {
            "topic": "Marco interpretativo de la Segunda República y la Guerra Civil",
            "speaker": "Fernando Paz",
            "statement": "Fernando Paz presenta una interpretación de las causas de la Guerra Civil y sostiene que la radicalización política y la imposibilidad de alcanzar acuerdos en 1936 contribuyeron al conflicto. Sus juicios sobre la responsabilidad de cada bando son tesis del entrevistado, no conclusiones que deban atribuirse automáticamente al conjunto de la historiografía.",
            "status": "opinion_atribuida",
            "transcriptVerified": true,
            "audioVerified": false,
            "minuteVerified": false,
            "transcriptAnchor": "cuando azaña quiere evitar"
          }
        ]
      }
    },
    "Francisco Franco": {
      "who": "Militar español que encabezó el bando sublevado durante la Guerra Civil y gobernó España como dictador hasta 1975.",
      "portrait": {
        "lang": "es",
        "title": "Francisco Franco"
      },
      "sources": {
        "11": [
          {
            "topic": "Incorporación de Franco al golpe y ascenso militar",
            "speaker": "Fernando Paz",
            "statement": "Paz sostiene que el asesinato de José Calvo Sotelo influyó en la decisión de Franco de sumarse definitivamente al levantamiento militar. Compara además su prestigio en el Ejército de África con el de otros conspiradores. La cronología de su decisión personal es una interpretación histórica que requiere contraste documental independiente.",
            "status": "opinion_atribuida",
            "transcriptVerified": true,
            "audioVerified": false,
            "minuteVerified": false,
            "transcriptAnchor": "Calvo Sotelo"
          }
        ],
        "12": [
          "Franco habría modificado, según Juan Manuel de Prada, la composición y orientación diplomática de sus gobiernos conforme la Alemania nazi empezó a perder la Segunda Guerra Mundial."
        ]
      }
    },
    "Manuel Azaña": {
      "who": "Escritor y político republicano español, jefe del Gobierno de la Segunda República y presidente de la República entre 1936 y 1939.",
      "portrait": {
        "lang": "es",
        "title": "Manuel Azaña"
      },
      "sources": {
        "11": [
          {
            "topic": "Nombramiento de Martínez Barrio en julio de 1936",
            "speaker": "Fernando Paz",
            "statement": "Paz afirma que Azaña intentó contener la escalada tras el inicio de la sublevación sustituyendo a Casares Quiroga por Diego Martínez Barrio, a quien consideraba más conciliador. Sugiere que una decisión anterior de ese tipo quizá habría evitado la guerra; esa última proposición es un contrafactual, no un hecho comprobable.",
            "status": "opinion_atribuida",
            "transcriptVerified": true,
            "audioVerified": false,
            "minuteVerified": false,
            "transcriptAnchor": "azaña quiere evitar"
          }
        ]
      }
    },
    "Emilio Mola": {
      "who": "General del Ejército español y principal organizador de la conspiración militar de julio de 1936; murió en un accidente aéreo en 1937.",
      "portrait": {
        "lang": "es",
        "title": "Emilio Mola"
      },
      "sources": {
        "11": [
          {
            "topic": "Dirección de la conspiración y contactos con Martínez Barrio",
            "speaker": "Fernando Paz",
            "statement": "Paz describe a Mola como organizador principal de la conspiración militar y relata una conversación con Martínez Barrio durante la que el general habría alegado que ya no podía detener la sublevación. La entrevista no aporta el registro original de esa conversación ni permite contrastar literalmente lo dicho.",
            "status": "opinion_atribuida",
            "transcriptVerified": true,
            "audioVerified": false,
            "minuteVerified": false,
            "transcriptAnchor": "Martínez barrio habla con una serie de militares"
          }
        ]
      }
    },
    "Juan Negrín": {
      "who": "Médico y político español del PSOE, ministro de Hacienda y presidente del Gobierno de la Segunda República entre 1937 y 1939.",
      "portrait": {
        "lang": "es",
        "title": "Juan Negrín"
      },
      "sources": {
        "11": [
          {
            "topic": "Gestión de reservas de oro republicanas",
            "speaker": "Fernando Paz",
            "statement": "Paz sitúa a Negrín como ministro de Hacienda durante el traslado de las reservas de oro republicanas desde Cartagena hacia la Unión Soviética en 1936. Critica los términos de valoración y custodia de esos activos; las acusaciones sobre actuaciones soviéticas deben distinguirse de los movimientos materiales documentables.",
            "status": "opinion_atribuida",
            "transcriptVerified": true,
            "audioVerified": false,
            "minuteVerified": false,
            "transcriptAnchor": "negrín era el ministro de hacienda"
          }
        ]
      }
    },
    "Adolf Hitler": {
      "who": "Político y dictador alemán, líder del régimen nacionalsocialista desde 1933 hasta 1945.",
      "portrait": {
        "lang": "es",
        "title": "Adolf Hitler"
      },
      "sources": {
        "11": [
          "Adolf Hitler y la Alemania nazi aparecen en el relato del historiador sobre las posiciones de las potencias europeas ante la Guerra Civil y el exilio de intelectuales españoles."
        ],
        "12": [
          "Hitler ordenó invadir la Unión Soviética; Juan Manuel de Prada sitúa ese acontecimiento como punto de cambio en la actividad de la resistencia comunista francesa durante la ocupación alemana."
        ]
      }
    },
    "Benito Mussolini": {
      "who": "Dirigente italiano y fundador del fascismo, gobernó Italia como dictador desde la década de 1920 hasta 1943.",
      "portrait": {
        "lang": "es",
        "title": "Benito Mussolini"
      },
      "sources": {
        "11": [
          {
            "topic": "Motivaciones italianas para intervenir en España",
            "speaker": "Fernando Paz",
            "statement": "Paz atribuye el apoyo de Mussolini a los sublevados a dos factores: su anticomunismo y la aspiración fascista de reforzar la posición italiana en el Mediterráneo. Cita la presencia italiana en Mallorca como parte de esa dimensión estratégica. Es su explicación causal, no una reconstrucción exhaustiva de las decisiones italianas.",
            "status": "opinion_atribuida",
            "transcriptVerified": true,
            "audioVerified": false,
            "minuteVerified": false,
            "transcriptAnchor": "anticomunismo militante de Mussolini"
          }
        ]
      }
    },
    "Iósif Stalin": {
      "who": "Dirigente de la Unión Soviética desde finales de la década de 1920 hasta 1953.",
      "portrait": {
        "lang": "es",
        "title": "Iósif Stalin"
      },
      "sources": {
        "11": [
          "Iósif Stalin es mencionado en la explicación de Fernando Paz sobre las negociaciones republicanas con Moscú y el cálculo del valor del oro del Banco de España transferido a la Unión Soviética."
        ],
        "12": [
          "Stalin habría llamado, según Juan Manuel de Prada, a los partidos comunistas europeos a intervenir activamente contra la ocupación nazi después de la invasión alemana de la Unión Soviética."
        ]
      }
    },
    "José Antonio Primo de Rivera": {
      "who": "Político y abogado español, fundador de Falange Española en 1933; fue ejecutado en Alicante en noviembre de 1936.",
      "portrait": {
        "lang": "es",
        "title": "José Antonio Primo de Rivera"
      },
      "sources": {
        "11": [
          "José Antonio Primo de Rivera habría valorado favorablemente la obra de Federico García Lorca, según Fernando Paz, quien también lo menciona al discutir las conspiraciones anteriores al alzamiento de julio de 1936."
        ]
      }
    },
    "Santiago Casares Quiroga": {
      "who": "Político republicano español, presidente del Consejo de Ministros entre mayo y julio de 1936.",
      "portrait": {
        "lang": "es",
        "title": "Santiago Casares Quiroga"
      },
      "sources": {
        "11": [
          "Santiago Casares Quiroga es descrito por Fernando Paz como el jefe de Gobierno cuyo talante dificultaba una negociación con los sublevados, circunstancia que Azaña habría intentado cambiar en julio de 1936."
        ]
      }
    },
    "Diego Martínez Barrio": {
      "who": "Político republicano español, presidente de las Cortes, jefe de Gobierno brevemente en julio de 1936 y presidente de la República en el exilio.",
      "portrait": {
        "lang": "es",
        "title": "Diego Martínez Barrio"
      },
      "sources": {
        "11": [
          "Martínez Barrio es presentado por Fernando Paz como la alternativa de gobierno escogida por Azaña ante el inicio del golpe; la entrevista también le atribuye vínculos con la masonería española."
        ]
      }
    },
    "José Calvo Sotelo": {
      "who": "Político monárquico español, ministro durante la dictadura de Primo de Rivera y diputado opositor durante la Segunda República, asesinado en julio de 1936.",
      "portrait": {
        "lang": "es",
        "title": "José Calvo Sotelo"
      },
      "sources": {
        "11": [
          "El asesinato de José Calvo Sotelo habría sido, según Fernando Paz, el hecho que decidió la incorporación definitiva de Franco a la conspiración militar."
        ]
      }
    },
    "José María Gil-Robles": {
      "who": "Abogado y político español, dirigente de la Confederación Española de Derechas Autónomas durante la Segunda República.",
      "portrait": {
        "lang": "es",
        "title": "José María Gil-Robles"
      },
      "sources": {
        "11": [
          "Gil-Robles es citado por Fernando Paz por su descripción de la inseguridad política y por el intento, según la fuente, de localizarlo durante los acontecimientos del 13 de julio de 1936."
        ]
      }
    },
    "Francisco Largo Caballero": {
      "who": "Político y sindicalista español, dirigente del PSOE y la UGT y presidente del Gobierno republicano entre 1936 y 1937.",
      "portrait": {
        "lang": "es",
        "title": "Francisco Largo Caballero"
      },
      "sources": {
        "11": [
          "Largo Caballero aparece en la explicación de Fernando Paz sobre la formación de un ejército republicano organizado y los conflictos entre fuerzas políticas y milicias en la zona gubernamental."
        ]
      }
    },
    "Indalecio Prieto": {
      "who": "Político socialista español, dirigente del PSOE y ministro durante la Segunda República y la Guerra Civil.",
      "portrait": {
        "lang": "es",
        "title": "Indalecio Prieto"
      },
      "sources": {
        "11": [
          "Indalecio Prieto habría elogiado públicamente la capacidad militar de Franco antes de la sublevación, según Fernando Paz, quien también recuerda un discurso de agosto de 1936 sobre la superioridad material republicana."
        ]
      }
    },
    "José Sanjurjo": {
      "who": "General español, protagonista de la sublevación fallida de 1932 y señalado para dirigir el alzamiento de 1936 antes de morir en accidente aéreo.",
      "portrait": {
        "lang": "es",
        "title": "José Sanjurjo"
      },
      "sources": {
        "11": [
          {
            "topic": "Jefatura prevista del levantamiento y muerte en accidente",
            "speaker": "Fernando Paz",
            "statement": "Paz distingue la conspiración de 1936 del fallido golpe de Sanjurjo en agosto de 1932. Explica que estaba previsto que Sanjurjo dirigiera el levantamiento militar, pero falleció en un accidente aéreo el 20 de julio de 1936. Sus especulaciones sobre qué habría sucedido de sobrevivir se tratan como hipótesis.",
            "status": "opinion_atribuida",
            "transcriptVerified": true,
            "audioVerified": false,
            "minuteVerified": false,
            "transcriptAnchor": "sanjurjo que está en Portugal"
          }
        ]
      }
    },
    "Santiago Carrillo": {
      "who": "Político español, dirigente comunista y secretario general del Partido Comunista de España entre 1960 y 1982.",
      "portrait": {
        "lang": "es",
        "title": "Santiago Carrillo"
      },
      "sources": {
        "11": [
          {
            "topic": "Consejería de Orden Público y represión en Madrid",
            "speaker": "Fernando Paz",
            "statement": "Paz identifica a Santiago Carrillo como responsable de la Consejería de Orden Público de la Junta de Defensa de Madrid en 1936 y relaciona ese contexto con las sacas y asesinatos de presos. La atribución de responsabilidad personal directa por órdenes concretas exige documentos y examen historiográfico independiente: el episodio por sí solo no la acredita.",
            "status": "alegacion_no_verificada",
            "transcriptVerified": true,
            "audioVerified": false,
            "minuteVerified": false,
            "transcriptAnchor": "en la consejería de orden público está Santiago Carrillo"
          }
        ]
      }
    },
    "Federico García Lorca": {
      "who": "Poeta y dramaturgo español de la generación del 27, asesinado en Granada al comienzo de la Guerra Civil.",
      "portrait": {
        "lang": "es",
        "title": "Federico García Lorca"
      },
      "sources": {
        "11": [
          {
            "topic": "Asesinato de Lorca y calificación del hecho",
            "speaker": "Fernando Paz",
            "statement": "Paz considera el asesinato de Lorca un crimen cometido en la retaguardia sublevada y lo diferencia de una muerte en combate. Comenta que Lorca se refugió en la casa del poeta falangista Luis Rosales. Sus valoraciones sobre las intenciones de otros dirigentes son interpretaciones y deben distinguirse de los hechos biográficos.",
            "status": "opinion_atribuida",
            "transcriptVerified": true,
            "audioVerified": false,
            "minuteVerified": false,
            "transcriptAnchor": "el caso de Lorca es un caso"
          }
        ]
      }
    },
    "Luis Rosales": {
      "who": "Poeta y ensayista español vinculado a la generación del 36, cuya familia acogió a Federico García Lorca en Granada antes de su detención.",
      "portrait": {
        "lang": "es",
        "title": "Luis Rosales"
      },
      "sources": {
        "11": [
          {
            "topic": "Acogida de García Lorca en Granada",
            "speaker": "Fernando Paz",
            "statement": "Paz cita a Luis Rosales como el poeta falangista que dio refugio a Federico García Lorca en su casa de Granada antes del asesinato. La entrevista también atribuye a José Antonio Primo de Rivera admiración literaria por Lorca, pero no aporta la cita documental original de ese supuesto elogio.",
            "status": "opinion_atribuida",
            "transcriptVerified": true,
            "audioVerified": false,
            "minuteVerified": false,
            "transcriptAnchor": "Lorca es protegido por por Luis Rosales"
          }
        ]
      }
    },
    "George Orwell": {
      "who": "Escritor y periodista británico que combatió en la Guerra Civil española y publicó Homenaje a Cataluña en 1938.",
      "portrait": {
        "lang": "es",
        "title": "George Orwell"
      },
      "sources": {
        "11": [
          {
            "topic": "Testimonio sobre Barcelona y Homenaje a Cataluña",
            "speaker": "Fernando Paz",
            "statement": "Paz menciona la estancia de Orwell en Barcelona y su libro Homenaje a Cataluña al tratar la experiencia de extranjeros en la zona republicana. No atribuye a Orwell una participación en todos los episodios que describe sobre el conflicto: es una referencia a su experiencia y testimonio publicado.",
            "status": "mencion_contextual",
            "transcriptVerified": true,
            "audioVerified": false,
            "minuteVerified": false,
            "transcriptAnchor": "George orwell estuvo en Barcelona"
          }
        ]
      }
    },
    "Salvador Dalí": {
      "who": "Pintor y artista surrealista español nacido en Figueres en 1904, fallecido en 1989.",
      "portrait": {
        "lang": "es",
        "title": "Salvador Dalí"
      },
      "sources": {
        "11": [
          {
            "topic": "Posicionamiento político de intelectuales españoles",
            "speaker": "Fernando Paz",
            "statement": "Paz utiliza a Salvador Dalí como ejemplo de figuras culturales que terminaron apoyando a Franco, en contraste con escritores identificados con el bando republicano. Su valoración de cuántos intelectuales apoyaban cada bando es una generalización del entrevistado y necesita un criterio documental de cuantificación.",
            "status": "opinion_atribuida",
            "transcriptVerified": true,
            "audioVerified": false,
            "minuteVerified": false,
            "transcriptAnchor": "Salvador Dalí apoyó a Franco"
          }
        ]
      }
    },
    "Rafael Alberti": {
      "who": "Poeta y dramaturgo español de la generación del 27, vinculado al Partido Comunista y exiliado tras la Guerra Civil.",
      "portrait": {
        "lang": "es",
        "title": "Rafael Alberti"
      },
      "sources": {
        "11": [
          "Rafael Alberti es citado por Fernando Paz entre los intelectuales que apoyaron al Frente Popular y a la República durante la Guerra Civil."
        ]
      }
    },
    "Miguel Hernández": {
      "who": "Poeta y dramaturgo español, vinculado al bando republicano; murió en prisión en 1942.",
      "portrait": {
        "lang": "es",
        "title": "Miguel Hernández"
      },
      "sources": {
        "11": [
          "Miguel Hernández aparece, según Fernando Paz, entre los escritores significados en la defensa de la República durante la Guerra Civil."
        ]
      }
    },
    "Ramón J. Sender": {
      "who": "Escritor y periodista español, autor de Réquiem por un campesino español y de diversas obras sobre la Guerra Civil.",
      "portrait": {
        "lang": "es",
        "title": "Ramón J. Sender"
      },
      "sources": {
        "11": [
          "Ramón J. Sender es mencionado por Fernando Paz como uno de los autores que se alinearon con la causa republicana durante el conflicto."
        ]
      }
    },
    "José Bergamín": {
      "who": "Escritor y ensayista español de la generación del 27, participante en la vida cultural republicana y exiliado tras 1939.",
      "portrait": {
        "lang": "es",
        "title": "José Bergamín"
      },
      "sources": {
        "11": [
          "José Bergamín se incluye en la relación de intelectuales partidarios de la República que enumera Fernando Paz al hablar de la cultura durante la Guerra Civil."
        ]
      }
    },
    "José María Gironella": {
      "who": "Novelista y periodista español, conocido por Los cipreses creen en Dios y Un millón de muertos.",
      "portrait": {
        "lang": "es",
        "title": "José María Gironella"
      },
      "sources": {
        "11": [
          {
            "topic": "Origen de la cifra divulgativa del millón de muertos",
            "speaker": "Fernando Paz",
            "statement": "Paz afirma que una conocida obra de Gironella contribuyó a popularizar la cifra de «un millón de muertos» asociada a la Guerra Civil. Cuestiona que sea un recuento histórico riguroso y distingue muertes militares, represivas e indirectas. La cifra precisa debe contrastarse con estudios demográficos, no inferirse de una novela.",
            "status": "opinion_atribuida",
            "transcriptVerified": true,
            "audioVerified": false,
            "minuteVerified": false,
            "transcriptAnchor": "novela célebre de José María gironella"
          }
        ]
      }
    },
    "Jesús Hernández Tomás": {
      "who": "Político comunista español, ministro de Instrucción Pública y Bellas Artes durante el Gobierno de Largo Caballero.",
      "portrait": {
        "lang": "es",
        "title": "Jesús Hernández Tomás"
      },
      "sources": {
        "11": [
          {
            "topic": "Ministerio de Instrucción Pública y depuración del profesorado",
            "speaker": "Fernando Paz",
            "statement": "Paz alude al dirigente comunista Jesús Hernández Tomás, ministro de Instrucción Pública durante la Guerra Civil, y le atribuye una intensa depuración del profesorado universitario. La amplitud de las medidas y la comparación con depuraciones del bando sublevado son valoraciones del entrevistado que requieren evidencia archivística.",
            "status": "opinion_atribuida",
            "transcriptVerified": true,
            "audioVerified": false,
            "minuteVerified": false,
            "transcriptAnchor": "un ministro comunista Jesús Hernández"
          }
        ]
      }
    },
    "Manuel de Falla": {
      "who": "Compositor español nacido en Cádiz en 1876 y fallecido en Argentina en 1946, autor de El amor brujo y Noches en los jardines de España.",
      "portrait": {
        "lang": "es",
        "title": "Manuel de Falla"
      },
      "sources": {
        "11": [
          {
            "topic": "Posición y salida de España durante la guerra",
            "speaker": "Fernando Paz",
            "statement": "Paz presenta a Manuel de Falla como un músico que no se alineó completamente con ninguno de los contendientes y recuerda su posterior residencia en Argentina y una distinción concedida por las autoridades sublevadas. Su caracterización política no debe reducirse a adhesión automática a un bando.",
            "status": "opinion_atribuida",
            "transcriptVerified": true,
            "audioVerified": false,
            "minuteVerified": false,
            "transcriptAnchor": "Manuel de falla el insigne músico"
          }
        ]
      }
    },
    "Juan Manuel de Prada": {
      "who": "Novelista, ensayista y articulista español, ganador del Premio Planeta en 1997 y autor de novelas de ambientación histórica.",
      "portrait": {
        "lang": "es",
        "title": "Juan Manuel de Prada"
      },
      "sources": {
        "12": [
          "Juan Manuel de Prada presenta los temas de su obra sobre la resistencia y el colaboracionismo en la Francia ocupada, la relación de exiliados españoles con Falange y la forma en que se ha narrado la Segunda Guerra Mundial."
        ]
      }
    },
    "Gregorio Marañón": {
      "who": "Médico endocrinólogo, ensayista e intelectual español, miembro de las academias de Medicina, Historia, Lengua y otras instituciones.",
      "portrait": {
        "lang": "es",
        "title": "Gregorio Marañón"
      },
      "sources": {
        "12": [
          "Gregorio Marañón aparece en la exposición de Juan Manuel de Prada sobre las redes de ayuda y colaboración entre exiliados republicanos, falangistas y representantes culturales durante la ocupación alemana de Francia."
        ]
      }
    },
    "Ramón Serrano Suñer": {
      "who": "Político y abogado español, ministro de la Gobernación y de Asuntos Exteriores durante los primeros años del franquismo; cuñado de Franco.",
      "portrait": {
        "lang": "es",
        "title": "Ramón Serrano Suñer"
      },
      "sources": {
        "12": [
          "Serrano Suñer aparece en el relato de Juan Manuel de Prada sobre la sustitución de ministros germanófilos por otros favorables a relaciones con los Aliados conforme cambió el desarrollo de la guerra."
        ]
      }
    }
  }
};
const base=window.IDEA_TELARANA_PERSON_SOURCE_REPORTS;if(!base)return;
Object.assign(base.sourceIds,extra.sourceIds);Object.assign(base.sourceUrls,extra.sourceUrls);base.sourceLabels=Object.assign({},base.sourceLabels||{},extra.sourceLabels);
for(const [name,p]of Object.entries(extra.profiles)){const prior=base.profiles[name];if(!prior){base.profiles[name]=p;continue;}for(const [order,claims]of Object.entries(p.sources))prior.sources[order]=(prior.sources[order]||[]).concat(claims);if(!prior.portrait&&p.portrait)prior.portrait=p.portrait;}
})();
