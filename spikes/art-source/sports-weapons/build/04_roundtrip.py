from pathlib import Path
import bpy,json
ROOT=Path(__file__).resolve().parents[2]
for name in ['fer-play','huilesson']:
 asset=ROOT/name;manifest=json.loads((asset/'asset-manifest.json').read_text());fbx=next((asset/'exports').glob('*.fbx'))
 bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.fbx(filepath=str(fbx))
 meshes=[o for o in bpy.context.scene.objects if o.type=='MESH'];assert len(meshes)==1
 o=meshes[0];tris=sum(len(p.vertices)-2 for p in o.data.polygons)
 assert tris==manifest['triangles'] and o.data.uv_layers
 pts=[o.matrix_world@v.co for v in o.data.vertices];dims=[max(p[i] for p in pts)-min(p[i] for p in pts) for i in range(3)]
 assert abs(max(dims)-manifest['length_m'])<.001,(name,dims)
 d=dict(triangles=tris,dimensions_m=dims,materials=len(o.data.materials),uv=True,pass_roundtrip=True)
 (asset/'review/roundtrip.json').write_text(json.dumps(d,indent=2));print(name,d)
