# Pins sous la neige

Mod Claude Code pour l'application desktop : une forêt de pins en ASCII sous la neige, au crépuscule, animée derrière la conversation.

La scène est celle de **Snow Pines**, reprise sans modification du plugin officiel [theme-examples](https://github.com/anthropics/claude-plugins-official/tree/main/plugins/theme-examples) d'Anthropic (licence Apache 2.0, voir `LICENSE`). La différence : le « verre dépoli » que l'application pose sur ses panneaux est réglable, et **n'a aucun flou par défaut**. La scène reste donc nette derrière la conversation, sous un voile bleu nuit qui garde le texte lisible.

## Installation

À l'invite d'une session Claude Code lancée dans un terminal :

```
/plugin install pins-sous-la-neige --marketplace Kugan-33/claude-mods
```

Depuis un shell : `claude plugin install pins-sous-la-neige --marketplace Kugan-33/claude-mods`.

Dans l'application desktop : **+** à côté de la zone de saisie, **Plugins**, **Add marketplace** avec `Kugan-33/claude-mods`, puis **Add plugin**.

## Commande

| Commande | Effet |
| --- | --- |
| `/neige` | Affiche les réglages actuels et l'aide |
| `/neige on` / `/neige off` | Affiche ou retire le fond (gardé pour les sessions suivantes) |
| `/neige flou 0` à `64` | Flou du verre en points (0 = scène nette) |
| `/neige voile 0,5` ou `50 %` | Opacité du voile teinté (0 à 1) |
| `/neige teinte #14143a` | Couleur du voile (`#rgb` ou `#rrggbb`) |
| `/neige defaut` | Réglages d'origine : flou 0, voile 50 %, teinte `#14143a` |

Les mots sont acceptés avec ou sans accents, et quelques synonymes anglais marchent aussi (`blur`, `opacity`, `tint`, `reset`).

## Options

- **commande** : nom de la commande (sans la barre oblique), `neige` par défaut. Réglable dans les options du plugin (`pluginConfigs` de `settings.json`).

## Bon à savoir

- Un seul thème s'affiche à la fois par session. Si un autre mod de fond est actif (par exemple `theme-examples`), retire son thème (`/custom-theme off`) pour éviter qu'ils se remplacent.
- `/neige off` efface le thème de la session, quel que soit le mod qui l'a posé.
- La scène est faite pour une fenêtre sombre : le mod impose le mode sombre tant qu'il est affiché.
- Si le système demande de réduire les animations, la scène reste immobile.

## Fichiers

- `hooks/register.tsx` : le mod (hooks, commande, réglages).
- `hooks/scene-snow-pines.ts` : la scène d'origine, inchangée sous son en-tête d'attribution.
- `hooks/register.test.tsx` : les tests (`claude plugin test <dossier>`).
