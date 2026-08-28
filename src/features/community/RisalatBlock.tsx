import { Link, router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { components } from '@/api/schema';
import { Button } from '@/components/Button';
import { RisalaCard } from '@/components/RisalaCard';
import { color, disciplineLabel, space, type } from '@/design/tokens';
import { formatTurnDeadline, risalaTimeLeft } from '@/features/community/format';

type Risalat = components['schemas']['Risalat'];
type RisalaTurn = components['schemas']['RisalaTurn'];

/**
 * Les Risālāt de la semaine — #105. En tête de l'onglet Guilde, au-dessus du roster : c'est le
 * présent de la guilde, le roster en est l'archive, et « résumé, action, puis archive » les
 * met dans cet ordre. C'est aussi là qu'atterrit le tap d'un push `GUILD_RISALAT` (#104) — le
 * joueur qui tape « Younes envoie Escalade à la guilde » doit voir Escalade sans défiler.
 *
 * ————— Le seul geste actif de la mécanique ————————————————————————————————————————————
 *
 * Le bouton qui pousse vers `/risala-turn` (#106) n'apparaît que sous `turn.mine` : pour
 * tous les autres — personne, ou le tour de quelqu'un d'autre — ce bloc reste ce qu'il a
 * toujours été, une phrase, jamais une action qu'ils ne pourraient pas actionner.
 *
 * L'ordre de `risalat` n'est jamais retrié : le serveur l'a déjà décidé — la plus ancienne
 * d'abord, donc celle qui expire en premier — et la retrier par date donnerait le même résultat
 * aujourd'hui et un résultat faux le jour où le back changera `active_weeks`.
 *
 * ————— Les deux états vides nomment l'instant, jamais la grille qui le produit ——————————
 *
 * `risalat.nextRevealAt` (younesdiouri/grrind-back#202) porte le prochain rendez-vous
 * hebdomadaire, rendu comme un instant plutôt que comme un jour et une heure recopiés d'un
 * réglage serveur (`reveal_day`, `reveal_hour`) : `formatTurnDeadline` le met en phrase dans
 * le fuseau du lecteur, exactement comme il le fait pour `turn.deadline` — un seul format pour
 * dire un rendez-vous dans ce module. Les deux valent le même instant quand un tour est déjà
 * ouvert, mais ce n'est qu'une conséquence du calendrier : les deux états vides ci-dessous
 * n'ont justement pas de tour, ils lisent donc `nextRevealAt`, la seule chose que le serveur
 * ait à leur dire.
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
          Pas encore de Risāla : la première arrivera le {formatTurnDeadline(risalat.nextRevealAt)}.
        </Text>
      ) : (
        <View style={styles.cards}>
          {risalat.risalat.map((risala) => {
            const card = (
              <RisalaCard
                discipline={risala.discipline}
                senderDisplayName={risala.senderDisplayName}
                bonusPercent={risala.bonusPercent}
                timeLeft={risalaTimeLeft(risala.expiresAt, now)}
              />
            );

            // Un expéditeur parti n'a plus de profil à ouvrir : `GET /api/players/{id}` rend
            // `player-not-found` en 404 dès que la cible « n'est ni soi-même ni un
            // co-équipier », et c'est exactement ce que `senderDisplayName === null` raconte.
            // Le tap existe pour éviter un cul-de-sac ; le laisser ici en creuserait un.
            return risala.senderDisplayName === null ? (
              <View key={risala.id}>{card}</View>
            ) : (
              <Link
                key={risala.id}
                href={{ pathname: '/joueur/[id]', params: { id: risala.senderId } }}
                asChild
              >
                {/* `asChild` clone l'enfant avec `onPress` : voir index.tsx pour la même règle.
                    Toute la carte est tappable — même choix que `GuildMemberRow` dans
                    `Roster`. */}
                <Pressable>{card}</Pressable>
              </Link>
            );
          })}
        </View>
      )}

      <TurnNote turn={risalat.turn} nextRevealAt={risalat.nextRevealAt} />
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
function TurnNote({ turn, nextRevealAt }: { turn: RisalaTurn | null; nextRevealAt: string }) {
  if (turn === null) {
    // Guilde d'un seul membre, ou fondée depuis la dernière bascule : pas un vide, une phrase.
    return (
      <Text style={styles.body}>
        Pas de tour de Risāla pour l’instant : il s’en tirera un le {formatTurnDeadline(nextRevealAt)}.
      </Text>
    );
  }

  if (turn.mine) {
    return (
      <View style={styles.turnAction}>
        <Text style={styles.body}>
          {turn.discipline === null
            ? `C'est ton tour de choisir la discipline de la semaine, avant le ${formatTurnDeadline(turn.deadline)}.`
            : `Tu as choisi ${disciplineLabel[turn.discipline]} pour la semaine prochaine.`}
        </Text>
        {/* Un choix se remplace tant que l'échéance n'est pas passée (#106) : le bouton reste
            là même une fois choisi, pour qu'on puisse en changer. */}
        <Button
          label={turn.discipline === null ? 'Choisir' : 'Changer de discipline'}
          onPress={() => router.push('/risala-turn')}
          variant="quiet"
        />
      </View>
    );
  }

  // L'expéditeur du tour peut avoir quitté la guilde depuis qu'il en a hérité : le champ est
  // nullable aux deux endroits, et le tap disparaît avec le nom pour la même raison que sur une
  // Risāla révélée — il n'y a plus de profil au bout.
  if (turn.senderDisplayName === null) {
    return (
      <Text style={styles.body}>
        Un membre qui a quitté la guilde choisit la discipline de la semaine, avant le{' '}
        {formatTurnDeadline(turn.deadline)}.
      </Text>
    );
  }

  return (
    <Link href={{ pathname: '/joueur/[id]', params: { id: turn.senderId } }} asChild>
      <Pressable>
        <Text style={styles.body}>
          {turn.senderDisplayName} choisit la discipline de la semaine, avant le{' '}
          {formatTurnDeadline(turn.deadline)}.
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
  turnAction: { gap: space.sm },
});
