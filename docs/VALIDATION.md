# Ellenőrzési eredmények – 2026-10-19

## 1.1-es kiadás

- GitHub Pages-alútvonalra készülő statikus build: `/xrp-studio/`.
- Nagy Blockly-munkaterület, mellette műszerfal, generált Python és vezetés.
- Beágyazható számok/szenzorok/kifejezések; régi számmezők migrációja, leválasztott utasítások kizárása a futtatásból.
- XPP-feldolgozás töredezett/zajos/sérült csomagokkal; sorba rendezett REPL- és adatcsatorna-írások.
- A vezetés Python-programját valódi Pythonban ellenőrző teszt: a szívverés elmaradása után 700–800 ms között megállás, kivételnél végső motorleállítás.
- A helyi Pages-előnézetben a szimuláció betölt és ténylegesen végrehajtja a blokkprogramot (30 cm mozgás, távolság 141 → 111 cm).
- Magyar/angol nyelvváltás, mentés újratöltésen át, Python-oldalsáv, kapcsolat nélküli vezetésindítás letiltása és statikus osztálytermi tájékoztató ellenőrizve.

## Éles GitHub Pages

A [39245500282 számú GitHub Actions-futás](https://github.com/kobak/xrp-studio/actions/runs/39245500282) sikeresen tesztelt, buildelt és telepített. A [nyilvános oldalon](https://kobak.github.io/xrp-studio/) böngészőben ellenőrizve:

- A valódi Python-értelmező és az elkülönített worker betölt a Pages alútvonaláról, konzolhiba nélkül.
- A kezdő blokkprogram 30 cm-es mozgást hajt végre, a távolság 141-ről 111 cm-re változik.
- Magyar nyelvváltás, tanulófeladat megnyitása és négyzetprogram futtatása sikeres; visszatérés a kiindulópontra.
- A frissítések a `main` ágra küldött változtatásokból automatikusan települnek.

## Automatizált

`npm run check` sikeres: 12/12 Node-teszt, majd sikeres Vite kiadási build. A tanulóprogramos teszt a hat feladatot magyar és angol blokkbeállításokkal is lefordítja és tényleges Python/Pyodide értelmezőben futtatja.

- Osztálycsatlakozás, becenévütközés, másik tanár hozzáférésének tiltása.
- Diák nem hozhat létre osztályt vagy tanári feladatot.
- Beadás, frissített beadás, tanári visszajelzés, a másik diák beadásainak elrejtése.
- Kijelentkezés érvényteleníti a munkamenetet; idegen originből küldött írási kérés tiltott.
- Konfigurálatlan Google-belépés hibát ad, nem hamis sikert.
- Daraboltan érkező raw REPL válasz, Python-stderr és függőben lévő kérés megszakítása.
- Bluetooth UTF-8 bájtok 20 bájtos, soros darabolása.
- Tanulóprogramok, saját Python, kivétel és végtelen ciklus számítási korlátja.

A Google-hitelesítő csak a tesztfolyamatban helyettesített. Élő Google-belépés nem történt.

## Böngészőben ellenőrzött

- Kiadási build betöltése a helyi Node-szerverről.
- Magyar és angol nyelvváltás; megmaradó projekt.
- Négyzetfeladat blokkos betöltése, generált Python megtekintése, szimuláció: visszatérés a kiindulópontra, 360° összfordulás.
- Generált kód másolása a szerkesztőbe; saját Python írása és futtatása.
- Magyar, ékezetes kimenet: `Szia, XRP! Árvíztűrő.`; 20 cm virtuális mozgás után a távolság 141-ről 121 cm-re változott.
- Az elkülönített Python-worker `location.origin` értéke `null`, nem az autentikált alkalmazás originje.
- Automatikus helyi mentés és újratöltés utáni projektmegnyitás.
- Projektletöltés `.xrp.json` fájlba, majd sikeres visszaimportálás.
- 820 × 1180 képpontos tabletelrendezés vizuális ellenőrzése; végül a nézetméret visszaállítva.

## Ténylegesen nem ellenőrizhető ebben a környezetben

- Élő Google-fiókos belépés: nincs megadva Google OAuth Client ID.
- Fizikai robot: a gépen nem jelent meg XRP USB-soros eszköz.
- Valódi iPad/Bluefy és Bluetooth-rádiókapcsolat.
- A szerveres osztályterem éles domainje, TLS-e és Docker-konténeres telepítése. A statikus GitHub Pages-oldal éles működése ellenőrizve.

Az elvégzendő éles próbák a [ACCEPTANCE.md](ACCEPTANCE.md) fájlban szerepelnek. A tabletelrendezés és a protokolltesztek nem helyettesítik a fizikai eszközpróbát.
