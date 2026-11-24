// =============================================================================
// Mod « Pins sous la neige » pour Claude Code (application desktop)
// -----------------------------------------------------------------------------
// Affiche derrière la conversation la scène animée « Snow Pines » (forêt de
// pins en ASCII sous la neige, au crépuscule), reprise telle quelle du plugin
// officiel theme-examples d'Anthropic (licence Apache 2.0 : voir LICENSE et
// l'en-tête de scene-snow-pines.ts).
//
// Différence avec l'original : le « verre dépoli » que l'application pose sur
// ses panneaux (conversation, barre latérale) est réglable, et n'a AUCUN flou
// par défaut.
//
// Commande (nom réglable dans les options du plugin, « neige » par défaut) :
//   /neige                  affiche les réglages et l'aide
//   /neige on | off         affiche ou retire le fond
//   /neige flou <0-64>      flou du verre, en points (0 = scène nette)
//   /neige voile <0-1>      opacité du voile teinté (0,5 ou 50 % acceptés)
//   /neige teinte <#hex>    couleur du voile (#rgb ou #rrggbb)
//   /neige defaut           revient aux réglages d'origine
//
// Les réglages sont gardés d'une session à l'autre (mémoire $.store du mod).
// Noms imposés par l'API, hors convention de nommage : register, $, e, next.
// =============================================================================

import type {
  EngineInterface,
  PluginOptions,
  Register,
  ThemeBackdropGlass,
  ThemeResult,
  ThemeSetArgs,
} from 'claude-code'

import { snowPinesSvg } from './scene-snow-pines'

// -----------------------------------------------------------------------------
// Constantes : identité du mod
// -----------------------------------------------------------------------------

/** Nom du plugin : doit rester identique au champ « name » de plugin.json. */
const con_NomPlugin = 'pins-sous-la-neige'
/** Nom de la scène transmis au hook Backdrop (lettres, chiffres, _ et -, 64 au plus). */
const con_NomScene = 'pins-sous-la-neige'
/** Nom de l'option de plugin.json (userConfig) qui renomme la commande. */
const con_OptionCommande = 'commande'
/** Nom de la commande quand l'option est vide ou invalide. */
const con_CommandeParDefaut = 'neige'
/** Format qu'accepte l'API pour un nom de commande. */
const con_FormatCommande = /^[A-Za-z0-9_-]{1,64}$/

// -----------------------------------------------------------------------------
// Constantes : affichage
// -----------------------------------------------------------------------------

/** Snow Pines est dessinée pour une fenêtre sombre : le mode sombre est imposé. */
const con_ModeCouleur = 'dark'
/** Description de la scène pour les lecteurs d'écran. */
const con_TexteAlternatif = 'Forêt de pins en ASCII sous la neige, au crépuscule'
/** Description de la commande dans le menu des commandes. */
const con_DescriptionCommande = 'Règle le fond Pins sous la neige : on, off, flou, voile, teinte, defaut.'
/** Indice affiché en grisé après le nom de la commande. */
const con_IndiceCommande = '[on|off|flou N|voile N|teinte #hex|defaut]'

// -----------------------------------------------------------------------------
// Constantes : bornes imposées par l'API (type ThemeBackdropGlass)
// -----------------------------------------------------------------------------

const con_FlouMin = 0
const con_FlouMax = 64
const con_VoileMin = 0
const con_VoileMax = 1
/** Teinte acceptée : #rgb ou #rrggbb. */
const con_FormatTeinte = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/
/** Nombre tapé : entier ou décimal, virgule déjà remplacée par un point. */
const con_FormatNombre = /^\d+(?:\.\d+)?$/

// -----------------------------------------------------------------------------
// Constantes : mémoire du mod
// -----------------------------------------------------------------------------

/** Clé des réglages dans $.store (gardés d'une session à l'autre). */
const con_CleReglages = 'reglages'
/** Version du format des réglages : à augmenter si leur forme change. */
const con_VersionReglages = 1

// -----------------------------------------------------------------------------
// Constantes : mots reconnus après la commande (sans accents, en minuscules)
// -----------------------------------------------------------------------------

const con_MotsAide: readonly string[] = ['aide', 'help', 'etat', '?']
const con_MotsActiver: readonly string[] = ['on', 'oui', 'active', 'activer']
const con_MotsDesactiver: readonly string[] = ['off', 'non', 'desactive', 'desactiver']
const con_MotsFlou: readonly string[] = ['flou', 'blur']
const con_MotsVoile: readonly string[] = ['voile', 'opacite', 'opacity']
const con_MotsTeinte: readonly string[] = ['teinte', 'couleur', 'tint']
const con_MotsDefaut: readonly string[] = ['defaut', 'reset', 'reinitialiser']

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

/** Réglages du mod, tels que gardés dans $.store. */
type cla_Reglages = {
  /** Version du format, pour reconnaître des réglages d'une ancienne version. */
  version: number
  /** Vrai : le fond est affiché à chaque démarrage de session. */
  actif: boolean
  /** Flou du verre dépoli, en points (0 à 64). */
  flou: number
  /** Couleur du voile posé sur les panneaux (#rgb ou #rrggbb). */
  teinte: string
  /** Opacité du voile teinté (0 à 1). */
  voile: number
}

/** Ce que demande la commande, une fois ses mots analysés. */
type cla_Action =
  | { genre: 'aide' }
  | { genre: 'activer' }
  | { genre: 'desactiver' }
  | { genre: 'defaut' }
  | { genre: 'changer'; modification: Partial<cla_Reglages>; libelle: string }
  | { genre: 'erreur'; message: string }

// -----------------------------------------------------------------------------
// Réglages d'origine : flou à 0 (demande de Kugan) ; teinte et voile repris
// du thème officiel Snow Pines, pour garder le texte lisible.
// -----------------------------------------------------------------------------

const con_ReglagesParDefaut: cla_Reglages = {
  version: con_VersionReglages,
  actif: true,
  flou: 0,
  teinte: '#14143a',
  voile: 0.5,
}

// -----------------------------------------------------------------------------
// Scène : construite une seule fois par chargement du mod (le texte SVG est
// toujours le même), puis gardée en mémoire.
// -----------------------------------------------------------------------------

let var_SceneEnCache: string | undefined

/** Renvoie le SVG de la scène, construit au premier appel. */
function fon_Scene(): string {
  if (var_SceneEnCache === undefined) {
    var_SceneEnCache = snowPinesSvg()
  }

  return var_SceneEnCache
}

// -----------------------------------------------------------------------------
// Outils
// -----------------------------------------------------------------------------

/** Message lisible d'une erreur, quelle que soit sa forme. */
function fon_MessageErreur(var_Erreur: unknown): string {
  return var_Erreur instanceof Error ? var_Erreur.message : String(var_Erreur)
}

/** Vrai pour un nombre fini compris entre les deux bornes (incluses). */
function fon_EstDansBornes(var_Valeur: unknown, var_Min: number, var_Max: number): var_Valeur is number {
  return typeof var_Valeur === 'number' && Number.isFinite(var_Valeur) && var_Valeur >= var_Min && var_Valeur <= var_Max
}

/** Minuscules sans accents, pour comparer les mots tapés (« Défaut » = « defaut »). */
function fon_Simplifier(var_Texte: string): string {
  return var_Texte
    .toLowerCase()
    .replace(/[àâä]/g, 'a')
    .replace(/[éèêë]/g, 'e')
    .replace(/[îï]/g, 'i')
    .replace(/[ôö]/g, 'o')
    .replace(/[ùûü]/g, 'u')
    .replace(/ç/g, 'c')
}

/**
 * Lit un nombre tapé à la française ou à l'anglaise : « 0,5 », « 0.5 », « 50% ».
 * Renvoie undefined si le texte n'est pas un nombre positif.
 */
function fon_LireNombre(var_Texte: string): { valeur: number; enPourcent: boolean } | undefined {
  const var_Brut = var_Texte.trim().replace(',', '.')
  const var_EnPourcent = var_Brut.endsWith('%')
  const var_Chiffres = var_EnPourcent ? var_Brut.slice(0, -1).trim() : var_Brut

  if (!con_FormatNombre.test(var_Chiffres)) {
    return undefined
  }

  return { valeur: Number(var_Chiffres), enPourcent: var_EnPourcent }
}

/** Opacité 0 à 1 écrite en pourcentage arrondi (« 50 % »). */
function fon_EnPourcent(var_Valeur: number): string {
  return `${Math.round(var_Valeur * 100)} %`
}

/** Nom de la commande lu dans les options du plugin, sinon celui par défaut. */
function fon_NomCommande(var_Options: PluginOptions): string {
  const var_Valeur = var_Options[con_OptionCommande]

  if (typeof var_Valeur === 'string') {
    // Une barre oblique tapée par erreur devant le nom est retirée.
    const var_Nom = var_Valeur.trim().replace(/^\//, '')

    if (con_FormatCommande.test(var_Nom)) {
      return var_Nom
    }
  }

  return con_CommandeParDefaut
}

// -----------------------------------------------------------------------------
// Réglages : lecture contrôlée et enregistrement
// -----------------------------------------------------------------------------

/**
 * Contrôle des réglages relus de la mémoire : tout champ absent, d'un mauvais
 * type ou hors bornes reprend sa valeur d'origine. Ainsi une mémoire abîmée
 * ou écrite par une ancienne version ne bloque jamais le mod.
 */
function fon_Normaliser(var_Brut: unknown): cla_Reglages {
  const var_Objet = typeof var_Brut === 'object' && var_Brut !== null ? (var_Brut as Record<string, unknown>) : {}
  const var_Defaut = con_ReglagesParDefaut
  const var_Flou = var_Objet['flou']
  const var_Voile = var_Objet['voile']
  const var_Teinte = var_Objet['teinte']
  const var_Actif = var_Objet['actif']

  return {
    version: con_VersionReglages,
    actif: typeof var_Actif === 'boolean' ? var_Actif : var_Defaut.actif,
    flou: fon_EstDansBornes(var_Flou, con_FlouMin, con_FlouMax) ? var_Flou : var_Defaut.flou,
    teinte: typeof var_Teinte === 'string' && con_FormatTeinte.test(var_Teinte) ? var_Teinte : var_Defaut.teinte,
    voile: fon_EstDansBornes(var_Voile, con_VoileMin, con_VoileMax) ? var_Voile : var_Defaut.voile,
  }
}

/** Lit les réglages gardés (ceux d'origine s'il n'y en a pas). */
async function fon_LireReglages($: EngineInterface): Promise<cla_Reglages> {
  return fon_Normaliser(await $.store.get(con_CleReglages))
}

/** Garde les réglages pour les prochaines sessions. */
async function fon_EnregistrerReglages($: EngineInterface, var_Reglages: cla_Reglages): Promise<void> {
  await $.store.set(con_CleReglages, var_Reglages)
}

/** Résumé des réglages en une ligne. */
function fon_DecrireReglages(var_Reglages: cla_Reglages): string {
  const var_Etat = var_Reglages.actif ? 'affiché' : 'retiré'

  return (
    `Fond ${var_Etat} : flou ${var_Reglages.flou} (de ${con_FlouMin} à ${con_FlouMax}), ` +
    `voile ${fon_EnPourcent(var_Reglages.voile)}, teinte ${var_Reglages.teinte}.`
  )
}

/** Aide de la commande, sous son nom actuel. */
function fon_Aide(var_Commande: string): string {
  return [
    `/${var_Commande} on | off : affiche ou retire le fond`,
    `/${var_Commande} flou <${con_FlouMin}-${con_FlouMax}> : flou du verre (0 = scène nette)`,
    `/${var_Commande} voile <0-1> : opacité du voile (0,3 ou 30 % acceptés)`,
    `/${var_Commande} teinte <#hex> : couleur du voile (#rgb ou #rrggbb)`,
    `/${var_Commande} defaut : réglages d'origine (flou 0, voile 50 %, teinte #14143a)`,
  ].join('\n')
}

// -----------------------------------------------------------------------------
// Analyse de la commande : transforme les mots tapés en action, sans rien
// modifier. Toute valeur hors bornes est refusée ici, avant d'atteindre l'API.
// -----------------------------------------------------------------------------

function fon_AnalyserCommande(var_Arguments: string): cla_Action {
  const var_Mots = var_Arguments.trim().split(/\s+/).filter(bou_Mot => bou_Mot !== '')
  const var_Premier = var_Mots[0]

  if (var_Premier === undefined) {
    return { genre: 'aide' }
  }

  const var_Mot = fon_Simplifier(var_Premier)
  // La valeur peut contenir des espaces (« 30 % ») : les mots suivants sont recollés.
  const var_Valeur = var_Mots.slice(1).join('')

  if (con_MotsAide.includes(var_Mot)) {
    return { genre: 'aide' }
  }

  if (con_MotsActiver.includes(var_Mot)) {
    return { genre: 'activer' }
  }

  if (con_MotsDesactiver.includes(var_Mot)) {
    return { genre: 'desactiver' }
  }

  if (con_MotsDefaut.includes(var_Mot)) {
    return { genre: 'defaut' }
  }

  if (con_MotsFlou.includes(var_Mot)) {
    const var_Nombre = fon_LireNombre(var_Valeur)

    // Le flou est en points : un pourcentage n'a pas de sens ici.
    if (var_Nombre === undefined || var_Nombre.enPourcent || !fon_EstDansBornes(var_Nombre.valeur, con_FlouMin, con_FlouMax)) {
      return { genre: 'erreur', message: `Le flou doit être un nombre de ${con_FlouMin} à ${con_FlouMax} (exemple : flou 4).` }
    }

    return { genre: 'changer', modification: { flou: var_Nombre.valeur }, libelle: `Flou réglé sur ${var_Nombre.valeur}.` }
  }

  if (con_MotsVoile.includes(var_Mot)) {
    const var_Nombre = fon_LireNombre(var_Valeur)
    const var_Opacite = var_Nombre === undefined ? undefined : var_Nombre.enPourcent ? var_Nombre.valeur / 100 : var_Nombre.valeur

    if (!fon_EstDansBornes(var_Opacite, con_VoileMin, con_VoileMax)) {
      return { genre: 'erreur', message: 'Le voile doit aller de 0 à 1, ou de 0 % à 100 % (exemple : voile 0,3).' }
    }

    return {
      genre: 'changer',
      modification: { voile: var_Opacite },
      libelle: `Voile réglé sur ${fon_EnPourcent(var_Opacite)}.`,
    }
  }

  if (con_MotsTeinte.includes(var_Mot)) {
    if (!con_FormatTeinte.test(var_Valeur)) {
      return { genre: 'erreur', message: 'La teinte doit être une couleur #rgb ou #rrggbb (exemple : teinte #14143a).' }
    }

    return { genre: 'changer', modification: { teinte: var_Valeur }, libelle: `Teinte réglée sur ${var_Valeur}.` }
  }

  return { genre: 'erreur', message: `Mot inconnu : « ${var_Premier} ».` }
}

// -----------------------------------------------------------------------------
// Fond : pose du thème
// -----------------------------------------------------------------------------

/** Pose la scène avec le verre réglé. Lève une erreur si l'API refuse le thème. */
async function fon_AppliquerFond($: EngineInterface, var_Reglages: cla_Reglages): Promise<ThemeResult> {
  const var_Verre: ThemeBackdropGlass = {
    blur: var_Reglages.flou,
    tint: var_Reglages.teinte,
    opacity: var_Reglages.voile,
  }
  const var_Theme: ThemeSetArgs = {
    backdrop: { scene: con_NomScene, glass: var_Verre },
    overrideColorScheme: con_ModeCouleur,
  }

  return $.theme.set(var_Theme)
}

/** Phrase à ajouter quand aucune fenêtre ne dessine le thème. */
function fon_NoteNonDessine(var_Resultat: ThemeResult): string {
  return var_Resultat.isDrawn ? '' : ` Attention : ${var_Resultat.reason}`
}

// -----------------------------------------------------------------------------
// Exécution de la commande. Ordre retenu : le thème est posé AVANT d'enregistrer,
// pour ne jamais garder des réglages que l'application aurait refusés.
// -----------------------------------------------------------------------------

async function fon_ExecuterCommande($: EngineInterface, var_Commande: string, var_Arguments: string): Promise<string> {
  const var_Action = fon_AnalyserCommande(var_Arguments)
  const var_Actuels = await fon_LireReglages($)

  switch (var_Action.genre) {
    case 'aide':
      return `${fon_DecrireReglages(var_Actuels)}\n${fon_Aide(var_Commande)}`

    case 'erreur':
      return `${var_Action.message} Réglages inchangés.\n${fon_Aide(var_Commande)}`

    case 'desactiver': {
      // Le retrait efface le thème de la session, quel que soit le mod qui l'a posé.
      await $.theme.clear()
      await fon_EnregistrerReglages($, { ...var_Actuels, actif: false })

      return `Fond retiré, y compris aux prochaines sessions. /${var_Commande} on pour le remettre.`
    }

    case 'activer':
    case 'defaut':
    case 'changer': {
      const var_Base = var_Action.genre === 'defaut' ? con_ReglagesParDefaut : var_Actuels
      const var_Modification = var_Action.genre === 'changer' ? var_Action.modification : {}
      // Changer un réglage affiche aussi le fond, pour voir tout de suite l'effet.
      const var_Nouveaux: cla_Reglages = { ...var_Base, ...var_Modification, actif: true }
      const var_Resultat = await fon_AppliquerFond($, var_Nouveaux)

      await fon_EnregistrerReglages($, var_Nouveaux)

      const var_Libelle =
        var_Action.genre === 'changer'
          ? var_Action.libelle
          : var_Action.genre === 'defaut'
            ? 'Réglages d\'origine rétablis.'
            : 'Fond affiché.'

      return `${var_Libelle} ${fon_DecrireReglages(var_Nouveaux)}${fon_NoteNonDessine(var_Resultat)}`
    }
  }
}

// -----------------------------------------------------------------------------
// Point d'entrée du mod : branchement des hooks
// -----------------------------------------------------------------------------

export const register: Register = (on, options) => {
  const var_Commande = fon_NomCommande(options)

  // Démarrage (et rechargement) de session : déclare la commande, puis remet
  // le fond si l'utilisateur ne l'a pas retiré. Chaque étape est protégée :
  // un échec ne doit jamais bloquer le démarrage de la session.
  on('session.start', async ($, e, next) => {
    try {
      await $.command.register({
        name: var_Commande,
        description: con_DescriptionCommande,
        argumentHint: con_IndiceCommande,
      })
    } catch (var_Erreur) {
      void $.ui.toast(`${con_NomPlugin} : la commande /${var_Commande} est indisponible (${fon_MessageErreur(var_Erreur)}).`)
    }

    try {
      const var_Reglages = await fon_LireReglages($)

      if (var_Reglages.actif) {
        const var_Resultat = await fon_AppliquerFond($, var_Reglages)

        if (!var_Resultat.isDrawn) {
          await $.ui.log(`${con_NomPlugin} : fond posé mais non dessiné (${var_Resultat.reason}).`, { to: 'debug' })
        }
      }
    } catch (var_Erreur) {
      void $.ui.toast(`${con_NomPlugin} : impossible d'afficher le fond (${fon_MessageErreur(var_Erreur)}).`)
    }

    return next(e)
  })

  // La commande de réglage : toute erreur est rendue en clair, sans rien casser.
  // Le `.catch` est un dernier filet : si le hook échouait malgré tout (délai
  // dépassé, réponse refusée), la commande répond quand même au lieu de se taire.
  on('command.run', { command: var_Commande }, async ($, e) => {
    try {
      return { text: await fon_ExecuterCommande($, var_Commande, e.args) }
    } catch (var_Erreur) {
      return { text: `${con_NomPlugin} : la commande a échoué (${fon_MessageErreur(var_Erreur)}).` }
    }
  }).catch(() => ({ text: `${con_NomPlugin} : la commande n'a pas pu aboutir. Réglages inchangés.` }))

  // Dessin du fond : seulement pour la scène de ce mod, et sur les surfaces qui
  // savent dessiner une scène (application desktop et appli mobile ; ces deux
  // noms sont ceux de l'API). Tout le reste passe au suivant, inchangé.
  on('ui.render', { component: 'Backdrop' }, ($, e, next) => {
    const var_EstNotreScene = e.props.scene === con_NomScene && e.props.plugin.startsWith(con_NomPlugin)

    if (!var_EstNotreScene || (e.surface !== 'desktop' && e.surface !== 'mobile')) {
      return next(e)
    }

    const { Svg } = $.ui.resolve(e)

    return <Svg isInteractive alt={con_TexteAlternatif} source={fon_Scene()} />
  })
}
