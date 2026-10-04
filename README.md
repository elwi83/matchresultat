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
