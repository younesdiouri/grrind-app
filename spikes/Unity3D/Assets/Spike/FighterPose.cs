using System;
using UnityEngine;
using UnityEngine.Animations;
using UnityEngine.Animations.Rigging;
using UnityEngine.Playables;

// Quaternius Humanoid clips sampled by the front clock; no combat simulation here.
public sealed class FighterPose : MonoBehaviour
{
    public Animator actor;
    public AnimationClip[] clips;
    public Camera inspectionCamera;
    public Transform contactShadow;
    // Contact time of each clip as a fraction of its length.
    public float[] contacts=Array.Empty<float>();
    public string weaponType="FIST";
    // Which clip each posture plays, per weapon family: the dumbbell is WEIGHT whatever its type.
    // Postures 0-6 come from the RN timeline; 7 workshop gaze, 8 knock-out, 9 victory.
    [Serializable] public class Moveset {public string family;public int rest;public int[] clips;public int[] twoHanded=Array.Empty<int>();}
    public Moveset[] movesets=Array.Empty<Moveset>();
    public int stance,view;
    public float phase=.45f,azimuth=32,headViewOffset=.1f,headViewSize=.23f;
    public bool inspect=true,autoplay;
    public Vector3 placement;
    public float facing;
    PlayableGraph graph;
    AnimationMixerPlayable mixer;
    AnimationClipPlayable[] players;
    Transform head;
    WeaponGrip dumbbell;
    RigBuilder rigBuilder;

    void Awake()
    {
        dumbbell=GetComponent<WeaponGrip>();
        actor.cullingMode=AnimatorCullingMode.AlwaysAnimate;actor.applyRootMotion=false;
        head=Bone(HumanBodyBones.Head);
        graph=PlayableGraph.Create("GRRIND avatar poses");graph.SetTimeUpdateMode(DirectorUpdateMode.Manual);
        mixer=AnimationMixerPlayable.Create(graph,clips.Length);
        players=new AnimationClipPlayable[clips.Length];
        for(int i=0;i<clips.Length;i++)
        {
            players[i]=AnimationClipPlayable.Create(graph,clips[i]);players[i].SetApplyFootIK(actor.isHuman);
            graph.Connect(players[i],0,mixer,i);
        }
        AnimationPlayableOutput.Create(graph,"Avatar",actor).SetSourcePlayable(mixer);
        rigBuilder=GetComponent<RigBuilder>();rigBuilder?.Build(graph);graph.Play();
    }
    void LateUpdate()
    {
        if(!graph.IsValid())return;
        bool weighted=dumbbell!=null&&dumbbell.item!=null&&dumbbell.item.activeSelf;
        bool sword=weaponType=="SWORD";
        string family=weighted?"WEIGHT":weaponType;
        var set=Array.Find(movesets,m=>m.family==family)??movesets[0];
        int rest=set.rest,selected=set.clips[Mathf.Clamp(stance,0,set.clips.Length-1)];
        // Workshop rest keeps the forward gaze approved in V1; the arena uses the boxing guard.
        if(inspect&&selected==0)selected=7;
        float p=autoplay?Mathf.Repeat(Time.time*.55f,1):Mathf.Clamp01(phase);
        // A knock-out and a victory end the fight: they hold their last frame instead of returning to guard.
        bool held=stance>=8;
        float blend=selected==rest||selected==7?1:Mathf.Min(1,Mathf.Min(p/.09f,held?1:(1-p)/.12f));
        for(int i=0;i<players.Length;i++)mixer.SetInputWeight(i,i==selected?blend:i==rest?1-blend:0);
        players[rest].SetTime(p*clips[rest].length);
        if(selected!=rest)players[selected].SetTime(ClipPhase(selected,p,contacts)*clips[selected].length);
        // Apply arena placement after the pose solve.
        actor.transform.SetPositionAndRotation(Vector3.zero,Quaternion.identity);
        // Keep the supporting hand on the handle; release it with the received-hit/dodge clip.
        float support=sword&&dumbbell!=null&&dumbbell.TwoHanded
            ?(Array.IndexOf(set.twoHanded,selected)>=0?1:1-blend):0;
        if(rigBuilder!=null&&dumbbell?.supportRig!=null){dumbbell.supportRig.weight=support;rigBuilder.SyncLayers();}
        graph.Evaluate(0);
        dumbbell?.Apply(support);
        actor.transform.SetPositionAndRotation(placement,Quaternion.Euler(0,facing,0));
        if(contactShadow!=null)
        {
            var hips=Bone(HumanBodyBones.Hips).position;
            contactShadow.position=new Vector3(hips.x,.004f,hips.z);
        }
        if(inspect&&inspectionCamera!=null)
        {
            var target=view==1?head.position+Vector3.up*headViewOffset:view==2?Bone(HumanBodyBones.RightHand).position:view==3?(Bone(HumanBodyBones.LeftFoot).position+Bone(HumanBodyBones.RightFoot).position)*.5f:view==4?Bone(HumanBodyBones.Chest).position+Vector3.up*.04f:placement+Vector3.up*.95f;
            inspectionCamera.transform.position=target+Quaternion.Euler(0,azimuth,0)*new Vector3(0,view==0?.6f:.10f,5);
            inspectionCamera.transform.LookAt(target);inspectionCamera.orthographicSize=view==0?(sword?1.35f:1.1f):view==1?headViewSize:view==4?.38f:view==3?.35f:.23f;
            if(view==2&&dumbbell!=null&&dumbbell.HeldItem!=null)inspectionCamera.orthographicSize=sword?.65f:.43f;
        }
    }
    // Canonical phase .5 is the visible contact/reaction peak, not the middle of the source file.
    // Measured from full-body phase sweeps; recovery clips have a much earlier contact.
    static float ClipPhase(int selected,float p,float[] measured)
    {
        float contact=measured[selected];
        return p<=.5f?Mathf.Lerp(0,contact,p*2):Mathf.Lerp(contact,1,(p-.5f)*2);
    }
    public Transform Bone(HumanBodyBones bone)=>actor.isHuman?actor.GetBoneTransform(bone):actor.transform;
    void OnDestroy(){rigBuilder?.Clear();if(graph.IsValid())graph.Destroy();}
}
