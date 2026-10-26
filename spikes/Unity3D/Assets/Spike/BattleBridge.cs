using System;
using System.Runtime.InteropServices;
using UnityEngine;

public sealed class BattleBridge : MonoBehaviour
{
    public Camera arenaCamera;
    public Material contactShadow;
    public GameObject combatEnvironment,inspectionFloor;
    FighterPose player,enemy;
    CombatPresentation presentation;
    RaidScene raid;

    [Serializable] public class AvatarConfig {
        public string model="",body="male",hairStyle="parted",skinTone="tan",eyeColor="brown",hairColor="brown",shirtColor="cyan",pantsColor="original",faceStyle="original",noseStyle="original";
        public bool boots=true,visible=true,headband,sportShirt,boxingGloves,dumbbell;
        public string weapon="",weaponType="FIST";
    }
    [Serializable] public class Configuration
    {
        public AvatarConfig player=new AvatarConfig(),enemy=new AvatarConfig();
        public Viewport viewport=new Viewport();
        public bool inspection;
        public int view;
        public float azimuth=32;
        public string previewId;
        public int previewWidth=640,previewHeight=640;
        public CombatPresentation.Configuration hud;
        public string scene;
        public RaidScene.Configuration raid;
    }
    [Serializable] public class Viewport {public float x,y,width=1,height=1;}
    [Serializable] public class ActorFrame {public int pose;public float phase,x;public bool visible=true,reduced;}
    [Serializable] public class Frame {
        public ActorFrame player=new ActorFrame(),enemy=new ActorFrame();
        public CombatPresentation.Frame presentation;
        public RaidScene.Frame raid;
    }
    bool inspection;
    bool caillouxFight;
    bool illustratedFight;
    CombatPresentation.Configuration hud;
    bool FinaleLayout => !inspection&&lastFrame?.presentation?.finished==true&&hud!=null
        &&(hud.won?lastFrame.player.visible:lastFrame.enemy.visible);
    Frame lastFrame;
    Material sky;
    Rect combatViewport=new Rect(0,0,1,1),projectionSurface;

    void Start()
    {
        Application.targetFrameRate=60;
        QualitySettings.vSyncCount=0;
#if UNITY_IOS && !UNITY_EDITOR
        GrrindUnitySceneReady();
#endif
    }
    void LateUpdate()
    {
        if(raid!=null&&raid.enabled)return;
        if(inspection)return;
        var state=lastFrame?.presentation;
        // The HUD shakes in points; at .006 m per point a normal blow moves the camera 3 cm.
        arenaCamera.transform.position=CombatCamera+new Vector3((state?.shakeX??0)*.006f,(state?.shakeY??0)*.006f,0);
        arenaCamera.transform.LookAt(CombatTarget);
        arenaCamera.fieldOfView=CombatFieldOfView/(state?.zoom??1);
        if(state!=null||projectionSurface!=arenaCamera.pixelRect)FrameArena();
    }
    public void CaptureAvatar(string json) => (GetComponent<AvatarCapture>() ?? gameObject.AddComponent<AvatarCapture>()).Capture(json);
    public void CancelPreview(string _) => GetComponent<AvatarCapture>()?.Cancel();
    void FrameArena()
    {
        var framingViewport=combatViewport;
        if(FinaleLayout)
        {
            // The result has a fixed safe region, independent of the RN combat stage's height.
            float reveal=lastFrame.presentation.reduced?1:Mathf.SmoothStep(0,1,lastFrame.presentation.finale*3);
            framingViewport.y=Mathf.Lerp(framingViewport.y,.05f,reveal);
            framingViewport.height=Mathf.Lerp(framingViewport.height,.58f,reveal);
        }
        arenaCamera.rect=framingViewport;arenaCamera.ResetAspect();arenaCamera.ResetProjectionMatrix();
        float aspect=arenaCamera.aspect;
        var projection=arenaCamera.projectionMatrix;
        // Sample the optical axis to retain Unity's raster rounding at viewport edges.
        var center=arenaCamera.WorldToScreenPoint(arenaCamera.transform.position+arenaCamera.transform.forward);
        float actorWidth=arenaCamera.pixelWidth,actorHeight=arenaCamera.pixelHeight;
        arenaCamera.rect=new Rect(0,0,1,1);projectionSurface=arenaCamera.pixelRect;
        arenaCamera.aspect=aspect;
        // Preserve the HUD's fighter framing while revealing scenery outside that rectangle.
        var framing=Matrix4x4.identity;
        framing.m00=actorWidth/arenaCamera.pixelWidth;framing.m11=actorHeight/arenaCamera.pixelHeight;
        framing.m03=2*center.x/arenaCamera.pixelWidth-1;
        framing.m13=2*center.y/arenaCamera.pixelHeight-1;
        arenaCamera.projectionMatrix=framing*projection;
    }
    public void Configure(string json)
    {
        try
        {
            var config=JsonUtility.FromJson<Configuration>(json);
            if(config==null||config.player==null||config.enemy==null)throw new ArgumentException("Missing avatar configuration");
            if(config.viewport.width<=0||config.viewport.height<=0)return;
            if(raid!=null){raid.Clear();raid.enabled=false;}
            // JsonUtility creates missing nested objects: the scene discriminator is explicit.
            if(config.scene=="raid")
            {
                inspection=false;lastFrame=null;
                if(player!=null){player.gameObject.SetActive(false);Destroy(player.gameObject);}
                if(enemy!=null){enemy.gameObject.SetActive(false);Destroy(enemy.gameObject);}
                if(presentation!=null)presentation.Setup(null,arenaCamera,null,null,new Rect(0,0,1,1));
                if(combatEnvironment!=null)combatEnvironment.SetActive(true);
                if(inspectionFloor!=null)inspectionFloor.SetActive(false);
                Ambience(false);
                raid=GetComponent<RaidScene>()??gameObject.AddComponent<RaidScene>();raid.enabled=true;
                raid.Setup(config.raid,arenaCamera,contactShadow);return;
            }
            combatViewport=new Rect(Mathf.Clamp01(config.viewport.x),Mathf.Clamp01(config.viewport.y),Mathf.Clamp01(config.viewport.width),Mathf.Clamp01(config.viewport.height));
            arenaCamera.rect=combatViewport;arenaCamera.ResetAspect();arenaCamera.ResetProjectionMatrix();
            inspection=config.inspection;
            hud=config.hud;
            if(combatEnvironment!=null)combatEnvironment.SetActive(!inspection);
            if(inspectionFloor!=null)inspectionFloor.SetActive(inspection);
            Ambience(inspection);
            caillouxFight=config.enemy.model=="cailloux";
            illustratedFight=!config.enemy.visible;
            if(player!=null)Destroy(player.gameObject);if(enemy!=null)Destroy(enemy.gameObject);
            player=Create(config.player,true);enemy=Create(config.enemy,false);
            if(presentation==null)presentation=gameObject.AddComponent<CombatPresentation>();
            presentation.Setup(inspection?null:config.hud,arenaCamera,player,enemy,combatViewport);
            player.inspect=inspection;
            player.inspectionCamera=inspection?arenaCamera:null;
            player.view=Mathf.Clamp(config.view,0,4);player.azimuth=config.azimuth;
            if(inspection){player.placement=Vector3.zero;player.facing=0;}
            // The inspector keeps its calibrated orthographic close-ups; the fight uses perspective.
            arenaCamera.orthographic=inspection;
            if(!inspection)
            {
                arenaCamera.fieldOfView=CombatFieldOfView;
                arenaCamera.transform.position=CombatCamera;
                arenaCamera.transform.LookAt(CombatTarget);
                FrameArena();
            }
            if(lastFrame!=null){Apply(player,lastFrame.player,true);Apply(enemy,lastFrame.enemy,false);}
        }
        catch(Exception e){Debug.LogError("GRRIND avatar configuration: "+e.Message);}
    }
    // Night clearing for the inspector, winter day for the fights. Fog fades the scenery into the horizon.
    void Ambience(bool night)
    {
        // A per-bridge instance keeps the scene's sky asset untouched by Play mode.
        if(sky==null&&RenderSettings.skybox!=null)RenderSettings.skybox=sky=new Material(RenderSettings.skybox);
        Color top=night?new Color(.012f,.02f,.06f):new Color(.36f,.56f,.74f);
        Color horizon=night?new Color(.07f,.1f,.22f):new Color(.8f,.91f,.96f);
        if(sky!=null){sky.SetColor("_TopColor",top);sky.SetColor("_HorizonColor",horizon);}
        arenaCamera.backgroundColor=horizon;RenderSettings.fogColor=horizon;
    }
    FighterPose Create(AvatarConfig config,bool left)
    {
        var prefab=Resources.Load<GameObject>(config.model=="cailloux"?"Cailloux":config.body=="female"?"QuaterniusFemale":"QuaterniusShowcase");
        var obj=Instantiate(prefab);
        var pose=obj.GetComponent<FighterPose>();pose.inspect=false;pose.inspectionCamera=null;
        pose.weaponType=config.weaponType;
        var appearance=obj.GetComponent<QuaterniusAppearance>();
        appearance?.SelectHair(config.hairStyle);
        appearance?.SetHeadband(config.headband);
        appearance?.SetBoxingGloves(config.boxingGloves);
        // shortcut: existing boxing clips can intersect large weights; combat trial explicitly accepted by the author.
        obj.GetComponent<WeaponGrip>()?.Select(config.dumbbell?"dumbbell":config.weapon);
        appearance?.Customize(config.skinTone, config.eyeColor, config.hairColor, config.sportShirt, config.shirtColor, config.pantsColor);
        appearance?.SelectFace(config.faceStyle, config.noseStyle);
        foreach(var light in obj.GetComponentsInChildren<Light>())light.enabled=inspection;
        pose.placement=new Vector3(CombatX(left),0,0);pose.facing=Facing(left);
        pose.SetShoes(config.boots);
        pose.contactShadow=RaidScene.Shadow(obj.transform,contactShadow,new Vector2(.75f,.42f));
        obj.SetActive(config.visible);return pose;
    }
    public void Present(string json)
    {
        if(raid!=null&&raid.enabled)
        {
            try{raid.Draw(JsonUtility.FromJson<Frame>(json)?.raid);}
            catch(Exception e){Debug.LogError("GRRIND raid frame: "+e.Message);}
            return;
        }
        if(player==null||enemy==null)return;
        try
        {
            var frame=JsonUtility.FromJson<Frame>(json);if(frame==null)return;
            lastFrame=frame;
            Apply(player,frame.player,true);Apply(enemy,frame.enemy,false);
            presentation?.DrawFrame(frame.presentation);
            (GetComponent<ImpactFx>()??gameObject.AddComponent<ImpactFx>()).Draw(player,enemy,frame);
        }
        catch(Exception e){Debug.LogError("GRRIND avatar frame: "+e.Message);}
    }
    void Apply(FighterPose pose,ActorFrame frame,bool left)
    {
        if(frame==null)return;
        if(FinaleLayout)
        {
            bool winner=left==hud.won;
            pose.gameObject.SetActive(frame.visible&&winner);
            float reveal=lastFrame.presentation.reduced?1:Mathf.SmoothStep(0,1,lastFrame.presentation.finale*3);
            pose.placement=Vector3.Lerp(new Vector3(CombatX(left),0,0),Vector3.zero,reveal);
            pose.facing=Mathf.Lerp(Facing(left),0,reveal);
            pose.stance=7;pose.phase=.45f;
            return;
        }
        pose.facing=inspection?0:Facing(left);
        pose.gameObject.SetActive(frame.visible);pose.stance=Mathf.Clamp(frame.pose,0,7);pose.phase=Mathf.Clamp01(frame.phase);
        // Camera right points towards -X. Input x is a fraction of the arena width.
        pose.placement=inspection?Vector3.zero:new Vector3(CombatX(left)-frame.x*HalfWidth()*2,0,0);
        if((caillouxFight||illustratedFight)&&!inspection&&!frame.reduced&&(frame.pose==1||frame.pose==3||frame.pose==5||frame.pose==6))
        {
            // This rig advances into striking range at the HUD's contact phase, then returns.
            float approach=1-Mathf.Abs(2*Mathf.Clamp01(frame.phase)-1);
            // The uppercut has a shorter reach than the extended direct/jab.
            float range=frame.pose==3?.4f:.6f;
            // Match the human's head strike and the short stone arm's body strike.
            if(caillouxFight)range=left?(frame.pose==3?.65f:.85f):.8f;
            float travel=Mathf.Max(0,Mathf.Abs(CombatX(true)-CombatX(false))-range);
            pose.placement+=(left?Vector3.left:Vector3.right)*travel*approach;
        }
    }
    float Facing(bool left)=>(left?-1:1)*(caillouxFight||illustratedFight?65:85);
    float CombatX(bool left)=>(left?1:-1)*(caillouxFight?.625f:illustratedFight?HalfWidth()*.5f:.35f);
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
