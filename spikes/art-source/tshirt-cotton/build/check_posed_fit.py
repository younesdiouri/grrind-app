"""Check actual Unity BakeMesh snapshots for garment/skin intersections and cut clearance.
Run with Blender Python; snapshot format: int32 vertex/triangle-index counts,
then float32 XYZ + int32 cut flag per vertex, then int32 triangle indices.
The geometric check complements, never replaces, review of visible pixels.
"""
from pathlib import Path
import json,struct,sys,hashlib
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.geometry import intersect_ray_tri
ROOT=Path(__file__).resolve().parents[4]
FRAMES=ROOT/'artifacts/unity-spike/anatomy-posed'
OUT=ROOT/'references/quaternius-poc/anatomy-review/posed-fit.json'

def read(path):
 data=path.read_bytes();nv,ni=struct.unpack_from('<ii',data)
 records=np.frombuffer(data,dtype=np.dtype([('point','<f4',(3,)),('cut','<i4')]),offset=8,count=nv)
 points=[Vector(v) for v in records['point']]
 indices=np.frombuffer(data,dtype='<i4',offset=8+16*nv,count=ni).reshape((-1,3))
 triangles=[tuple(int(i) for i in t) for t in indices]
 tree=BVHTree.FromPolygons(points,triangles,all_triangles=True,epsilon=0)
 return points,triangles,records['cut'],tree

def exact_cross(a,b):
 # AABB overlap is a broad phase; confirm crossings with triangle edge/face tests.
 for face,other in [(a,b),(b,a)]:
  for i in range(3):
   p,q=face[i],face[(i+1)%3];direction=q-p
   if direction.length<1e-9:continue
   hit=intersect_ray_tri(*other,direction.normalized(),p,True)
   if hit is not None and 1e-6<(hit-p).dot(direction.normalized())<direction.length-1e-6:
    return list(hit)
 return None

expected={f'{sex}-{stance}-{phase}' for sex in ['female','male'] for stance in range(8) for phase in range(9)}
found={p.name[:-10] for p in FRAMES.glob('*-shirt.bin')}
assert found==expected, {'missing':sorted(expected-found),'unexpected':sorted(found-expected)}
assert all((FRAMES/(key+'-skin.bin')).is_file() for key in expected), 'Missing paired skin mesh'
source=json.loads((FRAMES/'source.json').read_text())
for sex,digest in source['models'].items():
 assert hashlib.sha256((ROOT/'spikes/Unity3D/Assets/Characters/Personalization'/f'{sex}_Sport.fbx').read_bytes()).hexdigest()==digest, 'Snapshot source is stale'
OUT=OUT.parent/source['revision']/OUT.name
OUT.parent.mkdir(exist_ok=True)
rows=[]
for shirt_path in sorted(FRAMES.glob('*-shirt.bin')):
 key=shirt_path.name[:-10]
 cloth,ct,_,cb=read(shirt_path);skin,st,flags,sb=read(FRAMES/(key+'-skin.bin'))
 candidates=cb.overlap(sb);crossings=[]
 for ci,si in candidates:
  point=exact_cross([cloth[i] for i in ct[ci]],[skin[i] for i in st[si]])
  if point is not None:crossings.append({'cloth_triangle':ci,'skin_triangle':si,'world_m':point})
 clearances={}
 for code,label in [(1,'arm_cut'),(2,'neck_cut')]:
  points=[skin[i] for i,flag in enumerate(flags) if flag==code]
  assert points,(key,label,'cut markers missing')
  distances=[cb.find_nearest(p)[3] for p in points]
  clearances[label]={'vertices':len(points),'minimum_distance_m':min(distances) if distances else None}
 areas=[(cloth[t[1]]-cloth[t[0]]).cross(cloth[t[2]]-cloth[t[0]]).length*.5 for t in ct]
 row={'frame':key,'crossings':len(crossings),'examples':crossings[:12],'cut_clearance':clearances,
      'cloth_minimum_triangle_area_m2':min(areas)}
 rows.append(row)
 if crossings:print(key,len(crossings),'crossings',flush=True)
summary={'source':source,'snapshot_count':len(rows),'phases':[i/8 for i in range(9)],
 'cases':'each body: workshop rest, six gestures and arena guard; nine phases each',
 'frames_with_crossings':sum(r['crossings']>0 for r in rows),
 'maximum_crossings':max((r['crossings'] for r in rows),default=0),
 'clearance_note':'Unsigned nearest-surface distance only; does not prove a hidden cut or signed overlap.',
 'note':'Exact edge/face crossings after BVH broad phase. Coplanar/tangent cases and visibility need visual review.',
 'frames':rows}
OUT.write_text(json.dumps(summary,indent=2)+'\n')
print(json.dumps({k:v for k,v in summary.items() if k!='frames'}),flush=True)
