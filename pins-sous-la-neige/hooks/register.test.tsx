// =============================================================================
// Tests du mod « Pins sous la neige » (lancés par : claude plugin test <dossier>)
// Les hooks branchés ici avec `on` tiennent le rôle de l'application : ils
// répondent aux appels du mod et notent ce qu'il demande. La mémoire ($.store)
// est simulée en mémoire vive par mock.store.
// =============================================================================

import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'

import { snowPinesSvg } from './scene-snow-pines'

// --- Constantes des tests ----------------------------------------------------
const con_Plugin = 'pins-sous-la-neige'
const con_Commande = 'neige'
const con_CleReglages = 'reglages'
const con_TailleMaxSvg = 131072
const con_Demarrage = { cwd: '/', surface: 'desktop', isInteractive: true } as const
const con_ReponseDessine = { value: { isDrawn: true, requestId: 'test' } } as const
const con_VerreOrigine = { blur: 0, tint: '#14143a', opacity: 0.5 } as const
/** Ce que l'application joint à une commande tapée au clavier. */
const con_OrigineClavier = { kind: 'composer' } as const
const con_Presentation = { isFullscreen: false, columns: 80 } as const

/** Thème attendu pour un verre donné. */
function fon_ThemeAttendu(var_Verre: { blur: number; tint: string; opacity: number }) {
  return { backdrop: { scene: con_Plugin, glass: var_Verre }, overrideColorScheme: 'dark' }
}

/**
 * Branche une fausse application (avec, au besoin, une mémoire déjà remplie)
 * et renvoie la liste des thèmes posés et le nombre de retraits.
 */
function fon_FausseApplication(on: On, var_Memoire?: Readonly<Record<string, unknown>>) {
  const var_Poses: unknown[] = []
  const var_Retraits: number[] = []

  mock.store(on, var_Memoire)
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('theme.set', (_, e) => {
    var_Poses.push(e)

    return con_ReponseDessine
  })
  on('theme.clear', () => {
    var_Retraits.push(1)

    return { value: { isDrawn: false, reason: 'retiré' } }
  })
  on('session.start', (_, e) => ({ cwd: e.cwd }))

  return { var_Poses, var_Retraits }
}

/** Arguments complets d'une commande /neige tapée au clavier. */
function fon_Commande(var_Arguments: string) {
  return { command: con_Commande, args: var_Arguments, origin: con_OrigineClavier, presentation: con_Presentation }
}

test('la scène respecte la taille maximale et reste du pur vectoriel', () => {
  const var_Svg = snowPinesSvg()

  expect(var_Svg.length).toBeLessThan(con_TailleMaxSvg)
  expect(var_Svg.includes('<image')).toBe(false)
})

test('au démarrage, le fond est posé sans flou', async ($, on) => {
  const { var_Poses } = fon_FausseApplication(on)

  await $.session.start(con_Demarrage)

  expect(var_Poses).toEqual([fon_ThemeAttendu(con_VerreOrigine)])
})

test('flou, voile et teinte se règlent et restent à la session suivante', async ($, on) => {
  const { var_Poses } = fon_FausseApplication(on)
  const var_VerreRegle = { blur: 8, tint: '#000000', opacity: 0.3 }

  await $.session.start(con_Demarrage)

  expect((await $.command.run(fon_Commande('flou 8'))).text).toContain('Flou réglé sur 8')
  expect((await $.command.run(fon_Commande('voile 30 %'))).text).toContain('30 %')
  expect((await $.command.run(fon_Commande('teinte #000000'))).text).toContain('#000000')
  expect(var_Poses.at(-1)).toEqual(fon_ThemeAttendu(var_VerreRegle))

  // Nouvelle session : les réglages gardés sont repris.
  await $.session.start(con_Demarrage)

  expect(var_Poses.at(-1)).toEqual(fon_ThemeAttendu(var_VerreRegle))
})

test('le voile accepte la virgule française', async ($, on) => {
  const { var_Poses } = fon_FausseApplication(on)

  await $.session.start(con_Demarrage)
  await $.command.run(fon_Commande('voile 0,25'))

  expect(var_Poses.at(-1)).toEqual(fon_ThemeAttendu({ ...con_VerreOrigine, opacity: 0.25 }))
})

test('une valeur hors bornes est refusée sans rien changer', async ($, on) => {
  const { var_Poses } = fon_FausseApplication(on)

  await $.session.start(con_Demarrage)

  const var_Reponse = await $.command.run(fon_Commande('flou 99'))

  expect(var_Reponse.text).toContain('de 0 à 64')
  expect(var_Reponse.text).toContain('Réglages inchangés')
  expect(var_Poses.length).toBe(1)

  // Nouvelle session : toujours les réglages d'origine.
  await $.session.start(con_Demarrage)

  expect(var_Poses.at(-1)).toEqual(fon_ThemeAttendu(con_VerreOrigine))
})

test('un mot inconnu est signalé', async ($, on) => {
  fon_FausseApplication(on)

  await $.session.start(con_Demarrage)

  expect((await $.command.run(fon_Commande('bonjour'))).text).toContain('Mot inconnu')
})

test('off retire le fond et le garde retiré à la session suivante', async ($, on) => {
  const { var_Poses, var_Retraits } = fon_FausseApplication(on)

  await $.session.start(con_Demarrage)
  await $.command.run(fon_Commande('off'))

  expect(var_Retraits.length).toBe(1)

  await $.session.start(con_Demarrage)

  // Un seul thème posé : celui du premier démarrage.
  expect(var_Poses.length).toBe(1)
})

test('une mémoire abîmée reprend les réglages d\'origine', async ($, on) => {
  const { var_Poses } = fon_FausseApplication(on, {
    [con_CleReglages]: { actif: true, flou: 500, teinte: 'rouge', voile: -1 },
  })

  await $.session.start(con_Demarrage)

  expect(var_Poses).toEqual([fon_ThemeAttendu(con_VerreOrigine)])
})

test('le hook Backdrop dessine la scène du mod sur desktop', async ($) => {
  const var_Vue = await $.ui.mount({
    plugin: con_Plugin,
    surface: 'desktop',
    component: 'Backdrop',
    props: { scene: con_Plugin, plugin: con_Plugin, glass: con_VerreOrigine, overrideColorScheme: 'dark' },
  })

  expect(await var_Vue.find({ type: 'Svg' })).toBeDefined()
  await var_Vue.unmount()
})
