/* Transcripciones 09 y 10, revisión de personas: biografía primero, contenido atribuido a quien habla. Ningún vínculo entre terceros se infiere de una mención. */
(function(){
 const extra={
  "version": 1,
  "updatedAt": "2026-11-10",
  "sourceIds": {
    "9": "idealab-f09-villarejo-vaquero",
    "10": "idealab-f10-source"
  },
  "sourceUrls": {
    "9": "https://www.youtube.com/watch?v=10vGOskN6hY",
    "10": "https://www.youtube.com/watch?v=_pK1VQpH5X4"
  },
  "sourceLabels": {
    "9": "Vaquero Podcast · José Manuel Villarejo",
    "10": "El Canal del Coronel · Juan Manuel de Prada"
  },
  "profiles": {
    "Roberto Vaquero": {
      "who": "Escritor, político y comunicador español, conductor del programa Vaquero Podcast.",
      "portrait": {
        "lang": "es",
        "title": "Roberto Vaquero"
      },
      "sources": {
        "9": [
          "Roberto Vaquero presenta la entrevista, pregunta por los archivos del excomisario, la financiación política, los servicios de inteligencia y las acusaciones expuestas por el invitado."
        ]
      }
    },
    "José Manuel Villarejo": {
      "who": "Excomisario de la Policía Nacional española, figura central de la investigación judicial conocida como operación Tándem.",
      "portrait": {
        "lang": "es",
        "title": "José Manuel Villarejo"
      },
      "sources": {
        "9": [
          "José Manuel Villarejo describe su trayectoria policial, el contenido de sus archivos, distintos procedimientos judiciales y episodios que atribuye a responsables políticos y servicios de inteligencia."
        ]
      }
    },
    "Pedro Sánchez": {
      "who": "Político español del PSOE, presidente del Gobierno desde 2018.",
      "portrait": {
        "lang": "es",
        "title": "Pedro Sánchez"
      },
      "sources": {
        "9": [
          "Pedro Sánchez ganó las primarias del PSOE de 2017; Villarejo atribuye a su entorno mecanismos de financiación y relaciones políticas controvertidas y comenta su posición en el debate sobre Pegasus."
        ],
        "10": [
          "Pedro Sánchez es citado en el análisis sobre la continuidad de la legislatura y las decisiones del Gobierno español en materia de defensa, gasto y relaciones exteriores."
        ]
      }
    },
    "Pablo Iglesias Turrión": {
      "who": "Politólogo y político español, fundador de Podemos y antiguo vicepresidente segundo del Gobierno.",
      "portrait": {
        "lang": "es",
        "title": "Pablo Iglesias Turrión"
      },
      "sources": {
        "9": [
          "Pablo Iglesias aparece en el relato de Villarejo sobre el denominado caso Dina, el tratamiento de información extraída de un teléfono y las intervenciones públicas de Podemos."
        ]
      }
    },
    "Hugo Carvajal": {
      "who": "Exjefe de inteligencia militar de Venezuela, conocido como el Pollo Carvajal.",
      "portrait": {
        "lang": "es",
        "title": "Hugo Carvajal"
      },
      "sources": {
        "9": [
          "Hugo Carvajal es mencionado por Villarejo como interlocutor de información sobre Venezuela y sobre unas presuntas transferencias de recursos al ámbito político español."
        ]
      }
    },
    "Nicolás Maduro": {
      "who": "Político venezolano, presidente de Venezuela desde 2013 y sucesor de Hugo Chávez.",
      "portrait": {
        "lang": "es",
        "title": "Nicolás Maduro"
      },
      "sources": {
        "9": [
          "Nicolás Maduro aparece en las afirmaciones del entrevistado sobre servicios de inteligencia venezolanos, redes económicas y posibles responsabilidades de dirigentes del país."
        ],
        "10": [
          "Nicolás Maduro es citado al debatir una intervención estadounidense en Venezuela y las reacciones de dirigentes políticos europeos ante ella."
        ]
      }
    },
    "José Luis Rodríguez Zapatero": {
      "who": "Político español del PSOE y presidente del Gobierno entre 2004 y 2011.",
      "portrait": {
        "lang": "es",
        "title": "José Luis Rodríguez Zapatero"
      },
      "sources": {
        "9": [
          "José Luis Rodríguez Zapatero es citado junto con dirigentes venezolanos en las acusaciones que Villarejo formula sobre intereses económicos y relaciones políticas con Venezuela."
        ]
      }
    },
    "Corinna Larsen": {
      "who": "Empresaria alemana conocida por su relación personal anterior con Juan Carlos I.",
      "portrait": {
        "lang": "es",
        "title": "Corinna Larsen"
      },
      "sources": {
        "9": [
          "Corinna Larsen aparece en el relato de Villarejo sobre grabaciones, archivos y contactos con el rey emérito; el entrevistado menciona además un libro de su autoría dedicado a ella."
        ]
      }
    },
    "Juan Carlos I": {
      "who": "Rey de España entre 1975 y 2014, abdicó en favor de su hijo Felipe VI.",
      "portrait": {
        "lang": "es",
        "title": "Juan Carlos I de España"
      },
      "sources": {
        "9": [
          "Juan Carlos I es mencionado en pasajes sobre el entorno de la Corona, su abdicación, grabaciones vinculadas a Corinna Larsen y decisiones atribuidas a sus asesores y familiares."
        ]
      }
    },
    "Felipe VI": {
      "who": "Rey de España desde junio de 2014, hijo de Juan Carlos I y Sofía de Grecia.",
      "portrait": {
        "lang": "es",
        "title": "Felipe VI de España"
      },
      "sources": {
        "9": [
          "Felipe VI aparece en el relato sobre las relaciones familiares y la posición que, según Villarejo, adoptó ante iniciativas dirigidas a alterar la relación matrimonial de los entonces príncipes."
        ]
      }
    },
    "Letizia Ortiz": {
      "who": "Periodista española y reina consorte de España desde 2014, esposa de Felipe VI.",
      "portrait": {
        "lang": "es",
        "title": "Letizia Ortiz"
      },
      "sources": {
        "9": [
          "Letizia Ortiz es mencionada en afirmaciones del entrevistado sobre el entorno de la familia real y unas supuestas maniobras de presión en su vida privada."
        ]
      }
    },
    "Sofía de Grecia": {
      "who": "Reina consorte de España entre 1975 y 2014, esposa de Juan Carlos I y madre de Felipe VI.",
      "portrait": {
        "lang": "es",
        "title": "Sofía de Grecia"
      },
      "sources": {
        "9": [
          "Sofía de Grecia aparece en la versión que ofrece Villarejo sobre posiciones familiares y tensiones vinculadas al matrimonio de Felipe VI."
        ]
      }
    },
    "Joaquín Abad": {
      "who": "Periodista y escritor español que ha publicado investigaciones sobre política y servicios de inteligencia.",
      "portrait": {
        "lang": "es",
        "title": "Joaquín Abad"
      },
      "sources": {
        "9": [
          "Joaquín Abad es mencionado como colaborador editorial de Villarejo en un libro sobre saunas y actividades que el excomisario atribuye a entornos políticos."
        ]
      }
    },
    "Fernando Grande-Marlaska": {
      "who": "Magistrado y político español, ministro del Interior desde 2018.",
      "portrait": {
        "lang": "es",
        "title": "Fernando Grande-Marlaska"
      },
      "sources": {
        "9": [
          "Fernando Grande-Marlaska es citado en las afirmaciones de Villarejo sobre el trato que habría recibido durante su encarcelamiento y sobre episodios de información privada."
        ]
      }
    },
    "Margarita Robles": {
      "who": "Jurista y política española, ministra de Defensa desde 2018.",
      "portrait": {
        "lang": "es",
        "title": "Margarita Robles"
      },
      "sources": {
        "9": [
          "Margarita Robles es mencionada al hablar de Pegasus, inteligencia y presunta información privada de altos cargos, sin que la entrevista aporte una identificación documental de los archivos referidos."
        ]
      }
    },
    "Manuel García Castellón": {
      "who": "Magistrado español y exjuez de instrucción en la Audiencia Nacional.",
      "portrait": {
        "lang": "es",
        "title": "Manuel García Castellón"
      },
      "sources": {
        "9": [
          "Manuel García Castellón es mencionado por Villarejo al comentar declaraciones sobre el contenido de sus archivos y procedimientos judiciales en los que intervino."
        ]
      }
    },
    "María Dolores de Cospedal": {
      "who": "Política española del Partido Popular, exsecretaria general del PP y exministra de Defensa.",
      "portrait": {
        "lang": "es",
        "title": "María Dolores de Cospedal"
      },
      "sources": {
        "9": [
          "María Dolores de Cospedal es citada al comentar solicitudes de reapertura o ampliación de diligencias relacionadas con grabaciones y declaraciones judiciales."
        ]
      }
    },
    "Alberto Núñez Feijóo": {
      "who": "Político español del Partido Popular, expresidente de la Xunta de Galicia y dirigente nacional del partido.",
      "portrait": {
        "lang": "es",
        "title": "Alberto Núñez Feijóo"
      },
      "sources": {
        "9": [
          "Alberto Núñez Feijóo es mencionado en episodios sobre comisiones parlamentarias, documentos de inteligencia y las posiciones de los partidos ante el caso Villarejo."
        ]
      }
    },
    "Carmen Calvo": {
      "who": "Jurista y política española del PSOE, exvicepresidenta del Gobierno y exministra.",
      "portrait": {
        "lang": "es",
        "title": "Carmen Calvo"
      },
      "sources": {
        "9": [
          "Carmen Calvo es citada por Villarejo en una crítica a la cultura política española y a la utilización de recursos públicos."
        ]
      }
    },
    "Risto Mejide": {
      "who": "Publicista, comunicador y presentador de televisión español.",
      "portrait": {
        "lang": "es",
        "title": "Risto Mejide"
      },
      "sources": {
        "9": [
          "Risto Mejide es mencionado al recordar intervenciones televisivas sobre los archivos de Villarejo y la cobertura mediática de sus procesos judiciales."
        ]
      }
    },
    "Javier Ruiz": {
      "who": "Periodista y presentador español de televisión y radio especializado en actualidad política y económica.",
      "portrait": {
        "lang": "es",
        "title": "Javier Ruiz (periodista)"
      },
      "sources": {
        "9": [
          "Javier Ruiz es mencionado por Villarejo al describir el tratamiento televisivo dado a unos informes relacionados con el Partido Popular."
        ]
      }
    },
    "Alberto Pozas": {
      "who": "Periodista español, exdirector de Interviú y antiguo director general de Información Nacional de la Presidencia del Gobierno.",
      "portrait": {
        "lang": "es",
        "title": "Alberto Pozas"
      },
      "sources": {
        "9": [
          "Alberto Pozas es citado en el relato de Villarejo sobre la circulación de información extraída de un teléfono y su papel profesional en comunicación política durante el caso Dina."
        ]
      }
    },
    "Dina Bousselham": {
      "who": "Politóloga y exasesora parlamentaria de Pablo Iglesias, vinculada al caso judicial sobre la sustracción de su teléfono.",
      "portrait": {
        "lang": "es",
        "title": "Dina Bousselham"
      },
      "sources": {
        "9": [
          "Dina Bousselham aparece en el relato sobre el tratamiento de datos de su teléfono, los periodistas que habrían tenido acceso a ellos y las actuaciones vinculadas al caso."
        ]
      }
    },
    "Alfredo Pérez Rubalcaba": {
      "who": "Político español del PSOE, ministro del Interior entre 2006 y 2011 y secretario general de su partido.",
      "portrait": {
        "lang": "es",
        "title": "Alfredo Pérez Rubalcaba"
      },
      "sources": {
        "9": [
          "Alfredo Pérez Rubalcaba es citado en comentarios sobre la política española, las negociaciones de la etapa de la abdicación y declaraciones públicas sobre el 11-M."
        ]
      }
    },
    "Mariano Rajoy": {
      "who": "Político español del Partido Popular, presidente del Gobierno entre 2011 y 2018.",
      "portrait": {
        "lang": "es",
        "title": "Mariano Rajoy"
      },
      "sources": {
        "9": [
          "Mariano Rajoy aparece en el relato de Villarejo sobre la abdicación de Juan Carlos I y en comparaciones con la actuación de otros dirigentes del Partido Popular."
        ]
      }
    },
    "Felipe González": {
      "who": "Político español del PSOE y presidente del Gobierno entre 1982 y 1996.",
      "portrait": {
        "lang": "es",
        "title": "Felipe González"
      },
      "sources": {
        "9": [
          "Felipe González es citado en la versión que ofrece Villarejo sobre relaciones entre el Gobierno español, dirigentes cubanos y antiguas redes políticas."
        ]
      }
    },
    "Fidel Castro": {
      "who": "Revolucionario cubano que encabezó el Gobierno y el Partido Comunista de Cuba durante varias décadas.",
      "portrait": {
        "lang": "es",
        "title": "Fidel Castro"
      },
      "sources": {
        "9": [
          "Fidel Castro es mencionado en la narración sobre contactos políticos y operaciones de inteligencia entre España y Cuba durante décadas anteriores."
        ]
      }
    },
    "Luis Carrero Blanco": {
      "who": "Militar y político español del franquismo, presidente del Gobierno hasta su asesinato en 1973.",
      "portrait": {
        "lang": "es",
        "title": "Luis Carrero Blanco"
      },
      "sources": {
        "9": [
          "Carrero Blanco es mencionado al hablar de la Transición, el tratamiento de determinados delitos y las políticas posteriores de amnistía y exilio."
        ],
        "10": [
          "Carrero Blanco habría advertido a Franco de que Alemania podía perder la guerra y habría influido en su cálculo político, según el relato del entrevistado."
        ]
      }
    },
    "Francisco Franco": {
      "who": "Militar español y dictador de España desde 1939 hasta 1975.",
      "portrait": {
        "lang": "es",
        "title": "Francisco Franco"
      },
      "sources": {
        "9": [
          "Francisco Franco es citado en una explicación del entrevistado sobre los cambios legales y sociales tras la dictadura."
        ],
        "10": [
          "Francisco Franco habría modificado, según la interpretación que expone Juan Manuel de Prada, su política de neutralidad y de relaciones internacionales cuando cambió el equilibrio militar de la Segunda Guerra Mundial."
        ]
      }
    },
    "José Bono": {
      "who": "Político español del PSOE, expresidente de Castilla-La Mancha, exministro de Defensa y expresidente del Congreso.",
      "portrait": {
        "lang": "es",
        "title": "José Bono Martínez"
      },
      "sources": {
        "9": [
          "José Bono es mencionado en afirmaciones de Villarejo sobre patrimonio privado y evolución económica de responsables políticos."
        ]
      }
    },
    "Javier López Madrid": {
      "who": "Empresario español, vinculado históricamente al grupo OHL y a empresas de inversión.",
      "portrait": {
        "lang": "es",
        "title": "Javier López Madrid"
      },
      "sources": {
        "9": [
          "Javier López Madrid aparece en un relato del entrevistado sobre tensiones personales y conversaciones atribuidas al entorno de la Corona."
        ]
      }
    },
    "Pedro Baños": {
      "who": "Coronel del Ejército de Tierra español en situación de reserva y divulgador geopolítico que presenta El Canal del Coronel.",
      "portrait": {
        "lang": "es",
        "title": "Pedro Baños"
      },
      "sources": {
        "9": [
          "Pedro Baños es mencionado por Villarejo como otro entrevistador con el que ha conversado sobre casos de seguridad, inteligencia y política."
        ],
        "10": [
          "Pedro Baños conduce la entrevista y pregunta a Juan Manuel de Prada por la División Azul, la actuación de Franco durante la Segunda Guerra Mundial y las transformaciones políticas recientes."
        ]
      }
    },
    "Juan Manuel de Prada": {
      "who": "Escritor, articulista y novelista español, ganador del Premio Planeta de 1997.",
      "portrait": {
        "lang": "es",
        "title": "Juan Manuel de Prada"
      },
      "sources": {
        "10": [
          "Juan Manuel de Prada comenta el contexto de la División Azul, el regreso de prisioneros españoles, la política de Franco y su crítica a las ideologías contemporáneas y a la actuación de Occidente."
        ]
      }
    },
    "Agustín Muñoz Grandes": {
      "who": "General español, primer comandante de la División Azul en la Segunda Guerra Mundial.",
      "portrait": {
        "lang": "es",
        "title": "Agustín Muñoz Grandes"
      },
      "sources": {
        "10": [
          "Muñoz Grandes habría acudido al recibimiento del buque Semíramis con prisioneros españoles repatriados de la Unión Soviética, mientras Franco no lo hizo, según el episodio."
        ]
      }
    },
    "Adolf Hitler": {
      "who": "Dictador de la Alemania nazi entre 1933 y 1945.",
      "portrait": {
        "lang": "es",
        "title": "Adolf Hitler"
      },
      "sources": {
        "10": [
          "Hitler decidió invadir la Unión Soviética en 1941; en ese contexto se describe en la entrevista el reclutamiento de voluntarios españoles para la División Azul."
        ]
      }
    },
    "Iósif Stalin": {
      "who": "Dirigente soviético que gobernó la URSS desde finales de los años veinte hasta 1953.",
      "portrait": {
        "lang": "es",
        "title": "Iósif Stalin"
      },
      "sources": {
        "10": [
          "Stalin es mencionado por la situación de los prisioneros españoles en campos soviéticos y por el cambio político posterior a su muerte."
        ]
      }
    },
    "Nikita Jrushchov": {
      "who": "Político soviético que sucedió a Stalin como principal dirigente del Partido Comunista de la Unión Soviética.",
      "portrait": {
        "lang": "es",
        "title": "Nikita Jrushchov"
      },
      "sources": {
        "10": [
          "Jrushchov habría facilitado, según la conversación, la liberación y repatriación de los supervivientes españoles que seguían retenidos en la Unión Soviética."
        ]
      }
    },
    "Winston Churchill": {
      "who": "Político británico, primer ministro durante la mayor parte de la Segunda Guerra Mundial.",
      "portrait": {
        "lang": "es",
        "title": "Winston Churchill"
      },
      "sources": {
        "10": [
          "Churchill es citado para describir la supuesta admiración de Franco por el Ejército británico y el intercambio de correspondencia entre dirigentes durante la guerra."
        ]
      }
    },
    "Donald Trump": {
      "who": "Empresario y político estadounidense, presidente entre 2017 y 2021 y desde enero de 2025.",
      "portrait": {
        "lang": "es",
        "title": "Donald Trump"
      },
      "sources": {
        "10": [
          "Donald Trump es utilizado por Juan Manuel de Prada como ejemplo de las nuevas derechas y como referencia de las prioridades de la política exterior estadounidense."
        ]
      }
    },
    "Javier Milei": {
      "who": "Economista y político argentino, presidente de Argentina desde diciembre de 2023.",
      "portrait": {
        "lang": "es",
        "title": "Javier Milei"
      },
      "sources": {
        "10": [
          "Javier Milei aparece como ejemplo de las nuevas corrientes de derecha que el entrevistado compara con Trump y distintas formaciones europeas."
        ]
      }
    },
    "Vladímir Putin": {
      "who": "Político ruso que ha ocupado la Presidencia de Rusia durante varias etapas desde 2000.",
      "portrait": {
        "lang": "es",
        "title": "Vladímir Putin"
      },
      "sources": {
        "10": [
          "Vladímir Putin es mencionado cuando el entrevistado argumenta que los dirigentes europeos utilizan a Rusia para explicar los problemas internos de la Unión Europea."
        ]
      }
    },
    "José Antonio Primo de Rivera": {
      "who": "Político español y fundador de Falange Española en 1933.",
      "portrait": {
        "lang": "es",
        "title": "José Antonio Primo de Rivera"
      },
      "sources": {
        "10": [
          "José Antonio Primo de Rivera aparece como referente histórico de los primeros falangistas, a los que los interlocutores comparan con los grupos acomodados a la política posterior."
        ]
      }
    }
  }
};
 const base=window.IDEA_TELARANA_PERSON_SOURCE_REPORTS;
 if(!base)return;
 Object.assign(base.sourceIds,extra.sourceIds);Object.assign(base.sourceUrls,extra.sourceUrls);
 base.sourceLabels=Object.assign({},base.sourceLabels||{},extra.sourceLabels);
 for(const [name,p] of Object.entries(extra.profiles)){
  const match=base.profiles[name];
  if(!match){base.profiles[name]=p;continue;}
  for(const [order,claims] of Object.entries(p.sources))match.sources[order]=(match.sources[order]||[]).concat(claims);
  if(!match.portrait&&p.portrait)match.portrait=p.portrait;
 }
})();
