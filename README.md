<div align="center">

<img src="public/icons/icon-512.png" width="110" alt="Coach Muscu" />

# COACH MUSCU

**Mon coach de musculation personnel — adaptatif, local, sans compte.**

Force & hypertrophie haut du corps · Recommandations de charge intelligentes · Carnet de progression

![React](https://img.shields.io/badge/React-18-149ECA?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-4-38BDF8?logo=tailwindcss&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-installable_sur_iPhone-FF5C2E)
![Claude](https://img.shields.io/badge/construit_avec-Claude-D97757)

</div>

---

Une seule mission : **devenir plus fort et plus musclé**, séance après séance. L'app recommande la charge du jour et explique pourquoi, enregistre chaque série en deux tapotements, détecte les records, la stagnation et la fatigue — et s'adapte. Pas de score opaque : des vrais chiffres (*+5 kg, +3 reps, assistance 20 → 10 kg*).

## ✨ Ce que fait l'app

**🏋️ Le programme** — 4 séances/semaine en rotation : `PUSH FORCE` → `PULL FORCE` → `PUSH HYPERTROPHIE` → `PULL HYPERTROPHIE`. Les jours force travaillent lourd (4-8 reps, repos 2:30-3:00), les jours hypertrophie en volume (8-15 reps, repos courts, plus d'isolation). Un même mouvement est programmé différemment selon le jour. Tout est modifiable : exercices, séries, fourchettes, repos, jours.

**🧠 Le coach** — avant chaque exercice : *charge recommandée + une phrase d'explication + objectif du jour* (« viser ≥ 31 reps totales »). Après : verdict nuancé (mieux / similaire / moins bien). Check-in de 10 s avant la séance (sommeil, énergie, courbatures, motivation) analysé **en tendance** — une seule mauvaise nuit ne change rien.

**📈 La progression** — records automatiques (charge max, reps à charge donnée, e1RM estimé, max au poids du corps, assistance minimale, lest max), graphiques sur 30 j / 3 mois / 6 mois / tout, volume hebdo par muscle (polyarticulaires comptés en fractions), bilan « suis-je plus fort qu'il y a un mois ? ».

**⚡ En séance** — saisie une main : préremplissage des valeurs recommandées, RIR optionnel, timer de repos automatique (+30 s / relancer / passer), échauffements hors stats, bouton « Machine indispo » → alternative du même mouvement, poids du jour pour dips & tractions.

## 🧮 Comment le coach décide

| Situation | Décision |
|---|---|
| Toutes les séries au plafond, avec marge (RIR ≥ 1) | **+1 incrément** de la machine |
| Progrès en cours dans la fourchette | Même charge, viser **+1 rep totale** |
| La moitié des séries sous le plancher | Charge **gelée**, consolidation |
| 2 séances de suite sous le plancher | **−1 incrément** (ou + d'assistance aux dips/tractions) |
| Incrément gagné mais récupération basse | Montée **reportée** à la prochaine séance |
| Tendance de récupération basse | Volume **×0,7**, pas de record aujourd'hui |
| 3-4 passages sans progrès | **Stagnation détectée** + pistes concrètes |
| ≥3 mouvements clés qui stagnent + fatigue | Proposition de **semaine allégée −40 %** |
| Plus de 4 semaines d'arrêt | **Reprise** ≈ 1 cran en dessous, RIR 2-3 |
| Dips / tractions validés | Assistance ↓ → poids du corps → **lest ↑** (une seule progression continue) |

Chaque machine a son propre incrément réel (45 → 50 vs 45 → 47,5 kg), ses réglages (siège, prise) et ses variantes A/B **sans jamais mélanger les records**.

## 📱 Installation sur iPhone (une seule fois)

1. **GitHub** — crée un dépôt privé et téléverse le contenu de ce dossier (`Add file → Upload files`).
2. **Vercel** — [vercel.com](https://vercel.com) → *Add New Project* → importe le dépôt → *Deploy*. Vite est détecté automatiquement, c'est gratuit.
3. **iPhone** — ouvre l'URL Vercel dans **Safari** → Partager → **« Sur l'écran d'accueil »**. Icône, plein écran, fonctionne hors-ligne.

## 🔄 Mises à jour avec Claude

```mermaid
flowchart LR
    A["🤖 Claude<br/>nouveau src/App.jsx"] --> B["📦 GitHub<br/>coller + commit"]
    B --> C["▲ Vercel<br/>déploiement auto ~1 min"]
    C --> D["📱 iPhone<br/>l'app se met à jour seule"]
```

Toute l'application tient dans **un seul fichier : `src/App.jsx`**. Pour une évolution : demander à Claude → remplacer le fichier sur github.com (faisable depuis le téléphone : ouvrir le fichier → ✏️ → coller → *Commit*) → Vercel redéploie, le service worker applique la mise à jour à l'ouverture suivante.

## ☁️ Synchroniser iPhone ↔ artéfact Claude (optionnel)

Les données vivent **en local sur l'appareil**. Pour les partager entre l'app iPhone et l'artéfact dans Claude : `Profil → Données → Cloud personnel · Supabase` des deux côtés, avec la même URL, la même clé *anon* et le même identifiant. Offre gratuite de Supabase largement suffisante.

<details>
<summary><b>SQL à exécuter une fois dans Supabase</b> (SQL Editor → coller → Run)</summary>

```sql
create table coach_muscu (
  id text primary key,
  payload jsonb,
  updated_at timestamptz default now()
);
alter table coach_muscu enable row level security;
create policy "acces_libre" on coach_muscu
  for all using (true) with check (true);
```

> La politique ouvre la table à quiconque possède ta clé anon : base strictement personnelle, garde la clé pour toi.

</details>

## 💾 Données & sécurité

- **Local-first** : localStorage sur l'iPhone, stockage de l'artéfact dans Claude — aucun compte, aucun serveur obligatoire.
- **Copie de secours** automatique toutes les 2 minutes, restaurable en un tap.
- **Export / import JSON** dans `Profil → Données` : la ceinture de sécurité universelle.
- Sauvegarde à chaque modification **et** à la fermeture de l'app ; écran de récupération si aucune sauvegarde n'est trouvée au démarrage.

## 🗂 Structure

```
coach-app/
├── index.html              # meta PWA / iOS
├── vite.config.js          # React + Tailwind 4 + service worker (autoUpdate)
├── public/icons/           # icônes de l'app
└── src/
    ├── App.jsx             # ⭐ toute l'application — le fichier que Claude met à jour
    ├── main.jsx
    └── index.css
```

## 🛠 Dev local

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # build de production + service worker
```

<div align="center">

*Conçu pour un seul utilisateur : moi.* 🧡

**React · Recharts · Lucide · Tailwind · vite-plugin-pwa — assemblé avec Claude**

</div>
