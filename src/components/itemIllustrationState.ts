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

  if (source.length === 0 || failedImageUrl === source) {
    return { source: null, imageVisible: false, placeholderVisible: true };
  }

  const imageVisible = loadedImageUrl === source;
  return { source, imageVisible, placeholderVisible: !imageVisible };
}
