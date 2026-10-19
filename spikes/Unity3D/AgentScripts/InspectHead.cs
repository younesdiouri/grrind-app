using System;
using System.Linq;
using UnityEditor;
using UnityEngine;

// Deliberately simple geometry for testing depth and bone attachment, not final artwork.
public static class InspectHead
{
    public static string Setup()
    {
        var animator = UnityEngine.Object.FindFirstObjectByType<Animator>();
        if (animator == null || !animator.isHuman) throw new InvalidOperationException("Open Bench first.");
        var head = animator.GetBoneTransform(HumanBodyBones.Head);
        var old = head.Find("Technical goggles fixture");
        if (old != null) UnityEngine.Object.DestroyImmediate(old.gameObject);
        var root = new GameObject("Technical goggles fixture").transform;
        root.position = new Vector3(head.position.x, 1.685f, -.035f);
        root.SetParent(head, true);
        var frame = Material("FixtureFrame", new Color(.9f, .65f, .18f));
        var lens = Material("FixtureLens", new Color(.15f, .32f, .4f));
        for (int side = -1; side <= 1; side += 2)
        {
            float x = side * .037f;
            // A ring built from straight segments makes its real thickness and side visible.
            for (int i = 0; i < 24; i++)
            {
                float a = i * Mathf.PI / 12;
                float b = (i + 1) * Mathf.PI / 12;
                Rod(root, new Vector3(x + Mathf.Cos(a)*.03f, Mathf.Sin(a)*.026f, 0),
                    new Vector3(x + Mathf.Cos(b)*.03f, Mathf.Sin(b)*.026f, 0), .006f, frame);
            }
            var glass = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            glass.name = "Opaque technical lens";
            glass.transform.SetParent(root, false);
            glass.transform.localPosition = new Vector3(x, 0, -.003f);
            glass.transform.localRotation = Quaternion.Euler(90, 0, 0);
            glass.transform.localScale = new Vector3(.054f, .001f, .046f);
            glass.GetComponent<Renderer>().sharedMaterial = lens;
            Rod(root, new Vector3(side * .069f, .008f, -.002f),
                new Vector3(side * .079f, .008f, -.115f), .005f, frame);
        }
        Rod(root, new Vector3(-.007f, .006f, 0), new Vector3(.007f, .006f, 0), .005f, frame);
        return "Temporary technical fixture attached. Do not save it as final artwork.";
    }

    public static string View(float azimuth, float headTurn = 0)
    {
        var animator = UnityEngine.Object.FindFirstObjectByType<Animator>();
        var head = animator.GetBoneTransform(HumanBodyBones.Head);
        // Preserve imported bone basis. Its local up axis is not the character's world up.
        var source = AssetDatabase.LoadAssetAtPath<GameObject>("Packages/com.unity.ai.assistant/Modules/Unity.AI.Animate/Motion/Runtime/Prefabs/Actors/biped_v1/Biped_Humanoid.fbx");
        var sourceHead = source.GetComponentsInChildren<Transform>().Single(t => t.name == head.name);
        if (sourceHead == null) throw new InvalidOperationException("The fixture expects the imported bench mannequin.");
        var rest = head.parent.rotation * sourceHead.localRotation;
        head.rotation = Quaternion.AngleAxis(headTurn, Vector3.up) * rest;
        foreach (var renderer in animator.GetComponentsInChildren<SkinnedMeshRenderer>())
            renderer.updateWhenOffscreen = true;
        EditorApplication.QueuePlayerLoopUpdate();
        var camera = Camera.main;
        var target = new Vector3(0, 1.68f, -.12f);
        camera.transform.position = target + Quaternion.Euler(0, azimuth, 0) * new Vector3(0, .03f, .8f);
        camera.transform.LookAt(target);
        camera.orthographicSize = .19f;
        return $"Technical head inspection: camera {azimuth}, head {headTurn}.";
    }

    static Material Material(string name, Color color)
    {
        var material = new Material(Shader.Find("Universal Render Pipeline/Lit")) {
            name = name, hideFlags = HideFlags.DontSave
        };
        material.SetColor("_BaseColor", color);
        return material;
    }

    static void Rod(Transform parent, Vector3 a, Vector3 b, float diameter, Material material)
    {
        var rod = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
        rod.name = "Technical frame segment";
        rod.transform.SetParent(parent, false);
        rod.transform.localPosition = (a+b)/2;
        rod.transform.localRotation = Quaternion.FromToRotation(Vector3.up, (b-a).normalized);
        rod.transform.localScale = new Vector3(diameter, Vector3.Distance(a,b)/2, diameter);
        rod.GetComponent<Renderer>().sharedMaterial = material;
    }
}
