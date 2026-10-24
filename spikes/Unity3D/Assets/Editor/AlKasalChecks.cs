using System;
using System.Linq;
using UnityEditor;
using UnityEngine;

public static class AlKasalChecks
{
    public static object Validate()
    {
        if(!EditorApplication.isPlaying)throw new InvalidOperationException("Run in Play mode");
        var bridge=UnityEngine.Object.FindFirstObjectByType<BattleBridge>();
        int frames=0;float nearestContact=float.MaxValue,minY=1,maxY=0;
        foreach(int count in new[]{1,7,20})
        {
            var config=new BattleBridge.Configuration {scene="raid",raid=new RaidScene.Configuration {
                members=Enumerable.Range(0,count).Select(i=>new RaidScene.Member{id="m"+i,name="Member "+i}).ToArray()}};
            bridge.Configure(JsonUtility.ToJson(config));
            var raid=bridge.GetComponent<RaidScene>();
            if(raid.heroes.Length!=count||raid.boss.GetComponentInChildren<Renderer>().bounds.size.y<2.59f)
                throw new Exception("Missing member or wrong boss scale");
            foreach(bool boss in new[]{false,true})
            foreach(float phase in new[]{0f,.25f,.5f,.75f,1f})
            {
                var frame=new RaidScene.Frame {time=3000,arrival=1,boss=boss,hit=phase==.5f?1:0,
                    heroes=Enumerable.Range(0,count).Select(i=>new RaidScene.HeroFrame {pose=i==0?1:0,phase=phase}).ToArray()};
                raid.Draw(frame);
                foreach(var hero in raid.heroes)
                {
                    hero.SendMessage("LateUpdate");
                    if(Mathf.Abs(hero.placement.y)>.001f)throw new Exception("A melee actor left the ground");
                    foreach(var renderer in hero.GetComponentsInChildren<SkinnedMeshRenderer>())
                    {
                        // Renderer bounds include animation margins; measure the actual posed vertices.
                        var mesh=new Mesh();renderer.BakeMesh(mesh);
                        foreach(var vertex in mesh.vertices)
                        {
                            var p=raid.arenaCamera.WorldToViewportPoint(renderer.transform.TransformPoint(vertex));
                            minY=Mathf.Min(minY,p.y);maxY=Mathf.Max(maxY,p.y);
                            if(p.x<.035f||p.x>.97f||p.y<.22f||p.y>.90f)throw new Exception("Actor outside safe arena: "+p);
                        }
                        UnityEngine.Object.DestroyImmediate(mesh);
                    }
                }
                if(phase==.5f)
                {
                    var target=(boss?raid.boss:raid.minions[0]).GetComponentsInChildren<MeshRenderer>()
                        .Where(r=>r.name!="Contact shadow").ToArray();
                    var hands=new[]{raid.heroes[0].Bone(HumanBodyBones.RightHand).position,
                        raid.heroes[0].Bone(HumanBodyBones.LeftHand).position};
                    float gap=hands.Min(hand=>target.Min(r=>Vector3.Distance(hand,r.bounds.ClosestPoint(hand))));
                    nearestContact=Mathf.Min(nearestContact,gap);
                    if(gap>.28f)throw new Exception("Melee hand misses its target by "+gap+" m");
                }
                frames++;
            }
            raid.Draw(new RaidScene.Frame {time=3500,arrival=1,boss=true,reduced=true,verdict=-1,verdictPhase=1});
            if(raid.GetComponentsInChildren<MeshFilter>().Any(m=>m.name=="Faceted snowfall"))
                throw new Exception("Snow still moves in reduced motion");
        }
        // Returning from a raid must restore the existing inspector, then the duel.
        bridge.Configure("{\"inspection\":true}");
        if(bridge.GetComponent<RaidScene>().enabled||!bridge.arenaCamera.orthographic)
            throw new Exception("Raid leaked into avatar inspection");
        bridge.Configure("{}");
        if(bridge.GetComponent<RaidScene>().enabled||bridge.arenaCamera.orthographic)
            throw new Exception("Raid leaked into duel");
        return new {frames,nearestContact,minY,maxY,participants=new[]{1,7,20},raidInspectorDuel=true};
    }
}
