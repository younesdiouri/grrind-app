using System;
using UnityEngine;

// Samples the server journal supplied by RN. This scene has no combat rules or HP.
public sealed class RaidScene : MonoBehaviour
{
    [Serializable] public class Member { public string id,name; }
    [Serializable] public class Configuration { public Member[] members=Array.Empty<Member>(); }
    [Serializable] public class HeroFrame { public int pose; public float phase; }
    [Serializable] public class Frame {
        public float time,arrival=1,hit,verdictPhase;
        public int encounter=1,verdict;
        public bool boss,reduced;
        public HeroFrame[] heroes=Array.Empty<HeroFrame>();
    }

    public Camera arenaCamera;
    public FighterPose[] heroes=Array.Empty<FighterPose>();
    public Transform boss;
    public Transform[] minions;
    Transform root;
    MeshFilter snow;
    Mesh snowMesh;
    Vector3[] flakes,vertices;
    int[] triangles;
    Transform[] sparks;
    Vector3 bossHome=new Vector3(-1.8f,0,-1.5f);
    static readonly Vector3[] MinionHomes={new Vector3(-.75f,0,.9f),new Vector3(-3.5f,0,-.5f),new Vector3(-3.3f,0,1.4f)};
    Material snowMaterial,impactMaterial;

    public void Setup(Configuration config,Camera camera,Material contactShadow)
    {
        Clear(); arenaCamera=camera;
        root=new GameObject("Al Kasal winter raid").transform;root.SetParent(transform,false);
        var prefab=Resources.Load<GameObject>("AlKasal");
        if(prefab==null)throw new InvalidOperationException("Al Kasal prefab is missing");
        boss=Instantiate(prefab,root).transform;boss.name="Al Kasal";
        Shadow(boss,contactShadow,new Vector2(2.1f,1.1f));
        minions=new Transform[MinionHomes.Length];
        for(int i=0;i<minions.Length;i++)
        {
            minions[i]=Instantiate(Resources.Load<GameObject>("Canape"),root).transform;
            minions[i].name="Canape "+(i+1);
            Shadow(minions[i],contactShadow,new Vector2(1.5f,.75f));
        }
        heroes=new FighterPose[config.members.Length];
        for(int i=0;i<heroes.Length;i++)
        {
            bool female=i%2==1;
            var obj=Instantiate(Resources.Load<GameObject>(female?"QuaterniusFemale":"QuaterniusShowcase"),root);
            obj.name=config.members[i].name;
            var appearance=obj.GetComponent<QuaterniusAppearance>();
            appearance?.SelectHair(female?"buns":"parted");
            appearance?.Customize(i%3==0?"deep":"tan","brown","brown",i%2==0?"cyan":"coral",i%2==0?"violet":"cyan");
            appearance?.SetBoxingGloves(true);appearance?.SetHeadband(false);
            obj.GetComponent<WeaponGrip>()?.SetEquipped(false);
            foreach(var light in obj.GetComponentsInChildren<Light>())light.enabled=false;
            var pose=obj.GetComponent<FighterPose>();
            pose.inspect=false;pose.inspectionCamera=null;
            pose.contactShadow=Shadow(obj.transform,contactShadow,new Vector2(.75f,.42f));
            heroes[i]=pose;
        }
        BuildSnow();BuildImpacts();
        arenaCamera.orthographic=false;arenaCamera.rect=new Rect(0,0,1,1);
        arenaCamera.ResetAspect();arenaCamera.ResetProjectionMatrix();
        Draw(new Frame());
    }

    public void Draw(Frame frame)
    {
        if(root==null||frame==null)return;
        float t=frame.time*.001f;
        float entrance=frame.reduced?1:Mathf.SmoothStep(0,1,frame.arrival);
        float recoil=frame.reduced?0:frame.hit;
        float outcome=frame.reduced?1:Mathf.SmoothStep(0,1,frame.verdictPhase);
        boss.position=bossHome;
        boss.rotation=Quaternion.Euler(0,25,frame.boss?recoil*-6:0);
        float breathe=frame.reduced?0:Mathf.Sin(t*1.1f)*.012f;
        boss.localScale=new Vector3(1-breathe*.3f,1+breathe,1-breathe*.3f);
        Ground(boss);
        for(int i=0;i<minions.Length;i++)
        {
            var mob=minions[i];
            mob.gameObject.SetActive(!frame.boss||i>0);
            mob.position=MinionHomes[i];
            mob.rotation=Quaternion.Euler(0,i==0?30:15,(frame.reduced?0:Mathf.Sin(t*1.3f+i)*2)+(i==0?recoil*-12:0));
            mob.localScale=Vector3.one*(i==0?1:.65f);
            if(i==0)
            {
                mob.localScale*=Mathf.Lerp(.6f,1,entrance);
            }
            Ground(mob);
        }
        Vector3 target=frame.boss?bossHome:new Vector3(-.75f,0,.9f);
        for(int i=0;i<heroes.Length;i++)
        {
            var pose=heroes[i];
            var state=i<frame.heroes.Length?frame.heroes[i]:new HeroFrame();
            var home=HeroHome(i,heroes.Length);
            float approach=state.pose==1?Mathf.SmoothStep(0,1,1-Mathf.Abs(state.phase*2-1)):0;
            var contact=target+new Vector3(frame.boss?1.38f:1.05f,0,.18f+(i%2)*.12f);
            pose.placement=frame.reduced?home:Vector3.Lerp(home,contact,approach);
            pose.transform.localScale=Vector3.one*Mathf.Lerp(i<4?1:.82f,1,approach);
            pose.facing=-70;pose.stance=state.pose;pose.phase=state.phase;
            if(frame.verdict!=0){pose.stance=7;pose.phase=.45f;pose.facing=-25;}
            if(frame.verdict<0&&!frame.reduced)pose.placement+=Vector3.right*outcome*.2f;
        }
        var impactPoint=target+new Vector3(frame.boss?.55f:.35f,frame.boss?1.45f:1.15f,.38f);
        for(int i=0;i<sparks.Length;i++)
        {
            float angle=i*Mathf.PI*2/sparks.Length;
            sparks[i].gameObject.SetActive(recoil>.03f);
            sparks[i].position=impactPoint+new Vector3(Mathf.Cos(angle),Mathf.Sin(angle),.2f)*(.1f+(1-recoil)*.35f);
            sparks[i].rotation=Quaternion.Euler(0,0,-angle*Mathf.Rad2Deg);
            sparks[i].localScale=new Vector3(.06f,.14f, .035f)*recoil;
        }
        UpdateSnow(t,frame.reduced);
        FrameCamera();
    }

    public static Vector3 HeroHome(int index,int count)
    {
        int row=index/4,column=index%4;
        float spacing=Mathf.Min(.72f,1.8f/Mathf.Max(1,Mathf.CeilToInt(count/4f)-1));
        return new Vector3(2.2f+row*spacing,0,-1.2f+column*1.12f);
    }
    void LateUpdate(){if(root!=null)FrameCamera();}
    void FrameCamera()
    {
        arenaCamera.rect=new Rect(0,0,1,1);arenaCamera.ResetAspect();arenaCamera.ResetProjectionMatrix();
        arenaCamera.fieldOfView=43;
        arenaCamera.transform.position=new Vector3(.25f,5.1f,9.6f);
        arenaCamera.transform.LookAt(new Vector3(.1f,.95f,0));
        // Lift the actors above the RN narration/actions while keeping scenery fullscreen.
        var framing=Matrix4x4.identity;framing.m13=.26f;
        arenaCamera.projectionMatrix=framing*arenaCamera.projectionMatrix;
    }
    void BuildSnow()
    {
        snowMaterial=new Material(Shader.Find("Universal Render Pipeline/Unlit"));
        snowMaterial.color=new Color(.88f,.97f,1);
        var obj=new GameObject("Faceted snowfall",typeof(MeshFilter),typeof(MeshRenderer));obj.transform.SetParent(root,false);
        snow=obj.GetComponent<MeshFilter>();snowMesh=new Mesh{name="Raid snow triangles"};snow.sharedMesh=snowMesh;
        obj.GetComponent<MeshRenderer>().sharedMaterial=snowMaterial;
        const int count=90;flakes=new Vector3[count];vertices=new Vector3[count*3];triangles=new int[count*3];
        for(int i=0;i<count;i++)
        {
            // Deterministic decoration: replaying time restores the same snow positions.
            flakes[i]=new Vector3(Mathf.Repeat(i*3.71f,12)-6,Mathf.Repeat(i*1.37f,5),Mathf.Repeat(i*2.17f,8)-4);
            triangles[i*3]=i*3;triangles[i*3+1]=i*3+2;triangles[i*3+2]=i*3+1;
        }
    }
    void UpdateSnow(float time,bool reduced)
    {
        snow.gameObject.SetActive(!reduced);
        if(reduced)return;
        for(int i=0;i<flakes.Length;i++)
        {
            var p=flakes[i];p.y=Mathf.Repeat(p.y-time*.4f,5);p.x+=Mathf.Sin(time*.35f+i)*.15f;
            float size=.018f+(i%3)*.009f;
            vertices[i*3]=p+new Vector3(-size,-size,0);vertices[i*3+1]=p+new Vector3(0,size,0);vertices[i*3+2]=p+new Vector3(size,-size,0);
        }
        snowMesh.vertices=vertices;snowMesh.triangles=triangles;snowMesh.RecalculateBounds();
    }
    void BuildImpacts()
    {
        impactMaterial=new Material(Shader.Find("Universal Render Pipeline/Unlit"));impactMaterial.color=new Color(1,.77f,.25f);
        sparks=new Transform[7];
        for(int i=0;i<sparks.Length;i++)
        {
            var obj=GameObject.CreatePrimitive(PrimitiveType.Cube);Destroy(obj.GetComponent<Collider>());
            obj.name="Melee contact spark";obj.transform.SetParent(root,false);
            obj.GetComponent<MeshRenderer>().sharedMaterial=impactMaterial;sparks[i]=obj.transform;
        }
    }
    public static Transform Shadow(Transform owner,Material material,Vector2 size)
    {
        if(material==null)return null;
        var obj=GameObject.CreatePrimitive(PrimitiveType.Quad);Destroy(obj.GetComponent<Collider>());
        obj.name="Contact shadow";obj.transform.SetParent(owner,false);
        obj.transform.localPosition=Vector3.up*.008f;
        obj.transform.localRotation=Quaternion.Euler(90,0,0);obj.transform.localScale=new Vector3(size.x,size.y,1);
        obj.GetComponent<MeshRenderer>().sharedMaterial=material;return obj.transform;
    }
    static void Ground(Transform mob)
    {
        float bottom=float.MaxValue;
        foreach(var renderer in mob.GetComponentsInChildren<MeshRenderer>())
            if(renderer.name!="Contact shadow")bottom=Mathf.Min(bottom,renderer.bounds.min.y);
        if(bottom<float.MaxValue)mob.position-=Vector3.up*bottom;
    }
    public void Clear()
    {
        if(root!=null){root.gameObject.SetActive(false);Destroy(root.gameObject);}
        if(snowMesh!=null)Destroy(snowMesh);
        if(snowMaterial!=null)Destroy(snowMaterial);
        if(impactMaterial!=null)Destroy(impactMaterial);
        root=null;
    }
    void OnDestroy()=>Clear();
}
