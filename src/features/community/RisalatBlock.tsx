import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { components } from '@/api/schema';
import { RisalaCard } from '@/components/RisalaCard';
import { color, space, type } from '@/design/tokens';
import { formatTurnDeadline, risalaTimeLeft } from '@/features/community/format';
import { risalaDisciplineLabel } from '@/features/community/risalaDiscipline';

type Risalat = components['schemas']['Risalat'];
type RisalaTurn = components['schemas']['RisalaTurn'];

/**
 * Les Risālāt de la semaine — #105. En tête de l'onglet Guilde, au-dessus du roster : c'est le
 * présent de la guilde, le roster en est l'archive, et « résumé, action, puis archive » les
 * met dans cet ordre. C'est aussi là qu'atterrit le tap d'un push `GUILD_RISALAT` (#104) — le
 * joueur qui tape « Younes envoie Escalade à la guilde » doit voir Escalade sans défiler.
 *
 * ————— Ce que ce composant ne fait pas ———————————————————————————————————————————————
 *
 * Aucune action : le bouton « c'est ton tour » et le choix de la discipline sont #106. Un
 * joueur dont c'est le tour voit ici qu'il doit choisir, sans pouvoir encore répondre — c'est
 * volontaire, pas un oubli.
 *
 * L'ordre de `risalat` n'est jamais retrié : le serveur l'a déjà décidé — la plus ancienne
 * d'abord, donc celle qui expire en premier — et la retrier par date donnerait le même résultat
 * aujourd'hui et un résultat faux le jour où le back changera `active_weeks`.
 */
export function RisalatBlock({ risalat, now }: { risalat: Risalat; now: Date }) {
  return (
    <View style={styles.block}>
      <Text style={styles.title}>Risālāt de la semaine</Text>

      {risalat.risalat.length === 0 ? (
        // Aucune Risāla n'est une excuse : la guilde a moins de quinze jours, ou personne n'a
        // encore choisi. Le bloc dit ce qui va se passer et quand, il ne s'efface pas — un
        // bloc qui disparaît ferait croire que la mécanique n'existe pas.
        <Text style={styles.body}>
          Pas encore de Risāla : la première arrivera au prochain dimanche soir.
        </Text>
      ) : (
        <View style={styles.cards}>
          {risalat.risalat.map((risala) => (
            <Link
              key={risala.id}
              href={{ pathname: '/joueur/[id]', params: { id: risala.senderId } }}
              asChild
            >
              {/* `asChild` clone l'enfant avec `onPress` : voir index.tsx pour la même règle.
                  Toute la carte est tappable — même choix que `GuildMemberRow` dans `Roster` —
                  parce que `senderId` est là pour ça, et une Risāla sans son auteur cliquable
                  serait un cul-de-sac. */}
              <Pressable>
                <RisalaCard
                  discipline={risala.discipline}
                  senderDisplayName={risala.senderDisplayName}
                  bonusPercent={risala.bonusPercent}
                  timeLeft={risalaTimeLeft(risala.expiresAt, now)}
                />
              </Pressable>
            </Link>
          ))}
        </View>
      )}

      <TurnNote turn={risalat.turn} />
    </View>
  );
}

/**
 * L'état du tour, en lecture seule : qui doit choisir, jusqu'à quand.
 *
 * `discipline` n'est renseignée que pour son auteur, et seulement s'il a déjà choisi — le
 * contrat le garantit déjà côté serveur, cet écran ne fait qu'en tirer la bonne phrase, jamais
 * un chemin qui supposerait le contraire. `mine` évite de comparer des UUID pour savoir
 * laquelle des trois phrases écrire.
 */
function TurnNote({ turn }: { turn: RisalaTurn | null }) {
  if (turn === null) {
    // Guilde d'un seul membre, ou fondée depuis la dernière bascule : pas un vide, une phrase.
    return (
      <Text style={styles.body}>
        Pas de tour de Risāla pour l’instant : il en faudra un à la prochaine bascule, dimanche
        soir.
      </Text>
    );
  }

  if (turn.mine) {
    return (
      <Text style={styles.body}>
        {turn.discipline === null
          ? `C'est ton tour de choisir la discipline de la semaine, avant le ${formatTurnDeadline(turn.deadline)}.`
          : `Tu as choisi ${risalaDisciplineLabel(turn.discipline)} pour la semaine prochaine.`}
      </Text>
    );
  }

  // L'expéditeur du tour peut avoir quitté la guilde depuis qu'il en a hérité : même formulation
  // que sur une Risāla déjà révélée, le champ est nullable aux deux endroits.
  const sender = turn.senderDisplayName ?? 'un membre qui a quitté la guilde';

  return (
    <Link href={{ pathname: '/joueur/[id]', params: { id: turn.senderId } }} asChild>
      <Pressable>
        <Text style={styles.body}>
          {sender} choisit la discipline de la semaine, avant le {formatTurnDeadline(turn.deadline)}.
        </Text>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  block: { gap: space.sm, marginBottom: space.lg },
  title: { ...type.title, color: color.text },
  body: { ...type.body, color: color.textMuted },
  cards: { gap: space.sm },
});
