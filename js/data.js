/* ==========================================================================
   KIM — données du personnage et plan du labyrinthe
   --------------------------------------------------------------------------
   C'est LE fichier à modifier pour mettre la fiche à jour.
   Tout ce qui est ici est affiché automatiquement dans le site
   (salle « Identité », fenêtres Système, console de requêtes).
   ========================================================================== */

window.KIM = {

  /* ---- Identité (salle « Identité ») ---------------------------------- */
  fiche: [
    { label: 'Nom',    valeur: '???', inconnu: true },
    { label: 'Prénom', valeur: 'Kim' },
    { label: 'Âge',    valeur: '11 ans' },
    { label: 'Sexe',   valeur: 'Homme' },
    { label: 'Race',   valeur: 'Humain' },
    { label: 'Taille', valeur: '173 cm' },
    { label: 'Poids',  valeur: '57 kilogrammes' }
  ],

  /* ---- Statistiques (niveau 0 à 20) ----------------------------------- */
  stats: [
    { nom: 'F. Musculaire',     lvl: 3 },
    { nom: 'F. Physique',       lvl: 3 },
    { nom: 'Endurance',         lvl: 2 },
    { nom: 'Agilité',           lvl: 3 },
    { nom: 'Perception',        lvl: 4 },
    { nom: 'Puissance magique', lvl: 0 },
    { nom: 'Robustesse',        lvl: 3 },
    { nom: 'Vitalité',          lvl: 2 }
  ],

  /* ---- Rolls (0 à 100, constants) ------------------------------------- */
  rolls: [
    { nom: 'Roll de chance', val: 88 },
    { nom: 'Roll de magie',  val: 53 }
  ],

  /* ---- Compétences ----------------------------------------------------
     Vides pour l'instant : la salle affiche « aucune donnée ».
     Pour en ajouter une, copie ce modèle entre les crochets voulus :

       {
         nom: 'Nom de la compétence',
         niveau: 1,            // X  (laisse null si pas de niveau)
         max: 5,               // Y  (laisse null si pas de maximum)
         effet: '…',
         contraintes: '…',     // facultatif
         evolution: '…'        // facultatif : comment elle gagne un niveau
       },

     csp       → Compétence Spéciale Primaire (une seule en général)
     simples   → compétences simples (souvent passives)
     speciales → autres compétences spéciales (CS)
  ------------------------------------------------------------------------ */
  competences: {
    csp: [],
    simples: [],
    speciales: []
  },

  /* ---- Titres ---------------------------------------------------------
     Format d'un titre :

       {
         nom: 'Nom du titre',
         recompenses: '…',     // ce qui suit le « + » dans la notification
         description: '…'      // facultatif
       },
  ------------------------------------------------------------------------ */
  titres: []
};


/* ==========================================================================
   Plan du labyrinthe
   --------------------------------------------------------------------------
   Grille de 5 colonnes × 4 lignes. Chaque salle = un <section id="…">
   dans index.html. « links » = passages entre deux salles voisines.
   « secret » = passages qui ne brillent pas dans le noir.
   ========================================================================== */

window.DEDALE_MAP = {
  cols: 5,
  rows: 4,
  start: 'seuil',
  rooms: {
    f3:      [0, 0], corps:       [1, 0], rien:     [2, 0], stats:    [3, 0], f5:  [4, 0],
    vide:    [0, 1], f1:          [1, 1], seuil:    [2, 1], couloir:  [3, 1], competences: [4, 1],
    esprit:  [0, 2], creux:       [1, 2], identite: [2, 2], f2:       [3, 2], titres: [4, 2],
    enfant:  [0, 3], f6:          [1, 3], f4:       [2, 3], archives: [3, 3], f7:  [4, 3]
  },
  links: [
    ['seuil', 'rien'],
    ['seuil', 'f1'],
    ['seuil', 'identite'],
    ['seuil', 'couloir'],
    ['couloir', 'stats'],
    ['stats', 'f5'],
    ['couloir', 'competences'],
    ['competences', 'titres'],
    ['titres', 'f7'],
    ['f7', 'archives'],
    ['archives', 'f2'],
    ['archives', 'f4'],
    ['f4', 'f6'],
    ['f6', 'enfant'],
    ['identite', 'creux'],
    ['creux', 'esprit'],
    ['esprit', 'vide'],
    ['vide', 'f3'],
    ['f3', 'corps'],
    ['f1', 'corps']
  ],
  secret: [
    ['f6', 'enfant']
  ]
};
