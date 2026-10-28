using System;
using System.Linq;
using UnityEditor;
using UnityEngine;

public static class LivingArenaChecks
{
    public static object Run()
    {
        if (!EditorApplication.isPlaying) throw new InvalidOperationException("Check the arena in Play mode");
        var bridge = UnityEngine.Object.FindFirstObjectByType<BattleBridge>();
        bridge.Configure("{\"hud\":{\"playerHp\":100,\"enemyHp\":100}}");
        var arena = UnityEngine.Object.FindFirstObjectByType<ArenaLife>();
        if (arena == null || arena.GetComponentsInChildren<Collider>().Length != 0) throw new Exception("Missing arena or scenery colliders");
        var crowd = arena.GetComponentsInChildren<MeshFilter>().Where(m => m.name.StartsWith("Spectator ")).ToArray();
        if (crowd.Length != 18 || arena.GetComponentsInChildren<FighterPose>().Length != 0)
            throw new Exception("Expected 18 shared-mesh spectators and no extra fighter rigs");
        foreach (var poses in new[] { arena.malePoses, arena.femalePoses })
        {
            float Height(Mesh mesh) { var vertices = mesh.vertices; return mesh.triangles.Max(i => vertices[i].y); }
            if (Height(poses[2]) - Height(poses[0]) < .1f) throw new Exception("Crowd cheer does not raise its visible arms");
            if (poses.Any(p => p.vertexCount != poses[0].vertexCount)) throw new Exception("Crowd pose changed its topology");
        }
        var idle = new CombatPresentation.Frame { time = 1, opening = 1 / 3.4f };
        arena.DrawFrame(idle, true);
        if (Mathf.Abs(arena.referee.transform.position.x) > .01f || arena.referee.transform.position.z > -.8f)
            throw new Exception("Referee does not start behind the fighters");
        var before = crowd.Select(m => m.transform.position).ToArray();
        var crit = new CombatPresentation.Frame { time = 1, opening = -1,
            enemy = new CombatPresentation.FighterState { critical = true, effectOpacity = .8f } };
        arena.DrawFrame(crit, true);
        float jump = crowd.Select((m,i) => Vector3.Distance(m.transform.position, before[i])).Max();
        if (jump > .0001f) throw new Exception("A critical hit still moves the whole crowd");
        if (arena.referee.transform.position.z > -3f)
            throw new Exception("Referee still blocks the first exchange");
        var sampled = crowd.Select(m => m.transform.position).ToArray();
        arena.DrawFrame(crit, true);
        if (crowd.Where((m,i) => Vector3.Distance(m.transform.position,sampled[i]) > .0001f).Any())
            throw new Exception("A frozen replay clock advances the audience");
        crit.reduced = true; arena.DrawFrame(crit, true);
        var reduced = crowd.Select(m => m.transform.localToWorldMatrix).ToArray();
        crit.time = 2; crit.enemy.effectOpacity = 1; arena.DrawFrame(crit, true);
        if (crowd.Where((m,i) => m.transform.localToWorldMatrix != reduced[i]).Any()) throw new Exception("Reduced motion still moves the audience");
        crit.finished = true; arena.DrawFrame(crit,true);
        if (arena.referee.gameObject.activeSelf) throw new Exception("Referee hides the verdict");
        arena.DrawFrame(idle,true);
        if (!arena.referee.gameObject.activeSelf || Mathf.Abs(arena.referee.transform.position.x) > .01f)
            throw new Exception("Replay did not reset the introduction");
        bridge.Configure("{\"inspection\":true}");
        if (arena.gameObject.activeInHierarchy) throw new Exception("Arena leaked into Appearance");
        bridge.Configure("{}");
        if (!arena.gameObject.activeInHierarchy) throw new Exception("Arena did not return for combat");
        bridge.Configure("{\"hud\":{\"playerHp\":100,\"enemyHp\":100}}");
        var presentation = bridge.GetComponent<CombatPresentation>();
        foreach (var step in new[] { (0f,"3"), (.9f,"2"), (1.7f,"1"), (2.5f,"FIGHT !"), (3.4f,"") })
        {
            bridge.Present(JsonUtility.ToJson(new BattleBridge.Frame { presentation = new CombatPresentation.Frame {
                time = step.Item1, opening = step.Item1 < 3.4f ? step.Item1 / 3.4f : -1
            } }));
            presentation.SendMessage("LateUpdate");
            var countdown = presentation.GetComponentsInChildren<TMPro.TextMeshProUGUI>(true).Single(t => t.name == "Referee countdown");
            if (countdown.text != step.Item2 || !countdown.gameObject.activeInHierarchy)
                throw new Exception("Countdown not visible at " + step.Item1 + ": " + countdown.text);
        }
        int triangles = crowd.Sum(m => m.sharedMesh.triangles.Length / 3);
        return new { spectators = crowd.Length, crowdTriangles = triangles, criticalCrowdDisplacement = jump,
            staticClock = true, reducedMotion = true, refereeRetreated = true, inspectorRoundTrip = true, countdown = true };
    }
}
