"""Run in Blender with bpy: isolate the CC0 head and extend its neck inside the collar."""
from pathlib import Path
import bpy
import bmesh

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'artifacts/quaternius-source/Universal Base Characters[Standard]/Base Characters/Unity/Superhero_Male_FullBody.fbx'
OUTPUT = ROOT / 'spikes/Unity3D/Assets/Characters/QuaterniusPOC/Head.fbx'

scene = bpy.data.scenes.new('Quaternius neck preparation')
bpy.context.window.scene = scene
bpy.ops.import_scene.fbx(filepath=str(SOURCE))
head = next(o for o in scene.objects if o.type == 'MESH' and o.name.startswith('SuperHero_Male'))
rig = next(m.object for m in head.modifiers if m.type == 'ARMATURE')
mesh = bmesh.new()
mesh.from_mesh(head.data)
bmesh.ops.bisect_plane(mesh, geom=list(mesh.verts) + list(mesh.edges) + list(mesh.faces),
                       plane_co=(0, 0, 1.56), plane_no=(0, 0, 1), clear_inner=True)
boundary = [e for e in mesh.edges if e.is_boundary and all(abs(v.co.z - 1.56) < .0001 for v in e.verts)]
assert len(boundary) >= 8, 'Expected a complete neck boundary'
extension = bmesh.ops.extrude_edge_only(mesh, edges=boundary)
vertices = [v for v in extension['geom'] if isinstance(v, bmesh.types.BMVert)]
weights = mesh.verts.layers.deform.active
chest = head.vertex_groups['spine_03'].index
for vertex in vertices:
    vertex.co.z = 1.32
    vertex[weights].clear()
    vertex[weights][chest] = 1
bmesh.ops.recalc_face_normals(mesh, faces=list(mesh.faces))
mesh.to_mesh(head.data)
mesh.free()
head.data.update()
head.name = 'QuaterniusHead'
bpy.ops.object.select_all(action='DESELECT')
head.select_set(True)
rig.select_set(True)
bpy.context.view_layer.objects.active = rig
bpy.ops.export_scene.fbx(filepath=str(OUTPUT), use_selection=True, add_leaf_bones=False, bake_anim=False,
                         apply_scale_options='FBX_SCALE_ALL')
print('Exported', OUTPUT, 'vertices', len(head.data.vertices), 'neck boundary edges', len(boundary))
