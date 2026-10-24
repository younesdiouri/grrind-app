using System;
using System.Linq;
using System.Reflection;
using UnityEditor;
using UnityEngine;
using UnityEngine.Animations;
using UnityEngine.Playables;

public static class SportsWeaponsChecks
{
    static FighterPose Actor(BattleBridge bridge,string side) => (FighterPose)typeof(BattleBridge)
        .GetField(side,BindingFlags.Instance|BindingFlags.NonPublic).GetValue(bridge);
    static BattleBridge.AvatarConfig Avatar(string weapon,bool female) => new BattleBridge.AvatarConfig {
        body=female?"female":"male",weapon=weapon,weaponType=weapon=="ferPlay"||weapon=="huilesson"?"SWORD":"FIST",
        dumbbell=weapon=="dumbbell",boxingGloves=weapon=="gloves",sportShirt=true,boots=false
    };
    public static object Validate()
    {
        if(!EditorApplication.isPlaying)throw new InvalidOperationException("Validate the actual sampler in Play mode");
        var bridge=UnityEngine.Object.FindFirstObjectByType<BattleBridge>();
        var rows=new System.Collections.Generic.List<object>();
        int samples=0;float maxGap=0,minHeadClearance=float.PositiveInfinity;
        foreach(string weapon in new[]{"","gloves","dumbbell","ferPlay","huilesson"})
        foreach(bool female in new[]{false,true})
        foreach(bool left in new[]{true,false})
        {
            var own=Avatar(weapon,female);var other=Avatar("",!female);
            bridge.Configure(JsonUtility.ToJson(new BattleBridge.Configuration {player=left?own:other,enemy=left?other:own}));
            var attacker=Actor(bridge,left?"player":"enemy");var target=Actor(bridge,left?"enemy":"player");
            var grip=attacker.GetComponent<WeaponGrip>();
            foreach(int stance in new[]{1,3})
            {
                Present(bridge,left,stance,.5f);
                attacker.SendMessage("LateUpdate");target.SendMessage("LateUpdate");
                var hand=attacker.Bone(HumanBodyBones.RightHand);
                var filter=grip.HeldItem?.GetComponentInChildren<MeshFilter>()??hand.GetComponentInChildren<MeshFilter>();
                var points=filter==null?new[]{hand.position}:filter.sharedMesh.vertices
                    .Where(v=>grip.HeldItem==null||v.x<filter.sharedMesh.bounds.center.x)
                    .Select(v=>filter.transform.TransformPoint(v)).ToArray();
                var centers=new[]{target.Bone(HumanBodyBones.Head).position,target.Bone(HumanBodyBones.Chest).position,
                    target.Bone(HumanBodyBones.Hips).position+Vector3.up*.15f};
                float gap=points.Min(p=>centers.Min(c=>Vector3.Distance(p,c)));maxGap=Mathf.Max(maxGap,gap);
                var mixer=(AnimationMixerPlayable)typeof(FighterPose).GetField("mixer",BindingFlags.Instance|BindingFlags.NonPublic).GetValue(attacker);
                int selected=own.weaponType=="SWORD"?(stance==1?9:10):stance;
                if(mixer.GetInputWeight(selected)<.99f)throw new Exception(weapon+": wrong attack family");
                rows.Add(new{weapon,female,left,stance,centerGap=gap});
                if(gap>.36f)throw new Exception(JsonUtility.ToJson(new Failure{weapon=weapon,female=female,left=left,stance=stance,gap=gap}));
            }
            foreach(float ratio in new[]{2.1f,2.54f,2.9f})
            foreach(int stance in Enumerable.Range(0,7))
            foreach(float phase in Enumerable.Range(0,21).Select(i=>i/20f))
            {
                bridge.arenaCamera.aspect=ratio;Present(bridge,left,stance,phase);attacker.SendMessage("LateUpdate");
                if(Vector3.Distance(attacker.placement,new Vector3(left?.35f:-.35f,0,0))>.0001f)
                    throw new Exception("Attack still moves the actor's placement");
                if(grip.HeldItem!=null)for(int i=0;i<grip.fingers.Length;i++)
                    if(Quaternion.Angle(grip.fingers[i].localRotation,grip.rotations[i])>.01f)throw new Exception("Grip drift");
                if(own.weaponType=="SWORD"&&ratio==2.1f) {
                    var mesh=grip.HeldItem.GetComponentInChildren<MeshFilter>();
                    var transform=mesh.transform.localToWorldMatrix;var head=attacker.Bone(HumanBodyBones.Head).position;
                    float distance=mesh.sharedMesh.vertices.Where(v=>v.x<mesh.sharedMesh.bounds.center.x)
                        .Min(v=>(transform.MultiplyPoint3x4(v)-head).magnitude);
                    minHeadClearance=Mathf.Min(minHeadClearance,distance);
                    if(distance<.15f)throw new Exception(weapon+" crosses the head: "+distance+" m, stance "+stance+", phase "+phase);
                }
                samples++;
            }
            grip.Select("ferPlay");grip.Select("huilesson");
            if(grip.ferPlay.activeSelf||!grip.huilesson.activeSelf)throw new Exception("Held weapons overlap");
            attacker.GetComponent<QuaterniusAppearance>().SetBoxingGloves(true);
            if(grip.HeldItem!=null)throw new Exception("Gloves did not remove the held weapon");
            UnityEngine.Object.DestroyImmediate(attacker.gameObject);UnityEngine.Object.DestroyImmediate(target.gameObject);
        }
        return new {contacts=rows.Count,samples,maxCenterGap=maxGap,minHeadClearance,rows};
    }
    static void Present(BattleBridge bridge,bool left,int stance,float phase)
    {
        var own=new BattleBridge.ActorFrame{pose=stance,phase=phase};
        var other=new BattleBridge.ActorFrame{pose=2,phase=.5f};
        bridge.Present(JsonUtility.ToJson(new BattleBridge.Frame{player=left?own:other,enemy=left?other:own}));
    }
    [Serializable] class Failure {public string weapon;public bool female,left;public int stance;public float gap;}
}
