using System;
using System.Collections.Generic;
using System.Linq;
using UnityEditor;
using UnityEngine;

public static class WinterArenaChecks
{
    public static object ValidateMotion()
    {
        if (!EditorApplication.isPlaying) throw new InvalidOperationException("Check in Play mode after Configure");
        var bridge = UnityEngine.Object.FindFirstObjectByType<BattleBridge>();
        var poses = UnityEngine.Object.FindObjectsByType<FighterPose>(FindObjectsSortMode.None);
        if (poses.Length != 2 || !bridge.combatEnvironment.activeSelf || bridge.inspectionFloor.activeSelf)
            throw new Exception("Expected a duel on the winter ground");
        if (bridge.combatEnvironment.GetComponentsInChildren<Collider>().Length != 0)
            throw new Exception("Scenery must not participate in combat physics");
        var obstacles = new List<Bounds>();
        foreach (var filter in bridge.combatEnvironment.GetComponentsInChildren<MeshFilter>())
        {
            var vertices = filter.sharedMesh.vertices; var triangles = filter.sharedMesh.triangles;
            for (int i = 0; i < triangles.Length; i += 3)
            {
                var bounds = new Bounds(filter.transform.TransformPoint(vertices[triangles[i]]), Vector3.zero);
                bounds.Encapsulate(filter.transform.TransformPoint(vertices[triangles[i + 1]]));
                bounds.Encapsulate(filter.transform.TransformPoint(vertices[triangles[i + 2]]));
                if (bounds.max.y > .02f) obstacles.Add(bounds);
            }
        }
        int samples = 0;
        float minZ = float.MaxValue, maxZ = float.MinValue, maxX = 0;
        var baked = new Mesh();
        try
        {
            foreach (float aspect in new[] { 2.1f, 2.54f, 2.9f })
            foreach (int stance in Enumerable.Range(0, 7))
            foreach (bool playerAttacks in new[] { true, false })
            for (int step = 0; step <= 10; step++)
            {
                bridge.arenaCamera.aspect = aspect;
                float phase = step / 10f;
                bridge.Present(JsonUtility.ToJson(new BattleBridge.Frame {
                    player = new BattleBridge.ActorFrame { pose = playerAttacks ? stance : 2, phase = phase, x = -.06f },
                    enemy = new BattleBridge.ActorFrame { pose = playerAttacks ? 2 : stance, phase = phase, x = .06f }
                }));
                foreach (var pose in poses)
                {
                    pose.SendMessage("LateUpdate");
                    if (Mathf.Abs(pose.placement.y) > .0001f) throw new Exception("Actor left the ground plane");
                    Bounds actor = default; bool first = true;
                    foreach (var renderer in pose.GetComponentsInChildren<SkinnedMeshRenderer>())
                    {
                        renderer.BakeMesh(baked);
                        foreach (var vertex in baked.vertices)
                        {
                            var world = renderer.transform.TransformPoint(vertex);
                            if (first) { actor = new Bounds(world, Vector3.zero); first = false; }
                            else actor.Encapsulate(world);
                        }
                    }
                    if (first) throw new Exception("No visible fighter mesh");
                    if (obstacles.Any(obstacle => obstacle.Intersects(actor)))
                        throw new Exception("Fighter overlaps raised scenery: " + stance + "/" + phase);
                    minZ = Mathf.Min(minZ, actor.min.z); maxZ = Mathf.Max(maxZ, actor.max.z);
                    maxX = Mathf.Max(maxX, Mathf.Abs(actor.min.x), Mathf.Abs(actor.max.x)); samples++;
                }
            }
        }
        finally { UnityEngine.Object.DestroyImmediate(baked); }
        // Reconfigure the real bridge in both directions, including the inspector's old floor.
        bridge.Configure("{\"inspection\":true}");
        if (bridge.combatEnvironment.activeSelf || !bridge.inspectionFloor.activeSelf || !bridge.arenaCamera.orthographic)
            throw new Exception("Winter scenery leaked into the inspector");
        bridge.Configure("{}");
        if (!bridge.combatEnvironment.activeSelf || bridge.inspectionFloor.activeSelf || bridge.arenaCamera.orthographic)
            throw new Exception("Winter scenery did not return for combat");
        bridge.arenaCamera.aspect = 2.54f; bridge.Present("{}");
        return new { samples, minZ, maxZ, maxX, sceneryOverlaps = 0, inspectorRoundTrip = true };
    }
}
