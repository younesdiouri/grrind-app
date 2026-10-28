using System;
using System.Linq;
using System.Reflection;
using UnityEditor;
using UnityEngine;

public static class CaillouxChecks
{
    static readonly BindingFlags Private = BindingFlags.Instance | BindingFlags.NonPublic;
    static void Solve(FighterPose pose) => typeof(FighterPose).GetMethod("LateUpdate", Private).Invoke(pose, null);
    static Vector3[] Vertices(FighterPose pose, Mesh baked) => pose.GetComponentsInChildren<SkinnedMeshRenderer>()
        .SelectMany(renderer => { renderer.BakeMesh(baked); return baked.vertices.Select(renderer.transform.TransformPoint).ToArray(); }).ToArray();

    public static object Playback()
    {
        if (!EditorApplication.isPlaying) throw new InvalidOperationException("Check in Play mode");
        CaillouxMob.Validate();
        var bridge = UnityEngine.Object.FindFirstObjectByType<BattleBridge>();
        bridge.Configure("{\"enemy\":{\"model\":\"cailloux\"},\"hud\":{\"playerHp\":100,\"enemyHp\":100,\"won\":true}}");
        var player = (FighterPose)typeof(BattleBridge).GetField("player", Private).GetValue(bridge);
        var enemy = (FighterPose)typeof(BattleBridge).GetField("enemy", Private).GetValue(bridge);
        if (enemy.Bone(HumanBodyBones.Chest).position.y < .5f || enemy.Bone(HumanBodyBones.RightHand) == enemy.actor.transform)
            throw new Exception("Cailloux impacts still use the ground instead of the torso/hand sockets");
        var baked = new Mesh();
        float minimumFloor = float.MaxValue, maximumFloor = float.MinValue, knockoutHeight = 0;
        float movement = 0, playerGap = 0, enemyGap = 0;
        int samples = 0;
        try
        {
            for (int stance = 0; stance <= 9; stance++)
            {
                Vector3[] first = null;
                float poseMotion = 0;
                for (int step = 0; step <= 4; step++)
                {
                    float phase = step / 4f;
                    bridge.Present(JsonUtility.ToJson(new BattleBridge.Frame {
                        player = new BattleBridge.ActorFrame { pose = 2, phase = phase },
                        enemy = new BattleBridge.ActorFrame { pose = stance, phase = phase }
                    }));
                    Solve(player); Solve(enemy);
                    if (Quaternion.Angle(enemy.actor.transform.rotation, Quaternion.Euler(0, 65, 0)) > .1f)
                        throw new Exception("Cailloux faces away from the opponent");
                    var vertices = Vertices(enemy, baked);
                    float floor = vertices.Min(v => v.y);
                    minimumFloor = Mathf.Min(minimumFloor, floor); maximumFloor = Mathf.Max(maximumFloor, floor);
                    if (floor < -.04f || floor > .06f) throw new Exception($"Cailloux leaves the floor: {stance}/{phase} = {floor}");
                    if (first == null) first = vertices;
                    else poseMotion = Mathf.Max(poseMotion, vertices.Select((v, i) => Vector3.Distance(v, first[i])).Max());
                    if (stance == 8 && step == 4) knockoutHeight = vertices.Max(v => v.y) - floor;
                    samples++;
                }
                if (stance <= 6 && poseMotion < (stance == 0 ? .001f : .015f))
                    throw new Exception("Frozen Cailloux posture: " + stance);
                movement = Mathf.Max(movement, poseMotion);
            }
            if (knockoutHeight > .95f) throw new Exception("Cailloux does not stay down after knockout: " + knockoutHeight);
            foreach (bool playerAttacks in new[] { true, false })
            {
                bridge.Present(JsonUtility.ToJson(new BattleBridge.Frame {
                    player = new BattleBridge.ActorFrame { pose = playerAttacks ? 1 : 2, phase = .5f },
                    enemy = new BattleBridge.ActorFrame { pose = playerAttacks ? 2 : 1, phase = .5f }
                }));
                Solve(player); Solve(enemy);
                var hand = playerAttacks ? player.Bone(HumanBodyBones.RightHand)
                    : enemy.GetComponentsInChildren<Transform>().Single(t => t.name == "RightHand");
                float gap = Vertices(playerAttacks ? enemy : player, baked).Min(v => Vector3.Distance(v, hand.position));
                if (gap > .30f) throw new Exception("Cailloux contact misses by " + gap + " m, player attacks=" + playerAttacks);
                if (playerAttacks) playerGap = gap; else enemyGap = gap;
            }
            bridge.Present(JsonUtility.ToJson(new BattleBridge.Frame {
                presentation = new CombatPresentation.Frame { finished = true, finale = 1 }
            }));
            Solve(player);
            if (enemy.gameObject.activeSelf || player.stance != 9) throw new Exception("The PvE finale did not complete");
            bridge.Present("{}");
            return new { samples, minimumFloor, maximumFloor, movement, knockoutHeight, playerGap, enemyGap, finale = true };
        }
        finally { UnityEngine.Object.DestroyImmediate(baked); }
    }
}
