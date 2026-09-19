import { Stack, router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import type { components } from '@/api/schema';
import { Button } from '@/components/Button';
import { ItemCard } from '@/components/ItemCard';
import { SystemFrame } from '@/components/SystemFrame';
import { color } from '@/design/tokens';
import { alamStyles as s } from '@/features/alam/styles';
import { messageFor, type Failure } from '@/features/auth/problems';
import { useAuth } from '@/features/auth/useAuth';
import { CRAFTING_KEY, craftEquipment, useCraftingRecipes } from '@/features/crafting/api';
import { INVENTORY_QUERY_KEY } from '@/features/inventory/useInventory';
import { pendingActionIntentions } from '@/features/shop/actionKeyStore';
import { craftingWasRefused } from '@/features/crafting/refusal';

export default function Atelier() {
  const recipes = useCraftingRecipes();
  const auth = useAuth();
  const client = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [receipt, setReceipt] = useState<components['schemas']['CraftingReceipt'] | null>(null);
  const [pending, setPending] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const playerId = auth.status === 'signedIn' ? auth.user.id : null;
  const restorePending = useCallback(() => {
    if (!playerId) return;
    void pendingActionIntentions(`craft:${playerId}:`).then((intentions) => {
      setPending(intentions.map((intention) => intention.split(':').slice(2).join(':'))); setReady(true);
    }).catch(() => setFailure({ kind: 'offline' }));
  }, [playerId]);
  useEffect(restorePending, [restorePending]);
  const fabricate = async (key: string) => {
    if (auth.status !== 'signedIn' || busy) return;
    setBusy(key); setFailure(null); setReceipt(null);
    setPending((values) => [...new Set([...values, key])]);
    const outcome = await craftEquipment(auth.user.id, key);
    setBusy(null);
    if (outcome.kind === 'refused') {
      setFailure(outcome.failure);
      if (craftingWasRefused(outcome.failure)) setPending((values) => values.filter((value) => value !== key));
    }
    else { setReceipt(outcome.data); setPending((values) => values.filter((value) => value !== key)); }
    void client.invalidateQueries({ queryKey: CRAFTING_KEY });
    void client.invalidateQueries({ queryKey: INVENTORY_QUERY_KEY });
  };
  return <ScrollView contentContainerStyle={s.screen}>
    <Stack.Screen options={{ title: 'Atelier' }} />
    <Text style={s.title}>Donne forme à tes efforts</Text>
    <Text style={s.muted}>Transforme les ressources de ʿĀlam al-Nafs en équipements pour ton inventaire.</Text>
    {recipes.isPending && <ActivityIndicator color={color.accent} />}
    {recipes.isError && <SystemFrame contentStyle={s.card}><Text style={s.error}>{messageFor(recipes.error)}</Text>
      <Button label="Réessayer" onPress={() => void recipes.refetch()} /></SystemFrame>}
    {failure && <Text style={s.error} accessibilityLiveRegion="polite">{messageFor(failure)}</Text>}
    {!ready && failure && <Button label="Réessayer l’atelier" onPress={restorePending} />}
    {pending.map((key) => <SystemFrame key={key} contentStyle={s.card}>
      <Text style={s.body}>Fabrication à vérifier</Text>
      <Text style={s.muted}>Le résultat a pu être enregistré. Retrouve-le avant une nouvelle fabrication.</Text>
      <Button label="Vérifier la fabrication" busy={busy === key} disabled={busy !== null} onPress={() => void fabricate(key)} />
    </SystemFrame>)}
    {receipt && <SystemFrame tier="hero" contentStyle={s.card}>
      <Text style={s.label} accessibilityLiveRegion="polite">FABRICATION TERMINÉE</Text>
      <ItemCard item={receipt.result.item} quantity={receipt.result.quantity} />
      <Text style={s.body}>{receipt.result.ownedQuantity} dans ton inventaire</Text>
      <Button label="Voir l’équipement" onPress={() => router.push('/inventaire')} />
    </SystemFrame>}
    {recipes.data?.recipes.length === 0 && <Text style={s.muted}>Aucune recette publiée pour le moment.</Text>}
    {recipes.data?.recipes.map((recipe) => <SystemFrame key={recipe.key} contentStyle={s.card}>
      <ItemCard item={recipe.result.item} quantity={recipe.result.quantity} />
      <Text style={s.label}>RESSOURCES NÉCESSAIRES</Text>
      {recipe.costs.map((cost) => <View key={cost.item.key} style={s.group}>
        <ItemCard item={cost.item} quantity={cost.quantity} />
        <Text style={s.muted}>{cost.ownedQuantity} possédées · {cost.quantity} requises</Text>
      </View>)}
      {!recipe.canCraft && <Text style={s.muted}>Ressources insuffisantes. Elles se gagnent pendant le raid.</Text>}
      <Button label={`Fabriquer — ${recipe.result.item.name}`} disabled={!ready || !recipe.canCraft || busy !== null || pending.length > 0}
        busy={busy === recipe.key} onPress={() => void fabricate(recipe.key)} />
    </SystemFrame>)}
  </ScrollView>;
}
