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
        var material = AssetDatabase.LoadAssetAtPath<Material>(Folder + "Gold.mat");
        if (material == null) { material = new Material(Shader.Find("Universal Render Pipeline/Lit")); AssetDatabase.CreateAsset(material, Folder + "Gold.mat"); }
        material.SetTexture("_BaseMap", AssetDatabase.LoadAssetAtPath<Texture2D>(Folder + "BaseColor.png"));
        material.SetColor("_BaseColor", Color.white);
        material.SetFloat("_Metallic", .15f); material.SetFloat("_Smoothness", .3f);
        EditorUtility.SetDirty(material);
        var pose = System.IO.File.ReadAllLines("../art-source/le-poids-lourd/grip-rotations.txt").Select(line => line.Split(' ')).ToArray();
        foreach (var name in new[] { "QuaterniusShowcase", "QuaterniusFemale" })
        {
            var path = "Assets/Resources/" + name + ".prefab";
            var root = PrefabUtility.LoadPrefabContents(path);
            try
            {
                var grip = root.GetComponent<DumbbellGrip>() ?? root.AddComponent<DumbbellGrip>();
                if (grip.item != null) UnityEngine.Object.DestroyImmediate(grip.item);
                var hand = root.GetComponent<Animator>().GetBoneTransform(HumanBodyBones.RightHand);
                grip.item = UnityEngine.Object.Instantiate(AssetDatabase.LoadAssetAtPath<GameObject>(Folder + "LePoidsLourd.fbx"), hand, false);
                grip.item.name = "Le Poids Lourd";
                grip.item.transform.localPosition = new Vector3(.024f, .100f, 0);
                grip.item.transform.localRotation = Quaternion.Euler(0, 90, 0);
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
                var grip = root.GetComponent<DumbbellGrip>();
                var appearance = root.GetComponent<QuaterniusAppearance>();
                if (grip == null || grip.item == null || grip.fingers.Length != 15 || grip.rotations.Length != 15) throw new Exception(name + ": incomplete grip");
                appearance.SetBoxingGloves(true); grip.SetEquipped(true); grip.Apply();
                if (!grip.item.activeSelf || appearance.boxingGloves.Any(g => g.activeSelf)) throw new Exception(name + ": conflicting items");
                for (int i = 0; i < appearance.gloveArms.Length; i++)
                    if (appearance.gloveArms[i].sharedMesh != appearance.bareHandMeshes[i]) throw new Exception(name + ": missing hand");
                for (int i = 0; i < grip.fingers.Length; i++)
                    if (Quaternion.Angle(grip.fingers[i].localRotation, grip.rotations[i]) > .01f) throw new Exception(name + ": unstable grip");
                appearance.SetBoxingGloves(true);
                if (grip.item.activeSelf) throw new Exception(name + ": dumbbell did not unequip");
                var before = grip.fingers[0].localRotation = Quaternion.identity; grip.Apply();
                if (grip.fingers[0].localRotation != before) throw new Exception(name + ": unequipped grip overrides animation");
            }
            finally { UnityEngine.Object.DestroyImmediate(root); }
        }
        Debug.Log("Le Poids Lourd: grip, visible hands, mutual exclusion and unequip PASS");
    }
}
