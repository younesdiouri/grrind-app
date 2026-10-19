using System;
using UnityEngine;
using UnityEngine.Animations;
using UnityEngine.Playables;

// Authored CC0 clips sampled by the front clock; no combat simulation here.
public sealed class MuscuPose : MonoBehaviour
{
    public Animator actor;
    public AnimationClip[] clips;
    public Camera inspectionCamera;
    public Transform weapon,glasses;
    public Transform[] shoes=Array.Empty<Transform>();
    public GameObject bareFeet;
    public Transform contactShadow;
    public int stance,view;
    public float phase=.45f,azimuth=32,headViewOffset=.1f,headViewSize=.23f,gripCurl=-.72f,thumbBase=-.2f,thumbSpread;
    public bool inspect=true,debugControls=true,autoplay,grip;
    public Vector3 placement;
    public float facing;
    PlayableGraph graph;
    AnimationMixerPlayable mixer;
    AnimationClipPlayable[] players;
    HumanPoseHandler fingers;
    HumanPose humanPose;
    int[] curled,thumbs;
    int thumbSpreadIndex;
    Transform head;
    Vector3 headScale;

    public void SetShoes(bool visible)
    {
        foreach(var shoe in shoes)shoe.gameObject.SetActive(visible);
        if(bareFeet!=null)bareFeet.SetActive(!visible);
    }
    void Awake()
    {
        actor.cullingMode=AnimatorCullingMode.AlwaysAnimate;actor.applyRootMotion=false;
        head=actor.GetBoneTransform(HumanBodyBones.Head);headScale=head.localScale;
        graph=PlayableGraph.Create("GRRIND avatar poses");graph.SetTimeUpdateMode(DirectorUpdateMode.Manual);
        mixer=AnimationMixerPlayable.Create(graph,clips.Length);
        players=new AnimationClipPlayable[clips.Length];
        for(int i=0;i<clips.Length;i++)
        {
            players[i]=AnimationClipPlayable.Create(graph,clips[i]);players[i].SetApplyFootIK(true);
            graph.Connect(players[i],0,mixer,i);
        }
        AnimationPlayableOutput.Create(graph,"Avatar",actor).SetSourcePlayable(mixer);graph.Play();
        fingers=new HumanPoseHandler(actor.avatar,actor.transform);
        var list=new System.Collections.Generic.List<int>();var thumbList=new System.Collections.Generic.List<int>();
        for(int i=0;i<HumanTrait.MuscleName.Length;i++)
        {
            if(!HumanTrait.MuscleName[i].StartsWith("Right"))continue;
            if(HumanTrait.MuscleName[i].Contains("Stretched"))list.Add(i);
            if(HumanTrait.MuscleName[i].Contains("Thumb 1 Stretched"))thumbList.Add(i);
        }
        curled=list.ToArray();thumbs=thumbList.ToArray();
        thumbSpreadIndex=Array.IndexOf(HumanTrait.MuscleName,"Right Thumb Spread");
    }
    void LateUpdate()
    {
        if(!graph.IsValid())return;
        int selected=Mathf.Clamp(stance,0,clips.Length-1);
        float p=autoplay?Mathf.Repeat(Time.time*.55f,1):Mathf.Clamp01(phase);
        float blend=selected==0||selected==7?1:Mathf.Min(1,Mathf.Min(p/.09f,(1-p)/.12f));
        for(int i=0;i<players.Length;i++)mixer.SetInputWeight(i,i==selected?blend:i==0?1-blend:0);
        players[0].SetTime(inspect?Time.time%clips[0].length:p*clips[0].length);
        if(selected!=0)players[selected].SetTime(ClipPhase(selected,p)*clips[selected].length);
        // HumanPoseHandler evaluates in world space. Apply arena placement after the pose solve.
        actor.transform.SetPositionAndRotation(Vector3.zero,Quaternion.identity);graph.Evaluate(0);
        if(grip||weapon.gameObject.activeSelf)
        {
            fingers.GetHumanPose(ref humanPose);
            foreach(int i in curled)humanPose.muscles[i]=gripCurl;
            foreach(int i in thumbs)humanPose.muscles[i]=thumbBase;
            humanPose.muscles[thumbSpreadIndex]=thumbSpread;
            fingers.SetHumanPose(ref humanPose);
        }
        head.localScale=headScale;
        actor.transform.SetPositionAndRotation(placement,Quaternion.Euler(0,facing,0));
        if(contactShadow!=null)
        {
            var hips=actor.GetBoneTransform(HumanBodyBones.Hips).position;
            contactShadow.position=new Vector3(hips.x,.004f,hips.z);
        }
        if(inspect&&inspectionCamera!=null)
        {
            var target=view==1?head.position+Vector3.up*headViewOffset:view==2?actor.GetBoneTransform(HumanBodyBones.RightHand).position:view==3?(actor.GetBoneTransform(HumanBodyBones.LeftFoot).position+actor.GetBoneTransform(HumanBodyBones.RightFoot).position)*.5f:placement+Vector3.up*.95f;
            inspectionCamera.transform.position=target+Quaternion.Euler(0,azimuth,0)*new Vector3(0,view==0?.6f:.10f,5);
            inspectionCamera.transform.LookAt(target);inspectionCamera.orthographicSize=view==0?1.1f:view==1?headViewSize:view==3?.35f:.23f;
        }
    }
    // Canonical phase .5 is the visible contact/reaction peak, not the middle of the source file.
    // Measured from full-body phase sweeps; recovery clips have a much earlier contact.
    static float ClipPhase(int selected,float p)
    {
        float contact=selected==1?.27f:selected==2?.28f:selected==3?.74f:selected==4?.30f:selected==5?.60f:selected==6?.22f:.5f;
        return p<=.5f?Mathf.Lerp(0,contact,p*2):Mathf.Lerp(contact,1,(p-.5f)*2);
    }
    void OnDestroy(){fingers?.Dispose();if(graph.IsValid())graph.Destroy();}
    void OnGUI()
    {
        if(!inspect||!debugControls)return;
        GUILayout.BeginArea(new Rect(16,16,260,230),GUI.skin.box);
        stance=GUILayout.SelectionGrid(stance,new[]{"Garde","Attaque","Recu","Critique","Esquive","Combo","Relance","Repos"},3);
        view=GUILayout.SelectionGrid(view,new[]{"Corps","Tete","Prise"},3);azimuth=GUILayout.HorizontalSlider(azimuth,-180,180);
        autoplay=GUILayout.Toggle(autoplay,"Mouvement");phase=GUILayout.HorizontalSlider(phase,0,1);
        weapon.gameObject.SetActive(GUILayout.Toggle(weapon.gameObject.activeSelf,"Haltere ego"));
        glasses.gameObject.SetActive(GUILayout.Toggle(glasses.gameObject.activeSelf,"Course-poursuite"));GUILayout.EndArea();
    }
}
