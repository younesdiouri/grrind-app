using System;
using System.Linq;
using System.Reflection;
using UnityEditor;
using UnityEngine;
using UnityEngine.Animations;
using UnityEngine.Animations.Rigging;
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
        int samples=0;float maxGap=0,minHeadClearance=float.PositiveInfinity,maxSupportError=0,maxSourceDrift=0,maxSourceRotationDrift=0;
        foreach(string weapon in new[]{"","gloves","dumbbell","ferPlay","huilesson"})
        foreach(bool female in new[]{false,true})
        foreach(bool left in new[]{true,false})
        {
            var own=Avatar(weapon,female);var other=Avatar("",!female);
            bridge.Configure(JsonUtility.ToJson(new BattleBridge.Configuration {player=left?own:other,enemy=left?other:own}));
            var attacker=Actor(bridge,left?"player":"enemy");var target=Actor(bridge,left?"enemy":"player");
            var grip=attacker.GetComponent<WeaponGrip>();
            foreach(string family in new[]{"FIST","SWORD","WEIGHT"})
            {
                var set=Array.Find(attacker.movesets,m=>m.family==family);
                if(set==null||set.clips.Length!=10||set.clips.Append(set.rest).Any(i=>i<0||i>=attacker.clips.Length
                    ||attacker.clips[i]==null||attacker.contacts[i]<=0||attacker.contacts[i]>=1))
                    throw new Exception("Incomplete "+family+" moveset");
            }
            if(own.weaponType=="SWORD"&&(grip.supportRig==null||grip.supportFingers.Length!=15))
                throw new Exception("Missing supporting-hand grip");
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
            // Bridge postures, knock-out included (#279).
            foreach(int stance in Enumerable.Range(0,9))
            foreach(float phase in Enumerable.Range(0,21).Select(i=>i/20f))
            {
                bridge.arenaCamera.aspect=ratio;Present(bridge,left,stance,phase);attacker.SendMessage("LateUpdate");
                // Only the knock-out slides clear of the winner's feet.
                if(stance!=8&&Vector3.Distance(attacker.placement,new Vector3(left?.35f:-.35f,0,0))>.0001f)
                    throw new Exception("Attack still moves the actor's placement");
                if(grip.HeldItem!=null)for(int i=0;i<grip.fingers.Length;i++)
                    if(Quaternion.Angle(grip.fingers[i].localRotation,grip.rotations[i])>.01f)throw new Exception("Grip drift");
                if(own.weaponType=="SWORD"&&ratio==2.1f) {
                    var constraint=grip.supportRig.GetComponentInChildren<TwoBoneIKConstraint>();
                    var sourceBones=new[]{HumanBodyBones.RightHand,HumanBodyBones.Hips,HumanBodyBones.Head,
                        HumanBodyBones.LeftFoot,HumanBodyBones.RightFoot}.Select(attacker.Bone).ToArray();
                    constraint.weight=0;attacker.SendMessage("LateUpdate");
                    var source=sourceBones.Select(t=>t.position).ToArray();
                    var sourceRotations=sourceBones.Select(t=>t.rotation).ToArray();
                    constraint.weight=1;attacker.SendMessage("LateUpdate");
                    float drift=sourceBones.Select((t,i)=>Vector3.Distance(t.position,source[i])).Max();
                    maxSourceDrift=Mathf.Max(maxSourceDrift,drift);
                    if(drift>.00001f)throw new Exception("Support changes the source stroke/body: "+drift);
                    float rotationDrift=sourceBones.Select((t,i)=>Quaternion.Angle(t.rotation,sourceRotations[i])).Max();
                    maxSourceRotationDrift=Mathf.Max(maxSourceRotationDrift,rotationDrift);
                    if(rotationDrift>.1f)throw new Exception("Support rotates the source stroke/body: "+rotationDrift);
                    if(grip.supportRig.weight>.999f) {
                        var leftHand=attacker.Bone(HumanBodyBones.LeftHand);
                        float error=Vector3.Distance(leftHand.position,grip.supportTarget.position);
                        maxSupportError=Mathf.Max(maxSupportError,error);
                        if(error>.006f)throw new Exception("Supporting hand leaves handle: "+error+", "+weapon+", "+female+", "+stance+", "+phase);
                        if(Quaternion.Angle(leftHand.rotation,grip.supportTarget.rotation)>.1f)
                            throw new Exception("Supporting wrist rotation drifts");
                        for(int i=0;i<grip.supportFingers.Length;i++)
                            if(Quaternion.Angle(grip.supportFingers[i].localRotation,grip.supportRotations[i])>.1f)
                                throw new Exception("Supporting fingers drift");
                        CheckSupportContour(grip,leftHand);
                    }
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
            attacker.SendMessage("LateUpdate");
            if(grip.supportRig!=null&&grip.supportRig.weight!=0)throw new Exception("Empty hand still constrained");
            UnityEngine.Object.DestroyImmediate(attacker.gameObject);UnityEngine.Object.DestroyImmediate(target.gameObject);
        }
        return new {contacts=rows.Count,samples,maxCenterGap=maxGap,minHeadClearance,maxSupportError,maxSourceDrift,maxSourceRotationDrift,rows};
    }
    static void CheckSupportContour(WeaponGrip grip,Transform hand)
    {
        var axis=hand.InverseTransformDirection(grip.HeldItem.transform.TransformDirection(Vector3.left));
        var socket=hand.InverseTransformPoint(grip.HeldItem.transform.position);
        foreach(var finger in new[]{"index","middle","ring","pinky"}) {
            var contour=Enumerable.Range(1,4).Select(i=>hand.GetComponentsInChildren<Transform>().Single(t=>
                t.name==finger+"_0"+i+(i==4?"_leaf_l":"_l")))
                .Select(t=>Vector3.ProjectOnPlane(hand.InverseTransformPoint(t.position)-socket,axis)).ToArray();
            float winding=0;
            for(int i=0;i<4;i++)winding+=Vector3.SignedAngle(contour[i],contour[(i+1)%4],axis);
            if(Mathf.Abs(winding)<350)throw new Exception("Shaft outside supporting "+finger+": "+winding);
        }
    }
    public static object ValidateGuard()
    {
        if(!EditorApplication.isPlaying)throw new InvalidOperationException("Check the sampled guard in Play mode");
        var bridge=UnityEngine.Object.FindFirstObjectByType<BattleBridge>();
        float maxLean=0,maxPitch=0,maxHipOffset=0,maxSupport=0;int samples=0;
        foreach(bool female in new[]{false,true})
        foreach(string weapon in new[]{"ferPlay","huilesson"})
        foreach(bool inspection in new[]{false,true})
        {
            bridge.Configure(JsonUtility.ToJson(new BattleBridge.Configuration {
                inspection=inspection,player=Avatar(weapon,female),enemy=new BattleBridge.AvatarConfig {visible=false}
            }));
            var pose=Actor(bridge,"player");pose.autoplay=false;
            for(int i=0;i<=20;i++)
            {
                pose.stance=0;pose.phase=i/20f;pose.SendMessage("LateUpdate");
                Vector3 hips=pose.transform.InverseTransformPoint(pose.Bone(HumanBodyBones.Hips).position);
                Vector3 chest=pose.transform.InverseTransformPoint(pose.Bone(HumanBodyBones.Chest).position);
                Vector3 feet=pose.transform.InverseTransformPoint((pose.Bone(HumanBodyBones.LeftFoot).position
                    +pose.Bone(HumanBodyBones.RightFoot).position)*.5f);
                float lean=Mathf.Abs(Mathf.Atan2(chest.z-hips.z,chest.y-hips.y)*Mathf.Rad2Deg);
                float pitch=Mathf.Abs(Mathf.Asin(pose.Bone(HumanBodyBones.Head).forward.y)*Mathf.Rad2Deg);
                float hipOffset=Mathf.Abs(hips.z-feet.z);
                var grip=pose.GetComponent<WeaponGrip>();
                float support=Vector3.Distance(pose.Bone(HumanBodyBones.LeftHand).position,grip.supportTarget.position);
                maxLean=Mathf.Max(maxLean,lean);maxPitch=Mathf.Max(maxPitch,pitch);
                maxHipOffset=Mathf.Max(maxHipOffset,hipOffset);maxSupport=Mathf.Max(maxSupport,support);samples++;
                if(lean>12||pitch>12||hipOffset>.04f||support>.006f)
                    throw new Exception($"Bent sword guard: female={female}, inspection={inspection}, phase={pose.phase}, lean={lean}, pitch={pitch}, hip offset={hipOffset}, support={support}");
            }
        }
        return new{samples,maxLean,maxPitch,maxHipOffset,maxSupport};
    }
    static void Present(BattleBridge bridge,bool left,int stance,float phase)
    {
        var own=new BattleBridge.ActorFrame{pose=stance,phase=phase};
        var other=new BattleBridge.ActorFrame{pose=2,phase=.5f};
        bridge.Present(JsonUtility.ToJson(new BattleBridge.Frame{player=left?own:other,enemy=left?other:own}));
    }
    [Serializable] class Failure {public string weapon;public bool female,left;public int stance;public float gap;}
}
