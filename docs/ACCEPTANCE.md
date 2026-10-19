# Éles elfogadási próba

Ezek a próbák valódi eszközt vagy Google-konfigurációt igényelnek. A fejlesztés során nem lettek elvégzettként megjelölve.

## Google és osztályterem

1. Saját kliensazonosító és helyesen felvett origin mellett jelentkezz be Google-fiókkal.
2. Hozz létre osztályt, másold a kódot, és csatlakozz hozzá másik böngészőből diákként.
3. Adj ki feladatot; a diák töltsön be kezdőprojektet, szerkesszen, adjon be, majd frissítse a beadást.
4. A tanár nyissa meg a beadást, írjon visszajelzést; az a diáknál jelenjen meg.
5. Jelentkezz be ugyanazzal a tanári Google-fiókkal másik eszközön: ugyanaz az osztály látszódjon.

## XRP Beta és XRP Version 1, külön-külön

1. A megfelelő XRP MicroPython és XRPLib telepítése a hivatalos XRPCode-dal.
2. USB csatlakozás, firmware/API próba, szenzorok lekérése.
3. 10 cm előre, 90° fordulás, LED be/ki, szervó biztonságos tartományban.
4. A `xrp_studio.py` fájl meglétének ellenőrzése a roboton.
5. Szándékos Python-hiba: jelenjen meg, a motor álljon le.
6. Folyamatos mozgás esetén Stop: a motor ténylegesen álljon le.
7. Kábel kihúzása: a felület elveszett kapcsolatot jelezzen; újracsatlakozással működjön újra.
8. Ugyanezek Bluetoothon; Stop után a dokumentált újracsatlakozással.

## iPad és Bluefy

1. Az éles HTTPS URL megnyitása Bluefyban. A Google-belépés szükség esetén az eszköz/böngésző Google-szabályai szerint engedélyezett böngészőben történjen; a gyerekek kódos belépése nem használ Google-t.
2. Blokkok húzása, illesztése, számmezők érintéses módosítása, nagyítás.
3. Magyar/angol nyelvváltás: a blokkok és a projekt tartalma maradjon meg.
4. Bluetooth eszközválasztás, programfuttatás, leállítás és újracsatlakozás mindkét roboton.
5. Saját Python-program írása és szimuláció; álló/fekvő kijelző.
6. Projektfájl letöltése a Files-ba, majd visszaimportálás.

## Telepítés

1. HTTPS és Google megengedett origin ellenőrzése, session-cookie Secure/HttpOnly/SameSite=Lax ellenőrzése.
2. Szerver vagy konténer újraindítása után az osztálytermi adatok maradjanak meg.
3. Mentés és visszaállítás a teljes SQLite-adatkönyvtárból.

A szerveroldali jogosultságok automatizált próbái a `tests/classroom.test.js` fájlban futnak. Az élő Google- és hardvertesztek nem helyettesíthetők ezekkel.
