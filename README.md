# KIM — Le Dédale

Site de personnage pour **Kim**, Excavateur du Dédale (RP).
Le site est un petit labyrinthe : 20 salles dans le noir, une lampe, des passages au bord des murs.

## Mettre en ligne sur GitHub Pages

1. Crée un dépôt sur GitHub (par exemple `kim`).
2. Envoie **tout le contenu de ce dossier** à la racine du dépôt (bouton *Add file → Upload files*, glisse les fichiers et les dossiers `css`, `js`, `img`).
3. Dans le dépôt : **Settings → Pages → Build and deployment → Source : Deploy from a branch**, branche `main`, dossier `/ (root)`, puis *Save*.
4. Après une minute, le site est sur `https://TON-PSEUDO.github.io/kim/`.

Le fichier `.nojekyll` est là pour que GitHub serve les fichiers tels quels.
`404.html` s'affiche automatiquement si quelqu'un tape une mauvaise adresse.

## Modifier le contenu

| Quoi | Où |
|---|---|
| Identité, statistiques, rolls | `js/data.js` → `fiche`, `stats`, `rolls` |
| **Compétences** | `js/data.js` → `competences` (modèle en commentaire) |
| **Titres** | `js/data.js` → `titres` (modèle en commentaire) |
| Textes des salles (corps, esprit, salle cachée…) | `index.html`, une `<section>` par salle |
| Plan du labyrinthe (positions, passages, passage secret) | `js/data.js` → `DEDALE_MAP` |
| Images | `img/fragment-01.jpg` … `fragment-07.jpg` |

Les compétences et les titres apparaissent tout seuls dans leurs fenêtres Système et dans la console dès qu'ils sont ajoutés.

## Commandes

- Flèches / ZQSD (ou WASD) : changer de salle
- Clic / toucher sur un passage lumineux au bord de l'écran
- `/` : console du Système (requêtes : `carte`, `statistiques`, `compétences`, `titres`, `fragments`, `position`, `aide`…)
- `M` : carte (seules les salles visitées y figurent)
- `L` : allumer la lumière (mode accessible, tout est visible)

## Accessibilité

- Bouton **Lumière** (ou « Entrer avec la lumière allumée ») : supprime l'obscurité.
- Navigation complète au clavier, la lampe suit le focus.
- Chaque salle est annoncée aux lecteurs d'écran.
- `prefers-reduced-motion` respecté : pas de scintillement ni d'animation.
- Le son est désactivé par défaut et entièrement synthétisé (aucun fichier audio).

## Crédits

Illustration couleur : @M7MD_ODA. Autres images : planches de manga, droits à leurs auteurs respectifs.
