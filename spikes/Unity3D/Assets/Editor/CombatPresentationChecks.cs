using System;
using System.Linq;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;

public static class CombatPresentationChecks
{
    public static void Run()
    {
        if (Application.isBatchMode && string.IsNullOrEmpty(SceneManager.GetActiveScene().path))
            EditorSceneManager.OpenScene("Assets/Spike/Arena.unity");
        foreach (bool won in new[] { true, false })
        foreach (float stageHeight in new[] { .4f, .7f })
        {
            var previous = SceneManager.GetActiveScene();
            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Additive);
            SceneManager.SetActiveScene(scene);
            try
            {
                var bridge = new GameObject("Presentation check").AddComponent<BattleBridge>();
                bridge.arenaCamera = new GameObject("Camera").AddComponent<Camera>();
                var config = new BattleBridge.Configuration {
                    player = new BattleBridge.AvatarConfig { body = "male", dumbbell = true },
                    enemy = new BattleBridge.AvatarConfig { body = "female", dumbbell = true },
                    viewport = new BattleBridge.Viewport { x = .04f, y = 0, width = .92f, height = stageHeight },
                    hud = new CombatPresentation.Configuration { won = won, playerHp = 100, enemyHp = 100 }
                };
                bridge.Configure(JsonUtility.ToJson(config));
                var actors = scene.GetRootGameObjects().Select(o => o.GetComponent<FighterPose>()).Where(p => p != null).ToArray();
                Require(actors.Length == 2, "Both combat actors must exist");
                var player = actors.Single(p => p.placement.x > 0);
                var enemy = actors.Single(p => p.placement.x < 0);
                Require(actors.All(p => p.GetComponent<WeaponGrip>().item.activeSelf), "Equipped weight must be visible in combat on both bodies");

                var frame = new BattleBridge.Frame { presentation = new CombatPresentation.Frame { finished = true, finale = 1 } };
                bridge.Present(JsonUtility.ToJson(frame));
                var winner = won ? player : enemy;
                Require(winner.gameObject.activeSelf && !((won ? enemy : player).gameObject.activeSelf), "Only the winner remains");
                Require(winner.placement.sqrMagnitude < .0001f && Mathf.Abs(winner.facing) < .01f, "Winner is centered and faces the camera");
                Require(winner.stance == 9, "Finale holds the victory pose");
                bridge.SendMessage("LateUpdate");
                // The verdict is a bust close-up (#282): chest above the controls, head below the gains.
                var chest = bridge.arenaCamera.WorldToViewportPoint(winner.actor.GetBoneTransform(HumanBodyBones.Chest).position);
                var head = bridge.arenaCamera.WorldToViewportPoint(winner.actor.GetBoneTransform(HumanBodyBones.Head).position);
                Require(chest.y > .10f && head.y < .70f && head.y > chest.y,
                    $"Finale frames the winner's bust between the controls and the gains (chest {chest.y:F2}, head {head.y:F2}, stage {stageHeight})");

                frame.presentation.finale = .5f;
                bridge.Present(JsonUtility.ToJson(frame));
                var ui = bridge.GetComponent<CombatPresentation>();
                ui.SendMessage("LateUpdate");
                var confetti = ui.GetComponentsInChildren<FacetedGraphic>(true).Where(p => p.name == "Confetti").ToArray();
                Require(confetti.Any(p => p.color.a > 0) == won, "Confetti celebrate a victory only");
                Require(!won || confetti.Any(p => p.color.a >= .9f), "Victory confetti must reach full readable opacity");
                frame.presentation.reduced = true;
                bridge.Present(JsonUtility.ToJson(frame));
                ui.SendMessage("LateUpdate");
                Require(confetti.All(p => p.color.a == 0), "Reduced motion suppresses confetti");

                frame.presentation.finished = false;
                bridge.Present(JsonUtility.ToJson(frame));
                Require(actors.All(p => p.gameObject.activeSelf), "Replay restores both actors");
            }
            finally
            {
                SceneManager.SetActiveScene(previous);
                EditorSceneManager.CloseScene(scene, true);
            }
        }
        Debug.Log("Combat presentation: equipment, centered neutral winner, confetti, reduced motion and replay PASS");
    }
    static void Require(bool condition, string message) { if (!condition) throw new Exception(message); }
}
