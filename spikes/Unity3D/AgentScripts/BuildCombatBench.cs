using System;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;

public static class BuildCombatBench
{
    public static string Create()
    {
        var scene = EditorSceneManager.OpenScene("Assets/Spike/Bench.unity");
        var actor = UnityEngine.Object.FindFirstObjectByType<Animator>();
        if (actor == null || !actor.isHuman) throw new InvalidOperationException("Humanoid bench required.");
        var controller = new GameObject("C# inspection controls").AddComponent<CombatBench>();
        controller.actor = actor;
        controller.inspectionCamera = Camera.main;

        var hand = actor.GetBoneTransform(HumanBodyBones.RightHand);
        var grip = new GameObject("Technical dumbbell - fixed hand attachment").transform;
        grip.SetParent(hand, false);
        // Calibrated once for this mannequin, in hand space. Never corrected per stance.
        grip.localPosition = new Vector3(.062f,-.025f,-.007f);
        grip.localRotation = Quaternion.Euler(90,0,0);
        controller.equipment = grip;

        var iron = Material("TechnicalIron", new Color(.055f,.1f,.17f));
        var brass = Material("TechnicalBrass", new Color(.75f,.48f,.12f));
        Cylinder(grip, "Handle", 0, .011f, .13f, brass);
        foreach (float side in new[] { -1f, 1f })
        {
            Cylinder(grip, "Weight", side*.083f, .048f, .04f, iron);
            Cylinder(grip, "End cap", side*.106f, .019f, .008f, brass);
        }
        EditorSceneManager.SaveScene(scene, "Assets/Spike/CombatBench.unity", true);
        EditorSceneManager.OpenScene("Assets/Spike/CombatBench.unity");
        AssetDatabase.SaveAssets();
        return "C# combat bench saved; one fixed grip, four procedural test poses. Visual review required.";
    }

    static Material Material(string name, Color color)
    {
        var path = "Assets/Spike/" + name + ".mat";
        var material = AssetDatabase.LoadAssetAtPath<Material>(path);
        if (material == null)
        {
            material = new Material(Shader.Find("Universal Render Pipeline/Lit"));
            AssetDatabase.CreateAsset(material, path);
        }
        material.SetColor("_BaseColor", color);
        return material;
    }

    static void Cylinder(Transform parent, string name, float offset, float radius, float length, Material material)
    {
        var obj = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
        UnityEngine.Object.DestroyImmediate(obj.GetComponent<Collider>());
        obj.name = name;
        obj.transform.SetParent(parent, false);
        obj.transform.localPosition = Vector3.up*offset;
        obj.transform.localScale = new Vector3(radius*2,length/2,radius*2);
        obj.GetComponent<Renderer>().sharedMaterial = material;
    }
}
