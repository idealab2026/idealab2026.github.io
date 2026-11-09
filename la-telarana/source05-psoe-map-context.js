/* Fuente 05: procedencia editorial de un portal partidista. No convertir investigados en condenados. */
window.IDEA_TELARANA_SOURCE05_EDITORIAL = {
  "metadata": {
    "id": "web-psoe-map-2026-source05",
    "title": "Mapa de la corrupción del PSOE",
    "url": "https://latramapsoe.es/",
    "type": "web_page",
    "publishedAt": "2026-06-14",
    "reviewStage": "source_provenance_and_methodology_initial",
    "publisher": "Partido Popular",
    "publisherEvidence": "https://www.pp.es/actualidad/videos/latramapsoe-es/",
    "externalContext": "https://www.lasexta.com/noticias/nacional/mueve-ficha-lanza-web-mapa-corrupcion-psoe-ayudar-entender-procesos-judiciales-que-rondan-sanchez_202606146a2e800c0f0ef63eb6733dd1.html",
    "transcriptNeeded": false,
    "individualCaseFactsVerified": false,
    "allCountsArePublisherClaims": true,
    "verifiedSiteLaunch": true,
    "officialJudicialFilesReviewed": 0,
    "siteSnapshotAsOf": "2026-11-09",
    "siteCountsObserved": {
      "causes": 17,
      "offenceTypes": 21,
      "personDirectory": 97,
      "theoreticalSumPersons": 127
    },
    "qualityNotes": "El portal muestra discrepancias internas de universos estadísticos (97 entradas del directorio frente a 127 en un cálculo penal teórico). No considerar cifra como consolidada ni pena hipotética como condena. Registrar versiones y comprobar documentos judiciales originales antes de integrar nombres como investigados.",
    "sourceDocUrl": null,
    "sourceNotebooks": [
      "CULTURA - GEOPOLÍTICA - ESPAÑA"
    ]
  },
  "nodes": [
    {
      "id": "f05-portal",
      "name": "Mapa de la corrupción del PSOE · latramapsoe.es",
      "kind": "Publicación",
      "subtitle": "Portal político de consulta · fuente 05",
      "note": "Portal publicado por el Partido Popular en junio de 2026 para presentar una selección de procedimientos judiciales, personas y presuntos delitos que el partido relaciona con cargos y entornos políticos. El sitio es fuente PRIMARIA sobre lo que el PP publica, pero no es fuente primaria sobre la culpabilidad de los mencionados. Las fases procesales, nombres, cifras y vínculos deben contrastarse con tribunales y autos independientes.",
      "source": "https://latramapsoe.es/",
      "photo": "",
      "topic3d": "politica",
      "podcastNotes": []
    },
    {
      "id": "f05-pp",
      "name": "Partido Popular (España)",
      "kind": "Organización",
      "subtitle": "Impulsor y promotor del portal",
      "note": "El Partido Popular es una organización política española que difundió y promocionó en su web oficial el portal latramapsoe.es el 14 de junio de 2026. Consta por una página del propio partido y por noticias contemporáneas de distintos medios. Esta relación documental se limita a la autoría institucional de la campaña; no acredita la veracidad de los casos y datos que presenta.",
      "source": "https://www.pp.es/actualidad/videos/latramapsoe-es/",
      "photo": "",
      "topic3d": "politica",
      "podcastNotes": []
    },
    {
      "id": "f05-psoe",
      "name": "Partido Socialista Obrero Español (PSOE)",
      "kind": "Organización",
      "subtitle": "Organización citada como temática del sitio",
      "note": "El PSOE es un partido político español al que se refiere expresamente el título del portal. Esta ficha NO implica la existencia probada de una única organización criminal, ni que todas las personas citadas sean miembros, investigadas por lo mismo, condenadas o relacionadas entre sí. La metodología del portal parte de un encuadre partidista que debe contrastarse caso a caso.",
      "source": "https://latramapsoe.es/",
      "photo": "",
      "topic3d": "politica",
      "podcastNotes": []
    },
    {
      "id": "f05-audit",
      "name": "Auditoría documental y presunción de inocencia · fuente 05",
      "kind": "Marco jurídico",
      "subtitle": "Contraste de fuentes judiciales y fase procesal",
      "note": "Antes de incorporar a personas y delitos de este portal hay que registrar para cada causa el juzgado, la referencia del procedimiento, fase procesal y documento original; separar investigado, acusado, condenado y sentencia firme; identificar la fecha de la versión; y no sumar penas máximas teóricas como si fueran condenas impuestas. La fuente consultada muestra inconsistencias entre las cifras de cabecera y las explicaciones internas, que requieren verificación de metodología y datos.",
      "source": "https://latramapsoe.es/",
      "photo": "",
      "topic3d": "politica",
      "podcastNotes": []
    }
  ],
  "edges": [
    {
      "id": "f05-edge-publisher",
      "a": "f05-pp",
      "b": "f05-portal",
      "type": "Difusión y promoción institucional",
      "confidence": "documentado",
      "note": "El Partido Popular promocionó el portal latramapsoe.es en una publicación de su web del 14/06/2026. Solo consta la relación de promoción del sitio; no se valida su contenido judicial.",
      "source": "https://www.pp.es/actualidad/videos/latramapsoe-es/",
      "episodeId": "web-psoe-map-2026-source05",
      "claimStatus": "dato_editorial_del_publicador_no_verifica_acusaciones",
      "podcastNotes": []
    },
    {
      "id": "f05-edge-topic",
      "a": "f05-portal",
      "b": "f05-psoe",
      "type": "Objeto del portal, no imputación penal",
      "confidence": "documentado",
      "note": "El portal emplea el PSOE en su título y agrupa casos judiciales según su selección editorial. Esta referencia temática no constituye prueba de una trama criminal colectiva.",
      "source": "https://latramapsoe.es/",
      "episodeId": "web-psoe-map-2026-source05",
      "claimStatus": "dato_editorial_del_publicador_no_verifica_acusaciones",
      "podcastNotes": []
    },
    {
      "id": "f05-edge-audit",
      "a": "f05-portal",
      "b": "f05-audit",
      "type": "Necesidad de verificación documental",
      "confidence": "documentado",
      "note": "El portal contiene alegaciones de distintas fases procesales y cifras teóricas de penas, por lo que la incorporación a un grafo de relaciones requiere cotejar autos, sentencias y resoluciones y separar presunción de inocencia de culpabilidad.",
      "source": "https://latramapsoe.es/",
      "episodeId": "web-psoe-map-2026-source05",
      "claimStatus": "dato_editorial_del_publicador_no_verifica_acusaciones",
      "podcastNotes": []
    }
  ],
  "checks": [
    {
      "statement": "La plataforma fue promocionada por el PP en junio de 2026",
      "status": "verificado_comunicacion_partidista",
      "ref": "https://www.pp.es/actualidad/videos/latramapsoe-es/"
    },
    {
      "statement": "La plataforma menciona procedimientos y personas vinculadas al entorno socialista",
      "status": "consta_en_el_portal_no_equivale_a_hechos_condenados",
      "ref": "https://latramapsoe.es/"
    },
    {
      "statement": "Las cifras, vínculos y penas incluidas son concluyentes",
      "status": "no_verificado_necesita_documentos_judiciales_independientes",
      "ref": "https://latramapsoe.es/"
    }
  ]
};
