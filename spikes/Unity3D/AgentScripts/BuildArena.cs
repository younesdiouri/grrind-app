using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;

public static class BuildArena
{
    const string Prefab = "Assets/Spike/MMOAthlete/Avatar.prefab";
    const string ShadowMaterial = "Assets/Spike/Shaders/ContactShadow.mat";
    const string FloorMaterial = "Assets/Spike/Shaders/FloorGlow.mat";

    public static string Create()
    {
        var avatar = AssetDatabase.LoadAssetAtPath<GameObject>(Prefab);
        if (avatar == null) throw new System.Exception("Run BuildMMO.Create first");
        var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
        var night = new Color(.0196f, .0314f, .0863f);

        var camera = new GameObject("Main Camera", typeof(Camera)).GetComponent<Camera>();
        camera.tag = "MainCamera";
        camera.orthographic = false;
        camera.fieldOfView = BattleBridge.CombatFieldOfView;
        camera.nearClipPlane = .05f;
        camera.farClipPlane = 20;
        camera.transform.position = BattleBridge.CombatCamera;
        camera.transform.LookAt(BattleBridge.CombatTarget);
        camera.clearFlags = CameraClearFlags.SolidColor;
        camera.backgroundColor = night;

        // Clear the whole native surface when the arena viewport changes (portrait inspector / landscape combat).
        var background = new GameObject("Background Camera", typeof(Camera)).GetComponent<Camera>();
        background.depth = -10;
        background.cullingMask = 0;
        background.clearFlags = CameraClearFlags.SolidColor;
        background.backgroundColor = night;

        // The toon shader reads the main light only: one key from above and to the side, so the ramp shows.
        var key = new GameObject("Key", typeof(Light)).GetComponent<Light>();
        key.type = LightType.Directional;
        key.transform.rotation = Quaternion.Euler(40, 125, 0);
        key.intensity = 1;
        key.color = new Color(1, .98f, .95f);
        key.shadows = LightShadows.None;
        RenderSettings.ambientMode = UnityEngine.Rendering.AmbientMode.Flat;
        RenderSettings.ambientLight = new Color(.5f, .52f, .57f);

        var shadow = Blob(ShadowMaterial, new Color(0, 0, .02f, .6f), 3000);
        // A soft lit floor behind the fighters, so their contact shadows read on the night background.
        var floor = GameObject.CreatePrimitive(PrimitiveType.Quad);
        Object.DestroyImmediate(floor.GetComponent<Collider>());
        floor.name = "Floor glow";
        floor.transform.SetPositionAndRotation(new Vector3(0, .001f, 0), Quaternion.Euler(90, 0, 0));
        floor.transform.localScale = new Vector3(7, 3.2f, 1);
        floor.GetComponent<MeshRenderer>().sharedMaterial = Blob(FloorMaterial, new Color(.17f, .25f, .45f, .55f), 2990);

        var bridge = new GameObject("BattleBridge").AddComponent<BattleBridge>();
        bridge.arenaCamera = camera;
        bridge.contactShadow = shadow;
        bridge.malePrefab = avatar;
        bridge.femalePrefab = avatar;
        EditorSceneManager.SaveScene(scene, "Assets/Spike/Arena.unity");
        return "Stylised Unity combat scene saved.";
    }

    static Material Blob(string path, Color colour, int queue)
    {
        var material = AssetDatabase.LoadAssetAtPath<Material>(path);
        if (material == null)
        {
            material = new Material(Shader.Find("GRRIND/Contact Shadow"));
            AssetDatabase.CreateAsset(material, path);
        }
        material.SetColor("_Color", colour);
        // The floor draws first, the fighters' shadows over it.
        material.renderQueue = queue;
        EditorUtility.SetDirty(material);
        return material;
    }
}
