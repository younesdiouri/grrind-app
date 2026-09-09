type ItemIllustrationState = {
  imageUrl: string;
  loadedImageUrl: string | null;
  failedImageUrl: string | null;
};

export type ItemIllustrationPresentation = {
  source: string | null;
  imageVisible: boolean;
  placeholderVisible: boolean;
};

/**
 * Lie l’état au contenu de l’URL plutôt qu’au cycle de vie du composant : une case recyclée
 * pour un autre objet repart ainsi en chargement sans montrer le succès ou l’échec précédent.
 */
export function itemIllustrationPresentation({
  imageUrl,
  loadedImageUrl,
  failedImageUrl,
}: ItemIllustrationState): ItemIllustrationPresentation {
  const source = imageUrl.trim();
  // Ce fichier générique est transparent : un chargement réussi ne constitue pas un dessin
  // d'objet. Le chemin exact distingue ce sentinel des véritables illustrations publiées.
  let genericPlaceholder = false;
  try {
    genericPlaceholder = new URL(source).pathname === '/game-images/placeholder.png';
  } catch {
    // L'image invalide garde le traitement habituel onError du composant.
  }

  if (source.length === 0 || genericPlaceholder || failedImageUrl === source) {
    return { source: null, imageVisible: false, placeholderVisible: true };
  }

  const imageVisible = loadedImageUrl === source;
  return { source, imageVisible, placeholderVisible: !imageVisible };
}
