# claude-mods : les mods Claude Code de Kugan

Catalogue de mods pour [Claude Code](https://claude.com/claude-code), surtout pour l'application desktop.

## Mods

| Mod | Description |
| --- | --- |
| [pins-sous-la-neige](pins-sous-la-neige/) | Fond animé « Snow Pines » (forêt de pins en ASCII sous la neige, au crépuscule) derrière la conversation, **sans flou**, réglable avec `/neige`. |

## Installation

À l'invite d'une session Claude Code lancée dans un terminal :

```
/plugin install pins-sous-la-neige --marketplace Kugan-33/claude-mods
```

Réponds `y` pour ajouter le catalogue, puis choisis la portée (utilisateur en premier).

Depuis un shell :

```
claude plugin install pins-sous-la-neige --marketplace Kugan-33/claude-mods
```

Dans l'application desktop, où `/plugin` ne fonctionne pas : clique sur **+** à côté de la zone de saisie, puis **Plugins**, **Add marketplace** avec `Kugan-33/claude-mods`, puis **Add plugin**.

Un mod installé depuis un terminal avec la portée utilisateur se charge aussi dans les sessions de l'application desktop.

## English

Claude Code mods by Kugan. `pins-sous-la-neige` draws the animated *Snow Pines* backdrop (taken unchanged from Anthropic's official `theme-examples` plugin, Apache 2.0) behind the conversation in the desktop app, with **no blur** on the frosted panels by default. Tune it with `/neige flou <0-64>`, `/neige voile <0-1>`, `/neige teinte <#hex>`, `/neige on` or `/neige off`, and `/neige defaut`. Install it with the lines above.

## Licence

Apache 2.0 (voir `LICENSE`). La scène Snow Pines vient du plugin officiel [theme-examples](https://github.com/anthropics/claude-plugins-official/tree/main/plugins/theme-examples) d'Anthropic, reprise sans modification.
