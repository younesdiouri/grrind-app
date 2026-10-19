using System.Linq;
using UnityEditor;
using UnityEditor.Animations;
using UnityEditor.SceneManagement;
using UnityEngine;

public static class ProbeRetarget
{
    public static string Create()
    {
        var scene=EditorSceneManager.NewScene(NewSceneSetup.EmptyScene,NewSceneMode.Single);
        var clip=AssetDatabase.LoadAllAssetsAtPath("Assets/Animations/Quaternius/UAL2Clean.fbx").OfType<AnimationClip>().Single(c=>c.name=="Armature|Idle_Shield_Loop");
        const string path="Assets/Spike/RetargetProbe.controller";
        AssetDatabase.DeleteAsset(path);
        var controller=AnimatorController.CreateAnimatorControllerAtPath(path);
        var state=controller.layers[0].stateMachine.AddState("Guard");state.motion=clip;controller.layers[0].stateMachine.defaultState=state;
        var material=AssetDatabase.LoadAssetAtPath<Material>("Assets/Spike/Muscu/Skin.mat");
        var sources=new[]{"Assets/Animations/Quaternius/UAL2Clean.fbx","Assets/Characters/Quaternius/Superhero_Male_FullBody.fbx"};
        for(int i=0;i<sources.Length;i++)
        {
            var actor=Object.Instantiate(AssetDatabase.LoadAssetAtPath<GameObject>(sources[i]));actor.name=i==0?"Source animation rig":"Target base rig";
            actor.transform.position=Vector3.right*(i==0?-.7f:.7f);
            foreach(var r in actor.GetComponentsInChildren<Renderer>())r.sharedMaterial=material;
            var animator=actor.GetComponent<Animator>();animator.runtimeAnimatorController=controller;animator.applyRootMotion=false;
        }
        var camera=new GameObject("Main Camera",typeof(Camera)).GetComponent<Camera>();camera.tag="MainCamera";camera.orthographic=true;camera.orthographicSize=1.1f;
        camera.transform.position=new Vector3(0,1.4f,5);camera.transform.LookAt(Vector3.up*.95f);camera.backgroundColor=new Color(.025f,.035f,.065f);
        var light=new GameObject("Key",typeof(Light)).GetComponent<Light>();light.type=LightType.Directional;light.transform.rotation=Quaternion.Euler(30,-30,0);light.intensity=1.5f;
        RenderSettings.ambientLight=new Color(.5f,.5f,.5f);
        EditorSceneManager.SaveScene(scene,"Assets/Spike/RetargetProbe.unity");return "Isolated AnimatorController: source rig left, target rig right.";
    }
}
