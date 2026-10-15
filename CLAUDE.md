# Team Builder — passaggio a Claude Code

Documento di partenza per continuare lo sviluppo. Contiene il contesto, le decisioni già prese, lo stato del codice, i risultati della simulazione e il piano di lavoro per l'MVP.

> Consiglio: copia questo file nella radice del repository come `CLAUDE.md`, così Claude Code lo legge automaticamente a ogni sessione.

---

## 1. Contesto

**Team Builder** è una web app (in inglese) che stima il livello calcistico di ogni giocatore e genera squadre equilibrate per **calcetto a 5 e a 7**, mostrandole come una formazione con carte e overall in stile videogioco.

- **Owner:** Lorenzo. Competenze di programmazione basse: il codice lo scrive Claude Code; Lorenzo crea gli account, testa con il gruppo e fa piccole modifiche guidate.
- **Primo utilizzo:** un gruppo di amici di circa 50 persone, 10–14 presenti a partita, nuovi ingressi nel tempo.
- **Secondo obiettivo:** progetto da portfolio. Codice pulito, testato, multi-gruppo fin dall'inizio.
- **Nome:** "Team Builder" (provvisorio). Non usare "FUT", né loghi, grafiche o design delle carte di EA/FIFA: le carte devono avere un design originale.

### Come lavorare con Lorenzo

- Spiega in parole semplici cosa stai per fare e cosa deve fare lui (account, variabili d'ambiente, click nelle dashboard), un passo alla volta.
- Preferisce modifiche mirate a riscritture complete, e vuole che i testi restino nella sua voce.
- Prima di azioni irreversibili (cancellare dati, migrazioni distruttive, deploy in produzione) chiedi conferma.
- Il motore (`engine/`) deve restare coperto da test: ogni modifica alle formule va accompagnata da un test.

---

## 2. Decisioni prese

| Tema | Decisione |
| --- | --- |
| Piattaforma | Web app installabile (PWA), niente store per ora |
| Lingua dell'app | Inglese |
| Gruppi | Un utente può stare in più gruppi; **rating separato per gruppo** |
| Ruoli | Owner (crea il gruppo, nomina admin), Admin, Player |
| Valutazione | Nessun voto reciproco tra giocatori |
| Correzione manuale dei rating | **No** |
| Login | Google **e** link via email (magic link) |
| Risultato | Lo inserisce chi ha giocato (o un admin); diventa definitivo quando lo **conferma un giocatore della squadra avversaria o un admin**. Un risultato inserito da un admin è subito definitivo. Se contestato, decide un admin. I rating si aggiornano solo con risultato confermato. |
| Ruoli in campo | Contano poco: ogni giocatore indica le posizioni preferite, usate per vincoli leggeri e per disporre le carte |
| Stile grafico delle carte | Rinviato |

### Decisioni ancora aperte

- [x] **Metodo di rating** (vedi §4): **confermato da Lorenzo il 15/10/2026: ricalcolo da tutto lo storico** (`estimateRatings`).
- [ ] Numero dispari di presenti: una squadra con un giocatore in più, o un giocatore che ruota tra le due.
- [ ] Calo di affidabilità del rating per chi è inattivo da mesi (seconda fase).
- [ ] Ospiti senza account: come collegare il profilo ospite a un account creato dopo.

---

## 3. Stato del codice

```
team-builder/             ← C:\Users\meklo\dev\team-builder (fuori da OneDrive)
├── CLAUDE.md             ← questo file
├── AGENTS.md             ← regole di Next.js per gli agenti (generato da Next, non toccare)
├── package.json          ← script: dev, build, lint, test, sim, sim:extra
├── src/
│   ├── app/              ← app Next.js 16 (App Router), Tailwind 4
│   └── lib/engine/
│       ├── engine.ts     ← motore: overall, rating, bilanciamento, posizioni (funzioni pure, nessun I/O)
│       └── engine.test.ts← 11 test, tutti verdi
└── sim/
    ├── simulate.ts       ← simulatore: popolazione con livello vero nascosto + partite
    ├── extra.ts          ← esperimenti aggiuntivi (parametri, questionario poco affidabile)
    ├── results.json      ← risultati su 30 gruppi simulati
    └── extra.json
```

Richiede **Node ≥ 22.6** (motore e simulatore girano con `--experimental-strip-types`, senza dipendenze). Comandi:

```bash
npm run dev         # app in locale su http://localhost:3000
npm run build       # build di produzione (fa anche il controllo dei tipi)
npm test            # test del motore (~0,3 s)
npm run sim         # simulazione completa (~5 min)
npm run sim:extra   # esperimenti aggiuntivi (~3 min)
```

Il motore è in `src/lib/engine/`. L'app lo importa con `@/lib/engine/engine`; test e simulatore usano import con estensione `.ts` (abilitati da `allowImportingTsExtensions` in `tsconfig.json`).

### Cosa fa il motore (`engine/engine.ts`)

**Overall di partenza dal questionario** — `initialOverall(profile)`

```
B = (0,45·E + 0,25·F + 0,30·A) · k_età      arrotondato, limitato a 40–92
```

- **E (esperienza):** mai tesserato 30, amatoriale 50, settore giovanile 65, dilettanti 80, Eccellenza+ 92; poi −10 con 0–2 anni di pratica, −3 con 3–5, 0 con 6–10, +3 oltre 10.
- **F (frequenza):** <1 al mese 35, 1–3 al mese 55, 1 a settimana 70, 2+ a settimana 85.
- **A (attributi):** media dei 6 attributi autovalutati (Pace, Shooting, Passing, Dribbling, Defending, Physical, scala 1–5) → 30 + 15·(media − 1).
- **k età:** ≤30 → 1,00; 31–35 → 0,97; 36–40 → 0,93; 41–45 → 0,88; >45 → 0,82.
- Il massimo raggiungibile in pratica è 91.

**Attributi sulla carta** — `cardAttributes(overall, attrs)`: `attr_i = OVR + 6·(a_i − media)`, limitati a 30–99. Si spostano insieme all'overall.

**Forma del momento** (1–5, chiesta a ogni partita): `μ_eff = μ + 2·(forma − 3)`, vale solo per quella partita.

**Probabilità di vittoria** — `winProbability(sA, sB)`: `1 / (1 + 10^(−(sA − sB)/15))`, dove la forza di una squadra è la media dei μ_eff.

**Rating** — due metodi implementati (vedi §4 per quale usare):
- `updateAfterMatch(...)`: Elo a squadre con incertezza σ (metodo della specifica originale).
- `estimateRatings(prior, history)`: **ricalcolo da tutto lo storico** (regressione ridge sulla differenza reti, con il questionario come punto di partenza). Parametri in `DEFAULT_BATCH` (`tau` = 6).

**Bilanciamento** — `balanceTeams(players, opts)`: prova **tutte** le divisioni (126 a 5, 1.716 a 7, ~15 ms) e restituisce le **3 migliori diverse tra loro** (ognuna sposta almeno 2 giocatori rispetto alle altre), con probabilità di vittoria. Penalità:
- differenza di forza media (termine principale);
- +10 se ci sono ≥2 portieri e una squadra non ne ha;
- +1,5 per ogni squadra senza difensori o senza attaccanti tra le preferenze;
- +0,2 per ogni coppia di compagni già insieme nella partita precedente (varietà);
- vincoli rigidi dell'admin: `together` / `apart`.

Richiede un numero pari di giocatori (lancia un errore altrimenti: vedi decisione aperta sul dispari).

**Posizioni** — `assignPositions(team, format)`: sceglie tra i moduli 1-2-2 / 1-1-2-1 (a 5) e 1-3-2-1 / 1-2-3-1 (a 7) quello che lascia meno giocatori fuori ruolo. In porta va chi preferisce il ruolo, poi chi ha "porta a turno ok", altrimenti il rating più basso.

---

## 4. Risultati della simulazione

Simulati **30 gruppi** da 50 giocatori, 200 partite ciascuno (in media ~46 partite giocate a testa). Ogni giocatore ha un **livello vero nascosto**; l'app vede solo il questionario (con tendenza a sopravvalutarsi) e i risultati. I gol seguono il livello vero del giorno più il caso (Poisson).

### Squadre: quanto sono equilibrate

Scarto medio di livello vero tra le due squadre, partite 121–200 (punti di overall, più basso è meglio):

| Metodo | Scarto | La favorita vince circa |
| --- | --- | --- |
| Squadre casuali | 5,90 | 71% |
| Solo questionario (rating mai aggiornato) | 2,82 | 61% |
| Elo della specifica (K=4, σ ×0,93) | 2,82 | 61% |
| Elo a passi piccoli (K=2, σ ×0,90) | 2,45 | 59% |
| **Ricalcolo da tutto lo storico** | **2,43** | **59%** |
| Livello vero (limite teorico, irraggiungibile) | 0,10 | 50% |

### Rating: quanto si avvicinano al livello vero

Distanza media tra rating e livello vero (al netto di uno spostamento uguale per tutti), per partite giocate:

| Partite giocate | 0 | 15 | 40 | 60 |
| --- | --- | --- | --- | --- |
| Elo della specifica (K=4) | 4,43 | 4,94 | 4,62 | 4,55 |
| Elo a passi piccoli (K=2) | 4,43 | 4,19 | 3,67 | 3,42 |
| Ricalcolo da tutto lo storico | 4,43 | 4,19 | 3,75 | 3,34 |

### Cosa significa

1. **Il valore principale dell'app è il bilanciamento con il questionario**: dimezza lo scarto rispetto a squadre casuali.
2. **Imparare dai risultati è lento.** In calcetto un risultato dice poco sul singolo: i gol hanno molta casualità e ognuno è 1/5 o 1/7 della squadra.
3. **L'Elo della specifica (K=4) non migliora nulla**: aggiunge a ogni partita quasi tanto rumore quanto errore toglie.
4. **Il passo giusto per l'Elo dipende da quanto è affidabile il questionario**, che non conosciamo. Con un questionario molto meno affidabile (scenario testato: errore iniziale ~8,4 invece di 4,4), K=4 diventa migliore di K=2:

   | Scarto partite 121–200, questionario poco affidabile | |
   | --- | --- |
   | Solo questionario | 4,92 |
   | Elo K=4 | 3,80 |
   | Elo K=2 | 4,07 |
   | Ricalcolo da tutto lo storico | 3,89 |

5. **Raccomandazione: usare il ricalcolo da tutto lo storico** (`estimateRatings`). È vicino al migliore in entrambi gli scenari, perché pesa da solo questionario e risultati. In più, se un risultato viene corretto dopo una contestazione, basta ricalcolare. Costo: un sistema 50×50 per gruppo, ~1 ms. **Da confermare con Lorenzo.**
6. Anche con squadre perfette circa il **16%** delle partite finisce con 5+ gol di scarto (contro il 27% con squadre casuali): è il caso, non un difetto.

### Conseguenze sulla specifica (se si adotta il ricalcolo)

- Dopo ogni risultato **confermato**: si ricalcolano i rating di tutto il gruppo con `estimateRatings(prior, history)`, dove `prior` = overall del questionario di ciascuno e `history` = tutte le partite confermate del gruppo.
- La σ e la tabella delle variazioni della specifica non servono più. Il badge "provisional" diventa semplicemente: **meno di 10 partite giocate** (proposta).
- Se un giocatore modifica il questionario, cambia il suo `prior` e si ricalcola.
- `kappa` e `goalVar` in `DEFAULT_BATCH` vengono dal modello simulato. Con abbastanza partite reali si possono stimare dai dati (seconda fase).

---

## 5. Specifica dell'MVP

### Stack

| Componente | Scelta |
| --- | --- |
| App | Next.js (App Router, TypeScript), installabile come PWA |
| Stile | Tailwind CSS |
| Database e login | Supabase: Postgres, Auth (Google + magic link), Row Level Security |
| Hosting | Vercel, deploy automatico da GitHub |
| Motore | `engine/engine.ts`, importato dall'app, con i suoi test |
| Immagine da condividere | PNG della formazione generata lato server (es. `next/og`) o lato client |

Account da creare (li crea Lorenzo, guidato passo passo): GitHub, Supabase, Vercel; credenziali OAuth Google per il login. Le chiavi vanno solo nelle variabili d'ambiente, mai nel codice.

### Utenti, gruppi e permessi

- Ingresso in un gruppo tramite **link d'invito** (`invite_code`), poi compilazione del profilo.
- **Ospiti:** un admin può aggiungere un giocatore senza account (nome + livello stimato). Se poi si registra, il profilo ospite si collega al suo account.

| Azione | Owner | Admin | Player |
| --- | --- | --- | --- |
| Compilare e modificare il proprio profilo | sì | sì | sì |
| Segnarsi a una partita e indicare la forma | sì | sì | sì |
| Creare una partita e generare le squadre | sì | sì | no |
| Inserire il risultato | sì | sì | sì, se ha giocato |
| Confermare il risultato | sì | sì | sì, se ha giocato nella squadra avversaria |
| Aggiungere ospiti e invitare persone | sì | sì | no |
| Nominare o rimuovere admin, eliminare il gruppo | sì | no | no |

I permessi vanno applicati **nel database** (RLS): un giocatore vede solo i gruppi di cui fa parte.

### Questionario (Profile setup)

| Campo | Valori |
| --- | --- |
| Età | anno di nascita |
| Livello massimo | never · amateur (tornei, CSI, UISP) · youth (settore giovanile) · semipro (dilettanti) · elite (Eccellenza o superiore) |
| Anni di pratica | 0–2 · 3–5 · 6–10 · 10+ |
| Frequenza attuale | <1 al mese · 1–3 al mese · 1 a settimana · 2+ a settimana |
| Posizioni preferite | GK · DEF · MID · ATT (più di una) + "goalkeeper rotation ok" |
| Piede | right · left · both (solo sulla carta) |
| Attributi 1–5 | Pace, Shooting, Passing, Dribbling, Defending, Physical — ogni livello con una **descrizione ancorata a un comportamento** (es. *Pace 4: rarely does anyone outrun me*) |
| Goalkeeping 1–5 | solo se indica GK |
| Forma del momento 1–5 | **non nel profilo**: chiesta quando ci si segna a una partita |

Durante il questionario l'anteprima della carta si aggiorna dal vivo.

### Modello dati (7 tabelle)

| Tabella | Campi principali |
| --- | --- |
| `users` | id, name, email, avatar_url (gestita da Supabase Auth) |
| `groups` | id, name, invite_code, default_format (5/7), owner_id |
| `players` | id, group_id, user_id (null per gli ospiti), display_name, role (owner/admin/player), birth_year, max_level, years_played, frequency, positions, foot, attributes, gk_rating, mu, matches_played |
| `matches` | id, group_id, format, date, status (open/teams_set/played), score_a, score_b, result_status (pending/confirmed), result_by, confirmed_by, win_prob_a, created_by |
| `match_players` | match_id, player_id, form, team (A/B), position, mu_before, mu_after |
| `team_proposals` | match_id, rank, team_a, team_b, win_prob_a |
| `pair_constraints` | match_id, player_a, player_b, type (together/apart) |

Profilo e rating stanno in `players` (un record per persona per gruppo), così gli ospiti funzionano come gli altri. Quando un utente entra in un secondo gruppo, il profilo viene copiato dal primo. Se si adotta il ricalcolo, il campo `sigma` non serve.

### Schermate

| Schermata | Chi la usa | Contenuto |
| --- | --- | --- |
| Sign in | tutti | Google o email |
| Profile setup | tutti, una volta | questionario a step con anteprima carta |
| Group home | tutti | prossima partita con "I'm in", elenco membri con overall |
| Match | tutti | iscritti con forma; per l'admin "Generate teams" |
| Team proposals | admin | 3 proposte con probabilità di vittoria; spostamento manuale di un giocatore con probabilità aggiornata |
| Lineup | tutti | campo con le carte delle due squadre, forza di ciascuna, "Share" (immagine) |
| Result | chi ha giocato | punteggio; poi conferma di un avversario o di un admin |
| Player card | tutti | carta completa, partite giocate, vittorie e sconfitte |
| Group settings | admin | link d'invito, admin, ospiti |

**Carta:** overall, posizione principale, nome, PAC/SHO/PAS/DRI/DEF/PHY, piede, icona forma, badge "provisional". Colore per fascia: bronzo <65, argento 65–74, oro ≥75. Grafica originale (stile da definire più avanti).

---

## 6. Piano di lavoro

Ogni passo si chiude con qualcosa che Lorenzo può provare. Non passare al successivo senza il suo ok.

1. **Setup progetto** — repo GitHub, Next.js + TypeScript + Tailwind, motore importato con i suoi test che girano (`npm test`), deploy su Vercel di una pagina vuota. *Fatto quando:* Lorenzo apre l'URL di Vercel dal telefono.
2. **Database e login** — schema Supabase con migrazioni, RLS, login Google + magic link. *Fatto quando:* Lorenzo entra con il suo account Google e un amico con l'email.
3. **Gruppi e profilo** — crea gruppo, link d'invito, questionario con anteprima carta, ospiti. *Fatto quando:* 3–4 amici entrano nel gruppo e vedono le loro carte.
4. **Partite e squadre** — crea partita, "I'm in" con forma, generazione delle 3 proposte, spostamento manuale, vincoli insieme/separati, formazione con carte. *Fatto quando:* si generano le squadre per una partita vera.
5. **Risultato e rating** — inserimento, conferma, contestazione, ricalcolo dei rating (metodo confermato da Lorenzo), storico `mu_before`/`mu_after`. *Fatto quando:* dopo una partita vera i rating cambiano come previsto.
6. **Condivisione e PWA** — immagine della formazione, installazione sul telefono. *Fatto quando:* la formazione si condivide su WhatsApp.
7. **Prova con il gruppo (4–6 settimane)** — raccolta feedback; con le partite reali si ricontrollano i parametri (`tau`, pesi del questionario) rilanciando il simulatore con ipotesi aggiornate.

### Seconda fase (non nell'MVP)

Storico partite e grafico dell'overall nel tempo, classifiche, MVP della serata, statistiche personali, notifiche, eventuale app negli store.

---

## 7. Note tecniche

- **Il motore resta puro:** niente accesso al database dentro `engine.ts`. L'app legge i dati, chiama le funzioni, salva i risultati.
- **Bilanciamento lato server o client:** è abbastanza veloce per entrambi; lato server (route handler) evita che un client modifichi i risultati.
- **Ricalcolo dei rating:** va fatto lato server alla conferma del risultato, in una transazione, aggiornando `players.mu` e scrivendo `mu_before`/`mu_after` in `match_players`.
- **Bitmask nel bilanciamento:** usa interi a 32 bit, quindi funziona fino a 31 giocatori per partita (ampiamente sufficiente).
- **Simulatore:** le ipotesi sulla popolazione sono in `POPULATION` in `sim/simulate.ts`. Quando ci saranno dati reali, conviene confrontarli con queste ipotesi e rilanciare.
