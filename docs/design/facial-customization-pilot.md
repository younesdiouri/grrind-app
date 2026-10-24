# Visage et nez masculins facettés — #253

Le premier pilote est validé sur Simulator le 24 octobre 2026. Verdict de l’auteur :
« ok je pense que ça peut être mergé comme ça c'est cool on garde au moins cette feature on verra apres si on rajoute des visages etc. »

## Fonctionnement conservé

L’atelier propose un visage d’origine ou carré et un nez d’origine ou large, indépendamment :
quatre combinaisons sur l’homme, en tenue sport ou Fantasy, compatibles avec les gants,
les coiffures, les couleurs et les gestes existants. Le féminin reste inchangé.
Les configurations de combat conservent le visage et le nez d’origine par défaut.
Seul l’atelier sélectionne le nouveau pilote au démarrage ; aucune apparence n’est encore persistée.

## Sources et reconstruction

Le master local `spikes/art-source/facial-pilot/CH_FacialPilotMale_master.blend` reste conservé
hors Git, conformément au dépôt. Les scripts versionnés `build/01_forms.py` et `build/02_verify.py`
permettent de le reconstruire ; le concept ImageGen et `PROVENANCE.json` gardent les sources.
Les références existantes sont pointées à leur emplacement d’origine,
avec leurs empreintes ; les copies et captures redondantes sont retirées. Les sept poses sont
regroupées dans `review/poses-contact.png`. L’ancienne copie masculine de mains masquées,
remplacée et sans référence dans les prefabs, est supprimée.

Les FBX livrés dans `spikes/Unity3D/Assets/Characters/FacialPilot/` portent deux meshes de visage,
chacun avec le même blendshape `NoseWide`. Aucun nouveau corps, rig ou matériau de peau.
La mâchoire mesurée passe de 110,93 à 132,73 mm et le nez de 36,13 à 42,90 mm.
La dérive du crâne, des oreilles, du dos et du cou au réimport reste inférieure à 0,001 mm.
Les têtes carrées comptent 2 848 triangles en Fantasy et 7 312 pour la peau sport.

Dans Unity, `FacialPilot.Build()` s’exécute sur le prefab masculin déjà équipé ; il conserve
les os et matériaux existants et reconstruit les copies avec mains masquées. Ces copies
réinitialisent aussi les données de skinning GPU après la coupe des triangles.
`FacialPilotChecks.Validate()` vérifie les quatre combinaisons, l’anatomie protégée, le retour
exact au nez d’origine et la conservation des choix lors du changement de gants.

## Vérifications

- Réimport Blender et contrôles Unity : PASS ; les deux tenues, quatre coiffures et sept gestes
  à phase 0,5 ont été inspectés. Planches retenues dans `spikes/art-source/facial-pilot/review/`.
- Typecheck, lint, 562 tests JS et 29 previews : PASS.
- Framework et development build Simulator : compilations Xcode réussies, codes 0. Seule la
  tranche Simulator a été reconstruite ; aucun build iPhone ni EAS dans cette itération.
- `E2E_OFFLINE=1 npm run e2e:ios:flow -- .maestro/quaternius-poc.yaml` : 1/1 PASS en 3 min 4 s.
  Les captures des quatre combinaisons, le profil et le retour du duel ont été inspectés.
  `review/simulator-combinations.png` conserve la comparaison issue de l’app installée.
  Les clics souris Original puis Carré ont également été vérifiés après Maestro.

Toute modification d’asset Unity nécessite un nouvel export et une recompilation de la tranche
native concernée. Metro seul ne remplace pas les modèles embarqués : c’était la cause des
sélections visibles sans effet sur l’ancien binaire. Réutiliser ensuite le harnais décrit dans
`docs/ai/mobile-qa.md`, sans effacer le Simulator ni les caches Xcode.

## Suite séparée

La sauvegarde serveur et un onglet Apparence dans l’inventaire sont suivis dans
[app #254](https://github.com/younesdiouri/grrind-app/issues/254) et
[back #308](https://github.com/younesdiouri/grrind-back/issues/308).
Les nouveaux visages et nez attendront. Aucun backend, contrat API ou jeu de données n’est
modifié par ce pilote.
