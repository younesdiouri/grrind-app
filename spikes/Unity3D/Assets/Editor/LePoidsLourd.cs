using System;
using System.Globalization;
using System.Linq;
using UnityEditor;
using UnityEngine;

public static class LePoidsLourd
{
    const string Folder = "Assets/Characters/LePoidsLourd/";
    public static void Build()
    {
        AssetDatabase.Refresh(ImportAssetOptions.ForceSynchronousImport);
        var material = ToonMaterials.At(Folder + "Gold.mat");
        material.SetTexture("_BaseMap", AssetDatabase.LoadAssetAtPath<Texture2D>(Folder + "BaseColor.png"));
        material.SetColor("_BaseColor", Color.white);
        ToonMaterials.Metal(material, Folder, "Gold");
        foreach (var name in new[] { "QuaterniusShowcase", "QuaterniusFemale" })
        {
            bool female = name == "QuaterniusFemale";
            var pose = System.IO.File.ReadAllLines("../art-source/hand-grips/cylindrical-" + (female ? "female" : "male") + ".txt").Select(line => line.Split(' ')).ToArray();
            var path = "Assets/Resources/" + name + ".prefab";
            var root = PrefabUtility.LoadPrefabContents(path);
            try
            {
                var grip = root.GetComponent<WeaponGrip>() ?? root.AddComponent<WeaponGrip>();
                if (grip.item != null) UnityEngine.Object.DestroyImmediate(grip.item);
                var hand = root.GetComponent<Animator>().GetBoneTransform(HumanBodyBones.RightHand);
                grip.item = UnityEngine.Object.Instantiate(AssetDatabase.LoadAssetAtPath<GameObject>(Folder + "LePoidsLourd.fbx"), hand, false);
                grip.item.name = "Le Poids Lourd";
                grip.item.transform.localPosition = female ? new Vector3(.020f, .070f, 0) : new Vector3(.023f, .099f, 0);
                grip.item.transform.localRotation = Quaternion.FromToRotation(Vector3.right, new Vector3(0, .24f, 1).normalized);
                grip.item.GetComponentInChildren<MeshRenderer>().sharedMaterial = material;
                grip.fingers = pose.Select(row => hand.GetComponentsInChildren<Transform>().Single(t => t.name == row[0])).ToArray();
                grip.rotations = pose.Select(row => { var q = row.Skip(1).Select(v => float.Parse(v, CultureInfo.InvariantCulture)).ToArray(); return new Quaternion(q[0], q[1], q[2], q[3]); }).ToArray();
                grip.SetEquipped(false);
                PrefabUtility.SaveAsPrefabAsset(root, path);
            }
            finally { PrefabUtility.UnloadPrefabContents(root); }
        }
        AssetDatabase.SaveAssets();
        Validate();
    }

    public static void Validate()
    {
        foreach (var name in new[] { "QuaterniusShowcase", "QuaterniusFemale" })
        {
            var root = UnityEngine.Object.Instantiate(AssetDatabase.LoadAssetAtPath<GameObject>("Assets/Resources/" + name + ".prefab"));
            try
            {
                var grip = root.GetComponent<WeaponGrip>();
                var appearance = root.GetComponent<QuaterniusAppearance>();
                if (grip == null || grip.item == null || grip.fingers.Length != 15 || grip.rotations.Length != 15) throw new Exception(name + ": incomplete grip");
                appearance.SetBoxingGloves(true); grip.SetEquipped(true); grip.Apply();
                if (!grip.item.activeSelf || appearance.boxingGloves.Any(g => g.activeSelf)) throw new Exception(name + ": conflicting items");
                for (int i = 0; i < appearance.gloveArms.Length; i++)
                    if (appearance.gloveArms[i].sharedMesh != appearance.bareHandMeshes[i]) throw new Exception(name + ": missing hand");
                for (int i = 0; i < grip.fingers.Length; i++)
                    if (Quaternion.Angle(grip.fingers[i].localRotation, grip.rotations[i]) > .01f) throw new Exception(name + ": unstable grip");
                // The shaft must lie inside each closed finger contour in its cross-section.
                // This detects the old shared socket placed in front of the female fingers.
                var hand = grip.item.transform.parent;
                var axis = grip.item.transform.localRotation * Vector3.right;
                foreach (var finger in new[] { "index", "middle", "ring", "pinky" })
                {
                    var contour = Enumerable.Range(1, 4).Select(i => hand.GetComponentsInChildren<Transform>().Single(t =>
                        t.name == finger + "_0" + i + (i == 4 ? "_leaf_r" : "_r")))
                        .Select(t => Vector3.ProjectOnPlane(hand.InverseTransformPoint(t.position) - grip.item.transform.localPosition, axis)).ToArray();
                    float winding = 0;
                    for (int i = 0; i < 4; i++) winding += Vector3.SignedAngle(contour[i], contour[(i + 1) % 4], axis);
                    if (Mathf.Abs(winding) < 350) throw new Exception(name + ": shaft outside " + finger);
                }
                appearance.SetBoxingGloves(true);
                if (grip.item.activeSelf) throw new Exception(name + ": dumbbell did not unequip");
                var before = grip.fingers[0].localRotation = Quaternion.identity; grip.Apply();
                if (grip.fingers[0].localRotation != before) throw new Exception(name + ": unequipped grip overrides animation");
            }
            finally { UnityEngine.Object.DestroyImmediate(root); }
        }
        Debug.Log("Le Poids Lourd: grip, visible hands, mutual exclusion and unequip PASS");
    }

    // Reproducible geometric diagnostic, not a claim of collision-free animation.
    public static string CheckTwoCombatAttacks()
    {
        var samples = new System.Collections.Generic.List<string>();
        foreach (var name in new[] { "QuaterniusShowcase", "QuaterniusFemale" })
        {
            var root = UnityEngine.Object.Instantiate(AssetDatabase.LoadAssetAtPath<GameObject>("Assets/Resources/" + name + ".prefab"));
            try
            {
                var pose = root.GetComponent<FighterPose>();
                if (!Application.isPlaying) pose.SendMessage("Awake");
                pose.inspect = false;
                var grip = root.GetComponent<WeaponGrip>(); grip.SetEquipped(true);
                foreach (int stance in new[] { 1, 3 })
                foreach (float phase in Enumerable.Range(0, 21).Select(i => i / 20f))
                {
                    pose.stance = stance; pose.phase = phase; pose.SendMessage("LateUpdate");
                    var hits = new System.Collections.Generic.Dictionary<string, int>();
                    foreach (var renderer in root.GetComponentsInChildren<SkinnedMeshRenderer>())
                    {
                        var mesh = new Mesh(); renderer.BakeMesh(mesh);
                        var vertices = mesh.vertices; var weights = renderer.sharedMesh.boneWeights;
                        for (int i = 0; i < vertices.Length && i < weights.Length; i++)
                        {
                            var point = grip.item.transform.InverseTransformPoint(renderer.transform.TransformPoint(vertices[i]));
                            if (Mathf.Abs(point.x) < .15f || Mathf.Abs(point.x) > .31f || point.y * point.y + point.z * point.z > .14f * .14f) continue;
                            var w = weights[i]; int bone = w.boneIndex0; float weight = w.weight0;
                            if (w.weight1 > weight) { bone = w.boneIndex1; weight = w.weight1; }
                            if (w.weight2 > weight) { bone = w.boneIndex2; weight = w.weight2; }
                            if (w.weight3 > weight) bone = w.boneIndex3;
                            string part = renderer.bones[bone].name;
                            hits[part] = hits.TryGetValue(part, out int count) ? count + 1 : 1;
                        }
                        UnityEngine.Object.DestroyImmediate(mesh);
                    }
                    samples.Add(name + " pose=" + stance + " phase=" + phase.ToString(CultureInfo.InvariantCulture) + ": " + string.Join(",", hits.Select(kv => kv.Key + "=" + kv.Value)));
                }
            }
            finally { UnityEngine.Object.DestroyImmediate(root); }
        }
        return string.Join("\n", samples);
    }
}
