using System;
using System.Runtime.InteropServices;
using UnityEngine;

public sealed class BattleBridge : MonoBehaviour
{
    public GameObject malePrefab,femalePrefab;
    public Camera arenaCamera;
    public Material contactShadow;
    MuscuPose player,enemy;
    MaterialPropertyBlock tint;
    static readonly int BaseColor=Shader.PropertyToID("_BaseColor");

    [Serializable] public class AvatarConfig {public string body="male",skin="#DBB894";public bool weapon,glasses,boots,visible=true;}
    [Serializable] public class Configuration
    {
        public AvatarConfig player=new AvatarConfig(),enemy=new AvatarConfig();
        public Viewport viewport=new Viewport();
        public bool inspection;
        public int view;
        public float azimuth=32;
    }
    [Serializable] public class Viewport {public float x,y,width=1,height=1;}
    [Serializable] public class ActorFrame {public int pose;public float phase,x;public bool visible=true;}
    [Serializable] public class Frame {public ActorFrame player=new ActorFrame(),enemy=new ActorFrame();}
    bool inspection;
    Frame lastFrame;

    void Awake()=>tint=new MaterialPropertyBlock();
    void Start()
    {
        Application.targetFrameRate=60;
        QualitySettings.vSyncCount=0;
#if UNITY_IOS && !UNITY_EDITOR
        GrrindUnitySceneReady();
#endif
    }
    public void Configure(string json)
    {
        try
        {
            var config=JsonUtility.FromJson<Configuration>(json);
            if(config==null||config.player==null||config.enemy==null)throw new ArgumentException("Missing avatar configuration");
            if(config.viewport.width<=0||config.viewport.height<=0)return;
            arenaCamera.rect=new Rect(Mathf.Clamp01(config.viewport.x),Mathf.Clamp01(config.viewport.y),Mathf.Clamp01(config.viewport.width),Mathf.Clamp01(config.viewport.height));
            inspection=config.inspection;
            if(player!=null)Destroy(player.gameObject);if(enemy!=null)Destroy(enemy.gameObject);
            player=Create(config.player,true);enemy=Create(config.enemy,false);
            player.inspect=inspection;player.debugControls=false;
            player.inspectionCamera=inspection?arenaCamera:null;
            player.view=Mathf.Clamp(config.view,0,3);player.azimuth=config.azimuth;
            if(inspection){player.placement=Vector3.zero;player.facing=0;}
            // The inspector keeps its calibrated orthographic close-ups; the fight uses perspective.
            arenaCamera.orthographic=inspection;
            if(!inspection)
            {
                arenaCamera.fieldOfView=CombatFieldOfView;
                arenaCamera.transform.position=CombatCamera;
                arenaCamera.transform.LookAt(CombatTarget);
            }
            if(lastFrame!=null){Apply(player,lastFrame.player,true);Apply(enemy,lastFrame.enemy,false);}
        }
        catch(Exception e){Debug.LogError("GRRIND avatar configuration: "+e.Message);}
    }
    MuscuPose Create(AvatarConfig config,bool left)
    {
        var obj=Instantiate(config.body=="female"?femalePrefab:malePrefab);
        var pose=obj.GetComponent<MuscuPose>();pose.inspect=false;pose.inspectionCamera=null;
        pose.placement=new Vector3(CombatX(left),0,0);pose.facing=left?-65:65;
        pose.weapon.gameObject.SetActive(config.weapon);pose.glasses.gameObject.SetActive(config.glasses);pose.SetShoes(config.boots);
        if(!ColorUtility.TryParseHtmlString(config.skin,out var skin))skin=new Color(.86f,.72f,.58f);
        tint.Clear();tint.SetColor(BaseColor,skin);
        foreach(var renderer in obj.GetComponentsInChildren<Renderer>())
            if(renderer.sharedMaterial!=null&&renderer.sharedMaterial.name=="Skin")renderer.SetPropertyBlock(tint);
        if(contactShadow!=null)
        {
            var blob=GameObject.CreatePrimitive(PrimitiveType.Quad);
            Destroy(blob.GetComponent<Collider>());
            blob.name="Contact shadow";
            blob.transform.SetParent(obj.transform,false);
            blob.transform.localScale=new Vector3(.75f,.42f,1);
            blob.transform.rotation=Quaternion.Euler(90,0,0);
            blob.GetComponent<MeshRenderer>().sharedMaterial=contactShadow;
            pose.contactShadow=blob.transform;
        }
        obj.SetActive(config.visible);return pose;
    }
    public void Present(string json)
    {
        if(player==null||enemy==null)return;
        try
        {
            var frame=JsonUtility.FromJson<Frame>(json);if(frame==null)return;
            lastFrame=frame;
            Apply(player,frame.player,true);Apply(enemy,frame.enemy,false);
        }
        catch(Exception e){Debug.LogError("GRRIND avatar frame: "+e.Message);}
    }
    void Apply(MuscuPose pose,ActorFrame frame,bool left)
    {
        if(frame==null)return;
        pose.gameObject.SetActive(frame.visible);pose.stance=Mathf.Clamp(frame.pose,0,7);pose.phase=Mathf.Clamp01(frame.phase);
        // Camera right points towards -X. Input x is a fraction of the arena width.
        pose.placement=inspection?Vector3.zero:new Vector3(CombatX(left)-frame.x*HalfWidth()*2,0,0);
    }
    float CombatX(bool left)=>(left?1:-1)*HalfWidth()*.5f;
    // Half of the visible width on the fighters' plane, for either projection.
    float HalfWidth()
    {
        float halfHeight=arenaCamera.orthographic?arenaCamera.orthographicSize
            :Vector3.Distance(CombatCamera,CombatTarget)*Mathf.Tan(CombatFieldOfView*.5f*Mathf.Deg2Rad);
        return halfHeight*arenaCamera.aspect;
    }
    // Same framing as the former orthographic size 1.15, seen slightly from above.
    public const float CombatFieldOfView=30;
    public static readonly Vector3 CombatCamera=new Vector3(0,1.55f,4.25f);
    public static readonly Vector3 CombatTarget=new Vector3(0,.92f,0);
#if UNITY_IOS && !UNITY_EDITOR
    [DllImport("__Internal")] static extern void GrrindUnitySceneReady();
#endif
}
