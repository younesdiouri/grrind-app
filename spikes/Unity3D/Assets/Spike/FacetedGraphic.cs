using UnityEngine;

/** A clipped neon plate shared by the combat HUD, impact shards and result banner. */
[RequireComponent(typeof(CanvasRenderer))]
public sealed class FacetedGraphic : UnityEngine.UI.MaskableGraphic
{
    float fill = 1;
    public float Fill { get => fill; set { value=Mathf.Clamp01(value); if(fill==value)return; fill=value; SetVerticesDirty(); } }
    protected override void OnPopulateMesh(UnityEngine.UI.VertexHelper mesh)
    {
        mesh.Clear();
        var r=rectTransform.rect;
        float width=r.width*fill;
        if(width<=0||r.height<=0)return;
        float cut=Mathf.Min(12,Mathf.Min(width,r.height)*.32f);
        var points=new[]{new Vector2(r.xMin+cut,r.yMin),new Vector2(r.xMin+width,r.yMin),
            new Vector2(r.xMin+width,r.yMax-cut),new Vector2(r.xMin+width-cut,r.yMax),
            new Vector2(r.xMin,r.yMax),new Vector2(r.xMin,r.yMin+cut)};
        mesh.AddVert(new Vector2(r.xMin+width*.5f,r.center.y),color,Vector2.zero);
        for(int i=0;i<points.Length;i++)
        {
            var tint=color;float light=i<2?.74f:i<4?1.14f:1;
            tint.r*=light;tint.g*=light;tint.b*=light;
            mesh.AddVert(points[i],tint,Vector2.zero);
        }
        for(int i=0;i<points.Length;i++)mesh.AddTriangle(0,i+1,(i+1)%points.Length+1);
    }
}
