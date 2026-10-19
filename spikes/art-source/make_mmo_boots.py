"""Separate trainers built in metres around the ankle socket; no footwear on the base body."""
import bpy,bmesh, math,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'spikes/Unity3D/Assets/Characters/MMOAthlete/Gear'
ns={'__name__':'gear_library','__file__':str(ROOT/'spikes/art-source/make_mmo_equipment.py')};exec((ROOT/'spikes/art-source/make_mmo_equipment.py').read_text(),ns)
mat=ns['material'];bar=ns['bar']
for name in [o.name for o in bpy.data.objects if o.name.startswith('SprintSemelle')]:
 old=bpy.data.objects.get(name)
 if old is not None:
  for child in list(old.children_recursive):bpy.data.objects.remove(child,do_unlink=True)
  bpy.data.objects.remove(old,do_unlink=True)
navy=mat('ShoeNavy',(.025,.045,.085));cream=mat('ShoeCream',(.72,.67,.53));gold=mat('ShoeGold',(.65,.32,.045),.25)
def loft(name,sections,material,root,bottom=.026):
 vertices=[];faces=[]
 for y,width,top in sections:
  if 'sole' in name:
   ring=[(width-.003,bottom),(width,bottom+.003),(width,top-.003),(width-.003,top),(-width+.003,top),(-width,top-.003),(-width,bottom+.003),(-width+.003,bottom)]
  else:
   ring=[(math.cos(i*math.pi/8)*width,bottom+math.sin(i*math.pi/8)*(top-bottom)) for i in range(9)]
   ring.extend([(-width,bottom-.004),(width,bottom-.004)])
  n=len(ring)
  vertices.extend([(x+.020,y-.006,z-.105) for x,z in ring])
 for j in range(len(sections)-1):
  for i in range(n):a=j*n+i;b=j*n+(i+1)%n;faces.append((a,b,b+n,a+n))
 faces.extend([tuple(reversed(range(n))),tuple((len(sections)-1)*n+i for i in range(n))])
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(vertices,[],faces);mesh.materials.append(material)
 o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);o.parent=root
 for f in mesh.polygons:f.use_smooth=True
 return o

def cuff(root):
 verts=[];faces=[];n=24
 for rx,ry,z in [(.050,.062,.10),(.049,.061,.168),(.043,.055,.168),(.044,.056,.10)]:
  verts.extend([(.018+math.cos(i*math.tau/n)*rx,.039+math.sin(i*math.tau/n)*ry,z-.105) for i in range(n)])
 for ring in range(4):
  for i in range(n):faces.append((ring*n+i,ring*n+(i+1)%n,((ring+1)%4)*n+(i+1)%n,((ring+1)%4)*n+i))
 mesh=bpy.data.meshes.new('Ankle cuff');mesh.from_pydata(verts,[],faces);mesh.materials.append(navy)
 obj=bpy.data.objects.new('Ankle cuff',mesh);bpy.context.collection.objects.link(obj);obj.parent=root
 for p in mesh.polygons:p.use_smooth=True

for side in ['Left','Right']:
 root=bpy.data.objects.new('SprintSemelle'+side,None);bpy.context.collection.objects.link(root)
 sections=[(.109,.032,.104),(.089,.047,.138),(.044,.051,.146),(-.035,.055,.132),(-.090,.061,.093),(-.165,.063,.071),(-.213,.045,.065),(-.225,.014,.047)]
 loft('Navy upper',[(y-.003 if y>0 else y+.003,w,t) for y,w,t in sections],navy,root)
 loft('Cream sole',[(y,w+.004,.031) for y,w,t in sections],cream,root,bottom=-.002)
 cuff(root)
 if side=='Right':
  for o in root.children_recursive:
   if o.type=='MESH':
    # Mirror the slight outward toe offset while preserving outward normals.
    for v in o.data.vertices:v.co.x=-v.co.x
    for poly in o.data.polygons:poly.flip()
 for o in root.children_recursive:
  if o.type=='MESH':
   bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free()
 ns['combine_materials'](root)
 total=0
 for obj in root.children_recursive:
  if obj.type!='MESH':continue
  bm=bmesh.new();bm.from_mesh(obj.data)
  assert all(e.is_manifold for e in bm.edges),f'Open shoe shell: {obj.name}'
  bm.free();obj.data.calc_loop_triangles();total+=len(obj.data.loop_triangles)
 assert 0<total<2000,'Shoe exceeds the mobile geometry budget'
 bpy.ops.object.select_all(action='DESELECT');root.select_set(True)
 for o in root.children_recursive:o.select_set(True)
 bpy.context.view_layer.objects.active=root
 bpy.ops.export_scene.fbx(filepath=str(OUT/(root.name+'.fbx')),use_selection=True,object_types={'EMPTY','MESH'},bake_anim=False,axis_forward='-Z',axis_up='Y')
 print(root.name,'exported')
