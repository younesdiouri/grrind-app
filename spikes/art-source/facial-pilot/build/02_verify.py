"""Reimport the delivered FBX and measure it against the untouched sources."""
from pathlib import Path
import json
import bpy
from mathutils.kdtree import KDTree

ROOT = Path(__file__).resolve().parents[4]
ASSET = ROOT / 'spikes/art-source/facial-pilot'


def import_meshes(path):
    before = set(bpy.context.scene.objects)
    bpy.ops.import_scene.fbx(filepath=str(path))
    return [o for o in set(bpy.context.scene.objects) - before if o.type == 'MESH']


def points(obj, key=None):
    data = obj.data.shape_keys.key_blocks[key].data if key else obj.data.vertices
    return [obj.matrix_world @ v.co for v in data]


def weights(obj, index):
    return {obj.vertex_groups[g.group].name: g.weight for g in obj.data.vertices[index].groups if g.weight > .00001}


def protected(p):
    return p.z < 1.574 or p.z > 1.681 or p.y < .005 or abs(p.x) > .083


def measurements(coords):
    jaw = [p.x for p in coords if 1.60 < p.z < 1.62 and p.y > .015]
    nose = [p.x for p in coords if 1.646 < p.z < 1.666 and p.y > .091 and abs(p.x) < .03]
    return {'head_top_m': max(p.z for p in coords), 'jaw_width_mm': (max(jaw) - min(jaw)) * 1000,
            'nose_width_mm': (max(nose) - min(nose)) * 1000}


def verify():
    previous = bpy.context.scene
    scene = bpy.data.scenes.new('GRRIND facial roundtrip validation')
    bpy.context.window.scene = scene
    report = {}
    try:
        for role, source_path, match in [
            ('Fantasy', 'QuaterniusPOC/Head.fbx', 'QuaterniusHead'),
            ('Sport', 'Personalization/Male_Sport.fbx', 'Male_Sport_Skin'),
        ]:
            source = next(o for o in import_meshes(ROOT / 'spikes/Unity3D/Assets/Characters' / source_path) if o.name.startswith(match))
            base = points(source)
            source_tree = KDTree(len(base))
            for index, point in enumerate(base):
                source_tree.insert(point, index)
            source_tree.balance()
            imported = import_meshes(ROOT / 'spikes/Unity3D/Assets/Characters/FacialPilot' / ('Male' + role + 'Face.fbx'))
            for obj in imported:
                coords = points(obj)
                is_original = '_Original' in obj.name
                unchanged = [(i, p) for i, p in enumerate(coords) if is_original or protected(p)]
                distance = max(source_tree.find(p)[2] for _, p in unchanged)
                assert distance < .000005, (role, obj.name, 'protected coordinate drift', distance)
                if not is_original:
                    assert all(source_tree.find(p)[2] < .000005 for p in coords
                               if abs(p.x) < .028 and p.y > .091 and 1.644 < p.z < 1.696), 'Face selection changed the original nose'
                for index, point in unchanged:
                    source_index = source_tree.find(point)[1]
                    actual, expected = weights(obj, index), weights(source, source_index)
                    assert all(abs(actual.get(k, 0) - expected.get(k, 0)) < .0001 for k in actual.keys() | expected.keys()), 'Native weights changed'
                wide = points(obj, 'NoseWide')
                nose_changes = [(a - b).length for a, b in zip(coords, wide)]
                assert max(nose_changes) > .002, 'Export lost the nose shape'
                assert all(d < .000005 for p, d in zip(coords, nose_changes) if p.z < 1.640 or p.z > 1.700 or abs(p.x) > .03), 'Nose changes other anatomy'
                report[obj.name] = {
                    'status': 'PASS', 'triangles': sum(len(p.vertices) - 2 for p in obj.data.polygons),
                    'protected_drift_mm': distance * 1000, 'original_nose': measurements(coords),
                    'wide_nose': measurements(wide), 'nose_max_change_mm': max(nose_changes) * 1000,
                }
        (ASSET / 'review/roundtrip.json').write_text(json.dumps(report, indent=2) + '\n')
        print(json.dumps(report, indent=2))
    finally:
        bpy.context.window.scene = previous
        for obj in list(scene.objects):
            bpy.data.objects.remove(obj, do_unlink=True)
        bpy.data.scenes.remove(scene)


if __name__ == '__main__':
    verify()
