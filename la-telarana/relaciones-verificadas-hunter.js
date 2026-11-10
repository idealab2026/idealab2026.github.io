/* Relaciones sustantivas contrastadas: Hunter Biden. Separadas de las meras menciones de podcasts. */
window.IDEA_TELARANA_HUNTER_VERIFIED = {
  "metadata": {
    "id": "idealab-verified-hunter-biden",
    "scope": "relaciones_sustantivas_verificadas",
    "note": "Las apariciones en podcasts no son relaciones entre personas. Solo hechos con corroboración externa."
  },
  "nodes": [
    {
      "id": "fact-hunter-biden",
      "name": "Hunter Biden",
      "kind": "Persona",
      "subtitle": "Abogado estadounidense y exconsejero de Burisma Holdings",
      "note": "Hijo de Joe Biden y miembro del consejo de Burisma Holdings entre 2014 y 2019. Los hechos biográficos se distinguen de las alegaciones mencionadas en las entrevistas.",
      "source": "https://www.cbsnews.com/news/bidens-son-joins-board-of-gas-company-in-ukraine/",
      "topic3d": "global"
    },
    {
      "id": "fact-joe-biden",
      "name": "Joe Biden",
      "kind": "Persona",
      "subtitle": "Expresidente de Estados Unidos",
      "note": "Padre de Hunter Biden.",
      "source": "https://www.cbsnews.com/news/bidens-son-joins-board-of-gas-company-in-ukraine/",
      "topic3d": "global"
    },
    {
      "id": "fact-burisma-holdings",
      "name": "Burisma Holdings",
      "kind": "Empresa",
      "subtitle": "Empresa privada ucraniana de petróleo y gas",
      "note": "La empresa anunció la incorporación de Hunter Biden a su consejo de administración en mayo de 2014. Su mandato finalizó en 2019.",
      "source": "https://www.cbsnews.com/news/bidens-son-joins-board-of-gas-company-in-ukraine/",
      "topic3d": "global"
    }
  ],
  "edges": [
    {
      "id": "fact-hunter-joe-parentesco",
      "a": "fact-hunter-biden",
      "b": "fact-joe-biden",
      "type": "Padre e hijo",
      "confidence": "documentado",
      "note": "Joe Biden es el padre de Hunter Biden. Relación familiar comprobada con fuentes independientes.",
      "source": "https://www.cbsnews.com/news/bidens-son-joins-board-of-gas-company-in-ukraine/",
      "claimStatus": "hecho_verificado_independiente"
    },
    {
      "id": "fact-hunter-burisma-board",
      "a": "fact-hunter-biden",
      "b": "fact-burisma-holdings",
      "type": "Miembro del consejo (2014–2019)",
      "confidence": "documentado",
      "note": "Hunter Biden formó parte del consejo de Burisma Holdings desde mayo de 2014 hasta abril de 2019, según fuentes periodísticas y de verificación independientes.",
      "source": "https://www.factcheck.org/2024/03/hunter-bidens-testimony-in-context/",
      "claimStatus": "hecho_verificado_independiente"
    }
  ]
};
