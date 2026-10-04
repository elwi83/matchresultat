# Matchresultat

En responsiv, statisk webbplats för serietabeller, matchresultat och kommande
innebandymatcher. Projektet använder vanlig HTML, CSS och JavaScript och kräver
ingen installation eller byggprocess.

## Kör lokalt

Öppna `index.html` direkt i en webbläsare eller starta en enkel lokal webbserver:

```bash
python3 -m http.server 8000
```

Öppna sedan `http://localhost:8000`.

## Serier och matcher

Matchschemat i `match-data.js` är importerat från Excel-filen
`matcher hösten 27.xlsx`. Webbplatsen innehåller tre serier:

- Pojkar 2015 A Södra
- Pojkar 2015 B Östra
- Pojkar 2015 B Södra

Sidan `historik.html` innehåller säsongen 2025/2026 med sex serier och 233
matcher importerade från `season 25 26.xlsx`. Historiska resultat är
skrivskyddade på webbplatsen. Om datum, matchnummer eller resultat saknas i
underlaget visas detta tydligt i stället för att uppgifter antas.

Sidan `matchschema.html` samlar 25 P15-matcher och 20 P14-matcher som kolumner
och 28 spelare som rader. Ursprungliga X-markeringar är importerade från
`Segeltorp P15 .xlsx`, medan de officiella P14-matcherna kommer från
`p14.xlsx`. P15 har ljuslila bakgrund och P14 ljusgrön. Matcherna grupperas med
veckonummer och en tydlig avdelare när en ny vecka börjar. Markeringarna kan
ändras genom att klicka på en ruta och synkroniseras mellan enheter via
Supabase-tabellen `match_assignments`. Varje spelare visar totalt antal kallade
matcher samt antal i A Södra och P14 när respektive antal är större än noll.
Under spelarna finns en summeringsrad per match och därefter tränarnas schema.
En ruta växlar mellan tom, kallad (`X`) och ej tillgänglig (`–`).

Kolumnen **P14** direkt efter spelarnamnet styr om spelaren är tillgänglig för
P14. Spelare med **Ja** kan tilldelas P14-matcher. När kolumnen är tom visas
spelaren automatiskt som ej tillgänglig på samtliga P14-matcher. Spelare med
importerade P14-tilldelningar har **Ja** som ursprungsvärde.

Kolumnen **DS** mellan spelarnamnet och P14 kan växlas mellan tom, A, AB och B.
A visas ljusgrönt, AB ljuslila och B ljusblått. Raden **Fördelning A / AB / B**
under spelarantalet visar en staplad fördelning av de kallade och
DS-klassificerade spelarna för varje match.

För varje P15-match visas motståndarens aktuella placering i sin serietabell.
Placeringen beräknas från samma Supabase-resultat och sorteringsregler som
huvudsidans tabell. P14-matcher visar ingen tabellplacering.

Matcher vars starttid har passerat visas under **Resultat**. Om inget resultat
har registrerats visas texten **Resultat saknas**. Övriga matcher visas under
**Kommande**.

Klicka på ett lag i serietabellen för att visa endast det lagets matcher. Det
valda laget markeras i tabellen. Filtret tas bort genom att klicka på laget igen
eller välja **Visa alla lag** ovanför matcherna.

## Registrera resultat

Välj **Lägg till resultat** eller **Ändra resultat** på ett matchkort. Tabellen
och statistiken räknas om direkt när resultatet sparas.

Resultaten sparas i Supabase och synkroniseras därför mellan alla inloggade
enheter. Tabellen `match_results` skyddas med Row Level Security och kan endast
läsas och ändras av en autentiserad användare.

## Matchstatistik

Sektionen **Matchbild** beräknas från den valda seriens registrerade resultat
och visar:

- Matcher i hela serien med mer än 10 måls skillnad.
- Segeltorps matcher med mer än 10 måls skillnad, uppdelat på vinster och
  förluster.
- Segeltorps jämna matcher med högst 3 måls skillnad, uppdelat på vinster,
  förluster och oavgjorda.
- Segeltorps förluster med minst 4 måls skillnad.

Varje statistikruta visar även antalet träffar av totalt antal registrerade
matcher samt motsvarande procentandel. Segeltorpsrutorna räknas mot antalet
registrerade matcher där Segeltorp deltar.

## Inloggning

Inloggningen hanteras av Supabase Auth. Besökaren skriver användarnamnet
`Torpet15`, som webbplatsen kopplar till den konfigurerade Supabase-användaren.
Lösenordet verifieras av Supabase och lagras inte i projektets JavaScript-kod.
Knappen **Logga ut** avslutar Supabase-sessionen.

Projektets URL och publishable key finns i `config.js`. Den publika nyckeln är
avsedd att användas i webbläsaren; databasens Row Level Security är det som
skyddar informationen. Lägg aldrig en `service_role`-nyckel i projektet.

## Publicera med GitHub Pages

1. Skapa ett nytt repository på GitHub.
2. Ladda upp samtliga projektfiler till repositoryts rot.
3. Öppna **Settings → Pages** på GitHub.
4. Välj **Deploy from a branch**, grenen `main` och mappen `/ (root)`.
5. Spara. GitHub visar adressen när webbplatsen är publicerad.
