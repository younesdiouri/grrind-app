using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;

public static class BuildArena
{
    const string ShadowMaterial = "Assets/Spike/Shaders/ContactShadow.mat";
    const string FloorMaterial = "Assets/Spike/Shaders/FloorGlow.mat";

    public static string Create(string avatarName = "PaintedAthlete")
    {
        var avatar = AssetDatabase.LoadAssetAtPath<GameObject>("Assets/Spike/" + avatarName + "/Avatar.prefab");
        if (avatar == null) throw new System.Exception("Run BuildChunky.Create first");
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

        // Key from above and to the side; the toon shader of the former MMO avatar reads only this one.
        var key = new GameObject("Key", typeof(Light)).GetComponent<Light>();
        key.type = LightType.Directional;
        key.transform.rotation = Quaternion.Euler(40, 125, 0);
        key.color = new Color(1, .98f, .95f);
        key.shadows = LightShadows.None;
        key.intensity = 1.25f;
        // Back light towards the camera: the satin rim of the concept.
        var rim = new GameObject("Rim", typeof(Light)).GetComponent<Light>();
        rim.type = LightType.Directional;
        rim.transform.rotation = Quaternion.Euler(25, 30, 0);
        rim.intensity = 1.1f;
        rim.color = new Color(.62f, .85f, 1);
        rim.shadows = LightShadows.None;
        // Three-tone sky: cool from above, warm bounce from the floor, as on the concept board.
        RenderSettings.ambientMode = UnityEngine.Rendering.AmbientMode.Trilight;
        RenderSettings.ambientSkyColor = new Color(.56f, .63f, .86f);
        RenderSettings.ambientEquatorColor = new Color(.42f, .41f, .5f);
        RenderSettings.ambientGroundColor = new Color(.3f, .24f, .22f);

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
