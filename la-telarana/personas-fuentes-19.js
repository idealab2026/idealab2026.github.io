/* F19 · perfiles biográficos y relatos atribuidos al episodio, no a hablantes no identificados; ASR sin minutajes y homónimos por verificar. */
(function(){
const extra={
  "version": 1,
  "updatedAt": "2026-11-10",
  "sourceIds": {
    "19": "idealab-f19-source"
  },
  "sourceUrls": {
    "19": "https://www.youtube.com/watch?v=TS5c9NXubIs"
  },
  "sourceLabels": {
    "19": "Inversión Racional · Mesa Díaz Villanueva, Ramírez, Calero y Borja Fernández"
  },
  "profiles": {
    "Fernando Díaz Villanueva": {
      "who": "Periodista, escritor y divulgador español especializado en historia, economía y política, creador del programa La ContraCrónica.",
      "portrait": {
        "lang": "es",
        "title": "Fernando Díaz Villanueva"
      },
      "sources": {
        "19": [
          "Participa en la mesa de debate. En el episodio se contrapone la evolución de las democracias liberales con los regímenes autoritarios y se discuten las relaciones entre Estados Unidos y China."
        ]
      }
    },
    "Lorenzo Ramírez": {
      "who": "Periodista y analista económico español, especializado en geopolítica y economía internacional.",
      "portrait": {
        "lang": "es",
        "title": "Lorenzo Ramírez"
      },
      "sources": {
        "19": [
          "Participa en la conversación sobre política monetaria, industria, distribución de poder económico y competencia estratégica entre Estados Unidos y China."
        ]
      }
    },
    "Juan Francisco Calero": {
      "who": "Periodista español y divulgador especializado en automoción, movilidad e industria, conocido también como JF Calero.",
      "portrait": {
        "lang": "es",
        "title": "Juan Francisco Calero"
      },
      "sources": {
        "19": [
          "Participa en el debate con comentarios sobre tecnología, industria automovilística, decisiones energéticas y la comparación de sistemas económicos."
        ]
      }
    },
    "Borja Fernández": {
      "who": "Divulgador español vinculado al canal educativo de historia y geopolítica Memorias de Pez.",
      "portrait": {
        "lang": "es",
        "title": "Borja Fernández Memorias de Pez"
      },
      "sources": {
        "19": [
          "Es anunciado como uno de los cuatro invitados. El episodio presenta sus intervenciones dentro de una conversación multivocal sin diarización fiable en la transcripción automática."
        ]
      }
    },
    "Donald Trump": {
      "who": "Empresario y político estadounidense, presidente de Estados Unidos desde enero de 2025 en su segundo mandato.",
      "portrait": {
        "lang": "es",
        "title": "Donald Trump"
      },
      "sources": {
        "19": [
          "Los participantes contrastan sus posiciones proteccionistas, decisiones comerciales y estilo político con la evolución de las relaciones entre Washington y Pekín."
        ]
      }
    },
    "Joe Biden": {
      "who": "Político estadounidense, presidente de Estados Unidos de 2021 a 2025.",
      "portrait": {
        "lang": "es",
        "title": "Joe Biden"
      },
      "sources": {
        "19": [
          "La mesa critica su candidatura de 2024 y comenta sus decisiones energéticas y la orientación de la política exterior anterior al retorno de Donald Trump."
        ]
      }
    },
    "Kamala Harris": {
      "who": "Política estadounidense, vicepresidenta de Estados Unidos de 2021 a 2025 y candidata demócrata en 2024.",
      "portrait": {
        "lang": "es",
        "title": "Kamala Harris"
      },
      "sources": {
        "19": [
          "La conversación la menciona al comentar su sustitución de Biden como candidata demócrata; la valoración de su perfil político es opinión de los participantes."
        ]
      }
    },
    "Barack Obama": {
      "who": "Político estadounidense, presidente de Estados Unidos de 2009 a 2017.",
      "portrait": {
        "lang": "es",
        "title": "Barack Obama"
      },
      "sources": {
        "19": [
          "La fuente menciona el giro de la política estadounidense hacia Asia durante su presidencia y el enfriamiento de las relaciones comerciales y estratégicas con China."
        ]
      }
    },
    "Bill Clinton": {
      "who": "Político estadounidense, presidente de Estados Unidos de 1993 a 2001.",
      "portrait": {
        "lang": "es",
        "title": "Bill Clinton"
      },
      "sources": {
        "19": [
          "En la conversación se atribuye al Gobierno de Clinton un papel en la apertura comercial a China y se comentan supuestas presiones de empresas estadounidenses; esas motivaciones no están verificadas por el episodio."
        ]
      }
    },
    "Henry Kissinger": {
      "who": "Diplomático y politólogo estadounidense que fue asesor de Seguridad Nacional y secretario de Estado en la década de 1970.",
      "portrait": {
        "lang": "es",
        "title": "Henry Kissinger"
      },
      "sources": {
        "19": [
          "La mesa cita sus escritos sobre China y su influencia en el pensamiento estratégico estadounidense acerca de la relación bilateral."
        ]
      }
    },
    "Elon Musk": {
      "who": "Empresario tecnológico asociado a Tesla, SpaceX y otras compañías estadounidenses.",
      "portrait": {
        "lang": "es",
        "title": "Elon Musk"
      },
      "sources": {
        "19": [
          "Los participantes opinan sobre su cercanía a la Administración Trump, la industria de vehículos eléctricos y el papel empresarial en decisiones públicas."
        ]
      }
    },
    "Peter Thiel": {
      "who": "Empresario e inversor estadounidense, cofundador de PayPal y Palantir Technologies y presidente del consejo de Palantir.",
      "portrait": {
        "lang": "en",
        "title": "Peter Thiel"
      },
      "sources": {
        "19": [
          "La transcripción automática recoge «Peter Z» seguido de una referencia a «palan technologies», compatible con Peter Thiel. La identificación es probable, pero requiere cotejo del audio. Se atribuyen opiniones de los participantes sobre sus vínculos tecnológicos y políticos, no acusaciones probadas."
        ]
      }
    },
    "Pedro Sánchez": {
      "who": "Político español, presidente del Gobierno desde junio de 2018.",
      "portrait": {
        "lang": "es",
        "title": "Pedro Sánchez"
      },
      "sources": {
        "19": [
          "La mesa debate sus incentivos políticos y plantea valoraciones críticas de una eventual estrategia de confrontación discursiva con Donald Trump."
        ]
      }
    },
    "Larry Fink": {
      "who": "Financiero estadounidense, cofundador y consejero delegado de BlackRock.",
      "portrait": {
        "lang": "en",
        "title": "Larry Fink"
      },
      "sources": {
        "19": [
          "La fuente se refiere a «Larry fing» y «lar­ing» al comentar la influencia de grandes gestoras y plantea presuntas interferencias empresariales en decisiones políticas españolas; no se acreditan esos extremos por la mención."
        ]
      }
    },
    "Jeff Bezos": {
      "who": "Empresario estadounidense, fundador de Amazon y propietario del periódico The Washington Post.",
      "portrait": {
        "lang": "en",
        "title": "Jeff Bezos"
      },
      "sources": {
        "19": [
          "En el episodio se menciona su adquisición de The Washington Post y se expresa la opinión de que esa propiedad puede proporcionar influencia mediática."
        ]
      }
    },
    "Pedro Baños": {
      "who": "Coronel retirado del Ejército español y divulgador de geopolítica, director de El Canal del Coronel.",
      "portrait": {
        "lang": "es",
        "title": "Pedro Baños"
      },
      "sources": {
        "19": [
          "Uno de los participantes recuerda una analogía que atribuye a Pedro Baños sobre alianzas internacionales y relaciones de poder."
        ]
      }
    },
    "Vladímir Putin": {
      "who": "Político ruso que ha ocupado la presidencia de Rusia durante varios mandatos desde 2000.",
      "portrait": {
        "lang": "es",
        "title": "Vladímir Putin"
      },
      "sources": {
        "19": [
          "Se le menciona al discutir Rusia, la rivalidad geopolítica y la interpretación de proyectos euroasiáticos y de la política energética europea."
        ]
      }
    },
    "Angela Merkel": {
      "who": "Política alemana, canciller federal de Alemania entre 2005 y 2021.",
      "portrait": {
        "lang": "es",
        "title": "Angela Merkel"
      },
      "sources": {
        "19": [
          "Un participante critica su política energética, en particular las decisiones sobre centrales nucleares, al debatir las necesidades energéticas del sector tecnológico."
        ]
      }
    },
    "Serguéi Gláziev": {
      "who": "Economista y político ruso que ha asesorado a instituciones rusas en materia económica e integración euroasiática.",
      "portrait": {
        "lang": "es",
        "title": "Serguéi Gláziev"
      },
      "sources": {
        "19": [
          "En el episodio aparece como «sergei glacier» al discutir la integración económica euroasiática y las reservas financieras rusas; el nombre está normalizado a partir del contexto y precisa contraste de audio."
        ]
      }
    },
    "Zbigniew Brzezinski": {
      "who": "Politólogo y estratega estadounidense de origen polaco, asesor de Seguridad Nacional del presidente Jimmy Carter.",
      "portrait": {
        "lang": "es",
        "title": "Zbigniew Brzezinski"
      },
      "sources": {
        "19": [
          "La mesa alude a «brezinski» al comentar la importancia geopolítica de Eurasia y la hegemonía estadounidense."
        ]
      }
    },
    "Jimmy Carter": {
      "who": "Político estadounidense, presidente de Estados Unidos entre 1977 y 1981.",
      "portrait": {
        "lang": "es",
        "title": "Jimmy Carter"
      },
      "sources": {
        "19": [
          "Se menciona su Administración al comentar la evolución de la política exterior de Estados Unidos, la Comisión Trilateral y la relación de esta con debates estratégicos."
        ]
      }
    },
    "Ronald Reagan": {
      "who": "Político estadounidense, presidente de Estados Unidos entre 1981 y 1989.",
      "portrait": {
        "lang": "es",
        "title": "Ronald Reagan"
      },
      "sources": {
        "19": [
          "En la transcripción se alude fonéticamente a «rigan» al narrar el paso de la Administración Carter a la siguiente y sus cambios de política exterior."
        ]
      }
    },
    "Alexander Haig": {
      "who": "Militar y diplomático estadounidense, secretario de Estado entre 1981 y 1982.",
      "portrait": {
        "lang": "en",
        "title": "Alexander Haig"
      },
      "sources": {
        "19": [
          "La conversación lo menciona como «Alexander Hey» al referirse a la Administración Reagan y su política exterior; identificación basada en contexto, pendiente de cotejo de audio."
        ]
      }
    }
  }
};
const base=window.IDEA_TELARANA_PERSON_SOURCE_REPORTS;if(!base)return;
Object.assign(base.sourceIds,extra.sourceIds);Object.assign(base.sourceUrls,extra.sourceUrls);
base.sourceLabels=Object.assign({},base.sourceLabels||{},extra.sourceLabels);
for(const [name,p] of Object.entries(extra.profiles)){const prior=base.profiles[name];if(!prior){base.profiles[name]=p;continue;}for(const [order,claims] of Object.entries(p.sources))prior.sources[order]=(prior.sources[order]||[]).concat(claims);if(!prior.portrait&&p.portrait)prior.portrait=p.portrait;}
})();
