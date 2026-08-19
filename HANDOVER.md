# 📋 DOCUMENT DE PASSATION DU PROJET (HANDOVER)
## Plateforme de Veille Stratégique & Diffusion Multi-Canal (Sahel & Espace Saharien)

---

### 1. 🎯 Vue d'Ensemble du Projet

Cette plateforme est un système automatisé de **veille stratégique, d'agrégation d'actualités en temps réel et de diffusion intelligente multi-canal** (Telegram & WhatsApp). 

Elle surveille des comptes X (Twitter), des flux RSS et des sources web, synthétise les événements sécuritaires et politiques grâce à des modèles de langage avancés (via OpenRouter), et génère des bulletins clairs, hiérarchisés et accompagnés de leurs références/sources.

---

### 2. 🏛️ Architecture Technique

```
┌─────────────────────────────────────────────────────────────┐
│                    SOURCES D'INFORMATION                    │
│   • Comptes X (Twitter) via Nitter RSS / Syndication / Jina │
│   • Flux RSS standards (XML/Atom)                           │
│   • Pages Web & Médias d'actualité                          │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                  PIPELINE DE TRAITEMENT                     │
│   1. Collecte & Déduplication (Supabase `raw_posts`)        │
│   2. Filtrage temporel (Fenêtre glissante 48h)              │
│   3. Synthèse IA multilingue (OpenRouter: AR, FR, EN)       │
│   4. Formatage journalistique avec citation des sources     │
│   5. Archivage des rapports (`digests`)                     │
│   6. Purge automatique des données brutes (> 30 jours)      │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                   CANAUX DE DIFFUSION & UI                  │
│   • Tableau de bord Web Next.js 16 (Authentifié /login)     │
│   • Canaux & Groupes Telegram (HTML / Markdown sécurisé)    │
│   • Groupes WhatsApp (via Green-API / Twilio)               │
│   • Vercel Cron Jobs (08:00, 14:00, 20:00 UTC+1)            │
└─────────────────────────────────────────────────────────────┘
```

---

### 3. 📂 Structure des Fichiers Clés

| Fichier / Répertoire | Rôle & Responsabilité |
| :--- | :--- |
| `src/proxy.ts` | **Middleware Next.js 16** : Protège toutes les routes du Dashboard et redirige les utilisateurs non authentifiés vers `/login`. |
| `src/lib/auth.ts` | Gestion des sessions sécurisées (HMAC-SHA256, cookies `HttpOnly`, validité 7 jours). |
| `src/app/login/page.tsx` | Interface de connexion moderne avec bouton de pré-remplissage rapide. |
| `src/lib/openrouter.ts` | Intégration IA avec OpenRouter, prompt de synthèse d'élite avec sources, `max_tokens: 6000`, et extracteur Regex anti-coupure. |
| `src/lib/fetchers/x-scraper.ts` | Scraper résilient pour X/Twitter sans surcoût API (Nitter RSS haute disponibilité, Fallback Jina Reader & Twitter API). |
| `src/lib/summarizer.ts` | Orchestrateur central : déclenche la collecte, filtre sur 48h, appelle l'IA, enregistre et diffuse. |
| `src/lib/supabase.ts` | Client Supabase & fonctions d'accès aux données (dont `cleanupOldPosts` à 720h / 30 jours). |
| `src/lib/telegram.ts` | Module d'expédition Telegram avec découpage intelligent des messages (> 4096 caractères) et gestion des erreurs de balisage. |
| `src/lib/whatsapp.ts` | Module d'expédition WhatsApp (support Green-API et Twilio). |
| `src/app/page.tsx` | Dashboard principal : monitoring, gestion des sources, prévisualisation multilingue (AR / FR / EN) et déclenchement manuel. |
| `vercel.json` | Configuration des Cron Jobs automatiques Vercel calés sur l'heure algérienne (UTC+1). |

---

### 4. 🔐 Authentification & Identifiants par Défaut

- **Page de connexion** : `http://localhost:3000/login`
- **Utilisateur par défaut** : `admin`
- **Mot de passe par défaut** : `SahelIntel2026!*`
- Les identifiants peuvent être modifiés à tout moment dans `.env.local` via :
  - `DASHBOARD_ADMIN_USER`
  - `DASHBOARD_ADMIN_PASSWORD`
  - `SESSION_SECRET`

---

### 5. 🤖 Modèle d'IA & Format des Bulletins

- **Générateur IA** : OpenRouter (par défaut : `google/gemini-2.5-flash-lite`, interchangeable avec GPT-4o, Claude 3.5 Sonnet, etc.).
- **Style de rédaction** : Journalistique, clair, sobre, direct et sans verbiage superflu.
- **Règles éditoriales appliquées** :
  1. Classement thématique / géographique avec puces visuelles (`🔹`).
  2. **Attribution obligatoire des sources** à la fin de chaque fait : `[المصدر: @اسم_المصدر]` / `[Source: @Compte]`.
  3. Génération simultanée en **Arabe (العربية)**, **Français** et **Anglais**.
  4. Robustesse logicielle : extraction résiliente en cas de réponse JSON tronquée.

---

### 6. ⏰ Planification des Bulletins (Vercel Cron)

Les envois automatiques sont programmés **3 fois par jour** aux heures stratégiques en Algérie (UTC+1) :
- **Matin** : `08:00` UTC+1 (`07:00` UTC)
- **Midi** : `14:00` UTC+1 (`13:00` UTC)
- **Soir** : `20:00` UTC+1 (`19:00` UTC)

Configuration dans `vercel.json` :
```json
{
  "crons": [
    { "path": "/api/cron/generate-digest?timeSlot=morning", "schedule": "0 7 * * *" },
    { "path": "/api/cron/generate-digest?timeSlot=afternoon", "schedule": "0 13 * * *" },
    { "path": "/api/cron/generate-digest?timeSlot=evening", "schedule": "0 19 * * *" }
  ]
}
```

---

### 7. 🗄️ Base de Données & Rétention

- **Hébergement** : Supabase (PostgreSQL).
- **Règle de rétention des données (Anti-Saturation)** :
  - `digests` (Rapports générés) : Conservés indéfiniment pour historique.
  - `raw_posts` (Articles/Tweets bruts) : Purge automatique après **30 jours (720 heures)** exécutée à chaque cycle.

---

### 8. 🚀 Guide de Déploiement & Commandes

#### A. Lancement en Développement Local :
```bash
npm run dev
# Accès : http://localhost:3000
```

#### B. Compilation & Vérification de Production :
```bash
npm run build
npm start
```

#### C. Déploiement sur Vercel :
1. Connecter le dépôt Git à un projet Vercel.
2. Définir toutes les variables du fichier `.env.example` dans les paramètres Vercel (*Settings > Environment Variables*).
3. Les Cron Jobs s'activeront automatiquement dès le premier déploiement.

---

### 9. 📞 Maintenance & Bonnes Pratiques

1. **Ajout de nouveaux comptes X** : Utilisez directement le formulaire sur le dashboard (`/`) avec le format `@nom_du_compte`.
2. **Changement de modèle IA** : Vous pouvez tester et basculer instantanément de modèle via le menu déroulant sur le dashboard ou via la variable `OPENROUTER_MODEL`.
3. **Note sur Telegram en Local** : Les FAI locaux peuvent bloquer l'accès direct aux serveurs de l'API Telegram (`ECONNRESET`). Sur les serveurs de production Vercel, la livraison s'effectue sans aucun blocage.

---
*Document rédigé le 19 Août 2026.*
