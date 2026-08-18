/**
 * L'annonce de « quitter » — la table pure du ticket #45.
 *
 * `POST /api/guilds/mine/leave` ne prend aucun paramètre et choisit seul, côté serveur, entre
 * trois issues invisibles pour le joueur : il s'en va simplement, il était fondateur et la
 * guilde passe au membre le plus ancien, ou il était le dernier et la guilde se dissout avec
 * lui. **Le client ne décide rien** — il prédit, avec `role` et `memberCount`, laquelle des
 * trois attend le joueur, pour que la confirmation la nomme avant l'appui.
 *
 * Une table plutôt qu'un `if` dans le JSX : la revue de #43 a montré qu'une branche oubliée
 * dans un composant ne se voit pas à l'œil, et ce module se prouve sur ses deux frontières
 * (`memberCount === 1` chez un fondateur → dissolution ; `memberCount === 2` → succession) sous
 * `node --test`, sans monter d'écran.
 */
export type LeaveAnnouncement =
  | { kind: 'member'; message: string }
  | { kind: 'founder-succession'; message: string }
  | { kind: 'founder-dissolution'; message: string };

export function leaveAnnouncementFor(params: {
  role: 'FOUNDER' | 'MEMBER';
  memberCount: number;
  guildName: string;
}): LeaveAnnouncement {
  if (params.role !== 'FOUNDER') {
    return {
      kind: 'member',
      message: `Tu quittes ${params.guildName}. Tu pourras revenir avec un code valide.`,
    };
  }

  // Le fondateur est forcément compté dans `memberCount` : à 1, il est seul, donc dernier.
  if (params.memberCount <= 1) {
    return {
      kind: 'founder-dissolution',
      message: 'Tu es le dernier membre : quitter dissout la guilde.',
    };
  }

  return {
    kind: 'founder-succession',
    message: "Tu n'es plus fondateur. La guilde passe au membre le plus ancien.",
  };
}
