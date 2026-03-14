# KiwiSite Landing Page

Landing page one-page en français pour vendre des sites web sur-mesure, en HTML/CSS/JS vanilla.

## Fichiers

- `index.html` : structure + contenu (hero, échelle, offres, avis, FAQ, contact)
- `css/styles.css` : design dark avec accents vert kiwi, responsive mobile-first
- `js/script.js` : interactions (scroll fluide, FAQ accordéon, copie contact, toast, formulaire mailto, hook analytics)
- `README.md` : guide rapide

## Lancer le projet

1. Ouvrir `index.html` dans le navigateur.
2. Ou lancer avec Live Server (VS Code) pour le rechargement automatique.

## À modifier en priorité

### 1) Liens Stripe

Dans `index.html`, remplacer :

- `STRIPE_LINK_STARTER`
- `STRIPE_LINK_PRO`
- `STRIPE_LINK_PREMIUM`

par vos vraies URLs Stripe.

### 2) Coordonnées de contact

Dans `index.html`, mettre à jour :

- `kiwisitebuilder@gmail.com`
- `https://wa.me/33612345678`
- `https://instagram.com/kiwisite`

Les boutons de copie utilisent les attributs `data-copy`.

### 3) Textes commerciaux

Modifier librement les textes dans :

- Hero
- Cartes d'offres
- Section "Ce que vous obtenez"
- Avis clients
- FAQ

## Analytics léger (optionnel)

Dans `js/script.js`, un hook est prévu :

```js
window.KiwiSiteAnalytics = {
  enabled: true,
  track(event, payload) {
    console.log(event, payload);
    // Brancher ici votre analytics
  }
};
```

Événements suivis :

- `nav_click`
- `faq_toggle`
- `copy_contact`
- `contact_invalid`
- `contact_submit`
- `review_slide`
- `stripe_click`
