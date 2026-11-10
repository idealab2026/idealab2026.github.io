/* Fuente 13 · biographies independientes y relatos atribuidos. Las transcripciones ASR no incluyen diarización ni minutos verificados. */
(function(){
const extra={
  "version": 1,
  "updatedAt": "2026-11-10",
  "sourceIds": {
    "13": "idealab-f13-source"
  },
  "sourceUrls": {
    "13": "https://www.youtube.com/watch?v=I5koBMBMXSc"
  },
  "sourceLabels": {
    "13": "The Wild Project #293 · Jesús Hernández Martínez"
  },
  "profiles": {
    "Jesús Hernández": {
      "who": "Historiador y escritor español especializado en divulgación de la Segunda Guerra Mundial; invitado del episodio 293 de The Wild Project.",
      "portrait": {
        "lang": "es",
        "title": "Jesús Hernández"
      },
      "sources": {
        "13": [
          "La entrevista presenta una reconstrucción de las decisiones de Hitler, la guerra europea, las operaciones militares, las figuras del mando nazi y diversas anécdotas biográficas."
        ]
      }
    },
    "Adolf Hitler": {
      "who": "Político alemán de origen austríaco; dictador de Alemania entre 1933 y 1945, jefe del Partido Nazi y responsable principal del régimen que llevó a Europa a la guerra y perpetró el Holocausto.",
      "portrait": {
        "lang": "es",
        "title": "Adolf Hitler"
      },
      "sources": {
        "13": [
          "La conversación interpreta su estrategia anterior a 1939 como una sucesión de apuestas políticas y examina sus decisiones militares, su salud y las versiones biográficas que circulan sobre él."
        ]
      }
    },
    "Iósif Stalin": {
      "who": "Dirigente soviético que consolidó el poder en la URSS y gobernó durante la Segunda Guerra Mundial.",
      "portrait": {
        "lang": "es",
        "title": "Iósif Stalin"
      },
      "sources": {
        "13": [
          "La fuente comenta el pacto de no agresión germano-soviético previo a la invasión de Polonia y la posterior ruptura con el ataque alemán de 1941."
        ]
      }
    },
    "Benito Mussolini": {
      "who": "Político italiano y fundador del fascismo; gobernó Italia como dictador entre 1922 y 1943.",
      "portrait": {
        "lang": "es",
        "title": "Benito Mussolini"
      },
      "sources": {
        "13": [
          "En la entrevista se le menciona al explicar las negociaciones diplomáticas de los años treinta y la alineación de la Italia fascista con la Alemania nazi."
        ]
      }
    },
    "Winston Churchill": {
      "who": "Político británico, primer ministro del Reino Unido durante gran parte de la Segunda Guerra Mundial.",
      "portrait": {
        "lang": "es",
        "title": "Winston Churchill"
      },
      "sources": {
        "13": [
          "La fuente destaca su capacidad oratoria y su papel en la resistencia británica; también incorpora anécdotas sobre conferencias aliadas que no se tratan como datos documentales por sí solas."
        ]
      }
    },
    "Franklin D. Roosevelt": {
      "who": "Político estadounidense y presidente de Estados Unidos entre 1933 y 1945.",
      "portrait": {
        "lang": "es",
        "title": "Franklin D. Roosevelt"
      },
      "sources": {
        "13": [
          "En la conversación se comenta su participación en conferencias aliadas y se relatan aspectos de su vida personal que requieren consulta de documentación independiente."
        ]
      }
    },
    "Heinrich Himmler": {
      "who": "Reichsführer de las SS y una de las figuras principales en la organización del aparato represivo y genocida de la Alemania nazi.",
      "portrait": {
        "lang": "es",
        "title": "Heinrich Himmler"
      },
      "sources": {
        "13": [
          "La fuente comenta su papel al frente de las SS, sus concepciones ideológicas y el interés atribuido al entorno de la organización por símbolos y reliquias religiosas."
        ]
      }
    },
    "Joseph Goebbels": {
      "who": "Político nazi y ministro de Propaganda de Alemania durante el Tercer Reich.",
      "portrait": {
        "lang": "es",
        "title": "Joseph Goebbels"
      },
      "sources": {
        "13": [
          "La conversación lo presenta como responsable de propaganda y atribuye a su entorno campañas contra comercios judíos, dentro del relato sobre la consolidación del régimen."
        ]
      }
    },
    "Hermann Göring": {
      "who": "Dirigente nazi, responsable de la aviación alemana y figura prominente del aparato estatal del régimen.",
      "portrait": {
        "lang": "es",
        "title": "Hermann Göring"
      },
      "sources": {
        "13": [
          "La entrevista alude a su control de la policía prusiana durante el ascenso nazi y a la represión de adversarios políticos."
        ]
      }
    },
    "Rudolf Hess": {
      "who": "Político nazi que fue uno de los lugartenientes de Hitler y posteriormente quedó encarcelado en Gran Bretaña tras su vuelo de 1941.",
      "portrait": {
        "lang": "es",
        "title": "Rudolf Hess"
      },
      "sources": {
        "13": [
          "La fuente lo menciona al relatar el dictado y la redacción de Mi lucha durante el encarcelamiento de Hitler."
        ]
      }
    },
    "Albert Speer": {
      "who": "Arquitecto alemán, ministro de Armamento del Tercer Reich y condenado en los juicios de Núremberg.",
      "portrait": {
        "lang": "es",
        "title": "Albert Speer"
      },
      "sources": {
        "13": [
          "En la entrevista se reproduce una anécdota atribuida a Speer sobre su reacción ante el inicio de la guerra europea en septiembre de 1939."
        ]
      }
    },
    "Erwin Rommel": {
      "who": "Mariscal de campo alemán conocido por sus campañas en el norte de África y su responsabilidad posterior en defensas del oeste europeo.",
      "portrait": {
        "lang": "es",
        "title": "Erwin Rommel"
      },
      "sources": {
        "13": [
          "La fuente compara su logística y medios con los de los Aliados; también comenta su reputación militar y las circunstancias de su caída en desgracia."
        ]
      }
    },
    "Claus von Stauffenberg": {
      "who": "Oficial alemán y miembro de la resistencia militar contra Hitler; ejecutó el atentado del 20 de julio de 1944.",
      "portrait": {
        "lang": "es",
        "title": "Claus Schenk Graf von Stauffenberg"
      },
      "sources": {
        "13": [
          "La entrevista explica que llevó un explosivo en un maletín a una reunión con Hitler y describe el fracaso de la conspiración asociada a Valquiria."
        ]
      }
    },
    "Wilhelm Canaris": {
      "who": "Almirante alemán y jefe del servicio de inteligencia militar Abwehr durante parte de la Alemania nazi.",
      "portrait": {
        "lang": "es",
        "title": "Wilhelm Canaris"
      },
      "sources": {
        "13": [
          "La fuente relata una presunta conversación con Hitler sobre asesinatos de judíos comunicados a Canaris; el detalle concreto de esa conversación no queda verificado por el texto automático."
        ]
      }
    },
    "Paul von Hindenburg": {
      "who": "Militar y político alemán, presidente de la República de Weimar hasta su muerte en 1934.",
      "portrait": {
        "lang": "es",
        "title": "Paul von Hindenburg"
      },
      "sources": {
        "13": [
          "En la entrevista se vincula su muerte a la consolidación de Hitler como jefe del Estado alemán."
        ]
      }
    },
    "Bernard Montgomery": {
      "who": "Mariscal de campo británico, comandante destacado de fuerzas aliadas en el norte de África y Europa.",
      "portrait": {
        "lang": "es",
        "title": "Bernard Montgomery"
      },
      "sources": {
        "13": [
          "La fuente compara su apoyo logístico con las carencias del Eje y también atribuye rivalidades de abastecimiento entre mandos aliados."
        ]
      }
    },
    "Carl Gustaf Emil Mannerheim": {
      "who": "Militar y estadista finlandés; comandante en jefe de las fuerzas finlandesas durante la Segunda Guerra Mundial.",
      "portrait": {
        "lang": "es",
        "title": "Carl Gustaf Emil Mannerheim"
      },
      "sources": {
        "13": [
          "La entrevista menciona el encuentro con Hitler en Finlandia en 1942 y la existencia de una grabación de su voz en una conversación no destinada a un discurso."
        ]
      }
    },
    "Charles de Gaulle": {
      "who": "General y político francés, líder de la Francia Libre y posterior presidente de la República Francesa.",
      "portrait": {
        "lang": "es",
        "title": "Charles de Gaulle"
      },
      "sources": {
        "13": [
          "Se le menciona al hablar de las conferencias diplomáticas y de los dirigentes aliados durante la guerra."
        ]
      }
    },
    "Francisco Franco": {
      "who": "General español que dirigió el bando sublevado en la Guerra Civil y gobernó España como dictador hasta 1975.",
      "portrait": {
        "lang": "es",
        "title": "Francisco Franco"
      },
      "sources": {
        "13": [
          "La fuente lo menciona al hablar del comercio de armamento durante la Guerra Civil, del rodaje de películas bélicas en España y de algunas anécdotas de gestión política."
        ]
      }
    },
    "George S. Patton": {
      "who": "General estadounidense que mandó fuerzas aliadas en el teatro europeo de la Segunda Guerra Mundial.",
      "portrait": {
        "lang": "es",
        "title": "George S. Patton"
      },
      "sources": {
        "13": [
          "La entrevista compara su avance y sus problemas de abastecimiento con los de otros mandos aliados y recuerda una película biográfica filmada en España."
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
 for(const [order,claims] of Object.entries(p.sources))prior.sources[order]=(prior.sources[order]||[]).concat(claims);
 if(!prior.portrait&&p.portrait)prior.portrait=p.portrait;
}
})();
