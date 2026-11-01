"""Check the exported glasses against actual faces, hairstyles and existing headwear."""
import argparse
import itertools
import json
from pathlib import Path
import sys

import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree

ASSET = Path(__file__).resolve().parents[1]
ROOT = ASSET.parents[2]
CHARACTERS = ROOT / 'spikes/Unity3D/Assets/Characters'
STYLES = {
    'Male': {'parted': 'Hair_SimpleParted_Rigged', 'buzzed': 'Hair_Buzzed', 'mohawk': 'Hair_Mohawk', 'afro': 'Hair_Afro'},
    'Female': {'buns': 'Hair_Buns_Rigged', 'long': 'Hair_Long', 'buzzed': 'Female_Hair_Buzzed', 'ponytail': 'Hair_Ponytail', 'bob': 'Hair_Bob'},
}


def imported(path):
    bpy.ops.import_scene.fbx(filepath=str(path))
    return list(bpy.context.selected_objects)


def tree(objects, central=False):
    vertices, polygons = [], []
    for obj in objects:
        if obj.type != 'MESH':
            continue
        evaluated = obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
        mesh = evaluated.to_mesh()
        points = [evaluated.matrix_world @ vertex.co for vertex in mesh.vertices]
        offset = len(vertices)
        vertices.extend(points)
        polygons.extend([tuple(offset + index for index in poly.vertices) for poly in mesh.polygons
                         if not central or abs(sum(points[i].x for i in poly.vertices) / len(poly.vertices)) < .055])
        evaluated.to_mesh_clear()
    return BVHTree.FromPolygons(vertices, polygons)


def validate(output):
    report = {}
    for body, styles in STYLES.items():
        bpy.ops.wm.read_factory_settings(use_empty=True)
        glasses = [obj for obj in imported(output / (body + '.fbx')) if obj.type == 'MESH']
        assert len(glasses) == 2, 'Frame and visor only, no mannequin or rig in delivery'
        count = 0
        for obj in glasses:
            assert obj.data.uv_layers, obj.name
            # FBX can restore use_smooth=True while retaining flat custom corner normals.
            assert all(obj.data.corner_normals[loop].vector.dot(face.normal) > .999
                       for face in obj.data.polygons for loop in face.loop_indices), obj.name
            assert all(abs(value - 1) < 1e-5 for value in obj.scale), obj.name
            obj.data.calc_loop_triangles()
            count += len(obj.data.loop_triangles)
        assert count <= 1500, count
        lens = next(obj for obj in glasses if 'Visor' in obj.name)
        full, central = tree([lens]), tree([lens], central=True)
        skin = next(obj for obj in imported(CHARACTERS / 'FacialPilot' / (body + 'SportFace_Faceted.fbx'))
                    if obj.type == 'MESH' and obj.name.endswith('_Sport_Skin'))
        keys = skin.data.shape_keys.key_blocks
        faces = [None] + [key for key in keys if key.name.startswith('Face')]
        noses = [None] + [key for key in keys if key.name.startswith('Nose')]
        result = {'triangles': count, 'faces_and_noses': {}, 'hair': {}, 'headwear': {}}
        for face, nose in itertools.product(faces, noses):
            for key in keys:
                key.value = int(key in (face, nose))
            bpy.context.view_layer.update()
            intersections = len(full.overlap(tree([skin])))
            name = (face.name if face else 'original') + '/' + (nose.name if nose else 'original')
            result['faces_and_noses'][name] = intersections
            assert intersections == 0, f'{body} {name}: visor intersects face'
        for style, filename in styles.items():
            hair = imported(CHARACTERS / 'FacetedHair' / (filename + '.fbx'))
            hair_tree = tree(hair)
            result['hair'][style] = {'central_visor_intersections': len(central.overlap(hair_tree)),
                                      'all_visor_intersections': len(full.overlap(hair_tree))}
            assert result['hair'][style]['central_visor_intersections'] == 0, f'{body}/{style}: hair crosses central visor'
        hood = imported(CHARACTERS / 'Moumoutivation' / (body + '.fbx'))
        hood_tree = tree(hood)
        result['headwear']['moumoutivation'] = {'central_visor_intersections': len(central.overlap(hood_tree)),
                                                  'all_visor_intersections': len(full.overlap(hood_tree))}
        assert result['headwear']['moumoutivation']['central_visor_intersections'] == 0, body + ': hood crosses central visor'
        for style in styles:
            band = imported(CHARACTERS / 'BandeauEclair' / (body + '-' + style + '.fbx'))
            result['headwear']['bandeau-' + style] = {'central_visor_intersections': len(central.overlap(tree(band))),
                                                        'all_visor_intersections': len(full.overlap(tree(band)))}
            assert result['headwear']['bandeau-' + style]['all_visor_intersections'] == 0, f'{body}/{style}: headband crosses visor'
        report[body] = result
    (ASSET / 'fit-report.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True)
    arguments = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
    validate(arguments.output.resolve())
