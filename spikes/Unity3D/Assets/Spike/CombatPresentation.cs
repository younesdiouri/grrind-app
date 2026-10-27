using System;
using TMPro;
using UnityEngine;

/** Pure presentation of values sampled by RN's single clock. No game rules or local timers. */
[DefaultExecutionOrder(100)]
public sealed class CombatPresentation : MonoBehaviour
{
    [Serializable] public class Configuration
    {
        public string playerName="Toi",enemyName="Adversaire";
        public int playerHp,enemyHp,coins,loot;
        public bool won,limit,hideHud;
    }
    [Serializable] public class FighterState
    {
        public float hp,trailHp,damageOpacity,rise,effectOpacity,impact,impactProgress;
        public int damage;
        public bool critical;
        public string effect;
    }
    [Serializable] public class Frame
    {
        public FighterState player=new FighterState(),enemy=new FighterState();
        public int active;
        public bool finished,reduced;
        public float finale,shakeX,shakeY,zoom=1;
        public float time,opening=-1;
    }
    sealed class FighterUI
    {
        public RectTransform plate,callout,burst;
        public FacetedGraphic hp,trail,edge;
        public TextMeshProUGUI name,value,damage,effect;
        public CanvasGroup calloutAlpha;
        public FacetedGraphic[] shards;
    }
    public static readonly Color Cyan=Hex("35E4FF"),Mint=Hex("75FFB2"),Pink=Hex("FF5ACD"),
        Amber=Hex("FFD36D"),Violet=Hex("A98BFF"),White=Hex("EAF6FF"),Night=Hex("0B1124");
    Configuration config;
    Frame frame;
    Camera arena;
    FighterPose player,enemy;
    Rect viewport;
    Canvas canvas;
    RectTransform safe,root,finale;
    FighterUI playerUI,enemyUI;
    TextMeshProUGUI duel,turn,title,subtitle,gains;
    TextMeshProUGUI countdown;
    CanvasGroup resultAlpha;
    TMP_FontAsset font;
    FacetedGraphic[] confetti;

    public void Setup(Configuration value,Camera camera,FighterPose left,FighterPose right,Rect framing)
    {
        config=value;arena=camera;player=left;enemy=right;viewport=framing;
        if(canvas==null)Build();
        root.gameObject.SetActive(value!=null);
        if(value==null)return;
        playerUI.plate.gameObject.SetActive(!value.hideHud);enemyUI.plate.gameObject.SetActive(!value.hideHud);
        duel.gameObject.SetActive(!value.hideHud);
        playerUI.name.text=value.playerName;enemyUI.name.text=value.enemyName;
        title.text=value.won?"VICTOIRE":"DÉFAITE";
        title.color=value.won?Mint:Pink;
        subtitle.text=value.limit?"LIMITE ATTEINTE":value.won?"BIEN JOUÉ !":"LE PROCHAIN SERA LE TIEN";
    }
    public void DrawFrame(Frame value){frame=value;}
    void Build()
    {
        font=Resources.Load<TMP_FontAsset>("CombatUI/Oxanium");
        var obj=new GameObject("Combat presentation",typeof(RectTransform),typeof(Canvas),typeof(UnityEngine.UI.CanvasScaler));
        obj.transform.SetParent(transform,false);canvas=obj.GetComponent<Canvas>();
        canvas.renderMode=RenderMode.ScreenSpaceOverlay;canvas.sortingOrder=10;
        var scaler=obj.GetComponent<UnityEngine.UI.CanvasScaler>();
        scaler.uiScaleMode=UnityEngine.UI.CanvasScaler.ScaleMode.ScaleWithScreenSize;
        scaler.referenceResolution=new Vector2(1600,736);scaler.matchWidthOrHeight=.5f;
        root=(RectTransform)obj.transform;
        safe=Rect("Safe combat area",root,Vector2.zero,Vector2.one);
        playerUI=BuildFighter("Player",new Vector2(.025f,.81f),new Vector2(.435f,.97f),Mint);
        enemyUI=BuildFighter("Enemy",new Vector2(.565f,.81f),new Vector2(.975f,.97f),Pink);
        duel=Label("Duel",safe,new Vector2(.45f,.91f),new Vector2(.55f,.97f),"DUEL",22,Cyan);
        turn=Label("Turn",safe,new Vector2(.35f,.74f),new Vector2(.65f,.80f),"PRÊTS ?",23,White);
        countdown=Label("Referee countdown",safe,new Vector2(.36f,.66f),new Vector2(.64f,.83f),"",82,Amber);
        finale=Rect("Result",safe,new Vector2(.30f,.78f),new Vector2(.70f,.98f));
        resultAlpha=finale.gameObject.AddComponent<CanvasGroup>();resultAlpha.alpha=0;
        Plate("Result shadow",finale,Vector2.zero,Vector2.one,WithAlpha(Night,.94f));
        Plate("Top neon",finale,new Vector2(.08f,.97f),new Vector2(.92f,1),Cyan);
        title=Label("Verdict",finale,new Vector2(.03f,.35f),new Vector2(.97f,.95f),"",66,Mint);
        subtitle=Label("Subtitle",finale,new Vector2(.04f,.10f),new Vector2(.96f,.36f),"",20,White);
        gains=Label("Gains",safe,new Vector2(.26f,.69f),new Vector2(.74f,.75f),"",27,Amber);
        confetti=new FacetedGraphic[42];
        var colors=new[]{Cyan,Mint,Amber,Pink,Violet};
        for(int i=0;i<confetti.Length;i++)
        {
            confetti[i]=Plate("Confetti",safe,Vector2.zero,Vector2.zero,WithAlpha(colors[i%colors.Length],0));
            confetti[i].rectTransform.sizeDelta=new Vector2(12+i%5*3,8+i%3*4);
        }
        // Rendering only: RN owns accessible controls and the detailed loot cards.
        canvas.gameObject.SetActive(config!=null);
    }
    FighterUI BuildFighter(string name,Vector2 min,Vector2 max,Color color)
    {
        var ui=new FighterUI();
        ui.plate=Rect(name+" HUD",safe,min,max);
        Plate("Shadow",ui.plate,new Vector2(-.015f,-.06f),new Vector2(1.015f,1.03f),WithAlpha(Night,.92f));
        ui.name=Label("Name",ui.plate,new Vector2(.02f,.62f),new Vector2(.98f,1),"",29,White);
        ui.name.alignment=TextAlignmentOptions.MidlineLeft;
        ui.edge=Plate("Neon edge",ui.plate,new Vector2(0,.22f),new Vector2(1,.60f),WithAlpha(color,.45f));
        Plate("Track",ui.plate,new Vector2(.005f,.25f),new Vector2(.995f,.57f),Hex("18243E"));
        ui.trail=Plate("Damage trail",ui.plate,new Vector2(.005f,.25f),new Vector2(.995f,.57f),White);
        ui.hp=Plate("Life",ui.plate,new Vector2(.005f,.25f),new Vector2(.995f,.57f),color);
        Plate("Top facet",ui.plate,new Vector2(.02f,.51f),new Vector2(.98f,.54f),WithAlpha(White,.2f));
        for(int i=1;i<8;i++)
            Plate("Division",ui.plate,new Vector2(i/8f,.25f),new Vector2(i/8f+.004f,.57f),WithAlpha(Night,.40f));
        ui.value=Label("PV",ui.plate,new Vector2(.02f,-.01f),new Vector2(.98f,.22f),"",20,color);
        ui.value.alignment=TextAlignmentOptions.MidlineRight;
        ui.burst=Rect(name+" impact",root,Vector2.zero,Vector2.zero);
        ui.burst.sizeDelta=new Vector2(200,200);
        ui.shards=new FacetedGraphic[14];
        for(int i=0;i<ui.shards.Length;i++)
        {
            ui.shards[i]=Plate("Impact shard",ui.burst,new Vector2(.5f,.5f),new Vector2(.5f,.5f),Cyan);
            ui.shards[i].rectTransform.sizeDelta=new Vector2(18,5);
        }
        ui.callout=Rect(name+" announcements",root,Vector2.zero,Vector2.zero);
        ui.callout.sizeDelta=new Vector2(330,180);
        ui.calloutAlpha=ui.callout.gameObject.AddComponent<CanvasGroup>();
        ui.damage=Label("Damage",root,Vector2.zero,Vector2.zero,"",45,White);
        ui.damage.rectTransform.sizeDelta=new Vector2(330,80);
        ui.effect=Label("Effect",ui.callout,new Vector2(0,.38f),new Vector2(1,.62f),"",29,Cyan);
        return ui;
    }
    void LateUpdate()
    {
        if(config==null||frame==null||canvas==null||!canvas.isActiveAndEnabled)return;
        var area=Screen.safeArea;
        safe.anchorMin=new Vector2(area.xMin/Screen.width,area.yMin/Screen.height);
        safe.anchorMax=new Vector2(area.xMax/Screen.width,area.yMax/Screen.height);
        Fighter(playerUI,player,frame.player,config.playerHp,1,Mint);
        Fighter(enemyUI,enemy,frame.enemy,config.enemyHp,2,Pink);
        playerUI.plate.gameObject.SetActive(!frame.finished);
        enemyUI.plate.gameObject.SetActive(!frame.finished);
        duel.gameObject.SetActive(!frame.finished);
        turn.text=frame.finished?"":frame.active==1?"À TOI DE JOUER":frame.active==2?"L’ADVERSAIRE ATTAQUE":"PRÊTS ?";
        turn.color=frame.active==1?Mint:frame.active==2?Pink:White;
        bool opening=frame.opening>=0&&!frame.finished&&player.gameObject.activeSelf;
        float seconds=frame.opening*3.4f;
        turn.alpha=opening?0:1;
        countdown.text=!opening?"":seconds<.8f?"3":seconds<1.6f?"2":seconds<2.4f?"1":seconds<2.9f?"FIGHT !":"";
        countdown.color=seconds<2.4f?Amber:Mint;
        countdown.rectTransform.localScale=Vector3.one*(frame.reduced?1:1+.07f*Mathf.Sin(Mathf.Repeat(seconds,.8f)/.8f*Mathf.PI));
        float reveal=frame.reduced?1:Mathf.Clamp01(frame.finale*4);
        resultAlpha.alpha=frame.finished?reveal:0;
        finale.localScale=Vector3.one*(frame.reduced?1:1+.12f*Mathf.Sin(reveal*Mathf.PI));
        gains.alpha=frame.finished?Mathf.Clamp01((frame.finale-.35f)*4):0;
        int coins=Mathf.RoundToInt(config.coins*(frame.reduced?1:Mathf.Clamp01((frame.finale-.35f)/.55f)));
        gains.text=(config.coins>0?"+"+coins+" PIÈCES":"")
            +(config.coins>0&&config.loot>0?"   /   ":"")+(config.loot>0?"+"+config.loot+" OBJET"+(config.loot>1?"S":""):"");
        for(int i=0;i<confetti.Length;i++)
        {
            float delay=(i%7)*.025f;
            float progress=Mathf.Clamp01((frame.finale-delay)/(1.15f+i%5*.12f));
            float fade=Mathf.SmoothStep(0,1,Mathf.InverseLerp(.9f,1,progress));
            var shard=confetti[i];
            shard.color=WithAlpha(shard.color,frame.finished&&config.won&&!frame.reduced
                ?Mathf.Clamp01(progress*12)*(1-fade):0);
            float x=.05f+Mathf.Repeat(i*.618034f,1)*.9f+Mathf.Sin(i+progress*5)*.035f;
            shard.rectTransform.anchoredPosition=new Vector2(x*safe.rect.width,(1.08f-progress)*safe.rect.height);
            shard.rectTransform.localRotation=Quaternion.Euler(0,0,i*137+progress*(i%2==0?300:-300));
            shard.rectTransform.localScale=new Vector3(.45f+Mathf.Abs(Mathf.Cos(i+progress*8))*.55f,1,1);
        }
    }
    void Fighter(FighterUI ui,FighterPose actor,FighterState state,int maxHp,int side,Color color)
    {
        float fraction=maxHp>0?state.hp/maxHp:0;
        ui.hp.Fill=fraction;ui.trail.Fill=maxHp>0?state.trailHp/maxHp:0;
        ui.value.text=Mathf.RoundToInt(state.hp)+" / "+maxHp+" PV";
        ui.edge.color=WithAlpha(color,frame.active==side&&!frame.finished?1:.4f);
        // Project after FighterPose solved the skeleton, including the lunge and dodge.
        Vector3 center=Vector3.Lerp(actor.Bone(HumanBodyBones.Hips).position,actor.Bone(HumanBodyBones.Head).position,.55f);
        Vector3 body=actor.gameObject.activeInHierarchy
            ?arena.WorldToScreenPoint(center)
            :new Vector3(Screen.width*(viewport.x+viewport.width*(side==1?.25f:.75f)),Screen.height*(viewport.y+viewport.height*.52f),1);
        var point=new Vector2(body.x/canvas.scaleFactor,body.y/canvas.scaleFactor);
        ui.callout.anchoredPosition=point;
        Vector3 head=actor.gameObject.activeInHierarchy
            ?arena.WorldToScreenPoint(actor.Bone(HumanBodyBones.Head).position+Vector3.up*.2f)
            :body+Vector3.up*(Screen.height*viewport.height*.25f);
        ui.damage.rectTransform.anchoredPosition=new Vector2(head.x/canvas.scaleFactor,head.y/canvas.scaleFactor+28+state.rise*42);
        ui.burst.anchoredPosition=point;
        ui.calloutAlpha.alpha=frame.finished||body.z<0?0:1;
        ui.damage.text=state.damageOpacity>0?"−"+state.damage:"";
        ui.damage.color=WithAlpha(state.critical?Amber:White,state.damageOpacity);
        ui.damage.rectTransform.localScale=Vector3.one*(state.critical&&!frame.reduced?1.18f:1);
        ui.effect.text=state.effect;
        ui.effect.color=WithAlpha(state.effect=="CRITIQUE !"?Amber:state.effect=="COMBO"?Violet:Cyan,state.effectOpacity);
        for(int i=0;i<ui.shards.Length;i++)
        {
            float angle=i*2.39996f;
            float progress=state.impactProgress;
            var shard=ui.shards[i];
            shard.color=WithAlpha(state.impact>1?Amber:Cyan,
                state.impact>0&&!frame.finished?(1-progress)*(1-progress):0);
            float travel=(18+progress*95)*(state.impact>1?1.3f:1);
            shard.rectTransform.anchoredPosition=new Vector2(Mathf.Cos(angle),Mathf.Sin(angle))*travel;
            shard.rectTransform.localRotation=Quaternion.Euler(0,0,angle*Mathf.Rad2Deg);
            shard.rectTransform.localScale=Vector3.one*(1-progress*.7f);
        }
    }
    static RectTransform Rect(string name,Transform parent,Vector2 min,Vector2 max)
    {
        var rect=(RectTransform)new GameObject(name,typeof(RectTransform)).transform;
        rect.SetParent(parent,false);rect.anchorMin=min;rect.anchorMax=max;
        rect.offsetMin=rect.offsetMax=Vector2.zero;return rect;
    }
    static FacetedGraphic Plate(string name,Transform parent,Vector2 min,Vector2 max,Color color)
    {
        var plate=Rect(name,parent,min,max).gameObject.AddComponent<FacetedGraphic>();
        plate.color=color;plate.raycastTarget=false;return plate;
    }
    TextMeshProUGUI Label(string name,Transform parent,Vector2 min,Vector2 max,string value,float size,Color color)
    {
        var text=Rect(name,parent,min,max).gameObject.AddComponent<TextMeshProUGUI>();
        text.font=font;text.text=value;text.fontSize=size;text.color=color;
        text.alignment=TextAlignmentOptions.Center;text.raycastTarget=false;text.richText=false;
        text.textWrappingMode=TextWrappingModes.NoWrap;text.enableAutoSizing=true;
        text.fontSizeMin=size*.65f;text.fontSizeMax=size;
        text.outlineWidth=.16f;text.outlineColor=WithAlpha(Night,1);
        return text;
    }
    static Color Hex(string value){ColorUtility.TryParseHtmlString("#"+value,out var color);return color;}
    static Color WithAlpha(Color color,float alpha){color.a=alpha;return color;}
}
