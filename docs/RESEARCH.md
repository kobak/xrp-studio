# XRP-kutatás és megvalósítási döntések

Ellenőrizve: 2026-10-18. Az élő https://xrpcode.wpi.edu oldal az ellenőrzéskor XRPCode 2.1.0-t és XRPLib 2026.10.1-et jelzett. A régi XRPCode-tároló leírása önmagában ezért nem elegendő az aktuális felület megértéséhez.

## Elsődleges források

- [XRPCode V2 kézikönyv](https://xrpusersguide.readthedocs.io/es/latest/course/XRPCodeV2.html): Python, Blockly → Python, Monaco, szenzorműszerfal, USB/Bluetooth, firmware-eszközök, Google Drive.
- [XRPWeb, az aktuális szerkesztő forrása](https://github.com/Open-STEM/XRPWeb), különösen `src/connections/bluetoothconnection.ts` és `connection.ts`.
- [Korábbi XRPCode](https://github.com/Open-STEM/XRPCode): az eredeti böngészős Python/Blockly IDE.
- [XRPLib dokumentáció](https://open-stem.github.io/XRP_MicroPython/) és [XRPLib forrás](https://github.com/Open-STEM/XRP_MicroPython), különösen `defaults.py`, `differential_drive.py`, `board.py`.
- [XRP felépítése](https://xrpusersguide.readthedocs.io/es/latest/course/building.html): a Beta RP2040, a Version 1 RP2350 vezérlővel készül.
- [MicroPython REPL protokoll](https://docs.micropython.org/en/latest/reference/repl.html): raw mód, Ctrl-A/B/C/D, OK-visszajelzés és EOT-kimenet.
- [Chrome Web Serial](https://developer.chrome.com/docs/capabilities/serial) és [Web Bluetooth](https://developer.chrome.com/docs/capabilities/bluetooth).
- [Web Bluetooth implementációs státusz](https://github.com/whatwg/bluetooth/blob/main/implementation-status.md): Safari/iOS korlátok, Bluefy mint alternatív böngésző.
- [Bluefy az App Store-ban](https://apps.apple.com/us/app/bluefy-web-ble-browser/id1492822055).
- [LEGO SPIKE alkalmazás](https://education.lego.com/en-gb/teacher-resources/lego-education-spike-essential/support-technical-info/lego-education-spike-essential-support-technical-info-get-the-lego-education-spiketm-app/): ikon- és szöveges blokkos tanulási utak; Prime esetén Python is.
- [Google Identity Services konfiguráció](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid): kliensazonosító, megengedett JavaScript originek, Google-gomb, tokenellenőrzés, popup-fejlécek.

## Kommunikáció

A két vezérlőn közös XRPLib API-t használjuk. A robot kezdeti firmware-telepítését a hivatalos eszköz végzi. A kommunikáció interoperábilis protokollmegvalósítás, nem az eredeti szerkesztő teljes forkja.

A Bluetooth-kapcsolat a Nordic UART Service-t használja:

```text
Service: 6e400001-b5a3-f393-e0a9-e50e24dcca9e
Write:   6e400002-b5a3-f393-e0a9-e50e24dcca9e
Notify:  6e400003-b5a3-f393-e0a9-e50e24dcca9e
```

A firmware két további adatcharacteristicje a XPP/műszerfal külön csatornája. A jelen implementáció ezekre nem épít; a szenzorokat a közös Python API-n keresztül kérdezi le, álló program mellett. A BLE-írás 20 bájtos, egymás után megvárt darabokban történik. A stop parancs `##XRPSTOP##`; ez Bluetoothon újraindítja a vezérlőt, ezért a felület újracsatlakozást kér.

## A SPIKE-ból átvett tervezési elvek

Saját vizuális arculat; nagy, egyértelmű műveletek; kategóriánként színezett blokkok; projektek képes kártyákon; fokozatos feladatok; a kód mellett látható robotállapot; a kezdőknek releváns funkciók előtérben. A műszaki részletek kapcsolódáskor vagy súgóban jelennek meg.

A Google-fiók kizárólag a tanáré. A diák kódot és becenevet használ. A tanulási munkaterület fiók és robot nélkül is használható. Az automatikus helyi mentés és a központi beadás külön adatkezelési funkció: a helyi projekt nem kerül automatikusan a tanárhoz.

## Határok

A kész UI és az automatizált protokolltesztek nem bizonyítják a fizikai robotokkal végzett működést. A fizikai elfogadási próbák külön dokumentáltak. A szimulátor egyszerűsített oktatási modell; a teljes XRPLib és a QWIIC-bővítők szimulációja nem része ennek a verziónak.


## 2026-10-19 – xrpblocky inspiráció

Áttekintett referencia: [kornel-j/xrpblocky](https://github.com/kornel-j/xrpblocky), `d0282b180213170c66b03c93a382c0983cde6561`. Saját kód készült a munkaterületes elrendezés, beágyazható blokkparaméterek, külön Bluetooth-adatcsatorna és joystick ötlete alapján. A referencia forráskódja nem került átmásolásra.

A kommunikáció ellenőrzésének elsődleges forrásai:

- [Open-STEM Puppet/XPP](https://github.com/Open-STEM/XRP_MicroPython/blob/main/XRPLib/puppet.py): AA55/type/length/payload/55AA keretezés, little-endian számok, szabványos változóazonosítók.
- [Gamepad](https://github.com/Open-STEM/XRP_MicroPython/blob/main/XRPLib/gamepad.py): a tengelyértékek előjelének visszafordítása, X1/Y1/X2 változók.
- [Dashboard](https://github.com/Open-STEM/XRP_MicroPython/blob/main/XRPLib/dashboard.py): szenzoradatok külön adatcsatornán. Csak BLE-adatkarakterisztika esetén indul, USB stdio használatát elkerülve.
- [GitHub Pages custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages): build/test, Pages artifact és OIDC deploy.

A Google-osztályteremnek tartós háttérszerver kell; a Pages-kiadás szándékosan nem kínál látszólag működő felhős bejelentkezést.
