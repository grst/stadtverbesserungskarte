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

| Befehl | Zweck |
| --- | --- |
| `npm run dev` | Entwicklungsserver mit Hot Reload |
| `npm run build` | Validierung, Typprüfung und Produktionsbuild nach `dist/` |
| `npm run preview` | `dist/` lokal ausliefern (http://localhost:4173) |
| `VITE_BASE=/repo/ npm run build && VITE_BASE=/repo/ npm run preview` | Deployment unter einem Unterpfad testen (`VITE_BASE` muss bei *beiden* Befehlen gesetzt sein) |
| `npm run validate` | `data/*.json` gegen die Schemas und Querverweise prüfen |
| `npm run typecheck` | TypeScript ohne Ausgabe prüfen |
| `npm run a11y` | axe-core über alle Ansichten laufen lassen (Preview muss laufen) |
| `npm run interactions` | Zoomen/Verschieben per Maus, Touch und Tastatur prüfen (`npm run dev` muss laufen) |
| `npm run shots` | Screenshots aller Ansichten in `.tmp/screenshots/` (Preview muss laufen) |
| `npm run placeholders` | Platzhalterbilder aus `data/items.json` neu erzeugen |

## Inhalte pflegen

Der gesamte Inhalt liegt in `data/` und `content/` – für nichts davon muss
Code angefasst werden. Nach jeder Änderung `npm run validate` laufen lassen;
derselbe Schritt läuft auch im Build und in der GitHub-Action.

### Einen Vorschlag hinzufügen

1. Beide Bilder nach `public/images/items/` legen, benannt
   `<id>-before.jpg` und `<id>-after.jpg`. Querformat, etwa 1600 × 1000 px.
2. In `data/items.json` einen Eintrag ergänzen:

   ```json
   {
     "id": "kurze-kennung-mit-bindestrichen",
     "title": "Titel des Vorschlags",
     "location": { "lat": 47.5599, "lon": 10.219 },
     "layers": ["radverkehr"],
     "images": {
       "before": "images/items/kurze-kennung-mit-bindestrichen-before.jpg",
       "after": "images/items/kurze-kennung-mit-bindestrichen-after.jpg",
       "beforeAlt": "Beschreibung der heutigen Situation für Screenreader.",
       "afterAlt": "Beschreibung der vorgeschlagenen Verbesserung."
     },
     "description": "Fließtext. Absätze mit einer Leerzeile trennen.",
     "author": "Name oder \"anonym\""
   }
   ```

Die `id` steckt in der Adresse der Detailseite (`/vorschlag/<id>`) – sie sollte
sich also nicht mehr ändern, sobald ein Link geteilt wurde. Die beiden
`*Alt`-Texte sind Pflicht: ohne sie ist ein Bildvergleich für Menschen, die die
Bilder nicht sehen können, wertlos.

Koordinaten lassen sich in [OpenStreetMap](https://www.openstreetmap.org/)
per Rechtsklick → „Adresse anzeigen“ ablesen.

### Radverbindungen bewerten

`data/ortsteile-graph.json` enthält die 14 Immenstädter Ortsteile als Knoten und
die Verbindungen zwischen benachbarten Ortsteilen als Kanten. Für jede Kante das
Feld `safety` setzen:

| Wert | Darstellung in der Karte |
| --- | --- |
| `"safe"` | grün, durchgezogen |
| `"medium"` | orange, gestrichelt |
| `"unsafe"` | rot, gepunktet |
| `"unknown"` | grau, dünn – Ausgangswert, „noch nicht bewertet“ |

Optional lässt sich pro Kante eine kurze Begründung in `note` hinterlegen; sie
erscheint, wenn man in der Karte auf die Verbindung klickt.

Alle Kanten starten als `"unknown"`. Die Bewertung wird doppelt kodiert – über
Farbe *und* Strichmuster –, damit sie nicht allein von der Farbe abhängt.

Neue Ortsteile oder Verbindungen einfach ergänzen; `npm run validate` meldet
Kanten mit unbekannten Knoten, Dubletten (auch in umgekehrter Richtung) und
Knoten ohne Kante.

### Eine Ebene hinzufügen

1. Eintrag in `data/layers.json` ergänzen (`id`, `label`, `icon`, `color`,
   `description`).
2. Dieselbe `id` in die `layers`-Enum in `data/items.schema.json` aufnehmen.
   `npm run validate` schlägt fehl, wenn beide Dateien auseinanderlaufen.
3. Falls ein neues Icon gebraucht wird: Pfad in `src/components/Icon.tsx`
   ergänzen. Ohne passenden Schlüssel wird ein Standard-Pin verwendet.

### Textseiten

`content/info.md` und `content/idee-einreichen.md` sind Markdown und werden beim
Build in die Seiten `/info` und `/idee-einreichen` kompiliert. Aktuell enthalten
beide Platzhaltertext.

## Aufbau

```
data/       Inhalte und JSON Schemas
content/    Markdown der Textseiten
public/     statische Bilder, Favicon
src/
  components/  Oberfläche
  map/         OpenLayers – Kartenaufbau, Ebenen, Stile
  pages/       Kartenseite, 404
  state/       aktive Ebenen, Auswahl, Hover
  styles/      Design-Tokens und globales CSS
scripts/    Validierung, Build-Nacharbeiten, Prüfwerkzeuge
```

Technik: Vite, React, TypeScript, OpenLayers (Karte, OpenStreetMap-Kacheln),
`img-comparison-slider` (Vorher/Nachher), `@radix-ui/react-dialog` (Menü auf
schmalen Viewports), `marked` + `DOMPurify` (Markdown), `ajv` (Validierung).
Die Karte wird in `src/map/mapController.ts` außerhalb von React aufgebaut und
von React nur ferngesteuert.

Liegen Pins zu dicht beieinander, fasst `ol/source/Cluster` sie zu einer Blase
mit der Anzahl zusammen; ein Klick darauf zoomt auf die enthaltenen Vorschläge,
bis sie einzeln stehen. Die Schwellen dafür sind `CLUSTER_DISTANCE` und
`CLUSTER_MIN_DISTANCE` (Pixel) in `src/map/mapController.ts`. Eine Blase trägt
die Farbe ihrer Ebene, bei gemischten Ebenen ein neutrales Grau.

Das Explore-Panel (`src/components/ExploreSheet.tsx`) ist bewusst selbst
gebaut. Die verbreiteten Sheet-Bibliotheken modellieren *modale, schließbare*
Dialoge; `vaul` setzt über Radix' Dialog `aria-hidden="true"` auf den gesamten
Rest der Seite, was bei einem dauerhaft sichtbaren Panel die komplette Seite
für Screenreader unsichtbar macht. Die Begründung steht als Kommentar in der
Datei.

## Barrierefreiheit

* Die Karte ist ein Canvas und damit nur begrenzt bedienbar. Als
  gleichwertige Alternative gibt es die **Listenansicht** („Als Liste
  anzeigen“) mit allen gefilterten Vorschlägen.
* Auf der Karte selbst funktionieren die Tastaturinteraktionen von OpenLayers:
  Pfeiltasten verschieben, `+` und `-` zoomen. Dafür trägt der Kartencontainer
  ein `tabindex`. Weil OpenLayers seine Standardinteraktionen mit
  `onFocusOnly: true` anlegt, würden Mausrad und Ziehen damit erst nach einem
  Klick in die Karte reagieren – `src/map/mapController.ts` setzt deshalb
  ausdrücklich `onFocusOnly: false`. `npm run interactions` prüft das.
  Auf der Karte gehört das Wischen bzw. Scrollen also der Karte; die Seite
  selbst scrollt über Kopf- und Chipleiste bis zur Fußzeile.
* Der Vorher/Nachher-Regler ist mit den Pfeiltasten bedienbar und meldet seinen
  Wert als ARIA-Slider.
* Der Griff des Explore-Panels ist ein Button: Klick schaltet eine Stufe weiter,
  Pfeil auf/ab, `Home` und `End` steuern die Größe direkt.
* Bewertungen und Zustände sind nie nur über Farbe kodiert.
* `npm run a11y` prüft alle Ansichten mit axe-core gegen WCAG 2.2 AA.

## Deployment

`.github/workflows/deploy.yml` baut bei jedem Push auf `main` und
veröffentlicht auf GitHub Pages. Einmalig in den Repository-Einstellungen unter
*Pages* als Quelle **GitHub Actions** auswählen.

Der Basispfad wird automatisch aus der Pages-Konfiguration abgeleitet, eine
Projektseite unter `/<repo>/` funktioniert also ohne Zutun. Da GitHub Pages
keine Rewrites kann, kopiert `scripts/postbuild.mjs` die `index.html` zusätzlich
nach `404.html` – so funktionieren Deeplinks wie `/vorschlag/<id>` auch nach
einem Reload.

## Offene Punkte

* **Impressum**: Der Link in der Fußzeile führt noch nirgendwohin. Eine
  öffentlich zugängliche Website in Deutschland braucht ein Impressum, bevor
  sie live geht.
* Alle Radverbindungen sind noch mit `"unknown"` bewertet.
* Die Bilder sind Platzhalter-SVGs, ebenso die Texte in `content/`.
