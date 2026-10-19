export const lessons = [
  {
    id: "first",
    icon: "🚀",
    color: "#e8e8ff",
    minutes: 10,
    level: "beginner",
    hu: {
      title: "Szia, robot!",
      desc: "Ismerkedj meg az XRP-vel, és indulj el vele.",
      steps: [
        "Csatlakoztasd a robotot, vagy nyisd meg a gyakorlópályát.",
        "Tegyél egy „menj előre” blokkot az indulás alá.",
        "Állítsd a távolságot 30 centiméterre, majd futtasd a programot.",
      ],
      challenge: "Menj előre 30 cm-t, várj egy másodpercet, majd gyere vissza!",
      hint: "Negatív távolsággal a robot hátrafelé halad.",
    },
    en: {
      title: "Hello, robot!",
      desc: "Meet your XRP and take your first drive.",
      steps: [
        "Connect your robot or open the playground.",
        "Add a “drive” block below the start block.",
        "Set the distance to 30 centimetres, then run your program.",
      ],
      challenge: "Drive forward 30 cm, wait one second, then come back!",
      hint: "A negative distance makes your robot reverse.",
    },
    blocks: [["xrp_drive", { DIST: 30, SPEED: 50 }]],
  },
  {
    id: "square",
    icon: "🔷",
    color: "#def4f4",
    minutes: 15,
    level: "beginner",
    hu: {
      title: "Rajzolj négyzetet!",
      desc: "Fordulók és ismétlések egyetlen programban.",
      steps: [
        "Menj előre 40 centimétert.",
        "Fordulj balra 90 fokot.",
        "Tedd a két blokkot egy négyszeres ismétlésbe.",
      ],
      challenge:
        "Rajzolj egy négyzetet, majd alakítsd háromszöggé a programot!",
      hint: "Egy szabályos háromszögnél a külső fordulószög 120°.",
    },
    en: {
      title: "Make a square!",
      desc: "Discover turns and loops in one program.",
      steps: [
        "Drive forward 40 centimetres.",
        "Turn left by 90 degrees.",
        "Put both blocks inside a repeat loop set to four.",
      ],
      challenge: "Drive a square, then change your program to make a triangle!",
      hint: "The outside turning angle of an equilateral triangle is 120°.",
    },
    repeat: 4,
    blocks: [
      ["xrp_drive", { DIST: 40, SPEED: 50 }],
      ["xrp_turn", { ANGLE: 90, SPEED: 50 }],
    ],
  },
  {
    id: "distance",
    icon: "👀",
    color: "#fff0d6",
    minutes: 15,
    level: "beginner",
    hu: {
      title: "Látlak, akadály!",
      desc: "Figyeld a távolságot, és hozz döntéseket.",
      steps: [
        "Olvasd le a távolságot az Érzékelők panelen.",
        "Írass ki egy távolságértéket az Üzenetek közé.",
        "Próbálj ki egy feltételt: ha az akadály 25 cm-nél közelebb van, fordulj el.",
      ],
      challenge:
        "Készíts programot, amely kis lépésekben közelít, és megáll az akadály előtt!",
      hint: "Az érzékelő centiméterben mér. Ismétlésben ellenőrizd az értéket.",
    },
    en: {
      title: "Obstacle ahead!",
      desc: "Measure distance and make decisions.",
      steps: [
        "Read the distance in the Sensors panel.",
        "Print a distance reading to Messages.",
        "Try a condition: if the obstacle is closer than 25 cm, turn away.",
      ],
      challenge: "Approach in small steps and stop before the obstacle!",
      hint: "The sensor measures centimetres. Check it again inside a loop.",
    },
    blocks: [["xrp_print_distance", {}]],
  },
  {
    id: "dance",
    icon: "🎵",
    color: "#ffe5ef",
    minutes: 15,
    level: "beginner",
    hu: {
      title: "Robottánc",
      desc: "Mozgás, fény és a saját koreográfiád.",
      steps: [
        "Kapcsold fel a robot LED-jét.",
        "Váltogasd a jobbra és balra fordulást.",
        "Tegyél várakozásokat a lépések közé.",
      ],
      challenge:
        "Tervezz ismétlődő táncot, amely a végén lekapcsolja a LED-et!",
      hint: "A várakozás másodpercben adható meg, például 0,5 másodperc.",
    },
    en: {
      title: "Robot dance",
      desc: "Movement, lights, and your own choreography.",
      steps: [
        "Turn on your robot’s LED.",
        "Alternate right and left turns.",
        "Add pauses between the moves.",
      ],
      challenge: "Create a repeating dance that ends by switching the LED off!",
      hint: "Wait times are in seconds. Try a half-second pause.",
    },
    blocks: [
      ["xrp_led", { STATE: "1" }],
      ["xrp_turn", { ANGLE: 45, SPEED: 40 }],
      ["xrp_wait", { SECONDS: 0.5 }],
      ["xrp_turn", { ANGLE: -45, SPEED: 40 }],
    ],
  },
  {
    id: "line",
    icon: "🛤️",
    color: "#e9f1d7",
    minutes: 25,
    level: "intermediate",
    hu: {
      title: "Kövesd a vonalat!",
      desc: "Két érzékelő, egy okos döntés.",
      steps: [
        "Vizsgáld meg a bal és jobb vonalérzékelőt sötét és világos felületen.",
        "Hasonlítsd össze az értékeiket egy feltételben.",
        "Az eltérés alapján állíts különböző teljesítményt a két motoron.",
      ],
      challenge:
        "Kövesd a fekete vonalat lassú sebességgel, folyamatos ellenőrzéssel!",
      hint: "A robot valódi érzékelőit előbb kalibráld. A gyakorlópályán a fekete sáv alacsony értéket ad.",
    },
    en: {
      title: "Follow the line!",
      desc: "Two sensors and one clever decision.",
      steps: [
        "Compare the left and right line sensors on dark and light surfaces.",
        "Compare their values inside a condition.",
        "Use different motor efforts to steer towards the line.",
      ],
      challenge:
        "Follow a black line slowly, checking your sensors repeatedly!",
      hint: "Calibrate your real sensors first. In the playground, the black strip gives low readings.",
    },
    blocks: [
      ["xrp_effort", { LEFT: 25, RIGHT: 25 }],
      ["xrp_wait", { SECONDS: 1 }],
      ["xrp_stop", {}],
    ],
  },
  {
    id: "python",
    icon: "🐍",
    color: "#e6edff",
    minutes: 20,
    level: "intermediate",
    hu: {
      title: "Helló, Python!",
      desc: "Nézz a blokkok mögé, és írj saját kódot.",
      steps: [
        "Nyisd meg egy korábbi blokkprogramodat.",
        "Válts Pythonra, majd másold át a generált kódot a szerkesztőbe.",
        "Módosítsd a ciklus ismétlésszámát, és próbáld ki.",
      ],
      challenge:
        "Írj egy függvényt, amely egy megadott méretű négyzetet jár be!",
      hint: "Használd a def utasítást, és adj a függvénynek egy méret paramétert.",
    },
    en: {
      title: "Hello, Python!",
      desc: "Look behind the blocks and write your own code.",
      steps: [
        "Open one of your block programs.",
        "Switch to Python and copy the generated code to the editor.",
        "Change the loop count and try your code.",
      ],
      challenge:
        "Write a function that drives a square with a chosen side length!",
      hint: "Use def and give your function a size parameter.",
    },
    repeat: 4,
    blocks: [
      ["xrp_drive", { DIST: 30, SPEED: 50 }],
      ["xrp_turn", { ANGLE: 90, SPEED: 50 }],
    ],
  },
];
