# XRP Studio

Gyerekbarát robotprogramozó környezet 8–14 éveseknek, magyarul és angolul. A SPIKE tanulásközpontú munkafolyamata ihlette, saját megjelenéssel és XRP-kompatibilis programokkal.

**Böngészőből futtatható:** [kobak.github.io/xrp-studio](https://kobak.github.io/xrp-studio/)

## GitHub Pages és osztályterem

A fenti cím regisztráció nélkül használható blokkprogramozásra, szerkeszthető Pythonhoz, valódi Python-szimulációra, helyi projektmentésre, tanulófeladatokra és robotkapcsolatra. iPaden a Bluetooth-kapcsolathoz Web Bluetooth-képes böngésző szükséges, például Bluefy; Safari alatt a szerkesztő és a szimulátor használható.

A Google-belépéses osztályterem **szervert és saját Google OAuth-kliensazonosítót igényel**, ezért a statikus Pages-kiadásban telepítési tájékoztató jelenik meg. A teljes szerveres változat ugyanebből a kódból indítható, lásd lent. A Pages nem tárol tanári vagy tanulói fiókokat.

A `main` ágra küldött módosítások automatikusan tesztelődnek és megjelennek a Pages-oldalon a GitHub Actions segítségével.

```sh
npm run build:pages
npm run preview:pages
# http://localhost:4174/xrp-studio/
```

## Mi került át Kornél megoldásának ötleteiből?

A [kornel-j/xrpblocky](https://github.com/kornel-j/xrpblocky) inspirálta a tágas szerkesztőt, a mellette váltható műszerfal/Python/vezetés nézetet, a robotblokkokba illeszthető számításokat és az önálló Bluetooth-adatcsatorna használatát. Saját megvalósítás; az XRP protokoll forrása az [Open-STEM hivatalos firmware-je](https://github.com/Open-STEM/XRP_MicroPython).

A program a blokkjaidból valódi Pythont készít, és azt futtatja a szimulátorban. A vezetéshez friss, XPP-t támogató XRP firmware szükséges; a robotoldali figyelés 700 ms után leállítja a motorokat, ha nem változik a böngésző szívverésjele. A vezetés tengelyenként 45%-os, együttes motorerőben 60%-os korláttal működik. A szívverést, a csomagfeldolgozást és a párhuzamos Bluetooth-írások sorba rendezését tesztek fedik; fizikai roboton és Bluefy böngészőben még ellenőrizendő.

A régi projektfájlok számmezői automatikusan beágyazott számblokkokká alakulnak. A blokkparaméterek így változót, érzékelőt és számítást is fogadnak. A meglévő szerkeszthető Python, projektkönyvtár és osztálytermi szerver megmaradt. A robot `main.py` fájlját nem írjuk át; az önálló, gombbal választható robotprogramhelyek és a párhuzamos eseménykezelés ebben a verzióban nincsenek benne.

## Indítás

Node.js 22.13 vagy újabb szükséges.

```sh
npm ci
npm run dev
```

Nyisd meg: **http://localhost:4173**. A blokkprogramozás, a projektmentés, a tanulófeladatok és a Python-szimuláció Google-konfiguráció nélkül is használható.

```sh
npm test
npm run build
npm start
```

A build a Python-futtatókörnyezetet az npm-csomagból a saját webhelyre másolja. Az értelmező körülbelül 13 MB; az első szimulációkor töltődik be, nem a kezdőoldallal együtt. A saját programok a böngészőben futnak. A szerver nem hajt végre beküldött Python-kódot.

## Megvalósított funkciók

- Magyar és angol navigáció, blokkok, súgó és hat tanulókaland; nyelvváltáskor megmarad a program.
- Valódi Blockly-szerkesztő: mozgatás, illesztés, paraméterezés, ciklusok, feltételek, változók, saját függvények, visszavonás és nagyítás.
- XRPLib-re fordítás; generált Python megtekintése és külön szerkeszthető Python-változat, szintaxiskiemeléssel.
- USB Web Serial, illetve Bluetooth Nordic UART kapcsolat; MicroPython raw REPL programfeltöltés, futtatás, kimenet, leállítás és kézi szenzorlekérés.
- Minden robotfuttatás elmenti a programot `xrp_studio.py` néven a robotra; a program végén a motorokat az XRPLib `reset_hard()` leállítja.
- Szimuláció valódi CPython/Pyodide értelmezővel, egyszerűsített XRP-modellel, ütközéssel, távolság- és vonalérzékelővel, LED-del, szervóval és virtuális gombbal.
- Projektlisták, automatikus helyi mentés, projektletöltés és -import, Python-letöltés, átnevezés, megerősített törlés.
- Google Identity Services tanári belépés, szerveroldali tokenellenőrzéssel.
- Osztályok, csatlakozási kódok, diákbecenevek, kiosztott feladatok, projektbeadás, frissített beadás és tanári szöveges visszajelzés.
- Tartós SQLite-adatbázis: a tanári/osztálytermi adatok nem a böngésző helyi tárában élnek.
- Reszponzív elrendezés laptopra és tabletre; billentyűzetes párbeszédablakok és fókuszkezelés.

## Google-belépés beállítása

Saját Google OAuth-kliensazonosító nélkül nincs működő Google-belépés. A felület ezt egyértelműen jelzi, nem ad helyette álbelépést. A konfigurációhoz **nem szükséges kliens-titok vagy Google-jelszó**.

1. A [Google Cloud Console](https://console.cloud.google.com/) felületén hozz létre vagy válassz projektet.
2. A Google Auth Platform / Branding alatt add meg az alkalmazás nevét és kapcsolattartóját; az Audience alatt állítsd be, ki használhatja. Tesztüzemben add hozzá a tesztelő tanárokat, ha a Google ezt kéri.
3. Clients → Create client → **Web application**.
4. Authorized JavaScript origins: `http://localhost` és `http://localhost:4173`. Éles telepítésnél add hozzá a végleges HTTPS origint is, útvonal nélkül.
5. Másold a `.env.example` fájlt `.env` néven, és töltsd ki:

```dotenv
GOOGLE_CLIENT_ID=SAJAT_KLIENS_AZONOSITO.apps.googleusercontent.com
APP_ORIGIN=http://localhost:4173
PORT=4173
HOST=127.0.0.1
DATA_DIR=./data
```

6. Indítsd újra a szervert. Az Osztályteremben megjelenik a valódi Google-bejelentkezés gomb.

A backend ellenőrzi a Google-token aláírását, célközönségét és lejáratát a Google hivatalos könyvtárával, és ellenőrzött e-mail-fiókot követel. A tanár neve és Google `sub` azonosítója kerül az adatbázisba; a Google-token nem marad benne. Az alkalmazás nem kér Drive-, Gmail- vagy egyéb Google-hozzáférést.

[Google hivatalos konfigurációs útmutató](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid).

## Tanórai használat

1. A tanár Google-fiókkal belép, létrehoz egy osztályt, és megosztja a 10 karakteres osztálykódot.
2. A diák az Osztályteremben kóddal és egyedi becenévvel csatlakozik. Nem kell e-mail-cím.
3. A tanár szöveges feladatot adhat ki, opcionális kezdő tanulókalanddal.
4. A diák megnyitja a kezdőfeladatot vagy saját projektet készít, majd az Osztályteremben beadja az aktuális projektet.
5. A tanár megnyithatja a beadás másolatát és visszajelzést írhat. A diák a saját beadásánál látja azt.

A diákbelépés 7 napig, az adott böngészőben marad meg. Ez nem tartós diákfiók: kijelentkezés vagy sütitörlés után a korábban használt becenév nem igényelhető vissza egy másik felhasználó által. Ilyenkor új becenévvel lehet csatlakozni. Másik gépre költözés előtt töltsd le a projektet. A tanári belépés más eszközön ugyanahhoz a tanári adathoz vezet.

A feladatok teljesítése a tanuló által jelölt előrehaladás, nem automatikus értékelés. A beadások szöveges visszajelzést támogatnak, osztályzatot nem adnak.

## Valódi XRP és iPad

### Előkészítés mindkét robotváltozathoz

- XRP Beta: RP2040/Pico W; XRP Version 1: RP2350. Mindkettőhöz a saját vezérlőhöz való **XRP MicroPython firmware és XRPLib** szükséges.
- Első alkalommal laptopon nyisd meg a [hivatalos XRPCode](https://xrpcode.wpi.edu/) felületét, és végezd el a megfelelő firmware és XRPLib telepítését/frissítését.
- Az alkalmazás nem ír automatikusan firmware-t, és nem cserél vezérlőverziót.

### Laptop

- Chrome vagy Edge; USB-kapcsolathoz adatátvitelre alkalmas kábel.
- Bluetooth-hoz BLE-képes gép és megfelelően előkészített XRP.
- Web Serial / Web Bluetooth biztonságos kontextust igényel: HTTPS vagy a saját gépen `localhost`.

### iPad

- Az alkalmazás érintéssel szerkeszthető. A Safari közvetlen Web Bluetooth kapcsolata nem támogatott.
- Robotvezérléshez nyisd meg ugyanazt a **HTTPS** címet például a [Bluefy Web BLE Browser](https://apps.apple.com/us/app/bluefy-web-ble-browser/id1492822055) alkalmazásban, és ott válaszd a Bluetooth-kapcsolatot.
- A `localhost` az iPaden magát az iPadet jelenti, nem a laptopot. Iskolai használathoz telepítsd az alkalmazást HTTPS címmel.
- Iskolai eszközfelügyeletnél a szükséges Bluetooth-böngészőt az eszközökön is engedélyezni kell.

### Futtatás és leállítás

A **Kipróbálás** a virtuális robotot, a **Futtatás a roboton** a csatlakoztatott fizikai XRP-t vezérli. A valódi szenzorértékek külön lekérhetők, álló program mellett. A hardveres műveletek nincsenek szimulált sikerrel helyettesítve.

Bluetoothon az XRP firmware speciális `##XRPSTOP##` parancsa újraindítja a vezérlőt; leállítás után újra csatlakozni kell. USB-n a megszakítás után a motorvezérlők leállítása történik. A böngészőkapcsolat megszakítása önmagában nem fizikai vészleállító; a robot kapcsolója és a tanári felügyelet szükséges.

## Szimulátor és korlátai

A szimulátor a tananyaghoz használt XRPLib-részhalmazt modellezi: `straight`, `turn`, `set_effort`, `set_speed`, `arcade`, `stop`, távolság, vonalérzékelés, irányszög, LED, szervó és gomb. Támogatott a `from XRPLib.defaults import ...` és a fő eszközosztályok alapértelmezett példányainak lekérése is.

A kód előbb kiszámolja a mozgássorozatot, majd a felület lejátssza. Nem valós idejű fizikai modell: nincs kerékcsúszás, IMU-zaj, PID-dinamika, elemfeszültség, teljes külső XRPLib vagy QWIIC-eszközmodellezés. A virtuális gombot a futtatás előtt lehet beállítani. Az általános Python-szintaxis, függvények, ciklusok és kivételek tényleges Pythonban futnak. Ismeretlen hardvermodulokra érthető Python-hiba jelenik meg.

Az értelmező egy `allow-scripts` jogosultságú, **opaque origin** iframe saját Web Workerében fut. A diákok Python-kódja nem az autentikált osztályterem originjében fut; a publikus értelmezőeszközökön kívül a szerver nem enged CORS-hozzáférést. A folyamat leállításkor megszüntethető. Normál programoknál 500 000 trace-esemény / 5 másodperc számítási korlát és 1500 szimulációs parancs védi a felületet a véletlen végtelen ciklusoktól.

## Telepítés saját HTTPS címre

Az alkalmazás önálló Node-szerver. A tanári Google-belépés és az e-mail nélküli diákcsatlakozás miatt nem kötődik ChatGPT-fiókokhoz. Nincs éles hoszting vagy domain automatikusan létrehozva.

### Docker és Caddy

Szükséges: Docker Compose, a szerverre mutató saját domain, elérhető 80/443 port. A környezetben állítsd be:

```dotenv
GOOGLE_CLIENT_ID=SAJAT_KLIENS_AZONOSITO.apps.googleusercontent.com
STUDIO_DOMAIN=robot.iskola.hu
```

```sh
docker compose up -d --build
```

A mellékelt Caddy fordított proxy kezeli a TLS-t. A Google Cloudban az `https://robot.iskola.hu` origint is vedd fel. A `studio-data` volume őrzi az adatbázist; a konténer újraépítése nem törli. Az alkalmazás nem rootként fut. A Docker-konfiguráció ebben a munkamenetben nem lett tényleges konténeren futtatva.

### Saját Node-hoszt

```sh
npm ci
npm run build
NODE_ENV=production HOST=127.0.0.1 APP_ORIGIN=https://robot.iskola.hu node server/index.js
```

Tegyél elé HTTPS proxyt. Az `APP_ORIGIN` pontosan egyezzen a böngészőben használt originnel. A production munkamenetsüti csak HTTPS-en kerül elküldésre. Egy alkalmazáspéldányhoz tartós, írható SQLite-tárhely szükséges; statikus fájlhoszting önmagában nem elég az osztályteremhez.

Adatmentés: leállított szervernél mentsd a teljes `data` könyvtárat (SQLite-adatbázis és esetleges WAL-fájlok). A helyi projektek a tanulók böngészőiben vannak; ezekről projektfájl letöltésével készül mentés.

## Ellenőrzések

`npm test`: valódi Pythonban futtatott összes tanulóprogram mindkét nyelven; négyzet visszatérése; saját Python-kód; Python-hibák és végtelen ciklus korlátozása; raw REPL csomaghatárok; stderr; BLE UTF-8 darabolás; kapcsolatmegszakadás; tanári/diák jogosultságok, kódos csatlakozás, névfoglalás, beadások, frissített beadás, visszajelzés és kijelentkezés.

A szerveroldali Google-hitelesítő a tesztekben injektált tesztfüggvény, amely kizárólag a tesztfolyamatban létezik. Az alkalmazásban nincs tesztbelépés, ál-token vagy beépített tanári fiók.

Fizikai XRP-k és iPad nem álltak rendelkezésre a fejlesztés alatt. A két fizikai vezérlő, az iPades Bluetooth és az élő Google-belépés éles elfogadási próbáihoz lásd [docs/ACCEPTANCE.md](docs/ACCEPTANCE.md). A böngészős tabletelrendezés ellenőrzése nem helyettesíti az iPad hardveres próbát.

## Felépítés

`src/`: React felület, fordítások, Blockly-generátor, robotkapcsolat, szimulátorhíd. `server/`: Express API, Google-hitelesítés, SQLite-tároló. `public/`: saját Python-futtatókörnyezet és a modellezett XRPLib. `tests/`: automatizált integrációs és protokolltesztek. [Kutatási jegyzetek és források](docs/RESEARCH.md).
