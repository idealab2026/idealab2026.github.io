/* Fuente 14: identificación separada de declaraciones. ASR sin diarización/minutaje contrastado; no convertir co-menciones ni hipótesis en vínculos acreditados. */
(function(){
const extra={
  "version": 1,
  "updatedAt": "2026-11-10",
  "sourceIds": {
    "14": "idealab-f14-source"
  },
  "sourceUrls": {
    "14": "https://www.youtube.com/watch?v=iPwbiY1F3Rg"
  },
  "sourceLabels": {
    "14": "11-S · cronología y testimonios · F14"
  },
  "profiles": {
    "Ron DiFrancesco": {
      "who": "Superviviente canadiense de los atentados del 11-S; trabajaba como operador financiero en la planta 84 de la Torre Sur del World Trade Center.",
      "portrait": {
        "lang": "en",
        "title": "Ron DiFrancesco"
      },
      "sources": {
        "14": [
          "La fuente presenta el relato de Ron sobre el impacto del vuelo 175, los daños de su planta y la evacuación. La identidad se resuelve por la coincidencia del nombre, la planta y el testimonio recogido por National Geographic."
        ]
      }
    },
    "Mark Rossini": {
      "who": "Antiguo agente especial del FBI estadounidense destinado como enlace en la unidad de la CIA que investigaba a Osama bin Laden antes del 11-S.",
      "portrait": {
        "lang": "en",
        "title": "Mark Rossini"
      },
      "sources": {
        "14": [
          "Mark Rossini afirma en la entrevista que detectó información sobre sospechosos antes de los ataques y que encontró obstáculos para compartirla entre organismos. Se registra su testimonio, no una atribución de responsabilidad penal."
        ]
      }
    },
    "Osama bin Laden": {
      "who": "Dirigente y fundador de la organización terrorista Al Qaeda, responsable de los atentados del 11 de septiembre de 2001.",
      "portrait": {
        "lang": "en",
        "title": "Osama bin Laden"
      },
      "sources": {
        "14": [
          "La conversación explica que la unidad de contraterrorismo de la CIA seguía a Bin Laden y pregunta qué alertas conocían los organismos estadounidenses antes de los ataques."
        ]
      }
    },
    "George W. Bush": {
      "who": "Político estadounidense, presidente de Estados Unidos entre 2001 y 2009.",
      "portrait": {
        "lang": "en",
        "title": "George W. Bush"
      },
      "sources": {
        "14": [
          "La fuente reproduce la secuencia de su conocimiento público de los ataques y recoge interpretaciones de los participantes sobre su reacción y la respuesta militar posterior."
        ]
      }
    },
    "Wesley Clark": {
      "who": "General estadounidense retirado que fue comandante supremo aliado de la OTAN en Europa entre 1997 y 2000.",
      "portrait": {
        "lang": "en",
        "title": "Wesley Clark"
      },
      "sources": {
        "14": [
          "La entrevista le atribuye el relato de conversaciones posteriores al 11-S en torno a propuestas de actuación militar contra Irak."
        ]
      }
    },
    "Paul Wolfowitz": {
      "who": "Politólogo y funcionario estadounidense que ocupó puestos de seguridad y Defensa y presidió el Banco Mundial entre 2005 y 2007.",
      "portrait": {
        "lang": "en",
        "title": "Paul Wolfowitz"
      },
      "sources": {
        "14": [
          "El entrevistado lo incluye en un grupo de responsables neoconservadores próximos a la Administración Bush y lo menciona en un relato indirecto atribuido a Wesley Clark."
        ]
      }
    },
    "Richard Perle": {
      "who": "Analista de seguridad y antiguo funcionario estadounidense, vinculado al pensamiento neoconservador y a órganos asesores de Defensa.",
      "portrait": {
        "lang": "en",
        "title": "Richard Perle"
      },
      "sources": {
        "14": [
          "La fuente lo incluye nominalmente entre los autores y asesores del enfoque geoestratégico que, según su análisis, influyó en la Administración Bush."
        ]
      }
    },
    "Dick Cheney": {
      "who": "Político estadounidense y vicepresidente de Estados Unidos entre 2001 y 2009.",
      "portrait": {
        "lang": "en",
        "title": "Dick Cheney"
      },
      "sources": {
        "14": [
          "La entrevista le atribuye un papel en ejercicios de seguridad nacional previos al 11-S y discute decisiones de su entorno; los detalles causales y las inferencias sobre intencionalidad no se consideran demostrados por la mera mención."
        ]
      }
    },
    "John Bolton": {
      "who": "Diplomático y funcionario estadounidense que ocupó cargos en política exterior y seguridad nacional en distintas administraciones.",
      "portrait": {
        "lang": "en",
        "title": "John Bolton"
      },
      "sources": {
        "14": [
          "La fuente lo menciona dentro del grupo de figuras de política exterior neoconservadora asociadas a la Administración Bush."
        ]
      }
    },
    "Donald Rumsfeld": {
      "who": "Político estadounidense y secretario de Defensa en las administraciones de Gerald Ford y George W. Bush.",
      "portrait": {
        "lang": "en",
        "title": "Donald Rumsfeld"
      },
      "sources": {
        "14": [
          "En la entrevista se le menciona, con transcripción fonética imperfecta, dentro de un relato indirecto de Wesley Clark sobre debates relacionados con Irak después del 11-S."
        ]
      }
    },
    "Larry Silverstein": {
      "who": "Promotor inmobiliario estadounidense cuyo grupo obtuvo en 2001 contratos de arrendamiento a largo plazo de inmuebles del complejo World Trade Center.",
      "portrait": {
        "lang": "en",
        "title": "Larry Silverstein"
      },
      "sources": {
        "14": [
          "El entrevistado comenta acuerdos de seguros y la relación del propietario del complejo con riesgos de atentado; sus hipótesis sobre acceso previo a información se conservan como atribuciones, no como hechos establecidos."
        ]
      }
    },
    "James Bamford": {
      "who": "Periodista y escritor estadounidense conocido por libros sobre organismos de inteligencia y vigilancia de comunicaciones.",
      "portrait": {
        "lang": "en",
        "title": "James Bamford"
      },
      "sources": {
        "14": [
          "Mark Rossini menciona a un autor transcrito como Jim Banford y un libro sobre la NSA, al hablar de solicitudes de entrevistas acerca de su trabajo anterior al 11-S."
        ]
      }
    },
    "Kenneth Williams": {
      "who": "Agente del FBI estadounidense asociado al memorando de Phoenix de julio de 2001 sobre alumnos de aviación y posibles conexiones extremistas.",
      "portrait": {
        "lang": "en",
        "title": "Kenneth Williams"
      },
      "sources": {
        "14": [
          "Rossini se refiere a un compañero llamado Ken Williams y al memorando de Phoenix para explicar los problemas de análisis y circulación de alertas anteriores al 11-S."
        ]
      }
    },
    "Leo Strauss": {
      "who": "Filósofo político germano-estadounidense que enseñó en la Universidad de Chicago y fue interpretado de formas divergentes por autores posteriores.",
      "portrait": {
        "lang": "en",
        "title": "Leo Strauss"
      },
      "sources": {
        "14": [
          "El entrevistado lo cita como referencia intelectual al describir su interpretación de las corrientes neoconservadoras estadounidenses."
        ]
      }
    },
    "Saddam Hussein": {
      "who": "Político iraquí que gobernó Irak de forma autoritaria entre 1979 y 2003.",
      "portrait": {
        "lang": "en",
        "title": "Saddam Hussein"
      },
      "sources": {
        "14": [
          "La fuente lo menciona al analizar la construcción del discurso favorable a la guerra de Irak tras los ataques de 2001, sin que la referencia pruebe su relación con el 11-S."
        ]
      }
    },
    "Franklin D. Roosevelt": {
      "who": "Político estadounidense, presidente de Estados Unidos entre 1933 y 1945.",
      "portrait": {
        "lang": "en",
        "title": "Franklin D. Roosevelt"
      },
      "sources": {
        "14": [
          "Un participante lo menciona al formular una valoración económica retrospectiva del New Deal y de la recuperación estadounidense; se conserva como opinión atribuida."
        ]
      }
    }
  }
};
const base=window.IDEA_TELARANA_PERSON_SOURCE_REPORTS;if(!base)return;
Object.assign(base.sourceIds,extra.sourceIds);Object.assign(base.sourceUrls,extra.sourceUrls);
base.sourceLabels=Object.assign({},base.sourceLabels||{},extra.sourceLabels);
for(const [name,p] of Object.entries(extra.profiles)){
 const prior=base.profiles[name];if(!prior){base.profiles[name]=p;continue;}
 for(const [order,statements]of Object.entries(p.sources))prior.sources[order]=(prior.sources[order]||[]).concat(statements);
 if(!prior.portrait&&p.portrait)prior.portrait=p.portrait;
}
})();
