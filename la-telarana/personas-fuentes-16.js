/* F16: biografía independentiente y relato impersonal. ASR multivoz sin diarización, alegaciones no constituyen hechos; Rubén Gisbert ausente en este episodio. */
(function(){
const extra={
  "version": 1,
  "updatedAt": "2026-11-10",
  "sourceIds": {
    "16": "idealab-f16-source"
  },
  "sourceUrls": {
    "16": "https://www.youtube.com/watch?v=J4bqUufijTo"
  },
  "sourceLabels": {
    "16": "El Canal del Coronel · Ceuta y Marruecos"
  },
  "profiles": {
    "Pedro Baños": {
      "who": "Coronel retirado del Ejército de Tierra español, escritor y analista de geopolítica; dirige El Canal del Coronel.",
      "portrait": {
        "lang": "es",
        "title": "Pedro Baños"
      },
      "sources": {
        "16": [
          "Presenta el episodio sobre Ceuta y plantea una lectura estratégica de las actuaciones de Marruecos, los intereses de Estados Unidos en África y la seguridad europea."
        ]
      }
    },
    "Alberto Iturralde": {
      "who": "Analista financiero y operador bursátil español, colaborador habitual en medios especializados en mercados.",
      "portrait": null,
      "sources": {
        "16": [
          "Participa en la conversación y plantea interpretaciones sobre intereses económicos, poder político y cómo se relacionan con decisiones internacionales."
        ]
      }
    },
    "Rubén Gisbert": {
      "who": "Abogado y comunicador español conocido por sus contenidos de política y participación en canales digitales.",
      "portrait": {
        "lang": "es",
        "title": "Rubén Gisbert"
      },
      "sources": {
        "16": [
          "El presentador explica al inicio que Rubén Gisbert no participa en el episodio por una circunstancia personal, por lo que no deben atribuirsele las tesis expresadas por quienes sí intervienen."
        ]
      }
    },
    "Donald Trump": {
      "who": "Empresario y político estadounidense que asumió un segundo mandato presidencial en enero de 2025.",
      "portrait": {
        "lang": "es",
        "title": "Donald Trump"
      },
      "sources": {
        "16": [
          "En el episodio se formulan hipótesis sobre presiones políticas y se comentan sus decisiones exteriores; la conversación no constituye prueba de los motivos privados que se le atribuyen."
        ]
      }
    },
    "Marine Le Pen": {
      "who": "Política francesa y dirigente histórica del partido Agrupación Nacional, formación de derecha nacionalista.",
      "portrait": {
        "lang": "es",
        "title": "Marine Le Pen"
      },
      "sources": {
        "16": [
          "La fuente la utiliza como ejemplo al opinar que los discursos políticos pueden cambiar cuando una persona se aproxima a ejercer el poder."
        ]
      }
    },
    "Alice Weidel": {
      "who": "Política alemana y dirigente de Alternativa para Alemania (AfD), formación de derecha populista.",
      "portrait": {
        "lang": "es",
        "title": "Alice Weidel"
      },
      "sources": {
        "16": [
          "En el episodio se la cita al especular sobre cómo podría evolucionar su conducta política si llegase a gobernar; se trata de una hipótesis expresada en la conversación."
        ]
      }
    },
    "Giorgia Meloni": {
      "who": "Política italiana y presidenta del Consejo de Ministros de Italia desde octubre de 2022.",
      "portrait": {
        "lang": "es",
        "title": "Giorgia Meloni"
      },
      "sources": {
        "16": [
          "Los interlocutores comentan su evolución de discurso y su trayectoria de gobierno, interpretándolas desde su teoría sobre incentivos y presiones políticas."
        ]
      }
    },
    "Emmanuel Macron": {
      "who": "Político francés y presidente de la República Francesa desde mayo de 2017.",
      "portrait": {
        "lang": "es",
        "title": "Emmanuel Macron"
      },
      "sources": {
        "16": [
          "La fuente lo menciona de pasada en una discusión sobre presuntas formas de presión sobre dirigentes; no ofrece verificación independiente de los rumores personales que surgen."
        ]
      }
    },
    "Pedro Sánchez": {
      "who": "Político español y presidente del Gobierno desde junio de 2018.",
      "portrait": {
        "lang": "es",
        "title": "Pedro Sánchez"
      },
      "sources": {
        "16": [
          "En el episodio se discute su política hacia Marruecos y el Sáhara Occidental, y se plantea una interpretación de intereses económicos y diplomáticos sin demostrar relaciones ilícitas."
        ]
      }
    },
    "Benjamin Netanyahu": {
      "who": "Político israelí que ha ejercido varios mandatos como primer ministro de Israel.",
      "portrait": {
        "lang": "es",
        "title": "Benjamin Netanyahu"
      },
      "sources": {
        "16": [
          "La conversación crítica la actuación de su Gobierno y discute la guerra en Oriente Medio; las valoraciones de los participantes se presentan como posiciones de la fuente."
        ]
      }
    },
    "Vladímir Putin": {
      "who": "Político ruso que ha ocupado la presidencia de la Federación de Rusia durante varias etapas desde 2000.",
      "portrait": {
        "lang": "es",
        "title": "Vladímir Putin"
      },
      "sources": {
        "16": [
          "En la fuente se comentan declaraciones suyas sobre la guerra de Ucrania y la seguridad europea, cuya interpretación se atribuye a los interlocutores."
        ]
      }
    },
    "Volodímir Zelenski": {
      "who": "Político ucraniano y presidente de Ucrania desde 2019.",
      "portrait": {
        "lang": "es",
        "title": "Volodímir Zelenski"
      },
      "sources": {
        "16": [
          "Los participantes comentan su papel en la guerra y formulan conjeturas sobre su autonomía y continuidad política; el episodio no acredita esas conjeturas."
        ]
      }
    },
    "Ursula von der Leyen": {
      "who": "Política alemana y presidenta de la Comisión Europea desde diciembre de 2019.",
      "portrait": {
        "lang": "es",
        "title": "Ursula von der Leyen"
      },
      "sources": {
        "16": [
          "La fuente la menciona al criticar la conducción institucional europea de la política hacia Ucrania, desde la interpretación de los participantes."
        ]
      }
    },
    "Mohamed VI de Marruecos": {
      "who": "Monarca de Marruecos desde julio de 1999, jefe del Estado marroquí.",
      "portrait": {
        "lang": "es",
        "title": "Mohamed VI de Marruecos"
      },
      "sources": {
        "16": [
          "En la conversación se especula sobre las negociaciones de Marruecos con Estados Unidos y la postura del reino ante Ceuta y el Sáhara Occidental; no se prueba un plan encubierto."
        ]
      }
    },
    "Nizar Baraka": {
      "who": "Político marroquí, dirigente del partido Istiqlal y titular de responsabilidades ministeriales vinculadas a equipamientos e infraestructuras.",
      "portrait": {
        "lang": "es",
        "title": "Nizar Baraka"
      },
      "sources": {
        "16": [
          "La fuente cita una intervención suya sobre reivindicaciones territoriales marroquíes relacionadas con Ceuta; las palabras deben cotejarse con el registro original."
        ]
      }
    },
    "Juan Carlos I": {
      "who": "Rey de España entre 1975 y 2014, sucedido por Felipe VI tras su abdicación.",
      "portrait": {
        "lang": "es",
        "title": "Juan Carlos I de España"
      },
      "sources": {
        "16": [
          "El episodio lo menciona en una opinión crítica sobre la evolución de la política española hacia el Sáhara Occidental."
        ]
      }
    },
    "Felipe González": {
      "who": "Político socialista español y presidente del Gobierno entre 1982 y 1996.",
      "portrait": {
        "lang": "es",
        "title": "Felipe González"
      },
      "sources": {
        "16": [
          "Los participantes comentan su política europea y su posición histórica sobre el Sáhara Occidental desde una interpretación crítica de sus decisiones."
        ]
      }
    },
    "Tucker Carlson": {
      "who": "Periodista y presentador estadounidense conocido por sus programas televisivos y contenidos políticos digitales.",
      "portrait": {
        "lang": "es",
        "title": "Tucker Carlson"
      },
      "sources": {
        "16": [
          "La conversación lo invoca como referencia mediática para respaldar una interpretación polémica, sin aportar por esa sola mención pruebas adicionales."
        ]
      }
    },
    "Alfredo Jalife-Rahme": {
      "who": "Médico, profesor y analista geopolítico mexicano conocido por comentarios de política internacional.",
      "portrait": {
        "lang": "es",
        "title": "Alfredo Jalife-Rahme"
      },
      "sources": {
        "16": [
          "En la fuente se cita su nombre como comentarista de Oriente Medio y de las tensiones regionales, sin incorporar por ello sus tesis como hechos."
        ]
      }
    },
    "Boris Johnson": {
      "who": "Político británico que fue primer ministro del Reino Unido entre 2019 y 2022.",
      "portrait": {
        "lang": "es",
        "title": "Boris Johnson"
      },
      "sources": {
        "16": [
          "Se le menciona junto a sus sucesores al comparar distintos ejecutivos británicos y sostener que no habrían cambiado ciertas prioridades exteriores."
        ]
      }
    },
    "Rishi Sunak": {
      "who": "Político británico que ejerció como primer ministro del Reino Unido entre 2022 y 2024.",
      "portrait": {
        "lang": "es",
        "title": "Rishi Sunak"
      },
      "sources": {
        "16": [
          "En el episodio aparece en una comparación entre primeros ministros británicos sobre la continuidad de orientación gubernamental."
        ]
      }
    },
    "Keir Starmer": {
      "who": "Político británico y líder del Partido Laborista, primer ministro del Reino Unido desde julio de 2024.",
      "portrait": {
        "lang": "es",
        "title": "Keir Starmer"
      },
      "sources": {
        "16": [
          "La fuente lo menciona para argumentar que distintos gobiernos británicos mantienen prioridades estratégicas similares; se trata del análisis de los interlocutores."
        ]
      }
    }
  }
};
const base=window.IDEA_TELARANA_PERSON_SOURCE_REPORTS;if(!base)return;
Object.assign(base.sourceIds,extra.sourceIds);Object.assign(base.sourceUrls,extra.sourceUrls);base.sourceLabels=Object.assign({},base.sourceLabels||{},extra.sourceLabels);
for(const [name,p]of Object.entries(extra.profiles)){const prior=base.profiles[name];if(!prior){base.profiles[name]=p;continue;}for(const [order,a] of Object.entries(p.sources))prior.sources[order]=(prior.sources[order]||[]).concat(a);if(!prior.portrait&&p.portrait)prior.portrait=p.portrait;}
})();
