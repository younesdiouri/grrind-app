using UnityEngine;

/** 3D side of a blow, sampled from the RN clock like the HUD: no local timer, no game rule. */
[DefaultExecutionOrder(110)]
public sealed class ImpactFx : MonoBehaviour
{
    static readonly int HitFlash=Shader.PropertyToID("_HitFlash");
    static readonly Color Mint=CombatPresentation.Mint,Pink=CombatPresentation.Pink,
        Cyan=CombatPresentation.Cyan,Amber=new Color(1,.77f,.25f);
    const int SparkCount=10;
    Transform[] sparks;
    Material spark,trail;
    MaterialPropertyBlock block;
    readonly System.Collections.Generic.Dictionary<FighterPose,Renderer[]> bodies=new();
    FighterPose player,enemy;
    BattleBridge.Frame frame;
    bool pending;

    public void Draw(FighterPose left,FighterPose right,BattleBridge.Frame value)
    {
        if(player!=left||enemy!=right)bodies.Clear();
        player=left;enemy=right;frame=value;pending=true;
    }
    // Bone sockets are valid after FighterPose sampled the current contact, never the preceding frame.
    void LateUpdate()
    {
        if(!pending&&player!=null&&enemy!=null)return;
        pending=false;
        var state=frame?.presentation;
        if(state==null||player==null||enemy==null)
        {
            if(sparks!=null)foreach(var item in sparks)if(item.gameObject.activeSelf)item.gameObject.SetActive(false);
            if(block!=null){Flash(player,0);Flash(enemy,0);}
            return;
        }
        Build();
        // A strength above 1 is a critical or the final blow, as in the HUD shards.
        float strength=0,progress=1;FighterPose target=null;
        if(state.player.impact>0){target=player;strength=state.player.impact;progress=state.player.impactProgress;}
        else if(state.enemy.impact>0){target=enemy;strength=state.enemy.impact;progress=state.enemy.impactProgress;}
        Flash(player,target==player?Pulse(progress):0);
        Flash(enemy,target==enemy?Pulse(progress):0);
        var origin=target!=null&&target.gameObject.activeInHierarchy
            ?Contact(target,target==player?enemy:player):Vector3.zero;
        for(int i=0;i<SparkCount;i++)
        {
            bool lit=target!=null&&!state.reduced&&progress<1;
            sparks[i].gameObject.SetActive(lit);
            if(!lit)continue;
            // Golden-angle fan towards the camera, faster and amber on a heavy blow.
            float angle=i*2.39996f;
            var direction=new Vector3(Mathf.Cos(angle),Mathf.Sin(angle)*.8f+.25f,.6f).normalized;
            float travel=(.08f+progress*.42f)*(strength>1?1.35f:1);
            sparks[i].position=origin+direction*travel;
            sparks[i].rotation=Quaternion.Euler(angle*57f,angle*31f,angle*17f);
            sparks[i].localScale=Vector3.one*(strength>1?.05f:.035f)*(1-progress);
        }
        spark.color=(strength>1?Amber:Cyan)*3;
        Trail(player,frame.player,Mint,state.reduced);
        Trail(enemy,frame.enemy,Pink,state.reduced);
    }

    static Vector3 Contact(FighterPose target,FighterPose striker)
    {
        var hand=striker.Bone(HumanBodyBones.RightHand).position;
        var center=target.Bone(HumanBodyBones.Chest).position;
        var head=target.Bone(HumanBodyBones.Head).position;
        var body=target.Bone(HumanBodyBones.Hips).position+Vector3.up*.15f;
        if((head-hand).sqrMagnitude<(center-hand).sqrMagnitude)center=head;
        return (body-hand).sqrMagnitude<(center-hand).sqrMagnitude?body:center;
    }

    // The flash peaks on the contact frame and is gone before the hit-stop ends.
    static float Pulse(float progress)=>Mathf.Pow(Mathf.Clamp01(1-progress*3),2);

    void Flash(FighterPose pose,float amount)
    {
        if(pose==null)return;
        if(!bodies.TryGetValue(pose,out var renderers))bodies[pose]=renderers=pose.GetComponentsInChildren<Renderer>(true);
        foreach(var renderer in renderers)
        {
            if(renderer==null||renderer is TrailRenderer)continue;
            // QuaterniusAppearance tints each material slot with its own block: add to it, never replace it.
            for(int i=0;i<renderer.sharedMaterials.Length;i++)
            {
                renderer.GetPropertyBlock(block,i);
                if(block.GetFloat(HitFlash)==amount)continue;
                block.SetFloat(HitFlash,amount);renderer.SetPropertyBlock(block,i);
            }
        }
    }

    void Trail(FighterPose pose,BattleBridge.ActorFrame frame,Color team,bool reduced)
    {
        var item=pose!=null?pose.GetComponent<WeaponGrip>()?.HeldItem:null;
        if(item==null||frame==null)return;
        var renderer=item.GetComponentInChildren<TrailRenderer>();
        if(renderer==null)
        {
            var mesh=item.GetComponentInChildren<MeshFilter>();if(mesh==null)return;
            var bounds=mesh.sharedMesh.bounds;
            // The tip is the end of the longest axis farthest from the hand.
            var axis=bounds.extents.x>bounds.extents.y&&bounds.extents.x>bounds.extents.z?Vector3.right
                :bounds.extents.y>bounds.extents.z?Vector3.up:Vector3.forward;
            var hand=mesh.transform.InverseTransformPoint(item.transform.parent.position);
            var tip=bounds.center+axis*Vector3.Dot(bounds.extents,axis)*(Vector3.Dot(hand-bounds.center,axis)>0?-1:1);
            var obj=new GameObject("Weapon trail");obj.transform.SetParent(mesh.transform,false);obj.transform.localPosition=tip;
            renderer=obj.AddComponent<TrailRenderer>();
            renderer.time=.12f;renderer.minVertexDistance=.02f;renderer.sharedMaterial=trail;
            renderer.widthCurve=AnimationCurve.Linear(0,.09f,1,0);
            renderer.startColor=team*1.5f;renderer.endColor=new Color(team.r,team.g,team.b,0);
            renderer.shadowCastingMode=UnityEngine.Rendering.ShadowCastingMode.Off;
        }
        // Only the striking arc leaves a trail: attack, critical, combo and replay around contact.
        bool striking=frame.pose==1||frame.pose==3||frame.pose==5||frame.pose==6;
        renderer.emitting=!reduced&&frame.visible&&striking&&frame.phase>.25f&&frame.phase<.75f;
        if(reduced)renderer.Clear();
    }

    void Build()
    {
        if(sparks!=null)return;
        block=new MaterialPropertyBlock();
        spark=new Material(Shader.Find("Universal Render Pipeline/Unlit"));
        // Sprites/Default is always included in the player and blends vertex colours.
        trail=new Material(Shader.Find("Sprites/Default"));
        sparks=new Transform[SparkCount];
        for(int i=0;i<SparkCount;i++)
        {
            var obj=GameObject.CreatePrimitive(PrimitiveType.Cube);Destroy(obj.GetComponent<Collider>());
            obj.name="Contact spark";obj.transform.SetParent(transform,false);
            var renderer=obj.GetComponent<MeshRenderer>();renderer.sharedMaterial=spark;
            renderer.shadowCastingMode=UnityEngine.Rendering.ShadowCastingMode.Off;
            obj.SetActive(false);sparks[i]=obj.transform;
        }
    }

    void OnDestroy(){if(spark!=null)Destroy(spark);if(trail!=null)Destroy(trail);}
}
