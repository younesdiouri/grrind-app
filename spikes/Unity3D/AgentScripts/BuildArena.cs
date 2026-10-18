using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;

public static class BuildArena
{
    public static string Create()
    {
        var scene=EditorSceneManager.NewScene(NewSceneSetup.EmptyScene,NewSceneMode.Single);
        var camera=new GameObject("Main Camera",typeof(Camera)).GetComponent<Camera>();camera.tag="MainCamera";
        camera.orthographic=true;camera.orthographicSize=1.15f;camera.nearClipPlane=.05f;camera.farClipPlane=20;
        camera.transform.position=new Vector3(0,1.25f,6);camera.transform.LookAt(Vector3.up*.95f);
        camera.clearFlags=CameraClearFlags.SolidColor;camera.backgroundColor=new Color(.0196f,.0314f,.0863f);
        // Clear the whole native surface when the arena viewport changes (portrait inspector / landscape combat).
        var background=new GameObject("Background Camera",typeof(Camera)).GetComponent<Camera>();
        background.depth=-10;background.cullingMask=0;background.clearFlags=CameraClearFlags.SolidColor;background.backgroundColor=camera.backgroundColor;
        var key=new GameObject("Key",typeof(Light)).GetComponent<Light>();key.type=LightType.Directional;key.transform.rotation=Quaternion.Euler(42,145,0);key.intensity=1.2f;key.color=new Color(1,.95f,.88f);
        var fill=new GameObject("Fill",typeof(Light)).GetComponent<Light>();fill.type=LightType.Directional;fill.transform.rotation=Quaternion.Euler(20,-35,0);fill.intensity=.45f;fill.color=new Color(.72f,.8f,1);
        RenderSettings.ambientMode=UnityEngine.Rendering.AmbientMode.Flat;RenderSettings.ambientLight=new Color(.5f,.52f,.57f);
        var bridge=new GameObject("BattleBridge").AddComponent<BattleBridge>();bridge.arenaCamera=camera;
        bridge.malePrefab=AssetDatabase.LoadAssetAtPath<GameObject>("Assets/Spike/Muscu/Avatar.prefab");
        bridge.femalePrefab=AssetDatabase.LoadAssetAtPath<GameObject>("Assets/Spike/Female/Avatar.prefab");
        if(bridge.malePrefab==null||bridge.femalePrefab==null)throw new System.Exception("Build both avatar prefabs first");
        EditorSceneManager.SaveScene(scene,"Assets/Spike/Arena.unity");return "Single fullscreen Unity combat scene saved.";
    }
}
