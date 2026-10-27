"""Fit the Bandeau éclair to the hairstyles of #304 (#306), like 01_fit_and_export.py.

Run: Blender -b -P 02_fit_new_styles.py
Same loop, topology and UVs. Each vertex sits on the skin or on the outer surface of the hair,
whichever is further out, but never more than `lift` above the skin: past it the hair is a volume
(afro, tail) the band passes under, as a real band does.
"""
from pathlib import Path
import json
import math
import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree

ASSET = Path(__file__).resolve().parents[1]
ROOT = ASSET.parents[2]
CHARACTERS = ROOT / 'spikes/Unity3D/Assets/Characters'
DEST = CHARACTERS / 'BandeauEclair'
# Body forehead height; per style: hair file, lift above the skin, height offset (the afro's rim
# would bite the top edge of the band at the usual height).
STYLES = {
    'Male': (1.737, {'mohawk': ('Hair_Mohawk', .015, 0), 'afro': ('Hair_Afro', .012, -.01)}),
    'Female': (1.695, {'long': ('Hair_Long', .02, 0), 'ponytail': ('Hair_Ponytail', .015, 0), 'bob': ('Hair_Bob', .02, 0)}),
}


def tree(objects):
    points, faces = [], []
    for o in objects:
        base = len(points)
        points += [o.matrix_world @ v.co for v in o.data.vertices]
        faces += [[base + i for i in p.vertices] for p in o.data.polygons]
    return BVHTree.FromPolygons(points, faces)


report = {}
for body, (z, styles) in STYLES.items():
    for style, (hair_file, lift, offset) in styles.items():
        bpy.ops.wm.read_factory_settings(use_empty=True)
        bpy.ops.import_scene.fbx(filepath=str(CHARACTERS / f'Quaternius/Superhero_{body}_FullBody.fbx'))
        head = next(o for o in bpy.data.objects if o.type == 'MESH' and o.name.lower().startswith('superhero_' + body.lower()))
        skin = tree([head])
        before = set(bpy.data.objects)
        bpy.ops.import_scene.fbx(filepath=str(CHARACTERS / f'FacetedHair/{hair_file}.fbx'))
        hair = tree([o for o in set(bpy.data.objects) - before if o.type == 'MESH'])
        bpy.ops.import_scene.gltf(filepath=str(ASSET / 'source.glb'))
        band = next(o for o in bpy.context.selected_objects if o.type == 'MESH')
        band.name = 'PR_BandeauEclair_' + body + '_' + style
        points = [band.matrix_world @ v.co for v in band.data.vertices]
        radii = [math.hypot(p.x, p.y) for p in points]
        rmin, rmax = min(radii), max(radii)
        zmin, zmax = min(p.z for p in points), max(p.z for p in points)
        lifted = 0
        for vertex, p, radius in zip(band.data.vertices, points, radii):
            height = z + offset + ((p.z - zmin) / (zmax - zmin) - .5) * .045
            direction = Vector((p.x / radius, p.y / radius, 0))
            origin = Vector((0, 0, height))
            hit, _, _, distance = skin.ray_cast(origin, direction, .3)
            assert hit is not None, (body, style, list(p))
            outer = hair.ray_cast(origin + direction * .3, -direction, .3)
            if outer[0] is not None and .3 - outer[3] > distance:
                distance = min(.3 - outer[3], distance + lift)
                lifted += 1
            clearance = .002 + .007 * (radius - rmin) / (rmax - rmin)
            vertex.co = Vector((direction.x * (distance + clearance), direction.y * (distance + clearance), height))
        band.matrix_world.identity()
        band.data.update()
        bpy.ops.object.select_all(action='DESELECT')
        band.select_set(True)
        bpy.context.view_layer.objects.active = band
        path = DEST / (body + '-' + style + '.fbx')
        bpy.ops.export_scene.fbx(filepath=str(path), use_selection=True, bake_anim=False,
                                 apply_scale_options='FBX_SCALE_ALL', path_mode='STRIP')
        report[body + '-' + style] = {'triangles': sum(len(p.vertices) - 2 for p in band.data.polygons),
                                      'on_hair': round(lifted / len(points), 2), 'lift_max_m': lift}
manifest = json.loads((ASSET / 'asset-manifest.json').read_text())
manifest['variants_306'] = report
(ASSET / 'asset-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
print('BANDS', json.dumps(report))
