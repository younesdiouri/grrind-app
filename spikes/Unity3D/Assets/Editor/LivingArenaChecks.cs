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
        var crowd = arena.GetComponentsInChildren<Animator>().Where(m => m.name.StartsWith("Spectator ")).ToArray();
        if (crowd.Length != 18 || arena.GetComponentsInChildren<FighterPose>().Length != 0)
            throw new Exception("Expected 18 scenery animators and no extra fighter logic");
        if (arena.crowdClips.Any(c => !c.isHumanMotion || !c.isLooping)) throw new Exception("Crowd motions must be looping Humanoid clips");
        Vector3[] Hands() => crowd.SelectMany(a => new[] { a.GetBoneTransform(HumanBodyBones.LeftHand).position,
            a.GetBoneTransform(HumanBodyBones.RightHand).position }).ToArray();
        float Difference(Vector3[] a, Vector3[] b) => a.Select((p,i) => Vector3.Distance(p,b[i])).Max();
        var idle = new CombatPresentation.Frame { time = 1, opening = 1 / 3.4f };
        arena.DrawFrame(idle, true);
        if (Mathf.Abs(arena.referee.transform.position.x) > .01f || arena.referee.transform.position.z > -.8f)
            throw new Exception("Referee does not start behind the fighters");
        var before = crowd.Select(m => m.transform.position).ToArray();
        var beforeHands = Hands();
        var crit = new CombatPresentation.Frame { time = 1, opening = -1,
            enemy = new CombatPresentation.FighterState { critical = true, effectOpacity = .8f } };
        arena.DrawFrame(crit, true);
        float jump = crowd.Select((m,i) => Vector3.Distance(m.transform.position, before[i])).Max();
        if (jump > .0001f) throw new Exception("A critical hit still moves the whole crowd");
        if (Difference(beforeHands, Hands()) > .0001f) throw new Exception("A critical hit still changes the crowd gesture");
        if (arena.referee.transform.position.z > -3f)
            throw new Exception("Referee still blocks the first exchange");
        var sampled = Hands();
        arena.DrawFrame(crit, true);
        if (Difference(sampled, Hands()) > .0001f)
            throw new Exception("A frozen replay clock advances the audience");
        crit.reduced = true; arena.DrawFrame(crit, true);
        var reduced = Hands();
        crit.time = 2; crit.enemy.effectOpacity = 1; arena.DrawFrame(crit, true);
        if (Difference(reduced, Hands()) > .0001f) throw new Exception("Reduced motion still moves the audience");
        crit.reduced = false; crit.time = 1; arena.DrawFrame(crit,true);
        if (Difference(sampled, Hands()) > .0001f) throw new Exception("Rewinding does not restore the crowd pose");
        float maxHandStep = 0, motion = 0;
        var movement = new float[crowd.Length];
        var previous = Hands();
        for (int step = 1; step <= 400; step++)
        {
            crit.time = 1 + step * .025f; arena.DrawFrame(crit,true);
            var hands = Hands();
            maxHandStep = Mathf.Max(maxHandStep, Difference(previous,hands));
            for (int i = 0; i < movement.Length; i++)
                movement[i] = Mathf.Max(movement[i], Vector3.Distance(sampled[i*2],hands[i*2]), Vector3.Distance(sampled[i*2+1],hands[i*2+1]));
            motion = Mathf.Max(motion,Difference(sampled,hands)); previous = hands;
        }
        if (maxHandStep > .12f || motion < .15f) throw new Exception("Crowd hands snap or stay frozen: " + maxHandStep + "/" + motion);
        if (movement.Min() < .05f) throw new Exception("A spectator is not cheering");
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
        int triangles = crowd.Sum(a => a.GetComponentsInChildren<SkinnedMeshRenderer>().Sum(r => r.sharedMesh.triangles.Length / 3));
        return new { spectators = crowd.Length, crowdTriangles = triangles, criticalCrowdDisplacement = jump, maxHandStep, motion, minimumIndividualMotion = movement.Min(),
            staticClock = true, reducedMotion = true, refereeRetreated = true, inspectorRoundTrip = true, countdown = true };
    }
}
