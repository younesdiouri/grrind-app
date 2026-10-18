using System;
using System.Linq;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;

// Technical mannequin only. This scene does not validate the generated art direction.
public static class BuildBench
{
    public static string Create()
    {
        const string folder = "Assets/Spike";
        const string source = "Packages/com.unity.ai.assistant/Modules/Unity.AI.Animate/Motion/Runtime/Prefabs/Actors/biped_v1/Biped_Humanoid.fbx";
        var prefab = AssetDatabase.LoadAssetAtPath<GameObject>(source);
        if (prefab == null) throw new InvalidOperationException("Unity preview mannequin not found.");
        var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
        var actor = (GameObject)PrefabUtility.InstantiatePrefab(prefab);
        actor.name = "Technical mannequin - not generated art";
        var renderers = actor.GetComponentsInChildren<Renderer>();
        if (renderers.Length == 0) throw new InvalidOperationException("Mannequin has no renderer.");
        var bounds = renderers[0].bounds;
        foreach (var renderer in renderers.Skip(1)) bounds.Encapsulate(renderer.bounds);
        if (bounds.size.y <= 0) throw new InvalidOperationException("Mannequin has invalid bounds.");
        actor.transform.localScale *= 1.8f / bounds.size.y;
        bounds = renderers[0].bounds;
        foreach (var renderer in renderers.Skip(1)) bounds.Encapsulate(renderer.bounds);
        actor.transform.position -= new Vector3(bounds.center.x, bounds.min.y, bounds.center.z);

        var platform = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
        platform.name = "Inspection platform";
        platform.transform.position = new Vector3(0, -.055f, 0);
        platform.transform.localScale = new Vector3(2.5f, .05f, 2.5f);
        var materialPath = folder + "/Platform.mat";
        var material = AssetDatabase.LoadAssetAtPath<Material>(materialPath);
        if (material == null)
        {
            material = new Material(Shader.Find("Universal Render Pipeline/Lit"));
            AssetDatabase.CreateAsset(material, materialPath);
        }
        material.SetColor("_BaseColor", new Color(.035f, .055f, .085f));
        platform.GetComponent<Renderer>().sharedMaterial = material;

        var camera = new GameObject("Main Camera", typeof(Camera)).GetComponent<Camera>();
        camera.tag = "MainCamera";
        camera.transform.position = new Vector3(3.1f, 1.9f, 4.6f);
        camera.transform.LookAt(new Vector3(0, .95f, 0));
        camera.orthographic = true;
        camera.orthographicSize = 1.25f;
        camera.clearFlags = CameraClearFlags.SolidColor;
        camera.backgroundColor = new Color(.025f, .035f, .065f);
        camera.nearClipPlane = .05f;
        camera.farClipPlane = 30f;
        var key = new GameObject("Key", typeof(Light)).GetComponent<Light>();
        key.type = LightType.Directional;
        key.intensity = 2.2f;
        key.transform.rotation = Quaternion.Euler(40, -35, 0);
        var fill = new GameObject("Fill", typeof(Light)).GetComponent<Light>();
        fill.type = LightType.Directional;
        fill.color = new Color(.4f, .75f, 1f);
        fill.intensity = .6f;
        fill.transform.rotation = Quaternion.Euler(15, 150, 0);
        RenderSettings.ambientLight = new Color(.35f, .38f, .45f);
        RenderSettings.ambientMode = UnityEngine.Rendering.AmbientMode.Flat;
        var animator = actor.GetComponentInChildren<Animator>();
        EditorSceneManager.SaveScene(scene, folder + "/Bench.unity");
        AssetDatabase.SaveAssets();
        Selection.activeGameObject = actor;
        return JsonUtility.ToJson(new Report {
            scene = scene.path, humanoid = animator != null && animator.isHuman,
            renderers = renderers.Length,
            head = animator != null && animator.isHuman && animator.GetBoneTransform(HumanBodyBones.Head) != null,
            rightHand = animator != null && animator.isHuman && animator.GetBoneTransform(HumanBodyBones.RightHand) != null
        });
    }

    [Serializable] class Report
    {
        public string scene;
        public bool humanoid;
        public int renderers;
        public bool head;
        public bool rightHand;
    }
}
