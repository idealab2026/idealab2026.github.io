/* F37: revisión parcial sobre Göbekli Tepe sin cotejo de audio. */
window.IDEA_TELARANA_F37_REVIEW = {
  "metadata": {
    "id": "idealab-f37-buen-salvaje",
    "sourceOrder": 37,
    "title": "F37 · El buen salvaje y el origen del cuento humano",
    "url": "https://www.youtube.com/watch?v=-5HzKQ9amDw",
    "reviewStage": "primera_revision_parcial_sin_audio",
    "audioVerified": false,
    "timecodesAvailable": false,
    "reviewComplete": false,
    "methodologicalNote": "Revisión parcial de un pasaje del texto automático sin audio, voces ni integridad cotejados. La datación arqueológica es un intervalo aproximado, no una fecha de construcción exacta."
  },
  "nodes": [
    {
      "id": "f37-episodio",
      "name": "F37 · El buen salvaje y el origen del cuento humano",
      "kind": "Fuente",
      "subtitle": "Episodio con transcripción automática sin cotejar",
      "note": "Episodio con transcripción automática sin cotejar",
      "source": "https://www.youtube.com/watch?v=-5HzKQ9amDw",
      "topic3d": "historia",
      "photo": "",
      "podcastNotes": []
    },
    {
      "id": "f39-gobekli",
      "name": "Göbekli Tepe",
      "kind": "Lugar",
      "subtitle": "Yacimiento neolítico en el sureste de Turquía",
      "note": "Yacimiento neolítico en el sureste de Turquía",
      "source": "https://whc.unesco.org/en/list/1572",
      "topic3d": "historia",
      "photo": "",
      "podcastNotes": [
        {
          "episodeId": "idealab-f37-buen-salvaje",
          "title": "F37 · revisión parcial sin minuto verificado",
          "source": "https://www.youtube.com/watch?v=-5HzKQ9amDw",
          "timeSec": null,
          "status": "relato_del_episodio_sin_audio",
          "text": "La transcripción menciona 1994 y describe pilares con animales. El texto y la voz aún requieren cotejo; no se considera demostrada una hipótesis de diluvio global."
        },
        {
          "episodeId": "idealab-f37-buen-salvaje",
          "title": "F37 · revisión parcial sin minuto verificado",
          "source": "https://www.dainst.org/blogs/goebekli-tepe-the-first-20-years-of-research/630",
          "timeSec": null,
          "status": "contraste_documental_fuente_primaria",
          "text": "El Instituto Arqueológico Alemán sitúa el reconocimiento del yacimiento en 1963 y la nueva identificación de sus estructuras monumentales en 1994; las excavaciones comenzaron en 1995."
        },
        {
          "episodeId": "idealab-f37-buen-salvaje",
          "title": "F37 · revisión parcial sin minuto verificado",
          "source": "https://whc.unesco.org/en/list/1572",
          "timeSec": null,
          "status": "contraste_documental_institucional",
          "text": "UNESCO sitúa las estructuras principales aproximadamente entre 9600 y 8200 a. C. y describe pilares en T con animales silvestres. La función ritual es una interpretación arqueológica, no un hecho cerrado."
        }
      ]
    },
    {
      "id": "f37-schmidt",
      "name": "Klaus Schmidt",
      "kind": "Persona",
      "subtitle": "Arqueólogo vinculado a Göbekli Tepe",
      "note": "Arqueólogo vinculado a Göbekli Tepe",
      "source": "https://www.dainst.org/blogs/goebekli-tepe-the-first-20-years-of-research/630",
      "topic3d": "historia",
      "photo": "",
      "podcastNotes": []
    },
    {
      "id": "f37-dai",
      "name": "Instituto Arqueológico Alemán",
      "kind": "Organización",
      "subtitle": "Institución de investigación arqueológica",
      "note": "Institución de investigación arqueológica",
      "source": "https://www.dainst.org/blogs/goebekli-tepe-the-first-20-years-of-research/630",
      "topic3d": "historia",
      "photo": "",
      "podcastNotes": []
    }
  ],
  "edges": [
    {
      "id": "f37-mencion-gobekli",
      "a": "f37-episodio",
      "b": "f39-gobekli",
      "type": "Mención en fuente",
      "confidence": "indicio",
      "claimStatus": "mencion_no_prueba_relacion",
      "note": "El episodio trata el lugar; la mera mención no acredita una hipótesis histórica.",
      "source": "https://www.youtube.com/watch?v=-5HzKQ9amDw",
      "podcastNotes": []
    },
    {
      "id": "f37-schmidt-gobekli",
      "a": "f37-schmidt",
      "b": "f39-gobekli",
      "type": "Reidentificación arqueológica en 1994",
      "confidence": "documentado",
      "claimStatus": "hecho_documentado_fuente_primaria",
      "note": "El instituto documenta la reidentificación de las estructuras en 1994, en un yacimiento conocido desde 1963.",
      "source": "https://www.dainst.org/blogs/goebekli-tepe-the-first-20-years-of-research/630",
      "podcastNotes": []
    },
    {
      "id": "f37-dai-gobekli",
      "a": "f37-dai",
      "b": "f39-gobekli",
      "type": "Investigación arqueológica",
      "confidence": "documentado",
      "claimStatus": "hecho_documentado_fuente_primaria",
      "note": "El instituto participó en la investigación y excavaciones del yacimiento.",
      "source": "https://www.dainst.org/blogs/goebekli-tepe-the-first-20-years-of-research/630",
      "podcastNotes": []
    }
  ]
};
