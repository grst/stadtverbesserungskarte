# Stadtverbesserungskarte Immenstadt i. Allgäu

Eine statische Website mit einer Karte konkreter Verbesserungsvorschläge für
Immenstadt i. Allgäu. Jeder Vorschlag zeigt ein Vorher-Foto und ein Nachher-Bild
(eine KI-Bearbeitung des Vorher-Fotos), die per Schieberegler verglichen werden.

Das Projekt wird vom Ortsverband Bündnis 90/Die Grünen Immenstadt unterstützt,
ist aber eine eigenständige Website.

## Loslegen

```bash
npm install
npm run dev          # Entwicklungsserver auf http://localhost:5173
```

  | Befehl                                                               | Zweck                                                                                         |
  | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
  | `npm run dev`                                                        | Entwicklungsserver mit Hot Reload                                                             |
  | `npm run build`                                                      | Validierung, Typprüfung und Produktionsbuild nach `dist/`                                     |
  | `npm run preview`                                                    | `dist/` lokal ausliefern (http://localhost:4173)                                              |
  | `VITE_BASE=/repo/ npm run build && VITE_BASE=/repo/ npm run preview` | Deployment unter einem Unterpfad testen (`VITE_BASE` muss bei *beiden* Befehlen gesetzt sein) |
  | `npm run items`                                                      | `data/items.json` aus den Ordnern unter `data/items/` kompilieren                             |
  | `npm run validate`                                                   | `data/*.json` gegen die Schemas und Querverweise prüfen                                       |
  | `npm run licenses`                                                   | `public/licenses.txt` aus den `dependencies` neu erzeugen                                     |
  | `npm run typecheck`                                                  | TypeScript ohne Ausgabe prüfen                                                                |
  | `npm run a11y`                                                       | axe-core über alle Ansichten laufen lassen (Preview muss laufen)                              |
  | `npm run interactions`                                               | Zoomen/Verschieben per Maus, Touch und Tastatur prüfen (`npm run dev` muss laufen)            |
  | `npm run shots`                                                      | Screenshots aller Ansichten in `.tmp/screenshots/` (Preview muss laufen)                      |
  | `npm run placeholders`                                               | Platzhalterbilder aus `data/items.json` neu erzeugen                                          |

## Inhalte pflegen

Der gesamte Inhalt liegt in `data/` und `content/` -- für nichts davon muss Code
angefasst werden. Nach jeder Änderung `npm run validate` laufen lassen; derselbe
Schritt läuft auch im Build und in der GitHub-Action.

### Einen Vorschlag hinzufügen

Ein Vorschlag ist ein Ordner unter `data/items/`. Der Ordnername ist die `id`
des Vorschlags und steckt in der Adresse der Detailseite (`/vorschlag/<id>`) --
er sollte sich also nicht mehr ändern, sobald ein Link geteilt wurde.

```
data/items/<id>/
  description.md   Frontmatter mit allen Angaben + Beschreibung als Markdown
  before.jpg       Vorher-Foto, Querformat, mindestens 1370 px breit
  after.jpg        Nachher-Bild, gleicher Ausschnitt wie das Vorher-Foto
```

Die 1370 px sind kein Richtwert, sondern die Breite, auf die das Detailpanel auf
großen Bildschirmen wächst (siehe `@media (min-width: 1200px)` in
`src/styles/global.css`). Schmalere Bilder werden dort hochskaliert.

Neben den beiden Bildern kann im Ordner beliebiges Material liegen
(Originalfotos, Zwischenstände, `prompt.md` zur KI-Bearbeitung); in die Website
kommt nur, was in der `description.md` verwendet wird.

```markdown
---
title: Titel des Vorschlags
author: Name oder anonym
location:
  lat: 47.5599
  lon: 10.219
layers:
  - radverkehr
images:
  before: before.jpg
  after: after.jpg
  beforeAlt: Beschreibung der heutigen Situation für Screenreader.
  afterAlt: Beschreibung der vorgeschlagenen Verbesserung.
  copyright: "Vorname Nachname, Nachher-Bild: KI-Bearbeitung des Fotos"
---

Fließtext als Markdown. Absätze mit einer Leerzeile trennen, Überschriften,
Listen, Links und weitere Bilder sind erlaubt:

![Bildbeschreibung](weiteres-bild.jpg)
```

Alle Bildpfade -- im Frontmatter wie im Text -- sind relativ zur
`description.md`. Die beiden `*Alt`-Texte sind Pflicht: ohne sie ist ein
Bildvergleich für Menschen, die die Bilder nicht sehen können, wertlos.
`copyright` ist ebenfalls Pflicht und erscheint unter dem Vergleich; das Zeichen
© stellt die App voran.

Koordinaten lassen sich in [OpenStreetMap](https://www.openstreetmap.org/) per
Rechtsklick → „Adresse anzeigen" ablesen.

Aus den Ordnern wird `data/items.json` kompiliert -- **diese Datei nicht von
Hand bearbeiten**, sie wird bei jedem Speichern im laufenden `npm run dev`, bei
`npm run items` und im Build überschrieben. `npm run validate` meldet, wenn sie
nicht mehr zu den Ordnern passt. Dasselbe gilt für
`src/data/itemImages.generated.ts`: dort importiert der Kompilierschritt jedes
verwendete Bild einzeln, damit Vite genau diese Bilder in den Build übernimmt.

Ein Ordner ohne `description.md` wird übersprungen (mit Hinweis in der Konsole) --
so kann Material für einen Vorschlag schon im Repository liegen, bevor der
Vorschlag fertig ist. Ein Ordner mit unvollständiger `description.md` bricht die
Kompilierung dagegen ab und meldet Feld für Feld, was fehlt.

### Radverbindungen bewerten

`data/ortsteile-graph.json` enthält die 15 Immenstädter Ortsteile als Knoten,
dazu die angrenzenden Nachbarorte (Niedersonthofen, Oberdorf, Untermaiselstein,
Blaichach, Thalkirchdorf, Missen), damit auch die Verbindungen aus dem
Stadtgebiet heraus bewertet werden können. Kanten sind die Verbindungen zwischen
benachbarten Orten. Für jede Kante das Feld `safety` setzen:

  | Wert        | Darstellung in der Karte                         | Wort an der Linie |
  | ----------- | ------------------------------------------------ | ----------------- |
  | `"safe"`    | grün, durchgezogen                               | „Sicher“          |
  | `"medium"`  | orange, gestrichelt                              | „Mittel“          |
  | `"unsafe"`  | rot, gepunktet                                   | „Unsicher“        |
  | `"unknown"` | grau, dünn – Ausgangswert, „noch nicht bewertet“ | „Unbewertet“      |

Optional lässt sich pro Kante eine kurze Begründung in `note` hinterlegen; sie
erscheint, wenn man in der Karte auf die Verbindung klickt.

Alle Kanten starten als `"unknown"`. Die Bewertung wird dreifach kodiert -- über
Farbe, Strichmuster *und* das Wort an der Linie --, damit sie nicht allein von
der Farbe abhängt.

Das Wort steht ab Zoomstufe 12 direkt auf der Verbindung, und zwar nur dort, wo
es hineinpasst: ist die Linie kürzer als der Text, bleibt sie unbeschriftet
(`overflow: false` in `edgeLabelStyle`, `src/map/styles.ts`). Ortsnamen haben
Vorrang -- Beschriftungen und Ortsnamen werden in derselben Declutter-Gruppe
`'graph'` entzerrt, und die Ortsnamen liegen höher im Ebenenstapel. Weil damit
nie *alle* Verbindungen beschriftet sind und weit herausgezoomt gar keine, bleibt
die Erklärkarte oben rechts in der Karte (`src/components/GraphLegend.tsx`) die
tragende Erklärung: sie sagt, was Punkte und Linien bedeuten, und nennt die
Anzahl der Verbindungen je Bewertung. Die Zahlen kommen aus `safetyCounts`
(`src/data/content.ts`) und werden aus den Daten gerechnet -- beim Bewerten ist
dort nichts nachzupflegen.

Neue Ortsteile oder Verbindungen einfach ergänzen; `npm run validate` meldet
Kanten mit unbekannten Knoten, Dubletten (auch in umgekehrter Richtung) und
Knoten ohne Kante.

Läuft eine Verbindung über einen Punkt, der selbst kein Ort ist -- ein Abzweig,
ein Kreisverkehr --, bekommt dieser Punkt einen eigenen Knoten mit
`"kind": "junction"`. Die Verbindung wird dort geteilt, sodass sich ihre
Abschnitte getrennt bewerten lassen. Solche Knoten zeichnet die Karte als
kleinen grauen Punkt ohne Beschriftung; ihr Name erscheint nur im Popup der
angrenzenden Verbindungen. Ortsknoten brauchen das Feld nicht, `"place"` ist der
Standard.

### Eine Ebene hinzufügen

1. Eintrag in `data/layers.json` ergänzen (`id`, `label`, `icon`, `color`,
   `description`).
2. Dieselbe `id` in die `layers`-Enum in `data/items.schema.json` aufnehmen.
   `npm run validate` schlägt fehl, wenn beide Dateien auseinanderlaufen.
3. Falls ein neues Icon gebraucht wird: Pfad in `src/components/Icon.tsx`
   ergänzen. Ohne passenden Schlüssel wird ein Standard-Pin verwendet.

### Textseiten

Die Dateien in `content/` sind Markdown und werden beim Build zu den Textseiten
kompiliert: `info.md` → `/info`, `idee-einreichen.md` → `/idee-einreichen`,
`impressum.md` → `/impressum`, `datenschutz.md` → `/datenschutz`. Absolute Links
im Text (`/info`, `/licenses.txt`) beziehen sich auf die App-Wurzel;
`MarkdownPage` setzt den Basispfad davor, damit sie auch unter `VITE_BASE`
stimmen.

## Aufbau

```
data/
  items/<id>/  je ein Vorschlag: description.md und seine Bilder
  items.json   daraus kompiliert (erzeugt), dazu die JSON Schemas
content/    Markdown der Textseiten
public/     Favicon, licenses.txt (erzeugt)
src/
  components/  Oberfläche
  data/        Inhalte laden, Markdown rendern
  map/         OpenLayers – Kartenaufbau, Ebenen, Stile
  pages/       Kartenseite, 404
  state/       aktive Ebenen, Auswahl, Hover
  styles/      Design-Tokens und globales CSS
scripts/    Kompilierung, Validierung, Build-Nacharbeiten, Prüfwerkzeuge
```

Technik: Vite, React, TypeScript, OpenLayers mit `ol-mapbox-style` (Karte,
Vektorkacheln von OpenFreeMap),
`img-comparison-slider` (Vorher/Nachher), `@radix-ui/react-dialog` (Menü auf
schmalen Viewports), `marked` + `DOMPurify` (Markdown), `yaml` (Frontmatter),
`ajv` (Validierung). Die Karte wird in `src/map/mapController.ts` außerhalb von
React aufgebaut und von React nur ferngesteuert.

`scripts/build-items.mjs` kompiliert die Vorschlagsordner; die `vite.config.ts`
ruft dasselbe Skript beim Start und bei jeder Änderung unter `data/items/` auf.
Bilder werden nicht kopiert: sie bleiben in ihrem Ordner und kommen über die
Importe in `src/data/itemImages.generated.ts` mit Hash im Dateinamen in den
Build.

Die Basiskarte sind Vektorkacheln von [OpenFreeMap](https://openfreemap.org)
(Stil „Bright"), angewendet über `ol-mapbox-style`. Vorher lagen dort die
Rasterkacheln von openstreetmap.org; die gibt es nur mit 256 px und ohne
Hidpi-Variante (`@2x` beantwortet der Server mit 400), auf Telefonen wurden sie
also zwei- bis dreifach hochskaliert und sahen matschig aus. OpenFreeMap
braucht wie openstreetmap.org keinen API-Schlüssel. Eine Eigenheit von
`ol-mapbox-style`: Es kann die Glyphen des Kartenstils nicht verwenden und lädt
Beschriftungsschriften stattdessen ungefragt als Webfont von cdn.jsdelivr.net
nach. `useSystemFonts()` in `src/map/mapController.ts` ersetzt die
Schriftfamilie deshalb vor dem Anwenden durch das generische `sans-serif` --
generische Familien lädt die Bibliothek nicht nach, und die Seite bleibt ohne
externe Schriftarten (so steht es auch in der Datenschutzerklärung).

Liegen Pins zu dicht beieinander, fasst `ol/source/Cluster` sie zu einer Blase
mit der Anzahl zusammen; ein Klick darauf zoomt auf die enthaltenen Vorschläge,
bis sie einzeln stehen. Die Schwellen dafür sind `CLUSTER_DISTANCE` und
`CLUSTER_MIN_DISTANCE` (Pixel) in `src/map/mapController.ts`. Eine Blase trägt
die Farbe ihrer Ebene, bei gemischten Ebenen ein neutrales Grau.

Das Explore-Panel (`src/components/ExploreSheet.tsx`) ist bewusst selbst gebaut.
Die verbreiteten Sheet-Bibliotheken modellieren *modale, schließbare* Dialoge;
`vaul` setzt über Radix' Dialog `aria-hidden="true"` auf den gesamten Rest der
Seite, was bei einem dauerhaft sichtbaren Panel die komplette Seite für
Screenreader unsichtbar macht. Die Begründung steht als Kommentar in der Datei.

## Barrierefreiheit

- Die Karte ist ein Canvas und damit nur begrenzt bedienbar. Als gleichwertige
  Alternative gibt es die **Listenansicht** („Als Liste anzeigen") mit allen
  gefilterten Vorschlägen.
- Auf der Karte selbst funktionieren die Tastaturinteraktionen von OpenLayers:
  Pfeiltasten verschieben, `+` und `-` zoomen. Dafür trägt der Kartencontainer
  ein `tabindex`. Weil OpenLayers seine Standardinteraktionen mit
  `onFocusOnly: true` anlegt, würden Mausrad und Ziehen damit erst nach einem
  Klick in die Karte reagieren -- `src/map/mapController.ts` setzt deshalb
  ausdrücklich `onFocusOnly: false`. `npm run interactions` prüft das. Auf der
  Karte gehört das Wischen bzw. Scrollen also der Karte. Genau deshalb ist die
  Fußzeile schmal und dauerhaft sichtbar: `--footer-h` wird aus der Höhe von
  `.map-section` herausgerechnet, sodass Impressum und Datenschutz ohne Scrollen
  erreichbar bleiben (§ 5 DDG: „ständig verfügbar"). Wer `--footer-h` ändert,
  muss nichts weiter anpassen -- wer die Fußzeile höher macht als das Token
  angibt, schiebt sie unter die Falz.
- Der Vorher/Nachher-Regler ist mit den Pfeiltasten bedienbar und meldet seinen
  Wert als ARIA-Slider.
- Der Titel-Tooltip am Pin ist eine reine Mausfunktion
  (`(hover: hover) and (pointer: fine)`, siehe `src/map/mapController.ts`) und
  deshalb `aria-hidden`. Dieselben Titel stehen im Explore-Panel und in der
  Listenansicht, wo sie mit Tastatur und Screenreader erreichbar sind.
- Der Griff des Explore-Panels ist ein Button: Klick schaltet eine Stufe weiter,
  Pfeil auf/ab, `Home` und `End` steuern die Größe direkt.
- Bewertungen und Zustände sind nie nur über Farbe kodiert.
- `npm run a11y` prüft alle Ansichten mit axe-core gegen WCAG 2.2 AA.
- Die Links in der Fußzeile sind 24 px hoch statt `--touch-target` (44 px). 24
  px erfüllen WCAG 2.2 AA (2.5.8 *Target Size (Minimum)*); die 44 px aus 2.5.5
  sind AAA und hätten die Zeile so hoch gemacht, dass sie der Karte spürbar
  Platz nimmt.

## Urheber- und Lizenzhinweise

Wer wo genannt werden muss -- und warum das nicht alles in die Fußzeile gehört:

- **OpenStreetMap** (Kartendaten, ODbL) verlangt einen sichtbaren Vermerk,
  **OpenFreeMap** und **OpenMapTiles** (Kachelauslieferung und Kachelschema)
  ebenfalls. Alle drei stehen im Vermerk, den die Kachelquelle selbst mitliefert
  und den OpenLayers in die Kartenecke setzt: `attributionOptions` in
  `src/map/mapController.ts` steht auf `collapsible: false`, damit
  „OpenFreeMap © OpenMapTiles Data from OpenStreetMap" dauerhaft und nicht
  eingeklappt zu sehen ist, verlinkt auf `openstreetmap.org/copyright`. In der
  Fußzeile stand derselbe Vermerk doppelt; er ist dort entfernt.
- **OpenLayers** steht unter BSD-2-Clause. Die Lizenz fordert *keinen*
  sichtbaren Hinweis in der Oberfläche, wohl aber, dass Copyright-Vermerk und
  Lizenztext mit der Weitergabe mitgeliefert werden. Vite minifiziert die
  Lizenzkommentare aus dem Bundle heraus, deshalb erzeugt `scripts/licenses.mjs`
  die Datei `public/licenses.txt` mit den Vermerken aller `dependencies`
  (transitiv). Das Impressum verlinkt sie. `npm run build` ruft das Skript mit
  auf, die Datei ist also nie veraltet.
- **Fotos** gehören den Einsendenden und sind pro Vorschlag im Frontmatter
  genannt; die „Nachher"-Bilder sind als KI-Bearbeitung ausgewiesen (in
  `src/components/BeforeAfter.tsx` am Bild selbst, nicht nur auf `/info`).

## Deployment

`.github/workflows/deploy.yml` baut bei jedem Push auf `main` und veröffentlicht
auf GitHub Pages. Einmalig in den Repository-Einstellungen unter *Pages* als
Quelle **GitHub Actions** auswählen.

Der Basispfad wird automatisch aus der Pages-Konfiguration abgeleitet, eine
Projektseite unter `/<repo>/` funktioniert also ohne Zutun. Da GitHub Pages
keine Rewrites kann, kopiert `scripts/postbuild.mjs` die `index.html` zusätzlich
nach `404.html` -- so funktionieren Deeplinks wie `/vorschlag/<id>` auch nach
einem Reload.
