"""Rigid cycling glasses fitted to the actual Quaternius eye/head landmarks (#350).

Run headless after init_master.py; master stays local, exports are rebuilt in --output.
The photograph is a design reference, not an orthographic metric blueprint.
"""
import argparse
import importlib.util
import json
import math
from pathlib import Path
import sys

sys.dont_write_bytecode = True

import bpy
from mathutils import Vector

ASSET = Path(__file__).resolve().parents[1]
ROOT = ASSET.parents[2]
CHARACTERS = ROOT / 'spikes/Unity3D/Assets/Characters'
spec = importlib.util.spec_from_file_location('construction', ROOT / '.claude/skills/blender-image-to-3d/assets/build_template.py')
tools = importlib.util.module_from_spec(spec)
spec.loader.exec_module(tools)
tools.OWNER_TAG = 'phase:cyclopes'
PALETTE = [(0.35, .035, .72, 1), (.94, .9, .025, 1), (.045, .035, .075, 1),
           (.77, .025, .55, 1), (.98, .035, .31, 1), (1, .15, .07, 1),
           (1, .42, .025, 1), (1, .72, .035, 1)]


def import_reference(path, prefix):
    bpy.ops.import_scene.fbx(filepath=str(path))
    objects = list(bpy.context.selected_objects)
    for obj in objects:
        obj.name = 'REF_fit_' + prefix + '_' + obj.name
        obj['owner'] = tools.OWNER_TAG
        for collection in list(obj.users_collection):
            collection.objects.unlink(obj)
        tools.col('REF').objects.link(obj)
        obj.hide_render = True
    return objects


def world_vertices(obj):
    return [obj.matrix_world @ vertex.co for vertex in obj.data.vertices]


def bounds(points):
    return [Vector(tuple(op(point[i] for point in points) for i in range(3))) for op in (min, max)]


def palette_uv(obj, indices):
    uv = obj.data.uv_layers.new(name='Palette')
    for polygon, index in zip(obj.data.polygons, indices):
        for loop in polygon.loop_indices:
            uv.data[loop].uv = ((index + .5) / len(PALETTE), .5)
        polygon.use_smooth = False


def tube(name, points, radius, colour, material, sides=6, closed=False):
    points = [Vector(point) for point in points]
    sections = []
    for index, point in enumerate(points):
        previous = points[index - 1] if index or closed else points[0]
        following = points[(index + 1) % len(points)] if index + 1 < len(points) or closed else point
        tangent = (following - previous).normalized()
        normal = tangent.cross(Vector((0, 0, 1))).normalized()
        if normal.length < .1:
            normal = Vector((1, 0, 0))
        other = tangent.cross(normal).normalized()
        sections.append([point + radius * (normal * math.cos(a * math.tau / sides)
                                           + other * math.sin(a * math.tau / sides)) for a in range(sides)])
    if closed:
        sections.append(sections[0])
    obj = tools.loft(name, sections, smooth=False, cap_ends=not closed)
    obj.data.materials.append(material)
    palette_uv(obj, [colour] * len(obj.data.polygons))
    return obj


def build_body(body, frame_material, lens_material, output):
    source = import_reference(CHARACTERS / 'Quaternius' / f'Superhero_{body}_FullBody.fbx', body)
    eyes = next(obj for obj in source if obj.type == 'MESH' and obj.name.endswith('_Eyes'))
    eye_min, eye_max = bounds(world_vertices(eyes))
    eye_z = (eye_min.z + eye_max.z) / 2
    face = import_reference(CHARACTERS / 'FacialPilot' / f'{body}SportFace_Faceted.fbx', body)
    skin = next(obj for obj in face if obj.type == 'MESH' and obj.name.endswith('_Sport_Skin'))
    head_group = skin.vertex_groups['Head'].index
    head_points = [skin.matrix_world @ vertex.co for vertex in skin.data.vertices
                   if any(group.group == head_group and group.weight > .5 for group in vertex.groups)]
    head_min, head_max = bounds(head_points)
    half_width = (head_max.x - head_min.x) * .575  # inferred 1.15 × real head width
    height = (head_max.z - head_min.z) * .28       # inferred oversized cycling silhouette
    front = head_max.y + .013                     # inferred clearance, checked across nose shapes
    prefix = 'PR_LesCyclopes_' + body
    columns = [-1, -.86, -.6, -.3, 0, .3, .6, .86, 1]

    def point(x, row):
        lower = eye_z - height * .46 + height * .12 * abs(x) ** 4
        # A bridge notch leaves the nose tip free; no two-lens seam.
        if abs(x) < .3:
            lower += height * .57 * (1 - abs(x) / .3)
        upper = eye_z + height * (.53 - .065 * abs(x))
        z = lower + (upper - lower) * row
        y = front - .048 * abs(x) ** 1.55 + .003 * math.sin(row * math.pi)
        return (x * half_width, y, z)

    vertices = [point(x, row) for row in (0, .5, 1) for x in columns]
    faces, colours = [], []
    for row in range(2):
        for col in range(len(columns) - 1):
            a = row * len(columns) + col
            b, c, d = a + 1, a + len(columns) + 1, a + len(columns)
            faces.extend([(a, c, b), (a, d, c)])
            colours.extend([3 + min(4, col * 5 // 8)] * 2)
    mesh = bpy.data.meshes.new(prefix + '_Visor_LOD0')
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    lens = bpy.data.objects.new(mesh.name, mesh)
    tools.col('LOW').objects.link(lens)
    tools.own(lens)
    lens.data.materials.append(lens_material)
    palette_uv(lens, colours)
    bpy.context.view_layer.objects.active = lens
    lens.select_set(True)
    modifier = tools.solidify(lens, thickness=.002, offset=-1)
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    lens.select_set(False)

    outline = [point(x, 1) for x in columns] + [point(x, 0) for x in reversed(columns)]
    frame_parts = [tube(prefix + '_Rim', outline, .0028, 0, frame_material, closed=True)]
    head_half = (head_max.x - head_min.x) / 2
    for sign, side in [(-1, 'L'), (1, 'R')]:
        hinge = Vector(point(sign, .86))
        path = [hinge, Vector((sign * (head_half + .012), .018, eye_z + height * .36)),
                Vector((sign * (head_half + .010), -.040, eye_z + height * .25)),
                Vector((sign * (head_half + .004), -.065, eye_z - height * .03))]
        frame_parts.append(tube(prefix + '_Temple_' + side, path, .004, 1, frame_material, sides=4))
        frame_parts.append(tube(prefix + '_Grip_' + side, path[-2:], .0045, 0, frame_material, sides=6))
        # Small rubber supports, inside the bridge; their contact is intentional.
        pad = [(sign * .014, front - .004, eye_z + height * .06),
               (sign * .014, head_max.y - .007, eye_z - height * .05)]
        frame_parts.append(tube(prefix + '_Nosepad_' + side, pad, .003, 2, frame_material))
    bpy.ops.object.select_all(action='DESELECT')
    for obj in frame_parts:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = frame_parts[0]
    bpy.ops.object.join()
    frame = bpy.context.object
    frame.name = prefix + '_Frame_LOD0'
    for obj in (frame, lens):
        for polygon in obj.data.polygons:
            polygon.use_smooth = False
        obj.data.calc_loop_triangles()
        assert all(abs(value - 1) < 1e-6 for value in obj.scale)
    triangles = sum(len(obj.data.loop_triangles) for obj in (frame, lens))
    assert triangles <= 1500, triangles
    bpy.ops.object.select_all(action='DESELECT')
    for obj in (frame, lens):
        obj.select_set(True)
    bpy.ops.export_scene.fbx(filepath=str(output / (body + '.fbx')), use_selection=True,
                             bake_anim=False, apply_scale_options='FBX_SCALE_ALL', path_mode='STRIP')
    for obj in (frame, lens):
        obj.hide_render = body != 'Male'
        obj.hide_set(body != 'Male')
    return {'triangles': triangles, 'head_bounds_m': [list(head_min), list(head_max)],
            'eye_bounds_m': [list(eye_min), list(eye_max)], 'eye_centre_z_m': eye_z,
            'visor_width_m': half_width * 2, 'visor_height_m': height,
            'front_m': front, 'parts': [frame.name, lens.name]}


def build(output):
    bpy.ops.wm.open_mainfile(filepath=str(ASSET / 'PR_LesCyclopes_master.blend'))
    tools.clear_owned()
    output.mkdir(parents=True, exist_ok=True)
    bpy.context.preferences.filepaths.save_version = 0
    image = bpy.data.images.get('Cyclopes palette') or bpy.data.images.new('Cyclopes palette', width=256, height=32)
    image.pixels[:] = [channel for y in range(32) for x in range(256) for channel in PALETTE[x // 32]]
    image.filepath_raw = str(output / 'BaseColor.png')
    image.file_format = 'PNG'
    image.save()
    materials = []
    for role, roughness, metallic in [('Frame', .55, 0), ('Visor', .18, .65)]:
        material = tools.material('Cyclopes_' + role, roughness=roughness, metallic=metallic)
        shader = next(node for node in material.node_tree.nodes if node.type == 'BSDF_PRINCIPLED')
        texture = material.node_tree.nodes.new('ShaderNodeTexImage')
        texture.image = image
        texture.interpolation = 'Closest'
        material.node_tree.links.new(texture.outputs['Color'], shader.inputs['Base Color'])
        materials.append(material)
    manifest = {'name': 'Les Cyclopes', 'slot': 'ACCESSORY', 'units': 'metres',
                'axes': 'Blender Z up, +Y forward, body rest-space, Unity Humanoid Head attachment',
                'source': 'Blender modelling from approved photo/design, no paid generation',
                'materials': ['Cyclopes_Frame', 'Cyclopes_Visor'],
                'texture': {'file': 'BaseColor.png', 'size': [256, 32], 'color_space': 'sRGB', 'role': 'unlit palette, no baked lighting'},
                'inferred': ['wrap depth', 'rear/temple construction', 'metric proportions and clearances'], 'variants': {}}
    for body in ('Male', 'Female'):
        manifest['variants'][body] = build_body(body, *materials, output)
    (ASSET / 'asset-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    bpy.ops.wm.save_as_mainfile(filepath=str(ASSET / 'PR_LesCyclopes_master.blend'))
    print(json.dumps(manifest))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True)
    arguments = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
    build(arguments.output.resolve())
