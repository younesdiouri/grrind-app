"""Check the exported glasses against actual faces, hairstyles and existing headwear."""
import argparse
import itertools
import json
from pathlib import Path
import sys
import importlib.util

import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location('cyclopes_fit', Path(__file__).with_name('02_fit_and_export.py'))
fit = importlib.util.module_from_spec(spec)
spec.loader.exec_module(fit)

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


def tree(objects, central=False, optics=None, temples=False):
    vertices, polygons = [], []
    for obj in objects:
        if obj.type != 'MESH':
            continue
        evaluated = obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
        mesh = evaluated.to_mesh()
        points = [evaluated.matrix_world @ vertex.co for vertex in mesh.vertices]
        offset = len(vertices)
        vertices.extend(points)
        mesh.calc_loop_triangles()
        uv = mesh.uv_layers.active.data
        for poly in mesh.loop_triangles:
            if temples and sum(points[i].y for i in poly.vertices) / 3 >= .05:
                continue
            if central and abs(sum(points[i].x for i in poly.vertices) / 3) >= .055:
                continue
            if optics and optics.sample(sum((uv[i].uv for i in poly.loops), Vector((0, 0))) / 3) <= .65:
                continue
            polygons.append(tuple(offset + index for index in poly.vertices))
        evaluated.to_mesh_clear()
    return BVHTree.FromPolygons(vertices, polygons)


def ears(skin):
    mesh = skin.data
    mesh.calc_loop_triangles()
    points = [skin.matrix_world @ vertex.co for vertex in mesh.vertices]
    group = skin.vertex_groups['Head'].index
    head = [point for point, vertex in zip(points, mesh.vertices)
            if any(g.group == group and g.weight > .5 for g in vertex.groups)]
    tops = fit.ear_tops(head)
    polygons = []
    for triangle in mesh.loop_triangles:
        centre = sum((points[i] for i in triangle.vertices), Vector()) / 3
        side = 1 if centre.x > 0 else -1
        top = tops[side]
        if centre.x * side > abs(top.x) * .8 and abs(centre.y - top.y) < .035 and top.z - .065 < centre.z < top.z + .003:
            polygons.append(tuple(triangle.vertices))
    assert polygons
    return BVHTree.FromPolygons(points, polygons, all_triangles=True)


def validate(output):
    report = {}
    for body, styles in STYLES.items():
        bpy.ops.wm.read_factory_settings(use_empty=True)
        glasses = [obj for obj in imported(output / (body + '.fbx')) if obj.type == 'MESH']
        assert len(glasses) == 1, 'One Meshy mesh, no mannequin or rig in delivery'
        count = 0
        for obj in glasses:
            assert obj.data.uv_layers, obj.name
            assert all(abs(value - 1) < 1e-5 for value in obj.scale), obj.name
            obj.data.calc_loop_triangles()
            count += len(obj.data.loop_triangles)
        assert count <= 6000, count
        mask = bpy.data.images.load(str(output / 'MetalMask.png'))
        mask.colorspace_settings.name = 'Non-Color'
        optics = fit.Optics(glasses[0], mask)
        eyes = next(obj for obj in imported(CHARACTERS / 'Quaternius' / ('Superhero_' + body + '_FullBody.fbx'))
                    if obj.type == 'MESH' and obj.name == 'Eyes')
        coverage = optics.coverage(fit.iris_points(eyes))
        assert all(value['uncovered'] == 0 for value in coverage.values()), coverage
        relief = optics.eye_relief(fit.iris_points(eyes))
        assert .015 < relief[0] <= relief[1] < .032, f'{body}: glasses float too far from the eyes: {relief}'
        full, central = tree(glasses, optics=optics), tree(glasses, central=True, optics=optics)
        skin = next(obj for obj in imported(CHARACTERS / 'FacialPilot' / (body + 'SportFace_Faceted.fbx'))
                    if obj.type == 'MESH' and obj.name.endswith('_Sport_Skin'))
        keys = skin.data.shape_keys.key_blocks
        faces = [None] + [key for key in keys if key.name.startswith('Face')]
        noses = [None] + [key for key in keys if key.name.startswith('Nose')]
        ear_contacts = len(tree(glasses).overlap(ears(skin)))
        assert ear_contacts == 0, f'{body}: temples cross ears ({ear_contacts} contacts)'
        scalp_contacts = len(tree(glasses, temples=True).overlap(tree([skin])))
        assert scalp_contacts == 0, f'{body}: stems cross the scalp ({scalp_contacts} contacts)'
        result = {'triangles': count, 'iris_coverage': coverage, 'eye_relief_m': relief,
                  'ear_intersections': ear_contacts, 'temple_skin_intersections': scalp_contacts,
                  'faces_and_noses': {}, 'hair': {}, 'headwear': {}}
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
