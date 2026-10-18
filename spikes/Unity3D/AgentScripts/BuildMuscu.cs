using System;
using System.Collections.Generic;
using System.Linq;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;

public static class BuildMuscu
{
    static string Folder;
    static int meshIndex;
    public static string Create()=>CreateVariant(false);
    public static string CreateFemale()=>CreateVariant(true);
    static string CreateVariant(bool female)
    {
        Folder="Assets/Spike/"+(female?"Female":"Muscu");meshIndex=0;
        if (!AssetDatabase.IsValidFolder(Folder)) AssetDatabase.CreateFolder("Assets/Spike", female?"Female":"Muscu");
        var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene,NewSceneMode.Single);
        var source=AssetDatabase.LoadAssetAtPath<GameObject>("Assets/Characters/Quaternius/Superhero_"+(female?"Female":"Male")+"_FullBody.fbx");
        var actor=UnityEngine.Object.Instantiate(source);
        actor.name=female?"Female avatar":"Male avatar";
        if(female)actor.transform.localScale=Vector3.one*1.03f;
        var animator=actor.GetComponent<Animator>();
        if (!animator.isHuman) throw new Exception("CC0 base must import as Humanoid.");
        var skin=Mat("Skin",new Color(.86f,.72f,.58f));
        skin.SetTexture("_BaseMap",AssetDatabase.LoadAssetAtPath<Texture2D>("Assets/Characters/Quaternius/"+(female?"T_Superhero_Female_Light_BaseColor.png":"T_Superhero_Male_Ligh.png")));
        var tank=Mat("Tank",new Color(.58f,.61f,.64f));
        var shorts=Mat("Shorts",new Color(.075f,.092f,.12f));
        var hair=Mat("Hair",new Color(.055f,.039f,.035f));
        var ivory=Mat("Ivory",new Color(.91f,.85f,.65f));
        var amber=Mat("Amber",new Color(.66f,.28f,.045f));
        var gold=Mat("Gold",new Color(.85f,.54f,.12f));
        var iron=Mat("Iron",new Color(.09f,.15f,.25f));
        var steel=Mat("Steel",new Color(.38f,.49f,.61f));
        var eyes=Mat("Eyes",Color.white);
        eyes.SetTexture("_BaseMap",AssetDatabase.LoadAssetAtPath<Texture2D>("Assets/Characters/Quaternius/T_Eye_Brown.png"));
        gold.SetFloat("_Metallic",.6f);gold.SetFloat("_Smoothness",.3f);
        steel.SetFloat("_Metallic",.5f);steel.SetFloat("_Smoothness",.25f);
        foreach(var renderer in actor.GetComponentsInChildren<SkinnedMeshRenderer>())
        {
            renderer.updateWhenOffscreen=true;
            if(renderer.name.Equals("SuperHero_Male",StringComparison.OrdinalIgnoreCase)||renderer.name.Equals("SuperHero_Female",StringComparison.OrdinalIgnoreCase))
            {
                renderer.sharedMaterial=skin;
                Clothing(renderer,animator,tank,shorts);
            }
            else renderer.sharedMaterial=renderer.name=="Eyes" ? eyes : hair;
        }
        var head=animator.GetBoneTransform(HumanBodyBones.Head);
        var hairSource=AssetDatabase.LoadAssetAtPath<GameObject>("Assets/Characters/Quaternius/"+(female?"Hair_Buns":"Hair_SimpleParted")+"_Rigged.fbx");
        var sourceHair=hairSource.GetComponentInChildren<SkinnedMeshRenderer>();
        var hairObject=new GameObject("Rigged hairstyle",typeof(SkinnedMeshRenderer));hairObject.transform.SetParent(actor.transform,false);
        var hairRenderer=hairObject.GetComponent<SkinnedMeshRenderer>();hairRenderer.sharedMesh=sourceHair.sharedMesh;
        hairRenderer.bones=sourceHair.bones.Select(b=>actor.GetComponentsInChildren<Transform>().Single(t=>t.name==b.name)).ToArray();
        hairRenderer.rootBone=head;hairRenderer.sharedMaterial=hair;hairRenderer.updateWhenOffscreen=true;

        var glasses=new GameObject("Course-poursuite").transform;
        glasses.SetParent(head,false);
        glasses.position=new Vector3(0,1.704f,-.105f); glasses.rotation=Quaternion.identity;
        foreach(var side in new[]{-1f,1f})
        {
            var center=new Vector3(side*.043f,0,0);
            MeshPart(glasses,"Ivory rim",Ring(.034f,.009f,12),center,ivory);
            Primitive(glasses,"Amber lens",PrimitiveType.Sphere,center+Vector3.forward*.003f,new Vector3(.066f,.066f,.014f),amber);
            Bar(glasses,"Temple",new Vector3(side*.078f,0,0),new Vector3(side*.079f,0,.105f),.006f,ivory);
            for(int i=0;i<3;i++)
            {
                var wing=new Mesh();
                var a=new Vector3(side*.074f,-.013f+i*.011f,.018f);var b=new Vector3(side*(.132f-i*.009f),.008f+i*.017f,.045f);var c=new Vector3(side*.083f,.003f+i*.011f,.025f);
                wing.vertices=new[]{a,b,c,a+Vector3.forward*.006f,b+Vector3.forward*.006f,c+Vector3.forward*.006f};
                var indices=new[]{0,2,1,3,4,5,0,1,3,1,4,3,1,2,4,2,5,4,2,0,5,0,3,5};
                if(side<0)Array.Reverse(indices);wing.triangles=indices;wing.RecalculateNormals();
                MeshPart(glasses,"Gold wing",wing,Vector3.zero,gold);
            }
        }
        Bar(glasses,"Bridge",new Vector3(-.013f,0,-.002f),new Vector3(.013f,0,-.002f),.006f,ivory);

        var hand=animator.GetBoneTransform(HumanBodyBones.RightHand);
        var weapon=new GameObject("Haltere ego").transform;
        weapon.SetParent(hand,false); weapon.position=hand.position+new Vector3(-.076f,-.025f,0);
        weapon.rotation=Quaternion.Euler(90,0,0);
        Cylinder(weapon,"Grip",0,.012f,.15f,gold);
        foreach(var side in new[]{-1f,1f})
        {
            MeshPart(weapon,"Octagonal weight",Prism(.063f,.04f,8),new Vector3(0,side*.10f,0),iron);
            MeshPart(weapon,"Steel lip",Prism(.052f,.008f,8),new Vector3(0,side*.124f,0),steel);
            Cylinder(weapon,"Brass hub",side*.131f,.019f,.009f,gold);
        }
        // Compact game proportions; both gear roots inherit the same head/hand scaling.
        head.localScale=Vector3.one*1.2f;
        actor.transform.rotation=Quaternion.identity;
        var camera=new GameObject("Main Camera",typeof(Camera)).GetComponent<Camera>();
        camera.tag="MainCamera"; camera.orthographic=true; camera.orthographicSize=1.12f;
        camera.transform.position=new Vector3(2.8f,1.8f,5); camera.transform.LookAt(new Vector3(0,.98f,0));
        camera.backgroundColor=new Color(.025f,.035f,.065f); camera.clearFlags=CameraClearFlags.SolidColor;
        camera.nearClipPlane=.02f; camera.farClipPlane=30;
        var key=new GameObject("Warm key",typeof(Light)).GetComponent<Light>();key.type=LightType.Directional;
        key.transform.rotation=Quaternion.Euler(42,145,0);key.intensity=1.2f;key.color=new Color(1,.95f,.88f);
        var fill=new GameObject("Soft fill",typeof(Light)).GetComponent<Light>();fill.type=LightType.Directional;
        fill.transform.rotation=Quaternion.Euler(20,-35,0);fill.intensity=.45f;fill.color=new Color(.72f,.8f,1);
        RenderSettings.ambientMode=UnityEngine.Rendering.AmbientMode.Flat;RenderSettings.ambientLight=new Color(.5f,.52f,.57f);
        var bench=actor.AddComponent<MuscuPose>();
        bench.actor=animator; bench.inspectionCamera=camera; bench.weapon=weapon; bench.glasses=glasses;
        var animationNames=new[]{"Idle_Shield_Loop","Sword_Regular_A_Rec","Idle_Shield_Break","Melee_Hook","Sword_Block","Sword_Regular_B","Melee_Hook_Rec","Idle_No_Loop"};
        var available=AssetDatabase.LoadAllAssetsAtPath("Assets/Animations/Quaternius/UAL2Clean.fbx").OfType<AnimationClip>().ToArray();
        bench.clips=animationNames.Select(name=>available.Single(clip=>clip.name=="Armature|"+name)).ToArray();
        PrefabUtility.SaveAsPrefabAsset(actor,Folder+"/Avatar.prefab");
        EditorSceneManager.SaveScene(scene,Folder+"/Muscu.unity"); AssetDatabase.SaveAssets();
        return "Muscu CC0 base, matte palette, bare feet, separate rigged gear. Review required.";
    }

    static void Clothing(SkinnedMeshRenderer body,Animator animator,Material tank,Material shorts)
    {
        var sourceMesh=body.sharedMesh;
        var shirtVertices=new List<Vector3>();var shirtNormals=new List<Vector3>();var shirtWeights=new List<BoneWeight>();var shirtIndices=new List<int>();
        var sourcePositions=sourceMesh.vertices;var sourceNormals=sourceMesh.normals;var sourceWeights=sourceMesh.boneWeights;var sourceIndices=sourceMesh.triangles;
        for(int i=0;i<sourceIndices.Length;i+=3)
        {
            var polygon=new List<ClothVertex>();
            for(int j=0;j<3;j++){int n=sourceIndices[i+j];polygon.Add(new ClothVertex{p=body.transform.TransformPoint(sourcePositions[n]+sourceNormals[n]*.018f),w=sourceWeights[n],n=sourceNormals[n]});}
            // Refine only boundary triangles: a curved neckline must not follow the coarse body's triangle edges.
            foreach(var triangle in RefineNeckline(polygon,2))
            {
                var cut=Clip(triangle,p=>p.y-.965f);
                cut=Clip(cut,p=>.225f-Mathf.Abs(p.x));
                cut=Clip(cut,Neckline);
                for(int j=1;j<cut.Count-1;j++)foreach(var v in new[]{cut[0],cut[j],cut[j+1]})
                {shirtIndices.Add(shirtVertices.Count);shirtVertices.Add(body.transform.InverseTransformPoint(v.p));shirtNormals.Add(v.n);shirtWeights.Add(v.w);}
            }
        }
        var shirt=new Mesh{vertices=shirtVertices.ToArray(),normals=shirtNormals.ToArray(),triangles=shirtIndices.ToArray(),boneWeights=shirtWeights.ToArray(),bindposes=sourceMesh.bindposes};shirt.RecalculateBounds();SaveClothing(body,"TankMesh",shirt,tank);
        var source=body.sharedMesh;var positions=source.vertices;var normals=source.normals;var boneWeights=source.boneWeights;
        var pantsVertices=new List<Vector3>();var pantsNormals=new List<Vector3>();var pantsWeights=new List<BoneWeight>();var pantsIndices=new List<int>();
        var indices=source.triangles;
        for(int i=0;i<indices.Length;i+=3)
        {
            var poly=new List<ClothVertex>();
            for(int j=0;j<3;j++){int n=indices[i+j];poly.Add(new ClothVertex{p=body.transform.TransformPoint(positions[n]+normals[n]*.008f),w=boneWeights[n],n=normals[n]});}
            poly=Clip(Clip(poly,p=>p.y-.70f),p=>1.015f-p.y);
            for(int j=1;j<poly.Count-1;j++)foreach(var v in new[]{poly[0],poly[j],poly[j+1]})
            {pantsIndices.Add(pantsVertices.Count);pantsVertices.Add(body.transform.InverseTransformPoint(v.p));pantsNormals.Add(v.n);pantsWeights.Add(v.w);}
        }
        var pants=new Mesh{vertices=pantsVertices.ToArray(),normals=pantsNormals.ToArray(),triangles=pantsIndices.ToArray(),boneWeights=pantsWeights.ToArray(),bindposes=source.bindposes};pants.RecalculateBounds();SaveClothing(body,"ShortsMesh",pants,shorts);
    }
    struct ClothVertex {public Vector3 p,n;public BoneWeight w;}
    static float Neckline(Vector3 p)=>1.40f+.13f*Mathf.Exp(-Mathf.Pow((Mathf.Abs(p.x)-.155f)/.045f,4))-p.y;
    static IEnumerable<List<ClothVertex>> RefineNeckline(List<ClothVertex> triangle,int depth)
    {
        bool crossing=triangle.Any(v=>Neckline(v.p)>=0)&&triangle.Any(v=>Neckline(v.p)<0);
        if(depth==0||!crossing){yield return triangle;yield break;}
        var a=triangle[0];var b=triangle[1];var c=triangle[2];
        var ab=Between(a,b,.5f);var bc=Between(b,c,.5f);var ca=Between(c,a,.5f);
        foreach(var part in new[]{new List<ClothVertex>{a,ab,ca},new List<ClothVertex>{ab,b,bc},new List<ClothVertex>{ca,bc,c},new List<ClothVertex>{ab,bc,ca}})
            foreach(var refined in RefineNeckline(part,depth-1))yield return refined;
    }
    static ClothVertex Between(ClothVertex a,ClothVertex b,float t)
    {
        var map=new Dictionary<int,float>();AddWeight(map,a.w,1-t);AddWeight(map,b.w,t);
        var sorted=map.OrderByDescending(x=>x.Value).Take(4).ToArray();float total=sorted.Sum(x=>x.Value);
        var w=new BoneWeight();for(int k=0;k<sorted.Length;k++){float value=sorted[k].Value/total;int bone=sorted[k].Key;if(k==0){w.boneIndex0=bone;w.weight0=value;}if(k==1){w.boneIndex1=bone;w.weight1=value;}if(k==2){w.boneIndex2=bone;w.weight2=value;}if(k==3){w.boneIndex3=bone;w.weight3=value;}}
        return new ClothVertex{p=Vector3.Lerp(a.p,b.p,t),n=Vector3.Lerp(a.n,b.n,t).normalized,w=w};
    }
    static List<ClothVertex> Clip(List<ClothVertex> polygon,Func<Vector3,float> distance)
    {
        var result=new List<ClothVertex>();
        for(int i=0;i<polygon.Count;i++)
        {
            var a=polygon[i];var b=polygon[(i+1)%polygon.Count];float da=distance(a.p),db=distance(b.p);bool ai=da>=0,bi=db>=0;
            if(ai)result.Add(a);
            if(ai==bi)continue;
            float t=da/(da-db);var map=new Dictionary<int,float>();
            AddWeight(map,a.w,1-t);AddWeight(map,b.w,t);var sorted=map.OrderByDescending(x=>x.Value).Take(4).ToArray();float total=sorted.Sum(x=>x.Value);
            var w=new BoneWeight();for(int k=0;k<sorted.Length;k++){float value=sorted[k].Value/total;int bone=sorted[k].Key;if(k==0){w.boneIndex0=bone;w.weight0=value;}if(k==1){w.boneIndex1=bone;w.weight1=value;}if(k==2){w.boneIndex2=bone;w.weight2=value;}if(k==3){w.boneIndex3=bone;w.weight3=value;}}
            result.Add(new ClothVertex{p=Vector3.Lerp(a.p,b.p,t),n=Vector3.Lerp(a.n,b.n,t).normalized,w=w});
        }
        return result;
    }
    static void AddWeight(Dictionary<int,float> map,BoneWeight w,float scale)
    {
        var bones=new[]{w.boneIndex0,w.boneIndex1,w.boneIndex2,w.boneIndex3};var values=new[]{w.weight0,w.weight1,w.weight2,w.weight3};
        for(int i=0;i<4;i++)if(values[i]>0){map.TryGetValue(bones[i],out var old);map[bones[i]]=old+values[i]*scale;}
    }
    static void SaveClothing(SkinnedMeshRenderer body,string name,Mesh mesh,Material material)
    {
        mesh=StoreMesh(name,mesh);
        var obj=new GameObject(name,typeof(SkinnedMeshRenderer));obj.transform.SetParent(body.transform,false);
        var r=obj.GetComponent<SkinnedMeshRenderer>();r.sharedMesh=mesh;r.bones=body.bones;r.rootBone=body.rootBone;r.sharedMaterial=material;r.updateWhenOffscreen=true;
    }

    static Material Mat(string name,Color color)
    {
        var path=Folder+"/"+name+".mat"; var m=AssetDatabase.LoadAssetAtPath<Material>(path);
        if(m==null){m=new Material(Shader.Find("Universal Render Pipeline/Lit"));AssetDatabase.CreateAsset(m,path);}
        m.shader=Shader.Find("Universal Render Pipeline/Lit");m.SetColor("_BaseColor",color);m.SetFloat("_Smoothness",.05f);return m;
    }
    static GameObject Primitive(Transform parent,string name,PrimitiveType type,Vector3 position,Vector3 scale,Material mat)
    {
        var obj=GameObject.CreatePrimitive(type); UnityEngine.Object.DestroyImmediate(obj.GetComponent<Collider>());
        obj.name=name;obj.transform.SetParent(parent,false);obj.transform.localPosition=position;obj.transform.localScale=scale;
        obj.GetComponent<Renderer>().sharedMaterial=mat; return obj;
    }
    static void Cylinder(Transform parent,string name,float offset,float radius,float length,Material mat)
        =>Primitive(parent,name,PrimitiveType.Cylinder,Vector3.up*offset,new Vector3(radius*2,length/2,radius*2),mat);
    static void Bar(Transform parent,string name,Vector3 a,Vector3 b,float radius,Material mat)
    {
        var obj=Primitive(parent,name,PrimitiveType.Cylinder,(a+b)/2,new Vector3(radius*2,(a-b).magnitude/2,radius*2),mat);
        obj.transform.localRotation=Quaternion.FromToRotation(Vector3.up,b-a);
    }
    static void MeshPart(Transform parent,string name,Mesh mesh,Vector3 position,Material material)
    {
        mesh=StoreMesh("Gear-"+(meshIndex++)+"-"+name.Replace(" ","_"),mesh);
        var obj=new GameObject(name,typeof(MeshFilter),typeof(MeshRenderer)); obj.transform.SetParent(parent,false);
        obj.transform.localPosition=position; obj.GetComponent<MeshFilter>().sharedMesh=mesh;obj.GetComponent<Renderer>().sharedMaterial=material;
    }
    static Mesh StoreMesh(string name,Mesh mesh)
    {
        var path=Folder+"/"+name+".asset";var saved=AssetDatabase.LoadAssetAtPath<Mesh>(path);
        if(saved==null){AssetDatabase.CreateAsset(mesh,path);return mesh;}
        EditorUtility.CopySerialized(mesh,saved);UnityEngine.Object.DestroyImmediate(mesh);return saved;
    }
    static Mesh Ring(float radius,float thickness,int segments)
    {
        var v=new List<Vector3>();var t=new List<int>();
        for(int i=0;i<segments;i++)for(int j=0;j<4;j++)
        {float a=i*Mathf.PI*2/segments;float r=radius+(j==0||j==3?-thickness:thickness)/2;v.Add(new Vector3(Mathf.Cos(a)*r,Mathf.Sin(a)*r,j<2?-.005f:.005f));}
        for(int i=0;i<segments;i++)for(int j=0;j<4;j++)
        {int a=i*4+j,b=((i+1)%segments)*4+j,c=i*4+(j+1)%4,d=((i+1)%segments)*4+(j+1)%4;t.AddRange(new[]{a,b,c,c,b,d});}
        var m=new Mesh{vertices=v.ToArray(),triangles=t.ToArray()};m.RecalculateNormals();return m;
    }
    static Mesh Prism(float radius,float depth,int segments)
    {
        var v=new List<Vector3>();var t=new List<int>();
        for(int side=0;side<2;side++)for(int i=0;i<segments;i++)
        {float a=i*Mathf.PI*2/segments;v.Add(new Vector3(Mathf.Cos(a)*radius,(side-.5f)*depth,Mathf.Sin(a)*radius));}
        for(int i=0;i<segments;i++){int n=(i+1)%segments;t.AddRange(new[]{i,n,i+segments,n,n+segments,i+segments});}
        for(int i=1;i<segments-1;i++)t.AddRange(new[]{0,i+1,i,segments,segments+i,segments+i+1});
        var m=new Mesh{vertices=v.ToArray(),triangles=t.ToArray()};m.RecalculateNormals();return m;
    }
}
