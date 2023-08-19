const KURSE = {};
const SCHUELER = [];
const PLAENE = [];
const DATEN = [];

let nPlaene, maxVersuche;
let FERTIG = 0;
let AKTUALISIEREN = 1000; // nach jedem ...-ten Durchlauf wird die Progressbar aktualisiert

const FS = [];

const maxProKurs = 25; // hat ein Kurs mehr als ... Schueler, gibt es Punktabzug
const minProKurs = 15; // hat ein Kurs weniger als ... Schueler, gibt es Punktabzug

const namenStattIndex = true;

const $ = (id) => document.getElementById(id);

function Exe(daten) {
  Start();

  Fremdsprachen(daten);
  DatenLesen(daten);
  SchuelerDaten();
  KurseZaehlen();
  Generieren();
}

function Start() {
  console.log("Stundenpläne werden generiert");
  console.time("fertig in");
}

function Ende(versuche) {
  console.timeEnd("fertig in");
  console.log(`fertig in ${versuche} Versuchen`);
  console.log("mögliche Stundenpläne:");
  console.log(PLAENE);
  console.log("bester Stundenplan:");
  console.log(PLAENE[0]);
}

function DatenImportieren() {
  const [datei] = $("daten-input").files;
  let daten;
  const fr = new FileReader();
  fr.addEventListener(
    "load",
    () => {
      daten = fr.result;
      Exe(daten);
    },
    false
  );
  if (datei) daten = fr.readAsText(datei);
}

function Fremdsprachen(d) {
  const fss = [];
  const zeilen = d.split("\n");
  for (const z of zeilen) {
    let fs = z.split(";")[5];
    if (fs != undefined) {
      fs = fs.f();
      if (fs.length > 0 && fs != "En".f() && !fss.includes(fs)) fss.push(fs);
    }
  }
  for (let fs of fss) FS.push(fs);
}

function DatenLesen(d) {
  const zeilen = d.split("\n");
  if ($("tabellenkopf-inp").checked) zeilen.splice(0, 1);
  for (const z of zeilen) {
    const text = z.split(";");
    const gk = [];
    text.forEach((elem, i) =>
      i >= 2 ? (text[i] = elem.replace("\r", "").f()) : 187
    );
    for (let i = 4; i < text.length; i++) {
      if (text[i] == "En") {
        text[i] = "En3";
        for (const fs of FS) if (text.includes(fs)) text[i] = "En2";
      }
      if (text[i].length > 0) gk.push(text[i]);
    }
    const s = {
      name: [text[0], text[1]],
      LK: [text[2], text[3]],
      GK: gk,
    };
    if (gk.length > 0) DATEN.push(s);
  }
}

function SchuelerDaten() {
  for (let i = 0; i < DATEN.length; i++)
    SCHUELER.push(new Schueler(i, DATEN[i]));
}

function KurseZaehlen() {
  let kurse = [];
  for (const s of SCHUELER) {
    for (const gk of s.kurswahl.GK) {
      const name = `${gk}-GK`;
      if (kurse[name] == undefined) kurse[name] = 0;
      kurse[name]++;
    }
    for (const lk of s.kurswahl.LK) {
      const name = `${lk}-LK`;
      if (kurse[name] == undefined) kurse[name] = 0;
      kurse[name]++;
    }
  }

  for (const kurs in kurse) {
    const num = Math.ceil(kurse[kurs] / maxProKurs);

    if (num == 1) {
      KURSE[kurs] = { anzahl: kurse[kurs], schueler: [] };
    } else {
      let anzahl = kurse[kurs] / num;
      for (let i = 1; i <= num; i++) {
        let anz = Math.floor(anzahl);
        if (i <= kurse[kurs] - num * Math.floor(kurse[kurs] / num)) anz++;
        KURSE[`${kurs.substring(0, kurs.length - 1)}${i}`] = {
          anzahl: anz,
          schueler: [],
        };
      }
    }
  }
}

function KurseGleichzeitig() {
  const DeMaLK = KURSE.findKeys("De-L", "Ma-L");
  const DeMaGK = KURSE.findKeys("De-G", "Ma-G");
  const Sp = KURSE.findKeys("Sp");

  let LK2 = KURSE.findKeys("-L");
  for (let i = LK2.length - 1; i >= 0; i--)
    if (LK2[i].includes("Ma") || LK2[i].includes("De")) LK2.splice(i, 1);

  let FSn = KURSE.findKeys("En3");
  for (const fs of FS) FSn = FSn.concat(KURSE.findKeys(`${fs}-G`));

  return [DeMaLK, DeMaGK, LK2, FSn, Sp];
}

function SchuelerGZzuordnen(gz) {
  for (const kurs of gz) {
    const schuelerGemischt = SCHUELER.copy().shuffle();
    for (const s of schuelerGemischt) {
      const GL = kurs[kurs.indexOf("-") + 1]; // G_ oder L_ ?

      let schuelerInKurs = false;
      for (const k of s.gzkurse)
        if (
          kurs.substring(0, kurs.indexOf("-") + 2) ==
          k.substring(0, kurs.indexOf("-") + 2)
        )
          schuelerInKurs = true;

      if (
        KURSE[kurs].schueler.length < KURSE[kurs].anzahl &&
        !schuelerInKurs &&
        s.kurswahl[`${GL}K`].includes(kurs.split("-")[0])
      ) {
        KURSE[kurs].schueler.push(s.i);
        s.gzkurse.push(kurs);
      }
    }
  }
}

function SchuelerMoeglicheKurse(gz) {
  for (const s of SCHUELER) {
    for (const ks of s.kurswahl.GK) {
      s.mgl_.push([]);
      for (const kk in KURSE)
        if (kk.includes(`${ks}-G`) && !gz.includes(kk))
          s.mgl_[s.mgl_.length - 1].push(kk);

      if (s.mgl_[s.mgl_.length - 1].length == 0)
        s.mgl_.splice(s.mgl_.length - 1, 1);
    }
  }
}

function SchuelerKurseZurueck() {
  for (const s of SCHUELER) s.restkurse = [];
}

function SchwierigeKurse(gz) {
  let kurse = [];
  for (const k in KURSE) if (k.includes("-G") && !gz.includes(k)) kurse.push(k);
  return kurse;
}

function KurseNachAltSortieren(kurse) {
  let Ksortiert = {}; // Kurse ("Geo-G2")
  let Fsortiert = {};
  let faecher = {}; // { Ge: 3, Yog: 1 }

  for (const k of kurse) {
    const fach = k.split("-")[0];
    if (!(fach in faecher)) faecher[fach] = 1;
    else faecher[fach]++;
  }

  faecher = faecher.sort();

  for (const f in faecher)
    if (typeof faecher[f] == "number")
      if (faecher[f] in Fsortiert) Fsortiert[faecher[f]].push(f);
      else Fsortiert[faecher[f]] = [f];

  for (const n in Fsortiert)
    if (typeof Fsortiert[n] == "object")
      for (const f of Fsortiert[n])
        for (const k in KURSE) {
          if (!(n in Ksortiert)) Ksortiert[n] = [];
          if (k.includes(`${f}-G`)) Ksortiert[n].push(k);
        }

  return Ksortiert;
}

function KurseMischen(kurse) {
  let kMisch = [];

  for (const n in kurse) {
    if (typeof kurse[n] == "object") {
      kurse[n].shuffle();
      kMisch = kMisch.concat(kurse[n]);
    }
  }

  return kMisch;
}

function DurchschnittProKurs(kurse) {
  let summe = 0;
  for (const k of kurse) summe += KURSE[k].anzahl;
  return summe / kurse.length;
}

function PlanGenerieren(kurse, nBloecke, kurseProBlock) {
  let plan = [];

  for (let i = 0; i < nBloecke; i++) plan.push([]);

  for (let j = 0; j < kurseProBlock; j++) {
    for (let i = 0; i < nBloecke; i++) {
      const index = nBloecke * j + i;
      if (index < kurse.length) plan[i].push(kurse[index]);
    }
  }

  return plan;
}

function PlanTesten(plan) {
  for (const s of SCHUELER) if (!s.klapptPlan(plan)) return [false, s.i];
  return [true, "GAR NICHT! ES KLAPPT! :)"];
}

function SchuelerInKurse() {
  for (const K in KURSE) KURSE[K].schueler = [];

  for (const s of SCHUELER) {
    s.kurse = s.gzkurse.concat(s.restkurse);
    for (const k of s.kurse)
      if (!KURSE[k].schueler.includes(s.i)) KURSE[k].schueler.push(s.i);
  }
}

function NamenStattIndex() {
  for (const k in KURSE)
    for (let i = 0; i < KURSE[k].schueler.length; i++) {
      const s = SCHUELER[KURSE[k].schueler[i]];
      KURSE[k].schueler[i] = `${s.fname}, ${s.vname}`;
    }
}

function FreistundenZaehlen(plan) {
  plan.forEach((block, i) => {
    let freiSchueler = [];
    for (const s of SCHUELER) {
      let hatFrei = true;
      for (const kurs of block) if (s.kurse.includes(kurs)) hatFrei = false;
      if (hatFrei) freiSchueler.push(s.i);
      // if (hatFrei) freiSchueler.push([s.fname, s.vname]);
    }
    plan[i] = { unterricht: block, freistunden: freiSchueler };
  });
  return plan;
}

function Bewerten(plan) {
  let bewertung = 1000;

  for (const k in KURSE)
    if (typeof KURSE[k] == "object" && k.includes("-G")) {
      const anz = KURSE[k].schueler.length;
      if (anz < minProKurs && anz != KURSE[k].anzahl)
        bewertung -= Math.abs(anz - minProKurs);
      else if (anz > maxProKurs && anz != KURSE[k].anzahl)
        bewertung -= Math.abs(anz - maxProKurs);
    }

  const wochenstunden = 33;
  const gzstunden = 5 + 5 + 4 + 3 + 2; // LK1, LK2, DeMaGK, En3/FS2, Sp
  const freistunden =
    -100 * (wochenstunden - gzstunden - (plan.length - 5) * 2);
  bewertung -= freistunden;

  return bewertung;
}

function NachBewertungSortieren() {
  PLAENE.sort((a, b) => b.bewertung - a.bewertung);
}

function KurseKopieren() {
  let kurse = {};
  for (const k in KURSE)
    if (typeof KURSE[k] == "object")
      kurse[k] = {
        anzahl: KURSE[k].anzahl,
        schueler: KURSE[k].schueler.copy(),
      };
  return kurse;
}

function StundenplaeneSchueler() {
  for (const s of SCHUELER) s.stundenplan(PLAENE[0]);
}

function csvDaten(nr) {
  const zeilen = [];
  const plan = PLAENE[nr - 1].plan;
  console.log(plan);

  for (const block of plan) {
    const zeile = block.unterricht.copy();
    zeile.push(block.freistunden.length);
    zeilen.push(zeile);
  }

  zeilen.push([]);

  const kurse = PLAENE[nr - 1].kurse;
  let kurseSortiert = [];
  for (const kurs in kurse)
    if (kurse.hasOwnProperty(kurs)) kurseSortiert.push(kurs);
  kurseSortiert.sort();

  zeilen.push(kurseSortiert);
  const kurseIndex = zeilen.length;

  let meisteSchueler = 0;
  for (const kurs in kurse)
    if (kurse[kurs].schueler.length > meisteSchueler)
      meisteSchueler = kurse[kurs].schueler.length;
  for (let i = 0; i < meisteSchueler; i++) zeilen.push([]);

  for (let k = 0; k < kurseSortiert.length; k++) {
    const kurs = kurseSortiert[k];
    for (let i = 0; i < kurse[kurs].schueler.length; i++)
      zeilen[kurseIndex + i][k] =
        kurse[kurs].schueler[i] + (namenStattIndex ? "" : 1);
  }

  return zeilen;
}

function Ausgabe() {
  const nr = $("herunterladen-input").value;
  const daten = csvDaten(nr);

  const zeilen = [];
  for (const z of daten) zeilen.push(z.join(";"));

  const inhalt = zeilen.join("\n");

  const a = document.createElement("a");
  const bom = new Uint8Array([0xef, 0xbb, 0xbf]);
  const datei = new Blob([bom, inhalt], { type: "text/csv;charset=utf-8;" });
  a.href = URL.createObjectURL(datei);
  a.download = `kursplan-nr-${nr}.csv`;
  a.click();

  return inhalt;
}

function NaechstesProzent() {
  FERTIG = Math.floor((100 * PLAENE.length) / nPlaene);
  console.log(`${FERTIG}% fertig`);
  $("prog").innerHTML = `${FERTIG}%`;
  $("prog-bar").style.setProperty("--prog", FERTIG / 100);
}

function Generieren() {
  nPlaene = $("anzahl-inp").value;
  maxVersuche = 1000 * nPlaene;

  let plan = [];

  // Welche Kurse finden gleichzeitig statt?
  const gz = KurseGleichzeitig();
  plan = plan.concat(gz);
  let gz1dim = [];
  for (const gruppe of gz) gz1dim = gz1dim.concat(gruppe);

  // Schueler werden in GZ-Kurse einsortiert
  SchuelerGZzuordnen(gz1dim);

  // fuer restliche GK werden fuer jeden Schueler alle moeglichen Kurse gesucht
  SchuelerMoeglicheKurse(gz1dim);

  // Liste aller Kurse, die fuer uns relevant sind (Ge, Ku, Ch, ..., nicht Ma, De, Sp, FS)
  let kurse = SchwierigeKurse(gz1dim);

  // Kurse nach Anzahl an Alternativen sortieren (bspw. Ast-GK vor Ge-G1/2/3)
  kurse = KurseNachAltSortieren(kurse);

  let schwierig, kurseProBlock;

  let klappt = false;
  let versuche = 0;

  function Versuch() {
    // kurse = []
    SchuelerKurseZurueck();

    // Kurse mit gleich vielen Alternativen mischen
    let Kmisch = KurseMischen(kurse);

    // Wie viele Kurse finden immer gleichzeitig statt?
    if (versuche == 0)
      kurseProBlock = SCHUELER.length / DurchschnittProKurs(Kmisch);
    //let nBloecke =
    //  Math.floor(Kmisch.length / kurseProBlock) -
    //  1 +
    //  Math.floor(Math.random() * 5); // random?
    let nBloecke =
      12 - SCHUELER[0].gzkurse.length + Math.floor(Math.random() * 2);

    // Teil vom Plan der schwierig ist
    schwierig = PlanGenerieren(Kmisch, nBloecke, kurseProBlock);

    // Testen, ob Plan fuer alle SCHUELER moeglich ist
    [klappt, gescheitert] = PlanTesten(schwierig);

    versuche++;

    if (klappt) {
      p = plan.concat(schwierig);
      SchuelerInKurse();
      if (namenStattIndex) NamenStattIndex();
      p = FreistundenZaehlen(p);
      PLAENE.push({ plan: p, bewertung: Bewerten(p), kurse: KurseKopieren() });

      if (Math.floor((100 * PLAENE.length) / nPlaene) > FERTIG)
        NaechstesProzent();
    }

    if (PLAENE.length < nPlaene && versuche < maxVersuche) {
      if (versuche % AKTUALISIEREN == 0) setTimeout(Versuch, 0);
      else Versuch();
    } else {
      NachBewertungSortieren();
      StundenplaeneSchueler();

      Ende(versuche);
    }
  }

  Versuch();
}

function BeispielHerunterladen() {
  const inhalt =
    "Nachname;Vorname;LK 1;LK 2;De-GK / Ma-GK;FS-GK (3 Std/W);FS-GK (2 Std/W);Ku-GK / Mu-GK;Ge-GK / WK;Geo-GK / WK;GRW-GK / WK;Bio-GK / WK;Ch-GK / WK;Ph-GK / WK;Eth-GK / Rel-GK;Sp-GK\nMustermann;Max;ma;ph;de;en;;mu;ge;geo;ast;inf;ch;;eth;sp\nMusterfrau;Erika;de;ge;ma;en;fr;ku;;yog;grw;bio;;ph;rel;sp";
  const a = document.createElement("a");
  const bom = new Uint8Array([0xef, 0xbb, 0xbf]);
  const datei = new Blob([bom, inhalt], { type: "text/csv;charset=utf-8;" });
  a.href = URL.createObjectURL(datei);
  a.download = `beispiel.csv`;
  a.click();
}

class Schueler {
  constructor(i, daten) {
    this.i = i;
    this.fname = daten.name[0];
    this.vname = daten.name[1];
    this.kurswahl = {
      LK: daten.LK,
      GK: daten.GK,
    };
    this.gzkurse = [];
    this.restkurse = [];
    this.kurse = [];
    this.mgl_ = [];
    this.mgl = [];
  }

  moeglichWiederherstellen() {
    let i = 0;
    this.mgl = [];
    for (const gruppe of this.mgl_) {
      this.mgl.push([]);
      for (const kurs of gruppe) {
        this.mgl[i].push(kurs);
      }
      i++;
    }
  }

  klapptPlan(plan) {
    this.moeglichWiederherstellen();

    // wenn es ein Fach gibt, fuer das nur noch ein Kurs uebrig bleibt
    let n = 0;
    let entropie = 1;
    while (this.mgl.length > 0) {
      // console.log("---");
      for (const fach of this.mgl) {
        if (fach.length == 0) return false;
        else if (fach.length == entropie) {
          // console.log("vorher:");
          // for (const m of this.mgl_) console.log(m);
          this.kurseAnpassen(plan, fach);
          // console.log("nachher:");
          // for (const m of this.mgl_) console.log(m);
          entropie = 0;
        }
      }

      entropie++;
      n++;
    }

    return true;
  }

  kurseAnpassen(plan, fach) {
    const kurs = fach.random();

    // dann kurs hinzufuegen und
    this.restkurse.push(kurs);
    // aus mgl entfernen und
    this.mgl.splice(this.mgl.indexOf(fach), 1);

    // alle Kurse die gleichzeitig im Block stattfinden aus mgl entfernen
    // jeden Block angucken
    for (const block of plan) {
      // relevanter Block ist der, der den Kurs enthaelt
      if (block.includes(kurs)) {
        // alle anderen faecher des Blocks durchgehen
        for (const k of block) {
          if (kurs != k) {
            // gucken, ob kurs in mgl ist --> entfernen
            for (const gruppe of this.mgl) {
              if (gruppe.includes(k)) {
                gruppe.splice(gruppe.indexOf(k), 1);
              }
            }
          }
        }
      }
    }
  }

  kurseVonPlan(plan) {
    this.kurse = [];
    for (const k in plan.kurse)
      for (const s of plan.kurse[k].schueler)
        if (s[0] == this.fname && s[1] == this.vname) this.kurse.push(k);
  }

  stundenplan(plan) {
    this.plan = [];
    this.kurseVonPlan(plan);
    for (const block of plan.plan) {
      let unterricht = "Freistunde";
      for (const k of this.kurse) {
        if (block.unterricht.includes(k)) unterricht = k;
      }
      this.plan.push(unterricht);
    }
    return this.plan;
  }
}

Array.prototype.random = function () {
  return this[Math.floor(Math.random() * this.length)];
};
Array.prototype.remove = function (item) {
  this.splice(this.indexOf(item), 1);
};
Array.prototype.copy = function () {
  let arr = [];
  for (const elem of this) arr.push(elem);
  return arr;
};
Array.prototype.shuffle = function () {
  for (let i = this.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = this[i];
    this[i] = this[j];
    this[j] = temp;
  }
  return this;
};

Object.prototype.copy = function () {
  let obj = {};
  for (const item in this) obj[item] = this[item];
  return obj;
};
Object.prototype.findKeys = function () {
  let matches = [];
  for (const item in this) {
    for (let i = 0; i < arguments.length; i++) {
      if (item.includes(arguments[i])) matches.push(item);
    }
  }
  return matches;
};
Object.prototype.sort = function (dir = 1) {
  let newObj = {};
  let sortable = [];
  for (const item in this)
    if (typeof this[item] == "number") sortable.push([item, this[item]]);
  sortable.sort((a, b) => (dir == 1 ? a[1] - b[1] : b[1] - a[1]));
  for (const pair of sortable) newObj[pair[0]] = pair[1];
  return newObj;
};

String.prototype.f = function () {
  return this.charAt(0).toUpperCase() + this.toLowerCase().slice(1);
};

$("daten-input").addEventListener("change", () => {
  $("ausgewaehlt").innerHTML = $("daten-input").files[0].name;
});
$("beispiel").addEventListener("click", BeispielHerunterladen);
$("tabellenkopf-inp").addEventListener("change", () => {
  $("tabellenkopf-ja-nein").innerHTML = $("tabellenkopf-inp").checked
    ? "Die Tabelle enthält einen Tabellenkopf."
    : "Die Tabelle enthält keinen Tabellenkopf.";
});
